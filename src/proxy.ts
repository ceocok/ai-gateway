import { Context } from 'hono'
import { getProvider, getProviders, autoPauseProvider, disableProviderKey, recordCallEnd, recordCallStart } from './storage'
import { KV_KEYS, KEY_HEALTH_COOLDOWN_MS, OPENAI_PROXY_BASE_URL, isOpenAIGeoBlocked } from './config'
import type { CallStatusRecord, Env, Provider, ProviderApiType, ProxyRequestBody } from './types'
import { refreshOpenAIToken, resolveProviderKeyToken } from './oauth'

export { isOpenAIGeoBlocked }

// ===== Key 健康状态类型和辅助函数 =====

interface KeyHealth {
  failures: number
  lastFailed: boolean
  demotedAt?: number  // 首次达到降权阈值的时间戳 (Date.now())
}
type HealthMap = Record<string, KeyHealth>

const HEALTH_KEY = (providerId: string) => KV_KEYS.KEY_HEALTH_PREFIX + providerId

async function readHealth(env: Env, providerId: string): Promise<HealthMap> {
  const raw = await env.KV.get(HEALTH_KEY(providerId))
  return raw ? JSON.parse(raw) : {}
}

async function writeHealth(env: Env, providerId: string, health: HealthMap): Promise<void> {
  // 只保存有失败记录的 key，避免 KV 膨胀
  const filtered: HealthMap = {}
  for (const [k, v] of Object.entries(health)) {
    if (v.failures > 0) filtered[k] = v
  }
  if (Object.keys(filtered).length > 0) {
    await env.KV.put(HEALTH_KEY(providerId), JSON.stringify(filtered))
  } else {
    // 全部健康，删除 KV 条目
    await env.KV.delete(HEALTH_KEY(providerId)).catch(() => {})
  }
}

/** 从响应头解析 Retry-After 返回冷却毫秒 */
function parseRetryAfterMs(response: Response): number | null {
  const val = response.headers.get('Retry-After')
  if (!val) return null
  const seconds = parseInt(val, 10)
  if (!isNaN(seconds) && seconds > 0) return seconds * 1000
  return null
}

export async function readUpstreamError(response: Response): Promise<string> {
  try {
    const body = await response.clone().text()
    if (!body) return ''
    try {
      const data = JSON.parse(body) as { error?: { code?: string; message?: string }; message?: string }
      const code = data.error?.code || ''
      const message = data.error?.message || data.message || ''
      return `${code} ${message} ${body}`.trim()
    } catch {
      return body
    }
  } catch {
    return ''
  }
}

function isUsageExhausted(status: number, errorBody: string): boolean {
  if (status === 402) return true
  if (status < 400) return false
  return /insufficient[\s_-]*quota|quota[\s_-]*(?:exceeded|exhausted|depleted)|resource[\s_-]*exhausted|billing|credit[\s_-]*(?:exhausted|balance|limit)|balance[\s_-]*(?:insufficient|exhausted|low)|payment[\s_-]*required|配额|额度|用量|余额|欠费|充值|耗尽|超额/i.test(errorBody)
}

/** 解析模型 ID，如 "deepseek/deepseek-chat" → { providerId, modelId } */
function parseModelId(model: string): { providerId: string; modelId: string } | null {
  const slashIndex = model.indexOf('/')
  if (slashIndex === -1) return null
  return {
    providerId: model.substring(0, slashIndex),
    modelId: model.substring(slashIndex + 1),
  }
}

function maskKey(key: string): string {
  if (!key) return '-'
  return key.length > 8 ? `****${key.slice(-4)}` : '****'
}

function createCallRecord(
  c: Context<{ Bindings: Env }>,
  provider: Provider,
  apiKey: string,
  modelId: string,
  requestedModel: string,
  forwardBody: ProxyRequestBody
): CallStatusRecord {
  const now = new Date().toISOString()
  const url = new URL(c.req.url)
  return {
    id: crypto.randomUUID(),
    status: 'running',
    providerId: provider.id,
    providerName: provider.name,
    modelId,
    requestedModel,
    apiType: provider.apiType || 'openai',
    path: `${url.pathname}${url.search}`,
    method: c.req.method,
    stream: forwardBody.stream === true,
    keyHint: maskKey(apiKey),
    startedAt: now,
    updatedAt: now,
  }
}

