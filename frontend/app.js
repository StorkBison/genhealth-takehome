// GenHealth Order Intake: plain-JS single-page app talking to the FastAPI backend on the same origin.
(function () {
  'use strict';

  // =====================================================================
  // Icons (inline stroke SVG)
  // =====================================================================
  const ICONS = {
    home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5'],
    list: ['M9 6h11', 'M9 12h11', 'M9 18h11', { circle: [4.5, 6, 1] }, { circle: [4.5, 12, 1] }, { circle: [4.5, 18, 1] }],
    bars: ['M5 20v-6', 'M10 20V9', 'M15 20v-9', 'M20 20V5', 'M3 20h18'],
    upload: ['M12 15V3', 'M7 8l5-5 5 5', 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2'],
    download: ['M12 3v12', 'm7 10 5 5 5-5', 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2'],
    cloudUp: ['M12 13v8', 'm8 17 4-4 4 4', 'M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3'],
    settings: ['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', { circle: [12, 12, 3] }],
    search: [{ circle: [11, 11, 7] }, 'm20 20-3.5-3.5'],
    calendar: [{ rect: [3, 5, 18, 16, 2] }, 'M16 3v4', 'M8 3v4', 'M3 10h18'],
    chevDown: ['m6 9 6 6 6-6'], chevLeft: ['m15 18-6-6 6-6'], chevRight: ['m9 18 6-6-6-6'],
    arrowUp: ['M12 19V5', 'm5 12 7-7 7 7'], arrowDown: ['M12 5v14', 'm19 12-7 7-7-7'],
    arrowRight: ['M5 12h14', 'm12 5 7 7-7 7'], arrowLeft: ['M19 12H5', 'm12 19-7-7 7-7'],
    dots: [{ circle: [5, 12, 1] }, { circle: [12, 12, 1] }, { circle: [19, 12, 1] }],
    file: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5', 'M9 13h6', 'M9 17h4'],
    checkCircle: [{ circle: [12, 12, 9] }, 'm8.5 12 2.5 2.5 4.5-5'],
    alert: ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'],
    clock: [{ circle: [12, 12, 9] }, 'M12 7v5l3 2'],
    loader: ['M21 12a9 9 0 1 1-6.2-8.56'],
    plus: ['M12 5v14', 'M5 12h14'],
    check: ['M20 6 9 17l-5-5'],
    mail: [{ rect: [3, 5, 18, 14, 2] }, 'm3 7 9 6 9-6'],
    lock: [{ rect: [4, 11, 16, 10, 2] }, 'M8 11V7a4 4 0 0 1 8 0v4', 'M12 15v2'],
    eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', { circle: [12, 12, 3] }],
    eyeOff: ['M3 3l18 18', 'M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2', 'M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 5.4-1.4', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
    user: [{ circle: [12, 8, 4] }, 'M4 21a8 8 0 0 1 16 0'],
    steth: ['M6 3H5v6a5 5 0 0 0 10 0V3h-1', 'M10 14v1a5 5 0 0 0 10 0v-3', { circle: [20, 10, 2] }],
    xCircle: [{ circle: [12, 12, 9] }, 'm15 9-6 6', 'm9 9 6 6'],
    refresh: ['M3 12a9 9 0 0 1 15.5-6.3L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15.5 6.3L3 16', 'M3 21v-5h5'],
    trash: ['M3 6h18', 'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2', 'M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14'],
    logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
    code: ['m16 18 6-6-6-6', 'm8 6-6 6 6 6'],
    help: [{ circle: [12, 12, 9.5] }, 'M9.2 9.2a3 3 0 0 1 5.8 1c0 2-3 2.6-3 4.3', 'M12 17.6h.01'],
    bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.9 1.9 0 0 0 3.4 0'],
  };
  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs = {}) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
    return n;
  }
  function icon(name, size = 20, cls = '') {
    const svg = svgEl('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: ('ic ' + cls).trim() });
    for (const part of ICONS[name] || []) {
      if (typeof part === 'string') svg.append(svgEl('path', { d: part }));
      else if (part.circle) svg.append(svgEl('circle', { cx: part.circle[0], cy: part.circle[1], r: part.circle[2] }));
      else if (part.rect) svg.append(svgEl('rect', { x: part.rect[0], y: part.rect[1], width: part.rect[2], height: part.rect[3], rx: part.rect[4] }));
    }
    return svg;
  }
  function hydrateIcons(root = document) {
    root.querySelectorAll('i[data-icon]').forEach((n) => {
      const svg = icon(n.dataset.icon, Number(n.dataset.size) || 20, n.className);
      if (n.getAttribute('style')) svg.setAttribute('style', n.getAttribute('style'));
      n.replaceWith(svg);
    });
  }

  // "Health equity is the North Star" with a sparkle and a hand-drawn underline
  function hydrateNorthStar() {
    document.querySelectorAll('[data-northstar]').forEach((p) => {
      const spark = svgEl('svg', { class: 'spark', width: 34, height: 34, viewBox: '0 0 34 34', 'aria-hidden': 'true' });
      spark.append(svgEl('path', { d: 'M15 4c.8 6.4 3.6 10 10.5 11.4C18.6 16.8 15.8 20.4 15 27c-.8-6.6-3.6-10.2-10.5-11.6C11.4 14 14.2 10.4 15 4z', fill: 'currentColor' }));
      for (const d of ['M3.5 5.5l2.5 2.5', 'M27 4l-2 3.2']) spark.append(svgEl('path', { d, stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
      const swoosh = svgEl('svg', { class: 'swoosh', viewBox: '0 0 200 12', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      swoosh.append(svgEl('path', { d: 'M3 9C60 2.5 140 2.5 197 7', fill: 'none', stroke: 'currentColor', 'stroke-width': 4, 'stroke-linecap': 'round' }));
      const txt = el('span', { class: 'txt' }, 'Health equity is the North Star' + ('period' in p.dataset ? '.' : ''));
      txt.append(swoosh);
      p.replaceChildren(...('nospark' in p.dataset ? [] : [spark]), txt);
    });
  }

  // Decorative clipboard + heart illustration (static markup, no user data)
  const ILLUS = `<svg class="illus" viewBox="0 0 420 400" aria-hidden="true">
  <path d="M48 214c-26-74 26-150 116-160 72-8 118 42 168 32 62-12 96 62 74 132-20 66-84 108-164 112-92 6-166-40-194-116z" fill="#E6DFFB"/>
  <g transform="rotate(-7 200 220)">
    <rect x="95" y="82" width="214" height="272" rx="24" fill="#FFFFFF" stroke="#5B34D6" stroke-width="10"/>
    <rect x="158" y="62" width="88" height="40" rx="13" fill="#5B34D6"/>
    <circle cx="202" cy="60" r="16" fill="#5B34D6"/><circle cx="202" cy="60" r="6.5" fill="#FFFFFF"/>
    <rect x="125" y="122" width="64" height="60" rx="11" fill="#8E6FF0"/>
    <path d="M157 136v32M141 152h32" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
    <rect x="207" y="132" width="74" height="10" rx="5" fill="#C9BBF8"/><rect x="207" y="156" width="58" height="10" rx="5" fill="#C9BBF8"/>
    <rect x="125" y="208" width="36" height="36" rx="8" fill="#5B34D6"/><path d="M133 226l7 7 13-15" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="177" y="214" width="102" height="10" rx="5" fill="#C9BBF8"/><rect x="177" y="233" width="74" height="10" rx="5" fill="#C9BBF8"/>
    <rect x="125" y="270" width="36" height="36" rx="8" fill="#5B34D6"/><path d="M133 288l7 7 13-15" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="177" y="276" width="82" height="10" rx="5" fill="#C9BBF8"/><rect x="177" y="295" width="58" height="10" rx="5" fill="#C9BBF8"/>
  </g>
  <path d="M302 378c-44-28-76-56-76-90 0-22 16-38 37-38 16 0 30 9 39 23 9-14 23-23 39-23 21 0 37 16 37 38 0 34-32 62-76 90z" fill="#6D4AE6" stroke="#FFFFFF" stroke-width="9" stroke-linejoin="round"/>
  <path d="M248 300h24l10-19 15 36 13-27 8 10h32" stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M322 30l-8 20M346 54l-17 11M352 86l-20 2" stroke="#7C5CF0" stroke-width="7" stroke-linecap="round"/>
</svg>`;

  // =====================================================================
  // Helpers
  // =====================================================================
  const $ = (id) => document.getElementById(id);
  function el(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid);
    return n;
  }
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const TOKEN_KEY = 'gh_token';
  let memToken = null;
  const store = {
    get() { try { return localStorage.getItem(TOKEN_KEY) || memToken; } catch { return memToken; } },
    set(t) { memToken = t; try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } },
  };

  let toastTimer;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
  }

  // Display status: what a person needs to know, derived from stored status + flags
  const DISP = {
    processed: { label: 'Processed', icon: 'check' },
    in_review: { label: 'In Review', icon: 'loader' },
    processing: { label: 'Processing', icon: 'loader' },
    attention: { label: 'Needs Attention', icon: 'alert' },
    draft: { label: 'Draft', icon: 'file' },
    failed: { label: 'Failed', icon: 'xCircle' },
  };
  function disp(o) {
    if (o.status === 'ready') return 'processed';
    if (o.status === 'processing') return 'processing';
    if (o.status === 'failed') return 'failed';
    if (o.needs_attention) return 'attention';
    if (o.status === 'draft') return 'draft';
    return 'in_review';
  }
  const pill = (key, lg) => el('span', { class: 'pill st-' + key + (lg ? ' lg' : '') }, icon(DISP[key].icon, lg ? 18 : 14), DISP[key].label);

  const fmtDob = (iso) => { if (!iso) return null; const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
  const parseTs = (s) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + 'Z'); // server times are UTC
  const fmtDay = (s) => parseTs(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtDateTime = (s) => parseTs(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const fmtShort = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtSize = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const patientName = (o) => [o.patient_first_name, o.patient_last_name].filter(Boolean).join(' ');
  const sourceLabel = (o) => !o.source_filename ? 'Manual' : (o.document_type || '').startsWith('image/') ? 'Image' : 'PDF';

  function identity(email) {
    const local = (email || '').split('@')[0];
    const parts = local.split(/[._\-+0-9]+/).filter(Boolean);
    const name = parts.length ? parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : email;
    const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || local).slice(0, 2)).toUpperCase();
    return { name, initials };
  }

  // =====================================================================
  // API
  // =====================================================================
  class ApiError extends Error {
    constructor(status, detail) {
      super(typeof detail === 'string' ? detail : (detail && detail.message) || 'Request failed');
      this.status = status; this.detail = detail;
    }
  }
  async function api(path, { method = 'GET', json, form, body, raw } = {}) {
    const headers = {};
    const token = store.get();
    if (token) headers.Authorization = 'Bearer ' + token;
    if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
    if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(form).toString(); }
    let res;
    try { res = await fetch(path, { method, headers, body }); }
    catch { throw new ApiError(0, 'Could not reach the server. Check your connection and try again.'); }
    if (res.status === 401 && path !== '/auth/token') { signOut('Your session expired. Please sign in again.'); throw new ApiError(401, 'Signed out'); }
    if (raw && res.ok) return res;
    if (res.status === 204) return null;
    let data = null;
    try { data = await res.json(); } catch { /* empty or non-JSON */ }
    if (!res.ok) throw new ApiError(res.status, data && data.detail !== undefined ? data.detail : res.statusText);
    return data;
  }
  function validationFields(detail) {
    const out = {};
    if (Array.isArray(detail)) for (const d of detail) {
      const f = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
      if (f) out[f] = String(d.msg || 'Invalid value').replace(/^Value error, /, '');
    }
    return out;
  }

  // =====================================================================
  // Router
  // =====================================================================
  let me = null;
  let pollTimer = null;
  let routeSeq = 0;
  const VIEWS = ['dashboard', 'intake', 'orders', 'review', 'reports', 'settings'];
  const stopPoll = () => { clearTimeout(pollTimer); pollTimer = null; };
  const go = (hash) => { if (location.hash !== hash) location.hash = hash; else route(); };

  function showAuth(which) {
    $('shell').hidden = true;
    $('v-signin').hidden = which !== 'signin';
    $('v-signup').hidden = which !== 'signup';
    document.title = (which === 'signin' ? 'Sign In' : 'Create Account') + ' · GenHealth';
  }
  function showView(name, navKey, title) {
    $('v-signin').hidden = true; $('v-signup').hidden = true; $('shell').hidden = false;
    for (const v of VIEWS) $('v-' + v).hidden = v !== name;
    document.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = title + ' · GenHealth';
    closeMenus();
    window.scrollTo(0, 0);
  }

  async function route() {
    stopPoll();
    const seq = ++routeSeq;
    const [path, query] = (location.hash.slice(1) || '/dashboard').split('?');
    const params = new URLSearchParams(query || '');
    if (!store.get()) { showAuth(path === '/signup' ? 'signup' : 'signin'); return; }
    if (!me) {
      try { await loadMe(); }
      catch (err) { if (err.status !== 401) toast(err.message); return; }
    }
    if (seq !== routeSeq) return;
    refreshBell();
    let m;
    if (['/signin', '/signup', '/', '/dashboard'].includes(path)) return openDashboard(seq);
    if (path === '/intake' || path === '/upload') return openIntake();
    if (path === '/orders') return openOrders(params);
    if (path === '/reports') return openReports(seq);
    if (path === '/settings') return openSettings();
    if (path === '/new') return openReview(null, seq);
    if ((m = path.match(/^\/orders\/(\d+)$/))) return openReview(Number(m[1]), seq);
    go('#/dashboard');
  }
  window.addEventListener('hashchange', route);

  // =====================================================================
  // Auth
  // =====================================================================
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const strong = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);

  function setErr(prefix, field, msg) {
    const f = $(`${prefix}-${field}-f`), e = $(`${prefix}-${field}-e`), i = $(`${prefix}-${field}`);
    f.classList.toggle('invalid', !!msg); e.hidden = !msg; e.textContent = msg || '';
    if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid');
  }
  function formError(id, msg) { $(id).textContent = msg || ''; $(id).hidden = !msg; }
  function busy(btn, on, label) { btn.disabled = on; if (label) btn.textContent = label; }

  document.querySelectorAll('[data-reveal]').forEach((b) => b.addEventListener('click', () => {
    const input = $(b.dataset.reveal);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    b.replaceChildren(icon(show ? 'eyeOff' : 'eye', 22));
  }));
  $('forgot').addEventListener('click', () => { $('forgot-note').hidden = !$('forgot-note').hidden; });

  async function login(email, password) {
    const tok = await api('/auth/token', { method: 'POST', form: { username: email, password } });
    store.set(tok.access_token);
    me = null;
    await loadMe();
  }

  $('f-signin').addEventListener('submit', async (e) => {
    e.preventDefault();
    formError('si-err', null);
    const email = $('si-email').value.trim(), pw = $('si-pw').value;
    setErr('si', 'email', !email ? 'Enter your email.' : !EMAIL_RE.test(email) ? 'Enter a valid email address.' : null);
    setErr('si', 'pw', !pw ? 'Enter your password.' : null);
    const bad = document.querySelector('#f-signin [aria-invalid="true"]');
    if (bad) { bad.focus(); return; }
    const btn = $('si-btn'); busy(btn, true, 'Signing in…');
    try {
      await login(email, pw);
      $('si-pw').value = '';
      go('#/dashboard');
    } catch (err) {
      if (err.status === 401) { formError('si-err', 'Incorrect email or password.'); $('si-pw').select(); }
      else formError('si-err', err.message);
    } finally { busy(btn, false, 'Sign In'); }
  });

  $('su-pw').addEventListener('input', () => $('su-rule').classList.toggle('ok', strong($('su-pw').value)));
  $('f-signup').addEventListener('submit', async (e) => {
    e.preventDefault();
    formError('su-err', null);
    const email = $('su-email').value.trim(), pw = $('su-pw').value, pw2 = $('su-pw2').value;
    setErr('su', 'email', !email ? 'Enter your email.' : !EMAIL_RE.test(email) ? 'Enter a valid email address.' : null);
    setErr('su', 'pw', !pw ? 'Create a password.' : pw.length > 128 ? 'Use at most 128 characters.' : !strong(pw) ? 'Use at least 8 characters with a letter, number, and symbol.' : null);
    setErr('su', 'pw2', !pw2 ? 'Confirm your password.' : pw2 !== pw ? 'Passwords do not match.' : null);
    const bad = document.querySelector('#f-signup [aria-invalid="true"]');
    if (bad) { bad.focus(); return; }
    const btn = $('su-btn'); busy(btn, true, 'Creating account…');
    try {
      await api('/auth/register', { method: 'POST', json: { email, password: pw } });
      await login(email, pw);
      $('su-pw').value = ''; $('su-pw2').value = '';
      toast('Welcome to GenHealth! Your account is ready.');
      go('#/dashboard');
    } catch (err) {
      if (err.status === 409) formError('su-err', 'An account with this email already exists. Sign in instead.');
      else if (err.status === 422) {
        const f = validationFields(err.detail);
        if (f.email) setErr('su', 'email', 'Enter a valid email address.');
        if (f.password) setErr('su', 'pw', f.password);
        if (!f.email && !f.password) formError('su-err', 'Please check your details and try again.');
      } else formError('su-err', err.message);
    } finally { busy(btn, false, 'Create Account'); }
  });

  async function loadMe() {
    me = await api('/auth/me');
    const { name, initials } = identity(me.email);
    $('uAvatar').textContent = initials; $('uName').textContent = name; $('uEmail').textContent = me.email;
  }

  function signOut(message) {
    store.set(null); me = null; stopPoll();
    formError('si-err', message || null);
    if (location.hash !== '#/signin') location.hash = '#/signin'; else route();
  }
  $('signOut').addEventListener('click', () => signOut());
  $('set-signout').addEventListener('click', () => signOut());

  // ---------- menus (account, notifications, row actions) ----------
  function closeMenus(except) {
    document.querySelectorAll('.menu').forEach((m) => { if (m !== except) m.hidden = true; });
    $('userBtn').setAttribute('aria-expanded', String(except === $('userMenu')));
    $('bellBtn').setAttribute('aria-expanded', String(except === $('bellMenu')));
  }
  function toggleMenu(menu) { const open = menu.hidden; closeMenus(open ? menu : null); menu.hidden = !open; }
  $('userBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu($('userMenu')); });
  $('bellBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu($('bellMenu')); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) closeMenus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

  // Notifications: orders a person must act on
  async function refreshBell() {
    try {
      const [review, failed, draft] = await Promise.all([
        api('/orders?status=needs_review&limit=50'), api('/orders?status=failed&limit=20'), api('/orders?status=draft&limit=50'),
      ]);
      const items = [...failed.items, ...review.items, ...draft.items].filter((o) => o.needs_attention)
        .sort((a, b) => b.id - a.id);
      $('bellDot').hidden = items.length === 0;
      $('bellBtn').setAttribute('aria-label', items.length ? `Notifications: ${items.length} order${items.length === 1 ? '' : 's'} need attention` : 'Notifications');
      const menu = $('bellMenu');
      menu.replaceChildren(el('div', { class: 'mhead' }, el('b', { text: 'Needs attention' }), el('span', { text: items.length ? `${items.length} order${items.length === 1 ? '' : 's'} waiting for you` : 'You’re all caught up' })));
      if (!items.length) menu.append(el('div', { class: 'empty', text: 'No orders need attention.' }));
      for (const o of items.slice(0, 6)) {
        menu.append(el('a', { href: '#/orders/' + o.id, role: 'menuitem' }, icon(o.status === 'failed' ? 'xCircle' : 'alert', 16),
          el('span', { class: 'ntitle' }, `${o.order_number} · ${patientName(o) || o.source_filename || 'Unnamed'}`,
            el('span', { text: o.status === 'failed' ? 'Extraction failed' : `${o.missing_fields.length || Object.keys(o.issues).length} field(s) to fix` }))));
      }
    } catch { /* non-critical */ }
  }

  // =====================================================================
  // Dashboard
  // =====================================================================
  function change(cur, prev, upIsGood) {
    if (prev === 0) return el('span', { class: 'chg flat' }, cur === 0 ? '0%' : 'New');
    const pct = Math.round(((cur - prev) / prev) * 100);
    if (pct === 0) return el('span', { class: 'chg flat' }, '0%');
    const good = (pct > 0) === upIsGood;
    return el('span', { class: 'chg ' + (good ? 'good' : 'bad') }, icon(pct > 0 ? 'arrowUp' : 'arrowDown', 14), (pct > 0 ? '+' : '') + pct + '%');
  }

  function renderKpis(container, s, onPick) {
    const cards = [
      { key: '', cls: 'k-total', ic: 'file', label: 'Total Orders', cur: s.current.total, prev: s.previous.total, up: true },
      { key: 'ready', cls: 'k-processed', ic: 'checkCircle', label: 'Processed', cur: s.current.processed, prev: s.previous.processed, up: true },
      { key: 'needs_review', cls: 'k-review', ic: 'clock', label: 'In Review', cur: s.current.in_review, prev: s.previous.in_review, up: false },
      { key: 'needs_review', cls: 'k-attention', ic: 'alert', label: 'Needs Attention', cur: s.current.needs_attention, prev: s.previous.needs_attention, up: false },
    ];
    container.replaceChildren(...cards.map((c) => el('button', { type: 'button', class: 'kpi ' + c.cls, onclick: () => onPick(c.key) },
      el('span', { class: 'ico' }, icon(c.ic, 36)),
      el('span', {},
        el('span', { class: 'lbl', text: c.label }),
        el('span', { class: 'num', text: c.cur.toLocaleString() }),
        el('span', { class: 'delta' }, change(c.cur, c.prev, c.up), `vs. prior ${s.days} days`)))));
  }

  async function openDashboard(seq) {
    if (location.hash !== '#/dashboard') history.replaceState(null, '', '#/dashboard');
    showView('dashboard', 'dashboard', 'Dashboard');
    const days = $('dash-days').value;
    try {
      const [stats, recent] = await Promise.all([api('/orders/stats?days=' + days), api('/orders?limit=5')]);
      if (seq !== routeSeq) return;
      renderKpis($('dash-kpis'), stats, (k) => { ostate.status = k; ostate.page = 1; ostate.days = days; go('#/orders'); });
      renderTrend(stats);
      renderDonut(stats);
      renderRecent(recent.items);
      if (recent.items.some((o) => o.status === 'processing')) pollTimer = setTimeout(() => seq === routeSeq && openDashboard(seq), 4000);
    } catch (err) { if (err.status !== 401) toast(err.message); }
  }
  $('dash-days').addEventListener('change', () => openDashboard(routeSeq));

  function renderRecent(items) {
    $('dash-empty').hidden = items.length > 0;
    if (!items.length) $('dash-empty').replaceChildren(icon('file', 32), el('b', { text: 'No orders yet' }), el('span', { text: 'Upload a faxed or scanned order to get started.' }), el('a', { class: 'btn btn-primary', href: '#/intake' }, icon('upload', 18), 'Upload Order'));
    $('dash-recent').replaceChildren(...items.map((o) => el('tr', { class: 'row', onclick: () => go('#/orders/' + o.id) },
      el('td', { class: 'oid' }, el('a', { href: '#/orders/' + o.id, text: o.order_number })),
      el('td', {}, patientName(o) || el('span', { class: 'missing', text: o.status === 'processing' ? 'Extracting…' : 'Name missing' })),
      el('td', { text: sourceLabel(o) }),
      el('td', {}, o.provider_name || el('span', { class: 'missing', text: '—' }), o.provider_npi ? el('span', { class: 'l2', text: ` (NPI: ${o.provider_npi})` }) : null),
      el('td', {}, pill(disp(o))),
      el('td', { style: 'white-space:nowrap', text: fmtDateTime(o.created_at) }))));
  }

  // ---------- Order Trends: single-series area chart with crosshair tooltip ----------
  function niceMax(v) { if (v <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p; return 10 * p; }
  function renderTrend(stats) {
    const box = $('trend');
    const data = stats.daily;
    const W = 680, H = 270, L = 40, R = 14, T = 14, B = 30;
    const iw = W - L - R, ih = H - T - B;
    const max = niceMax(Math.max(...data.map((d) => d.count), 1));
    const x = (i) => L + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
    const y = (v) => T + ih - (v / max) * ih;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: 'trendFill', x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.append(svgEl('stop', { offset: '0%', 'stop-color': '#7C5CF0', 'stop-opacity': 0.28 }), svgEl('stop', { offset: '100%', 'stop-color': '#7C5CF0', 'stop-opacity': 0.02 }));
    defs.append(grad); svg.append(defs);
    const grid = svgEl('g', { class: 'grid' }), axis = svgEl('g', { class: 'axis' });
    for (let i = 0; i <= 5; i++) {
      const v = (max / 5) * i, yy = y(v);
      grid.append(svgEl('line', { x1: L, x2: W - R, y1: yy, y2: yy }));
      const t = svgEl('text', { x: L - 10, y: yy + 4, 'text-anchor': 'end' }); t.textContent = Number.isInteger(v) ? v : v.toFixed(1); axis.append(t);
    }
    const ticks = Math.min(data.length, 11);
    const tickIdx = [...new Set(Array.from({ length: ticks }, (_, k) => Math.round((k * (data.length - 1)) / Math.max(1, ticks - 1))))];
    for (const i of tickIdx) { const t = svgEl('text', { x: x(i), y: H - 8, 'text-anchor': 'middle' }); t.textContent = fmtShort(data[i].date); axis.append(t); }
    svg.append(grid, axis);
    // Smooth curve (cardinal spline, control points clamped to the plot so it never dips below zero)
    const pts = data.map((d, i) => [x(i), y(d.count)]);
    const clampY = (v) => Math.min(T + ih, Math.max(T, v));
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, k = 0.18;
      d += ` C${p1[0] + (p2[0] - p0[0]) * k},${clampY(p1[1] + (p2[1] - p0[1]) * k)} ${p2[0] - (p3[0] - p1[0]) * k},${clampY(p2[1] - (p3[1] - p1[1]) * k)} ${p2[0]},${p2[1]}`;
    }
    svg.append(svgEl('path', { d: `${d} L${pts[pts.length - 1][0]},${T + ih} L${pts[0][0]},${T + ih} Z`, fill: 'url(#trendFill)' }));
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#6D4AE6', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    for (const i of tickIdx) svg.append(svgEl('circle', { cx: pts[i][0], cy: pts[i][1], r: 4.5, fill: '#6D4AE6', stroke: '#fff', 'stroke-width': 2 }));
    const cross = svgEl('line', { y1: T, y2: T + ih, stroke: '#A48CF2', 'stroke-width': 1.5, 'stroke-dasharray': '4 4', visibility: 'hidden' });
    const dot = svgEl('circle', { r: 6, fill: '#6D4AE6', stroke: '#fff', 'stroke-width': 2.5, visibility: 'hidden' });
    const hit = svgEl('rect', { x: L, y: T, width: iw, height: ih, fill: 'transparent' });
    svg.append(cross, dot, hit);
    const tip = el('div', { class: 'tip', hidden: true });
    box.replaceChildren(svg, tip);
    const showAt = (clientX) => {
      const r = svg.getBoundingClientRect();
      const vx = ((clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(data.length - 1, Math.round(((vx - L) / iw) * (data.length - 1))));
      const [px, py] = pts[i];
      cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('visibility', 'visible');
      tip.replaceChildren(el('b', { text: String(data[i].count) }), ` order${data[i].count === 1 ? '' : 's'} · ${fmtShort(data[i].date)}`);
      tip.hidden = false; tip.style.left = (px / W) * r.width + 'px'; tip.style.top = (py / H) * r.height + 'px';
    };
    hit.addEventListener('pointermove', (e) => showAt(e.clientX));
    hit.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); });
    const total = data.reduce((a, b) => a + b.count, 0);
    const peak = data.reduce((a, b) => (b.count > a.count ? b : a), data[0]);
    $('trend-note').textContent = `${total} order${total === 1 ? '' : 's'} created in the last ${stats.days} days${total ? ` · busiest day ${fmtShort(peak.date)} (${peak.count})` : ''}. Daily figures are in Reports.`;
  }

  // ---------- Orders by Status: donut with legend (labels + counts, never color alone) ----------
  function renderDonut(stats) {
    const c = stats.current;
    const segs = [
      { label: 'Processed', n: c.processed, color: '#16A34A' },
      { label: 'In Review', n: c.in_review, color: '#3B82F6' },
      { label: 'Needs Attention', n: c.needs_attention, color: '#F59E0B' },
    ];
    const total = c.total;
    const S = 200, cx = 100, cy = 100, r = 78, sw = 30, circ = 2 * Math.PI * r;
    const svg = svgEl('svg', { viewBox: `0 0 ${S} ${S}`, role: 'img', 'aria-label': `${total} orders: ` + segs.map((s) => `${s.n} ${s.label}`).join(', ') });
    svg.append(svgEl('circle', { cx, cy, r, fill: 'none', stroke: '#EEEBF6', 'stroke-width': sw }));
    const tip = el('div', { class: 'tip', hidden: true });
    let offset = 0;
    const live = segs.filter((s) => s.n > 0);
    const gap = live.length > 1 ? 2 : 0; // 2px surface gap between segments
    for (const s of live) {
      const len = (s.n / total) * circ;
      const arc = svgEl('circle', { cx, cy, r, fill: 'none', stroke: s.color, 'stroke-width': sw, 'stroke-dasharray': `${Math.max(0, len - gap)} ${circ}`, 'stroke-dashoffset': -offset, transform: `rotate(-90 ${cx} ${cy})` });
      arc.addEventListener('pointermove', (e) => {
        const rb = svg.getBoundingClientRect();
        tip.replaceChildren(el('b', { text: s.label }), ` · ${s.n} (${Math.round((s.n / total) * 100)}%)`);
        tip.hidden = false; tip.style.left = e.clientX - rb.left + 'px'; tip.style.top = e.clientY - rb.top + 'px';
      });
      arc.addEventListener('pointerleave', () => { tip.hidden = true; });
      svg.append(arc);
      offset += len;
    }
    const t1 = svgEl('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 800, fill: '#16123A' }); t1.textContent = total.toLocaleString();
    const t2 = svgEl('text', { x: cx, y: cy + 22, 'text-anchor': 'middle', 'font-size': 15, fill: '#2E2A4F' }); t2.textContent = total === 1 ? 'Order' : 'Orders';
    svg.append(t1, t2);
    $('donut').replaceChildren(svg, tip);
    $('donut-legend').replaceChildren(...segs.map((s) => el('li', {},
      el('span', { class: 'sw', style: `background:${s.color}` }), s.label,
      el('span', { class: 'lv', text: total ? Math.round((s.n / total) * 100) + '%' : '0%' }),
      el('span', { class: 'lc', text: String(s.n) }))));
  }

  // =====================================================================
  // Orders list
  // =====================================================================
  const PAGE = 10;
  const ostate = { q: '', status: '', days: '30', page: 1 };

  function openOrders(params) {
    showView('orders', 'orders', 'Orders');
    if (params.has('status')) { ostate.status = params.get('status'); ostate.page = 1; history.replaceState(null, '', '#/orders'); }
    $('ord-q').value = ostate.q; $('ord-status').value = ostate.status; $('ord-days').value = ostate.days;
    loadOrders();
  }

  async function loadOrders() {
    stopPoll();
    const seq = routeSeq;
    const p = new URLSearchParams({ limit: PAGE, offset: (ostate.page - 1) * PAGE });
    if (ostate.q.trim()) p.set('q', ostate.q.trim());
    if (ostate.status) p.set('status', ostate.status);
    if (ostate.days) p.set('days', ostate.days);
    try {
      const list = await api('/orders?' + p);
      if (seq !== routeSeq) return;
      if (list.items.length === 0 && list.total > 0 && ostate.page > 1) { ostate.page = 1; return loadOrders(); }
      renderRows(list);
      if (list.items.some((o) => o.status === 'processing')) pollTimer = setTimeout(() => seq === routeSeq && loadOrders(), 3000);
    } catch (err) { if (err.status !== 401) toast(err.message); }
  }

  function renderRows(list) {
    $('ord-rows').replaceChildren(...list.items.map((o) => {
      const name = patientName(o);
      const missing = (t) => el('span', { class: 'missing', text: t });
      const actions = el('td', { class: 'actions' });
      const menu = el('div', { class: 'menu', role: 'menu', hidden: true },
        el('a', { href: '#/orders/' + o.id, role: 'menuitem' }, icon('file', 16), disp(o) === 'processed' ? 'Open' : 'Review'),
        el('button', { type: 'button', role: 'menuitem', class: 'danger', onclick: (e) => { e.stopPropagation(); deleteOrder(o, loadOrders); } }, icon('trash', 16), 'Delete'));
      actions.append(el('button', { type: 'button', class: 'ghostbtn', 'aria-label': 'Actions for ' + o.order_number, 'aria-haspopup': 'menu',
        onclick: (e) => { e.stopPropagation(); toggleMenu(menu); } }, icon('dots', 18)), menu);
      return el('tr', { class: 'row', onclick: (e) => { if (!e.target.closest('td.actions')) go('#/orders/' + o.id); } },
        el('td', { class: 'oid' }, el('a', { href: '#/orders/' + o.id, text: o.order_number })),
        el('td', {}, el('div', { style: 'font-weight:600' }, name || missing(o.status === 'processing' ? 'Extracting…' : 'Name missing')),
          el('div', { class: 'l2' }, 'DOB: ', o.patient_dob ? fmtDob(o.patient_dob) : missing('missing'))),
        el('td', {}, el('div', { style: 'font-weight:600' }, o.provider_name || missing(o.status === 'processing' ? '—' : 'Provider missing')),
          el('div', { class: 'l2' }, 'NPI: ', o.provider_npi ? el('span', { class: 'mono', text: o.provider_npi }) : missing('missing'))),
        el('td', {}, pill(disp(o))),
        el('td', { style: 'white-space:nowrap', text: fmtDateTime(o.created_at) }),
        actions);
    }));
    const filtered = ostate.q || ostate.status || ostate.days;
    const empty = $('ord-empty');
    empty.hidden = list.items.length > 0;
    if (!list.items.length) {
      empty.replaceChildren(icon(filtered ? 'search' : 'file', 32),
        el('b', { text: filtered ? 'No orders match your filters' : 'No orders yet' }),
        el('span', { text: filtered ? 'Try a different search, status or date range.' : 'Upload a faxed or scanned order to get started.' }),
        filtered
          ? el('button', { type: 'button', class: 'btn btn-outline', onclick: () => { Object.assign(ostate, { q: '', status: '', days: '', page: 1 }); openOrders(new URLSearchParams()); } }, 'Clear filters')
          : el('a', { class: 'btn btn-primary', href: '#/intake' }, icon('plus', 18), 'Upload Order'));
    }
    const from = list.total ? list.offset + 1 : 0, to = list.offset + list.items.length;
    $('ord-showing').textContent = list.total ? `Showing ${from}–${to} of ${list.total} orders` : '';
    const pages = Math.max(1, Math.ceil(list.total / PAGE));
    const pager = $('ord-pager');
    if (pages <= 1) { pager.replaceChildren(); return; }
    const setPage = (n) => { ostate.page = n; loadOrders(); };
    const nums = new Set([1, pages, ostate.page - 1, ostate.page, ostate.page + 1].filter((n) => n >= 1 && n <= pages));
    const items = []; let prev = 0;
    for (const n of [...nums].sort((a, b) => a - b)) {
      if (n - prev > 1) items.push(el('span', { class: 'gap', 'aria-hidden': 'true', text: '…' }));
      items.push(el('button', { type: 'button', class: 'pg', 'aria-current': n === ostate.page ? 'page' : null, 'aria-label': 'Page ' + n, onclick: () => setPage(n) }, String(n)));
      prev = n;
    }
    pager.replaceChildren(
      el('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Previous page', disabled: ostate.page === 1, onclick: () => setPage(ostate.page - 1) }, icon('chevLeft', 16)),
      ...items,
      el('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Next page', disabled: ostate.page === pages, onclick: () => setPage(ostate.page + 1) }, icon('chevRight', 16)));
  }
  $('ord-q').addEventListener('input', debounce(() => { ostate.q = $('ord-q').value; ostate.page = 1; loadOrders(); }, 300));
  $('ord-status').addEventListener('change', () => { ostate.status = $('ord-status').value; ostate.page = 1; loadOrders(); });
  $('ord-days').addEventListener('change', () => { ostate.days = $('ord-days').value; ostate.page = 1; loadOrders(); });

  async function deleteOrder(o, after) {
    closeMenus();
    if (!confirm(`Delete ${o.order_number}? This cannot be undone.`)) return;
    try {
      await api('/orders/' + o.id, { method: 'DELETE' });
      docCache.delete(o.id);
      toast(o.order_number + ' deleted.');
      refreshBell();
      after();
    } catch (err) { if (err.status !== 401) toast(err.message); }
  }

  // =====================================================================
  // Order Intake (upload)
  // =====================================================================
  const uploads = [];
  const ACCEPT = /\.(pdf|png|jpe?g)$/i;

  function openIntake() {
    showView('intake', 'intake', 'Order Intake');
    renderQueue();
    pollUploads();
  }

  function renderQueue() {
    $('up-card').hidden = uploads.length === 0;
    $('up-queue').replaceChildren(...uploads.slice().reverse().map((u) => {
      let right;
      if (u.state === 'uploading') right = el('span', { class: 'pill st-processing' }, icon('loader', 14), 'Uploading');
      else if (u.state === 'error') right = el('span', { class: 'pill st-failed' }, icon('xCircle', 14), 'Not uploaded');
      else right = pill(disp(u.order));
      const action = u.order && u.order.status !== 'processing'
        ? el('a', { class: 'btn btn-soft', href: '#/orders/' + u.order.id, style: 'height:36px' }, disp(u.order) === 'processed' ? 'Open' : 'Review')
        : null;
      return el('li', {},
        el('span', { class: 'fi' }, icon('file', 20)),
        el('span', { class: 'meta' }, el('b', { text: u.name }), el('span', { text: [fmtSize(u.size), u.order && u.order.order_number, u.order && sourceLabel(u.order)].filter(Boolean).join(' · ') })),
        right, action,
        u.error ? el('span', { class: 'msg', text: u.error }) : null,
        u.order && u.order.status === 'failed' && u.order.error_message ? el('span', { class: 'msg', text: u.order.error_message }) : null);
    }));
  }

  async function uploadFiles(files) {
    for (const file of files) {
      const u = { name: file.name, size: file.size, state: 'uploading' };
      uploads.push(u);
      const isImage = /^image\/(png|jpeg)$/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
      if (!ACCEPT.test(file.name) && !/^(application\/pdf|image\/(png|jpeg))$/.test(file.type)) { u.state = 'error'; u.error = 'Use a PDF, PNG or JPEG file.'; renderQueue(); continue; }
      if (file.size > (isImage ? 5 : 20) * 1024 * 1024) { u.state = 'error'; u.error = isImage ? 'Images must be 5 MB or smaller.' : 'PDFs must be 20 MB or smaller.'; renderQueue(); continue; }
      renderQueue();
      try {
        const fd = new FormData(); fd.append('file', file, file.name);
        u.order = await api('/orders/upload', { method: 'POST', body: fd });
        u.state = 'sent';
      } catch (err) {
        u.state = 'error';
        u.error = typeof err.detail === 'string' ? err.detail : err.message;
      }
      renderQueue();
    }
    pollUploads();
  }

  async function pollUploads() {
    stopPoll();
    const pending = uploads.filter((u) => u.order && u.order.status === 'processing');
    if (!pending.length || $('v-intake').hidden) return;
    const seq = routeSeq;
    pollTimer = setTimeout(async () => {
      if (seq !== routeSeq) return;
      await Promise.all(pending.map(async (u) => {
        try {
          const o = await api('/orders/' + u.order.id);
          if (o.status !== 'processing') toast(o.status === 'failed' ? `${u.name}: extraction failed.` : `${u.name} is ready for review.`);
          u.order = o;
        } catch (err) { if (err.status === 404) { u.state = 'error'; u.error = 'This order was deleted.'; u.order = null; } }
      }));
      if (seq !== routeSeq) return;
      renderQueue(); refreshBell(); pollUploads();
    }, 2500);
  }

  const drop = $('drop');
  $('up-file').addEventListener('change', (e) => { const f = [...e.target.files]; e.target.value = ''; uploadFiles(f); });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => uploadFiles([...e.dataTransfer.files]));

  // =====================================================================
  // Review / edit
  // =====================================================================
  const FIELDS = [
    { k: 'patient_first_name', label: 'First Name', grp: 'rv-patient' },
    { k: 'patient_last_name', label: 'Last Name', grp: 'rv-patient' },
    { k: 'patient_dob', label: 'Date of Birth', grp: 'rv-patient', type: 'date' },
    { k: 'provider_name', label: 'Provider Name', grp: 'rv-provider' },
    { k: 'provider_npi', label: 'NPI', grp: 'rv-provider', mono: true, inputmode: 'numeric', placeholder: '10 digits', maxlength: 14 },
  ];
  const LABELS = Object.fromEntries(FIELDS.map((f) => [f.k, f.label]));
  let current = null;

  const issueText = (issue) => issue.startsWith('not extracted: ')
    ? 'Not found in document: ' + issue.slice('not extracted: '.length)
    : issue.charAt(0).toUpperCase() + issue.slice(1) + ' — not saved.';

  async function openReview(id, seq) {
    showView('review', 'orders', id ? 'Review Order' : 'New Order');
    $('rv-err').hidden = true;
    if (id === null) { current = null; renderReview(); return; }
    if (!current || current.id !== id) { $('rv-crumb').textContent = 'Loading…'; $('rv-form').hidden = true; $('rv-processing').hidden = true; $('rv-failed').hidden = true; $('rv-actions').hidden = true; $('rv-status').replaceChildren(); }
    try {
      const o = await api('/orders/' + id);
      if (seq !== routeSeq) return;
      const docChanged = !current || current.id !== o.id;
      const wasProcessing = current && current.id === o.id && current.status === 'processing';
      current = o;
      renderReview(docChanged);
      if (wasProcessing && o.status !== 'processing') { toast(o.status === 'failed' ? 'Extraction failed.' : 'Extraction finished. Please review the fields.'); refreshBell(); }
      if (o.status === 'processing') pollTimer = setTimeout(() => seq === routeSeq && openReview(id, seq), 2500);
    } catch (err) {
      if (err.status === 404) { toast('Order not found.'); go('#/orders'); }
      else if (err.status !== 401) toast(err.message);
    }
  }

  function renderReview(docChanged = true) {
    const o = current;
    const st = o ? o.status : 'draft';
    $('rv-crumb').textContent = o ? o.order_number : 'New Order';
    $('rv-h').textContent = o ? (o.status === 'ready' ? 'Order Details' : 'Review Order') : 'New Order';
    $('rv-sub').textContent = !o ? 'Enter the order details by hand. Every value is checked when you save.'
      : o.source_filename ? `Verify the extracted information before saving. Source: ${o.source_filename}${o.document_pages > 1 ? ` (${o.document_pages} pages)` : ''}.`
        : 'Entered by hand. Verify the information before approving.';
    $('rv-status').replaceChildren(pill(o ? disp(o) : 'draft', true));
    $('rv-processing').hidden = st !== 'processing';
    $('rv-failed').hidden = st !== 'failed';
    if (st === 'failed') $('rv-failed-msg').textContent = o.error_message || 'The document could not be read.';
    $('rv-form').hidden = st === 'processing' || st === 'failed';
    $('rv-actions').hidden = false;
    $('rv-draft').hidden = $('rv-approve').hidden = st === 'processing' || st === 'failed';
    $('rv-delete').hidden = !o;
    $('rv-approve').replaceChildren(icon('check', 18), st === 'ready' ? 'Save Changes' : 'Approve & Save');
    renderFields(o);
    renderNotice(o);
    if (docChanged) setupDoc(o); else renderJson(o);
  }

  function renderFields(o) {
    for (const g of ['rv-patient', 'rv-provider']) $(g).replaceChildren();
    for (const f of FIELDS) {
      const id = 'fld-' + f.k;
      const value = o ? o[f.k] : null;
      const issue = o && o.issues[f.k];
      const isMissing = o && o.source_filename && !value;
      const source = o && o.sources[f.k];
      const input = el('input', {
        class: 'input' + (f.mono ? ' mono' : ''), id, name: f.k, type: f.type || 'text', autocomplete: 'off',
        inputmode: f.inputmode, placeholder: f.placeholder, maxlength: f.maxlength, 'aria-describedby': id + '-note', 'aria-required': 'true',
      });
      input.value = value || '';
      const stIcon = value && !issue ? icon('check', 18, 'st ok') : (issue || isMissing) ? icon('alert', 18, 'st warn') : null;
      let note;
      if (issue) note = el('span', { class: 'note warn', id: id + '-note', text: issueText(issue) });
      else if (isMissing) note = el('span', { class: 'note warn', id: id + '-note', text: 'Not found in the document. Enter it from the source.' });
      else if (source && source !== value) note = el('span', { class: 'note src', id: id + '-note' }, 'Read as ', el('span', { class: 'mono', text: '“' + source + '”' }));
      else note = el('span', { class: 'note', id: id + '-note', hidden: true });
      const row = el('div', { class: 'frow' + (issue || isMissing ? ' flag' : ''), id: id + '-row' },
        el('label', { for: id }, f.label, el('span', { class: 'req', 'aria-hidden': 'true', text: '*' })),
        el('div', { class: 'inwrap' }, input, stIcon), note);
      input.addEventListener('input', () => { row.classList.remove('invalid'); input.removeAttribute('aria-invalid'); const s = row.querySelector('.st'); if (s) s.remove(); });
      $(f.grp).append(row);
    }
  }

  function renderNotice(o) {
    const box = $('rv-notice');
    if (o && o.status === 'ready') {
      box.className = 'notice ok';
      box.replaceChildren(icon('checkCircle', 20), el('div', {}, el('b', { text: 'Approved' }), 'All fields were checked and approved. Saving as draft will require approval again.'));
      return;
    }
    const problems = o ? [...new Set([...Object.keys(o.issues), ...o.missing_fields])] : [];
    const why = (k) => o.issues[k] ? issueText(o.issues[k]) : o.source_filename ? 'missing from the document.' : 'required before approving.';
    box.className = 'notice warn';
    box.replaceChildren(icon('alert', 20), el('div', {}, el('b', { text: 'Please review' }),
      el('ul', {}, problems.length
        ? problems.map((k) => el('li', { text: `${LABELS[k]}: ${why(k)}` }))
        : [el('li', { text: 'Confirm all fields are correct.' }), el('li', { text: 'Update any missing or incorrect information.' })])));
  }

  function collect() {
    const out = {};
    for (const f of FIELDS) {
      const v = $('fld-' + f.k).value.trim();
      const val = v === '' ? null : (f.k === 'provider_npi' ? v.replace(/[\s-]/g, '') : v);
      if (!current || val !== (current[f.k] || null)) out[f.k] = val;
    }
    return out;
  }

  function showFieldErrors(errs) {
    for (const [k, msg] of Object.entries(errs)) {
      const row = $('fld-' + k + '-row'); if (!row) continue;
      row.classList.remove('flag'); row.classList.add('invalid');
      const note = $('fld-' + k + '-note');
      note.className = 'note err'; note.hidden = false;
      note.textContent = msg.charAt(0).toUpperCase() + msg.slice(1).replace(/\.?$/, '.');
      $('fld-' + k).setAttribute('aria-invalid', 'true');
    }
    const first = document.querySelector('#rv-form [aria-invalid="true"]'); if (first) first.focus();
  }

  function handleSaveError(err) {
    if (err.status === 422 && err.detail && typeof err.detail === 'object' && !Array.isArray(err.detail)) {
      const errs = { ...(err.detail.issues || {}) };
      for (const k of err.detail.missing || []) errs[k] = 'required before approving';
      showFieldErrors(errs);
      formError('rv-err', err.detail.message || 'Please fix the highlighted fields.');
    } else if (err.status === 422) {
      const f = validationFields(err.detail);
      if (Object.keys(f).length) showFieldErrors(f); else formError('rv-err', 'Please check the values and try again.');
    } else if (err.status !== 401) formError('rv-err', err.message);
  }

  async function save(approve) {
    formError('rv-err', null);
    const changes = collect();
    const btns = [$('rv-draft'), $('rv-approve')]; btns.forEach((b) => { b.disabled = true; });
    try {
      let o;
      if (!current) {
        o = await api('/orders', { method: 'POST', json: changes });
        if (approve) {
          try { o = await api(`/orders/${o.id}/approve`, { method: 'POST' }); }
          catch (err) { current = o; history.replaceState(null, '', '#/orders/' + o.id); renderReview(true); handleSaveError(err); toast(o.order_number + ' saved as draft.'); return; }
        }
        current = o; history.replaceState(null, '', '#/orders/' + o.id); renderReview(true);
      } else {
        o = approve
          ? await api(`/orders/${current.id}/approve`, { method: 'POST', json: changes })
          : await api(`/orders/${current.id}`, { method: 'PATCH', json: changes });
        current = o; renderReview(false);
      }
      toast(approve ? `${o.order_number} approved and saved.` : `${o.order_number} saved as draft.`);
      refreshBell();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { handleSaveError(err); }
    finally { btns.forEach((b) => { b.disabled = false; }); }
  }
  $('rv-draft').addEventListener('click', () => save(false));
  $('rv-approve').addEventListener('click', () => save(true));
  $('rv-form').addEventListener('submit', (e) => { e.preventDefault(); save(true); });
  $('rv-delete').addEventListener('click', () => current && deleteOrder(current, () => go('#/orders')));
  $('rv-manual').addEventListener('click', async () => {
    try { current = await api(`/orders/${current.id}`, { method: 'PATCH', json: {} }); renderReview(false); }
    catch (err) { handleSaveError(err); }
  });
  $('rv-retry').addEventListener('click', async () => {
    try {
      current = await api(`/orders/${current.id}/retry`, { method: 'POST' });
      renderReview(false);
      const seq = routeSeq; const id = current.id;
      pollTimer = setTimeout(() => seq === routeSeq && openReview(id, seq), 2500);
    } catch (err) { if (err.status !== 401) toast(err.message); }
  });

  // ---------- source document viewer: PDF.js for PDFs, <img> for images ----------
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  let pdfjsPromise = null;
  const docCache = new Map(); // order id -> ArrayBuffer
  const viewer = { doc: null, img: null, page: 1, zoom: 'fit', task: null, orderId: null };

  function loadPdfJs() {
    if (!pdfjsPromise) pdfjsPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; resolve(window.pdfjsLib); };
      s.onerror = () => { pdfjsPromise = null; reject(new Error('viewer unavailable')); };
      document.head.append(s);
    });
    return pdfjsPromise;
  }
  function selectTab(json) {
    $('tab-src').setAttribute('aria-selected', String(!json)); $('tab-json').setAttribute('aria-selected', String(json));
    $('pane-src').hidden = json; $('pane-json').hidden = !json;
  }
  $('tab-src').addEventListener('click', () => selectTab(false));
  $('tab-json').addEventListener('click', () => selectTab(true));
  function renderJson(o) {
    $('json').textContent = o && o.raw_extraction ? JSON.stringify(o.raw_extraction, null, 2)
      : o && o.status === 'processing' ? 'Extraction in progress…' : 'No extraction data. This order was entered by hand.';
  }
  function viewerMessage(text) { $('viewer').replaceChildren(el('div', { class: 'placeholder' }, text)); $('doc-tools').hidden = true; }

  async function setupDoc(o) {
    renderJson(o); selectTab(false);
    viewer.doc = null; viewer.img = null; viewer.page = 1; viewer.orderId = o ? o.id : null;
    if (!o || !o.has_document) { viewerMessage('No source document. This order was entered by hand.'); return; }
    viewerMessage('Loading document…');
    const myId = o.id;
    try {
      let buf = docCache.get(myId);
      if (!buf) { const res = await api(`/orders/${myId}/document`, { raw: true }); buf = await res.arrayBuffer(); docCache.set(myId, buf); }
      if (viewer.orderId !== myId) return;
      const type = o.document_type || 'application/pdf';
      if (type.startsWith('image/')) {
        const img = el('img', { src: URL.createObjectURL(new Blob([buf], { type })), alt: 'Source document: ' + o.source_filename });
        img.addEventListener('load', () => { viewer.img = img; renderImage(); }, { once: true });
        $('doc-tools').hidden = false; $('zoom').value = viewer.zoom;
        $('pg-label').textContent = 'Page 1 of 1'; $('pg-prev').disabled = true; $('pg-next').disabled = true;
        return;
      }
      try {
        const pdfjs = await loadPdfJs();
        const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
        if (viewer.orderId !== myId) return;
        viewer.doc = doc; $('doc-tools').hidden = false; $('zoom').value = viewer.zoom;
        await renderPage();
      } catch {
        const url = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
        $('viewer').replaceChildren(el('iframe', { src: url, title: 'Source document' })); $('doc-tools').hidden = true;
      }
    } catch (err) { if (err.status !== 401) viewerMessage('The source document could not be loaded.'); }
  }
  function renderImage() {
    const img = viewer.img; if (!img) return;
    const box = $('viewer');
    const w = viewer.zoom === 'fit' ? box.clientWidth - 32 : img.naturalWidth * Number(viewer.zoom);
    img.style.width = Math.max(50, Math.floor(w)) + 'px'; img.style.height = 'auto';
    box.replaceChildren(img);
  }
  async function renderPage() {
    const doc = viewer.doc; if (!doc) return;
    const page = await doc.getPage(viewer.page);
    const box = $('viewer');
    const base = page.getViewport({ scale: 1 });
    const scale = viewer.zoom === 'fit' ? Math.max(0.3, (box.clientWidth - 32) / base.width) : Number(viewer.zoom);
    const vp = page.getViewport({ scale });
    const dpr = window.devicePixelRatio || 1;
    const canvas = el('canvas', { role: 'img', 'aria-label': `Page ${viewer.page} of ${doc.numPages}` });
    canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
    canvas.style.width = Math.floor(vp.width) + 'px'; canvas.style.height = Math.floor(vp.height) + 'px';
    if (viewer.task) { try { viewer.task.cancel(); } catch { /* done */ } }
    viewer.task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
    try { await viewer.task.promise; } catch { return; }
    box.replaceChildren(canvas);
    $('pg-label').textContent = `Page ${viewer.page} of ${doc.numPages}`;
    $('pg-prev').disabled = viewer.page <= 1; $('pg-next').disabled = viewer.page >= doc.numPages;
  }
  $('pg-prev').addEventListener('click', () => { if (viewer.page > 1) { viewer.page--; renderPage(); } });
  $('pg-next').addEventListener('click', () => { if (viewer.doc && viewer.page < viewer.doc.numPages) { viewer.page++; renderPage(); } });
  $('zoom').addEventListener('change', () => { viewer.zoom = $('zoom').value; if (viewer.img) renderImage(); else renderPage(); });
  window.addEventListener('resize', debounce(() => {
    if ($('v-review').hidden || viewer.zoom !== 'fit') return;
    if (viewer.img) renderImage(); else if (viewer.doc) renderPage();
  }, 200));

  // =====================================================================
  // Reports
  // =====================================================================
  let lastStats = null;
  async function openReports(seq) {
    showView('reports', 'reports', 'Reports');
    try {
      const s = await api('/orders/stats?days=' + $('rep-days').value);
      if (seq !== routeSeq) return;
      lastStats = s;
      const c = s.current, p = s.previous;
      const rate = (x) => (x.total ? Math.round((x.processed / x.total) * 100) : 0);
      const rows = [
        ['Orders created', c.total, p.total, true],
        ['Processed (approved)', c.processed, p.processed, true],
        ['In review', c.in_review, p.in_review, false],
        ['Needs attention', c.needs_attention, p.needs_attention, false],
      ];
      $('rep-summary').replaceChildren(
        ...rows.map(([label, cur, prev, up]) => el('tr', {}, el('td', { text: label }), el('td', { class: 'num', text: String(cur) }), el('td', { class: 'num', text: String(prev) }), el('td', { class: 'num' }, change(cur, prev, up)))),
        el('tr', {}, el('td', { text: 'Approval rate' }), el('td', { class: 'num', text: rate(c) + '%' }), el('td', { class: 'num', text: rate(p) + '%' }), el('td', { class: 'num', text: (rate(c) - rate(p) >= 0 ? '+' : '') + (rate(c) - rate(p)) + ' pts' })));
      $('rep-daily').replaceChildren(...s.daily.slice().reverse().map((d) => el('tr', {}, el('td', { text: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) }), el('td', { class: 'num', text: String(d.count) }))));
    } catch (err) { if (err.status !== 401) toast(err.message); }
  }
  $('rep-days').addEventListener('change', () => openReports(routeSeq));
  $('rep-csv').addEventListener('click', async () => {
    const btn = $('rep-csv'); btn.disabled = true;
    try {
      const days = $('rep-days').value;
      const all = [];
      for (let offset = 0; offset < 5000; offset += 200) {
        const page = await api(`/orders?days=${days}&limit=200&offset=${offset}`);
        all.push(...page.items);
        if (all.length >= page.total || !page.items.length) break;
      }
      const cols = ['order_id', 'created_utc', 'status', 'patient_first_name', 'patient_last_name', 'patient_dob', 'provider_name', 'provider_npi', 'source', 'issues'];
      const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? '"' + s.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1") + '"' : s; };
      const lines = [cols.join(',')].concat(all.map((o) => [o.order_number, o.created_at, DISP[disp(o)].label, o.patient_first_name, o.patient_last_name, o.patient_dob, o.provider_name, o.provider_npi, o.source_filename || 'Manual entry', Object.entries(o.issues).map(([k, v]) => `${k}: ${v}`).join('; ')].map(esc).join(',')));
      const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv' }));
      const a = el('a', { href: url, download: `genhealth-orders-last-${days}-days.csv` });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(`Exported ${all.length} order${all.length === 1 ? '' : 's'}.`);
    } catch (err) { if (err.status !== 401) toast(err.message); }
    finally { btn.disabled = false; }
  });

  // =====================================================================
  // Settings
  // =====================================================================
  function openSettings() {
    showView('settings', 'settings', 'Settings');
    const { name, initials } = identity(me.email);
    $('set-avatar').textContent = initials; $('set-name').textContent = name;
    $('set-email').textContent = me.email; $('set-email2').textContent = me.email;
    $('set-since').textContent = fmtDay(me.created_at);
  }

  // =====================================================================
  // Boot
  // =====================================================================
  document.querySelectorAll('[data-illus]').forEach((n) => { n.innerHTML = ILLUS; });
  hydrateNorthStar();
  hydrateIcons();
  route();
})();
