import { Context } from 'hono'
import {
  getProviders,
  getProvider,
  addProvider,
  updateProvider,
  deleteProvider,
  getProviderHealth,
  getAllProviderHealth,
  getRecentCallStatuses,
  recoverProvider,
  getProxyKeys,
  addProxyKey,
  updateProxyKey,
  deleteProxyKey,
} from './storage'
import { buildEndpointUrls, testModelConnection } from './proxy'
import { PROXY_KEY_PREFIX, EXPIRY_OPTIONS } from './config'
import type {
  Env,
  ApiResponse,
  Provider,
  CreateProviderRequest,
  UpdateProviderRequest,
  CreateProxyKeyRequest,
  TestModelRequest,
} from './types'

// ===== 系统状态 =====

/**
 * 将 string[] 或正规对象数组统一转换为正规对象数组
 * 例: ["k1","k2"] → [{key:"k1",enabled:true},{key:"k2",enabled:true}]
 */
function normalizeArray<T>(
  items: unknown,
  mapFn: (val: string) => T
): T[] {
  if (!Array.isArray(items)) return []
  if (items.length === 0 || typeof items[0] === 'string') {
    return (items as string[]).map(mapFn)
  }
  return items as T[]
}

type ProviderProbeRequest = {
  baseUrl?: string
  apiKey?: string
  apiType?: 'openai' | 'anthropic'
  modelId?: string
}

async function readProviderError(response: Response): Promise<string> {
  try {
    const data = await response.json() as { error?: { message?: string }, message?: string }
    return data?.error?.message || data?.message || JSON.stringify(data)
  } catch {
    return await response.text()
  }
}

async function fetchProviderModels(
  baseUrl: string,
  apiKey: string,
  apiType?: 'openai' | 'anthropic'
): Promise<{ success: boolean; message: string; statusCode?: number; models?: string[] }> {
  const headers: Record<string, string> = {}
  if (apiType === 'anthropic') {
    headers['x-api-key'] = apiKey
    headers['anthropic-version'] = '2023-06-01'
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const urls = buildEndpointUrls(baseUrl, 'models')
  let lastResponse: Response | null = null

  try {
    for (let i = 0; i < urls.length; i++) {
      const response = await fetch(urls[i], {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(15000),
      })

      if (response.status === 404 && i < urls.length - 1) {
        lastResponse = response
        continue
      }

      lastResponse = response
      break
    }
  } catch (err) {
    const error = err as Error
    return { success: false, message: `连接失败: ${error.message?.substring(0, 200) || '未知错误'}` }
  }

  const response = lastResponse
  if (!response) {
    return { success: false, message: '无响应' }
  }

  if (!response.ok) {
    const errorBody = await readProviderError(response)
    return {
      success: false,
      message: `HTTP ${response.status}: ${errorBody.substring(0, 200)}`,
      statusCode: response.status,
    }
  }

  const data = await response.json().catch(() => null) as { data?: Array<{ id?: string }> } | null
  const models = Array.isArray(data?.data)
    ? data.data.map(m => m.id).filter((id): id is string => !!id)
    : []

  return {
    success: true,
    message: '连接成功',
    statusCode: response.status,
    models,
  }
}

export async function handleStatus(c: Context<{ Bindings: Env }>) {
  const providers = await getProviders(c.env)
  const proxyKeys = await getProxyKeys(c.env)

  const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0)
  const enabledModels = providers.reduce(
    (sum, p) => sum + p.models.filter((m) => m.enabled).length,
    0
  )

  return c.json<ApiResponse>({
    success: true,
    data: {
      providersCount: providers.length,
      enabledProvidersCount: providers.filter((p) => p.enabled).length,
      modelsCount: totalModels,
      enabledModelsCount: enabledModels,
      proxyKeysCount: proxyKeys.filter((k) => k.enabled).length,
      adminConfigured: !!(c.env.ADMIN_USERNAME && c.env.ADMIN_PASSWORD),
      baseUrl: new URL(c.req.url).origin,
    },
  })
}

// ===== 提供商 CRUD =====