function monitorResponseBody(
  body: ReadableStream<Uint8Array>,
  onFinish: (status: 'success' | 'error', error?: string) => Promise<void>
): ReadableStream<Uint8Array> {
  const reader = body.getReader()
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (done) {
          await onFinish('success')
          controller.close()
          return
        }
        controller.enqueue(value)
      } catch (err) {
        const error = err as Error
        await onFinish('error', error.message || '响应流读取失败')
        controller.error(err)
      }
    },
    async cancel(reason) {
      await reader.cancel(reason).catch(() => {})
      await onFinish('error', '客户端取消请求')
    },
  })
}

export function normalizeProviderApiKey(apiKey: string): string {
  return apiKey.trim().replace(/^Bearer\s+/i, '')
}

export function buildEndpointUrls(baseUrl: string, subPath: string, search = ''): string[] {
  const cleanBase = baseUrl.replace(/\/$/, '')
  const cleanSubPath = subPath.replace(/^\//, '')
  const urls = [`${cleanBase}/${cleanSubPath}${search}`]

  if (!/\/v1$/i.test(cleanBase)) {
    urls.push(`${cleanBase}/v1/${cleanSubPath}${search}`)
  }

  return urls
}

/** 测试模型连接，发送最小请求验证 */
export async function testModelConnection(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  apiType?: ProviderApiType,
  extraHeaders?: Record<string, string>,
  env?: Env
): Promise<{ success: boolean; message: string; statusCode?: number }> {
  const normalizedApiKey = normalizeProviderApiKey(apiKey)
  try {
    const endpoint = apiType === 'anthropic' ? 'messages' : 'chat/completions'
    const urls = buildEndpointUrls(baseUrl, endpoint)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    }
    if (apiType === 'anthropic') {
      headers['x-api-key'] = normalizedApiKey
      headers['anthropic-version'] = '2023-06-01'
    } else {
      headers['Authorization'] = `Bearer ${normalizedApiKey}`
    }

    let lastResponse: Response | null = null
    const isReasoning = /^o[1-9]/i.test(modelId)
    const testPayload: Record<string, unknown> = {
      model: modelId,
      messages: [{ role: 'user', content: 'hi' }],
    }
    if (isReasoning) {
      testPayload.max_completion_tokens = 10
    } else {
      testPayload.max_tokens = 1
    }

    for (let i = 0; i < urls.length; i++) {
      let currentUrl = urls[i]
      let response = await fetch(currentUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(15000),
      })

      // 遇到 OpenAI 403 地区封锁时，自动走台湾反向代理重试
      if (response.status === 403 && (currentUrl.includes('openai.com') || baseUrl.includes('openai.com'))) {
        const errText = await response.clone().text().catch(() => '')
        if (isOpenAIGeoBlocked(response.status, errText)) {
          const fallbackBase = env?.OPENAI_FALLBACK_BASE_URL || OPENAI_PROXY_BASE_URL
          const fallbackUrl = currentUrl.replace(/^https?:\/\/(?:api\.)?openai\.com\/v1/i, fallbackBase)
          if (fallbackUrl !== currentUrl) {
            const retryResp = await fetch(fallbackUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(testPayload),
              signal: AbortSignal.timeout(15000),
            })
            response = retryResp
          }
        }
      }

      if (response.status === 404 && i < urls.length - 1) {
        lastResponse = response
        continue
      }

      lastResponse = response
      break
    }

    const response = lastResponse

    if (response?.ok) {
      return { success: true, message: '连接成功', statusCode: response.status }
    }

    let errorBody = ''
    try {
      const errorData = await response?.json() as { error?: { message?: string } }
      errorBody = errorData?.error?.message || JSON.stringify(errorData)
    } catch {
      errorBody = await response?.text() || '无响应'
    }

    let friendlyMessage = `HTTP ${response?.status || 0}: ${errorBody.substring(0, 200)}`
    if (response?.status === 401 && /token is expired|expired/i.test(errorBody)) {
      friendlyMessage = 'HTTP 401: OpenAI 访问令牌已过期。请在编辑窗口点击「打开 OpenAI 授权窗口」重新授权或在「直接填 Token」中粘贴最新 Token（建议包含 refresh_token 以实现自动静默续期）。'
    } else if (response?.status === 403 && isOpenAIGeoBlocked(403, errorBody)) {
      friendlyMessage = 'HTTP 403: 上游提示地区受限。建议将提供商 API 地址设置为台湾反向代理（https://tw1.vpsnat.com/v1）。'
    }

    return {
      success: false,
      message: friendlyMessage,
      statusCode: response?.status,
    }
  } catch (err) {
    const error = err as Error
    return {
      success: false,
      message: `连接失败: ${error.message?.substring(0, 200) || '未知错误'}`,
    }
  }
}

