import { Context } from 'hono'
import {
  getProviders,
  getProvider,
  addProvider,
  updateProvider,
  deleteProvider,
  getProviderHealth,
  clearProviderHealth,
  clearProviderKeyHealth,
  getAllProviderHealth,
  getRecentCallStatuses,
  recoverProvider,
  getProxyKeys,
  addProxyKey,
  updateProxyKey,
  deleteProxyKey,
  createOpenAIOAuthSession,
  getOpenAIOAuthSession,
  deleteOpenAIOAuthSession,
} from './storage'
import { buildEndpointUrls, normalizeProviderApiKey, testModelConnection } from './proxy'
import { PROXY_KEY_PREFIX, EXPIRY_OPTIONS, OPENAI_OAUTH_CONFIG } from './config'
import type {
  Env,
  ApiResponse,
  Provider,
  ProviderApiType,
  ApiKeyEntry,
  OpenAIOAuthSession,
  CreateProviderRequest,
  UpdateProviderRequest,
  CreateProxyKeyRequest,
  TestModelRequest,
} from './types'
import {
  buildOpenAIAuthorizeUrl,
  exchangeOpenAICode,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  getEncryptionSecret,
  encryptSecret,
  decryptSecret,
  parseJwtPayload,
  resolveProviderKeyToken,
} from './oauth'

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

function slugifyProviderId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 48)
}

