import type { ApiKeyEntry, Env, Provider } from './types'
import { OPENAI_OAUTH_CONFIG, OPENAI_PROXY_TOKEN_URL, isOpenAIGeoBlocked } from './config'
import { getProvider, updateProviderOAuthKey } from './storage'

// ===== Base64 URL 编解码 =====

export function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4 !== 0) {
    base64 += '='
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ===== PKCE 生成器 =====

/** 生成 64 字符 URL 安全随机字符串作为 PKCE code_verifier */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(48)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

/** 生成 S256 code_challenge */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(hash)
}

/** 生成随机防 CSRF state */
export function generateState(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

// ===== AES-GCM 对称加解密 =====

export function getEncryptionSecret(env: Env): string {
  return env.OAUTH_ENCRYPTION_KEY || env.ADMIN_PASSWORD || 'ai-gateway-oauth-default-secret-salt-2026'
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = enc.encode(secret)
  const hash = await crypto.subtle.digest('SHA-256', keyMaterial)
  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

/** 使用 AES-256-GCM 加密敏感数据 */
export async function encryptSecret(plaintext: string, secret: string): Promise<string> {
  const key = await deriveAesKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  const cipherBytes = new Uint8Array(encrypted)
  const combined = new Uint8Array(iv.length + cipherBytes.length)
  combined.set(iv, 0)
  combined.set(cipherBytes, iv.length)
  return base64UrlEncode(combined)
}

/** 解密敏感数据 */
export async function decryptSecret(ciphertext: string, secret: string): Promise<string> {
  const key = await deriveAesKey(secret)
  const combined = base64UrlDecode(ciphertext)
  if (combined.length < 13) {
    throw new Error('密文长度无效')
  }
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  return new TextDecoder().decode(decrypted)
}

// ===== JWT Payload 解析 =====

export function parseJwtPayload(token: string): Record<string, any> {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return {}
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4 !== 0) {
      base64 += '='
    }
    const binary = atob(base64)
    const json = decodeURIComponent(
      binary
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return {}
  }
}

// ===== OpenAI OAuth 协议交互 =====

export function buildOpenAIAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
  scope?: string
  authorizeUrl?: string
  nonce?: string
}): string {
  const base = params.authorizeUrl || OPENAI_OAUTH_CONFIG.AUTHORIZE_URL
  const url = new URL(base)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', params.scope || OPENAI_OAUTH_CONFIG.SCOPE)
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  if (params.nonce) {
    url.searchParams.set('nonce', params.nonce)
  }
  if (params.clientId === 'dynamic_agent_client') {
    url.searchParams.set('agent_name_hint', 'AI Gateway')
    url.searchParams.set('ext_agent_host_id', `urn:uuid:${crypto.randomUUID()}`)
  }
  return url.toString()
}

export interface OpenAITokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  id_token?: string
  chatgpt_account_id?: string
  error?: string | { message?: string; type?: string; code?: string; param?: any }
  error_description?: string
  message?: string
}

export async function parseOAuthResponseError(response: Response, defaultPrefix = '令牌操作失败'): Promise<string> {
  const status = response.status
  try {
    const raw = await response.text()
    try {
      const data = JSON.parse(raw)
      if (typeof data.error === 'string') {
        return data.error_description ? `${data.error}: ${data.error_description}` : data.error
      }
      if (data.error && typeof data.error === 'object') {
        return data.error.message || data.error.code || JSON.stringify(data.error)
      }
      if (data.error_description) {
        return data.error_description
      }
      if (data.message) {
        return data.message
      }
    } catch {
      if (raw && raw.length < 300) return raw
    }
  } catch {}
  return `${defaultPrefix} (HTTP ${status})`
}

export async function exchangeOpenAICode(params: {
  tokenUrl?: string
  fallbackTokenUrl?: string
  clientId: string
  clientSecret?: string
  code: string
  redirectUri: string
  codeVerifier: string
}): Promise<OpenAITokenResponse> {
  const url = params.tokenUrl || OPENAI_OAUTH_CONFIG.TOKEN_URL
  const form = new URLSearchParams()
  form.set('grant_type', 'authorization_code')
  form.set('client_id', params.clientId)
  form.set('code', params.code)
  form.set('redirect_uri', params.redirectUri)
  form.set('code_verifier', params.codeVerifier)
  if (params.clientSecret) {
    form.set('client_secret', params.clientSecret)
  }

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: form.toString(),
  })

  // 如果遇到 403 地区限制且有备用代理 Token 端点，自动重试
  if (response.status === 403 && (url.includes('openai.com') || params.fallbackTokenUrl)) {
    const errText = await response.clone().text().catch(() => '')
    if (isOpenAIGeoBlocked(response.status, errText)) {
      const fallbackUrl = params.fallbackTokenUrl || OPENAI_PROXY_TOKEN_URL
      if (fallbackUrl !== url) {
        response = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: form.toString(),
        })
      }
    }
  }

  if (!response.ok) {
    const errMsg = await parseOAuthResponseError(response, '令牌交换失败')
    throw new Error(errMsg)
  }

  return (await response.json()) as OpenAITokenResponse
}

