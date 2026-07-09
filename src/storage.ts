import { KV_KEYS } from './config'
import type { CallStatusRecord, Env, Provider, ProviderHealth, ProxyKey, Session } from './types'

const CALL_STATUS_LIMIT = 30
const CALL_STATUS_TTL_SECONDS = 60 * 60 * 2

// ===== 提供商 CRUD =====

export async function getProviders(env: Env): Promise<Provider[]> {
  const data = await env.KV.get(KV_KEYS.PROVIDERS)
  return data ? JSON.parse(data) : []
}

export async function getProvider(env: Env, id: string): Promise<Provider | null> {
  const providers = await getProviders(env)
  return providers.find((p) => p.id === id) ?? null
}

export async function setProviders(env: Env, providers: Provider[]): Promise<void> {
  await env.KV.put(KV_KEYS.PROVIDERS, JSON.stringify(providers))
}

export async function addProvider(env: Env, provider: Provider): Promise<void> {
  const providers = await getProviders(env)
  providers.push(provider)
  await setProviders(env, providers)
}

export async function updateProvider(env: Env, id: string, updates: Partial<Provider>): Promise<Provider | null> {
  const providers = await getProviders(env)
  const index = providers.findIndex((p) => p.id === id)
  if (index === -1) return null
  providers[index] = { ...providers[index], ...updates, updatedAt: new Date().toISOString() }
  await setProviders(env, providers)
  return providers[index]
}

export async function deleteProvider(env: Env, id: string): Promise<boolean> {
  const providers = await getProviders(env)
  const filtered = providers.filter((p) => p.id !== id)
  if (filtered.length === providers.length) return false
  await setProviders(env, filtered)
  return true
}


// ===== Provider 健康状态 =====

export async function getProviderHealth(env: Env, providerId: string): Promise<ProviderHealth | null> {
  const raw = await env.KV.get(KV_KEYS.PROVIDER_HEALTH_PREFIX + providerId)
  return raw ? JSON.parse(raw) : null
}

export async function getAllProviderHealth(env: Env): Promise<Record<string, ProviderHealth>> {
  const providers = await getProviders(env)
  const result: Record<string, ProviderHealth> = {}
  for (const p of providers) {
    const h = await getProviderHealth(env, p.id)
    if (h) result[p.id] = h
  }
  return result
}

export async function setProviderHealth(env: Env, providerId: string, health: ProviderHealth): Promise<void> {
  await env.KV.put(KV_KEYS.PROVIDER_HEALTH_PREFIX + providerId, JSON.stringify(health))
}

export async function clearProviderHealth(env: Env, providerId: string): Promise<void> {
  await env.KV.delete(KV_KEYS.PROVIDER_HEALTH_PREFIX + providerId).catch(() => {})
}

export async function autoPauseProvider(env: Env, providerId: string, error: string): Promise<void> {
  const provider = await getProvider(env, providerId)
  if (!provider || !provider.enabled) return

  // 更新 provider enabled = false
  await updateProvider(env, providerId, { enabled: false })

  // 写入健康记录
  const health: ProviderHealth = {
    autoPaused: true,
    autoPausedAt: new Date().toISOString(),
    lastError: error,
    lastErrorAt: new Date().toISOString(),
    demotedKeys: 0,
    keyStats: { total: 0, healthy: 0, demoted: 0 },
  }
  await setProviderHealth(env, providerId, health)
}

export async function recoverProvider(env: Env, providerId: string): Promise<boolean> {
  const provider = await getProvider(env, providerId)
  if (!provider) return false

  // 清空 key 级健康记录
  await env.KV.delete(KV_KEYS.KEY_HEALTH_PREFIX + providerId).catch(() => {})
  // 清空 provider 级健康记录
  await clearProviderHealth(env, providerId)
  // 重新启用
  await updateProvider(env, providerId, { enabled: true })
  return true
}

// ===== 实时调用状态 =====

function callStatusKey(id: string): string {
  return KV_KEYS.CALL_STATUS_PREFIX + id
}

export async function recordCallStart(env: Env, record: CallStatusRecord): Promise<void> {
  await env.KV.put(callStatusKey(record.id), JSON.stringify(record), {
    expirationTtl: CALL_STATUS_TTL_SECONDS,
  })

  const raw = await env.KV.get(KV_KEYS.CALL_STATUS_RECENT)
  const ids = raw ? JSON.parse(raw) as string[] : []
  const next = [record.id, ...ids.filter(id => id !== record.id)].slice(0, CALL_STATUS_LIMIT)
  await env.KV.put(KV_KEYS.CALL_STATUS_RECENT, JSON.stringify(next), {
    expirationTtl: CALL_STATUS_TTL_SECONDS,
  })
}