export async function handleGetProviders(c: Context<{ Bindings: Env }>) {
  const providers = await getProviders(c.env)
  return c.json<ApiResponse<Provider[]>>({ success: true, data: providers })
}

export async function handleCreateProvider(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json<CreateProviderRequest>()

  if (!body.id || !body.name || !body.baseUrl) {
    return c.json<ApiResponse>({ success: false, message: 'id、name、baseUrl 为必填项' }, 400)
  }

  const providers = await getProviders(c.env)
  if (providers.some((p) => p.id === body.id)) {
    return c.json<ApiResponse>({ success: false, message: `提供商 id "${body.id}" 已存在` }, 409)
  }

  const now = new Date().toISOString()
  const provider: Provider = {
    id: body.id,
    name: body.name,
    baseUrl: body.baseUrl.replace(/\/$/, ''),
    apiType: body.apiType || 'openai',
apiKeys: normalizeArray(body.apiKeys, (k) => ({ key: k, enabled: true })),
    models: body.models
      ? normalizeArray(body.models, (m) => ({ id: m, enabled: true }))
      : [],
    enabled: body.enabled !== undefined ? body.enabled : true,
    createdAt: now,
    updatedAt: now,
  }

  await addProvider(c.env, provider)
  return c.json<ApiResponse<Provider>>({ success: true, data: provider }, 201)
}

export async function handleUpdateProvider(c: Context<{ Bindings: Env }>) {
  const id = c.req.param('id')
  if (!id) return c.json<ApiResponse>({ success: false, message: '缺少 id 参数' }, 400)
  const body = await c.req.json<UpdateProviderRequest>()

  const updates: Partial<Provider> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.baseUrl !== undefined) updates.baseUrl = body.baseUrl.replace(/\/$/, '')
  if (body.apiType !== undefined) updates.apiType = body.apiType
if (body.apiKeys !== undefined) {
    updates.apiKeys = normalizeArray(body.apiKeys, (k) => ({ key: k, enabled: true }))
  }
  if (body.enabled !== undefined) updates.enabled = body.enabled
  if (body.models !== undefined) {
    updates.models = normalizeArray(body.models, (m) => ({ id: m, enabled: true }))
  }

  const updated = await updateProvider(c.env, id, updates)
  if (!updated) {
    return c.json<ApiResponse>({ success: false, message: '提供商不存在' }, 404)
  }

  return c.json<ApiResponse<Provider>>({ success: true, data: updated })
}

export async function handleDeleteProvider(c: Context<{ Bindings: Env }>) {
  const id = c.req.param('id')
  if (!id) return c.json<ApiResponse>({ success: false, message: '缺少 id 参数' }, 400)
  const deleted = await deleteProvider(c.env, id)
  if (!deleted) {
    return c.json<ApiResponse>({ success: false, message: '提供商不存在' }, 404)
  }
  return c.json<ApiResponse>({ success: true, message: '提供商已删除' })
}

export async function handleProbeProvider(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json<ProviderProbeRequest>()
  const baseUrl = body.baseUrl?.trim().replace(/\/$/, '')
  const apiKey = body.apiKey?.trim()
  const apiType = body.apiType || 'openai'

  if (!baseUrl || !apiKey) {
    return c.json<ApiResponse>({ success: false, message: 'baseUrl 和 apiKey 为必填项' }, 400)
  }

  const result = body.modelId
    ? await testModelConnection(baseUrl, apiKey, body.modelId, apiType)
    : await fetchProviderModels(baseUrl, apiKey, apiType)

  return c.json<ApiResponse>({ success: true, data: result })
}

