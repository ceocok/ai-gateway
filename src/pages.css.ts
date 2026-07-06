export const CSS_CONTENT = `
:root {
  --c-primary: #4f6ef7;
  --c-primary-hover: #3b5de7;
  --c-primary-glow: rgba(79,110,247,.12);
  --c-text: #1f2937;
  --c-text-dark: #111827;
  --c-text-secondary: #4b5563;
  --c-text-muted: #6b7280;
  --c-text-light: #9ca3af;
  --c-bg: #f0f2f5;
  --c-bg-white: #fff;
  --c-bg-light: #f3f4f6;
  --c-bg-alt: #fafbfc;
  --c-border: #e5e7eb;
  --c-border-dark: #d1d5db;
  --c-success: #16a34a;
  --c-success-bg: #f0fdf4;
  --c-success-text: #166534;
  --c-danger: #dc2626;
  --c-danger-bg: #fef2f2;
  --c-danger-text: #991b1b;
  --c-info-bg: #eef2ff;
  --c-info-text: #3730a3;
  --c-overlay: rgba(0,0,0,.35);
  --c-header-bg: rgba(255,255,255,.93);
  --c-shadow-light: rgba(0,0,0,.05);
  --c-shadow: rgba(0,0,0,.15);
}

*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: var(--c-bg);
  color: var(--c-text);
  line-height: 1.5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.ct {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
  width: 100%;
}

hd {
  background: var(--c-header-bg);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--c-border);
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  display: block;
}

hd .ct {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

hd h1 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--c-text-dark);
}

hd h1 i {
  color: var(--c-primary);
  margin-right: 6px;
}

hd .nav {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: .8rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all .12s;
  text-decoration: none;
  white-space: nowrap;
}

.btn-p { background: var(--c-primary); color: var(--c-bg-white); }
.btn-p:hover { background: var(--c-primary-hover); }

.btn-s { background: var(--c-bg-light); color: var(--c-text-secondary); }
.btn-s:hover { background: var(--c-border); }

.btn-d { background: var(--c-danger-bg); color: var(--c-danger); }
.btn-d:hover { background: #fee2e2; }

.btn-g { background: var(--c-success-bg); color: var(--c-success); }
.btn-g:hover { background: #dcfce7; }

.btn-gh { background: transparent; color: var(--c-text-light); padding: 4px 8px; }
.btn-gh:hover { background: var(--c-bg-light); }

.btn-xs { padding: 3px 8px; font-size: .75rem; }

.card {
  background: var(--c-bg-white);
  border-radius: 10px;
  box-shadow: 0 1px 3px var(--c-shadow-light);
  padding: 20px;
  margin-bottom: 14px;
  border: 1px solid var(--c-border);
}

.card-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--c-bg-light);
}

.card-hd h2 {
  font-size: .95rem;
  font-weight: 600;
  color: var(--c-text-dark);
}

.card-hd h2 i {
  color: var(--c-primary);
  margin-right: 6px;
  width: 16px;
  text-align: center;
}

footer {
  display: block;
  margin-top: auto;
  background: var(--c-bg-white);
  border-top: 1px solid var(--c-border);
  padding: 14px 0;
  text-align: center;
  color: var(--c-text-light);
  font-size: .8rem;
}

footer a { color: inherit; text-decoration: none; }
footer a:hover { text-decoration: underline; }

input,
textarea,
select {
  width: 100%;
  padding: 6px 9px;
  border: 1px solid var(--c-border-dark);
  border-radius: 5px;
  font-size: .84rem;
  transition: border-color .12s;
  outline: none;
  font-family: inherit;
  background: var(--c-bg-white);
}

input:focus,
textarea:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 2px var(--c-primary-glow);
}

textarea {
  resize: vertical;
  min-height: 44px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: .78rem;
}

label {
  display: block;
  font-size: .75rem;
  font-weight: 600;
  color: var(--c-text-muted);
  margin-bottom: 2px;
}

.fg { margin-bottom: 8px; }

.fr {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.fr3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.fa {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.tg {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
  flex-shrink: 0;
}

.tg input { opacity: 0; width: 0; height: 0; }

.tg .sl {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--c-border-dark);
  border-radius: 18px;
  transition: .2s;
}

.tg .sl::before {
  content: "";
  position: absolute;
  height: 12px;
  width: 12px;
  left: 3px;
  bottom: 3px;
  background: var(--c-bg-white);
  border-radius: 50%;
  transition: .2s;
}

.tg input:checked + .sl { background: var(--c-primary); }
.tg input:checked + .sl::before { transform: translateX(16px); }

.bd {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: .7rem;
  font-weight: 500;
  white-space: nowrap;
}

.bd-on { background: #dcfce7; color: var(--c-success); }
.bd-off { background: var(--c-bg-light); color: var(--c-text-light); }
.bd-info { background: var(--c-info-bg); color: var(--c-primary); }

.tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: .76rem;
  background: #f9fafb;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  cursor: pointer;
  transition: border-color .12s;
}

.tag:hover { border-color: var(--c-border-dark); }
.tag i { font-size: .6rem; color: var(--c-text-light); }

.g2 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.mw {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}

.pi {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  overflow: hidden;
}

.pi:hover { border-color: var(--c-border-dark); }

.ps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  cursor: pointer;
  background: var(--c-bg-alt);
}

.ps:hover { background: var(--c-bg-light); }

.ps .l {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.ps .l h3 {
  font-size: .85rem;
  font-weight: 600;
  white-space: nowrap;
}

.ps .l .pu {
  font-size: .73rem;
  color: var(--c-text-light);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.ps .l .pu i.cp {
  font-size: .7rem;
  cursor: pointer;
  color: var(--c-text-light);
  padding: 1px;
}

.ps .l .pu i.cp:hover { color: var(--c-primary); }

.pd {
  padding: 12px;
  display: none;
  border-top: 1px solid var(--c-bg-light);
}

.pd.open { display: block; }

.pd .fr { grid-template-columns: 1fr 1.5fr; }
.pd .fr3 { grid-template-columns: 1fr 1fr 70px; }

.ki {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid #f9fafb;
  flex-wrap: wrap;
}

.ki .kv {
  min-width: 0;
  flex: 1 1 60%;
}

.ki:last-child { border-bottom: none; }

.kv {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: .8rem;
  color: var(--c-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.kv i.cp {
  font-size: .75rem;
  cursor: pointer;
  color: var(--c-text-light);
}

.kv i.cp:hover { color: var(--c-primary); }

.sg {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.n {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--c-primary);
}

.al {
  padding: 7px 10px;
  border-radius: 5px;
  font-size: .8rem;
  display: flex;
  align-items: center;
  gap: 5px;
}

.al-s { background: var(--c-success-bg); color: var(--c-success-text); }
.al-e { background: var(--c-danger-bg); color: var(--c-danger-text); }
.al-i { background: var(--c-info-bg); color: var(--c-info-text); }

.tc { text-align: center; }

/* Margin */
.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 6px; }
.mb-2 { margin-bottom: 8px; }

.fc {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Flex utilities */
.fx1 { flex: 1; }
.fx-s0 { flex-shrink: 0; }
.flex-col { display: flex; flex-direction: column; }
/*.jc-sb { justify-content: space-between; }*/
.jc-c { justify-content: center; }

/* Gap sizes */
.gp3 { gap: 3px; }
.gp4 { gap: 4px; }
.gp6 { gap: 6px; }
.gp8 { gap: 8px; }

/* Font utilities */
.fw-4 { font-weight: 400; }
.fw-6 { font-weight: 600; }
.fw-7 { font-weight: 700; }
.fs-xs { font-size: .75rem; }
.fs-sm { font-size: .82rem; }
.fs-s { font-size: .85rem; }
.fs-xxs { font-size: .65rem; }

/* Width utilities */
.w12 { width: 12px; }
.w14 { width: 14px; }
.w16 { width: 16px; }

/* Color utilities */
.c-p { color: var(--c-primary); }
.c-l { color: var(--c-text-light); }
.c-muted { color: var(--c-text-muted); }
.c-s { color: var(--c-success); }
.c-d { color: var(--c-danger); }

/* Display utilities */
.va-m { vertical-align: middle; }

/* Padding utilities */
.p-14 { padding: 14px; }
.p-10-12 { padding: 10px 12px; }

.fw { width: 100%; }

.mu {
  color: var(--c-text-light);
  font-size: .8rem;
}

.cd {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: .8rem;
  background: var(--c-bg-light);
  padding: 1px 4px;
  border-radius: 3px;
}

.ov {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp {
  cursor: pointer;
  user-select: none;
}

.gp {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.modal-o {
  position: fixed;
  inset: 0;
  background: var(--c-overlay);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--c-bg-white);
  border-radius: 10px;
  box-shadow: 0 20px 60px var(--c-shadow);
  width: 90%;
  max-width: 400px;
  padding: 22px;
  animation: mi .15s ease;
}

.modal h3 {
  font-size: .95rem;
  font-weight: 600;
  margin-bottom: 10px;
}

.modal p {
  font-size: .84rem;
  color: var(--c-text-muted);
  margin-bottom: 14px;
}

.modal .fa { margin-top: 14px; margin-bottom: 0; }
.modal select { margin-bottom: 8px; }

@keyframes mi {
  from { opacity: 0; transform: scale(.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.mk {
  background: var(--c-bg-light);
  border: 1px solid var(--c-border);
  border-radius: 5px;
  padding: 8px 10px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: .8rem;
  word-break: break-all;
  user-select: all;
  margin: 6px 0;
}

.hd { display: none !important; }

/* ===== 高频复用工具类 ===== */

/* 间距 — 高频复用 */
.mb-3 { margin-bottom: 3px; }
.mb-4 { margin-bottom: 4px; }
.mb-10 { margin-bottom: 10px; }
.mt-6 { margin-top: 6px; }
.m-16-0 { margin: 16px 0; }

/* 表单 */
.select-sm { flex: 1; padding: 7px 8px; border: 1px solid var(--c-border-dark); border-radius: 6px; font-size: .82rem; background: var(--c-bg-white); }
.input-mt-6 { margin-top: 6px; }

/* 文字 */
.fs-1 { font-size: 1rem; }
.fs-65 { font-size: .65rem; }
.fs-77 { font-size: .77rem; }
.fs-88 { font-size: .88rem; }
.gap-8 { gap: 8px; }

/* 复制图标 */
.copy-icon { font-size: .65rem; color: var(--c-text-light); }

/* 登录页 */
.login-wrapper { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 110px); padding: 20px; }
.login-card { width: 100%; max-width: 360px; padding: 24px; }

/* 管理后台面板 */
.add-form-panel { padding: 14px; background: var(--c-bg-alt); border-radius: 8px; border: 1px dashed var(--c-border-dark); width: calc(50% - 5px); }
.mdl-list-panel { flex: 1; padding: 14px; background: var(--c-bg-alt); border-radius: 8px; border: 1px dashed var(--c-border-dark); max-height: 420px; overflow-y: auto; }
.toast { position: fixed; top: 14px; right: 14px; z-index: 9998; min-width: 260px; }

/* JS 动态生成的 HTML 用 */
.mdl-item { padding: 5px 8px; border: 1px solid var(--c-border); border-radius: 6px; font-size: .82rem; display: flex; align-items: center; gap: 6px; }
.mdl-item i:first-child { color: var(--c-text-secondary); width: 14px; flex-shrink: 0; }
.mdl-add-btn { flex-shrink: 0; padding: 1px 5px; font-size: .9rem; line-height: 1; }
.grid-2-gap6 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }

@media (max-width: 768px) {
  .sg { flex-direction: column; }
  .fr,
  .fr3,
  .pd .fr,
  .pd .fr3 { grid-template-columns: 1fr; }
  .g2 { grid-template-columns: 1fr; }
  .gp { grid-template-columns: 1fr; }
  .ki { flex-wrap: wrap; }
  .ki > div:first-child { flex: 1 1 100%; overflow: hidden; }
  .ki > .fc { margin-top: 4px; }
}

/* ===== Admin cockpit refresh ===== */
:root {
  --c-primary: #3157ff;
  --c-primary-hover: #2447df;
  --c-primary-glow: rgba(49, 87, 255, .14);
  --c-ink: #111827;
  --c-ink-soft: #364152;
  --c-panel: rgba(255, 255, 255, .88);
  --c-panel-strong: #ffffff;
  --c-line: #dce3ee;
  --c-line-soft: #eef2f7;
  --c-wash: #f5f7fb;
  --c-accent: #0f766e;
  --c-warning: #b45309;
}

body {
  font-family: "Avenir Next", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif;
  background:
    linear-gradient(180deg, #f8fafc 0%, #eef2f7 52%, #f7f8fb 100%),
    repeating-linear-gradient(90deg, rgba(17,24,39,.035) 0 1px, transparent 1px 36px);
  color: var(--c-ink);
  letter-spacing: 0;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(15,23,42,.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,23,42,.028) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,.78), rgba(0,0,0,.08));
}

.ct { max-width: 1460px; }

hd {
  background: rgba(255,255,255,.74);
  border-bottom: 1px solid rgba(148,163,184,.28);
  box-shadow: 0 10px 30px rgba(15,23,42,.05);
}

hd h1 {
  font-size: 1.02rem;
  letter-spacing: 0;
}

.admin-shell {
  padding: 20px 18px 30px !important;
}

.admin-hero {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(420px, 620px);
  gap: 18px;
  align-items: stretch;
  margin: 6px 0 16px;
}

.hero-panel {
  min-height: 132px;
  padding: 22px 24px;
  border: 1px solid rgba(148,163,184,.28);
  background:
    linear-gradient(135deg, rgba(255,255,255,.94), rgba(248,250,252,.82)),
    linear-gradient(90deg, rgba(49,87,255,.08), rgba(15,118,110,.06));
  border-radius: 8px;
  box-shadow: 0 20px 55px rgba(15,23,42,.08);
  position: relative;
  overflow: hidden;
}

.hero-panel::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--c-primary), #0f766e, #111827);
}

.eyebrow {
  color: var(--c-primary);
  font-size: .72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .12em;
  margin-bottom: 8px;
}

.hero-panel h2 {
  font-size: 1.72rem;
  line-height: 1.05;
  margin-bottom: 8px;
  font-weight: 800;
  color: #0f172a;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--c-text-muted);
  font-size: .82rem;
}

.hero-meta code {
  border: 1px solid rgba(148,163,184,.34);
  background: rgba(255,255,255,.7);
  border-radius: 6px;
  padding: 2px 7px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.metric {
  padding: 16px;
  min-height: 132px;
  border-radius: 8px;
  background: rgba(255,255,255,.82);
  border: 1px solid rgba(148,163,184,.28);
  box-shadow: 0 14px 36px rgba(15,23,42,.065);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.metric i {
  color: var(--c-primary);
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: rgba(49,87,255,.1);
}

.metric strong {
  font-size: 1.8rem;
  line-height: 1;
  color: #0f172a;
}

.metric span {
  font-size: .76rem;
  color: var(--c-text-muted);
  font-weight: 700;
}

.card {
  border-radius: 8px;
  border: 1px solid rgba(148,163,184,.32);
  background: var(--c-panel);
  box-shadow: 0 18px 45px rgba(15,23,42,.07);
}

.provider-board {
  padding: 0;
  overflow: hidden;
}

.provider-board > .card-hd {
  padding: 16px 18px;
  margin: 0;
  border-bottom: 1px solid rgba(148,163,184,.24);
  background: rgba(255,255,255,.72);
}

.provider-board > .card-hd h2 {
  font-size: 1rem;
  letter-spacing: 0;
}

.board-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn {
  border-radius: 6px;
  min-height: 30px;
  font-weight: 700;
  letter-spacing: 0;
}

.btn-p {
  background: #111827;
  box-shadow: 0 10px 22px rgba(17,24,39,.18);
}

.btn-p:hover { background: #020617; transform: translateY(-1px); }
.btn-gh { color: #64748b; }
.btn-gh:hover { background: rgba(15,23,42,.06); color: #0f172a; }
.btn-g { background: #e8f8ef; color: #15803d; }
.btn-d { background: #fff1f2; color: #be123c; }

.add-form-wrap {
  display: grid !important;
  grid-template-columns: minmax(360px, 1fr) minmax(300px, .8fr);
  gap: 12px !important;
  padding: 14px 18px 0;
  margin-bottom: 0 !important;
}

.add-form-panel,
.mdl-list-panel {
  width: auto;
  border-radius: 8px;
  border: 1px solid rgba(148,163,184,.34);
  background: rgba(248,250,252,.78);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.7);
}

.gp {
  display: block;
  columns: 2 430px;
  column-gap: 16px;
  padding: 16px 18px 18px;
}

.pi {
  display: inline-block;
  width: 100%;
  margin: 0 0 16px;
  break-inside: avoid;
  border-radius: 8px;
  border: 1px solid rgba(148,163,184,.34);
  background: var(--c-panel-strong);
  box-shadow: 0 14px 32px rgba(15,23,42,.065);
  overflow: hidden;
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
}

.pi:hover {
  transform: translateY(-2px);
  border-color: rgba(49,87,255,.32);
  box-shadow: 0 20px 42px rgba(15,23,42,.09);
}

.ps {
  padding: 14px 16px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.94), rgba(248,250,252,.86));
  border-left: 3px solid transparent;
}

.ps:hover { background: #fff; }

.pi:has(.pd.open) .ps {
  border-left-color: var(--c-primary);
  background:
    linear-gradient(180deg, rgba(255,255,255,.98), rgba(244,247,255,.88));
}

.ps .l {
  gap: 10px;
}

.ps .l > i {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(15,23,42,.05);
  color: #64748b;
}

.provider-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.provider-name {
  font-size: .96rem !important;
  font-weight: 800 !important;
  color: #0f172a;
}

.provider-metrics {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #64748b;
  font-size: .72rem;
  font-weight: 700;
}

.provider-metrics span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #f1f5f9;
}

.ps .l .pu {
  max-width: 420px;
  margin-top: 2px;
  font-size: .76rem;
  color: #94a3b8;
}

.pd {
  padding: 16px;
  border-top: 1px solid var(--c-line-soft);
  background: #ffffff;
}

.pd.open {
  display: grid;
  gap: 12px;
}

.pi:has(.pd.open) {
  display: block;
  column-span: all;
}

.pd .fr {
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr);
  gap: 12px;
}

.fg {
  margin-bottom: 10px;
}

label {
  color: #64748b;
  font-size: .72rem;
  letter-spacing: .02em;
}

input,
textarea,
select,
.select-sm {
  min-height: 36px;
  border-radius: 7px;
  border: 1px solid #d8e0ea;
  background: #fbfdff;
  color: #0f172a;
  font-size: .86rem;
}

input:focus,
textarea:focus,
select:focus {
  border-color: rgba(49,87,255,.55);
  box-shadow: 0 0 0 4px rgba(49,87,255,.1);
}

.pd [data-kidx],
.pd [data-idx],
#akeys .fc,
#amodels .fc {
  gap: 8px;
  padding: 5px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
}

.pd [data-kidx] input,
.pd [data-idx] input,
#akeys input,
#amodels input {
  font-family: "SF Mono", "Menlo", monospace;
}

.tg {
  width: 42px;
  height: 24px;
}

.tg .sl {
  border-radius: 999px;
  background: #cbd5e1;
  box-shadow: inset 0 1px 2px rgba(15,23,42,.2);
}

.tg .sl::before {
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  box-shadow: 0 2px 8px rgba(15,23,42,.2);
}

.tg input:checked + .sl {
  background: linear-gradient(135deg, #2563eb, #0f766e);
}

.tg input:checked + .sl::before {
  transform: translateX(18px);
}

.bd {
  padding: 4px 9px;
  border-radius: 999px;
  font-size: .72rem;
  font-weight: 800;
}

.bd-on {
  background: #dcfce7;
  color: #15803d;
}

.bd-off {
  background: #edf2f7;
  color: #64748b;
}

.health-section {
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.ki {
  padding: 13px 0;
  border-bottom: 1px solid #eef2f7;
}

.kv {
  font-size: .82rem;
  color: #334155;
}

.modal {
  border-radius: 8px;
  border: 1px solid rgba(148,163,184,.28);
}

.toast {
  top: 18px;
  right: 18px;
}

.al {
  border-radius: 8px;
  border: 1px solid transparent;
}

.al-s { border-color: #bbf7d0; }
.al-e { border-color: #fecdd3; }

@media (max-width: 980px) {
  .admin-hero,
  .add-form-wrap {
    grid-template-columns: 1fr;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .admin-shell { padding: 12px !important; }
  .hero-panel h2 { font-size: 1.36rem; }
  .metric-grid { grid-template-columns: 1fr 1fr; }
  .metric { min-height: 104px; padding: 12px; }
  .gp { columns: 1; padding: 12px; }
  .ps { align-items: flex-start; gap: 10px; }
  .ps .l .pu { max-width: 230px; }
}
`
