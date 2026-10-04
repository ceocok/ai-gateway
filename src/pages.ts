import { Context } from 'hono'
import { getProviders, getProxyKeys } from './storage'
import { SITE_CONFIG, DEFAULT_PROVIDER_MODELS } from './config'
import type { Env, ApiKeyEntry } from './types'
import { CSS_CONTENT } from './pages.css'

function escHtml(s: string): string {
  return s.replace(/&/g, "\&amp;").replace(/</g, "\&lt;").replace(/>/g, "\&gt;").replace(/"/g, "\&quot;").replace(/'/g, "\&#39;")
}

const H = (title: string) => `
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${SITE_CONFIG.title}</title>
  <link rel="icon" href="${SITE_CONFIG.favicon}">
  <link rel="stylesheet" href="${SITE_CONFIG.faCdn}">
  <style>${CSS_CONTENT}</style>
</head>`

// ===== Shared Header =====

function renderHeader(isLoggedIn: boolean, showAdminLink = true) {
  return `<hd><div class="ct">
  <h1><i class="fas fa-cloud"></i>${SITE_CONFIG.title} ${showAdminLink ? '' : `<span class="subtitle">${SITE_CONFIG.subtitle}</span>`}</h1>
  <div class="nav">
    ${!showAdminLink ? `<a href="/" class="btn btn-gh"><i class="fas fa-home"></i>首页</a>` : ''}
    ${showAdminLink
      ? isLoggedIn
        ? `<a href="/admin" class="btn btn-gh"><i class="fas fa-cog"></i><span class="nav-label">管理</span></a><a href="/admin/logout" class="btn btn-gh"><i class="fas fa-sign-out-alt"></i><span class="nav-label">退出</span></a>`
        : `<a href="/admin/login" class="btn btn-p"><i class="fas fa-sign-in-alt"></i>登录</a>`
      : isLoggedIn
        ? `<a href="/admin/logout" class="btn btn-gh"><i class="fas fa-sign-out-alt"></i>退出</a>`
        : ''
    }
  </div>
</div></hd>`
}

// ===== 首页 =====

export async function renderHomePage(c: Context<{ Bindings: Env }>, isLoggedIn: boolean) {
  const providers = await getProviders(c.env)
  const host = c.req.header('host') || 'localhost:8787'

  return c.html(`<!DOCTYPE html><html lang="zh-CN">
${H('首页')}
<body>
<div class="ambient-glow"></div>
${renderHeader(isLoggedIn, true)}

<main class="ct" style="padding:28px 20px;">

  <!-- Hero Bar -->
  <div class="hero-bar" style="margin-bottom:20px;">
    <div class="hero-bar-main">
      <div class="hero-bar-icon">
        <i class="fas fa-cubes"></i>
      </div>
      <div>
        <div class="hero-bar-title">模型广场</div>
        <div class="hero-bar-sub">${SITE_CONFIG.subtitle}</div>
      </div>
      <div class="hero-bar-spacer"></div>
      <div class="hero-bar-api">
        <span class="hero-bar-label">API</span>
        <code class="cd" style="font-size:0.8rem;">https://${host}/v1</code>
        <i class="fas fa-copy cp" style="font-size:0.7rem;color:var(--text-muted);cursor:pointer;" onclick='copyText("https://${host}/v1",this)'></i>
        <span class="hero-bar-fmt">格式：<code style="background:rgba(39,39,42,0.4);padding:1px 5px;border-radius:3px;font-size:0.7rem;">提供商ID/模型ID</code></span>
      </div>
    </div>
    <div class="hero-bar-stats">
      <div class="hero-bar-stat">
        <span class="hero-bar-stat-label">提供商</span>
        <span class="hero-bar-stat-val">${providers.length}</span>
        <span class="hero-bar-stat-sub"><i class="fas fa-check-circle" style="color:var(--success);"></i> ${providers.filter(p=>p.enabled).length} 在线</span>
      </div>
      <div class="hero-bar-stat-divider"></div>
      <div class="hero-bar-stat">
        <span class="hero-bar-stat-label">模型</span>
        <span class="hero-bar-stat-val">${providers.reduce((s,p)=>s+p.models.length,0)}</span>
        <span class="hero-bar-stat-sub"><i class="fas fa-check-circle" style="color:var(--success);"></i> ${providers.filter(p=>p.enabled).reduce((s,p)=>s+p.models.filter(m=>m.enabled).length,0)} 可用</span>
      </div>
    </div>
  </div>

  <!-- Toolbar: Search & Expand/Collapse -->
  <div class="home-toolbar">
    <div class="home-search-box">
      <i class="fas fa-search"></i>
      <input type="text" id="modelSearch" class="home-search-input" placeholder="搜索模型或提供商 (如 qwen, claude, deepseek)..." oninput="filterProviders(this.value)">
    </div>
    <div class="home-toolbar-actions">
      <button class="btn btn-gh btn-xs" onclick="expandAllProviders()"><i class="fas fa-chevron-down"></i> 全部展开</button>
      <button class="btn btn-gh btn-xs" onclick="collapseAllProviders()"><i class="fas fa-chevron-up"></i> 全部收起</button>
    </div>
  </div>

  <!-- Empty Search State -->
  <div id="homeEmptySearch" style="display:none;text-align:center;padding:40px 20px;color:var(--text-muted);">
    <i class="fas fa-search" style="font-size:1.8rem;margin-bottom:10px;opacity:0.35;"></i>
    <p style="font-size:0.88rem;">没有找到匹配的模型或提供商</p>
  </div>

  <!-- Provider List (Collapsible) -->
  <div class="home-provider-list" id="homeProviderList">
    ${providers.filter(p=>p.enabled).map(p => {
      const activeModels = p.models.filter(m=>m.enabled)
      return `
      <div class="home-provider-card" data-id="${escHtml(p.id)}" data-name="${escHtml(p.name)}">
        <div class="home-provider-hd" onclick="toggleProvider(this)">
          <div class="home-provider-left">
            <div class="home-provider-icon">
              <i class="fas fa-server"></i>
            </div>
            <div class="home-provider-info">
              <span class="home-provider-name">${escHtml(p.name)}</span>
              <span class="home-provider-id-badge">${escHtml(p.id)}</span>
              <span class="home-provider-type">${(p.apiType||'openai')==='anthropic'?'Anthropic':'OpenAI'}</span>
            </div>
          </div>
          <div class="home-provider-right">
            <span class="home-model-badge"><i class="fas fa-cubes" style="font-size:0.65rem;margin-right:3px;"></i>${activeModels.length} 个模型</span>
            <span class="bd-on"><i class="fas fa-check-circle"></i> 在线</span>
            <i class="fas fa-chevron-down home-provider-chevron"></i>
          </div>
        </div>
        <div class="home-provider-body">
          <div class="home-provider-tip">
            <i class="fas fa-info-circle"></i>
            <span>点击模型标签即可复制完整请求路径：</span>
            <code class="cd" style="font-size:0.7rem;">${escHtml(p.id)}/&lt;model_id&gt;</code>
          </div>
          ${activeModels.length
            ? `<div class="mw">${activeModels.map(m=>`<span class="tag" data-model="${escHtml(p.id)}/${escHtml(m.id)}" onclick='copyText("${escHtml(p.id)}/${escHtml(m.id)}",this)'><i class="fas fa-cube"></i>${escHtml(p.id)}/${escHtml(m.id)}</span>`).join('')}</div>`
            : `<p style="font-size:0.78rem;color:var(--text-muted);font-style:italic;padding:8px 0;">暂无启用的模型</p>`
          }
        </div>
      </div>
    `}).join('')}
  </div>
</main>

<footer><div class="ct">&copy; ${new Date().getFullYear()} <a href="${SITE_CONFIG.authorUrl}" target="_blank">${SITE_CONFIG.title}</a> by <a href="${SITE_CONFIG.blogUrl}" target="_blank">${SITE_CONFIG.author}</a></div></footer>

<script>
function toggleProvider(hdEl) {
  const card = hdEl.closest('.home-provider-card');
  if (card) {
    card.classList.toggle('expanded');
  }
}

function expandAllProviders() {
  document.querySelectorAll('.home-provider-card').forEach(card => card.classList.add('expanded'));
}

function collapseAllProviders() {
  document.querySelectorAll('.home-provider-card').forEach(card => card.classList.remove('expanded'));
}

function filterProviders(query) {
  const q = query.trim().toLowerCase();
  const cards = document.querySelectorAll('.home-provider-card');
  let matchCount = 0;
  cards.forEach(card => {
    const pName = (card.getAttribute('data-name') || '').toLowerCase();
    const pId = (card.getAttribute('data-id') || '').toLowerCase();
    const tags = card.querySelectorAll('.tag');
    let matchedInTags = 0;
    tags.forEach(tag => {
      const txt = (tag.getAttribute('data-model') || tag.textContent).toLowerCase();
      if (!q || txt.includes(q)) {
        tag.style.display = '';
        matchedInTags++;
      } else {
        tag.style.display = 'none';
      }
    });

    const isMatch = !q || pName.includes(q) || pId.includes(q) || matchedInTags > 0;
    if (isMatch) {
      card.style.display = '';
      matchCount++;
      if (q) {
        card.classList.add('expanded');
      }
    } else {
      card.style.display = 'none';
    }
  });

  const emptyEl = document.getElementById('homeEmptySearch');
  if (emptyEl) emptyEl.style.display = matchCount === 0 ? 'block' : 'none';
}

function copyText(t, el) {
  const ic = el.tagName === 'I' ? el : el.querySelector('i');
  if (!ic) return;
  const oc = ic.className;
  const os = ic.style.color;
  navigator.clipboard.writeText(t).then(() => {
    ic.className = 'fas fa-check';
    ic.style.color = '#34d399';
    setTimeout(() => {
      ic.className = oc;
      ic.style.color = os;
    }, 2500);
  }).catch(() => {});
}
</script>
</body></html>`)
}

// ===== 登录页 =====

export async function renderLoginPage(c: Context<{ Bindings: Env }>) {
  return c.html(`<!DOCTYPE html><html lang="zh-CN">
${H('登录')}
<body>
<div class="ambient-glow"></div>
${renderHeader(false, false)}

<div class="login-wrapper">
  <div class="login-card">
    <div style="text-align:center;margin-bottom:20px;">
      <div style="width:44px;height:44px;border-radius:10px;background:var(--primary-bg);display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">
        <i class="fas fa-lock" style="color:var(--primary);font-size:1rem;"></i>
      </div>
      <h2>管理员登录</h2>
      <p class="desc">账号由 Cloudflare 环境变量配置</p>
    </div>
    <div id="er" class="al al-e hd mb-2" style="margin-bottom:12px;"><i class="fas fa-exclamation-circle"></i><span id="em"></span></div>
    <div class="fg"><label><i class="fas fa-user" style="width:12px;"></i> 用户名</label>
      <input type="text" id="u" placeholder="请输入用户名" style="margin-top:4px;">
    </div>
    <div class="fg"><label><i class="fas fa-lock" style="width:12px;"></i> 密码</label>
      <input type="password" id="p" placeholder="请输入密码" style="margin-top:4px;" onkeydown="if(event.key==='Enter')l()">
    </div>
    <button class="btn btn-p fw" style="padding:9px;margin-top:4px;" onclick="l()"><i class="fas fa-sign-in-alt"></i> 登录</button>
  </div>
</div>

<script>
async function l() {
  const u = document.getElementById('u').value.trim(), p = document.getElementById('p').value
  const er = document.getElementById('er'), em = document.getElementById('em')
  if (!u || !p) { em.textContent = '请填写用户名和密码'; er.classList.remove('hd'); return }
  try {
    const r = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    })
    const d = await r.json()
    if (d.success) window.location.href = '/admin'
    else { em.textContent = d.message || '登录失败'; er.classList.remove('hd') }
  } catch (e) { em.textContent = '网络错误'; er.classList.remove('hd') }
}
</script>
</body></html>`)
}

// ===== 管理后台 =====

export async function renderAdminPage(c: Context<{ Bindings: Env }>) {
  const providers = await getProviders(c.env)
  const proxyKeys = await getProxyKeys(c.env)
  const host = c.req.header('host') || 'api.maxbox.cc.cd'
  const enabledProviders = providers.filter(p => p.enabled).length
  const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0)
  const enabledModels = providers.reduce((sum, p) => sum + p.models.filter(m => m.enabled).length, 0)
  const enabledProxyKeys = proxyKeys.filter(k => k.enabled).length

  function renderOAuthBox(providerId = '', email = '', isVisible = false, oauthKey?: ApiKeyEntry) {
    const isAdd = !providerId
    const prefix = isAdd ? 'a' : `e-${providerId}`
    const isExpired = oauthKey?.expiresAt ? (Date.now() >= new Date(oauthKey.expiresAt).getTime()) : false
    const hasRefresh = !!oauthKey?.refreshToken
    let statusBadge = ''
    if (email) {
      if (isExpired && !hasRefresh) {
        statusBadge = '<span style="color:#ef4444;font-size:0.7rem;margin-left:6px;"><i class="fas fa-exclamation-triangle"></i> 访问令牌已过期，请重新授权或补充 Refresh Token</span>'
      } else if (hasRefresh) {
        statusBadge = '<span style="color:#10b981;font-size:0.7rem;margin-left:6px;"><i class="fas fa-sync-alt"></i> 支持自动静默续期</span>'
      }
    }
    return `
    <div id="${isAdd ? 'aoauth-box' : `oauth-box-${providerId}`}" class="${isVisible ? '' : 'hd'} oauth-panel" style="margin-bottom:12px;padding:12px;border-radius:8px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.25);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <div>
          <div style="font-size:0.84rem;font-weight:700;color:var(--zinc-100);display:flex;align-items:center;gap:6px;">
            <i class="fab fa-openid" style="color:#10b981;"></i> OpenAI / ChatGPT OAuth 账号接入
          </div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;word-break:break-all;">
            ${email ? `<span style="color:#10b981;font-weight:600;"><i class="fas fa-check-circle"></i> 已绑定账号: ${escHtml(email)}</span>${statusBadge}` : '使用 ChatGPT 订阅免 API Key 接入，支持自动刷新与轮换'}
          </div>
        </div>
        <div style="display:flex;gap:4px;">
          <button type="button" class="btn btn-gh btn-xs oauth-tab-btn active" id="${prefix}-tab-codex" onclick="switchOAuthTab('${prefix}','codex')">ChatGPT 授权</button>
          <button type="button" class="btn btn-gh btn-xs oauth-tab-btn" id="${prefix}-tab-token" onclick="switchOAuthTab('${prefix}','token')">直接填 Token</button>
          <button type="button" class="btn btn-gh btn-xs oauth-tab-btn" id="${prefix}-tab-custom" onclick="switchOAuthTab('${prefix}','custom')">自有应用</button>
        </div>
      </div>

      <!-- Tab 1: 官方公共客户端授权 (最常用，免自建应用) -->
      <div id="${prefix}-pane-codex" class="oauth-tab-pane">
        <div style="font-size:0.73rem;color:var(--text-muted);margin-bottom:8px;line-height:1.4;">
          使用 OpenAI 官方客户端通道。点击下方按钮登录同意后，将浏览器跳转页面的地址栏链接粘贴回下方输入框：
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-p btn-xs" id="${prefix}-start-btn" onclick="startOpenAIOAuth('${providerId}','codex','${prefix}')">
            <i class="fas fa-external-link-alt"></i> 1. 打开 OpenAI 授权窗口
          </button>
          <span style="font-size:0.72rem;color:var(--text-muted);"><i class="fas fa-info-circle"></i> 授权后页面跳转至 http://localhost:1455/...（页面显示无法访问属正常）</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <input type="text" id="${prefix}-oauth-input" placeholder="2. 复制并粘贴地址栏完整链接 (http://localhost:1455/auth/callback?code=...) 或 code" class="fx1" style="font-size:0.75rem;min-height:30px;min-width:240px;font-family:monospace;">
          <button type="button" class="btn btn-gh btn-xs" id="${prefix}-exchange-btn" onclick="exchangeOAuthCode('${providerId}','${prefix}')" style="white-space:nowrap;flex-shrink:0;">
            <i class="fas fa-check"></i> 兑换并绑定
          </button>
        </div>
      </div>

      <!-- Tab 2: 直接导入 Token -->
      <div id="${prefix}-pane-token" class="oauth-tab-pane hd">
        <div style="font-size:0.73rem;color:var(--text-muted);margin-bottom:8px;line-height:1.4;">
          已有 ChatGPT 的 Access Token 或 Refresh Token，可直接粘贴保存。
        </div>

        <!-- 详细获取说明与相关网站 -->
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px 10px;margin-bottom:8px;font-size:0.72rem;line-height:1.6;">
          <div style="font-weight:600;color:var(--zinc-200);margin-bottom:4px;display:flex;align-items:center;gap:5px;">
            <i class="fas fa-key" style="color:#10b981;"></i> 如何获取 ChatGPT Token？
          </div>
          <div style="color:var(--text-muted);">
            <div><b>方法 1（官方网页 Session，极简推荐）：</b>浏览器登录 <a href="https://chatgpt.com" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:underline;">ChatGPT 网页版</a>，打开 <a href="https://chatgpt.com/api/auth/session" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:underline;">chatgpt.com/api/auth/session</a>，复制 <code class="cd" style="font-size:0.7rem;">accessToken</code>（或直接复制页面整个 JSON 粘贴到下方，会自动提取）。</div>
            <div style="margin-top:3px;"><b>方法 2（社区一键获取工具，含 Refresh Token）：</b>打开 <a href="https://token.oaifree.com" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:underline;">token.oaifree.com</a>，登录账号后一键复制 Access Token 与 Refresh Token（填写 Refresh Token 支持自动静默续期）。</div>
            <div style="margin-top:3px;"><b>方法 3（Codex CLI 本地配置）：</b>本地已登录使用过 Codex CLI 的设备，可打开本地文件 <code class="cd" style="font-size:0.7rem;">~/.codex/config.json</code> 直接复制。</div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:6px;">
          <input type="text" id="${prefix}-token-access" placeholder="Access Token (以 eyJ... 开头，或直接粘贴 session JSON)" class="fx1" style="font-size:0.75rem;min-height:30px;font-family:monospace;" oninput="onOAuthTokenPaste('${prefix}')">
          <div style="display:flex;align-items:center;gap:6px;">
            <input type="text" id="${prefix}-token-refresh" placeholder="Refresh Token (可选，填写后可在过期时自动静默刷新)" class="fx1" style="font-size:0.75rem;min-height:30px;font-family:monospace;">
            <button type="button" class="btn btn-p btn-xs" id="${prefix}-token-btn" onclick="importOAuthToken('${providerId}','${prefix}')" style="white-space:nowrap;">
              <i class="fas fa-save"></i> 保存并绑定
            </button>
          </div>
        </div>
      </div>

      <!-- Tab 3: 自建 OAuth 应用 (域名回调模式) -->
      <div id="${prefix}-pane-custom" class="oauth-tab-pane hd">
        <div style="font-size:0.73rem;color:var(--text-muted);margin-bottom:8px;line-height:1.4;">
          如在 OpenAI Developer 申请了 OAuth 应用，请在 OpenAI 后台设置 Redirect URI：
          <div style="margin-top:4px;display:flex;align-items:center;gap:6px;">
            <code class="cd" style="font-size:0.72rem;">https://${host}/admin/oauth/openai/callback</code>
            <i class="fas fa-copy cp" style="cursor:pointer;" onclick="copyText('https://${host}/admin/oauth/openai/callback',this)" title="复制回调地址"></i>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <input type="text" id="${prefix}-custom-client-id" placeholder="Client ID (例如 oaiapp_...)" class="fx1" style="font-size:0.75rem;min-height:30px;font-family:monospace;">
          <button type="button" class="btn btn-p btn-xs" id="${prefix}-custom-btn" onclick="startOpenAIOAuth('${providerId}','custom','${prefix}')" style="white-space:nowrap;">
            <i class="fas fa-sign-in-alt"></i> 域名回调授权
          </button>
        </div>
      </div>

      <!-- 实时状态与操作反馈 -->
      <div id="${prefix}-oauth-msg" class="hd"></div>
    </div>`
  }

  return c.html(`<!DOCTYPE html><html lang="zh-CN">
${H('管理')}
<body>
${renderHeader(true, false)}

<main class="ct admin-shell" style="position:relative;">
<div class="dash-glow"></div>
<div id="toast" class="hd toast"></div>

<!-- Hero + Metrics -->
<section class="admin-hero">
  <div class="hero-panel">
    <p class="eyebrow">Gateway Control</p>
    <h2>模型路由控制台</h2>
    <div class="hero-meta">
      <span><i class="fas fa-server"></i> ${enabledProviders}/${providers.length} 提供商在线</span>
      <span><i class="fas fa-cube"></i> ${enabledModels}/${totalModels} 模型启用</span>
      <code>/v1</code>
    </div>
  </div>
  <div class="metric-grid">
    <div class="metric"><i class="fas fa-server"></i><strong>${providers.length}</strong><span>提供商</span></div>
    <div class="metric"><i class="fas fa-bolt"></i><strong>${enabledProviders}</strong><span>在线</span></div>
    <div class="metric"><i class="fas fa-cubes"></i><strong>${totalModels}</strong><span>模型</span></div>
    <div class="metric"><i class="fas fa-key"></i><strong>${enabledProxyKeys}</strong><span>转发 Key</span></div>
  </div>
</section>

<!-- Calls Monitor -->
<section class="card call-monitor">
  <div class="call-monitor-head">
    <div>
      <p class="eyebrow">Live Calls</p>
      <h2><i class="fas fa-signal"></i> 实时调用状态</h2>
    </div>
    <button class="btn btn-gh btn-xs" onclick="loadCallStatus()"><i class="fas fa-sync"></i> 刷新</button>
  </div>
  <div class="call-stat-grid">
    <div class="call-stat"><span>运行中</span><strong id="cs-active">0</strong></div>
    <div class="call-stat"><span>成功</span><strong id="cs-success">0</strong></div>
    <div class="call-stat"><span>失败</span><strong id="cs-errors">0</strong></div>
    <div class="call-stat"><span>最近</span><strong id="cs-total">0</strong></div>
  </div>
  <div id="callRows" class="call-rows">
    <div class="call-empty"><i class="fas fa-circle-notch fa-spin"></i> 正在加载调用状态...</div>
  </div>
</section>

<!-- Providers -->
<div class="card provider-board">
  <div class="card-hd">
    <h2><i class="fas fa-server"></i> 提供商</h2>
    <div class="board-actions">
      <button class="btn btn-p btn-xs" onclick="showAdd()"><i class="fas fa-plus"></i> 添加</button>
      <button class="btn btn-gh btn-xs" onclick="showImport()"><i class="fas fa-file-import"></i> 导入</button>
    </div>
  </div>

  <!-- Add Form -->
  <div class="add-form-wrap">
    <div id="af" class="hd add-form-panel">
      <h3 style="font-size:0.88rem;font-weight:700;color:var(--zinc-100);margin-bottom:12px;"><i class="fas fa-plus-circle c-p"></i> 添加新提供商</h3>
      <div class="fg"><label>名称</label><input type="text" id="anm" placeholder="DeepSeek"></div>
      <div class="fg"><label>API 地址</label><input type="url" id="aurl" placeholder="https://api.deepseek.com"></div>
      <div class="fg">
        <label>API 格式</label>
        <select id="afmt" onchange="onAfmtChange(this.value)">
          <option value="openai">OpenAI 兼容</option>
          <option value="openai-oauth">OpenAI (OAuth 授权)</option>
          <option value="anthropic">Anthropic 兼容</option>
        </select>
      </div>
      ${renderOAuthBox('')}
      <div class="fg">
        <label>API Keys</label>
        <div id="akeys">
          <div class="fc mb-4"><input type="text" placeholder="sk-xxx" class="fx1 aki">
            <label class="tg"><input type="checkbox" checked class="ake"><span class="sl"></span></label>
            <button class="btn btn-gh btn-xs" onclick="testNewAKey(this)" title="测试"><i class="fas fa-plug"></i></button>
            <button class="btn btn-gh btn-xs" onclick="this.parentElement.remove()"><i class="fas fa-times c-muted"></i></button>
          </div>
        </div>
        <button class="btn btn-gh btn-xs" onclick="addAKeyRow()"><i class="fas fa-plus"></i> 添加 Key</button>
      </div>
      <div class="fg">
        <div class="model-field-head">
          <label>模型</label>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-gh btn-xs" type="button" onclick="prefillAddModels()">
              <i class="fas fa-sparkles"></i> 预填最新模型
            </button>
            <button class="btn btn-gh btn-xs" id="adiscover" onclick="discoverModels()">
              <i class="fas fa-cloud-download-alt"></i> 获取模型
            </button>
            <button class="btn btn-gh btn-xs" type="button" onclick="clearAddModels()" title="清空全部已添加模型" style="color:var(--danger);">
              <i class="fas fa-trash-alt"></i> 清空全部
            </button>
          </div>
        </div>
        <div class="model-discovery-hint">填写 API 地址和 Key 后获取可用模型；不支持模型列表接口时可手动添加。</div>
        <label class="manual-model-label">手动添加模型 ID</label>
        <div id="amodels">
          <div class="fc mb-4"><input type="text" placeholder="deepseek-chat" class="fx1 ami">
            <label class="tg"><input type="checkbox" checked class="ame"><span class="sl"></span></label>
            <button class="btn btn-gh btn-xs" onclick="testNewMdl(this)" title="测试"><i class="fas fa-plug"></i></button>
            <button class="btn btn-gh btn-xs" onclick="rmNewMdlRow(this)"><i class="fas fa-times c-muted"></i></button>
          </div>
        </div>
        <button class="btn btn-gh btn-xs" onclick="addMdlRow()"><i class="fas fa-plus"></i> 添加一行</button>
      </div>
      <div class="fg"><label class="tg" style="display:inline-flex;align-items:center;gap:8px;width:auto;height:auto;"><input type="checkbox" checked id="aen"><span class="sl"></span><span style="font-size:0.78rem;color:var(--zinc-300);text-transform:none;letter-spacing:0;font-weight:500;margin-left:4px;">创建后启用</span></label></div>
      <div id="atestR"></div>
      <div class="fa">
        <button class="btn btn-p" onclick="createProv()"><i class="fas fa-check"></i> 创建</button>
        <button class="btn btn-gh" onclick="hideAdd()">取消</button>
      </div>
    </div>
    <div id="amc" class="hd mdl-list-panel" style="align-self:start;">
      <h3 style="font-size:0.82rem;font-weight:700;color:var(--zinc-300);margin-bottom:8px;"><i class="fas fa-list-check c-p"></i> 选择可用模型</h3>
      <div id="amcl"></div>
    </div>
  </div>

  <!-- Provider Workbench -->
  <div class="provider-workbench">
    <div class="provider-list" aria-label="提供商列表">
      ${providers.length ? providers.map(p => `
      <div class="pi" data-id="${p.id}" onclick="selectProvider('${p.id}')">
        <div class="ps">
          <div class="l">
            <i class="fas fa-fw fa-server"></i>
            <div>
              <div class="provider-title-row">
                <span class="provider-dot ${p.enabled ? 'on' : 'off'}"></span>
                <span class="provider-name">${p.name}</span>
                <span class="provider-metrics">
                  <span id="hb-${p.id}"><span class="bd ${p.enabled ? 'bd-on' : 'bd-off'}">${p.enabled ? '<i class="fas fa-check-circle"></i> 已启用' : '<i class="fas fa-ban"></i> 已禁用'}</span></span>
                </span>
              </div>
              <div class="pu">
                <span><i class="fas fa-cubes"></i> ${p.models.length} 模型</span>
                <span><i class="fas fa-code"></i> ${p.apiType === 'openai-oauth' ? 'OpenAI OAuth' : ((p.apiType || 'openai') === 'anthropic' ? 'Anthropic' : 'OpenAI')}</span>
                ${p.apiKeys.some(k => k.type === 'openai-oauth') ? `<span class="bd bd-on" style="font-size:0.68rem;padding:1px 6px;margin-left:4px;"><i class="fab fa-openid"></i> OAuth</span>` : ''}
              </div>
            </div>
          </div>
          <span class="provider-edit-action"><i class="fas fa-pen"></i> 编辑</span>
        </div>
        <div class="provider-card-meta">
          <span><i class="fas fa-link"></i>${escHtml(p.baseUrl)}</span>
          <span><i class="fas fa-key"></i>${p.apiKeys.filter(k => k.enabled).length} 个可用 Key</span>
        </div>
      </div>
      `).join('') : `<div class="provider-empty"><i class="fas fa-server"></i><span>暂无提供商，点击右上角「添加」创建</span></div>`}
    </div>

    <div class="provider-detail-pane" aria-hidden="true">
      ${providers.length ? providers.map((p, pi) => `
      <div class="pd" id="dt-${p.id}" data-provider-id="${p.id}">
        <div class="detail-panel-head">
          <div>
            <p class="detail-eyebrow">Provider Details</p>
            <h3>${p.name}</h3>
          </div>
          <span class="bd ${p.enabled ? 'bd-on' : 'bd-off'}">${p.enabled ? '<i class="fas fa-check-circle"></i> 已启用' : '<i class="fas fa-ban"></i> 已禁用'}</span>
        </div>
        <div class="fr">
          <div class="fg"><label>名称</label><input type="text" id="nm-${p.id}" value="${escHtml(p.name)}"></div>
          <div class="fg"><label>API 地址</label><input type="url" id="url-${p.id}" value="${p.baseUrl}"></div>
        </div>
        <div class="fr">
          <div class="fg"><label>API 格式</label><select id="at-${p.id}" class="select-sm" onchange="onEditFmtChange('${p.id}', this.value)"><option value="openai" ${p.apiType==='openai'?'selected':''}>OpenAI 兼容</option><option value="openai-oauth" ${p.apiType==='openai-oauth'?'selected':''}>OpenAI (OAuth 授权)</option><option value="anthropic" ${p.apiType==='anthropic'?'selected':''}>Anthropic 兼容</option></select></div>
          <div class="fg" style="display:flex;align-items:flex-end;padding-bottom:4px;"><label class="tg" style="display:inline-flex;align-items:center;gap:8px;width:auto;height:auto;"><input type="checkbox" id="en-${p.id}" ${p.enabled?'checked':''} onchange="togglePb('${p.id}', this.checked)"><span class="sl"></span><span style="font-size:0.78rem;color:var(--zinc-300);text-transform:none;letter-spacing:0;font-weight:500;margin-left:4px;">已启用</span></label></div>
        </div>
        ${renderOAuthBox(p.id, p.apiKeys.find(k => k.type === 'openai-oauth')?.email || '', p.apiType === 'openai-oauth' || p.apiKeys.some(k => k.type === 'openai-oauth'), p.apiKeys.find(k => k.type === 'openai-oauth'))}
        <div class="fg">
          <label>API Keys</label>
          <div id="keys-${p.id}">
            ${p.apiKeys.map((k, ki) => `
              <div data-kidx="${ki}" style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:rgba(9,9,11,0.4);border:1px solid rgba(63,63,70,0.3);margin-bottom:6px;">
                ${k.type === 'openai-oauth' ? `
                  <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
                    <span style="font-size:0.75rem;color:#10b981;background:rgba(16,185,129,0.12);padding:3px 8px;border-radius:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;">
                      <i class="fab fa-openid"></i> ${escHtml(k.email || k.key)}
                    </span>
                    <span style="font-size:0.68rem;color:var(--text-muted);">(OAuth 账号)</span>
                  </div>
                  <input type="hidden" value="${escHtml(k.key)}" id="k-${p.id}-${ki}">
                ` : `
                  <input type="text" value="${escHtml(k.key)}" class="fx1" id="k-${p.id}-${ki}" placeholder="API Key" style="font-family:'SF Mono','Fira Code','JetBrains Mono',monospace;font-size:0.78rem;">
                `}
                <label class="tg"><input type="checkbox" ${k.enabled ? 'checked' : ''} id="ken-${p.id}-${ki}"><span class="sl"></span></label>
                <button class="btn btn-gh btn-xs" onclick="testKeyRow('${p.id}',${ki})" title="测试"><i class="fas fa-plug"></i></button>
                <button class="btn btn-gh btn-xs" onclick="rmKeyRow('${p.id}',${ki})"><i class="fas fa-times c-muted"></i></button>
              </div>
            `).join('')}
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
            <input type="text" id="nk-${p.id}" placeholder="新 Key..." class="fx1" style="font-size:0.78rem;min-height:30px;font-family:'SF Mono','Fira Code','JetBrains Mono',monospace;">
            <button class="btn btn-gh btn-xs" onclick="addKeyRow('${p.id}')"><i class="fas fa-plus"></i></button>
          </div>
        </div>
        <div class="fg">
          <div class="model-field-head">
            <label>模型</label>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <button class="btn btn-gh btn-xs" type="button" onclick="prefillLatestModels('${escHtml(p.id)}')">
                <i class="fas fa-sparkles"></i> 预填最新模型
              </button>
              <button class="btn btn-gh btn-xs" id="mdiscover-${p.id}" onclick="discoverProviderModels('${escHtml(p.id)}')">
                <i class="fas fa-cloud-download-alt"></i> 获取模型
              </button>
              <button class="btn btn-gh btn-xs" type="button" onclick="clearAllModels('${escHtml(p.id)}')" title="清空下方已添加的全部模型" style="color:var(--danger);">
                <i class="fas fa-trash-alt"></i> 清空全部
              </button>
            </div>
          </div>
          <div class="model-discovery-hint">使用当前 API 地址和 Key 读取可用模型；获取后可批量加入编辑列表。</div>
          <div id="mp-${p.id}" class="model-discovery-inline hd"></div>
          <div id="ml-${p.id}">
            ${p.models.map((m, mi) => `
              <div data-idx="${mi}" style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;background:rgba(9,9,11,0.4);border:1px solid rgba(63,63,70,0.3);margin-bottom:6px;">
                <input type="text" value="${escHtml(m.id)}" class="fx1" id="mid-${p.id}-${mi}" placeholder="模型 ID" style="font-family:'SF Mono','Fira Code','JetBrains Mono',monospace;font-size:0.78rem;">
                <label class="tg"><input type="checkbox" ${m.enabled?'checked':''} id="men-${p.id}-${mi}"><span class="sl"></span></label>
                <button class="btn btn-gh btn-xs" id="tm-${p.id}-${mi}" onclick="testMdl('${p.id}','${escHtml(m.id)}',${mi})"><i class="fas fa-plug"></i></button>
                <button class="btn btn-gh btn-xs" onclick="rmMdl('${p.id}',${mi})"><i class="fas fa-times c-muted"></i></button>
              </div>
            `).join('')}
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
            <input type="text" id="nmid-${p.id}" placeholder="新模型..." class="fx1" style="font-size:0.78rem;min-height:30px;font-family:'SF Mono','Fira Code','JetBrains Mono',monospace;">
            <button class="btn btn-gh btn-xs" onclick="addMdl('${p.id}')"><i class="fas fa-plus"></i></button>
          </div>
        </div>
        <div id="hs-${p.id}"></div>
        <div id="tr-${p.id}" style="margin-top:4px;"></div>
        <div class="fa detail-actions">
          <button class="btn btn-p btn-sm" onclick="save('${p.id}')"><i class="fas fa-save"></i> 保存</button>
          <button class="btn btn-gh btn-sm" onclick="closeProviderEditor()">取消</button>
          <button class="btn btn-d btn-sm" onclick="del('${p.id}')"><i class="fas fa-trash"></i> 删除</button>
        </div>
      </div>
      `).join('') : `<div class="provider-detail-empty"><i class="fas fa-arrow-left"></i><span>先创建一个提供商，再在这里编辑详细配置。</span></div>`}
    </div>
  </div>
</div>

<!-- Proxy Keys -->
<div class="card" style="margin-top:16px;">
  <div class="card-hd">
    <h2><i class="fas fa-key"></i> 转发 Keys</h2>
    <div class="board-actions">
      <button class="btn btn-p btn-xs" onclick="genKey()"><i class="fas fa-plus"></i> 生成</button>
    </div>
  </div>
  <div style="padding:4px 20px 20px;">
    ${proxyKeys.length
      ? `<div class="proxy-key-header">
          <span class="proxy-key-header-key">Key</span>
          <span class="proxy-key-header-name">名称</span>
          <span class="proxy-key-header-status">状态</span>
          <span class="proxy-key-header-toggle"></span>
          <span class="proxy-key-header-del"></span>
        </div>`
      : ''
    }
    ${proxyKeys.length
      ? proxyKeys.map(pk => `
      <div class="ki" data-id="${pk.id}">
        <div class="kv">
          <span id="kv-${pk.id}" data-full="${escHtml(pk.key)}" onclick="toggleKeyVis('${pk.id}')">
            ${pk.key.length > 12 ? pk.key.substring(0,8)+'****'+pk.key.substring(pk.key.length-4) : pk.key}
          </span>
          <i class="fas fa-copy cp" style="font-size:0.7rem;color:var(--text-muted);cursor:pointer;" onclick='copyText("${escHtml(pk.key)}",this)'></i>
        </div>
        <div class="ki-name">${pk.name || '-'}</div>
        <div class="ki-status">
          <span class="bd ${pk.enabled ? 'bd-on' : 'bd-off'}">${pk.enabled ? '已启用' : '已禁用'}</span>
        </div>
        <div class="ki-toggle">
          <label class="tg">
            <input type="checkbox" ${pk.enabled ? 'checked' : ''} onchange="toggleProxyKey('${pk.id}', this.checked)">
            <span class="sl"></span>
          </label>
        </div>
        <div class="ki-del">
          <button class="btn btn-gh btn-xs" onclick="rmKey('${pk.id}')" title="删除"><i class="fas fa-trash" style="color:var(--text-muted);"></i></button>
        </div>
      </div>
      `).join('')
      : `<div style="padding:24px 0;text-align:center;color:var(--text-muted);font-size:0.82rem;"><i class="fas fa-key" style="opacity:0.3;font-size:1.4rem;display:block;margin-bottom:8px;"></i>暂无转发 Key，点击上方「生成」创建</div>`
    }
  </div>
</div>

<!-- Import modal -->
<div id="s2a" class="hd" style="border:1px dashed var(--zinc-700);border-radius:10px;padding:20px;margin-top:12px;background:rgba(24,24,27,0.5);">
  <h3 style="font-size:0.88rem;font-weight:700;color:var(--zinc-100);margin-bottom:10px;"><i class="fas fa-file-import c-p"></i> 导入 sub2api 配置</h3>
  <div class="fg"><label>选择 JSON 文件</label><input type="file" id="s2afile" accept=".json" style="font-size:0.8rem;padding:6px;"></div>
  <div id="s2ar" style="margin-top:8px;"></div>
  <div class="fa">
    <button class="btn btn-p" onclick="doImportSub2Api()"><i class="fas fa-upload"></i> 导入</button>
    <button class="btn btn-gh" onclick="hideImport()">取消</button>
  </div>
</div>

</main>

<footer><div class="ct">&copy; ${new Date().getFullYear()} <a href="${SITE_CONFIG.authorUrl}" target="_blank">${SITE_CONFIG.title}</a> by <a href="${SITE_CONFIG.blogUrl}" target="_blank">${SITE_CONFIG.author}</a></div></footer>

<script>
const PROVIDER_PRESET_MODELS = ${JSON.stringify(DEFAULT_PROVIDER_MODELS)};

function getProviderPresetModels(id, apiType, url) {
  if (apiType === 'openai-oauth') return PROVIDER_PRESET_MODELS['openai-oauth'] || PROVIDER_PRESET_MODELS['openai']
  if (apiType === 'anthropic' || (url && url.includes('anthropic'))) return PROVIDER_PRESET_MODELS['anthropic']
  if (url && (url.includes('deepseek') || url.includes('deepseek.com'))) return PROVIDER_PRESET_MODELS['deepseek']
  if (url && (url.includes('generativelanguage.googleapis.com') || url.includes('gemini'))) return PROVIDER_PRESET_MODELS['gemini']
  if (id === 'deepseek') return PROVIDER_PRESET_MODELS['deepseek']
  if (id === 'anthropic') return PROVIDER_PRESET_MODELS['anthropic']
  if (id === 'gemini') return PROVIDER_PRESET_MODELS['gemini']
  return PROVIDER_PRESET_MODELS['openai']
}

function prefillAddModels() {
  const apiType = document.getElementById('afmt')?.value || 'openai'
  const url = document.getElementById('aurl')?.value.trim() || ''
  const models = getProviderPresetModels('new', apiType, url)
  const panel = document.getElementById('amc')
  panel.classList.remove('hd')
  renderDiscoveredModels(models)
  toast('已加载最新模型候选列表，勾选后即可保存', 'info')
}

// ── Modal ──
function showM(h) {
  const o = document.createElement('div')
  o.className = 'modal-o generic-modal-overlay'
  o.innerHTML = '<div class="modal">' + h + '</div>'
  document.body.appendChild(o)
}
function closeM() { const o = document.querySelector('.generic-modal-overlay'); if (o) o.remove() }

function cM(msg) {
  return new Promise(function(resolve) {
    showM('<h3><i class="fas fa-exclamation-triangle" style="color:var(--amber-400);"></i> 确认</h3><p>' + msg + '</p><div class="fa" style="justify-content:flex-end;"><button class="btn btn-s" onclick="closeM();resolve(false)">取消</button><button class="btn btn-p" onclick="closeM();resolve(true)">确定</button></div>')
    window.resolve = resolve
  })
}

function pM(msg) {
  return new Promise(function(resolve) {
    showM('<h3><i class="fas fa-pen" style="color:var(--primary);"></i> 输入</h3><p>' + msg + '</p><div class="fg"><input type="text" id="pMinp" placeholder="输入内容"></div><div class="fa" style="justify-content:flex-end;"><button class="btn btn-s" onclick="closeM();resolve(null)">取消</button><button class="btn btn-p" onclick="closeM();resolve(document.getElementById(\\'pMinp\\').value.trim() || null)">确定</button></div>')
    window.resolve = resolve
  })
}

function toast(msg, t) {
  const el = document.getElementById('toast')
  const i = t === 'success' ? 'fa-check-circle' : 'fa-times-circle'
  const bg = t === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'
  const c = t === 'success' ? 'var(--success)' : 'var(--danger)'
  el.innerHTML = '<div class="al" style="background:' + bg + ';color:' + c + ';border-color:transparent;"><i class="fas ' + i + '"></i> ' + msg + '</div>'
  el.classList.remove('hd')
  setTimeout(function() { el.classList.add('hd') }, 3500)
}

// ── Provider editor modal ──
function selectProvider(id) {
  const panel = document.getElementById('dt-' + id)
  if (!panel || document.querySelector('.provider-editor-overlay')) return

  const overlay = document.createElement('div')
  overlay.className = 'modal-o provider-editor-overlay'
  overlay.innerHTML = '<div class="provider-editor-modal" role="dialog" aria-modal="true" aria-labelledby="provider-editor-title">' +
    '<div class="provider-modal-top"><div><p class="detail-eyebrow">Provider Settings</p><h2 id="provider-editor-title">编辑提供商</h2></div><button class="btn btn-gh btn-xs provider-modal-close" onclick="closeProviderEditor()" aria-label="关闭编辑"><i class="fas fa-times"></i></button></div>' +
    '<div class="provider-editor-slot"></div></div>'
  overlay.addEventListener('click', function(event) {
    if (event.target === overlay) closeProviderEditor()
  })
  overlay.tabIndex = -1
  overlay.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') closeProviderEditor()
  })
  document.body.appendChild(overlay)
  overlay.focus()
  overlay.querySelector('.provider-editor-slot').appendChild(panel)
  panel.classList.add('open')
  const firstInput = panel.querySelector('input')
  if (firstInput) firstInput.focus()
}

function closeProviderEditor() {
  const overlay = document.querySelector('.provider-editor-overlay')
  if (!overlay) return
  const panel = overlay.querySelector('.pd')
  const templates = document.querySelector('.provider-detail-pane')
  if (panel && templates) {
    panel.classList.remove('open')
    templates.appendChild(panel)
  }
  overlay.remove()
}

// ── Add form show/hide ──
function showAdd() { document.getElementById('af').classList.remove('hd') }
function hideAdd() { document.getElementById('af').classList.add('hd'); document.getElementById('amc').classList.add('hd') }

// ── Add form: API key row ──
function addAKeyRow() {
  const c = document.getElementById('akeys')
  const d = document.createElement('div')
  d.className = 'fc mb-4'
  d.innerHTML = '<input type="text" placeholder="sk-xxx" class="fx1 aki"><label class="tg"><input type="checkbox" checked class="ake"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testNewAKey(this)" title="测试"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="this.parentElement.remove()"><i class="fas fa-times c-muted"></i></button>'
  c.appendChild(d)
}

function testNewAKey(btn) {
  const inp = btn.parentElement.querySelector('.aki'), k = inp.value.trim()
  if (!k) { toast('请输入 API Key', 'error'); return }
  discoverModels(k, btn)
}

async function discoverModels(apiKey, triggerButton) {
  const url = document.getElementById('aurl').value.trim()
  if (!url) { toast('请先填写 API 地址', 'error'); return }
  if (!apiKey) {
    const rows = document.querySelectorAll('#akeys > .fc')
    const values = Array.from(rows).map(function(row) {
      const input = row.querySelector('.aki')
      const enabled = row.querySelector('.ake')?.checked ?? true
      return { value: input?.value.trim() || '', enabled: enabled }
    }).filter(function(item) { return item.value })
    apiKey = (values.find(function(item) { return item.enabled }) || values[0])?.value || ''
  }
  if (!apiKey) { toast('请先填写 API Key', 'error'); return }

  const apiType = document.getElementById('afmt').value
  const tr = document.getElementById('atestR')
  const panel = document.getElementById('amc')
  const list = document.getElementById('amcl')
  const discoverButton = document.getElementById('adiscover')
  const buttons = [triggerButton, discoverButton].filter(Boolean)
  buttons.forEach(function(button) { button.disabled = true })
  panel.classList.remove('hd')
  list.innerHTML = '<div class="model-discovery-state"><i class="fas fa-circle-notch fa-spin"></i><span>正在读取提供商模型...</span></div>'
  tr.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> 正在连接...</span>'

  try {
    const r = await fetch('/admin/api/providers/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl: url, apiKey: apiKey, apiType: apiType })
    })
    const d = await r.json()
    const result = d.data || {}
    if (d.success && result.success && result.models && result.models.length > 0) {
      renderDiscoveredModels(result.models || [])
      tr.innerHTML = '<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功' + (result.statusCode ? ' (HTTP ' + result.statusCode + ')' : '') + '</div>'
    } else {
      const presets = getProviderPresetModels('new', apiType, url)
      if (presets && presets.length > 0) {
        renderDiscoveredModels(presets)
        tr.innerHTML = '<div class="al al-s"><i class="fas fa-info-circle"></i> 上游未返回模型列表，已自动加载官方最新模型列表供选用</div>'
      } else {
        list.innerHTML = '<div class="model-discovery-state is-error"><i class="fas fa-circle-exclamation"></i><span>未能读取模型列表，可点击「预填最新模型」或手动填写。</span></div>'
        tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> ' + (result.message || d.message || '连接失败') + '</div>'
      }
    }
    setTimeout(function() { tr.innerHTML = '' }, 5000)
  } catch (e) {
    const presets = getProviderPresetModels('new', apiType, url)
    if (presets && presets.length > 0) {
      renderDiscoveredModels(presets)
      tr.innerHTML = '<div class="al al-s"><i class="fas fa-info-circle"></i> 探查超时，已预填官方最新模型列表供选用</div>'
    } else {
      list.innerHTML = '<div class="model-discovery-state is-error"><i class="fas fa-circle-exclamation"></i><span>请求失败，可点击「预填最新模型」或手动填写。</span></div>'
      tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> 连接失败</div>'
    }
    setTimeout(function() { tr.innerHTML = '' }, 5000)
  } finally {
    buttons.forEach(function(button) { button.disabled = false })
  }
}

function renderDiscoveredModels(models) {
  const list = document.getElementById('amcl')
  const uniqueModels = Array.from(new Set(models.filter(function(model) {
    return typeof model === 'string' && model.trim()
  })))

  list.innerHTML = ''
  if (uniqueModels.length === 0) {
    list.innerHTML = '<div class="model-discovery-state"><i class="fas fa-info-circle"></i><span>提供商未返回模型列表，可继续手动填写。</span></div>'
    return
  }

  const toolbar = document.createElement('div')
  toolbar.className = 'model-picker-toolbar'
  toolbar.innerHTML = '<span><strong id="amodelSelected">0</strong> / ' + uniqueModels.length + ' 已选择</span>' +
    '<div class="model-picker-actions">' +
    '<button class="btn btn-gh btn-xs" onclick="setDiscoveredSelection(true)">全选</button>' +
    '<button class="btn btn-gh btn-xs" onclick="setDiscoveredSelection(false)">清空</button>' +
    '</div>'
  list.appendChild(toolbar)

  const grid = document.createElement('div')
  grid.className = 'model-picker-grid'
  uniqueModels.forEach(function(model) {
    const label = document.createElement('label')
    label.className = 'model-choice'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'amd'
    checkbox.value = model
    checkbox.addEventListener('change', updateDiscoveredCount)

    const icon = document.createElement('i')
    icon.className = 'fas fa-cube'

    const text = document.createElement('span')
    text.textContent = model
    text.title = model

    label.appendChild(checkbox)
    label.appendChild(icon)
    label.appendChild(text)
    grid.appendChild(label)
  })
  list.appendChild(grid)
}

function updateDiscoveredCount() {
  const count = document.querySelectorAll('#amcl .amd:checked').length
  const counter = document.getElementById('amodelSelected')
  if (counter) counter.textContent = String(count)
}

function setDiscoveredSelection(checked) {
  document.querySelectorAll('#amcl .amd').forEach(function(input) {
    input.checked = checked
  })
  updateDiscoveredCount()
}

// ── Add form: model rows ──
function rmNewMdlRow(btn) {
  const row = btn.closest('.fc') || btn.parentElement
  if (!row) return
  if (row.nextElementSibling && row.nextElementSibling.classList.contains('amdl-inline-res')) {
    row.nextElementSibling.remove()
  }
  row.remove()
  const amp = document.getElementById('amc')
  if (amp && !amp.classList.contains('hd') && amp.dataset.models) {
    try { renderDiscoveredModels(JSON.parse(amp.dataset.models)) } catch(e) {}
  }
}

function addMdlRow() {
  const c = document.getElementById('amodels')
  const d = document.createElement('div')
  d.className = 'fc mb-4'
  d.innerHTML = '<input type="text" placeholder="deepseek-chat" class="fx1 ami"><label class="tg"><input type="checkbox" checked class="ame"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testNewMdl(this)" title="测试"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="rmNewMdlRow(this)"><i class="fas fa-times c-muted"></i></button>'
  c.appendChild(d)
}

function closeInlineRes(btn) {
  const p = btn.closest('.amdl-inline-res, .key-test-inline-res, .model-test-inline-res')
  if (p) p.remove()
}

function testNewMdl(btn) {
  const row = btn.closest('.fc') || btn.parentElement
  const inp = row ? row.querySelector('.ami') : null
  const mid = inp ? inp.value.trim() : ''
  if (!mid) { toast('请输入模型 ID', 'error'); return }
  const url = document.getElementById('aurl').value.trim()
  const akeys = document.querySelectorAll('#akeys .aki')
  const apiKey = Array.from(akeys).map(function(inp) { return inp.value.trim() }).filter(Boolean)[0] || 'dummy'
  const apiType = document.getElementById('afmt').value
  const tr = document.getElementById('atestR')

  btn.disabled = true
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
  btn.title = '测试中...'

  let resEl = row.nextElementSibling && row.nextElementSibling.classList.contains('amdl-inline-res') ? row.nextElementSibling : null
  if (!resEl && row && row.parentNode) {
    resEl = document.createElement('div')
    resEl.className = 'amdl-inline-res'
    row.parentNode.insertBefore(resEl, row.nextSibling)
  }
  if (resEl) {
    resEl.innerHTML = '<div class="al al-i" style="margin:2px 0 6px 0;padding:5px 8px;font-size:0.73rem;"><i class="fas fa-spinner fa-spin"></i> 正在测试模型「' + escHtml(mid) + '」...</div>'
    resEl.classList.remove('hd')
  }
  if (tr) tr.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> 正在测试模型「' + escHtml(mid) + '」...</span>'

  fetch('/admin/api/providers/probe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseUrl: url, apiKey: apiKey, apiType: apiType, modelId: mid })
  }).then(async function(r) {
    const d = await r.json()
    const result = d.data || {}
    const isSuccess = Boolean(d.success && result.success)
    const code = result.statusCode || (isSuccess ? 200 : 500)
    const msg = result.message || d.message || (isSuccess ? '连接成功' : '测试失败')

    if (isSuccess) {
      btn.innerHTML = '<i class="fas fa-check" style="color:#10b981;"></i>'
      btn.title = '连接成功 (HTTP ' + code + ')'
      if (resEl) {
        resEl.innerHTML = '<div class="al al-s" style="margin:2px 0 6px 0;padding:5px 8px;font-size:0.73rem;display:flex;align-items:center;justify-content:space-between;"><span style="display:flex;align-items:center;gap:6px;"><i class="fas fa-check-circle"></i> 模型「' + escHtml(mid) + '」连接成功 (HTTP ' + code + ')</span><i class="fas fa-times cp c-muted" style="cursor:pointer;" onclick="closeInlineRes(this)"></i></div>'
      }
      toast('模型「' + mid + '」连接成功 (HTTP ' + code + ')', 'success')
      if (tr) tr.innerHTML = '<div class="al al-s"><i class="fas fa-check-circle"></i> 模型「' + escHtml(mid) + '」连接成功 (HTTP ' + code + ')</div>'
    } else {
      btn.innerHTML = '<i class="fas fa-times" style="color:#ef4444;"></i>'
      btn.title = '测试失败'
      if (resEl) {
        resEl.innerHTML = '<div class="al al-e" style="margin:2px 0 6px 0;padding:6px 10px;font-size:0.73rem;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;line-height:1.45;"><div><div style="font-weight:600;margin-bottom:2px;"><i class="fas fa-times-circle"></i> 模型「' + escHtml(mid) + '」测试失败' + (code ? ' (HTTP ' + code + ')' : '') + '</div><div style="word-break:break-all;color:var(--zinc-300);">' + escHtml(msg) + '</div></div><i class="fas fa-times cp c-muted" style="cursor:pointer;flex-shrink:0;margin-top:2px;" onclick="closeInlineRes(this)"></i></div>'
      }
      toast('模型「' + mid + '」测试失败: ' + msg.substring(0, 50), 'error')
      if (tr) tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> ' + escHtml(msg) + '</div>'
    }
    setTimeout(function() {
      btn.innerHTML = '<i class="fas fa-plug"></i>'
      btn.title = '测试'
      btn.disabled = false
      if (tr) tr.innerHTML = ''
    }, 6000)
  }).catch(function() {
    btn.innerHTML = '<i class="fas fa-times" style="color:#ef4444;"></i>'
    btn.title = '请求失败'
    if (resEl) {
      resEl.innerHTML = '<div class="al al-e" style="margin:2px 0 6px 0;padding:6px 10px;font-size:0.73rem;"><i class="fas fa-times-circle"></i> 请求异常</div>'
    }
    toast('模型「' + mid + '」请求失败', 'error')
    if (tr) tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> 请求失败</div>'
    setTimeout(function() {
      btn.innerHTML = '<i class="fas fa-plug"></i>'
      btn.title = '测试'
      btn.disabled = false
      if (tr) tr.innerHTML = ''
    }, 6000)
  })
}

async function clearAddModels() {
  const c = document.getElementById('amodels')
  if (!c) return
  const rows = c.querySelectorAll('.fc')
  if (rows.length === 0) {
    toast('当前列表中没有模型', 'info')
    return
  }
  if (!(await cM('确定要清空已添加的全部 ' + rows.length + ' 个模型吗？'))) return
  c.innerHTML = ''
  document.querySelectorAll('.amdl-inline-res').forEach(function(el) { el.remove() })
  const amp = document.getElementById('amc')
  if (amp && !amp.classList.contains('hd') && amp.dataset.models) {
    try { renderDiscoveredModels(JSON.parse(amp.dataset.models)) } catch(e) {}
  }
  toast('已清空全部模型', 'success')
}

// ── Create provider ──
async function createProv() {
  const nm = document.getElementById('anm').value.trim()
  const url = document.getElementById('aurl').value.trim(), apiType = document.getElementById('afmt').value
  const aki = document.querySelectorAll('#akeys .aki')
  const keys = Array.from(aki).map(function(inp, i) {
    var k = inp.value.trim()
    var en = inp.parentElement.querySelector('.ake')?.checked ?? true
    return k ? { key: k, enabled: en } : null
  }).filter(Boolean)
  const ami = document.querySelectorAll('#amodels .ami')
  const manualModels = Array.from(ami).map(function(inp) {
    var mid = inp.value.trim()
    var en = inp.parentElement.querySelector('.ame')?.checked ?? true
    return mid ? { id: mid, enabled: en } : null
  }).filter(Boolean)
  const discoveredModels = Array.from(document.querySelectorAll('#amcl .amd:checked')).map(function(inp) {
    return { id: inp.value, enabled: true }
  })
  const modelMap = new Map()
  discoveredModels.concat(manualModels).forEach(function(model) {
    modelMap.set(model.id, model)
  })
  const models = Array.from(modelMap.values())
  const enabled = document.getElementById('aen').checked
  if (!nm || !url) { toast('请填写名称和 API 地址', 'error'); return }
  const r = await fetch('/admin/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nm, baseUrl: url, apiType: apiType, apiKeys: keys, models: models, enabled: enabled })
  })
  const d = await r.json()
  if (d.success) { toast('已创建', 'success'); location.reload() }
  else toast(d.message || '创建失败', 'error')
}

// ── Edit provider keys ──
function getKeys(id) {
  const c = document.getElementById('keys-' + id)
  const items = c.querySelectorAll('[data-kidx]')
  return Array.from(items).map(function(item) {
    var idx = parseInt(item.dataset.kidx)
    var k = document.getElementById('k-' + id + '-' + idx).value.trim()
    var en = document.getElementById('ken-' + id + '-' + idx).checked
    return k ? { key: k, enabled: en } : null
  }).filter(Boolean)
}

function getProviderProbeKey(id) {
  const rows = document.querySelectorAll('#keys-' + id + ' > [data-kidx]')
  const values = Array.from(rows).map(function(row) {
    const input = row.querySelector('input[type="text"], input[type="hidden"]')
    const enabled = row.querySelector('input[id^="ken-"]')?.checked ?? true
    return { value: input?.value.trim() || '', enabled: enabled }
  }).filter(function(item) { return item.value })
  return (values.find(function(item) { return item.enabled }) || values[0])?.value || ''
}

function addKeyRow(id) {
  const inp = document.getElementById('nk-' + id), k = inp.value.trim()
  if (!k) { toast('请输入 API Key', 'error'); return }
  const c = document.getElementById('keys-' + id), cnt = c.querySelectorAll('[data-kidx]').length
  const d = document.createElement('div')
  d.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;background:rgba(9,9,11,0.4);border:1px solid rgba(63,63,70,0.3);margin-bottom:6px;'
  d.dataset.kidx = cnt
  d.innerHTML = '<input type="text" value="' + escHtml(k) + '" class="fx1" id="k-' + id + '-' + cnt + '" placeholder="API Key" style="font-family:SF Mono,Fira Code,JetBrains Mono,monospace;font-size:0.78rem;"><label class="tg"><input type="checkbox" checked id="ken-' + id + '-' + cnt + '"><span class="sl"></span></label><button class="btn btn-gh btn-xs" id="tk-' + id + '-' + cnt + '" title="测试"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" id="rk-' + id + '-' + cnt + '"><i class="fas fa-times c-muted"></i></button>'
  c.appendChild(d)
  document.getElementById('tk-' + id + '-' + cnt).addEventListener('click', function() { testKeyRow(id, cnt) })
  document.getElementById('rk-' + id + '-' + cnt).addEventListener('click', function() { rmKeyRow(id, cnt) })
  inp.value = ''
  inp.focus()
}

function rmKeyRow(id, idx) {
  const c = document.getElementById('keys-' + id)
  if (c) {
    c.querySelectorAll('[data-kidx]').forEach(function(item) {
      if (parseInt(item.dataset.kidx) === idx) item.remove()
    })
  }
  const kres = document.getElementById('kres-' + id + '-' + idx)
  if (kres) kres.remove()
}

async function testKeyRow(id, idx) {
  const kInp = document.getElementById('k-' + id + '-' + idx)
  const k = kInp ? kInp.value.trim() : ''
  const url = document.getElementById('url-' + id).value.trim()
  if (!k) { toast('请输入 API Key', 'error'); return }
  const apiType = document.getElementById('at-' + id).value
  const tr = document.getElementById('tr-' + id)
  const row = kInp ? kInp.closest('[data-kidx]') : null

  let resEl = document.getElementById('kres-' + id + '-' + idx)
  if (!resEl && row && row.parentNode) {
    resEl = document.createElement('div')
    resEl.id = 'kres-' + id + '-' + idx
    resEl.className = 'key-test-inline-res'
    row.parentNode.insertBefore(resEl, row.nextSibling)
  }
  if (resEl) {
    resEl.innerHTML = '<div class="al al-i" style="margin:2px 0 6px 0;padding:5px 8px;font-size:0.73rem;"><i class="fas fa-spinner fa-spin"></i> 正在测试 Key 连接...</div>'
    resEl.classList.remove('hd')
  }
  if (tr) tr.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> 测试 Key 中...</span>'

  try {
    const r = await fetch('/admin/api/providers/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: id, baseUrl: url, apiKey: k, apiType: apiType })
    })
    const d = await r.json()
    const result = d.data || {}
    const isSuccess = Boolean(d.success && result.success)
    const code = result.statusCode || (isSuccess ? 200 : 500)
    const msg = result.message || d.message || (isSuccess ? '连接成功' : '连接失败')

    if (isSuccess) {
      if (resEl) {
        resEl.innerHTML = '<div class="al al-s" style="margin:2px 0 6px 0;padding:5px 8px;font-size:0.73rem;display:flex;align-items:center;justify-content:space-between;"><span style="display:flex;align-items:center;gap:6px;"><i class="fas fa-check-circle"></i> Key 连接成功' + (code ? ' (HTTP ' + code + ')' : '') + '</span><i class="fas fa-times cp c-muted" style="cursor:pointer;" onclick="closeInlineRes(this)"></i></div>'
      }
      toast('Key 连接成功 (HTTP ' + code + ')', 'success')
      if (tr) tr.innerHTML = '<div class="al al-s"><i class="fas fa-check-circle"></i> Key 连接成功 (HTTP ' + code + ')</div>'
    } else {
      if (resEl) {
        resEl.innerHTML = '<div class="al al-e" style="margin:2px 0 6px 0;padding:6px 10px;font-size:0.73rem;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;line-height:1.45;"><div><div style="font-weight:600;margin-bottom:2px;"><i class="fas fa-times-circle"></i> Key 测试失败' + (code ? ' (HTTP ' + code + ')' : '') + '</div><div style="word-break:break-all;color:var(--zinc-300);">' + escHtml(msg) + '</div></div><i class="fas fa-times cp c-muted" style="cursor:pointer;flex-shrink:0;margin-top:2px;" onclick="closeInlineRes(this)"></i></div>'
      }
      toast('Key 测试失败: ' + msg.substring(0, 50), 'error')
      if (tr) tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> ' + escHtml(msg) + '</div>'
    }
    setTimeout(function() { if (tr) tr.innerHTML = '' }, 6000)
  } catch (e) {
    if (resEl) {
      resEl.innerHTML = '<div class="al al-e" style="margin:2px 0 6px 0;padding:6px 10px;font-size:0.73rem;"><i class="fas fa-times-circle"></i> 连接失败</div>'
    }
    toast('Key 测试请求失败', 'error')
    if (tr) tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> 连接失败</div>'
    setTimeout(function() { if (tr) tr.innerHTML = '' }, 6000)
  }
}

// ── Edit provider models ──
async function discoverProviderModels(id) {
  const url = document.getElementById('url-' + id).value.trim()
  const apiKey = getProviderProbeKey(id)
  const apiType = document.getElementById('at-' + id).value
  const button = document.getElementById('mdiscover-' + id)
  const panel = document.getElementById('mp-' + id)
  const tr = document.getElementById('tr-' + id)

  if (!url) { toast('请先填写 API 地址', 'error'); return }
  if (!apiKey && apiType !== 'openai-oauth') { toast('请先填写 API Key', 'error'); return }

  button.disabled = true
  panel.classList.remove('hd')
  panel.innerHTML = '<div class="model-discovery-state"><i class="fas fa-circle-notch fa-spin"></i><span>正在读取提供商模型...</span></div>'
  tr.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> 正在连接...</span>'

  try {
    const r = await fetch('/admin/api/providers/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: id, baseUrl: url, apiKey: apiKey, apiType: apiType })
    })
    const d = await r.json()
    const result = d.data || {}
    if (d.success && result.success && result.models && result.models.length > 0) {
      renderEditDiscoveredModels(id, result.models || [])
      tr.innerHTML = '<div class="al al-s"><i class="fas fa-check-circle"></i> ' + (result.message || ('已读取 ' + result.models.length + ' 个模型')) + (result.statusCode ? ' (HTTP ' + result.statusCode + ')' : '') + '</div>'
    } else {
      const presets = getProviderPresetModels(id, apiType, url)
      if (presets && presets.length > 0) {
        renderEditDiscoveredModels(id, presets)
        tr.innerHTML = '<div class="al al-s"><i class="fas fa-info-circle"></i> 上游未返回模型列表，已自动加载官方最新模型列表供选用</div>'
      } else {
        panel.innerHTML = '<div class="model-discovery-state is-error"><i class="fas fa-circle-exclamation"></i><span>未能读取模型列表，可点击「预填最新模型」或手动添加。</span></div>'
        tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> ' + (result.message || d.message || '连接失败') + '</div>'
      }
    }
    setTimeout(function() { tr.innerHTML = '' }, 5000)
  } catch (e) {
    const presets = getProviderPresetModels(id, apiType, url)
    if (presets && presets.length > 0) {
      renderEditDiscoveredModels(id, presets)
      tr.innerHTML = '<div class="al al-s"><i class="fas fa-info-circle"></i> 探查超时，已预填官方最新模型列表供选用</div>'
    } else {
      panel.innerHTML = '<div class="model-discovery-state is-error"><i class="fas fa-circle-exclamation"></i><span>请求失败，可点击「预填最新模型」或手动添加。</span></div>'
      tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> 连接失败</div>'
    }
    setTimeout(function() { tr.innerHTML = '' }, 5000)
  } finally {
    button.disabled = false
  }
}

function prefillLatestModels(id) {
  const apiType = document.getElementById('at-' + id)?.value || 'openai'
  const url = document.getElementById('url-' + id)?.value.trim() || ''
  const models = getProviderPresetModels(id, apiType, url)
  const panel = document.getElementById('mp-' + id)
  panel.classList.remove('hd')
  renderEditDiscoveredModels(id, models)
  toast('已加载最新模型候选列表，可勾选后批量加入', 'info')
}

function renderEditDiscoveredModels(id, models) {
  const panel = document.getElementById('mp-' + id)
  const existing = new Set(getMdl(id).map(function(model) { return model.id }))
  const uniqueModels = Array.from(new Set(models.filter(function(model) {
    return typeof model === 'string' && model.trim()
  })))

  panel.dataset.models = JSON.stringify(uniqueModels)
  panel.innerHTML = ''
  if (uniqueModels.length === 0) {
    panel.innerHTML = '<div class="model-discovery-state"><i class="fas fa-info-circle"></i><span>提供商未返回模型列表，可继续手动添加。</span></div>'
    return
  }

  const toolbar = document.createElement('div')
  toolbar.className = 'model-picker-toolbar'

  const count = document.createElement('span')
  count.innerHTML = '<strong class="edit-model-selected">0</strong> / ' + uniqueModels.length + ' 可加入'

  const actions = document.createElement('div')
  actions.className = 'model-picker-actions'
  const selectAll = document.createElement('button')
  selectAll.className = 'btn btn-gh btn-xs'
  selectAll.textContent = '全选'
  selectAll.addEventListener('click', function() { setEditDiscoveredSelection(id, true) })
  const clearAll = document.createElement('button')
  clearAll.className = 'btn btn-gh btn-xs'
  clearAll.textContent = '清空'
  clearAll.addEventListener('click', function() { setEditDiscoveredSelection(id, false) })
  const apply = document.createElement('button')
  apply.className = 'btn btn-p btn-xs'
  apply.innerHTML = '<i class="fas fa-plus"></i> 加入选中'
  apply.addEventListener('click', function() { applyEditDiscoveredModels(id) })
  actions.appendChild(selectAll)
  actions.appendChild(clearAll)
  actions.appendChild(apply)
  toolbar.appendChild(count)
  toolbar.appendChild(actions)
  panel.appendChild(toolbar)

  const grid = document.createElement('div')
  grid.className = 'model-picker-grid'
  uniqueModels.forEach(function(model) {
    const label = document.createElement('label')
    label.className = 'model-choice' + (existing.has(model) ? ' is-existing' : '')
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'emd'
    checkbox.value = model
    checkbox.disabled = existing.has(model)
    checkbox.addEventListener('change', function() { updateEditDiscoveredCount(id) })
    const icon = document.createElement('i')
    icon.className = existing.has(model) ? 'fas fa-check' : 'fas fa-cube'
    const text = document.createElement('span')
    text.textContent = model
    text.title = model
    label.appendChild(checkbox)
    label.appendChild(icon)
    label.appendChild(text)
    grid.appendChild(label)
  })
  panel.appendChild(grid)
  updateEditDiscoveredCount(id)
}

function updateEditDiscoveredCount(id) {
  const panel = document.getElementById('mp-' + id)
  const count = panel.querySelectorAll('.emd:checked').length
  const counter = panel.querySelector('.edit-model-selected')
  if (counter) counter.textContent = String(count)
}

function setEditDiscoveredSelection(id, checked) {
  document.querySelectorAll('#mp-' + id + ' .emd').forEach(function(input) {
    if (!input.disabled) input.checked = checked
  })
  updateEditDiscoveredCount(id)
}

function applyEditDiscoveredModels(id) {
  const selected = Array.from(document.querySelectorAll('#mp-' + id + ' .emd:checked')).map(function(input) {
    return input.value
  })
  const existing = new Set(getMdl(id).map(function(model) { return model.id }))
  const additions = selected.filter(function(model) { return !existing.has(model) })
  if (additions.length === 0) {
    toast('没有需要加入的新模型', 'error')
    return
  }
  additions.forEach(function(model) { addMdlValue(id, model, true) })
  toast('已加入 ' + additions.length + ' 个模型', 'success')
  const available = JSON.parse(document.getElementById('mp-' + id).dataset.models || '[]')
  renderEditDiscoveredModels(id, available)
}

function getMdl(id) {
  const c = document.getElementById('ml-' + id), items = c.querySelectorAll('[data-idx]')
  return Array.from(items).map(function(item) {
    var idx = parseInt(item.dataset.idx), mid = document.getElementById('mid-' + id + '-' + idx).value.trim()
    var en = document.getElementById('men-' + id + '-' + idx).checked
    return mid ? { id: mid, enabled: en } : null
  }).filter(Boolean)
}

function addMdl(id) {
  const inp = document.getElementById('nmid-' + id), mid = inp.value.trim()
  if (!mid) { toast('请输入模型 ID', 'error'); return }
  addMdlValue(id, mid, true)
  inp.value = ''
}

function addMdlValue(id, mid, enabled) {
  const c = document.getElementById('ml-' + id)
  const indices = Array.from(c.querySelectorAll('[data-idx]')).map(function(item) { return parseInt(item.dataset.idx) }).filter(Number.isFinite)
  const cnt = indices.length ? Math.max.apply(null, indices) + 1 : 0
  const d = document.createElement('div')
  d.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;background:rgba(9,9,11,0.4);border:1px solid rgba(63,63,70,0.3);margin-bottom:6px;'
  d.dataset.idx = cnt
  d.innerHTML = '<input type="text" class="fx1" id="mid-' + id + '-' + cnt + '" placeholder="模型 ID" style="font-family:SF Mono,Fira Code,JetBrains Mono,monospace;font-size:0.78rem;"><label class="tg"><input type="checkbox" ' + (enabled ? 'checked' : '') + ' id="men-' + id + '-' + cnt + '"><span class="sl"></span></label><button class="btn btn-gh btn-xs" id="tm-' + id + '-' + cnt + '"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" id="rm-' + id + '-' + cnt + '"><i class="fas fa-times c-muted"></i></button>'
  c.appendChild(d)
  document.getElementById('mid-' + id + '-' + cnt).value = mid
  document.getElementById('tm-' + id + '-' + cnt).addEventListener('click', function() {
    testMdl(id, document.getElementById('mid-' + id + '-' + cnt).value.trim(), cnt)
  })
  document.getElementById('rm-' + id + '-' + cnt).addEventListener('click', function() { rmMdl(id, cnt) })
}

function rmMdl(id, idx) {
  const c = document.getElementById('ml-' + id)
  if (c) {
    c.querySelectorAll('[data-idx]').forEach(function(item) {
      if (parseInt(item.dataset.idx) === idx) item.remove()
    })
  }
  const resEl = document.getElementById('mres-' + id + '-' + idx)
  if (resEl) resEl.remove()
  const mp = document.getElementById('mp-' + id)
  if (mp && !mp.classList.contains('hd') && mp.dataset.models) {
    try { renderEditDiscoveredModels(id, JSON.parse(mp.dataset.models)) } catch(e) {}
  }
}

async function clearAllModels(id) {
  const c = document.getElementById('ml-' + id)
  if (!c) return
  const rows = c.querySelectorAll('[data-idx]')
  if (rows.length === 0) {
    toast('当前列表中没有模型', 'info')
    return
  }
  if (!(await cM('确定要清空已添加的全部 ' + rows.length + ' 个模型吗？（需点击下方「保存」后正式生效）'))) return
  c.innerHTML = ''
  document.querySelectorAll('[id^="mres-' + id + '-"]').forEach(function(el) { el.remove() })
  const mp = document.getElementById('mp-' + id)
  if (mp && !mp.classList.contains('hd') && mp.dataset.models) {
    try { renderEditDiscoveredModels(id, JSON.parse(mp.dataset.models)) } catch(e) {}
  }
  toast('已清空全部模型（需点击下方保存生效）', 'success')
}

async function testMdl(id, mid, idx) {
  const midInp = document.getElementById('mid-' + id + '-' + idx)
  const targetMid = (midInp ? midInp.value.trim() : '') || mid
  if (!targetMid) {
    toast('请输入或选择模型 ID', 'error')
    return
  }
  const btn = document.getElementById('tm-' + id + '-' + idx)
  const tr = document.getElementById('tr-' + id)
  const row = midInp ? midInp.closest('[data-idx]') : null

  let resEl = document.getElementById('mres-' + id + '-' + idx)
  if (!resEl && row && row.parentNode) {
    resEl = document.createElement('div')
    resEl.id = 'mres-' + id + '-' + idx
    resEl.className = 'model-test-inline-res'
    row.parentNode.insertBefore(resEl, row.nextSibling)
  }
  if (resEl) {
    resEl.innerHTML = '<div class="al al-i" style="margin:2px 0 6px 0;padding:5px 8px;font-size:0.73rem;"><i class="fas fa-spinner fa-spin"></i> 正在测试模型「' + escHtml(targetMid) + '」...</div>'
    resEl.classList.remove('hd')
  }
  if (btn) {
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
    btn.title = '测试中...'
  }
  if (tr) tr.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> 测试模型「' + escHtml(targetMid) + '」中...</span>'

  try {
    const r = await fetch('/admin/api/providers/' + encodeURIComponent(id) + '/test-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: targetMid })
    })
    const d = await r.json()
    const result = d.data || {}
    const isSuccess = Boolean(d.success && result.success)
    const code = result.statusCode || (isSuccess ? 200 : (r.status !== 200 ? r.status : null))
    const msg = result.message || d.message || (isSuccess ? '连接成功' : '连接失败')

    if (isSuccess) {
      if (btn) {
        btn.innerHTML = '<i class="fas fa-check" style="color:#22c55e;"></i>'
        btn.title = '连接成功 (HTTP ' + (code || 200) + ')'
      }
      if (resEl) {
        resEl.innerHTML = '<div class="al al-s" style="margin:2px 0 6px 0;padding:5px 8px;font-size:0.73rem;display:flex;align-items:center;justify-content:space-between;"><span style="display:flex;align-items:center;gap:6px;"><i class="fas fa-check-circle"></i> 模型「' + escHtml(targetMid) + '」连接成功' + (code ? ' (HTTP ' + code + ')' : '') + '</span><i class="fas fa-times cp c-muted" style="cursor:pointer;" onclick="closeInlineRes(this)"></i></div>'
      }
      toast('模型「' + targetMid + '」连接成功 (HTTP ' + (code || 200) + ')', 'success')
      if (tr) tr.innerHTML = '<div class="al al-s"><i class="fas fa-check-circle"></i> 模型「' + escHtml(targetMid) + '」连接成功 (HTTP ' + (code || 200) + ')</div>'
    } else {
      if (btn) {
        btn.innerHTML = '<i class="fas fa-times" style="color:#ef4444;"></i>'
        btn.title = '测试失败'
      }
      if (resEl) {
        resEl.innerHTML = '<div class="al al-e" style="margin:2px 0 6px 0;padding:6px 10px;font-size:0.73rem;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;line-height:1.45;"><div><div style="font-weight:600;margin-bottom:2px;"><i class="fas fa-times-circle"></i> 模型「' + escHtml(targetMid) + '」测试失败' + (code ? ' (HTTP ' + code + ')' : '') + '</div><div style="word-break:break-all;color:var(--zinc-300);">' + escHtml(msg) + '</div></div><i class="fas fa-times cp c-muted" style="cursor:pointer;flex-shrink:0;margin-top:2px;" onclick="closeInlineRes(this)"></i></div>'
      }
      toast('模型「' + targetMid + '」测试失败: ' + msg.substring(0, 50), 'error')
      if (tr) tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> ' + escHtml(msg) + '</div>'
    }
    setTimeout(function() {
      if (btn) {
        btn.innerHTML = '<i class="fas fa-plug"></i>'
        btn.title = '测试'
        btn.disabled = false
      }
      if (tr) tr.innerHTML = ''
    }, 6000)
  } catch (e) {
    if (btn) {
      btn.innerHTML = '<i class="fas fa-times" style="color:#ef4444;"></i>'
      btn.title = '请求失败'
      setTimeout(function() {
        btn.innerHTML = '<i class="fas fa-plug"></i>'
        btn.title = '测试'
        btn.disabled = false
      }, 6000)
    }
    if (resEl) {
      resEl.innerHTML = '<div class="al al-e" style="margin:2px 0 6px 0;padding:6px 10px;font-size:0.73rem;"><i class="fas fa-times-circle"></i> 请求异常: ' + escHtml(e.message || String(e)) + '</div>'
    }
    toast('模型「' + targetMid + '」请求失败', 'error')
    if (tr) tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> 请求失败</div>'
    setTimeout(function() { if (tr) tr.innerHTML = '' }, 6000)
  }
}

// ── Save / Delete provider ──
async function save(id) {
  var nm = document.getElementById('nm-' + id).value.trim(), url = document.getElementById('url-' + id).value.trim()
  var apiType = document.getElementById('at-' + id).value
  var keys = getKeys(id)
  var models = getMdl(id), enabled = document.getElementById('en-' + id).checked
  var r = await fetch('/admin/api/providers/' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nm, baseUrl: url, apiType: apiType, apiKeys: keys, models: models, enabled: enabled, preserveOAuthCredentials: true })
  })
  var d = await r.json()
  if (d.success) { closeProviderEditor(); toast('已保存', 'success'); location.reload() }
  else toast(d.message || '保存失败', 'error')
}

async function del(id) {
  if (!(await cM('确定要删除此提供商？'))) return
  var r = await fetch('/admin/api/providers/' + encodeURIComponent(id), { method: 'DELETE' })
  var d = await r.json()
  if (d.success) { toast('已删除', 'success'); location.reload() }
  else toast(d.message || '删除失败', 'error')
}

// ── Toggle provider ──
async function togglePb(id, checked) {
  var pi = document.querySelector('.pi[data-id="' + id + '"]')
  if (!pi) return
  var b = pi.querySelector('.ps .bd')
  if (b) { b.textContent = checked ? '已启用' : '已禁用'; b.className = 'bd ' + (checked ? 'bd-on' : 'bd-off') }
  var dot = pi.querySelector('.provider-dot')
  if (dot) { dot.className = 'provider-dot ' + (checked ? 'on' : 'off') }
  var panelBadge = document.querySelector('#dt-' + id + ' .detail-panel-head .bd')
  if (panelBadge) { panelBadge.innerHTML = checked ? '<i class="fas fa-check-circle"></i> 已启用' : '<i class="fas fa-ban"></i> 已禁用'; panelBadge.className = 'bd ' + (checked ? 'bd-on' : 'bd-off') }
  var r = await fetch('/admin/api/providers/' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: checked })
  })
  var d = await r.json()
  if (!d.success) toast(d.message || '操作失败', 'error')
}

// ── Proxy keys ──
async function genKey() {
  var name = await pM('输入 Key 名称（可选）')
  if (name === null) return
  showM('<h3><i class="fas fa-key c-p"></i> 生成转发 Key</h3><div class="fg"><label>有效期</label><select id="exp"><option value="30d">30 天</option><option value="90d">90 天</option><option value="180d">180 天</option><option value="1y">1 年</option><option value="forever" selected>永久</option></select></div><div class="fa"><button class="btn btn-s" id="gKc">取消</button><button class="btn btn-p" id="gKo">生成</button></div>')
  document.getElementById('gKc').addEventListener('click', closeM)
  document.getElementById('gKo').addEventListener('click', function() { doGenKey(document.getElementById('exp').value, name) })
}

async function doGenKey(exp, name) {
  closeM()
  var nm = name || ''
  var r = await fetch('/admin/api/proxy-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nm, expiresIn: exp })
  })
  var d = await r.json()
  if (d.success && d.data) {
    showM('<h3><i class="fas fa-check-circle c-s"></i> 生成成功</h3><p>请立即复制保存，关闭后将不再显示：</p><div class="mk">' + d.data.key + '</div><div class="fa"><button class="btn btn-p" onclick="closeM();location.reload()">关闭</button></div>')
  } else toast(d.message || '生成失败', 'error')
}

async function rmKey(id) {
  if (!(await cM('确定要删除此 Key？'))) return
  var r = await fetch('/admin/api/proxy-keys/' + encodeURIComponent(id), { method: 'DELETE' })
  var d = await r.json()
  if (d.success) { toast('已删除', 'success'); location.reload() }
  else toast(d.message || '删除失败', 'error')
}

function toggleKeyVis(id) {
  var el = document.getElementById('kv-' + id)
  var full = el.dataset.full
  if (el.textContent.indexOf('****') !== -1) {
    el.textContent = full
  } else {
    el.textContent = full.length > 12
      ? full.substring(0, 8) + '****' + full.substring(full.length - 4)
      : full
  }
}

async function toggleProxyKey(id, checked) {
  var r = await fetch('/admin/api/proxy-keys/' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: checked })
  })
  var d = await r.json()
  if (d.success) {
    var ki = document.querySelector('.ki[data-id="' + id + '"]')
    if (ki) {
      var b = ki.querySelector('.fc .bd')
      if (b) { b.textContent = checked ? '已启用' : '已禁用'; b.className = 'bd ' + (checked ? 'bd-on' : 'bd-off') }
    }
  } else toast(d.message || '操作失败', 'error')
}

// ── Sub2api import ──
function showImport() {
  document.getElementById('s2a').classList.remove('hd')
  document.getElementById('s2ar').innerHTML = ''
  document.getElementById('s2afile').value = ''
}
function hideImport() {
  document.getElementById('s2a').classList.add('hd')
}
async function doImportSub2Api() {
  var fileInput = document.getElementById('s2afile')
  var file = fileInput.files[0]
  if (!file) { toast('请选择 JSON 文件', 'error'); return }
  var tr = document.getElementById('s2ar')
  tr.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> 正在解析导入...</span>'
  try {
    var text = await file.text()
    var r = await fetch('/admin/api/providers/import-sub2api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: text })
    })
    var d = await r.json()
    if (d.success && d.data) {
      var html = '<div class="al al-s"><i class="fas fa-check-circle"></i> ' + d.message + '</div>'
      if (d.data.imported && d.data.imported.length > 0) {
        html += '<div style="margin-top:8px;font-size:0.76rem;color:var(--zinc-300);"><b>导入的提供商：</b></div>'
        d.data.imported.forEach(function(p) {
          html += '<div style="padding:4px 6px;font-size:0.76rem;border-bottom:1px solid rgba(63,63,70,0.3);display:flex;justify-content:space-between;"><span><i class="fas fa-server c-p"></i> ' + p.name + '</span><span style="color:var(--text-muted);">' + p.models + ' 个模型</span></div>'
        })
      }
      if (d.data.skipped && d.data.skipped.length > 0) {
        html += '<div style="margin-top:8px;font-size:0.76rem;color:var(--text-muted);"><b>跳过的账号：</b></div>'
        d.data.skipped.forEach(function(s) {
          html += '<div style="padding:3px 6px;font-size:0.72rem;color:var(--text-light);"><i class="fas fa-info-circle"></i> ' + s.name + ' (' + s.reason + ')</div>'
        })
      }
      html += '<div class="fc mt-2 gap-8"><button class="btn btn-s btn-xs" onclick="location.reload()"><i class="fas fa-sync"></i> 刷新页面</button></div>'
      tr.innerHTML = html
    } else {
      tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> ' + (d.message || '导入失败') + '</div>'
    }
  } catch (e) {
    tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> 请求失败：' + e.message + '</div>'
  }
}

// ── Live call monitor ──
function fmtMs(ms) {
  if (ms === null || ms === undefined) return '-'
  if (ms < 1000) return ms + 'ms'
  return (ms / 1000).toFixed(ms < 10000 ? 1 : 0) + 's'
}

function fmtClock(iso) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour12: false })
  } catch (e) {
    return '-'
  }
}

function renderCallStatusBadge(status) {
  if (status === 'running') return '<span class="call-badge running"><i class="fas fa-circle-notch fa-spin"></i> 运行中</span>'
  if (status === 'success') return '<span class="call-badge success"><i class="fas fa-check-circle"></i> 成功</span>'
  return '<span class="call-badge error"><i class="fas fa-times-circle"></i> 失败</span>'
}

async function loadCallStatus() {
  var rows = document.getElementById('callRows')
  try {
    var r = await fetch('/admin/api/calls/status')
    var d = await r.json()
    if (!d.success || !d.data) return
    document.getElementById('cs-active').textContent = d.data.active || 0
    document.getElementById('cs-success').textContent = d.data.success || 0
    document.getElementById('cs-errors').textContent = d.data.errors || 0
    document.getElementById('cs-total').textContent = d.data.total || 0

    var records = d.data.records || []
    if (!records.length) {
      rows.innerHTML = '<div class="call-empty"><i class="fas fa-satellite-dish"></i> 暂无调用，发起 /v1 请求后会显示在这里</div>'
      return
    }

    rows.innerHTML = records.map(function(item) {
      var statusCode = item.statusCode ? 'HTTP ' + item.statusCode : '-'
      var duration = item.status === 'running' ? fmtMs(Date.now() - new Date(item.startedAt).getTime()) : fmtMs(item.durationMs)
      var err = item.error ? '<span class="call-error" title="' + escHtml(item.error) + '">' + escHtml(item.error) + '</span>' : ''
      return '<div class="call-row ' + item.status + '">' +
        '<div class="call-row-main">' +
          renderCallStatusBadge(item.status) +
          '<div class="call-model"><strong>' + escHtml(item.providerName) + '</strong><span>' + escHtml(item.modelId) + '</span></div>' +
        '</div>' +
        '<div class="call-row-meta">' +
          '<span><i class="fas fa-clock"></i> ' + duration + '</span>' +
          '<span><i class="fas fa-code"></i> ' + statusCode + '</span>' +
          '<span><i class="fas fa-key"></i> ' + escHtml(item.keyHint || '-') + '</span>' +
          '<span><i class="fas fa-wave-square"></i> ' + (item.stream ? 'stream' : 'normal') + '</span>' +
          '<span>' + fmtClock(item.startedAt) + '</span>' +
        '</div>' +
        err +
      '</div>'
    }).join('')
  } catch (e) {
    rows.innerHTML = '<div class="call-empty"><i class="fas fa-exclamation-circle"></i> 调用状态加载失败</div>'
  }
}

// ── Health ──
async function loadHealth() {
  try {
    var r = await fetch('/admin/api/providers/health')
    var d = await r.json()
    if (!d.success || !d.data) return
    d.data.forEach(function(p) {
      var badge = document.getElementById('hb-' + p.id)
      if (badge) {
        if (p.health && p.health.autoPaused) {
          badge.innerHTML = '<span class="bd bd-danger"><i class="fas fa-pause-circle"></i> 已暂停</span>'
        } else if (p.keyStats && p.keyStats.demoted > 0) {
          badge.innerHTML = '<span class="bd bd-warn"><i class="fas fa-exclamation-triangle"></i> 降级</span>'
        } else if (p.keyStats && p.keyStats.demoted === 0 && p.keyStats.total > 0) {
          badge.innerHTML = '<span class="bd bd-on"><i class="fas fa-check-circle"></i> 健康</span>'
        } else if (!p.enabled && !(p.health && p.health.autoPaused)) {
          badge.innerHTML = '<span class="bd bd-off"><i class="fas fa-ban"></i> 已禁用</span>'
        }
      }
      var section = document.getElementById('hs-' + p.id)
      if (section) {
        var html = ''
        if (p.health && p.health.autoPaused) {
          html += '<div class="al al-e" style="margin-bottom:6px;"><i class="fas fa-exclamation-circle"></i> <b>已自动暂停</b><br><span style="font-size:0.68rem;">' + escHtml(p.health.lastError) + '</span></div>'
          html += '<div class="fc gap-8"><button class="btn btn-p btn-xs" onclick="recoverProv(\\'' + p.id + '\\')"><i class="fas fa-sync"></i> 恢复</button></div>'
        } else if (p.keyStats && p.keyStats.demoted > 0) {
          html += '<div class="al al-i" style="margin-bottom:6px;"><i class="fas fa-info-circle"></i> <b>部分 Key 降级</b><br><span style="font-size:0.68rem;">' + p.keyStats.healthy + '/' + p.keyStats.total + ' 个 Key 健康，' + p.keyStats.demoted + ' 个已降权</span></div>'
        } else if (p.keyStats && p.keyStats.total > 0) {
          html += '<div class="al al-s" style="margin-bottom:6px;"><i class="fas fa-check-circle"></i> <b>所有 Key 健康</b></div>'
        }
        if (html) section.innerHTML = html
      }
    })
  } catch (e) {}
}

function escHtml(s) { var d = document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML }

async function recoverProv(id) {
  if (!(await cM('确定要恢复此提供商？将清除所有健康记录并重新启用。'))) return
  var tr = document.getElementById('hs-' + id)
  if (tr) tr.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> 恢复中...</span>'
  try {
    var r = await fetch('/admin/api/providers/' + encodeURIComponent(id) + '/recover', { method: 'POST' })
    var d = await r.json()
    if (d.success) {
      toast('已恢复并重新启用', 'success')
      location.reload()
    } else {
      if (tr) tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> ' + (d.message || '恢复失败') + '</div>'
    }
  } catch (e) {
    if (tr) tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> 请求失败</div>'
  }
}

// copyText helper
function copyText(t, el) {
  var ic = el.tagName === 'I' ? el : el.querySelector('i')
  var oc = ic.className
  var os = ic.style.color
  navigator.clipboard.writeText(t).then(function() {
    ic.className = 'fas fa-check'
    ic.style.color = '#34d399'
    setTimeout(function() {
      ic.className = oc
      ic.style.color = os
    }, 3000)
  }).catch(function() {})
}

// ── OpenAI OAuth ──
var lastOAuthSessionState = ''

function showOAuthMsg(prefix, html, type) {
  var el = document.getElementById(prefix + '-oauth-msg')
  if (!el) return
  if (!html) {
    el.innerHTML = ''
    el.classList.add('hd')
    return
  }
  var cls = type === 'success' ? 'al-s' : (type === 'error' ? 'al-e' : 'al-i')
  var icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle')
  el.innerHTML = '<div class="al ' + cls + '" style="margin:8px 0 0 0;font-size:0.75rem;"><i class="fas ' + icon + '"></i> ' + html + '</div>'
  el.classList.remove('hd')
}

function onAfmtChange(val) {
  var box = document.getElementById('aoauth-box')
  if (box) {
    if (val === 'openai-oauth') box.classList.remove('hd')
    else box.classList.add('hd')
  }
  var urlInp = document.getElementById('aurl')
  if (urlInp && (!urlInp.value || urlInp.value.includes('api.openai.com'))) {
    if (val === 'openai-oauth') urlInp.value = 'https://tw1.vpsnat.com/v1'
  }
}

function onEditFmtChange(id, val) {
  var box = document.getElementById('oauth-box-' + id)
  if (box) {
    if (val === 'openai-oauth') box.classList.remove('hd')
    else box.classList.add('hd')
  }
  var urlInp = document.getElementById('url-' + id)
  if (urlInp && (!urlInp.value || urlInp.value === 'https://api.openai.com/v1')) {
    if (val === 'openai-oauth') urlInp.value = 'https://tw1.vpsnat.com/v1'
  }
}

function switchOAuthTab(prefix, tab) {
  ['codex', 'token', 'custom'].forEach(function(t) {
    var pane = document.getElementById(prefix + '-pane-' + t)
    var btn = document.getElementById(prefix + '-tab-' + t)
    if (pane) {
      if (t === tab) pane.classList.remove('hd')
      else pane.classList.add('hd')
    }
    if (btn) {
      if (t === tab) btn.classList.add('active')
      else btn.classList.remove('active')
    }
  })
}

async function startOpenAIOAuth(providerId, mode, prefix) {
  mode = mode || 'codex'
  var customClientId = ''
  if (prefix) {
    var cidInp = document.getElementById(prefix + '-custom-client-id')
    if (cidInp) customClientId = cidInp.value.trim()
  }
  showOAuthMsg(prefix, '正在创建授权请求，准备打开 OpenAI 登录窗口...', 'info')
  var url = '/admin/api/oauth/openai/start?mode=' + encodeURIComponent(mode) +
    (providerId ? '&providerId=' + encodeURIComponent(providerId) : '') +
    (customClientId ? '&clientId=' + encodeURIComponent(customClientId) : '')

  try {
    var r = await fetch(url)
    var d = await r.json()
    if (d.success && d.data && d.data.authUrl) {
      lastOAuthSessionState = d.data.state
      try { sessionStorage.setItem('last_openai_state', d.data.state) } catch(e) {}
      window.open(d.data.authUrl, 'openai_oauth', 'width=620,height=750,menubar=no,toolbar=no')
      showOAuthMsg(prefix, '已在新窗口打开 OpenAI 授权页。请登录同意后，将浏览器最终跳转后的地址栏完整 URL 粘贴至下方输入框并点击「兑换并绑定」。', 'info')
      if (mode === 'codex' && prefix) {
        var inp = document.getElementById(prefix + '-oauth-input')
        if (inp) {
          inp.focus()
          inp.style.borderColor = 'var(--primary)'
        }
      }
    } else {
      showOAuthMsg(prefix, d.message || '获取授权链接失败', 'error')
      toast(d.message || '获取授权链接失败', 'error')
    }
  } catch (e) {
    showOAuthMsg(prefix, '网络请求失败，请检查网络连接', 'error')
    toast('网络请求失败', 'error')
  }
}

async function exchangeOAuthCode(providerId, prefix) {
  var inp = document.getElementById(prefix + '-oauth-input')
  var btn = document.getElementById(prefix + '-exchange-btn')
  var val = inp ? inp.value.trim() : ''
  if (!val) {
    showOAuthMsg(prefix, '请先在输入框中粘贴跳转后的地址栏完整链接或 code 授权码', 'error')
    toast('请先粘贴跳转后的地址栏链接或 code 授权码', 'error')
    if (inp) inp.focus()
    return
  }

  var originalBtnText = btn ? btn.innerHTML : ''
  if (btn) {
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 兑换中...'
  }
  showOAuthMsg(prefix, '正在向 OpenAI 请求验证并交换访问令牌，请稍候...', 'info')

  var stateToSend = lastOAuthSessionState
  if (!stateToSend) {
    try { stateToSend = sessionStorage.getItem('last_openai_state') || '' } catch(e) {}
  }

  try {
    var r = await fetch('/admin/api/oauth/openai/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codeOrUrl: val,
        state: stateToSend,
        providerId: providerId || 'openai'
      })
    })
    var d = await r.json()
    if (d.success) {
      showOAuthMsg(prefix, (d.message || '授权绑定成功！') + ' 正在刷新界面...', 'success')
      toast(d.message || 'OpenAI 账号授权绑定成功！', 'success')
      try { sessionStorage.removeItem('last_openai_state') } catch(e) {}
      setTimeout(function() { location.reload() }, 1500)
    } else {
      showOAuthMsg(prefix, '兑换失败: ' + escHtml(d.message || '授权码无效或已过期，请重新点击「1. 打开 OpenAI 授权窗口」获取最新授权链接。'), 'error')
      toast(d.message || '兑换失败，请检查授权码或重试', 'error')
      if (btn) {
        btn.disabled = false
        btn.innerHTML = originalBtnText || '<i class="fas fa-check"></i> 兑换并绑定'
      }
    }
  } catch (e) {
    showOAuthMsg(prefix, '网络请求异常，请检查网络连接', 'error')
    toast('网络请求失败', 'error')
    if (btn) {
      btn.disabled = false
      btn.innerHTML = originalBtnText || '<i class="fas fa-check"></i> 兑换并绑定'
    }
  }
}

function extractTokensFromJson(obj) {
  var acc = obj.accessToken || obj.access_token || obj.token || ''
  var ref = obj.refreshToken || obj.refresh_token || ''
  if (!acc && typeof obj === 'object') {
    for (var k in obj) {
      if (obj[k] && typeof obj[k] === 'object') {
        var sub = obj[k]
        if (!acc) acc = sub.accessToken || sub.access_token || sub.token || ''
        if (!ref) ref = sub.refreshToken || sub.refresh_token || ''
      }
    }
  }
  return { acc: acc, ref: ref }
}

function onOAuthTokenPaste(prefix) {
  var accessInp = document.getElementById(prefix + '-token-access')
  var refreshInp = document.getElementById(prefix + '-token-refresh')
  if (!accessInp) return
  var val = accessInp.value.trim()
  if (val.startsWith('{') && val.endsWith('}')) {
    try {
      var parsed = JSON.parse(val)
      var extracted = extractTokensFromJson(parsed)
      if (extracted.acc) {
        accessInp.value = extracted.acc
        if (extracted.ref && refreshInp && !refreshInp.value) {
          refreshInp.value = extracted.ref
        }
        toast('已自动从粘贴的 JSON 中提取 Access Token！', 'success')
      }
    } catch (e) {}
  }
}

async function importOAuthToken(providerId, prefix) {
  var accessInp = document.getElementById(prefix + '-token-access')
  var refreshInp = document.getElementById(prefix + '-token-refresh')
  var btn = document.getElementById(prefix + '-token-btn')
  var access = accessInp ? accessInp.value.trim() : ''
  var refresh = refreshInp ? refreshInp.value.trim() : ''

  if (access.startsWith('{') && access.endsWith('}')) {
    try {
      var parsed = JSON.parse(access)
      var extracted = extractTokensFromJson(parsed)
      if (extracted.acc) access = extracted.acc
      if (extracted.ref && !refresh) refresh = extracted.ref
    } catch (e) {}
  }

  if (!access && !refresh) {
    showOAuthMsg(prefix, '请至少填写 Access Token 或 Refresh Token', 'error')
    toast('请至少填写 Access Token 或 Refresh Token', 'error')
    return
  }

  var originalBtnText = btn ? btn.innerHTML : ''
  if (btn) {
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...'
  }
  showOAuthMsg(prefix, '正在验证并保存令牌...', 'info')

  try {
    var r = await fetch('/admin/api/oauth/openai/import-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: access,
        refreshToken: refresh,
        providerId: providerId || 'openai'
      })
    })
    var d = await r.json()
    if (d.success) {
      showOAuthMsg(prefix, (d.message || '令牌保存成功！') + ' 正在刷新界面...', 'success')
      toast(d.message || '令牌保存成功！', 'success')
      setTimeout(function() { location.reload() }, 1500)
    } else {
      showOAuthMsg(prefix, '保存失败: ' + escHtml(d.message || '未知错误'), 'error')
      toast(d.message || '保存失败', 'error')
      if (btn) {
        btn.disabled = false
        btn.innerHTML = originalBtnText || '<i class="fas fa-save"></i> 保存并绑定'
      }
    }
  } catch (e) {
    showOAuthMsg(prefix, '网络请求异常', 'error')
    toast('网络请求失败', 'error')
    if (btn) {
      btn.disabled = false
      btn.innerHTML = originalBtnText || '<i class="fas fa-save"></i> 保存并绑定'
    }
  }
}

window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'openai_oauth_success') {
    toast('OpenAI OAuth 授权成功！正在刷新...', 'success')
    setTimeout(function() { location.reload() }, 1500)
  } else if (e.data && e.data.type === 'openai_oauth_error') {
    toast('OpenAI 授权失败: ' + (e.data.message || '未知错误'), 'error')
  }
})

// ── Init ──
loadHealth()
loadCallStatus()
setInterval(loadCallStatus, 1500)
</script>
</body></html>`)
}
