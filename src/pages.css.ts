export const CSS_CONTENT = `
/* ========================================
   Cyber Slate — Rose Ambient Dark Theme
   AI Gateway UI
   ======================================== */

:root {
  --zinc-950: #09090b;
  --zinc-900: #18181b;
  --zinc-800: #27272a;
  --zinc-700: #3f3f46;
  --zinc-600: #52525b;
  --zinc-500: #71717a;
  --zinc-400: #a1a1aa;
  --zinc-300: #d4d4d8;
  --zinc-200: #e4e4e7;
  --zinc-100: #f4f4f5;

  --rose-500: #f43f5e;
  --rose-400: #fb7185;
  --rose-300: #fda4af;
  --rose-200: #fecdd3;
  --rose-100: #ffe4e6;
  --rose-50: #fff1f2;

  --emerald-400: #34d399;
  --emerald-500: #10b981;
  --emerald-600: #059669;
  --emerald-50: #ecfdf5;

  --amber-400: #fbbf24;
  --amber-500: #f59e0b;
  --amber-50: #fffbeb;

  --red-400: #f87171;
  --red-500: #ef4444;

  --page-bg: var(--zinc-950);
  --page-text: var(--zinc-100);
  --card-bg: var(--zinc-900);
  --card-border: rgba(63,63,70,0.5);
  --card-border-hover: rgba(251,113,133,0.15);
  --inner-bg: var(--zinc-950);
  --inner-border: var(--zinc-800);
  --header-bg: rgba(9,9,11,0.78);
  --input-bg: var(--zinc-950);
  --input-border: var(--zinc-800);
  --input-focus: rgba(251,113,133,0.4);
  --input-focus-ring: rgba(251,113,133,0.15);
  --text-muted: var(--zinc-500);
  --text-light: var(--zinc-400);
  --text-secondary: var(--zinc-300);
  --primary: var(--rose-400);
  --primary-bg: rgba(251,113,133,0.08);
  --primary-border: rgba(251,113,133,0.2);
  --success: var(--emerald-400);
  --success-bg: rgba(16,185,129,0.1);
  --success-text: #6ee7b7;
  --warning: var(--amber-400);
  --warning-bg: rgba(245,158,11,0.1);
  --danger: var(--red-400);
  --danger-bg: rgba(239,68,68,0.1);
  --danger-text: #fca5a5;
  --overlay: rgba(0,0,0,0.6);
}

/* ── Reset & Base ── */

*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Helvetica Neue', sans-serif;
  background: var(--page-bg);
  color: var(--page-text);
  line-height: 1.5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Subtle Grid Background ── */

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* ── Ambient Glow (auth/hub pages) ── */

.ambient-glow {
  position: fixed;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: var(--rose-400);
  opacity: 0.06;
  filter: blur(140px);
  pointer-events: none;
  z-index: 0;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
}

/* ── Dashboard Horizon Glow ── */

.dash-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 1200px;
  height: 200px;
  background: linear-gradient(180deg, rgba(251,113,133,0.06), transparent);
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}

/* ── Container ── */

.ct {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  width: 100%;
  position: relative;
  z-index: 1;
}

/* ── Header ── */

hd {
  display: block;
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--header-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(63,63,70,0.5);
}

hd .ct {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px;
}

hd h1 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--zinc-100);
  display: flex;
  align-items: center;
  gap: 8px;
}

hd h1 i {
  color: var(--primary);
  font-size: 0.95rem;
}

hd h1 .subtitle {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 0.78rem;
}

hd .nav {
  display: flex;
  gap: 6px;
  align-items: center;
}

/* ── Buttons ── */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
  text-decoration: none;
  white-space: nowrap;
  line-height: 1;
  min-height: 32px;
}

.btn-p {
  background: var(--primary);
  color: var(--zinc-950);
  font-weight: 700;
}
.btn-p:hover { background: var(--rose-300); transform: translateY(-1px); }
.btn-p:active { transform: translateY(0); }

.btn-s {
  background: var(--zinc-800);
  color: var(--zinc-300);
  border: 1px solid var(--zinc-700);
}
.btn-s:hover { background: var(--zinc-700); color: var(--zinc-100); }

.btn-gh {
  background: transparent;
  color: var(--text-muted);
  padding: 4px 10px;
}
.btn-gh:hover { background: rgba(255,255,255,0.06); color: var(--zinc-100); }

.btn-xs { padding: 4px 10px; font-size: 0.72rem; min-height: 26px; }

.btn-sm { padding: 6px 12px; font-size: 0.78rem; min-height: 30px; }

.btn-d {
  background: var(--danger-bg);
  color: var(--danger);
  font-weight: 600;
}
.btn-d:hover { background: rgba(239,68,68,0.18); }

.btn-g {
  background: var(--success-bg);
  color: var(--success);
  font-weight: 600;
}
.btn-g:hover { background: rgba(16,185,129,0.16); }

.fw { width: 100%; }

/* ── Cards ── */

.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 20px;
  transition: border-color 0.15s ease;
}

.card-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(63,63,70,0.4);
}

.card-hd h2 {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--zinc-100);
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-hd h2 i {
  color: var(--primary);
  font-size: 0.8rem;
  width: 16px;
  text-align: center;
}

/* ── Forms ── */

.fg {
  margin-bottom: 12px;
}

label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

input[type="text"],
input[type="password"],
input[type="url"],
input[type="email"],
textarea,
select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--input-border);
  border-radius: 7px;
  font-size: 0.84rem;
  transition: all 0.15s ease;
  outline: none;
  font-family: inherit;
  background: var(--input-bg);
  color: var(--zinc-100);
  min-height: 36px;
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--input-focus);
  box-shadow: 0 0 0 3px var(--input-focus-ring);
}

input::placeholder,
textarea::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}

textarea {
  resize: vertical;
  min-height: 44px;
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.78rem;
}

select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='%23a1a1aa'%3E%3Cpath d='M0 0l5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}

select option {
  background: var(--card-bg);
  color: var(--zinc-100);
}

.select-sm {
  min-height: 34px;
  padding: 5px 28px 5px 8px;
  border: 1px solid var(--input-border);
  border-radius: 6px;
  font-size: 0.8rem;
  background: var(--input-bg);
  color: var(--zinc-100);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='%23a1a1aa'%3E%3Cpath d='M0 0l5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}

/* ── Forms: rows & fieldsets ── */

.fr {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.fr3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.fa {
  margin-top: 14px;
  display: flex;
  gap: 8px;
}

/* ── Toggle Switch ── */

.tg {
  position: relative;
  display: inline-flex;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.tg input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.tg .sl {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--zinc-700);
  border-radius: 20px;
  transition: background 0.2s ease;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
}

.tg .sl::before {
  content: "";
  position: absolute;
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background: var(--zinc-300);
  border-radius: 50%;
  transition: transform 0.2s ease, background 0.2s ease;
}

.tg input:checked + .sl {
  background: var(--primary);
}

.tg input:checked + .sl::before {
  transform: translateX(16px);
  background: white;
}

/* ── Badges ── */

.bd {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.bd-on {
  background: rgba(16,185,129,0.18);
  color: #6ee7b7;
  box-shadow: 0 0 0 1px rgba(16,185,129,0.15);
}

.bd-off {
  background: rgba(82,82,91,0.2);
  color: var(--zinc-600);
  box-shadow: 0 0 0 1px rgba(63,63,70,0.2);
}

.bd-info {
  background: var(--primary-bg);
  color: var(--primary);
}

.bd-warn {
  background: var(--warning-bg);
  color: var(--warning);
}

.bd-danger {
  background: var(--danger-bg);
  color: var(--danger);
}

/* ── Tags / Model Chips ── */

.tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 0.75rem;
  background: rgba(39,39,42,0.6);
  color: var(--zinc-300);
  border: 1px solid var(--zinc-700);
  cursor: pointer;
  transition: all 0.12s ease;
  font-weight: 500;
}

.tag:hover {
  border-color: var(--primary-border);
  color: var(--zinc-100);
  background: rgba(39,39,42,0.9);
}

.tag i {
  font-size: 0.6rem;
  color: var(--text-muted);
}

.mw {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}

/* ── Hero Bar (Home) ── */

.hero-bar {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  overflow: hidden;
}

.hero-bar-main {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(63,63,70,0.3);
}

.hero-bar-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--primary-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-bar-icon i {
  color: var(--primary);
  font-size: 0.95rem;
}

.hero-bar-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--zinc-100);
}

.hero-bar-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 1px;
}

.hero-bar-spacer {
  flex: 1;
  min-width: 12px;
}

.hero-bar-api {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hero-bar-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(63,63,70,0.4);
  padding: 2px 6px;
  border-radius: 4px;
}

.hero-bar-fmt {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.hero-bar-stats {
  display: flex;
  align-items: stretch;
  gap: 0;
}

.hero-bar-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 14px 12px;
}

.hero-bar-stat-label {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hero-bar-stat-val {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--zinc-100);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.hero-bar-stat-sub {
  font-size: 0.68rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 3px;
}

.hero-bar-stat-divider {
  width: 1px;
  background: rgba(63,63,70,0.3);
  align-self: stretch;
  margin: 10px 0;
}


/* ── Provider Grid (Home) ── */

.g2 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.sg {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* ── Stat Numbers ── */

.n {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
}

/* ── Alert / Message ── */

.al {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  line-height: 1.4;
}

.al-s {
  background: var(--success-bg);
  color: var(--success-text);
  border-color: rgba(16,185,129,0.2);
}

.al-e {
  background: var(--danger-bg);
  color: var(--danger-text);
  border-color: rgba(239,68,68,0.2);
}

.al-i {
  background: var(--primary-bg);
  color: var(--primary);
  border-color: var(--primary-border);
}

/* ── Code Inline ── */

.cd {
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  background: rgba(39,39,42,0.5);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--zinc-300);
  border: 1px solid var(--zinc-700);
}

/* ── Footer ── */

footer {
  display: block;
  margin-top: auto;
  border-top: 1px solid rgba(63,63,70,0.4);
  padding: 16px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.76rem;
}

footer a {
  color: var(--text-light);
  text-decoration: none;
}

footer a:hover {
  color: var(--primary);
}

/* ── Utilities ── */

.tc { text-align: center; }
.hd { display: none !important; }
.cp { cursor: pointer; user-select: none; }
.fw { width: 100%; }
.ov { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.fc {
  display: flex;
  align-items: center;
  gap: 6px;
}

.fx1 { flex: 1; min-width: 0; }
.fx-s0 { flex-shrink: 0; }

.jc-sb { justify-content: space-between; }
.jc-c { justify-content: center; }

.flex-col { display: flex; flex-direction: column; }

.gap-4 { gap: 4px; }
.gap-6 { gap: 6px; }
.gap-8 { gap: 8px; }
.gap-10 { gap: 10px; }

.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 6px; }
.mb-4 { margin-bottom: 4px; }
.mb-10 { margin-bottom: 10px; }
.m-16-0 { margin: 16px 0; }

.fs-1 { font-size: 1rem; }
.fs-xxs { font-size: 0.65rem; }
.fs-xs { font-size: 0.72rem; }
.fs-sm { font-size: 0.8rem; }

.fw-4 { font-weight: 400; }
.fw-6 { font-weight: 600; }
.fw-7 { font-weight: 700; }

.c-p { color: var(--primary); }
.c-muted { color: var(--text-muted); }
.c-s { color: var(--success); }
.c-d { color: var(--danger); }

.va-m { vertical-align: middle; }

.p-14 { padding: 14px; }
.p-10-12 { padding: 10px 12px; }

/* ── Tabs ── */

.tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--zinc-800);
}

.tab-btn {
  padding: 10px 16px;
  font-size: 0.75rem;
  font-weight: 700;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--zinc-300);
}

.tab-btn.active {
  color: var(--zinc-100);
  border-bottom-color: var(--primary);
}

/* ── Login Page ── */

.login-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 56px);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 380px;
  padding: 32px 28px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 14px;
}

.login-card h2 {
  font-size: 1.1rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  color: var(--zinc-100);
}

.login-card h2 i {
  color: var(--primary);
  margin-right: 6px;
}

.login-card .desc {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8rem;
  margin-bottom: 20px;
}

/* ── Admin Hero ── */

.admin-shell {
  padding: 20px 18px 40px !important;
}

.admin-hero {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(400px, 580px);
  gap: 16px;
  align-items: stretch;
  margin-bottom: 16px;
}

.hero-panel {
  min-height: 130px;
  padding: 24px 28px;
  border: 1px solid var(--card-border);
  border-radius: 12px;
  background:
    linear-gradient(135deg, rgba(24,24,27,0.95), rgba(24,24,27,0.88)),
    linear-gradient(90deg, rgba(251,113,133,0.08), rgba(16,185,129,0.04));
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
  background: linear-gradient(90deg, var(--primary), var(--zinc-500), transparent);
}

.eyebrow {
  color: var(--primary);
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-bottom: 8px;
}

.hero-panel h2 {
  font-size: 1.65rem;
  line-height: 1.05;
  margin-bottom: 10px;
  font-weight: 800;
  color: var(--zinc-100);
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.hero-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.hero-meta i {
  color: var(--primary);
  font-size: 0.7rem;
}

.hero-meta code {
  border: 1px solid var(--zinc-700);
  background: rgba(24,24,27,0.6);
  border-radius: 6px;
  padding: 2px 8px;
  color: var(--zinc-300);
  font-size: 0.75rem;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.metric {
  padding: 16px;
  min-height: 130px;
  border-radius: 10px;
  background: rgba(24,24,27,0.7);
  border: 1px solid var(--card-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: border-color 0.15s ease;
}

.metric:hover {
  border-color: var(--card-border-hover);
}

.metric i {
  color: var(--primary);
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--primary-bg);
  font-size: 0.75rem;
}

.metric strong {
  font-size: 1.6rem;
  line-height: 1;
  color: var(--zinc-100);
  font-variant-numeric: tabular-nums;
}

.metric span {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* ── Provider Board ── */

.provider-board {
  padding: 0;
  overflow: hidden;
  border-radius: 12px;
}

.provider-board > .card-hd {
  background: rgba(24,24,27,0.7);
}

.board-actions {
  display: flex;
  gap: 6px;
}

/* ── Provider Item (Accordion) ── */



.ps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  background: rgba(24,24,27,0.5);
  border-left: 3px solid transparent;
  transition: background 0.12s ease, border-color 0.12s ease;
}

.ps:hover {
  background: rgba(24,24,27,0.8);
}

.pi:has(.pd.open) .ps {
  border-left-color: var(--primary);
  background: rgba(24,24,27,0.85);
}

.ps .l {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.ps .l > i:first-child {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(39,39,42,0.6);
  color: var(--text-muted);
  font-size: 0.75rem;
  flex-shrink: 0;
}

.provider-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.provider-name {
  font-size: 0.88rem !important;
  font-weight: 700 !important;
  color: var(--zinc-100);
}

.provider-metrics {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 700;
}

.provider-metrics span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(39,39,42,0.5);
  color: var(--text-light);
}

.ps .l .pu {
  margin-top: 2px;
  font-size: 0.74rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 320px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ps .l .pu i.cp {
  font-size: 0.68rem;
  cursor: pointer;
  color: var(--text-muted);
  padding: 1px;
}

.ps .l .pu i.cp:hover {
  color: var(--primary);
}

.pd {
  padding: 16px;
  display: none;
  border-top: 1px solid rgba(63,63,70,0.35);
  background: var(--card-bg);
}

.pd.open {
  display: grid;
  gap: 14px;
}

.pd .fr {
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.pd .fr3 {
  grid-template-columns: 1fr 1fr 70px;
  gap: 10px;
}

/* ── Key / Model rows inside provider ── */

.pd [data-kidx],
.pd [data-idx],
#akeys .fc,
#amodels .fc {
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(9,9,11,0.4);
  border: 1px solid rgba(63,63,70,0.3);
}

.pd [data-kidx] input,
.pd [data-idx] input,
#akeys input,
#amodels input {
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.78rem;
}

/* ── Proxy Key List ── */

/* ── Proxy Key Header Row ── */

.proxy-key-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  margin-bottom: 2px;
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid rgba(63,63,70,0.25);
}

.proxy-key-header-key { flex: 1; min-width: 0; }
.proxy-key-header-name { width: 80px; text-align: center; }
.proxy-key-header-status { width: 72px; text-align: center; }
.proxy-key-header-toggle { width: 50px; text-align: right; }
.proxy-key-header-del { width: 36px; text-align: right; }

.ki-name {
  width: 80px;
  text-align: center;
  font-size: 0.76rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ki-status {
  width: 72px;
  display: flex;
  justify-content: center;
}

.ki-toggle {
  width: 50px;
  display: flex;
  justify-content: flex-end;
}

.ki-del {
  width: 36px;
  display: flex;
  justify-content: flex-end;
}


.ki {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(63,63,70,0.3);
  flex-wrap: wrap;
}

.ki:last-child {
  border-bottom: none;
}

.ki .kv {
  min-width: 0;
  flex: 1 1 50%;
}

.kv {
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: var(--zinc-300);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.kv i.cp {
  font-size: 0.7rem;
  cursor: pointer;
  color: var(--text-muted);
}

.kv i.cp:hover {
  color: var(--primary);
}

/* ── Add Form Panel ── */

.add-form-panel {
  padding: 16px;
  background: rgba(24,24,27,0.5);
  border-radius: 10px;
  border: 1px dashed var(--zinc-700);
}

.mdl-list-panel {
  flex: 1;
  padding: 16px;
  background: rgba(24,24,27,0.5);
  border-radius: 10px;
  border: 1px dashed var(--zinc-700);
  max-height: 420px;
  overflow-y: auto;
}

.add-form-wrap {
  display: grid !important;
  grid-template-columns: minmax(340px, 1fr) minmax(280px, 0.8fr);
  gap: 12px !important;
  padding: 16px 18px 0;
  margin-bottom: 0 !important;
}

.add-form-panel,
.mdl-list-panel {
  width: auto;
}

/* ── GP (Provider Grid in Admin) ── */

.pg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 18px 20px 20px;
}

.pi {
  border: 1px solid var(--card-border);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  background: var(--card-bg);
}

.pi:hover {
  border-color: rgba(251,113,133,0.12);
  transform: translateY(-1px);
}

/* ── Model Discovery Panel ── */

.mdl-item {
  padding: 5px 8px;
  border: 1px solid var(--zinc-700);
  border-radius: 6px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(9,9,11,0.3);
}

.mdl-item i:first-child {
  color: var(--text-muted);
  width: 14px;
  flex-shrink: 0;
}

.mdl-add-btn {
  flex-shrink: 0;
  padding: 1px 5px;
  font-size: 0.9rem;
  line-height: 1;
}

.grid-2-gap6 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

/* ── Modal ── */

.modal-o {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  box-shadow: 0 25px 60px rgba(0,0,0,0.5);
  width: 90%;
  max-width: 400px;
  padding: 24px;
  animation: mi 0.15s ease;
}

.modal h3 {
  font-size: 0.92rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--zinc-100);
}

.modal h3 i {
  margin-right: 6px;
}

.modal p {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-bottom: 14px;
}

.modal .fa {
  margin-top: 14px;
  margin-bottom: 0;
}

.modal select {
  margin-bottom: 8px;
}

@keyframes mi {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* ── Key Display ── */

.mk {
  background: rgba(9,9,11,0.6);
  border: 1px solid var(--zinc-700);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  word-break: break-all;
  user-select: all;
  margin: 6px 0;
  color: var(--emerald-400);
}

/* ── Toast ── */

.toast {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 9998;
  min-width: 260px;
  max-width: 400px;
  animation: ti 0.2s ease;
}

@keyframes ti {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Health Section ── */

.health-section {
  border-radius: 8px;
  background: rgba(9,9,11,0.3);
  border: 1px solid var(--zinc-800);
  overflow: hidden;
  padding: 10px 12px;
}

/* ── Copy Icon ── */

.copy-icon {
  font-size: 0.65rem;
  color: var(--text-muted);
}

/* ── Responsive ── */

@media (max-width: 980px) {
  .admin-hero {
    grid-template-columns: 1fr;
  }
  .add-form-wrap {
    grid-template-columns: 1fr;
  }
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .pg {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero-bar-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 14px 16px;
  }
  .hero-bar-api {
    width: 100%;
  }
  .hero-bar-stats {
    flex-direction: row;
  }
  .sg {
    flex-direction: column;
  }
  .g2 {
    grid-template-columns: 1fr;
  }
  .admin-shell {
    padding: 12px !important;
  }
  .hero-panel h2 {
    font-size: 1.3rem;
  }
  .metric-grid {
    grid-template-columns: 1fr 1fr;
  }
  .metric {
    min-height: 100px;
    padding: 12px;
  }
  .pg {
    grid-template-columns: 1fr;
    padding: 12px;
  }
  .ps {
    align-items: flex-start;
    gap: 10px;
  }
  .ps .l .pu {
    max-width: 200px;
  }
  .ki {
    flex-wrap: wrap;
  }
  .ki > div:first-child {
    flex: 1 1 100%;
    overflow: hidden;
  }
  .ki > .fc {
    margin-top: 4px;
  }
  .fr,
  .fr3,
  .pd .fr,
  .pd .fr3 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .hero-bar-stat-val {
    font-size: 1.1rem;
  }
  .hero-bar-stat {
    padding: 10px 8px;
  }
  .proxy-key-header-name,
  .ki-name {
    display: none;
  }
  .proxy-key-header-status,
  .ki-status {
    display: none;
  }
  .ct {
    padding: 0 12px;
  }
  hd .ct {
    padding: 0 12px;
    height: 50px;
  }
  hd h1 {
    font-size: 0.9rem;
  }
  hd h1 .subtitle {
    display: none;
  }
  .admin-hero {
    gap: 10px;
  }
  .hero-panel {
    padding: 16px 18px;
    min-height: 100px;
  }
  .hero-panel h2 {
    font-size: 1.1rem;
  }
  .metric-grid {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .metric {
    min-height: 80px;
    padding: 10px;
  }
  .metric strong {
    font-size: 1.2rem;
  }
  .btn {
    padding: 4px 10px;
    font-size: 0.72rem;
    min-height: 28px;
  }
  .card {
    padding: 14px;
  }
}
`;
