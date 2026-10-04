export interface Model {
  id: string
  enabled: boolean
}

export interface ApiKeyEntry {
  key: string
  enabled: boolean
  /** 默认是 apikey；OAuth 凭据的 key 是不包含令牌内容的稳定 ID。 */
  type?: 'apikey' | 'openai-oauth'
  /** 以下字段仅用于 openai-oauth，值均为加密后的密文。 */
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
  clientId?: string
  chatgptAccountId?: string
  email?: string
}

export type ProviderApiType = 'openai' | 'anthropic' | 'openai-oauth'

export interface Provider {
  id: string
  name: string
  baseUrl: string
  apiType?: ProviderApiType
  apiKeys: ApiKeyEntry[]
  models: Model[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ProxyKey {
  id: string
  key: string
  name: string
  enabled: boolean
  createdAt: string
  expiresAt?: string | null
}

export interface Session {
  username: string
  expiresAt: number
}

export interface ProxyRequestBody {
  model?: string
  messages?: Array<{ role: string; content: string }>
  [key: string]: unknown
}

export interface TestModelRequest {
  modelId: string
}

export interface CreateProviderRequest {
  id?: string
  name: string
  baseUrl: string
  apiType?: ProviderApiType
  apiKeys?: Array<ApiKeyEntry | { key: string; enabled: boolean }>
  models?: Array<{ id: string; enabled: boolean }> | string[]
  enabled?: boolean
}

export interface UpdateProviderRequest {
  name?: string
  baseUrl?: string
  apiType?: ProviderApiType
  apiKeys?: Array<ApiKeyEntry | { key: string; enabled: boolean }>
  /** 管理后台编辑时保留服务端已有的 OAuth 凭据，避免令牌回显到浏览器。 */
  preserveOAuthCredentials?: boolean
  models?: Array<{ id: string; enabled: boolean }> | string[]
  enabled?: boolean
}

export interface OpenAIOAuthSession {
  state: string
  /** 使用 OAUTH_ENCRYPTION_KEY 加密后的 PKCE verifier。 */
  encryptedCodeVerifier: string
  createdAt: string
  providerId?: string
  redirectUri?: string
  clientId?: string
}

export interface CreateProxyKeyRequest {
  name?: string
  expiresIn?: string // '30d' | '90d' | '180d' | '1y' | 'forever'
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

export interface ProviderHealth {
  autoPaused: boolean
  autoPausedAt: string
  lastError: string
  lastErrorAt: string
  demotedKeys: number
  keyStats: {
    total: number
    healthy: number
    demoted: number
  }
}

export type CallStatusState = 'running' | 'success' | 'error'

export interface CallStatusRecord {
  id: string
  status: CallStatusState
  providerId: string
  providerName: string
  modelId: string
  requestedModel: string
  apiType: ProviderApiType
  path: string
  method: string
  stream: boolean
  keyHint: string
  startedAt: string
  updatedAt: string
  endedAt?: string
  durationMs?: number
  statusCode?: number
  error?: string
}

export interface Env {
  KV: KVNamespace
  ADMIN_USERNAME?: string
  ADMIN_PASSWORD?: string
  OAUTH_ENCRYPTION_KEY?: string
  OPENAI_OAUTH_CLIENT_ID?: string
  OPENAI_OAUTH_CLIENT_SECRET?: string
  OPENAI_OAUTH_TOKEN_URL?: string
  OPENAI_FALLBACK_BASE_URL?: string
  OPENAI_FALLBACK_TOKEN_URL?: string
}
