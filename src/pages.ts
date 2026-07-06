import { Context } from 'hono'
import { getProviders, getProxyKeys } from './storage'
import { SITE_CONFIG } from './config'
import type { Env } from './types'
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

  <!-- Stats + API -->
  <div class="sg" style="margin-bottom:18px;">
    <div class="card" style="flex:1.2;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <div style="width:36px;height:36px;border-radius:8px;background:var(--primary-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fas fa-cubes" style="color:var(--primary);font-size:0.85rem;"></i>
        </div>
        <div>
          <h2 style="font-size:0.95rem;font-weight:700;">模型广场</h2>
          <p style="font-size:0.72rem;color:var(--text-muted);margin-top:1px;">${SITE_CONFIG.subtitle}</p>
        </div>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(63,63,70,0.3);">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:0.76rem;color:var(--text-light);">API 接口：</span>
          <code class="cd">https://${host}/v1</code>
          <i class="fas fa-copy cp" style="font-size:0.65rem;color:var(--text-muted);cursor:pointer;" onclick='copyText("https://${host}/v1",this)'></i>
          <span style="font-size:0.76rem;color:var(--text-muted);margin-left:4px;">模型格式：<code style="background:rgba(39,39,42,0.4);padding:1px 5px;border-radius:3px;font-size:0.72rem;">提供商ID/模型ID</code></span>
        </div>
      </div>
    </div>
    <div class="card" style="flex:1;padding:16px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;height:100%;align-content:center;">
        <div>
          <span style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;letter-spacing:0.04em;">提供商</span>
          <div style="font-size:1.5rem;font-weight:800;color:var(--zinc-100);font-variant-numeric:tabular-nums;margin-top:2px;">${providers.length}</div>
          <span style="font-size:0.72rem;color:var(--success);"><i class="fas fa-check-circle"></i> ${providers.filter(p=>p.enabled).length} 在线</span>
        </div>
        <div>
          <span style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;letter-spacing:0.04em;">模型</span>
          <div style="font-size:1.5rem;font-weight:800;color:var(--zinc-100);font-variant-numeric:tabular-nums;margin-top:2px;">${providers.reduce((s,p)=>s+p.models.length,0)}</div>
          <span style="font-size:0.72rem;color:var(--success);"><i class="fas fa-check-circle"></i> ${providers.filter(p=>p.enabled).reduce((s,p)=>s+p.models.filter(m=>m.enabled).length,0)} 可用</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Provider Grid -->
  <div class="g2">
    ${providers.filter(p=>p.enabled).map(p => `
      <div class="card p-14" style="padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:30px;height:30px;border-radius:6px;background:var(--primary-bg);display:flex;align-items:center;justify-content:center;">
              <i class="fas fa-server" style="color:var(--primary);font-size:0.7rem;"></i>
            </div>
            <div>
              <h3 style="font-size:0.88rem;font-weight:700;color:var(--zinc-100);">${p.name}</h3>
              <span style="font-size:0.62rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;padding:1px 6px;border-radius:3px;border:1px solid var(--zinc-700);letter-spacing:0.02em;">${(p.apiType||'openai')==='anthropic'?'Anthropic':'OpenAI'}</span>
            </div>
          </div>
          <span class="bd-on"><i class="fas fa-check-circle"></i> 在线</span>
        </div>
        ${p.models.filter(m=>m.enabled).length
          ? `<div class="mw">${p.models.filter(m=>m.enabled).map(m=>`<span class="tag" onclick='copyText("${p.id}/${m.id}",this)'><i class="fas fa-cube"></i>${p.id}/${m.id}</span>`).join('')}</div>`
          : `<p style="font-size:0.78rem;color:var(--text-muted);font-style:italic;">暂无启用的模型</p>`
        }
      </div>
    `).join('')}
  </div>
</main>

<footer><div class="ct">&copy; ${new Date().getFullYear()} <a href="${SITE_CONFIG.authorUrl}" target="_blank">${SITE_CONFIG.title}</a> by <a href="${SITE_CONFIG.blogUrl}" target="_blank">${SITE_CONFIG.author}</a></div></footer>

<script>
function copyText(t, el) {
  const ic = el.tagName === 'I' ? el : el.querySelector('i')
  const oc = ic.className
  const os = ic.style.color
  navigator.clipboard.writeText(t).then(() => {
    ic.className = 'fas fa-check'
    ic.style.color = '#34d399'
    setTimeout(() => {
      ic.className = oc
      ic.style.color = os
    }, 3000)
  }).catch(() => {})
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
  const enabledProviders = providers.filter(p => p.enabled).length
  const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0)
  const enabledModels = providers.reduce((sum, p) => sum + p.models.filter(m => m.enabled).length, 0)
  const enabledProxyKeys = proxyKeys.filter(k => k.enabled).length

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
      <div class="fr">
        <div class="fg"><label>名称</label><input type="text" id="anm" placeholder="DeepSeek"></div>
        <div class="fg"><label>ID</label><input type="text" id="aid" placeholder="deepseek"></div>
      </div>
      <div class="fg"><label>API 地址</label><input type="url" id="aurl" placeholder="https://api.deepseek.com"></div>
      <div class="fg">
        <label>API 格式</label>
        <select id="afmt">
          <option value="openai">OpenAI 兼容</option>
          <option value="anthropic">Anthropic 兼容</option>
        </select>
      </div>
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
        <label>模型 ID <span style="font-weight:400;color:var(--text-muted);">（多个）</span></label>
        <div id="amodels">
          <div class="fc mb-4"><input type="text" placeholder="deepseek-chat" class="fx1 ami">
            <label class="tg"><input type="checkbox" checked class="ame"><span class="sl"></span></label>
            <button class="btn btn-gh btn-xs" onclick="testNewMdl(this)" title="测试"><i class="fas fa-plug"></i></button>
            <button class="btn btn-gh btn-xs" onclick="this.parentElement.remove()"><i class="fas fa-times c-muted"></i></button>
          </div>
        </div>
        <button class="btn btn-gh btn-xs" onclick="addMdlRow()"><i class="fas fa-plus"></i> 添加模型</button>
      </div>
      <div class="fg"><label class="tg" style="display:inline-flex;align-items:center;gap:8px;width:auto;height:auto;"><input type="checkbox" checked id="aen"><span class="sl"></span><span style="font-size:0.78rem;color:var(--zinc-300);text-transform:none;letter-spacing:0;font-weight:500;margin-left:4px;">创建后启用</span></label></div>
      <div id="atestR"></div>
      <div class="fa">
        <button class="btn btn-p" onclick="createProv()"><i class="fas fa-check"></i> 创建</button>
        <button class="btn btn-gh" onclick="hideAdd()">取消</button>
      </div>
    </div>
    <div id="amc" class="hd mdl-list-panel" style="align-self:start;">
      <h3 style="font-size:0.82rem;font-weight:700;color:var(--zinc-300);margin-bottom:8px;"><i class="fas fa-list c-p"></i> 发现的模型</h3>
      <div id="amcl"></div>
    </div>
  </div>

  <!-- Provider List -->
  <div class="gp">
    ${providers.map((p, pi) => `
    <div class="pi" data-id="${p.id}">
      <div class="ps" onclick="tog('${p.id}')">
        <div class="l">
          <i class="fas fa-fw ${p.enabled ? 'fa-server' : 'fa-server'}"></i>
          <div>
            <div class="provider-title-row">
              <span class="provider-name">${p.name}</span>
              <span class="provider-metrics">
                <span id="hb-${p.id}"><span class="bd ${p.enabled ? 'bd-on' : 'bd-off'}">${p.enabled ? '<i class="fas fa-check-circle"></i> 已启用' : '<i class="fas fa-ban"></i> 已禁用'}</span></span>
              </span>
            </div>
            <div class="pu">
              ${p.baseUrl.replace(/^https?:\/\//, '')}
              <i class="fas fa-cube" style="margin-left:6px;"></i> ${p.models.length} 模型
            </div>
          </div>
        </div>
        <i class="fas fa-chevron-right" id="ch-${p.id}" style="color:var(--text-muted);font-size:0.7rem;transition:transform 0.15s ease;flex-shrink:0;"></i>
      </div>
      <div class="pd" id="dt-${p.id}">
        <input type="hidden" id="at-${p.id}" value="${p.apiType || 'openai'}">
        <div class="fr">
          <div class="fg"><label>名称</label><input type="text" id="nm-${p.id}" value="${escHtml(p.name)}"></div>
          <div class="fg"><label>API 地址</label><input type="url" id="url-${p.id}" value="${p.baseUrl}"></div>
        </div>
        <div class="fr">
          <div class="fg"><label>API 格式</label><select id="at-${p.id}" class="select-sm"><option value="openai" ${p.apiType==='openai'?'selected':''}>OpenAI 兼容</option><option value="anthropic" ${p.apiType==='anthropic'?'selected':''}>Anthropic 兼容</option></select></div>
          <div class="fg" style="display:flex;align-items:flex-end;padding-bottom:4px;"><label class="tg" style="display:inline-flex;align-items:center;gap:8px;width:auto;height:auto;"><input type="checkbox" id="en-${p.id}" ${p.enabled?'checked':''} onchange="togglePb('${p.id}', this.checked)"><span class="sl"></span><span style="font-size:0.78rem;color:var(--zinc-300);text-transform:none;letter-spacing:0;font-weight:500;margin-left:4px;">已启用</span></label></div>
        </div>
        <div class="fg">
          <label>API Keys</label>
          <div id="keys-${p.id}">
            ${p.apiKeys.map((k, ki) => `
              <div data-kidx="${ki}" style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;background:rgba(9,9,11,0.4);border:1px solid rgba(63,63,70,0.3);margin-bottom:6px;">
                <input type="text" value="${escHtml(k.key)}" class="fx1" id="k-${p.id}-${ki}" placeholder="API Key" style="font-family:'SF Mono','Fira Code','JetBrains Mono',monospace;font-size:0.78rem;">
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
          <label>模型</label>
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
        <div class="fa">
          <button class="btn btn-p btn-sm" onclick="save('${p.id}')"><i class="fas fa-save"></i> 保存</button>
          <button class="btn btn-d btn-sm" onclick="del('${p.id}')"><i class="fas fa-trash"></i> 删除</button>
        </div>
      </div>
    </div>
    `).join('')}
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
      ? `<div style="border-bottom:1px solid rgba(63,63,70,0.3);padding-bottom:8px;margin-bottom:4px;display:flex;justify-content:space-between;font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;letter-spacing:0.04em;">
          <span style="flex:1;">Key</span>
          <span style="width:80px;text-align:center;">名称</span>
          <span style="width:70px;text-align:center;">状态</span>
          <span style="width:50px;"></span>
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
        <div style="width:80px;text-align:center;font-size:0.76rem;color:var(--text-muted);">${pk.name || '-'}</div>
        <div class="fc" style="width:70px;justify-content:center;">
          <span class="bd ${pk.enabled ? 'bd-on' : 'bd-off'}">${pk.enabled ? '已启用' : '已禁用'}</span>
        </div>
        <div style="width:50px;text-align:right;">
          <label class="tg" style="vertical-align:middle;">
            <input type="checkbox" ${pk.enabled ? 'checked' : ''} onchange="toggleProxyKey('${pk.id}', this.checked)">
            <span class="sl"></span>
          </label>
        </div>
        <div style="width:36px;text-align:right;">
          <button class="btn btn-gh btn-xs" onclick="rmKey('${pk.id}')" title="删除"><i class="fas fa-trash c-muted"></i></button>
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
// ── Modal ──
function showM(h) {
  const o = document.createElement('div')
  o.className = 'modal-o'
  o.innerHTML = '<div class="modal">' + h + '</div>'
  document.body.appendChild(o)
}
function closeM() { const o = document.querySelector('.modal-o'); if (o) o.remove() }

function cM(msg) {
  return new Promise(function(resolve) {
    showM('<h3><i class="fas fa-exclamation-triangle" style="color:var(--amber-400);"></i> 确认</h3><p>' + msg + '</p><div class="fa" style="justify-content:flex-end;"><button class="btn btn-s" onclick="closeM();resolve(false)">取消</button><button class="btn btn-p" onclick="closeM();resolve(true)">确定</button></div>')
    window.resolve = resolve
  })
}

function pM(msg) {
  return new Promise(function(resolve) {
    showM('<h3><i class="fas fa-pen" style="color:var(--primary);"></i> 输入</h3><p>' + msg + '</p><div class="fg"><input type="text" id="pMinp" placeholder="输入内容"></div><div class="fa" style="justify-content:flex-end;"><button class="btn btn-s" onclick="closeM();resolve(null)">取消</button><button class="btn btn-p" onclick="closeM();resolve(document.getElementById(\'pMinp\').value.trim() || null)">确定</button></div>')
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

// ── Provider accordion ──
function tog(id) {
  const d = document.getElementById('dt-' + id)
  const c = document.getElementById('ch-' + id)
  const isOpen = d.classList.toggle('open')
  c.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)'
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
  const url = document.getElementById('aurl').value.trim()
  if (!url) { toast('请先填写 API 地址', 'error'); return }
  const apiType = document.getElementById('afmt').value
  const tr = document.getElementById('atestR')
  tr.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> 测试中...</span>'
  fetch('/admin/api/providers/probe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseUrl: url, apiKey: k, apiType })
  }).then(async function(r) {
    const d = await r.json()
    const result = d.data || {}
    if (d.success && result.success) {
      try {
        const models = result.models || []
        const h = models.map(function(m) {
          return '<div class="mdl-item">' +
            '<i class="fas fa-cube"></i>' +
            '<span class="fx1 cp ov" onclick="copyText(\\'' + m + '\\',this)">' + m + '</span>' +
            '<button class="btn btn-gh btn-xs mdl-add-btn" onclick="addMdlToForm(\\'' + m + '\\')" title="添加到表单">+</button></div>'
        }).join('')
        document.getElementById('amcl').innerHTML = h
          ? '<div class="grid-2-gap6">' + h + '</div>'
          : '<span style="color:var(--text-muted);font-size:0.78rem;">未返回模型列表</span>'
        document.getElementById('amc').classList.remove('hd')
      } catch (e) {}
      tr.innerHTML = '<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功' + (result.statusCode ? ' (HTTP ' + result.statusCode + ')' : '') + '</div>'
    } else {
      document.getElementById('amc').classList.add('hd')
      tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> ' + (result.message || d.message || '连接失败') + '</div>'
    }
    setTimeout(function() { tr.innerHTML = '' }, 5000)
  }).catch(function() {
    document.getElementById('amc').classList.add('hd')
    tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> 连接失败</div>'
    setTimeout(function() { tr.innerHTML = '' }, 5000)
  })
}

// ── Add form: model rows ──
function addMdlRow() {
  const c = document.getElementById('amodels')
  const d = document.createElement('div')
  d.className = 'fc mb-4'
  d.innerHTML = '<input type="text" placeholder="deepseek-chat" class="fx1 ami"><label class="tg"><input type="checkbox" checked class="ame"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testNewMdl(this)" title="测试"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="this.parentElement.remove()"><i class="fas fa-times c-muted"></i></button>'
  c.appendChild(d)
}

function addMdlToForm(mid) {
  const c = document.getElementById('amodels')
  const d = document.createElement('div')
  d.className = 'fc mb-4'
  d.innerHTML = '<input type="text" value="' + mid + '" class="fx1 ami"><label class="tg"><input type="checkbox" checked class="ame"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testNewMdl(this)" title="测试"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="this.parentElement.remove()"><i class="fas fa-times c-muted"></i></button>'
  c.appendChild(d)
}

function testNewMdl(btn) {
  const inp = btn.parentElement.querySelector('.ami'), mid = inp.value.trim()
  if (!mid) { toast('请输入模型 ID', 'error'); return }
  const url = document.getElementById('aurl').value.trim()
  const akeys = document.querySelectorAll('#akeys .aki')
  const apiKey = Array.from(akeys).map(function(inp) { return inp.value.trim() }).filter(Boolean)[0] || 'dummy'
  const apiType = document.getElementById('afmt').value
  const tr = document.getElementById('atestR')
  tr.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> 测试中...</span>'
  fetch('/admin/api/providers/probe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseUrl: url, apiKey: apiKey, apiType: apiType, modelId: mid })
  }).then(async function(r) {
    const d = await r.json()
    const result = d.data || {}
    tr.innerHTML = d.success && result.success
      ? '<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功' + (result.statusCode ? ' (HTTP ' + result.statusCode + ')' : '') + '</div>'
      : '<div class="al al-e"><i class="fas fa-times-circle"></i> ' + (result.message || d.message || '连接失败') + '</div>'
    setTimeout(function() { tr.innerHTML = '' }, 5000)
  }).catch(function() {
    tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> 连接失败</div>'
    setTimeout(function() { tr.innerHTML = '' }, 5000)
  })
}

// ── Create provider ──
async function createProv() {
  const nm = document.getElementById('anm').value.trim(), id = document.getElementById('aid').value.trim()
  const url = document.getElementById('aurl').value.trim(), apiType = document.getElementById('afmt').value
  const aki = document.querySelectorAll('#akeys .aki')
  const keys = Array.from(aki).map(function(inp, i) {
    var k = inp.value.trim()
    var en = inp.parentElement.querySelector('.ake')?.checked ?? true
    return k ? { key: k, enabled: en } : null
  }).filter(Boolean)
  const ami = document.querySelectorAll('#amodels .ami')
  const models = Array.from(ami).map(function(inp) {
    var mid = inp.value.trim()
    var en = inp.parentElement.querySelector('.ame')?.checked ?? true
    return mid ? { id: mid, enabled: en } : null
  }).filter(Boolean)
  const enabled = document.getElementById('aen').checked
  if (!nm || !id || !url) { toast('请填写名称、ID 和 API 地址', 'error'); return }
  const r = await fetch('/admin/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: id, name: nm, baseUrl: url, apiType: apiType, apiKeys: keys, models: models, enabled: enabled })
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

function addKeyRow(id) {
  const inp = document.getElementById('nk-' + id), k = inp.value.trim()
  if (!k) { toast('请输入 API Key', 'error'); return }
  const c = document.getElementById('keys-' + id), cnt = c.querySelectorAll('[data-kidx]').length
  const d = document.createElement('div')
  d.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;background:rgba(9,9,11,0.4);border:1px solid rgba(63,63,70,0.3);margin-bottom:6px;'
  d.dataset.kidx = cnt
  d.innerHTML = '<input type="text" value="' + k + '" class="fx1" id="k-' + id + '-' + cnt + '" placeholder="API Key" style="font-family:SF Mono,Fira Code,JetBrains Mono,monospace;font-size:0.78rem;"><label class="tg"><input type="checkbox" checked id="ken-' + id + '-' + cnt + '"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testKeyRow(\\'' + id + '\\',' + cnt + ')" title="测试"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="rmKeyRow(\\'' + id + '\\',' + cnt + ')"><i class="fas fa-times c-muted"></i></button>'
  c.appendChild(d)
  inp.value = ''
  inp.focus()
}

function rmKeyRow(id, idx) {
  const c = document.getElementById('keys-' + id)
  c.querySelectorAll('[data-kidx]').forEach(function(item) {
    if (parseInt(item.dataset.kidx) === idx) item.remove()
  })
}

async function testKeyRow(id, idx) {
  const k = document.getElementById('k-' + id + '-' + idx).value.trim()
  const url = document.getElementById('url-' + id).value.trim()
  if (!k) { toast('请输入 API Key', 'error'); return }
  const apiType = document.getElementById('at-' + id).value
  const tr = document.getElementById('tr-' + id)
  tr.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> 测试中...</span>'
  try {
    const r = await fetch('/admin/api/providers/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl: url, apiKey: k, apiType: apiType })
    })
    const d = await r.json()
    const result = d.data || {}
    tr.innerHTML = d.success && result.success
      ? '<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功' + (result.statusCode ? ' (HTTP ' + result.statusCode + ')' : '') + '</div>'
      : '<div class="al al-e"><i class="fas fa-times-circle"></i> ' + (result.message || d.message || '连接失败') + '</div>'
    setTimeout(function() { tr.innerHTML = '' }, 5000)
  } catch (e) {
    tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> 连接失败</div>'
    setTimeout(function() { tr.innerHTML = '' }, 5000)
  }
}

// ── Edit provider models ──
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
  const c = document.getElementById('ml-' + id), cnt = c.querySelectorAll('[data-idx]').length
  const d = document.createElement('div')
  d.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;background:rgba(9,9,11,0.4);border:1px solid rgba(63,63,70,0.3);margin-bottom:6px;'
  d.dataset.idx = cnt
  d.innerHTML = '<input type="text" value="' + mid + '" class="fx1" id="mid-' + id + '-' + cnt + '" placeholder="模型 ID" style="font-family:SF Mono,Fira Code,JetBrains Mono,monospace;font-size:0.78rem;"><label class="tg"><input type="checkbox" checked id="men-' + id + '-' + cnt + '"><span class="sl"></span></label><button class="btn btn-gh btn-xs" id="tm-' + id + '-' + cnt + '"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" id="rm-' + id + '-' + cnt + '"><i class="fas fa-times c-muted"></i></button>'
  c.appendChild(d)
  document.getElementById('tm-' + id + '-' + cnt).addEventListener('click', function() { testMdl(id, mid, cnt) })
  document.getElementById('rm-' + id + '-' + cnt).addEventListener('click', function() { rmMdl(id, cnt) })
  inp.value = ''
}

function rmMdl(id, idx) {
  const c = document.getElementById('ml-' + id)
  c.querySelectorAll('[data-idx]').forEach(function(item) {
    if (parseInt(item.dataset.idx) === idx) item.remove()
  })
}

async function testMdl(id, mid, idx) {
  const tr = document.getElementById('tr-' + id)
  tr.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> 测试中...</span>'
  try {
    const r = await fetch('/admin/api/providers/' + encodeURIComponent(id) + '/test-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: mid })
    })
    const d = await r.json()
    if (d.success && d.data) {
      tr.innerHTML = d.data.success
        ? '<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功 (HTTP ' + d.data.statusCode + ')</div>'
        : '<div class="al al-e"><i class="fas fa-times-circle"></i> ' + (d.data.message || '连接失败') + '</div>'
    } else {
      tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> ' + (d.message || '测试失败') + '</div>'
    }
    setTimeout(function() { tr.innerHTML = '' }, 5000)
  } catch (e) {
    tr.innerHTML = '<div class="al al-e"><i class="fas fa-times-circle"></i> 请求失败</div>'
    setTimeout(function() { tr.innerHTML = '' }, 5000)
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
    body: JSON.stringify({ name: nm, baseUrl: url, apiType: apiType, apiKeys: keys, models: models, enabled: enabled })
  })
  var d = await r.json()
  if (d.success) { toast('已保存', 'success'); location.reload() }
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

// ── Init ──
loadHealth()
</script>
</body></html>`)
}