export async function handleTestModel(c: Context<{ Bindings: Env }>) {
  const id = c.req.param('id')
  if (!id) return c.json<ApiResponse>({ success: false, message: '缺少 id 参数' }, 400)
  const { modelId } = await c.req.json<TestModelRequest>()

  if (!modelId) {
    return c.json<ApiResponse>({ success: false, message: 'modelId 为必填项' }, 400)
  }

  const provider = await getProvider(c.env, id)
  if (!provider) {
    return c.json<ApiResponse>({ success: false, message: '提供商不存在' }, 404)
  }

  const modelConfig = provider.models.find((m) => m.id === modelId)
  if (!modelConfig) {
    return c.json<ApiResponse>({ success: false, message: `模型 "${modelId}" 不存在于提供商 "${provider.name}"` }, 404)
  }

  const enabledKeys = provider.apiKeys.filter(k => k.enabled)
  if (enabledKeys.length === 0) {
    return c.json<ApiResponse>({ success: false, message: '该提供商未配置可用的 API Key' }, 400)
  }

  const apiKey = enabledKeys[0].key
  const result = await testModelConnection(provider.baseUrl, apiKey, modelId, provider.apiType)

  return c.json<ApiResponse>({
    success: true,
    data: result,
  })
}

// ===== sub2api 导入 =====

/**
 * 将 sub2api 导出的 JSON 解析并导入为提供商
 * 只导入 type 为 apikey 的账号（oauth 的 token 会过期，不导入）
 */
export async function handleImportSub2Api(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json<{ data: string }>()
  let parsed: any
  try {
    parsed = typeof body.data === 'string' ? JSON.parse(body.data) : body.data
  } catch {
    return c.json<ApiResponse>({ success: false, message: 'JSON 解析失败，请检查文件格式' }, 400)
  }

  const rawAccounts = parsed.accounts
  if (!Array.isArray(rawAccounts) || rawAccounts.length === 0) {
    return c.json<ApiResponse>({ success: false, message: '未找到有效的 accounts 数据' }, 400)
  }

  const existing = await getProviders(c.env)
  // 以 baseUrl 为 key 建立索引，方便按地址合并
  const existingByUrl = new Map<string, Provider>()
  for (const p of existing) {
    const key = p.baseUrl.replace(/\/$/, '').toLowerCase()
    // 如果 key 已存在则跳过，优先保留先出现的
    if (!existingByUrl.has(key)) {
      existingByUrl.set(key, p)
    }
  }

  const imported: Array<{ id: string; name: string; models: number; merged: boolean }> = []
  const skipped: Array<{ name: string; reason: string }> = []
  // 本次导入中按 baseUrl 暂存待合并的 key/models
  const batchMerge = new Map<string, { provider: Provider; apiKeys: string[]; modelIds: Set<string> }>()

  for (const acct of rawAccounts) {
    // 只导入 apikey 类型
    if (acct.type !== 'apikey') {
      skipped.push({ name: acct.name || '(unnamed)', reason: '非 apikey 类型（oauth），跳过' })
      continue
    }

    const name = acct.name?.trim() || 'imported'
    const baseUrl = (acct.credentials?.base_url || '').replace(/\/$/, '')
    const apiKey = acct.credentials?.api_key || ''
    const modelMapping = acct.credentials?.model_mapping || {}

    if (!baseUrl || !apiKey) {
      skipped.push({ name, reason: '缺少 base_url 或 api_key' })
      continue
    }

    const urlKey = baseUrl.toLowerCase()
    const models = Object.keys(modelMapping)

    // 1) 检查是否与已有提供商 baseUrl 相同 → 合并
    const existingProvider = existingByUrl.get(urlKey)
    if (existingProvider) {
      // 追加 API Key（去重）
      const keyExists = existingProvider.apiKeys.some(k => k.key === apiKey)
      if (!keyExists) {
        existingProvider.apiKeys.push({ key: apiKey, enabled: true })
      }
      // 追加模型（去重）
      for (const mid of models) {
        if (!existingProvider.models.some(m => m.id === mid)) {
          existingProvider.models.push({ id: mid, enabled: true })
        }
      }
      await updateProvider(c.env, existingProvider.id, {
        apiKeys: existingProvider.apiKeys,
        models: existingProvider.models,
      })
      imported.push({ id: existingProvider.id, name: existingProvider.name, models: models.length, merged: true })
      continue
    }

    // 2) 检查本次导入中是否已有相同 baseUrl → 暂存合并
    const batchEntry = batchMerge.get(urlKey)
    if (batchEntry) {
      if (!batchEntry.apiKeys.includes(apiKey)) {
        batchEntry.apiKeys.push(apiKey)
      }
      for (const mid of models) {
        batchEntry.modelIds.add(mid)
      }
      imported.push({ id: batchEntry.provider.id, name: name, models: models.length, merged: true })
      continue
    }

    // 3) 新提供商——从 baseUrl 主机名生成 ID
    let id = baseUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/^www\./, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 48) || 'imported'

    // 检查 ID 冲突（已有提供商 + 本次已创建的 batch 条目）
    const allCreatedIds = new Set(existing.map(p => p.id))
    for (const [, entry] of batchMerge) {
      allCreatedIds.add(entry.provider.id)
    }
    if (allCreatedIds.has(id)) {
      let suffix = 1
      while (allCreatedIds.has(`${id}-${suffix}`)) suffix++
      id = `${id}-${suffix}`
    }

    const now = new Date().toISOString()
    const provider: Provider = {
      id,
      name,
      baseUrl,
      apiType: acct.platform === 'anthropic' ? 'anthropic' : 'openai',
      apiKeys: [{ key: apiKey, enabled: true }],
      models: models.map(mid => ({ id: mid, enabled: true })),
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }

    batchMerge.set(urlKey, { provider, apiKeys: [apiKey], modelIds: new Set(models) })
    imported.push({ id: provider.id, name: provider.name, models: models.length, merged: false })
  }

  // 批量写入暂存的合并条目
  for (const [, entry] of batchMerge) {
    // 合并 batch 内的重复模型
    entry.provider.models = Array.from(entry.modelIds).map(mid => ({ id: mid, enabled: true }))
    await addProvider(c.env, entry.provider)
  }

  return c.json<ApiResponse>({
    success: true,
    data: {
      imported,
      skipped,
      total: imported.length,
      merged: imported.filter(i => i.merged).length,
    },
    message: `成功导入 ${imported.length} 个账号${imported.filter(i=>i.merged).length ? `（${imported.filter(i=>i.merged).length} 个合并到已有提供商）` : ''}${skipped.length ? `，${skipped.length} 个跳过` : ''}`,
  })
}