export async function recordCallEnd(
  env: Env,
  id: string,
  updates: Pick<CallStatusRecord, 'status' | 'statusCode'> & Partial<Pick<CallStatusRecord, 'error'>>
): Promise<void> {
  const raw = await env.KV.get(callStatusKey(id))
  if (!raw) return

  const record = JSON.parse(raw) as CallStatusRecord
  const endedAt = new Date()
  const startedAt = new Date(record.startedAt).getTime()
  const next: CallStatusRecord = {
    ...record,
    ...updates,
    endedAt: endedAt.toISOString(),
    updatedAt: endedAt.toISOString(),
    durationMs: Math.max(0, endedAt.getTime() - startedAt),
  }

  await env.KV.put(callStatusKey(id), JSON.stringify(next), {
    expirationTtl: CALL_STATUS_TTL_SECONDS,
  })
}

export async function getRecentCallStatuses(env: Env): Promise<CallStatusRecord[]> {
  const raw = await env.KV.get(KV_KEYS.CALL_STATUS_RECENT)
  const ids = raw ? JSON.parse(raw) as string[] : []
  const records = await Promise.all(ids.map(async (id) => {
    const item = await env.KV.get(callStatusKey(id))
    return item ? JSON.parse(item) as CallStatusRecord : null
  }))

  return records
    .filter((item): item is CallStatusRecord => item !== null)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
}
// ===== Session 管理 =====

export async function createSession(env: Env, username: string, ttlSeconds: number): Promise<string> {
  const sessionId = crypto.randomUUID()
  const session: Session = {
    username,
    expiresAt: Date.now() + ttlSeconds * 1000,
  }
  await env.KV.put(KV_KEYS.SESSION_PREFIX + sessionId, JSON.stringify(session), {
    expirationTtl: ttlSeconds,
  })
  return sessionId
}

export async function getSession(env: Env, sessionId: string): Promise<Session | null> {
  const data = await env.KV.get(KV_KEYS.SESSION_PREFIX + sessionId)
  if (!data) return null
  const session: Session = JSON.parse(data)
  if (session.expiresAt < Date.now()) {
    await deleteSession(env, sessionId)
    return null
  }
  return session
}

export async function deleteSession(env: Env, sessionId: string): Promise<void> {
  await env.KV.delete(KV_KEYS.SESSION_PREFIX + sessionId)
}

// ===== 转发 Key =====

export async function getProxyKeys(env: Env): Promise<ProxyKey[]> {
  const data = await env.KV.get(KV_KEYS.PROXY_KEYS)
  return data ? JSON.parse(data) : []
}

export async function setProxyKeys(env: Env, keys: ProxyKey[]): Promise<void> {
  await env.KV.put(KV_KEYS.PROXY_KEYS, JSON.stringify(keys))
}

export async function addProxyKey(env: Env, key: ProxyKey): Promise<void> {
  const keys = await getProxyKeys(env)
  keys.push(key)
  await setProxyKeys(env, keys)
}

export async function deleteProxyKey(env: Env, id: string): Promise<boolean> {
  const keys = await getProxyKeys(env)
  const filtered = keys.filter((k) => k.id !== id)
  if (filtered.length === keys.length) return false
  await setProxyKeys(env, filtered)
  return true
}

export async function updateProxyKey(env: Env, id: string, updates: Partial<ProxyKey>): Promise<ProxyKey | null> {
  const keys = await getProxyKeys(env)
  const idx = keys.findIndex(k => k.id === id)
  if (idx === -1) return null
  keys[idx] = { ...keys[idx], ...updates }
  await setProxyKeys(env, keys)
  return keys[idx]
}

export async function validateProxyKey(env: Env, key: string): Promise<boolean> {
  const keys = await getProxyKeys(env)
  return keys.some((k) => {
    if (k.key !== key || !k.enabled) return false
    if (k.expiresAt) {
      const now = Date.now()
      const expires = new Date(k.expiresAt).getTime()
      if (now >= expires) return false
    }
    return true
  })
}

// ===== 初始数据填充 =====

import { DEFAULT_PROVIDERS, PROXY_KEY_PREFIX } from './config'

export async function seedInitialData(env: Env): Promise<void> {
  const providers = await getProviders(env)
  if (providers.length > 0) return // 已有数据，不做迁移

  // 首次运行：填充默认数据
  const seeded = DEFAULT_PROVIDERS.map((p) => ({
    ...p,
    apiKeys: p.apiKeys,
    models: p.models.map((m) => ({ ...m, enabled: true })),
  }))
  await setProviders(env, seeded)

  // 创建一个测试转发 Key
  const keys = await getProxyKeys(env)
  if (keys.length === 0) {
    const testKey = {
      id: crypto.randomUUID(),
      key: `${PROXY_KEY_PREFIX}${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
      name: '测试 Key',
      enabled: true,
      createdAt: new Date().toISOString(),
    }
    await addProxyKey(env, testKey)
  }
}