/** 处理 /v1/chat/completions 等 API 转发 */
export async function handleProxy(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json<ProxyRequestBody>()
    const model = body.model

    if (!model) {
      return c.json({ error: { message: '缺少 model 参数', type: 'invalid_request_error' } }, 400)
    }

    const forwardBody = { ...body }
    const parsed = parseModelId(model)

    if (parsed) {
      // 显式指定提供商: providerId/modelId
      const provider = await getProvider(c.env, parsed.providerId)
      if (!provider) {
        return c.json({ error: { message: `提供商 "${parsed.providerId}" 不存在`, type: 'invalid_request_error' } }, 404)
      }
      forwardBody.model = parsed.modelId
      const result = await tryProvider(c, provider, parsed.modelId, model, forwardBody)
      if (result) return result
      return c.json({ error: { message: `提供商 "${provider.name}" 的所有 Key 均不可用`, type: 'key_exhausted' } }, 502)
    }

    // 无前缀：搜索所有已启用提供商，随机容灾切换
    const modelId = model
    forwardBody.model = modelId
    const allProviders = await getProviders(c.env)
    const candidates = allProviders.filter(p =>
      p.enabled && p.models.some(m => m.id === modelId && m.enabled)
    )
    if (candidates.length === 0) {
      return c.json({
        error: { message: `模型 "${model}" 不存在于任何已启用的提供商中`, type: 'invalid_request_error' },
      }, 404)
    }

    // 随机打乱提供商顺序
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }

    let lastName = ''
    for (const candidate of candidates) {
      const provider = await getProvider(c.env, candidate.id)
      if (!provider || !provider.enabled) continue
      lastName = provider.name
      const result = await tryProvider(c, provider, modelId, model, forwardBody)
      if (result) return result
    }

    return c.json({
      error: { message: lastName ? `所有提供商（如 "${lastName}"）的 Key 均不可用` : '没有可用的提供商', type: 'key_exhausted' },
    }, 502)
  } catch (err) {
    const error = err as Error
    return c.json({
      error: { message: error.message || '代理转发内部错误', type: 'server_error' },
    }, 500)
  }
}

/**
 * 尝试用某个提供商转发请求。成功返回 Response，失败返回 null。
 * 内部包含单提供商内多个 Key 的自动容灾。
 */
