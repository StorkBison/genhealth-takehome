// GenHealth Order Intake: plain-JS single-page app talking to the FastAPI backend on the same origin.
(function () {
  'use strict';

  // =====================================================================
  // Icons (inline stroke SVG)
  // =====================================================================
  const ICONS = {
    home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5'],
    orders: [{ rect: [3, 3, 18, 18, 3] }, 'M7.5 8h1', 'M11 8h5.5', 'M7.5 12h1', 'M11 12h5.5', 'M7.5 16h1', 'M11 16h5.5'],
    upload: ['M12 15V3', 'M7 8l5-5 5 5', 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2'],
    cloudUp: ['M12 13v8', 'm8 17 4-4 4 4', 'M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3'],
    settings: ['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', { circle: [12, 12, 3] }],
    search: [{ circle: [11, 11, 7] }, 'm20 20-3.5-3.5'],
    calendar: [{ rect: [3, 5, 18, 16, 2] }, 'M16 3v4', 'M8 3v4', 'M3 10h18'],
    chevDown: ['m6 9 6 6 6-6'], chevLeft: ['m15 18-6-6 6-6'], chevRight: ['m9 18 6-6-6-6'],
    dots: [{ circle: [5, 12, 1] }, { circle: [12, 12, 1] }, { circle: [19, 12, 1] }],
    file: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5', 'M9 13h6', 'M9 17h4'],
    checkCircle: [{ circle: [12, 12, 9] }, 'm8.5 12 2.5 2.5 4.5-5'],
    alert: ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'],
    clock: [{ circle: [12, 12, 9] }, 'M12 7v5l3 2'],
    plus: ['M12 5v14', 'M5 12h14'],
    check: ['M20 6 9 17l-5-5'],
    arrowLeft: ['M19 12H5', 'm12 19-7-7 7-7'],
    mail: [{ rect: [3, 5, 18, 14, 2] }, 'm3 7 9 6 9-6'],
    lock: [{ rect: [4, 11, 16, 10, 2] }, 'M8 11V7a4 4 0 0 1 8 0v4'],
    eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', { circle: [12, 12, 3] }],
    eyeOff: ['M3 3l18 18', 'M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2', 'M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 5.4-1.4', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
    user: [{ circle: [12, 8, 4] }, 'M4 21a8 8 0 0 1 16 0'],
    steth: ['M6 3H5v6a5 5 0 0 0 10 0V3h-1', 'M10 14v1a5 5 0 0 0 10 0v-3', { circle: [20, 10, 2] }],
    xCircle: [{ circle: [12, 12, 9] }, 'm15 9-6 6', 'm9 9 6 6'],
    refresh: ['M3 12a9 9 0 0 1 15.5-6.3L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15.5 6.3L3 16', 'M3 21v-5h5'],
    trash: ['M3 6h18', 'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2', 'M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14'],
    logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
    code: ['m16 18 6-6-6-6', 'm8 6-6 6 6 6'],
    eyeOpen: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', { circle: [12, 12, 3] }],
  };
  const NS = 'http://www.w3.org/2000/svg';
  function icon(name, size = 20, cls = '') {
    const svg = document.createElementNS(NS, 'svg');
    const attrs = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: ('ic ' + cls).trim() };
    for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
    for (const part of ICONS[name] || []) {
      let n;
      if (typeof part === 'string') { n = document.createElementNS(NS, 'path'); n.setAttribute('d', part); }
      else if (part.circle) { n = document.createElementNS(NS, 'circle'); ['cx', 'cy', 'r'].forEach((a, i) => n.setAttribute(a, part.circle[i])); }
      else if (part.rect) { n = document.createElementNS(NS, 'rect'); ['x', 'y', 'width', 'height', 'rx'].forEach((a, i) => n.setAttribute(a, part.rect[i])); }
      svg.append(n);
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
  // GenHealth mark (frontend/genhealth-mark.svg); decorative next to the "GenHealth" wordmark
  const logo = () => el('img', { src: 'genhealth-mark.svg', width: 32, height: 32, alt: '', class: 'brand-mark' });

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

  const STATUS = {
    ready: { label: 'Ready', icon: 'checkCircle' },
    needs_review: { label: 'Needs Review', icon: 'alert' },
    processing: { label: 'In Process', icon: 'clock' },
    draft: { label: 'Draft', icon: 'file' },
    failed: { label: 'Failed', icon: 'xCircle' },
  };
  const pill = (status, lg) => el('span', { class: 'pill st-' + status + (lg ? ' lg' : '') }, icon(STATUS[status].icon, lg ? 18 : 14), STATUS[status].label);

  const fmtDob = (iso) => { if (!iso) return null; const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
  const parseTs = (s) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + 'Z'); // server times are UTC
  const fmtDay = (s) => parseTs(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtSize = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const patientName = (o) => [o.patient_first_name, o.patient_last_name].filter(Boolean).join(' ');

  function identity(email) {
    const local = (email || '').split('@')[0];
    const parts = local.split(/[._\-+]+/).filter(Boolean);
    const name = parts.length ? parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : email;
    const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2)).toUpperCase();
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
  // FastAPI request validation errors: [{loc: [..., field], msg}]
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
  const stopPoll = () => { clearTimeout(pollTimer); pollTimer = null; };
  const go = (hash) => { if (location.hash !== hash) location.hash = hash; else route(); };

  function showAuth(which) {
    $('app').hidden = true;
    $('v-signin').hidden = which !== 'signin';
    $('v-signup').hidden = which !== 'signup';
    document.title = (which === 'signin' ? 'Sign In' : 'Create Account') + ' · GenHealth';
  }
  function showView(name, navKey, title) {
    $('v-signin').hidden = true; $('v-signup').hidden = true; $('app').hidden = false;
    for (const v of ['dashboard', 'orders', 'upload', 'review', 'settings']) $('v-' + v).hidden = v !== name;
    document.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = title + ' · GenHealth';
    closeMenus();
  }

  async function route() {
    stopPoll();
    const seq = ++routeSeq;
    const [path, query] = (location.hash.slice(1) || '/dashboard').split('?');
    const params = new URLSearchParams(query || '');
    if (!store.get()) {
      showAuth(path === '/signup' ? 'signup' : 'signin');
      return;
    }
    if (!me) {
      try { await loadMe(); }
      catch (err) { if (err.status !== 401) toast(err.message); return; }
    }
    if (seq !== routeSeq) return;
    let m;
    if (path === '/signin' || path === '/signup' || path === '/' || path === '/dashboard') return openDashboard(seq);
    if (path === '/orders') return openOrders(params);
    if (path === '/upload') return openUpload();
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
    b.replaceChildren(icon(show ? 'eyeOff' : 'eye', 20));
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

  // ---------- menus ----------
  function closeMenus(except) {
    document.querySelectorAll('.menu').forEach((m) => { if (m !== except) m.hidden = true; });
    $('userBtn').setAttribute('aria-expanded', String(except === $('userMenu')));
  }
  $('userBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const m = $('userMenu'); const open = m.hidden;
    closeMenus(open ? m : null); m.hidden = !open;
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) closeMenus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

  // =====================================================================
  // Stat cards (shared by dashboard and orders)
  // =====================================================================
  function renderStats(container, s, active, onPick) {
    const cards = [
      { key: '', n: s.total, label: 'Total Orders', ic: 'file', cls: 'total' },
      { key: 'ready', n: s.ready, label: 'Ready', ic: 'checkCircle', cls: 'ready' },
      { key: 'needs_review', n: s.needs_review, label: 'Needs Review', ic: 'alert', cls: 'review' },
      { key: 'processing', n: s.processing, label: 'In Process', ic: 'clock', cls: 'proc' },
    ];
    container.replaceChildren(...cards.map((c) => el('button', {
      type: 'button', class: 'stat', 'aria-pressed': active === undefined ? null : String(!!c.key && active === c.key),
      onclick: () => onPick(c.key),
    }, el('span', { class: 'bub ' + c.cls }, icon(c.ic, 22)), el('span', {}, el('b', { text: String(c.n) }), el('span', { text: c.label })))));
  }

  // =====================================================================
  // Dashboard
  // =====================================================================
  async function openDashboard(seq) {
    if (location.hash !== '#/dashboard') history.replaceState(null, '', '#/dashboard');
    showView('dashboard', 'dashboard', 'Dashboard');
    $('dash-h').textContent = me ? `Welcome back, ${identity(me.email).name.split(' ')[0]}` : 'Dashboard';
    try {
      const [stats, review, recent] = await Promise.all([
        api('/orders/stats'), api('/orders?status=needs_review&limit=5'), api('/orders?limit=5'),
      ]);
      if (seq !== routeSeq) return;
      renderStats($('dash-stats'), stats, undefined, (k) => go('#/orders' + (k ? '?status=' + k : '')));
      fillList($('dash-review'), review.items, 'Nothing waiting for review.');
      fillList($('dash-recent'), recent.items, 'No orders yet. Upload a PDF to get started.');
      if (recent.items.some((o) => o.status === 'processing')) pollTimer = setTimeout(() => seq === routeSeq && openDashboard(seq), 3000);
    } catch (err) { if (err.status !== 401) toast(err.message); }
  }
  function fillList(ul, items, emptyText) {
    ul.replaceChildren(...(items.length ? items.map((o) => el('li', {}, el('a', { href: '#/orders/' + o.id },
      el('span', { class: 'meta' }, el('b', { text: patientName(o) || o.source_filename || 'Unnamed order' }),
        el('span', { text: `${o.order_number} · ${fmtDay(o.created_at)}` })),
      pill(o.status)))) : [el('li', { class: 'muted', text: emptyText })]));
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
      const [stats, list] = await Promise.all([api('/orders/stats'), api('/orders?' + p)]);
      if (seq !== routeSeq) return;
      if (list.items.length === 0 && list.total > 0 && ostate.page > 1) { ostate.page = 1; return loadOrders(); }
      renderStats($('ord-stats'), stats, ostate.status, (k) => { ostate.status = ostate.status === k ? '' : k; ostate.page = 1; $('ord-status').value = ostate.status; loadOrders(); });
      renderRows(list, stats.total);
      if (list.items.some((o) => o.status === 'processing')) pollTimer = setTimeout(() => seq === routeSeq && loadOrders(), 3000);
    } catch (err) { if (err.status !== 401) toast(err.message); }
  }

  function renderRows(list, grandTotal) {
    const body = $('ord-rows');
    body.replaceChildren(...list.items.map((o) => {
      const name = patientName(o);
      const missing = (t) => el('span', { class: 'missing', text: t });
      const actions = el('td', { class: 'actions' });
      const menu = el('div', { class: 'menu', role: 'menu', hidden: true },
        el('a', { href: '#/orders/' + o.id, role: 'menuitem' }, icon(o.status === 'needs_review' ? 'alert' : 'file', 16), o.status === 'needs_review' ? 'Review' : 'Open'),
        el('button', { type: 'button', role: 'menuitem', class: 'danger', onclick: (e) => { e.stopPropagation(); deleteOrder(o, loadOrders); } }, icon('trash', 16), 'Delete'));
      const btn = el('button', { type: 'button', class: 'ghostbtn', 'aria-label': 'Actions for ' + o.order_number, 'aria-haspopup': 'menu',
        onclick: (e) => { e.stopPropagation(); const open = menu.hidden; closeMenus(open ? menu : null); menu.hidden = !open; } }, icon('dots', 18));
      actions.append(btn, menu);
      return el('tr', { class: 'row', onclick: (e) => { if (!e.target.closest('td.actions')) go('#/orders/' + o.id); } },
        el('td', { class: 'oid' }, el('a', { href: '#/orders/' + o.id, style: 'color:inherit', text: o.order_number })),
        el('td', {}, el('div', { class: 'l1' }, name || missing(o.status === 'processing' ? 'Extracting…' : 'Name missing')),
          el('div', { class: 'l2' }, 'DOB: ', o.patient_dob ? fmtDob(o.patient_dob) : missing('missing'))),
        el('td', {}, el('div', { class: 'l1' }, o.provider_name || missing(o.status === 'processing' ? '—' : 'Provider missing')),
          el('div', { class: 'l2' }, 'NPI: ', o.provider_npi ? el('span', { class: 'mono', text: o.provider_npi }) : missing('missing'))),
        el('td', { style: 'white-space:nowrap', text: fmtDay(o.created_at) }),
        el('td', {}, pill(o.status)),
        actions);
    }));

    const filtered = ostate.q || ostate.status || ostate.days;
    const empty = $('ord-empty');
    empty.hidden = list.items.length > 0;
    if (!list.items.length) {
      empty.replaceChildren(
        icon(grandTotal ? 'search' : 'file', 32),
        el('b', { text: grandTotal ? 'No orders match your filters' : 'No orders yet' }),
        el('span', { text: grandTotal ? 'Try a different search, status or date range.' : 'Upload a faxed or scanned order PDF to get started.' }),
        grandTotal && filtered
          ? el('button', { type: 'button', class: 'btn btn-outline', onclick: () => { Object.assign(ostate, { q: '', status: '', days: '', page: 1 }); openOrders(new URLSearchParams()); } }, 'Clear filters')
          : el('a', { class: 'btn btn-primary', href: '#/upload' }, icon('plus', 18), 'Upload Order'));
    }

    const from = list.total ? list.offset + 1 : 0, to = list.offset + list.items.length;
    $('ord-showing').textContent = list.total ? `Showing ${from}–${to} of ${list.total} orders` : '';
    const pages = Math.max(1, Math.ceil(list.total / PAGE));
    const pager = $('ord-pager');
    if (pages <= 1) { pager.replaceChildren(); return; }
    const setPage = (n) => { ostate.page = n; loadOrders(); };
    const nums = new Set([1, pages, ostate.page - 1, ostate.page, ostate.page + 1].filter((n) => n >= 1 && n <= pages));
    const items = [];
    let prev = 0;
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
      pdfCache.delete(o.id);
      toast(o.order_number + ' deleted.');
      after();
    } catch (err) { if (err.status !== 401) toast(err.message); }
  }

  // =====================================================================
  // Upload
  // =====================================================================
  const uploads = []; // {key, name, size, state: 'uploading'|'error'|order status, order, error}

  function openUpload() {
    showView('upload', 'upload', 'Upload Order');
    renderQueue();
    pollUploads();
  }

  function renderQueue() {
    $('up-card').hidden = uploads.length === 0;
    $('up-queue').replaceChildren(...uploads.slice().reverse().map((u) => {
      let right;
      if (u.state === 'uploading') right = el('span', { class: 'pill st-processing' }, el('span', { class: 'spinner', style: 'width:14px;height:14px;border-width:2px', 'aria-hidden': 'true' }), 'Uploading');
      else if (u.state === 'error') right = el('span', { class: 'pill st-failed' }, icon('xCircle', 14), 'Not uploaded');
      else right = pill(u.order.status);
      const action = u.order && u.order.status !== 'processing'
        ? el('a', { class: 'btn btn-soft', href: '#/orders/' + u.order.id, style: 'height:36px' }, u.order.status === 'needs_review' ? 'Review' : 'Open')
        : null;
      return el('li', {},
        el('span', { class: 'fi' }, icon('file', 20)),
        el('span', { class: 'meta' }, el('b', { text: u.name }), el('span', { text: [fmtSize(u.size), u.order && u.order.order_number, u.order && u.order.document_pages && u.order.document_pages + (u.order.document_pages === 1 ? ' page' : ' pages')].filter(Boolean).join(' · ') })),
        right, action,
        u.error ? el('span', { class: 'msg', text: u.error }) : null,
        u.order && u.order.status === 'failed' && u.order.error_message ? el('span', { class: 'msg', text: u.order.error_message }) : null);
    }));
  }

  async function uploadFiles(files) {
    for (const file of files) {
      const u = { name: file.name, size: file.size, state: 'uploading' };
      uploads.push(u);
      if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { u.state = 'error'; u.error = 'Only PDF files are accepted.'; renderQueue(); continue; }
      if (file.size > 20 * 1024 * 1024) { u.state = 'error'; u.error = 'This file is over the 20 MB limit.'; renderQueue(); continue; }
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
    if (!pending.length || $('v-upload').hidden) return;
    const seq = routeSeq;
    pollTimer = setTimeout(async () => {
      if (seq !== routeSeq) return;
      await Promise.all(pending.map(async (u) => {
        try {
          const o = await api('/orders/' + u.order.id);
          if (u.order.status === 'processing' && o.status !== 'processing') {
            toast(o.status === 'failed' ? `${u.name}: extraction failed.` : `${u.name} is ready for review.`);
          }
          u.order = o;
        } catch (err) { if (err.status === 404) { u.state = 'error'; u.error = 'This order was deleted.'; u.order = null; } }
      }));
      if (seq !== routeSeq) return;
      renderQueue(); pollUploads();
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
    { k: 'patient_first_name', label: 'First Name', grp: 'rv-patient', auto: 'off' },
    { k: 'patient_last_name', label: 'Last Name', grp: 'rv-patient', auto: 'off' },
    { k: 'patient_dob', label: 'Date of Birth', grp: 'rv-patient', type: 'date' },
    { k: 'provider_name', label: 'Provider Name', grp: 'rv-provider', auto: 'off' },
    { k: 'provider_npi', label: 'NPI', grp: 'rv-provider', mono: true, inputmode: 'numeric', placeholder: '10 digits', maxlength: 14 },
  ];
  const LABELS = Object.fromEntries(FIELDS.map((f) => [f.k, f.label]));
  let current = null; // order being reviewed; null = new manual order

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
      if (wasProcessing && o.status !== 'processing') toast(o.status === 'failed' ? 'Extraction failed.' : 'Extraction finished. Please review the fields.');
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
      : o.source_filename ? `Verify the extracted information before saving. Source: ${o.source_filename}${o.document_pages ? ` (${o.document_pages} page${o.document_pages === 1 ? '' : 's'})` : ''}.`
        : 'Entered by hand. Verify the information before approving.';
    $('rv-status').replaceChildren(o ? pill(o.status, true) : pill('draft', true));

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
    if (docChanged) setupDoc(o);
    else renderJson(o);
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
        class: 'input' + (f.mono ? ' mono' : ''), id, name: f.k, type: f.type || 'text', autocomplete: f.auto || 'off',
        inputmode: f.inputmode, placeholder: f.placeholder, maxlength: f.maxlength, 'aria-describedby': id + '-note', 'aria-required': 'true',
      });
      input.value = value || '';
      const stIcon = value && !issue ? icon('check', 18, 'st ok') : (issue || isMissing) ? icon('alert', 18, 'st warn') : null;
      if (stIcon && value) stIcon.setAttribute('aria-hidden', 'true');
      let note;
      if (issue) note = el('span', { class: 'note warn', id: id + '-note', text: issueText(issue) });
      else if (isMissing) note = el('span', { class: 'note warn', id: id + '-note', text: 'Not found in the document. Enter it from the source.' });
      else if (source && source !== value) note = el('span', { class: 'note src', id: id + '-note' }, 'Read as ', el('span', { class: 'mono', text: '“' + source + '”' }));
      else note = el('span', { class: 'note', id: id + '-note', hidden: true });
      const row = el('div', { class: 'frow' + (issue || isMissing ? ' flag' : ''), id: id + '-row' },
        el('label', { for: id }, f.label, el('span', { class: 'req', 'aria-hidden': 'true', text: '*' })),
        el('div', { class: 'inwrap' }, input, stIcon),
        note);
      input.addEventListener('input', () => {
        row.classList.remove('invalid');
        input.removeAttribute('aria-invalid');
        const s = row.querySelector('.st'); if (s) s.remove();
      });
      $(f.grp).append(row);
    }
  }

  function renderNotice(o) {
    const box = $('rv-notice');
    if (o && o.status === 'ready') {
      box.className = 'notice ok';
      box.replaceChildren(icon('checkCircle', 20), el('div', {}, el('b', { text: 'Approved' }), 'All fields were checked and approved. Editing a field and saving as draft will require approval again.'));
      return;
    }
    const problems = o ? [...new Set([...Object.keys(o.issues), ...o.missing_fields])] : [];
    const why = (k) => o.issues[k] ? issueText(o.issues[k]) : o.source_filename ? 'missing from the document.' : 'required before approving.';
    box.className = 'notice warn';
    box.replaceChildren(icon('alert', 20), el('div', {},
      el('b', { text: 'Please review' }),
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
    } else if (err.status === 409) {
      formError('rv-err', err.message);
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
        current = o;
        history.replaceState(null, '', '#/orders/' + o.id);
        renderReview(true);
      } else {
        o = approve
          ? await api(`/orders/${current.id}/approve`, { method: 'POST', json: changes })
          : await api(`/orders/${current.id}`, { method: 'PATCH', json: changes });
        current = o; renderReview(false);
      }
      toast(approve ? `${o.order_number} approved and saved.` : `${o.order_number} saved as draft.`);
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

  // ---------- source document viewer (PDF.js, with an iframe fallback) ----------
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  let pdfjsPromise = null;
  const pdfCache = new Map(); // order id -> ArrayBuffer
  const viewer = { doc: null, page: 1, zoom: 'fit', task: null, orderId: null };

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
    $('tab-src').setAttribute('aria-selected', String(!json));
    $('tab-json').setAttribute('aria-selected', String(json));
    $('pane-src').hidden = json; $('pane-json').hidden = !json;
  }
  $('tab-src').addEventListener('click', () => selectTab(false));
  $('tab-json').addEventListener('click', () => selectTab(true));

  function renderJson(o) {
    $('json').textContent = o && o.raw_extraction
      ? JSON.stringify(o.raw_extraction, null, 2)
      : o && o.status === 'processing' ? 'Extraction in progress…' : 'No extraction data. This order was entered by hand.';
  }

  function viewerMessage(text) {
    $('viewer').replaceChildren(el('div', { class: 'placeholder' }, text));
    $('doc-tools').hidden = true;
  }

  async function setupDoc(o) {
    renderJson(o);
    selectTab(false);
    viewer.doc = null; viewer.page = 1; viewer.orderId = o ? o.id : null;
    if (!o || !o.has_document) { viewerMessage('No source document. This order was entered by hand.'); return; }
    viewerMessage('Loading document…');
    const myId = o.id;
    try {
      let buf = pdfCache.get(myId);
      if (!buf) {
        const res = await api(`/orders/${myId}/document`, { raw: true });
        buf = await res.arrayBuffer();
        pdfCache.set(myId, buf);
      }
      if (viewer.orderId !== myId) return;
      try {
        const pdfjs = await loadPdfJs();
        const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
        if (viewer.orderId !== myId) return;
        viewer.doc = doc;
        $('doc-tools').hidden = false;
        $('zoom').value = viewer.zoom;
        await renderPage();
      } catch {
        // PDF.js unavailable (offline CDN): fall back to the browser's own viewer
        const url = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
        $('viewer').replaceChildren(el('iframe', { src: url, title: 'Source document' }));
        $('doc-tools').hidden = true;
      }
    } catch (err) {
      if (err.status !== 401) viewerMessage('The source document could not be loaded.');
    }
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
    if (viewer.task) { try { viewer.task.cancel(); } catch { /* already done */ } }
    viewer.task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
    try { await viewer.task.promise; } catch { return; }
    box.replaceChildren(canvas);
    $('pg-label').textContent = `Page ${viewer.page} of ${doc.numPages}`;
    $('pg-prev').disabled = viewer.page <= 1;
    $('pg-next').disabled = viewer.page >= doc.numPages;
  }
  $('pg-prev').addEventListener('click', () => { if (viewer.page > 1) { viewer.page--; renderPage(); } });
  $('pg-next').addEventListener('click', () => { if (viewer.doc && viewer.page < viewer.doc.numPages) { viewer.page++; renderPage(); } });
  $('zoom').addEventListener('change', () => { viewer.zoom = $('zoom').value; renderPage(); });
  window.addEventListener('resize', debounce(() => { if (viewer.doc && viewer.zoom === 'fit' && !$('v-review').hidden) renderPage(); }, 200));

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
  document.querySelectorAll('[data-logo]').forEach((n) => n.prepend(logo()));
  hydrateIcons();
  route();
})();