export async function refreshOpenAIToken(
  env: Env,
  providerId: string,
  keyEntry: ApiKeyEntry
): Promise<ApiKeyEntry | null> {
  if (!keyEntry.refreshToken) return null

  const secret = getEncryptionSecret(env)
  let rawRefreshToken = ''
  try {
    rawRefreshToken = await decryptSecret(keyEntry.refreshToken, secret)
  } catch {
    // 可能是未加密的原始 token
    rawRefreshToken = keyEntry.refreshToken
  }

  const clientId = keyEntry.clientId || env.OPENAI_OAUTH_CLIENT_ID || OPENAI_OAUTH_CONFIG.CODEX_CLIENT_ID
  const tokenUrl = env.OPENAI_OAUTH_TOKEN_URL || OPENAI_OAUTH_CONFIG.TOKEN_URL
  const fallbackTokenUrl = env.OPENAI_FALLBACK_TOKEN_URL || OPENAI_PROXY_TOKEN_URL

  try {
    const form = new URLSearchParams()
    form.set('grant_type', 'refresh_token')
    form.set('client_id', clientId)
    form.set('refresh_token', rawRefreshToken)

    let response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: form.toString(),
    })

    if (response.status === 403 && (tokenUrl.includes('openai.com') || fallbackTokenUrl)) {
      const errText = await response.clone().text().catch(() => '')
      if (isOpenAIGeoBlocked(response.status, errText)) {
        if (fallbackTokenUrl !== tokenUrl) {
          response = await fetch(fallbackTokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
            },
            body: form.toString(),
          })
        }
      }
    }

    if (!response.ok) {
      const errMsg = await parseOAuthResponseError(response, '刷新令牌失败')
      console.error(`OpenAI OAuth 令牌刷新失败: ${errMsg}`)
      return null
    }

    const data = (await response.json()) as OpenAITokenResponse
    const newAccessToken = data.access_token
    const newRefreshToken = data.refresh_token || rawRefreshToken
    const expiresIn = data.expires_in || 3600
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const updated: ApiKeyEntry = {
      ...keyEntry,
      accessToken: await encryptSecret(newAccessToken, secret),
      refreshToken: await encryptSecret(newRefreshToken, secret),
      expiresAt,
    }

    if (data.chatgpt_account_id && !updated.chatgptAccountId) {
      updated.chatgptAccountId = data.chatgpt_account_id
    }

    await updateProviderOAuthKey(env, providerId, updated)
    return updated
  } catch (err) {
    console.error('刷新 OpenAI OAuth 令牌网络异常:', err)
    return null
  }
}

/**
 * 获取用于请求的真实有效令牌（支持自动刷新与解密）
 */
export async function resolveProviderKeyToken(
  env: Env,
  providerId: string,
  keyEntry: ApiKeyEntry
): Promise<{ token: string; chatgptAccountId?: string } | null> {
  if (keyEntry.type !== 'openai-oauth') {
    return { token: keyEntry.key }
  }

  const secret = getEncryptionSecret(env)

  // 检查是否过期或即将在 2 分钟内过期
  let entry = keyEntry
  let needsRefresh = false
  if (entry.expiresAt) {
    const exp = new Date(entry.expiresAt).getTime()
    if (Date.now() >= exp - 120000) {
      needsRefresh = true
    }
  } else if (!entry.accessToken && entry.refreshToken) {
    needsRefresh = true
  }

  if (needsRefresh && entry.refreshToken) {
    const refreshed = await refreshOpenAIToken(env, providerId, entry)
    if (refreshed) entry = refreshed
  }

  if (!entry.accessToken) {
    return null
  }

  try {
    const decrypted = await decryptSecret(entry.accessToken, secret)
    return {
      token: decrypted,
      chatgptAccountId: entry.chatgptAccountId,
    }
  } catch {
    // 可能是未加密的裸 token
    return {
      token: entry.accessToken,
      chatgptAccountId: entry.chatgptAccountId,
    }
  }
}