async function tryProvider(
  c: Context<{ Bindings: Env }>,
  provider: Provider,
  modelId: string,
  requestedModel: string,
  forwardBody: ProxyRequestBody,
): Promise<Response | null> {
  const enabledKeys = provider.apiKeys.filter(k => k.enabled)
  if (enabledKeys.length === 0) return null

  const url = new URL(c.req.url)
  const subPath = url.pathname.replace(/^\/v1\//, '') || 'chat/completions'
  const forwardUrls = buildEndpointUrls(provider.baseUrl, subPath, url.search)

  // 按健康状态排序 key（单 Key 时无需读取健康记录）
  const healthData = enabledKeys.length > 1 ? await readHealth(c.env, provider.id) : {}
  const healthy: number[] = []
  const unhealthy: number[] = []
  const probation: number[] = []
  const demoted: number[] = []

  if (enabledKeys.length === 1) {
    healthy.push(0)
  } else {
    for (let i = 0; i < enabledKeys.length; i++) {
      const h = healthData[enabledKeys[i].key]
      if (h && h.failures >= 3) {
        if (!h.demotedAt) h.demotedAt = Date.now()
        if (Date.now() - h.demotedAt >= KEY_HEALTH_COOLDOWN_MS) {
          probation.push(i)
        } else {
          demoted.push(i)
        }
      } else if (h && h.lastFailed) {
        unhealthy.push(i)
      } else {
        healthy.push(i)
      }
    }
  }

  // 洗牌
  for (let i = healthy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [healthy[i], healthy[j]] = [healthy[j], healthy[i]]
  }

  const keyOrder = [...healthy, ...unhealthy, ...probation]
  let lastError: Response | null = null
  let healthUpdated = false

  for (const keyIndex of keyOrder) {
    const keyEntry = enabledKeys[keyIndex]
    const apiKey = keyEntry.key
    const callRecord = createCallRecord(c, provider, apiKey, modelId, requestedModel, forwardBody)
    await recordCallStart(c.env, callRecord).catch(() => {})
    let callClosed = false
    const finishCall = async (status: 'success' | 'error', statusCode?: number, error?: string) => {
      if (callClosed) return
      callClosed = true
      await recordCallEnd(c.env, callRecord.id, { status, statusCode, error }).catch(() => {})
    }

    try {
      const forwardHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      let tokenToUse = apiKey
      const isOAuth = keyEntry.type === 'openai-oauth' || provider.apiType === 'openai-oauth'
      if (isOAuth) {
        const resolved = await resolveProviderKeyToken(c.env, provider.id, keyEntry)
        if (!resolved) {
          await finishCall('error', 401, 'OAuth 凭据失效或未能获取访问令牌')
          continue
        }
        tokenToUse = resolved.token
        if (resolved.chatgptAccountId) {
          forwardHeaders['ChatGPT-Account-Id'] = resolved.chatgptAccountId
        }
      }

      const normalizedApiKey = normalizeProviderApiKey(tokenToUse)
      if (provider.apiType === 'anthropic') {
        forwardHeaders['x-api-key'] = normalizedApiKey
        forwardHeaders['anthropic-version'] = '2023-06-01'
      } else {
        forwardHeaders['Authorization'] = `Bearer ${normalizedApiKey}`
      }

      let response: Response | null = null
      for (let i = 0; i < forwardUrls.length; i++) {
        let reqUrl = forwardUrls[i]
        let current = await fetch(reqUrl, {
          method: c.req.method,
          headers: forwardHeaders,
          body: JSON.stringify(forwardBody),
          signal: AbortSignal.timeout(60000),
        })

        // 遭遇 OpenAI 区域限制时自动走代理重试
        if (current.status === 403 && (reqUrl.includes('openai.com') || provider.baseUrl.includes('openai.com'))) {
          const errText = await current.clone().text().catch(() => '')
          if (isOpenAIGeoBlocked(current.status, errText)) {
            const fallbackBase = c.env.OPENAI_FALLBACK_BASE_URL || OPENAI_PROXY_BASE_URL
            const fallbackUrl = reqUrl.replace(/^https?:\/\/(?:api\.)?openai\.com\/v1/i, fallbackBase)
            if (fallbackUrl !== reqUrl) {
              current = await fetch(fallbackUrl, {
                method: c.req.method,
                headers: forwardHeaders,
                body: JSON.stringify(forwardBody),
                signal: AbortSignal.timeout(60000),
              })
            }
          }
        }

        if (current.status === 404 && i < forwardUrls.length - 1) {
          response = current
          continue
        }

        response = current
        break
      }

      if (!response) {
        await finishCall('error', 502, '上游无响应')
        continue
      }

      // 遇到 401 时，若为 OAuth 账号则尝试自动刷新令牌并重试一次
      if (response.status === 401 && isOAuth && keyEntry.refreshToken) {
        const refreshed = await refreshOpenAIToken(c.env, provider.id, keyEntry)
        if (refreshed) {
          const resolvedNew = await resolveProviderKeyToken(c.env, provider.id, refreshed)
          if (resolvedNew) {
            forwardHeaders['Authorization'] = `Bearer ${normalizeProviderApiKey(resolvedNew.token)}`
            if (resolvedNew.chatgptAccountId) {
              forwardHeaders['ChatGPT-Account-Id'] = resolvedNew.chatgptAccountId
            }
            for (let i = 0; i < forwardUrls.length; i++) {
              let retryUrl = forwardUrls[i]
              let retryCurrent = await fetch(retryUrl, {
                method: c.req.method,
                headers: forwardHeaders,
                body: JSON.stringify(forwardBody),
                signal: AbortSignal.timeout(60000),
              })
              if (retryCurrent.status === 403 && (retryUrl.includes('openai.com') || provider.baseUrl.includes('openai.com'))) {
                const errText = await retryCurrent.clone().text().catch(() => '')
                if (isOpenAIGeoBlocked(retryCurrent.status, errText)) {
                  const fallbackBase = c.env.OPENAI_FALLBACK_BASE_URL || OPENAI_PROXY_BASE_URL
                  const fallbackUrl = retryUrl.replace(/^https?:\/\/(?:api\.)?openai\.com\/v1/i, fallbackBase)
                  if (fallbackUrl !== retryUrl) {
                    retryCurrent = await fetch(fallbackUrl, {
                      method: c.req.method,
                      headers: forwardHeaders,
                      body: JSON.stringify(forwardBody),
                      signal: AbortSignal.timeout(60000),
                    })
                  }
                }
              }
              if (retryCurrent.status === 404 && i < forwardUrls.length - 1) {
                response = retryCurrent
                continue
              }
              response = retryCurrent
              break
            }
          }
        }
      }

      if (response.ok) {
        if (healthData[apiKey]?.failures > 0) {
          delete healthData[apiKey]
          healthUpdated = true
        }
        if (healthUpdated) await writeHealth(c.env, provider.id, healthData)

        const responseHeaders: Record<string, string> = {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          'Cache-Control': 'no-store',
        }

        if (!response.body) {
          await finishCall('success', response.status)
          return new Response(null, {
            status: response.status,
            headers: responseHeaders,
          })
        }

        const monitoredBody = monitorResponseBody(response.body, async (status, error) => {
          await finishCall(status, status === 'success' ? response.status : 499, error)
        })
        return new Response(monitoredBody, {
          status: response.status,
          headers: responseHeaders,
        })
      }

      if (response.status === 401 || response.status === 402 || response.status === 403 || response.status === 429 || response.status >= 500) {
        const errorBody = await readUpstreamError(response)
        const usageExhausted = isUsageExhausted(response.status, errorBody)
        if (response.status >= 500) {
          // 5xx（尤其 503）表示上游服务瞬时不可用，与 Key 有效性无关。
          // 不累计 Key 失败次数，避免短暂故障把所有 Key 降权并自动暂停提供商。
        } else if (usageExhausted) {
          await disableProviderKey(c.env, provider.id, apiKey).catch(() => {})
          delete healthData[apiKey]
        } else {
          const h = healthData[apiKey] || { failures: 0, lastFailed: false }
          h.failures++
          h.lastFailed = true
          if (h.failures >= 3) {
            if (response.status === 429) {
              const retryAfterMs = parseRetryAfterMs(response)
              h.demotedAt = Date.now() - KEY_HEALTH_COOLDOWN_MS + (retryAfterMs ?? KEY_HEALTH_COOLDOWN_MS)
            } else {
              h.demotedAt = Date.now()
            }
          }
          healthData[apiKey] = h
        }
        // 只有实际修改了 Key 健康状态才写回并参与自动暂停判断。
        if (usageExhausted || response.status < 500) healthUpdated = true
        lastError = response
        await finishCall('error', response.status, `HTTP ${response.status}`)
        continue
      }

      const errorData = await response.json().catch(async () => ({ error: { message: await response.text() } }))
      await finishCall('error', response.status, `HTTP ${response.status}`)
      return c.json(errorData, response.status as Parameters<typeof c.json>[1])
    } catch (err) {
      const error = err as Error
      const h = healthData[apiKey] || { failures: 0, lastFailed: false }
      h.failures++
      h.lastFailed = true
      if (h.failures >= 3) {
        h.demotedAt = Date.now()
      }
      healthData[apiKey] = h
      healthUpdated = true
      lastError = new Response(JSON.stringify({
        error: { message: error.message || '请求失败', type: 'proxy_error' },
      }), { status: 502 })
      await finishCall('error', 502, error.message || '请求失败')
      continue
    }
  }

  if (healthUpdated) await writeHealth(c.env, provider.id, healthData)

  // 全部 Key 降权 → 自动暂停
  if (healthUpdated) {
    const demotedCount = enabledKeys.filter(k => {
      const h = healthData[k.key]
      return h && h.failures >= 3
    }).length
    if (demotedCount >= enabledKeys.length && enabledKeys.length > 0) {
      await autoPauseProvider(c.env, provider.id, `所有 Key 已降权: HTTP ${lastError?.status || 502}`)
    }
  }

  return null
}

/** 处理 /v1/models — 返回去重后的模型名（无提供商前缀） */
export async function handleModels(c: Context<{ Bindings: Env }>) {
  const providers = await getProviders(c.env)

  // 按模型名聚合，一个模型名对应多个提供商
  const modelMap = new Map<string, string[]>()
  for (const provider of providers) {
    if (!provider.enabled) continue
    for (const model of provider.models) {
      if (!model.enabled) continue
      const list = modelMap.get(model.id) || []
      list.push(provider.name)
      modelMap.set(model.id, list)
    }
  }

  const models: Array<{
    id: string
    object: string
    created: number
    owned_by: string
  }> = []

  for (const [modelId, providerNames] of modelMap) {
    models.push({
      id: modelId,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: providerNames.join(', '),
    })
  }

  return c.json({
    object: 'list',
    data: models,
  })
}