// ===== Provider 健康状态和恢复 =====

export async function handleGetProviderHealth(c: Context<{ Bindings: Env }>) {
  const providers = await getProviders(c.env)
  const healthMap = await getAllProviderHealth(c.env)

  // 同时读取 key 级健康数据
  const data = await Promise.all(providers.map(async (p) => {
    const h = healthMap[p.id] || null
    let keyStats = { total: 0, healthy: 0, demoted: 0 }
    let demotedKeys = 0
    try {
      const raw = await c.env.KV.get('key:health:' + p.id)
      if (raw) {
        const kh = JSON.parse(raw)
        const keys = Object.values(kh) as Array<{ failures: number }>
        keyStats.total = p.apiKeys.filter(k => k.enabled).length
        keyStats.demoted = keys.filter(k => k.failures >= 3).length
        keyStats.healthy = keyStats.total - keys.filter(k => k.failures >= 1).length
        demotedKeys = keyStats.demoted
      }
    } catch {}
    return {
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      health: h ? { ...h, demotedKeys, keyStats } : null,
      keyStats: keyStats.total > 0 ? keyStats : null,
    }
  }))

  return c.json<ApiResponse>({ success: true, data })
}

export async function handleRecoverProvider(c: Context<{ Bindings: Env }>) {
  const id = c.req.param('id')
  if (!id) return c.json<ApiResponse>({ success: false, message: '缺少 id 参数' }, 400)

  const provider = await getProvider(c.env, id)
  if (!provider) {
    return c.json<ApiResponse>({ success: false, message: '提供商不存在' }, 404)
  }

  // 找第一个可用的 API Key 和模型测试
  const enabledKeys = provider.apiKeys.filter(k => k.enabled)
  if (enabledKeys.length === 0) {
    return c.json<ApiResponse>({ success: false, message: '该提供商没有可用的 API Key' }, 400)
  }

  const enabledModels = provider.models.filter(m => m.enabled)
  if (enabledModels.length === 0) {
    return c.json<ApiResponse>({ success: false, message: '该提供商没有启用的模型' }, 400)
  }

  const apiKey = enabledKeys[0].key
  const modelId = enabledModels[0].id
  const result = await testModelConnection(provider.baseUrl, apiKey, modelId, provider.apiType)

  if (result.success) {
    await recoverProvider(c.env, id)
    return c.json<ApiResponse>({
      success: true,
      data: result,
      message: `恢复成功，提供商 "${provider.name}" 已重新启用`,
    })
  }

  return c.json<ApiResponse>({
    success: false,
    data: result,
    message: `恢复失败: ${result.message}`,
  })
}

