// Order Intake front end: plain JS talking to the FastAPI backend on the same origin.
(function () {
  'use strict';

  // ---------- token storage ----------
  const TOKEN_KEY = 'oi_token';
  let memToken = null;
  const store = {
    get() { try { return localStorage.getItem(TOKEN_KEY) || memToken; } catch { return memToken; } },
    set(t) { memToken = t; try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } },
  };

  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids) if (kid != null) n.append(kid);
    return n;
  };

  // ---------- API ----------
  class ApiError extends Error {
    constructor(status, detail) { super(typeof detail === 'string' ? detail : 'Request failed'); this.status = status; this.detail = detail; }
  }

  async function api(path, { method = 'GET', json, form, body } = {}) {
    const headers = {};
    const token = store.get();
    if (token) headers.Authorization = 'Bearer ' + token;
    if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
    if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(form).toString(); }
    let res;
    try {
      res = await fetch(path, { method, headers, body });
    } catch {
      throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
    }
    if (res.status === 204) return null;
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON body */ }
    if (!res.ok) {
      if (res.status === 401 && path !== '/auth/token') { signOut('Your session expired. Please sign in again.'); }
      throw new ApiError(res.status, data && data.detail !== undefined ? data.detail : res.statusText);
    }
    return data;
  }

  // FastAPI request-validation errors come back as [{loc:[...], msg}]
  function pydanticFieldErrors(detail) {
    const out = {};
    if (Array.isArray(detail)) for (const d of detail) {
      const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
      if (field) out[field] = (d.msg || 'Invalid value').replace(/^Value error, /, '');
    }
    return out;
  }

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
  }

  // ---------- routing ----------
  function go(hash) { if (location.hash !== hash) location.hash = hash; else route(); }
  function showScreen(id) {
    const signedIn = id !== 'signin';
    $('shell').hidden = !signedIn;
    $('signin').classList.toggle('on', !signedIn);
    for (const s of ['orders', 'review']) $(s).classList.toggle('on', s === id);
    window.scrollTo(0, 0);
  }
  async function route() {
    if (!store.get()) { showScreen('signin'); return; }
    const h = location.hash || '#/orders';
    let m;
    if ((m = h.match(/^#\/orders\/(\d+)$/))) return openOrder(Number(m[1]));
    if (h === '#/new') return openNew();
    showScreen('orders');
    loadOrders();
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); go('#/' + g.dataset.go); }
  });

  // ---------- auth ----------
  let registerMode = false;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setMode(up) {
    registerMode = up;
    $('tabIn').setAttribute('aria-selected', String(!up));
    $('tabUp').setAttribute('aria-selected', String(up));
    $('authBtn').textContent = up ? 'Create account' : 'Sign in';
    $('pwHint').hidden = !up;
    $('pw').autocomplete = up ? 'new-password' : 'current-password';
    clearAuthErrors();
  }
  function clearAuthErrors() {
    $('authErr').hidden = true;
    for (const f of ['em', 'pw']) { $(f + 'Err').hidden = true; $(f + 'Field').classList.remove('invalid'); $(f).removeAttribute('aria-invalid'); }
  }
  function fieldErr(f, msg) {
    $(f + 'Err').textContent = msg; $(f + 'Err').hidden = false;
    $(f + 'Field').classList.add('invalid'); $(f).setAttribute('aria-invalid', 'true');
  }
  function formErr(msg) { $('authErr').textContent = msg; $('authErr').hidden = false; }

  $('tabIn').addEventListener('click', () => setMode(false));
  $('tabUp').addEventListener('click', () => setMode(true));

  $('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthErrors();
    const email = $('em').value.trim();
    const password = $('pw').value;

    // Check on the client first so obvious mistakes don't need a round trip
    let ok = true;
    if (!email) { fieldErr('em', 'Enter your email.'); ok = false; }
    else if (!EMAIL_RE.test(email)) { fieldErr('em', 'Enter a valid email address, like name@clinic.com.'); ok = false; }
    if (!password) { fieldErr('pw', 'Enter your password.'); ok = false; }
    else if (registerMode && password.length < 8) { fieldErr('pw', 'Use at least 8 characters.'); ok = false; }
    else if (registerMode && password.length > 128) { fieldErr('pw', 'Use at most 128 characters.'); ok = false; }
    if (!ok) { (document.querySelector('#authForm [aria-invalid="true"]') || $('em')).focus(); return; }

    const btn = $('authBtn');
    btn.disabled = true;
    btn.textContent = registerMode ? 'Creating account…' : 'Signing in…';
    try {
      if (registerMode) {
        try {
          await api('/auth/register', { method: 'POST', json: { email, password } });
        } catch (err) {
          if (err.status === 409) { formErr('An account with this email already exists. Sign in instead.'); setTimeout(() => setModeKeep(false), 0); return; }
          if (err.status === 422) {
            const fe = pydanticFieldErrors(err.detail);
            if (fe.email) fieldErr('em', 'Enter a valid email address.');
            if (fe.password) fieldErr('pw', 'Use between 8 and 128 characters.');
            if (!fe.email && !fe.password) formErr('Please check your email and password.');
            return;
          }
          throw err;
        }
      }
      let tok;
      try {
        tok = await api('/auth/token', { method: 'POST', form: { username: email, password } });
      } catch (err) {
        if (err.status === 401) { formErr('Incorrect email or password.'); $('pw').select(); return; }
        throw err;
      }
      store.set(tok.access_token);
      $('pw').value = '';
      await loadMe();
      if (registerMode) toast('Account created. You are signed in.');
      go('#/orders');
    } catch (err) {
      formErr(err.status ? `Something went wrong (${err.status}). Please try again.` : err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = registerMode ? 'Create account' : 'Sign in';
    }
  });
  // switch to sign-in tab but keep the error message visible
  function setModeKeep(up) {
    const msg = $('authErr').textContent;
    setMode(up); formErr(msg);
  }

  async function loadMe() {
    const me = await api('/auth/me');
    $('who').textContent = me.email;
  }

  function signOut(message) {
    store.set(null);
    $('who').textContent = '';
    setMode(false);
    if (message) formErr(message);
    go('#/signin');
    showScreen('signin');
  }
  $('signOut').addEventListener('click', () => signOut());

  // ---------- orders list ----------
  const LABEL = { ready: 'Ready', needs_review: 'Needs review', draft: 'Draft' };
  const ACTION = { ready: 'View', needs_review: 'Review', draft: 'Edit' };
  let filter = 'all';
  let orders = [];

  async function loadOrders() {
    $('empty').hidden = false; $('empty').textContent = 'Loading orders…';
    try {
      const data = await api('/orders?limit=200');
      orders = data.items;
      renderOrders();
    } catch (err) {
      if (err.status !== 401) { $('empty').textContent = 'Could not load orders: ' + err.message; }
    }
  }

  function renderOrders() {
    const tabs = $('tabs'); tabs.replaceChildren();
    for (const [id, l] of [['all', 'All'], ['needs_review', 'Needs review'], ['ready', 'Ready'], ['draft', 'Draft']]) {
      const n = id === 'all' ? orders.length : orders.filter((o) => o.status === id).length;
      tabs.append(el('button', { type: 'button', role: 'tab', 'aria-selected': String(id === filter), onclick: () => { filter = id; renderOrders(); } },
        l, el('span', { class: 'n', text: String(n) })));
    }
    const rows = orders.filter((o) => filter === 'all' || o.status === filter);
    const body = $('rows'); body.replaceChildren();
    const cell = (v, issue, mono) => v
      ? el('td', { class: mono ? 'mono' : null, text: v })
      : el('td', { class: 'flag' + (mono ? ' mono' : ''), text: issue ? 'Failed check' : 'Missing' });
    for (const o of rows) {
      const patient = [o.patient_first_name, o.patient_last_name].filter(Boolean).join(' ');
      const issueFor = (k) => o.issues[k] && !o.issues[k].startsWith('not extracted');
      body.append(el('tr', {},
        el('td', { style: 'font-weight:600' + (patient ? '' : ';color:var(--flag)'), text: patient || 'Name missing' }),
        cell(o.patient_dob, issueFor('patient_dob'), true),
        cell(o.provider_name, issueFor('provider_name')),
        cell(o.provider_npi, issueFor('provider_npi'), true),
        el('td', { style: 'color:var(--muted)', text: o.source_filename || 'Manual entry' }),
        el('td', {}, el('span', { class: 'pill ' + o.status, text: LABEL[o.status] })),
        el('td', { style: 'text-align:right' }, el('a', { href: '#/orders/' + o.id, style: 'font-weight:600;text-decoration:none', text: ACTION[o.status] })),
      ));
    }
    $('empty').hidden = rows.length > 0;
    $('empty').textContent = orders.length ? 'No orders with this status.' : 'No orders yet. Upload a PDF to create your first one.';
  }

  $('newManual').addEventListener('click', () => go('#/new'));

  // ---------- upload ----------
  const blobUrls = new Map(); // order id -> object URL of the PDF uploaded in this session
  const drop = $('drop');
  let uploading = false;

  async function upload(file) {
    if (uploading || !file) return;
    if (file.type && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) { toast('Please choose a PDF file.'); return; }
    if (file.size > 20 * 1024 * 1024) { toast('That file is over 20 MB.'); return; }
    uploading = true;
    drop.classList.add('busy');
    $('chooseBtn').setAttribute('aria-disabled', 'true');
    $('dropIco').replaceChildren(el('span', { class: 'spinner', 'aria-hidden': 'true' }));
    $('dropTitle').textContent = 'Reading ' + file.name + '…';
    $('dropSub').textContent = 'This usually takes 10 to 60 seconds for a multi-page fax.';
    try {
      const fd = new FormData(); fd.append('file', file, file.name);
      const order = await api('/orders/upload', { method: 'POST', body: fd });
      blobUrls.set(order.id, URL.createObjectURL(file));
      toast(order.status === 'ready' ? 'All fields read and checked.' : 'Order created. Some fields need your review.');
      go('#/orders/' + order.id);
    } catch (err) {
      if (err.status !== 401) toast(typeof err.detail === 'string' ? err.detail : 'Upload failed.');
    } finally {
      uploading = false;
      drop.classList.remove('busy');
      $('chooseBtn').removeAttribute('aria-disabled');
      $('dropIco').replaceChildren(uploadIcon());
      $('dropTitle').textContent = 'Drop an order PDF here';
      $('dropSub').textContent = 'Scanned faxes and multi-page packets work. PDF only, up to 20 MB and 100 pages.';
      $('file').value = '';
    }
  }
  function uploadIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    for (const [k, v] of Object.entries({ width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(k, v);
    for (const d of ['M12 16V4', 'M7 9l5-5 5 5', 'M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3']) { const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); svg.append(p); }
    return svg;
  }
  $('file').addEventListener('change', (e) => upload(e.target.files[0]));
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => upload(e.dataTransfer.files[0]));

  // ---------- review / edit ----------
  const FIELDS = [
    { k: 'patient_first_name', label: 'First name', grp: 'grpPatient', auto: 'off' },
    { k: 'patient_last_name', label: 'Last name', grp: 'grpPatient', auto: 'off' },
    { k: 'patient_dob', label: 'Date of birth', grp: 'grpDob', mono: true, placeholder: 'YYYY-MM-DD' },
    { k: 'provider_name', label: 'Provider name', grp: 'grpProvider', auto: 'off' },
    { k: 'provider_npi', label: 'NPI', grp: 'grpProvider', mono: true, placeholder: '10 digits', inputmode: 'numeric' },
  ];
  let current = null; // order being edited, or null for a new manual order

  function renderForm(order) {
    $('formErr').hidden = true;
    for (const g of ['grpPatient', 'grpDob', 'grpProvider']) $(g).replaceChildren();
    for (const f of FIELDS) {
      const issue = order && order.issues[f.k];
      const missing = order && order.missing_fields.includes(f.k);
      const source = order && order.sources[f.k];
      let tag = null;
      if (issue && issue.startsWith('not extracted')) tag = ['Missing', 'miss'];
      else if (issue) tag = ['Failed check', 'err'];
      else if (missing && order.source_filename) tag = ['Missing', 'miss'];
      else if (source) tag = ['Extracted', 'ok'];

      const id = 'f_' + f.k;
      const input = el('input', {
        id, name: f.k, class: f.mono ? 'mono' : null, placeholder: f.placeholder, inputmode: f.inputmode,
        autocomplete: f.auto, 'aria-describedby': id + '_msg',
      });
      input.value = (order && order[f.k]) || '';
      let msg = null;
      if (issue) msg = el('span', { class: 'issue', id: id + '_msg', text: humanIssue(issue) });
      else if (source) msg = el('span', { class: 'src', id: id + '_msg' }, 'Read from: ', el('span', { class: 'mono', text: '“' + source + '”' }));
      else msg = el('span', { class: 'src', id: id + '_msg', hidden: true });
      const wrap = el('div', { class: 'field' + (tag && tag[1] !== 'ok' ? ' bad' : ''), id: id + '_wrap' },
        el('div', { class: 'row' }, el('label', { for: id, text: f.label }), tag ? el('span', { class: 'tag ' + tag[1], text: tag[0] }) : null),
        input, msg);
      $(f.grp).append(wrap);
    }
  }

  function humanIssue(issue) {
    if (issue.startsWith('not extracted: ')) return 'Not extracted: ' + issue.slice('not extracted: '.length);
    return issue.charAt(0).toUpperCase() + issue.slice(1) + '. The value was not saved; enter it from the document.';
  }

  function renderHeader(order) {
    if (!order) {
      $('rvTitle').textContent = 'New order';
      $('rvPill').hidden = true;
      $('rvSub').textContent = 'Enter the details by hand. Every value is checked when you save.';
      $('rvBanner').hidden = true;
      $('delBtn').hidden = true;
      $('saveBtn').textContent = 'Create order';
      return;
    }
    $('rvTitle').textContent = 'Order #' + order.id;
    $('rvPill').hidden = false;
    $('rvPill').className = 'pill ' + order.status;
    $('rvPill').textContent = LABEL[order.status];
    $('rvSub').textContent = (order.source_filename ? 'From ' + order.source_filename : 'Manual entry') + ' · created ' + new Date(order.created_at).toLocaleString();
    $('delBtn').hidden = false;
    $('saveBtn').textContent = 'Save changes';
    const n = new Set([...order.missing_fields, ...Object.keys(order.issues)]).size;
    const banner = $('rvBanner');
    if (n > 0) {
      banner.hidden = false; banner.classList.remove('ok');
      $('rvBannerTitle').textContent = n === 1 ? '1 field needs attention before this order is ready' : n + ' fields need attention before this order is ready';
      $('rvBannerText').textContent = order.source_filename
        ? "Nothing was guessed. Fields the document didn't clearly contain, or that failed a check, were left empty."
        : 'Fill in the empty fields to mark this order ready.';
    } else {
      banner.hidden = false; banner.classList.add('ok');
      $('rvBannerTitle').textContent = 'All fields are present and passed validation';
      $('rvBannerText').textContent = 'This order is ready.';
    }
  }

  function renderDoc(order) {
    const url = order && blobUrls.get(order.id);
    $('docPane').hidden = !(order && order.source_filename);
    $('docFrame').hidden = !url;
    $('docPlaceholder').hidden = !!url;
    if (url) $('docFrame').src = url; else $('docFrame').removeAttribute('src');
  }

  async function openOrder(id) {
    showScreen('review');
    $('rvTitle').textContent = 'Loading…'; $('rvPill').hidden = true; $('rvBanner').hidden = true;
    try {
      current = await api('/orders/' + id);
    } catch (err) {
      if (err.status === 404) { toast('Order not found.'); go('#/orders'); }
      else if (err.status !== 401) toast(err.message);
      return;
    }
    renderHeader(current); renderForm(current); renderDoc(current);
  }

  function openNew() {
    current = null;
    showScreen('review');
    renderHeader(null); renderForm(null); renderDoc(null);
  }

  function showFieldErrors(errs) {
    for (const [k, m] of Object.entries(errs)) {
      const wrap = $('f_' + k + '_wrap'); if (!wrap) continue;
      wrap.classList.add('invalid');
      const msg = $('f_' + k + '_msg');
      msg.className = 'err'; msg.textContent = m.charAt(0).toUpperCase() + m.slice(1) + '.'; msg.hidden = false;
      $('f_' + k).setAttribute('aria-invalid', 'true');
    }
    const first = document.querySelector('#orderForm [aria-invalid="true"]'); if (first) first.focus();
  }

  $('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('formErr').hidden = true;
    const payload = {};
    for (const f of FIELDS) {
      const v = $('f_' + f.k).value.trim();
      const val = v === '' ? null : v;
      if (!current || val !== (current[f.k] || null)) payload[f.k] = val;
    }
    if (current && Object.keys(payload).length === 0) { toast('No changes to save.'); return; }
    const btn = $('saveBtn'); btn.disabled = true;
    try {
      const saved = current
        ? await api('/orders/' + current.id, { method: 'PATCH', json: payload })
        : await api('/orders', { method: 'POST', json: payload });
      toast(saved.status === 'ready' ? 'Saved. The order is ready.' : 'Saved.');
      if (!current) { go('#/orders/' + saved.id); return; }
      current = saved; renderHeader(saved); renderForm(saved);
    } catch (err) {
      if (err.status === 422) {
        const issues = err.detail && err.detail.issues ? err.detail.issues : pydanticFieldErrors(err.detail);
        if (Object.keys(issues).length) showFieldErrors(issues);
        else { $('formErr').textContent = 'Please check the values and try again.'; $('formErr').hidden = false; }
      } else if (err.status !== 401) {
        $('formErr').textContent = err.message; $('formErr').hidden = false;
      }
    } finally { btn.disabled = false; }
  });

  $('delBtn').addEventListener('click', async () => {
    if (!current || !confirm('Delete order #' + current.id + '? This cannot be undone.')) return;
    try {
      await api('/orders/' + current.id, { method: 'DELETE' });
      const u = blobUrls.get(current.id); if (u) { URL.revokeObjectURL(u); blobUrls.delete(current.id); }
      toast('Order deleted.');
      go('#/orders');
    } catch (err) { if (err.status !== 401) toast(err.message); }
  });

  // ---------- boot ----------
  (async function boot() {
    if (store.get()) {
      try { await loadMe(); } catch { return; /* 401 already signed out */ }
    }
    route();
  })();
})();
