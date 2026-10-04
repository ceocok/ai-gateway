import type { Provider } from './types'

export const SITE_CONFIG = {
  title: 'AI Gateway',
  subtitle: '统一的 AI 管理平台',
  author: 'QingYun',
  authorUrl: 'https://github.com/yutian81/ai-gateway',
  blogUrl: 'https://blog.notett.com',
  description: 'AI 提供商 API 代理网关 — 统一 /v1 接口转发',
  favicon: 'https://pan.811520.xyz/icon/ai.webp',
  faCdn: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css',
}

export const SESSION_TTL = 7 * 24 * 60 * 60

export const PROXY_KEY_PREFIX = 'sk_cf_'

// Key 降权后自动恢复的冷却时间 (毫秒)，默认 1 小时
export const KEY_HEALTH_COOLDOWN_MS = 60 * 60 * 1000

export const KV_KEYS = {
  PROVIDERS: 'providers',
  PROXY_KEYS: 'proxy:keys',
  SESSION_PREFIX: 'admin:session:',
  KEY_HEALTH_PREFIX: 'key:health:',
  PROVIDER_HEALTH_PREFIX: 'provider:health:',
  CALL_STATUS_PREFIX: 'call:status:',
  CALL_STATUS_RECENT: 'call:status:recent',
  OPENAI_OAUTH_SESSION_PREFIX: 'openai:oauth:session:',
} as const

export const OPENAI_OAUTH_CONFIG = {
  // Codex CLI 公用客户端配置（免自建应用）
  CODEX_CLIENT_ID: 'app_EMoamEEZ73f0CkXaXp7hrann',
  CODEX_REDIRECT_URI: 'http://localhost:1455/auth/callback',
  CODEX_AUTHORIZE_URL: 'https://auth.openai.com/oauth/authorize',
  CODEX_TOKEN_URL: 'https://auth.openai.com/oauth/token',

  // 默认授权端点与有效 OIDC 作用域
  AUTHORIZE_URL: 'https://auth.openai.com/oauth/authorize',
  TOKEN_URL: 'https://auth.openai.com/oauth/token',
  DEFAULT_CLIENT_ID: 'app_EMoamEEZ73f0CkXaXp7hrann',
  SCOPE: 'openid profile email offline_access',
  SESSION_TTL: 15 * 60, // 15 分钟临时会话
}

// 默认最新 OpenAI 与各平台预设模型列表
export const DEFAULT_OPENAI_MODELS: string[] = [
  'gpt-6.1-sol',
  'gpt-6-astra',
  'gpt-6-sol',
  'gpt-6-luna',
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
  'gpt-5.5',
  'gpt-4.5-preview',
  'o3-mini',
  'o1',
  'o1-mini',
  'o1-preview',
  'chatgpt-4o-latest',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'dall-e-3',
  'text-embedding-3-small',
  'text-embedding-3-large',
  'whisper-1',
  'tts-1',
]

export const DEFAULT_PROVIDER_MODELS: Record<string, string[]> = {
  openai: DEFAULT_OPENAI_MODELS,
  'openai-oauth': DEFAULT_OPENAI_MODELS,
  deepseek: [
    'deepseek-chat',
    'deepseek-reasoner',
    'deepseek-v3',
    'deepseek-r1',
  ],
  anthropic: [
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  gemini: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
}

// 有效期选项（秒）
export const EXPIRY_OPTIONS: Record<string, number | null> = {
  '30d': 30 * 24 * 60 * 60,
  '90d': 90 * 24 * 60 * 60,
  '180d': 180 * 24 * 60 * 60,
  '1y': 365 * 24 * 60 * 60,
  'forever': null,
}

export const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    apiType: 'openai',
    apiKeys: [],
    models: [
      { id: 'deepseek-v4-flash', enabled: true },
      { id: 'deepseek-v4-pro', enabled: true },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiType: 'openai',
    apiKeys: [],
    models: [
      { id: 'gpt-6.1-sol', enabled: true },
      { id: 'gpt-6-astra', enabled: true },
      { id: 'gpt-6-sol', enabled: true },
      { id: 'gpt-6-luna', enabled: true },
      { id: 'gpt-5.6-sol', enabled: true },
      { id: 'gpt-5.6-terra', enabled: true },
      { id: 'gpt-5.6-luna', enabled: true },
      { id: 'gpt-5.5', enabled: true },
      { id: 'gpt-4o', enabled: true },
      { id: 'gpt-4o-mini', enabled: true },
      { id: 'o3-mini', enabled: true },
      { id: 'o1', enabled: true },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiType: 'anthropic',
    apiKeys: [],
    models: [
      { id: 'claude-opus-4-8', enabled: true },
      { id: 'claude-sonnet-5', enabled: true },
      { id: 'claude-fable-5', enabled: true },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gemini',
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    apiType: 'openai',
    apiKeys: [],
    models: [
      { id: 'gemini-3.5-flash', enabled: true },
      { id: 'gemini-3.1-pro', enabled: true },
      { id: 'gemini-3.1-flash-lite', enabled: true },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