// ===== 实时调用状态 =====

export async function handleGetCallStatuses(c: Context<{ Bindings: Env }>) {
  const records = await getRecentCallStatuses(c.env)
  const activeCutoff = Date.now() - 10 * 60 * 1000
  const active = records.filter(item =>
    item.status === 'running' && new Date(item.startedAt).getTime() >= activeCutoff
  ).length
  const recent = records.slice(0, 20)
  const success = recent.filter(item => item.status === 'success').length
  const errors = recent.filter(item => item.status === 'error').length

  return c.json<ApiResponse>({
    success: true,
    data: {
      active,
      success,
      errors,
      total: recent.length,
      updatedAt: new Date().toISOString(),
      records: recent,
    },
  })
}

// ===== 转发 Key 管理 =====

export async function handleGetProxyKeys(c: Context<{ Bindings: Env }>) {
  const keys = await getProxyKeys(c.env)
  const maskedKeys = keys.map((k) => ({
    ...k,
    key: k.key.length > 12
      ? k.key.substring(0, 8) + '****' + k.key.substring(k.key.length - 4)
      : k.key,
  }))
  return c.json<ApiResponse>({ success: true, data: maskedKeys })
}

export async function handleCreateProxyKey(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json<CreateProxyKeyRequest>()
  const id = crypto.randomUUID()
  const randomPart = crypto.randomUUID().replace(/-/g, '')
  const key = `${PROXY_KEY_PREFIX}${randomPart}`

  // 计算过期时间
  let expiresAt: string | null = null
  if (body.expiresIn && body.expiresIn !== 'forever') {
    const ttl = EXPIRY_OPTIONS[body.expiresIn]
    if (ttl) {
      expiresAt = new Date(Date.now() + ttl * 1000).toISOString()
    }
  }

  const proxyKey = {
    id,
    key,
    name: body.name || `Key-${new Date().toLocaleDateString()}`,
    enabled: true,
    createdAt: new Date().toISOString(),
    expiresAt,
  }

  await addProxyKey(c.env, proxyKey)
  return c.json<ApiResponse>({
    success: true,
    data: proxyKey,
    message: '请立即保存此 Key，关闭后将不再显示',
  }, 201)
}

export async function handleDeleteProxyKey(c: Context<{ Bindings: Env }>) {
  const id = c.req.param('id')
  if (!id) return c.json<ApiResponse>({ success: false, message: '缺少 id 参数' }, 400)
  const deleted = await deleteProxyKey(c.env, id)
  if (!deleted) {
    return c.json<ApiResponse>({ success: false, message: '转发 Key 不存在' }, 404)
  }
  return c.json<ApiResponse>({ success: true, message: '转发 Key 已删除' })
}

export async function handleUpdateProxyKey(c: Context<{ Bindings: Env }>) {
  const id = c.req.param('id')
  if (!id) return c.json<ApiResponse>({ success: false, message: '缺少 id 参数' }, 400)
  const body = await c.req.json<{ enabled?: boolean }>()
  const updates: Partial<import('./types').ProxyKey> = {}
  if (body.enabled !== undefined) updates.enabled = body.enabled
  const updated = await updateProxyKey(c.env, id, updates)
  if (!updated) {
    return c.json<ApiResponse>({ success: false, message: '转发 Key 不存在' }, 404)
  }
  return c.json<ApiResponse>({ success: true, data: updated })
}