function createProviderId(baseUrl: string, name: string, usedIds: Set<string>): string {
  let hostname = baseUrl
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')

  try {
    hostname = new URL(baseUrl).hostname.replace(/^www\./, '')
  } catch {}

  const baseId = slugifyProviderId(hostname) || slugifyProviderId(name) || 'provider'
  let id = baseId
  let suffix = 1
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`
    suffix++
  }
  return id
}

type ProviderProbeRequest = {
  baseUrl?: string
  apiKey?: string
  apiType?: ProviderApiType
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
  apiType?: ProviderApiType,
  extraHeaders?: Record<string, string>
): Promise<{ success: boolean; message: string; statusCode?: number; models?: string[] }> {
  const normalizedApiKey = normalizeProviderApiKey(apiKey)
  const headers: Record<string, string> = {
    ...extraHeaders,
  }
  if (apiType === 'anthropic') {
    headers['x-api-key'] = normalizedApiKey
    headers['anthropic-version'] = '2023-06-01'
  } else {
    headers['Authorization'] = `Bearer ${normalizedApiKey}`
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
  const name = body.name?.trim()
  const baseUrl = body.baseUrl?.trim()

  if (!name || !baseUrl) {
    return c.json<ApiResponse>({ success: false, message: 'name、baseUrl 为必填项' }, 400)
  }

  const providers = await getProviders(c.env)
  const requestedId = body.id?.trim()
  if (requestedId && providers.some((p) => p.id === requestedId)) {
    return c.json<ApiResponse>({ success: false, message: `提供商 id "${requestedId}" 已存在` }, 409)
  }
  const id = requestedId || createProviderId(baseUrl, name, new Set(providers.map(p => p.id)))

  const now = new Date().toISOString()
  const provider: Provider = {
    id,
    name,
    baseUrl: baseUrl.replace(/\/$/, ''),
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
  const existingHealth = await getProviderHealth(c.env, id)

  const updates: Partial<Provider> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.baseUrl !== undefined) updates.baseUrl = body.baseUrl.replace(/\/$/, '')
  if (body.apiType !== undefined) updates.apiType = body.apiType
  if (body.apiKeys !== undefined) {
    const rawKeys = normalizeArray(body.apiKeys, (k) => ({ key: k, enabled: true }))
    const existing = await getProvider(c.env, id)
    if (existing && existing.apiKeys.length > 0) {
      const existingKeyMap = new Map(existing.apiKeys.map(k => [k.key, k]))
      updates.apiKeys = rawKeys.map(k => {
        const prev = existingKeyMap.get(k.key)
        if (prev && prev.type === 'openai-oauth') {
          return {
            ...prev,
            enabled: k.enabled !== undefined ? k.enabled : prev.enabled,
          }
        }
        return k
      })
    } else {
      updates.apiKeys = rawKeys
    }
  }
  if (body.enabled !== undefined) updates.enabled = body.enabled
  if (body.models !== undefined) {
    updates.models = normalizeArray(body.models, (m) => ({ id: m, enabled: true }))
  }

  const updated = await updateProvider(c.env, id, updates)
  if (!updated) {
    return c.json<ApiResponse>({ success: false, message: '提供商不存在' }, 404)
  }

  // 手动重新启用自动暂停的提供商时，旧的 503/网络失败记录不能继续影响路由。
  // 只清除临时健康状态，不改动 Key 的 enabled 配置。
  if (body.enabled === true) {
    await clearProviderKeyHealth(c.env, id)
    if (existingHealth?.autoPaused) await clearProviderHealth(c.env, id)
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

  const apiKeyEntry = enabledKeys[0]
  let apiKey = apiKeyEntry.key
  let extraHeaders: Record<string, string> | undefined
  if (apiKeyEntry.type === 'openai-oauth' || provider.apiType === 'openai-oauth') {
    const resolved = await resolveProviderKeyToken(c.env, provider.id, apiKeyEntry)
    if (resolved) {
      apiKey = resolved.token
      if (resolved.chatgptAccountId) {
        extraHeaders = { 'ChatGPT-Account-Id': resolved.chatgptAccountId }
      }
    }
  }

  const result = await testModelConnection(provider.baseUrl, apiKey, modelId, provider.apiType, extraHeaders)

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
  const batchMerge = new Map<string, { provider: Provider; apiKeys: ApiKeyEntry[]; modelIds: Set<string> }>()

  for (const acct of rawAccounts) {
    const isOAuth = acct.type === 'oauth'
    if (acct.type !== 'apikey' && !isOAuth) {
      skipped.push({ name: acct.name || '(unnamed)', reason: `不支持的账号类型 (${acct.type})，跳过` })
      continue
    }

    const name = acct.name?.trim() || 'imported'
    const baseUrl = (acct.credentials?.base_url || (isOAuth ? 'https://api.openai.com/v1' : '')).replace(/\/$/, '')
    const apiKey = acct.credentials?.api_key || acct.credentials?.access_token || ''
    const modelMapping = acct.credentials?.model_mapping || {}

    if (!baseUrl || !apiKey) {
      skipped.push({ name, reason: '缺少 base_url 或凭据 (api_key / access_token)' })
      continue
    }

    let keyEntry: ApiKeyEntry = { key: apiKey, enabled: true }
    if (isOAuth) {
      const secret = getEncryptionSecret(c.env)
      const encAccess = await encryptSecret(acct.credentials.access_token, secret)
      const encRefresh = acct.credentials.refresh_token
        ? await encryptSecret(acct.credentials.refresh_token, secret)
        : undefined
      const payload = parseJwtPayload(acct.credentials.access_token)
      const email = acct.credentials.email || (payload.email as string) || ''
      const chatgptAccountId = acct.credentials.chatgpt_account_id || acct.credentials.account_id || (payload.account_id as string) || ''
      const keyId = `oauth_${(email || chatgptAccountId || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 32)}`

      keyEntry = {
        key: keyId,
        enabled: true,
        type: 'openai-oauth',
        accessToken: encAccess,
        refreshToken: encRefresh,
        expiresAt: acct.credentials.expires_at || undefined,
        clientId: acct.credentials.client_id || undefined,
        chatgptAccountId: chatgptAccountId || undefined,
        email: email || undefined,
      }
    }

    const urlKey = baseUrl.toLowerCase()
    const models = Object.keys(modelMapping)

    // 1) 检查是否与已有提供商 baseUrl 相同 → 合并
    const existingProvider = existingByUrl.get(urlKey)
    if (existingProvider) {
      // 追加 API Key（去重）
      const keyExists = existingProvider.apiKeys.some(k => k.key === keyEntry.key)
      if (!keyExists) {
        existingProvider.apiKeys.push(keyEntry)
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
      if (!batchEntry.apiKeys.some(k => k.key === keyEntry.key)) {
        batchEntry.apiKeys.push(keyEntry)
      }
      for (const mid of models) {
        batchEntry.modelIds.add(mid)
      }
      imported.push({ id: batchEntry.provider.id, name: name, models: models.length, merged: true })
      continue
    }

    // 3) 新提供商——从 baseUrl 主机名生成唯一 ID
    const allCreatedIds = new Set(existing.map(p => p.id))
    for (const [, entry] of batchMerge) {
      allCreatedIds.add(entry.provider.id)
    }
    const id = createProviderId(baseUrl, name, allCreatedIds)

    const now = new Date().toISOString()
    const provider: Provider = {
      id,
      name,
      baseUrl,
      apiType: isOAuth ? 'openai-oauth' : (acct.platform === 'anthropic' ? 'anthropic' : 'openai'),
      apiKeys: [keyEntry],
      models: models.map(mid => ({ id: mid, enabled: true })),
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }

    batchMerge.set(urlKey, { provider, apiKeys: [keyEntry], modelIds: new Set(models) })
    imported.push({ id: provider.id, name: provider.name, models: models.length, merged: false })
  }

  // 批量写入暂存的合并条目
  for (const [, entry] of batchMerge) {
    entry.provider.apiKeys = entry.apiKeys
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
    let keyStats = { total: p.apiKeys.filter(k => k.enabled).length, healthy: p.apiKeys.filter(k => k.enabled).length, demoted: 0 }
    let demotedKeys = 0
    try {
      const raw = await c.env.KV.get('key:health:' + p.id)
      if (raw) {
        const kh = JSON.parse(raw) as Record<string, { failures: number }>
        const enabledKeySet = new Set(p.apiKeys.filter(k => k.enabled).map(k => k.key))
        const keys = Object.entries(kh)
          .filter(([key]) => enabledKeySet.has(key))
          .map(([, value]) => value)
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

  // 尝试所有启用 Key；自动暂停通常由短暂的 503 触发，不能只测试第一个 Key。
  const enabledKeys = provider.apiKeys.filter(k => k.enabled)
  if (enabledKeys.length === 0) {
    return c.json<ApiResponse>({ success: false, message: '该提供商没有可用的 API Key' }, 400)
  }

  const enabledModels = provider.models.filter(m => m.enabled)

  let lastResult: { success: boolean; message: string; statusCode?: number } = { success: false, message: '未完成连接测试' }
  let allAttemptsTransient = true
  const markAttempt = (result: { success: boolean; message: string; statusCode?: number }) => {
    lastResult = result
    // 404 可能只是该提供商不支持某个探测端点；5xx/429/网络错误也不说明 Key 无效。
    const status = result.statusCode
    if (status !== undefined && status !== 404 && status !== 408 && status !== 409 && status !== 425 && status !== 429 && status < 500) {
      allAttemptsTransient = false
    }
  }
  for (const key of enabledKeys) {
    let testKey = key.key
    let extraHeaders: Record<string, string> | undefined
    if (key.type === 'openai-oauth' || provider.apiType === 'openai-oauth') {
      const resolved = await resolveProviderKeyToken(c.env, provider.id, key)
      if (resolved) {
        testKey = resolved.token
        if (resolved.chatgptAccountId) {
          extraHeaders = { 'ChatGPT-Account-Id': resolved.chatgptAccountId }
        }
      }
    }
    // 优先使用 /models 验证 Key，避免某个模型暂时不可用导致恢复失败。
    const modelsResult = await fetchProviderModels(provider.baseUrl, testKey, provider.apiType, extraHeaders)
    markAttempt(modelsResult)
    if (modelsResult.success) {
      await recoverProvider(c.env, id)
      return c.json<ApiResponse>({ success: true, data: modelsResult, message: `恢复成功，提供商 "${provider.name}" 已重新启用` })
    }
    for (const model of enabledModels) {
      const modelResult = await testModelConnection(provider.baseUrl, testKey, model.id, provider.apiType, extraHeaders)
      markAttempt(modelResult)
      if (modelResult.success) {
        await recoverProvider(c.env, id)
        return c.json<ApiResponse>({ success: true, data: modelResult, message: `恢复成功，提供商 "${provider.name}" 已重新启用` })
      }
    }
  }

  // 如果所有探测都只是上游 503/429/端点暂不可用，仍然清掉旧的自动暂停状态，
  // 让后续真实请求可以重新尝试，而不是永久卡在“恢复失败”。
  if (allAttemptsTransient) {
    await recoverProvider(c.env, id)
    return c.json<ApiResponse>({
      success: true,
      data: lastResult,
      message: `已清除暂停状态并重新启用；上游当前仍返回 ${lastResult.statusCode ? `HTTP ${lastResult.statusCode}` : '暂时不可用'}`,
    })
  }

  return c.json<ApiResponse>({
    success: false,
    data: lastResult,
    message: `恢复失败: ${lastResult.message}`,
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

// ===== OpenAI OAuth 授权流程 =====

/** 发起 OpenAI OAuth PKCE 授权 */
export async function handleOpenAIOAuthStart(c: Context<{ Bindings: Env }>) {
  const url = new URL(c.req.url)
  const providerId = url.searchParams.get('providerId') || 'openai'
  const customClientId = url.searchParams.get('clientId') || c.env.OPENAI_OAUTH_CLIENT_ID || OPENAI_OAUTH_CONFIG.DEFAULT_CLIENT_ID
  const redirectUri = url.searchParams.get('redirectUri') || `${url.origin}/admin/oauth/openai/callback`

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateState()

  const secret = getEncryptionSecret(c.env)
  const encryptedCodeVerifier = await encryptSecret(codeVerifier, secret)

  const session: OpenAIOAuthSession = {
    state,
    encryptedCodeVerifier,
    createdAt: new Date().toISOString(),
    providerId,
    redirectUri,
    clientId: customClientId,
  }

  // 存入 KV 临时会话
  await createOpenAIOAuthSession(c.env, state, session, OPENAI_OAUTH_CONFIG.SESSION_TTL)

  const authUrl = buildOpenAIAuthorizeUrl({
    clientId: customClientId,
    redirectUri,
    state,
    codeChallenge,
  })

  if (url.searchParams.get('direct') === '1') {
    return c.redirect(authUrl)
  }

  return c.json<ApiResponse<{ authUrl: string; state: string }>>({
    success: true,
    data: { authUrl, state },
  })
}

/** OpenAI OAuth 回调处理 */
export async function handleOpenAIOAuthCallback(c: Context<{ Bindings: Env }>) {
  const url = new URL(c.req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  const renderCallbackResult = (success: boolean, message: string, email?: string, providerId?: string) => {
    return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${success ? '授权成功' : '授权失败'} — AI Gateway</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
  <style>
    body {
      margin: 0; padding: 0;
      background: #09090b; color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center; min-height: 100vh;
    }
    .card {
      background: rgba(24, 24, 27, 0.9);
      border: 1px solid ${success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'};
      border-radius: 14px; padding: 32px; max-width: 420px; width: 90%;
      text-align: center; box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    }
    .icon {
      font-size: 2.8rem; margin-bottom: 16px;
      color: ${success ? '#10b981' : '#ef4444'};
    }
    h2 { margin: 0 0 10px; font-size: 1.25rem; font-weight: 700; }
    p { margin: 0 0 16px; font-size: 0.9rem; color: #a1a1aa; line-height: 1.5; }
    .email { color: #f4f4f5; font-weight: 600; word-break: break-all; }
    .hint { font-size: 0.78rem; color: #71717a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon"><i class="fas ${success ? 'fa-check-circle' : 'fa-times-circle'}"></i></div>
    <h2>${success ? 'OpenAI 授权绑定成功' : 'OpenAI 授权失败'}</h2>
    <p>${message}${email ? `<br><span class="email">${email}</span>` : ''}</p>
    <div class="hint">${success ? '窗口将在 2 秒后自动关闭并同步...' : '请关闭此窗口并重试。'}</div>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: '${success ? 'openai_oauth_success' : 'openai_oauth_error'}',
        providerId: '${providerId || ''}',
        message: '${message.replace(/'/g, "\\'")}'
      }, '*');
      ${success ? 'setTimeout(function() { window.close() }, 2000);' : ''}
    } else {
      ${success ? 'setTimeout(function() { window.location.href = "/admin" }, 2000);' : ''}
    }
  </script>
</body>
</html>`)
  }

  if (oauthError) {
    return renderCallbackResult(false, errorDescription || oauthError || 'OpenAI 授权被取消或失败')
  }

  if (!code || !state) {
    return renderCallbackResult(false, '缺少 code 或 state 参数')
  }

  const session = await getOpenAIOAuthSession(c.env, state)
  if (!session) {
    return renderCallbackResult(false, '授权会话已过期或无效，请重新发起授权')
  }

  const secret = getEncryptionSecret(c.env)
  let codeVerifier = ''
  try {
    codeVerifier = await decryptSecret(session.encryptedCodeVerifier, secret)
  } catch {
    return renderCallbackResult(false, '解密授权验证码失败，请检查加密密钥配置')
  }

  const clientId = session.clientId || c.env.OPENAI_OAUTH_CLIENT_ID || OPENAI_OAUTH_CONFIG.DEFAULT_CLIENT_ID
  const redirectUri = session.redirectUri || `${url.origin}/admin/oauth/openai/callback`

  let tokenData: import('./oauth').OpenAITokenResponse
  try {
    tokenData = await exchangeOpenAICode({
      clientId,
      code,
      redirectUri,
      codeVerifier,
    })
  } catch (err: any) {
    return renderCallbackResult(false, `令牌交换失败: ${err.message || '未知错误'}`)
  }

  // 从 token 中解析账号与信息
  const payload = parseJwtPayload(tokenData.id_token || tokenData.access_token)
  const email = (payload.email as string) || (payload.sub as string) || ''
  const chatgptAccountId =
    tokenData.chatgpt_account_id ||
    (payload['https://api.openai.com/auth']?.chatgpt_account_id as string) ||
    (payload['https://api.openai.com/profile']?.account_id as string) ||
    (payload.account_id as string) ||
    (payload.org_id as string) ||
    ''

  const expiresIn = tokenData.expires_in || 3600
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
  const encryptedAccessToken = await encryptSecret(tokenData.access_token, secret)
  const encryptedRefreshToken = tokenData.refresh_token ? await encryptSecret(tokenData.refresh_token, secret) : undefined

  // 目标提供商
  const providerId = session.providerId || 'openai'
  const provider = await getProvider(c.env, providerId)

  const keyId = `oauth_${(email || chatgptAccountId || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 32)}`
  const newApiKeyEntry: ApiKeyEntry = {
    key: keyId,
    enabled: true,
    type: 'openai-oauth',
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    expiresAt,
    clientId,
    chatgptAccountId: chatgptAccountId || undefined,
    email: email || undefined,
  }

  if (provider) {
    // 存在提供商，更新或追加 OAuth Key
    const existingIndex = provider.apiKeys.findIndex(k => k.key === keyId || k.type === 'openai-oauth')
    let nextKeys: ApiKeyEntry[] = []
    if (existingIndex >= 0) {
      nextKeys = [...provider.apiKeys]
      nextKeys[existingIndex] = newApiKeyEntry
    } else {
      nextKeys = [...provider.apiKeys, newApiKeyEntry]
    }
    await updateProvider(c.env, provider.id, {
      apiKeys: nextKeys,
      apiType: provider.apiType || 'openai-oauth',
      enabled: true,
    })
  } else {
    // 不存在提供商，自动创建
    const now = new Date().toISOString()
    const newProvider: Provider = {
      id: providerId,
      name: 'OpenAI (OAuth)',
      baseUrl: 'https://api.openai.com/v1',
      apiType: 'openai-oauth',
      apiKeys: [newApiKeyEntry],
      models: [
        { id: 'gpt-4o', enabled: true },
        { id: 'gpt-4o-mini', enabled: true },
        { id: 'gpt-5.5', enabled: true },
        { id: 'gpt-5', enabled: true },
      ],
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }
    await addProvider(c.env, newProvider)
  }

  // 清除临时会话
  await deleteOpenAIOAuthSession(c.env, state)

  return renderCallbackResult(true, '已成功连接 OpenAI OAuth 账号！', email, providerId)
}
