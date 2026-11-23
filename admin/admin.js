(() => {
  'use strict';
  const F = window.CMV_FORMAT, esc = F.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $('#app');

  /* ---------- light / dark theme (same setting as the public site) ---------- */
  const THEME_KEY = 'cmv-theme';
  const themePref = () => { try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; } };
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme(pref = themePref()) {
    document.documentElement.dataset.theme = pref === 'dark' || (pref === 'system' && systemDark.matches) ? 'dark' : 'light';
    $$('.theme button').forEach(b => { b.classList.toggle('on', b.dataset.themeSet === pref); b.setAttribute('aria-pressed', b.dataset.themeSet === pref); });
  }
  systemDark.addEventListener('change', () => applyTheme());
  addEventListener('storage', e => { if (e.key === THEME_KEY) applyTheme(); }); // changed in another tab (e.g. the site)
  const THEME_ICONS = {
    system: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    light: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>'
  };
  const themeSwitch = () => `<div class="theme" role="group" aria-label="Tema">${[['system', 'Tema dispozitivului'], ['light', 'Temă luminoasă'], ['dark', 'Temă întunecată']]
    .map(([k, l]) => `<button type="button" data-theme-set="${k}" title="${l}" aria-label="${l}">${THEME_ICONS[k]}</button>`).join('')}</div>`;
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-theme-set]'); if (!b) return;
    try { localStorage.setItem(THEME_KEY, b.dataset.themeSet); } catch (err) { /* private mode */ }
    applyTheme();
  });

  // "Azi" next to a date field fills in today's date
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-today]'); if (!b) return;
    e.preventDefault();
    const input = b.parentElement.querySelector('input[type=date]');
    input.value = iso(new Date());
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  /* on phones every table row becomes a card; each cell gets its column name as a label */
  new MutationObserver(() => {
    $$('table', app).forEach(t => {
      const heads = $$('thead th', t).map(th => th.textContent.trim());
      $$('tbody tr', t).forEach(tr => [...tr.children].forEach((td, i) => { if (!td.hasAttribute('data-l')) td.dataset.l = heads[i] || ''; }));
    });
  }).observe(app, { childList: true, subtree: true });

  /* ---------- api ---------- */
  // the API (Node.js server, address in js/config.js); the panel's login is a token kept apart from the site's
  const API = ((window.CMV_CONFIG && window.CMV_CONFIG.apiUrl) || '').replace(/\/+$/, '');
  const TOKEN_KEY = 'cmv-token-admin';
  const token = {
    get() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } },
    set(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* private mode */ } }
  };
  async function api(route, { method = 'GET', body, form, params } = {}) {
    const qs = new URLSearchParams(params || {}).toString();
    const opt = { method, headers: {} };
    const tok = token.get();
    if (tok) opt.headers.Authorization = 'Bearer ' + tok;
    if (method === 'POST') {
      if (form) opt.body = form;
      else { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body || {}); }
    }
    let res;
    try { res = await fetch(`${API}/api/${route}${qs ? '?' + qs : ''}`, opt); }
    catch (e) { throw new Error('Serverul nu răspunde. Verifică conexiunea la internet sau încearcă din nou peste un minut.'); }
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (res.status === 401 && tok) token.set(null);
    if (data && data.token) token.set(data.token); // login and first-run setup hand out a new token
    if (!res.ok || !data) {
      const err = new Error((data && data.error) || `Serverul a răspuns cu eroarea ${res.status}.`);
      err.status = res.status; throw err;
    }
    return data;
  }
  let toastTimer = 0;
  function toast(msg, isErr = false) {
    const t = $('.toast'); t.textContent = msg; t.classList.toggle('err', isErr); t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), isErr ? 6000 : 3200);
  }
  // runs an action with its button disabled; errors become a toast, an expired login goes back to the login screen
  async function busy(btn, fn) {
    if (btn) btn.disabled = true;
    try { return await fn(); }
    catch (e) { toast(e.message, true); if (e.status === 401) showLogin(); }
    finally { if (btn) btn.disabled = false; }
  }

  /* ---------- dates ---------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseIso = s => new Date(s + 'T00:00:00');
  const DOW_LONG = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
  const dayIndex = s => (parseIso(s).getDay() + 6) % 7; // Monday = 0, as in the timetable
  const fmtStamp = s => { if (!s) return '—'; const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z'); return isNaN(d) ? s : d.toLocaleString('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }); };

  const S = { me: null, tt: null, news: [], users: [], subs: [], subsDate: iso(new Date()) };

  /* ---------- timetable helpers ---------- */
  function indexTimetable() {
    const tt = S.tt;
    S.busy = new Map();       // "day|period" -> Set of teacher codes that have a class then
    S.byTeacher = new Map();  // code -> [{ cls, day, period, sub, room, grp }]
    S.slot = new Map();       // "class|day|period" -> entries
    for (const [cls, rows] of Object.entries(tt.entries)) {
      for (const [day, period, sub, tch, room, grp] of rows) {
        const e = { cls, day, period, sub, tch, room, grp };
        const k = `${day}|${period}`;
        if (!S.busy.has(k)) S.busy.set(k, new Set());
        const sk = `${cls}|${day}|${period}`;
        if (!S.slot.has(sk)) S.slot.set(sk, []);
        S.slot.get(sk).push(e);
        tch.split(',').filter(Boolean).forEach(c => {
          S.busy.get(k).add(c);
          if (!S.byTeacher.has(c)) S.byTeacher.set(c, []);
          S.byTeacher.get(c).push(e);
        });
      }
    }
  }
  const teacher = code => S.tt.teachers.find(t => t.code === code);
  const teacherByName = name => S.tt.teachers.find(t => t.name.toLowerCase() === String(name).trim().toLowerCase());
  const subjectName = code => (S.tt.subjects.find(s => s.code === code) || {}).name || code;
  const subjectCode = name => (S.tt.subjects.find(s => s.name.toLowerCase() === String(name).trim().toLowerCase()) || {}).code || String(name).trim();
  const periodTime = p => { const x = S.tt.periods.find(y => y.period === +p); return x && x.start ? `${x.start}–${x.end}` : ''; };
  async function loadTimetable() { S.tt = await api('timetable'); indexTimetable(); }

  /* ======================================================  first run / login */
  function authScreen(title, sub, fields, button) {
    app.innerHTML = `<div class="auth-theme">${themeSwitch()}</div><div class="auth"><section class="card">
      <img class="logo-big" src="../assets/sigla.png" alt="Sigla Colegiului „Mihai Viteazul” Ineu">
      <h1>${title}</h1><p class="sub">${sub}</p>
      <form class="form" id="auth" novalidate>${fields}<button class="btn" type="submit">${button}</button></form>
      <a class="back" href="../">← Înapoi la site</a></section></div>`;
    applyTheme();
    const first = $('#auth .in'); if (first) first.focus();
    return $('#auth');
  }
  function showSetup() {
    const form = authScreen('Configurare inițială', 'Baza de date este goală. Creează primul cont de administrator; tabelele se creează automat.',
      `<label class="f"><span>Nume</span><input class="in" name="name" autocomplete="name" required></label>
       <label class="f"><span>Email</span><input class="in" name="email" type="email" autocomplete="username" required></label>
       <label class="f"><span>Parolă (minim 8 caractere)</span><input class="in" name="password" type="password" autocomplete="new-password" minlength="8" required></label>
       <label class="f"><span>Repetă parola</span><input class="in" name="password2" type="password" autocomplete="new-password" required></label>`, 'Creează contul');
    form.onsubmit = e => {
      e.preventDefault();
      if (form.password.value !== form.password2.value) return toast('Parolele nu coincid.', true);
      busy($('button', form), async () => {
        const { user } = await api('setup', { method: 'POST', body: { name: form.name.value, email: form.email.value, password: form.password.value } });
        S.me = user; toast('Site-ul a fost configurat.'); await showApp();
      });
    };
  }
  function showLogin() {
    S.me = null;
    const form = authScreen('Administrare', 'Autentificare separată, doar pentru conturile cu rol de administrator.',
      `<label class="f"><span>Email</span><input class="in" name="email" type="email" autocomplete="username" required></label>
       <label class="f"><span>Parolă</span><input class="in" name="password" type="password" autocomplete="current-password" required></label>`, 'Intră');
    form.onsubmit = e => {
      e.preventDefault();
      busy($('button', form), async () => {
        try {
          const { user } = await api('admin/login', { method: 'POST', body: { email: form.email.value, password: form.password.value } });
          S.me = user; await showApp();
        } catch (err) { form.password.value = ''; throw err; }
      });
    };
  }

  /* ======================================================  shell */
  const TABS = [['noutati', 'Noutăți'], ['orar', 'Orar'], ['supliniri', 'Supliniri'], ['profesori', 'Profesori'], ['utilizatori', 'Utilizatori'], ['contact', 'Contact'], ['linkuri', 'Linkuri']];
  const currentTab = () => { const t = location.hash.slice(1); return TABS.some(x => x[0] === t) ? t : 'noutati'; };
  async function showApp() {
    app.innerHTML = `<header class="bar"><h1><img class="logo" src="../assets/sigla.png" alt="">CMV · Administrare</h1>
      <nav class="tabs">${TABS.map(([k, l]) => `<a href="#${k}" data-tab="${k}">${l}</a>`).join('')}</nav>
      <div class="who"><span class="who-name">${esc(S.me.name)}</span><a class="who-site" href="../" target="_blank" rel="noopener">Vezi site-ul</a>${themeSwitch()}<button type="button" class="logout">Ieșire</button></div>
      </header><main id="main"><p class="empty">Se încarcă…</p></main>`;
    applyTheme();
    $('.logout').onclick = e => busy(e.currentTarget, async () => { await api('admin/logout', { method: 'POST' }).catch(() => {}); token.set(null); showLogin(); });
    await busy(null, loadTimetable);
    if (!S.tt) return;
    render();
  }
  addEventListener('hashchange', () => { if (S.me && S.tt) render(); });
  function render() {
    const t = currentTab();
    $$('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === t));
    document.title = `${TABS.find(x => x[0] === t)[1]} · Administrare CMV`;
    VIEWS[t]($('#main'));
  }

  const VIEWS = {};

  /* ======================================================  news */
  VIEWS.noutati = main => {
    let editing = null;
    main.innerHTML = `<div class="cols">
      <section class="card"><h2 id="nf-title">Postează o noutate</h2><p class="sub">Apare imediat pe pagina Noutăți a site-ului.</p>
        <form class="form" id="nf" novalidate>
          <label class="f"><span>Titlu</span><input class="in" name="title" maxlength="255" required></label>
          <label class="f"><span>Data</span><div class="date-row"><input class="in" type="date" name="date" required><button class="btn ghost" type="button" data-today>Azi</button></div></label>
          <label class="f"><span>Text</span><textarea class="in" name="body" maxlength="60000"></textarea></label>
          <p class="hint">Rândurile noi se păstrează. Scrie **text** pentru îngroșat. Linkurile și adresele de email devin automat clicabile.</p>
          <div class="preview" id="nprev"></div>
          <div class="files-edit" id="nfiles"></div>
          <label class="f"><span>Adaugă imagini sau documente</span>
            <input class="in" type="file" name="files[]" multiple accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.rtf,.zip"></label>
          <p class="hint">Imaginile apar ca miniaturi, celelalte fișiere ca butoane de descărcare.</p>
          <div class="actions"><button class="btn" type="submit" id="nsave">Publică</button><button class="btn ghost" type="button" id="ncancel" hidden>Renunță la editare</button></div>
        </form></section>
      <section class="card"><h2>Noutăți publicate</h2><p class="sub">Cele mai noi primele.</p><div class="list" id="nlist"><p class="empty">Se încarcă…</p></div></section>
    </div>`;
    const form = $('#nf');
    const reset = () => {
      editing = null; form.reset(); form.date.value = iso(new Date());
      $('#nf-title').textContent = 'Postează o noutate'; $('#nsave').textContent = 'Publică'; $('#ncancel').hidden = true;
      $('#nfiles').innerHTML = ''; $('#nprev').innerHTML = ''; drawList();
    };
    form.body.oninput = () => { $('#nprev').innerHTML = F.body(form.body.value); };
    $('#ncancel').onclick = reset;
    function drawList() {
      $('#nlist').innerHTML = S.news.length ? S.news.map(n => `
        <div class="item${editing && editing.id === n.id ? ' editing' : ''}"><div class="grow"><b>${esc(n.title)}</b>
          <small>${esc(F.longDate(n.date))}${n.files.length ? ` · ${n.files.length} fișier${n.files.length === 1 ? '' : 'e'}` : ''}</small></div>
          <button class="btn ghost sm" type="button" data-edit="${n.id}">Editează</button>
          <button class="btn danger sm" type="button" data-del="${n.id}">Șterge</button></div>`).join('')
        : '<p class="empty">Nicio noutate publicată.</p>';
    }
    $('#nlist').onclick = e => {
      const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
      if (ed) {
        editing = S.news.find(n => n.id === +ed.dataset.edit);
        form.title.value = editing.title; form.date.value = editing.date; form.body.value = editing.body; form.body.oninput();
        $('#nfiles').innerHTML = editing.files.length ? `<p class="hint">Bifează fișierele pe care vrei să le elimini:</p>` + editing.files.map(f => `
          <label><input type="checkbox" name="remove_files[]" value="${f.id}">${f.kind === 'image' ? `<img src="${esc(f.url)}" alt="">` : '📄'}<span>${esc(f.name)}</span></label>`).join('') : '';
        $('#nf-title').textContent = 'Editează noutatea'; $('#nsave').textContent = 'Salvează modificările'; $('#ncancel').hidden = false;
        drawList(); form.title.focus(); scrollTo({ top: 0, behavior: 'smooth' });
      } else if (del) {
        const n = S.news.find(x => x.id === +del.dataset.del);
        if (!confirm(`Ștergi definitiv noutatea „${n.title}” și fișierele ei?`)) return;
        busy(del, async () => { await api('admin/news/delete', { method: 'POST', body: { id: n.id } }); toast('Noutatea a fost ștearsă.'); await load(); if (editing && editing.id === n.id) reset(); });
      }
    };
    form.onsubmit = e => {
      e.preventDefault();
      if (!form.title.value.trim()) return toast('Completează titlul.', true);
      const fd = new FormData(form);
      if (editing) fd.append('id', editing.id);
      busy($('#nsave'), async () => {
        await api('admin/news/save', { method: 'POST', form: fd });
        toast(editing ? 'Modificările au fost salvate.' : 'Noutatea a fost publicată.');
        await load(); reset();
      });
    };
    async function load() { S.news = (await api('news')).news; drawList(); }
    reset();
    busy(null, load);
  };

  /* ======================================================  timetable */
  VIEWS.orar = main => {
    main.innerHTML = `
      <section class="card"><h2>Orarul publicat</h2><div id="tstat"></div></section>
      <section class="card"><h2>Încarcă un orar nou</h2>
        <p class="sub">În aSc Orare: <b>Fișier → Export → aSc Timetables XML</b> (sau „Export XML”). Fișierul înlocuiește complet orarul de acum: clase, profesori, materii, săli și ore.</p>
        <form class="form" id="tf" novalidate>
          <div class="row">
            <label class="f"><span>Fișierul XML din aSc</span><input class="in" type="file" name="file" accept=".xml,text/xml,application/xml" required></label>
            <label class="f"><span>Valabil din</span><div class="date-row"><input class="in" type="date" name="valid_from" required><button class="btn ghost" type="button" data-today>Azi</button></div></label>
          </div>
          <div class="actions"><button class="btn" type="submit" id="tsave">Încarcă orarul</button></div>
        </form>
        <div id="tres"></div>
      </section>
      <section class="card"><h2>Verifică orarul</h2><p class="sub">Așa apare orarul unei clase pe site.</p>
        <label class="f" style="max-width:260px"><span>Clasa</span><select class="in" id="tcls"></select></label>
        <div class="tbl-wrap" style="margin-top:14px"><div id="tprev"></div></div>
      </section>`;
    const form = $('#tf');
    form.valid_from.value = iso(new Date());
    function drawStatus() {
      const t = S.tt;
      if (!t.classes.length) { $('#tstat').innerHTML = '<p class="empty">Nu a fost încărcat încă niciun orar.</p>'; }
      else {
        const lessons = Object.values(t.entries).reduce((n, r) => n + r.length, 0);
        $('#tstat').innerHTML = `<p class="sub">Valabil din <b>${esc(F.shortDate(t.validFrom))}</b> · încărcat ${esc(fmtStamp(t.importedAt))}${t.source ? ` din <b>${esc(t.source)}</b>` : ''}</p>
          <div class="stats">${[[t.classes.length, 'clase'], [t.teachers.length, 'profesori'], [t.subjects.length, 'materii'], [t.rooms.length, 'săli'], [t.periods.length, 'ore pe zi'], [lessons, 'ore în orar']].map(([n, l]) => `<div class="stat"><b>${n}</b><small>${l}</small></div>`).join('')}</div>`;
      }
      const sel = $('#tcls'), keep = sel.value;
      sel.innerHTML = t.classes.map(c => `<option>${esc(c.name)}</option>`).join('') || '<option value="">—</option>';
      if (t.classes.some(c => c.name === keep)) sel.value = keep;
      drawPreview();
    }
    function drawPreview() {
      const cls = $('#tcls').value, P = S.tt.periods;
      if (!cls) { $('#tprev').innerHTML = ''; return; }
      const nDays = Math.max(5, S.tt.days || 5), labels = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
      let html = '<div class="h"></div>' + P.map(p => `<div class="h">${p.period}<small>${esc(p.start ? `${p.start}–${p.end}` : '')}</small></div>`).join('');
      for (let d = 0; d < nDays; d++) {
        html += `<div class="h">${labels[d]}</div>` + P.map(p => {
          const list = S.slot.get(`${cls}|${d}|${p.period}`) || [];
          return `<div title="${esc(list.map(e => `${subjectName(e.sub)} – ${e.tch}${e.room ? `, ${e.room}` : ''}`).join('\n'))}">${list.map(e => `${esc(e.sub)}${e.grp ? ` <small>${esc(e.grp)}</small>` : ''}<small>${esc(e.tch)}</small>`).join('')}</div>`;
        }).join('');
      }
      $('#tprev').innerHTML = `<div class="ttp" style="grid-template-columns:60px repeat(${P.length},1fr)">${html}</div>`;
    }
    $('#tcls').onchange = drawPreview;
    form.onsubmit = e => {
      e.preventDefault();
      if (!form.file.files.length) return toast('Alege fișierul XML.', true);
      if (S.tt.classes.length && !confirm('Orarul actual va fi înlocuit complet. Continui?')) return;
      busy($('#tsave'), async () => {
        const r = await api('admin/timetable/import', { method: 'POST', form: new FormData(form) });
        const s = r.summary;
        $('#tres').innerHTML = `<div class="msg ok" style="margin-top:14px"><b>Orarul a fost încărcat.</b> ${s.classes} clase, ${s.teachers} profesori, ${s.subjects} materii, ${s.rooms} săli, ${s.entries} ore.
          ${r.warnings.length ? `<ul>${r.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}</div>`;
        form.file.value = '';
        await loadTimetable(); drawStatus(); toast('Orarul a fost actualizat pe site.');
      });
    };
    drawStatus();
  };

  /* ======================================================  substitutions */
  VIEWS.supliniri = main => {
    const T = S.tt, hasTT = T.classes.length > 0;
    let editId = null;
    main.innerHTML = `
      <section class="card"><h2>Supliniri</h2>
        <div class="row" style="max-width:520px;margin:10px 0 16px"><label class="f"><span>Ziua</span><div class="date-row"><input class="in" type="date" id="sdate"><button class="btn ghost" type="button" data-today>Azi</button></div></label></div>
        <div id="slist"></div></section>
      <div class="stack">
        <section class="card"><h2>Profesor absent</h2>
          <p class="sub">${hasTT ? 'Alege profesorul: apar orele lui din ziua aleasă, iar tu completezi înlocuitorii.' : 'Încarcă întâi orarul (fila Orar) ca să poți genera suplinirile din orele profesorului.'}</p>
          ${hasTT ? `<label class="f narrow"><span>Profesorul absent</span><select class="in" id="sabs"><option value="">Alege…</option>${T.teachers.map(t => `<option value="${esc(t.code)}">${esc(t.name)} (${esc(t.code)})</option>`).join('')}</select></label>
          <div id="slessons" style="margin-top:14px"></div>` : ''}
        </section>
        <section class="card"><h2 id="sm-title">Adaugă manual</h2><p class="sub">Pentru orice suplinire, inclusiv cele care nu reies din orar.</p>
          <form class="form narrow" id="sm" novalidate>
            <div class="row">
              <label class="f"><span>Ora</span>${T.periods.length ? `<select class="in" name="period" required><option value="">—</option>${T.periods.map(p => `<option value="${p.period}">${p.period}${p.start ? ` (${p.start}–${p.end})` : ''}</option>`).join('')}</select>` : '<input class="in" name="period" type="number" min="0" max="20" required>'}</label>
              <label class="f"><span>Clasa</span><input class="in" name="class_name" list="dl-classes" required autocomplete="off"></label>
            </div>
            <label class="f"><span>Profesor absent</span><input class="in" name="absent_name" list="dl-teachers" required autocomplete="off"></label>
            <label class="f"><span>Înlocuitor</span><input class="in" name="substitute_name" list="dl-teachers" required autocomplete="off"></label>
            <div class="row">
              <label class="f"><span>Disciplina</span><input class="in" name="subject" list="dl-subjects" autocomplete="off"></label>
              <label class="f"><span>Sala</span><input class="in" name="room" list="dl-rooms" autocomplete="off"></label>
            </div>
            <label class="f"><span>Observații</span><input class="in" name="note" maxlength="255"></label>
            <div class="actions"><button class="btn" type="submit" id="smsave">Adaugă suplinirea</button><button class="btn ghost" type="button" id="smcancel" hidden>Renunță</button></div>
          </form></section>
      </div>
      <datalist id="dl-classes">${T.classes.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>
      <datalist id="dl-teachers">${T.teachers.map(t => `<option value="${esc(t.name)}">`).join('')}</datalist>
      <datalist id="dl-subjects">${T.subjects.map(s => `<option value="${esc(s.name)}">`).join('')}</datalist>
      <datalist id="dl-rooms">${T.rooms.map(r => `<option value="${esc(r)}">`).join('')}</datalist>`;

    const dateIn = $('#sdate');
    dateIn.value = S.subsDate;
    dateIn.onchange = () => { if (!dateIn.value) return; S.subsDate = dateIn.value; loadDay(); };

    async function loadDay() {
      $('#slist').innerHTML = '<p class="empty">Se încarcă…</p>';
      await busy(null, async () => {
        S.subs = (await api('substitutions', { params: { from: S.subsDate, to: S.subsDate } })).substitutions;
        drawList(); drawLessons();
      });
    }
    function drawList() {
      const d = parseIso(S.subsDate);
      $('#slist').innerHTML = `<p class="sub"><b>${DOW_LONG[d.getDay()]}, ${F.shortDate(S.subsDate)}</b> · ${S.subs.length ? `${S.subs.length} ${S.subs.length === 1 ? 'suplinire' : 'supliniri'}` : 'nicio suplinire'}</p>` +
        (S.subs.length ? `<div class="tbl-wrap"><table><thead><tr><th>Ora</th><th>Clasa</th><th>Absent</th><th>Înlocuitor</th><th>Disciplina</th><th>Sala</th><th>Obs.</th><th></th></tr></thead><tbody>${S.subs.map(s => `
          <tr><td><b>${s.period}</b></td><td>${esc(s.class_name)}</td><td>${esc(s.absent_name)}</td><td><b>${esc(s.substitute_name)}</b></td><td>${esc(subjectName(s.subject))}</td><td>${esc(s.room)}</td><td>${esc(s.note)}</td>
          <td><div class="actions" style="flex-wrap:nowrap"><button class="btn ghost sm" type="button" data-edit="${s.id}">Editează</button><button class="btn danger sm" type="button" data-del="${s.id}">Șterge</button></div></td></tr>`).join('')}</tbody></table></div>` : '');
    }
    $('#slist').onclick = e => {
      const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
      if (del) {
        if (!confirm('Ștergi această suplinire?')) return;
        busy(del, async () => { await api('admin/subs/delete', { method: 'POST', body: { id: +del.dataset.del } }); toast('Suplinirea a fost ștearsă.'); await loadDay(); });
      } else if (ed) {
        const s = S.subs.find(x => x.id === +ed.dataset.edit), f = $('#sm');
        editId = s.id;
        f.period.value = s.period; f.class_name.value = s.class_name; f.absent_name.value = s.absent_name; f.substitute_name.value = s.substitute_name;
        f.subject.value = subjectName(s.subject); f.room.value = s.room; f.note.value = s.note;
        $('#sm-title').textContent = 'Editează suplinirea'; $('#smsave').textContent = 'Salvează'; $('#smcancel').hidden = false;
        f.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // teachers who are free at this period (no class in the timetable and not already substituting)
    function freeAt(day, period) {
      const busySet = new Set(S.busy.get(`${day}|${period}`) || []);
      S.subs.filter(s => s.period === period).forEach(s => { if (s.substitute_code) busySet.add(s.substitute_code); });
      return busySet;
    }
    function drawLessons() {
      const box = $('#slessons'); if (!box) return;
      const code = $('#sabs').value;
      if (!code) { box.innerHTML = ''; return; }
      const day = dayIndex(S.subsDate);
      const lessons = (S.byTeacher.get(code) || []).filter(e => e.day === day).sort((a, b) => a.period - b.period);
      if (!lessons.length) { box.innerHTML = `<p class="empty">${esc(teacher(code).name)} nu are ore ${DOW_LONG[parseIso(S.subsDate).getDay()].toLowerCase()} conform orarului.</p>`; return; }
      box.innerHTML = `<div class="tbl-wrap"><table><thead><tr><th>Inclus</th><th>Ora</th><th>Clasa</th><th>Materia</th><th>Înlocuitor</th><th>Sala</th><th>Obs.</th></tr></thead><tbody>${lessons.map((e, i) => {
        const done = S.subs.find(s => s.period === e.period && s.class_name === e.cls && s.absent_code === code);
        const taken = freeAt(day, e.period);
        const others = T.teachers.filter(t => t.code !== code);
        const free = others.filter(t => !taken.has(t.code)), occupied = others.filter(t => taken.has(t.code));
        return `<tr data-i="${i}"${done ? ' class="off" title="Există deja o suplinire pentru această oră"' : ''}>
          <td><input type="checkbox" class="pick"${done ? '' : ' checked'} aria-label="Include ora ${e.period}"></td>
          <td class="nowrap"><b>${e.period}</b><br><small>${esc(periodTime(e.period))}</small></td>
          <td>${esc(e.cls)}${e.grp ? `<br><small>${esc(e.grp)}</small>` : ''}</td>
          <td>${esc(subjectName(e.sub))}</td>
          <td><select class="in repl" style="min-width:200px"><option value="">Alege…</option>
            <optgroup label="Liberi la ora ${e.period}">${free.map(t => `<option value="${esc(t.code)}">${esc(t.name)}</option>`).join('')}</optgroup>
            <optgroup label="Au oră atunci">${occupied.map(t => `<option value="${esc(t.code)}">${esc(t.name)}</option>`).join('')}</optgroup></select></td>
          <td><input class="in room" value="${esc(e.room)}" list="dl-rooms" style="min-width:90px"></td>
          <td><input class="in note" maxlength="255" style="min-width:110px"></td></tr>`;
      }).join('')}</tbody></table></div>
      <div class="actions" style="margin-top:14px"><button class="btn" type="button" id="sbatch">Salvează suplinirile bifate</button></div>`;
      $('#sbatch').onclick = ev => {
        const items = [];
        for (const tr of $$('tbody tr', box)) {
          if (!$('.pick', tr).checked) continue;
          const e = lessons[+tr.dataset.i], repl = $('.repl', tr).value;
          if (!repl) return toast(`Alege înlocuitorul pentru ora ${e.period} (clasa ${e.cls}).`, true);
          items.push({ date: S.subsDate, period: e.period, class_name: e.cls, absent_code: code, absent_name: teacher(code).name,
            substitute_code: repl, substitute_name: teacher(repl).name, subject: e.sub, room: $('.room', tr).value, note: $('.note', tr).value });
        }
        if (!items.length) return toast('Bifează cel puțin o oră.', true);
        busy(ev.currentTarget, async () => {
          await api('admin/subs/save', { method: 'POST', body: { items } });
          toast(`${items.length} ${items.length === 1 ? 'suplinire salvată' : 'supliniri salvate'}.`);
          await loadDay();
        });
      };
    }
    if ($('#sabs')) $('#sabs').onchange = drawLessons;

    // manual form: picking class + period fills in what the timetable says for that slot
    const mf = $('#sm');
    const prefill = () => {
      if (editId || !mf.class_name.value || mf.period.value === '') return;
      const list = S.slot.get(`${mf.class_name.value.trim()}|${dayIndex(S.subsDate)}|${+mf.period.value}`);
      if (!list || !list.length) return;
      const e = list[0], first = e.tch.split(',')[0];
      if (!mf.absent_name.value && teacher(first)) mf.absent_name.value = teacher(first).name;
      if (!mf.subject.value) mf.subject.value = subjectName(e.sub);
      if (!mf.room.value) mf.room.value = e.room;
    };
    mf.class_name.addEventListener('change', prefill);
    mf.period.addEventListener('change', prefill);
    const resetManual = () => { editId = null; mf.reset(); $('#sm-title').textContent = 'Adaugă manual'; $('#smsave').textContent = 'Adaugă suplinirea'; $('#smcancel').hidden = true; };
    $('#smcancel').onclick = resetManual;
    mf.onsubmit = e => {
      e.preventDefault();
      const absent = teacherByName(mf.absent_name.value), sub = teacherByName(mf.substitute_name.value);
      const item = {
        date: S.subsDate, period: mf.period.value, class_name: mf.class_name.value,
        absent_code: absent ? absent.code : '', absent_name: mf.absent_name.value, substitute_code: sub ? sub.code : '', substitute_name: mf.substitute_name.value,
        subject: mf.subject.value ? subjectCode(mf.subject.value) : '', room: mf.room.value, note: mf.note.value
      };
      if (editId) item.id = editId;
      busy($('#smsave'), async () => {
        await api('admin/subs/save', { method: 'POST', body: { items: [item] } });
        toast(editId ? 'Suplinirea a fost actualizată.' : 'Suplinirea a fost adăugată.');
        resetManual(); await loadDay();
      });
    };
    loadDay();
  };

  /* ======================================================  users */
  const ROLE = { elev: 'Elev', profesor: 'Profesor', admin: 'Admin' };
  function genPassword() {
    const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const r = crypto.getRandomValues(new Uint32Array(12));
    return [...r].map(n => abc[n % abc.length]).join('');
  }
  VIEWS.utilizatori = main => {
    const T = S.tt;
    let editing = null, filter = '', query = '';
    main.innerHTML = `<div class="cols">
      <section class="card"><h2 id="uf-title">Utilizator nou</h2><p class="sub">Elevii și profesorii intră pe site din pagina Cont; adminii au acces și aici.</p>
        <form class="form" id="uf" novalidate autocomplete="off">
          <label class="f"><span>Nume complet</span><input class="in" name="name" maxlength="120" required></label>
          <label class="f"><span>Email (folosit la autentificare)</span><input class="in" name="email" type="email" maxlength="190" required></label>
          <label class="f"><span>Rol</span><select class="in" name="role">${Object.entries(ROLE).map(([k, l]) => `<option value="${k}">${l === 'Admin' ? 'Administrator' : l}</option>`).join('')}</select></label>
          <label class="f" data-for="elev"><span>Clasa</span>${T.classes.length
            ? `<select class="in" name="class_name"><option value="">—</option>${T.classes.map(c => `<option>${esc(c.name)}</option>`).join('')}</select>`
            : '<input class="in" name="class_name" maxlength="60" placeholder="ex. IX A">'}</label>
          <label class="f" data-for="profesor"><span>Profesorul din orar</span>${T.teachers.length
            ? `<select class="in" name="teacher_code"><option value="">—</option>${T.teachers.map(t => `<option value="${esc(t.code)}">${esc(t.name)} (${esc(t.code)})</option>`).join('')}</select>`
            : '<input class="in" name="teacher_code" maxlength="30" placeholder="codul din orar, ex. PD">'}</label>
          <label class="f"><span id="pw-label">Parolă (minim 8 caractere)</span>
            <div class="pw"><input class="in" name="password" type="text" maxlength="72" autocomplete="new-password" spellcheck="false"><button class="btn ghost" type="button" id="ugen">Generează</button></div></label>
          <label class="check"><input type="checkbox" name="active" checked> Cont activ (poate intra în cont)</label>
          <div class="actions"><button class="btn" type="submit" id="usave">Creează contul</button><button class="btn ghost" type="button" id="ucancel" hidden>Renunță la editare</button></div>
          <div id="ures"></div>
        </form></section>
      <section class="card"><h2>Conturi</h2>
        <div class="row" style="margin:10px 0 14px">
          <input class="in" id="uq" type="search" placeholder="Caută după nume sau email…" aria-label="Caută">
          <select class="in" id="urole" aria-label="Filtrează după rol"><option value="">Toate rolurile</option>${Object.entries(ROLE).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
        </div>
        <div id="ulist"><p class="empty">Se încarcă…</p></div></section>
    </div>`;
    const form = $('#uf');
    const syncRole = () => $$('[data-for]', form).forEach(l => { l.hidden = l.dataset.for !== form.role.value; });
    form.role.onchange = syncRole;
    $('#ugen').onclick = () => { form.password.value = genPassword(); form.password.select(); };
    const reset = () => {
      editing = null; form.reset(); syncRole();
      $('#uf-title').textContent = 'Utilizator nou'; $('#usave').textContent = 'Creează contul'; $('#ucancel').hidden = true;
      $('#pw-label').textContent = 'Parolă (minim 8 caractere)'; draw();
    };
    $('#ucancel').onclick = () => { reset(); $('#ures').innerHTML = ''; };
    function draw() {
      const q = query.trim().toLowerCase();
      const list = S.users.filter(u => (!filter || u.role === filter) && (!q || u.name.toLowerCase().includes(q) || u.email.includes(q)));
      $('#ulist').innerHTML = list.length ? `<div class="tbl-wrap"><table><thead><tr><th>Nume</th><th>Rol</th><th>Clasă / cod</th><th>Ultima intrare</th><th></th></tr></thead><tbody>${list.map(u => `
        <tr class="${u.active ? '' : 'off'}"><td><b>${esc(u.name)}</b><br><small>${esc(u.email)}</small>${u.active ? '' : '<br><small>dezactivat</small>'}</td>
        <td><span class="pill ${u.role}">${ROLE[u.role]}</span></td>
        <td>${esc(u.role === 'elev' ? u.class_name || '—' : u.role === 'profesor' ? u.teacher_code || '—' : '')}</td>
        <td><small>${esc(fmtStamp(u.last_login))}</small></td>
        <td><div class="actions" style="flex-wrap:nowrap"><button class="btn ghost sm" type="button" data-edit="${u.id}">Editează</button>${u.id === S.me.id ? '' : `<button class="btn danger sm" type="button" data-del="${u.id}">Șterge</button>`}</div></td></tr>`).join('')}</tbody></table></div>`
        : `<p class="empty">${S.users.length ? 'Niciun cont nu corespunde filtrului.' : 'Niciun cont.'}</p>`;
      const PLURAL = { elev: 'elevi', profesor: 'profesori', admin: 'administratori' };
      const counts = Object.keys(ROLE).map(r => `${S.users.filter(u => u.role === r).length} ${PLURAL[r]}`);
      $('#ulist').insertAdjacentHTML('afterbegin', `<p class="hint" style="margin-bottom:8px">${S.users.length} conturi: ${counts.join(', ')}</p>`);
    }
    $('#uq').oninput = e => { query = e.target.value; draw(); };
    $('#urole').onchange = e => { filter = e.target.value; draw(); };
    $('#ulist').onclick = e => {
      const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
      if (ed) {
        editing = S.users.find(u => u.id === +ed.dataset.edit);
        form.name.value = editing.name; form.email.value = editing.email; form.role.value = editing.role;
        form.class_name.value = editing.class_name || ''; form.teacher_code.value = editing.teacher_code || '';
        form.password.value = ''; form.active.checked = editing.active; syncRole();
        $('#uf-title').textContent = 'Editează contul'; $('#usave').textContent = 'Salvează'; $('#ucancel').hidden = false;
        $('#pw-label').textContent = 'Parolă nouă (lasă gol ca să rămână cea veche)'; $('#ures').innerHTML = '';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (del) {
        const u = S.users.find(x => x.id === +del.dataset.del);
        if (!confirm(`Ștergi definitiv contul lui ${u.name} (${u.email})?`)) return;
        busy(del, async () => { await api('admin/users/delete', { method: 'POST', body: { id: u.id } }); toast('Contul a fost șters.'); if (editing && editing.id === u.id) reset(); await load(); });
      }
    };
    form.onsubmit = e => {
      e.preventDefault();
      const body = { name: form.name.value, email: form.email.value, role: form.role.value, class_name: form.class_name.value, teacher_code: form.teacher_code.value, password: form.password.value, active: form.active.checked };
      if (editing) body.id = editing.id;
      const wasNew = !editing, pass = form.password.value;
      busy($('#usave'), async () => {
        const { user } = await api('admin/users/save', { method: 'POST', body });
        await load(); reset();
        $('#ures').innerHTML = `<div class="msg ok">${wasNew ? `Contul pentru <b>${esc(user.name)}</b> a fost creat.` : `Contul lui <b>${esc(user.name)}</b> a fost actualizat.`}
          ${pass ? `<br>Comunică-i datele de intrare: <b>${esc(user.email)}</b> / <b>${esc(pass)}</b>. Parola nu mai poate fi văzută după ce închizi pagina.` : ''}</div>`;
      });
    };
    async function load() { S.users = (await api('admin/users')).users; draw(); }
    reset();
    busy(null, load);
  };

  /* ======================================================  teachers */
  VIEWS.profesori = main => {
    let editing = null, query = '';
    main.innerHTML = `<div class="cols">
      <section class="card"><h2 id="pf-title">Profesor nou</h2>
        <p class="sub">Apare pe pagina Profesori a site-ului și poate fi ales la supliniri și la conturile de profesor. La importul orarului din aSc, profesorii noi se adaugă singuri; cei de aici nu se șterg.</p>
        <form class="form" id="pf" novalidate autocomplete="off">
          <label class="f"><span>Nume complet</span><input class="in" name="name" maxlength="120" required placeholder="ex. Pop Daniel"></label>
          <label class="f"><span>Cod (prescurtarea din orar)</span><input class="in" name="code" maxlength="30" required placeholder="ex. PD" spellcheck="false"></label>
          <p class="hint">Codul trebuie să fie același ca în aSc Orare, ca orele din orar să fie legate de acest profesor. Dacă schimbi codul, se actualizează și în orar, supliniri și conturi.</p>
          <div class="actions"><button class="btn" type="submit" id="psave">Adaugă profesorul</button><button class="btn ghost" type="button" id="pcancel" hidden>Renunță la editare</button></div>
        </form></section>
      <section class="card"><h2>Profesori</h2>
        <input class="in" id="pq" type="search" placeholder="Caută după nume sau cod…" aria-label="Caută" style="margin:10px 0 14px">
        <div id="plist"></div></section>
    </div>`;
    const form = $('#pf');
    const reset = () => {
      editing = null; form.reset();
      $('#pf-title').textContent = 'Profesor nou'; $('#psave').textContent = 'Adaugă profesorul'; $('#pcancel').hidden = true; draw();
    };
    $('#pcancel').onclick = reset;
    $('#pq').oninput = e => { query = e.target.value; draw(); };
    const hours = code => (S.byTeacher.get(code) || []).length;
    function draw() {
      const q = query.trim().toLowerCase();
      const list = S.tt.teachers.filter(t => !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
      $('#plist').innerHTML = `<p class="hint" style="margin-bottom:8px">${S.tt.teachers.length} profesori</p>` + (list.length
        ? `<div class="tbl-wrap"><table><thead><tr><th>Nume</th><th>Cod</th><th>Ore / săpt.</th><th></th></tr></thead><tbody>${list.map(t => `
          <tr${editing && editing.id === t.id ? ' class="editing"' : ''}><td><b>${esc(t.name)}</b></td><td><span class="pill">${esc(t.code)}</span></td><td>${hours(t.code) || '<small>—</small>'}</td>
          <td><div class="actions" style="flex-wrap:nowrap"><button class="btn ghost sm" type="button" data-edit="${t.id}">Editează</button><button class="btn danger sm" type="button" data-del="${t.id}">Șterge</button></div></td></tr>`).join('')}</tbody></table></div>`
        : `<p class="empty">${S.tt.teachers.length ? 'Niciun profesor nu corespunde căutării.' : 'Niciun profesor. Adaugă-i aici sau încarcă orarul.'}</p>`);
    }
    $('#plist').onclick = e => {
      const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
      if (ed) {
        editing = S.tt.teachers.find(t => t.id === +ed.dataset.edit);
        form.name.value = editing.name; form.code.value = editing.code;
        $('#pf-title').textContent = 'Editează profesorul'; $('#psave').textContent = 'Salvează'; $('#pcancel').hidden = false;
        draw(); form.name.focus(); scrollTo({ top: 0, behavior: 'smooth' });
      } else if (del) {
        const t = S.tt.teachers.find(x => x.id === +del.dataset.del), h = hours(t.code);
        const warn = h ? `\n\nAtenție: are ${h} ore în orarul actual. Orele rămân în orar, dar vor apărea doar cu codul „${t.code}”, iar la următorul import din aSc profesorul va fi adăugat din nou.` : '';
        if (!confirm(`Ștergi profesorul ${t.name} (${t.code})?${warn}`)) return;
        busy(del, async () => { await api('admin/teachers/delete', { method: 'POST', body: { id: t.id } }); toast('Profesorul a fost șters.'); if (editing && editing.id === t.id) editing = null; await reload(); });
      }
    };
    form.onsubmit = e => {
      e.preventDefault();
      const body = { name: form.name.value, code: form.code.value.trim() };
      if (editing) body.id = editing.id;
      const wasEdit = !!editing;
      busy($('#psave'), async () => {
        await api('admin/teachers/save', { method: 'POST', body });
        toast(wasEdit ? 'Profesorul a fost actualizat.' : 'Profesorul a fost adăugat.');
        reset(); await reload();
      });
    };
    async function reload() { await loadTimetable(); draw(); }
    reset();
  };

  /* ======================================================  contact & organisation */
  VIEWS.contact = main => {
    main.innerHTML = '<p class="empty">Se încarcă…</p>';
    busy(null, async () => {
      const site = await api('site');
      const s = site.school, GR = site.grads;
      let org = site.organization.map(g => ({ role: g.role, people: g.people.join('\n'), grad: g.grad }));
      main.innerHTML = `<form id="cf" novalidate class="stack">
        <section class="card"><h2>Date de contact</h2><p class="sub">Apar pe paginile Contact și Hartă și pe ultimul ecran din Despre.</p>
          <div class="form">
            <label class="f"><span>Numele școlii</span><input class="in" name="name" maxlength="160" required value="${esc(s.name)}"></label>
            <div class="row">
              <label class="f"><span>Email școală</span><input class="in" name="emailSchool" type="email" maxlength="190" value="${esc(s.emailSchool)}"></label>
              <label class="f"><span>Email administrație</span><input class="in" name="emailAdmin" type="email" maxlength="190" value="${esc(s.emailAdmin)}"></label>
              <label class="f"><span>Telefon</span><input class="in" name="phone" maxlength="60" value="${esc(s.phone)}"></label>
            </div>
            <label class="f"><span>Email administrator</span><input class="in" name="emailWebmaster" type="email" maxlength="190" value="${esc(s.emailWebmaster || '')}"></label>
            <label class="f"><span>Adresa</span><input class="in" name="address" maxlength="255" value="${esc(s.address)}"></label>
          </div></section>
        <section class="card"><h2>Social media</h2><p class="sub">Linkuri complete, care încep cu https://. Lasă gol dacă școala nu are pagină pe rețeaua respectivă.</p>
          <div class="row">
            <label class="f"><span>Facebook</span><input class="in" name="facebook" type="url" maxlength="300" placeholder="https://www.facebook.com/…" value="${esc(s.social.facebook)}"></label>
            <label class="f"><span>Instagram</span><input class="in" name="instagram" type="url" maxlength="300" placeholder="https://www.instagram.com/…" value="${esc(s.social.instagram)}"></label>
            <label class="f"><span>YouTube</span><input class="in" name="youtube" type="url" maxlength="300" placeholder="https://www.youtube.com/@…" value="${esc(s.social.youtube)}"></label>
          </div></section>
        <section class="card"><h2>Hartă</h2><p class="sub">Poziția școlii pe hartă. În Google Maps, click dreapta pe clădire: primul rând din meniu sunt coordonatele (latitudine, longitudine).</p>
          <div class="row">
            <label class="f"><span>Latitudine</span><input class="in" name="lat" inputmode="decimal" value="${esc(s.map.lat)}"></label>
            <label class="f"><span>Longitudine</span><input class="in" name="lng" inputmode="decimal" value="${esc(s.map.lng)}"></label>
            <label class="f"><span>Zoom (1–21)</span><input class="in" name="zoom" type="number" min="1" max="21" value="${esc(s.map.zoom)}"></label>
          </div></section>
        <section class="card"><h2>Organizare</h2><p class="sub">Echipa managerială de pe pagina Organizare. Câte o persoană pe rând.</p>
          <div class="list" id="org"></div>
          <div class="actions" style="margin-top:12px"><button class="btn ghost" type="button" id="oadd">+ Adaugă o funcție</button></div></section>
        <div class="actions"><button class="btn" type="submit" id="csave">Salvează toate modificările</button><a class="btn ghost" href="../#/contact" target="_blank" rel="noopener">Vezi pagina Contact</a></div>
      </form>`;
      const drawOrg = () => {
        $('#org').innerHTML = org.length ? org.map((g, i) => `
          <div class="item org-item" data-i="${i}" style="--pg:${GR[g.grad]}">
            <div class="grow form">
              <div class="row"><label class="f"><span>Funcția</span><input class="in" data-k="role" maxlength="80" value="${esc(g.role)}"></label>
                <label class="f"><span>Culoare</span><select class="in" data-k="grad">${GR.map((_, k) => `<option value="${k}"${k === g.grad ? ' selected' : ''}>Culoarea ${k + 1}</option>`).join('')}</select></label></div>
              <label class="f"><span>Persoane</span><textarea class="in" data-k="people" rows="3" style="min-height:84px">${esc(g.people)}</textarea></label>
            </div>
            <div class="org-tools">
              <button class="btn ghost sm" type="button" data-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="Mută mai sus">↑</button>
              <button class="btn ghost sm" type="button" data-move="1" ${i === org.length - 1 ? 'disabled' : ''} aria-label="Mută mai jos">↓</button>
              <button class="btn danger sm" type="button" data-remove aria-label="Șterge funcția">✕</button>
            </div></div>`).join('') : '<p class="empty">Nicio funcție. Pagina Organizare va fi goală.</p>';
      };
      $('#org').addEventListener('input', e => {
        const item = e.target.closest('[data-i]'), k = e.target.dataset.k; if (!item || !k) return;
        const g = org[+item.dataset.i]; g[k] = k === 'grad' ? +e.target.value : e.target.value;
        if (k === 'grad') item.style.setProperty('--pg', GR[g.grad]);
      });
      $('#org').addEventListener('click', e => {
        const item = e.target.closest('[data-i]'); if (!item) return; const i = +item.dataset.i;
        const mv = e.target.closest('[data-move]');
        if (mv) { const j = i + +mv.dataset.move; [org[i], org[j]] = [org[j], org[i]]; drawOrg(); }
        else if (e.target.closest('[data-remove]')) { if (confirm(`Ștergi funcția „${org[i].role || 'fără nume'}”?`)) { org.splice(i, 1); drawOrg(); } }
      });
      $('#oadd').onclick = () => { org.push({ role: '', people: '', grad: org.length % GR.length }); drawOrg(); $$('#org [data-k=role]').pop().focus(); };
      drawOrg();
      const form = $('#cf');
      form.onsubmit = e => {
        e.preventDefault();
        const v = n => form.elements[n].value;
        const body = {
          school: { name: v('name'), emailSchool: v('emailSchool'), emailAdmin: v('emailAdmin'), emailWebmaster: v('emailWebmaster'), phone: v('phone'), address: v('address'),
            social: { facebook: v('facebook'), instagram: v('instagram'), youtube: v('youtube') },
            map: { lat: v('lat').replace(',', '.'), lng: v('lng').replace(',', '.'), zoom: v('zoom') } },
          organization: org.map(g => ({ role: g.role, grad: g.grad, people: g.people.split('\n').map(p => p.trim()).filter(Boolean) }))
        };
        busy($('#csave'), async () => { await api('admin/site/save', { method: 'POST', body }); toast('Datele au fost salvate și apar acum pe site.'); });
      };
    });
  };

  /* ======================================================  "Altele" menu links */
  VIEWS.linkuri = main => {
    main.innerHTML = '<p class="empty">Se încarcă…</p>';
    busy(null, async () => {
      let links = (await api('site')).links.map(l => ({ ...l }));
      main.innerHTML = `<form id="lf" novalidate class="stack">
        <section class="card"><h2>Linkuri în meniul „Altele”</h2>
          <p class="sub">Apar în bara care se deschide sub „Altele”, după Hartă și Organizare, în ordinea de aici. Fiecare se deschide într-o filă nouă.</p>
          <div class="list" id="links"></div>
          <div class="actions" style="margin-top:12px"><button class="btn ghost" type="button" id="ladd">+ Adaugă un link</button></div></section>
        <div class="actions"><button class="btn" type="submit" id="lsave">Salvează linkurile</button><a class="btn ghost" href="../" target="_blank" rel="noopener">Vezi site-ul</a></div>
      </form>`;
      const draw = () => {
        $('#links').innerHTML = links.length ? links.map((l, i) => `
          <div class="item org-item link-item" data-i="${i}" style="--pg:linear-gradient(180deg,#6baab4,#5d6fae)">
            <div class="grow form"><div class="row">
              <label class="f"><span>Titlu</span><input class="in" data-k="title" maxlength="80" placeholder="ex. Proiecte europene" value="${esc(l.title)}"></label>
              <label class="f"><span>Link</span><input class="in" data-k="url" type="url" maxlength="500" placeholder="https://…" value="${esc(l.url)}"></label>
            </div></div>
            <div class="org-tools">
              <button class="btn ghost sm" type="button" data-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="Mută mai sus">↑</button>
              <button class="btn ghost sm" type="button" data-move="1" ${i === links.length - 1 ? 'disabled' : ''} aria-label="Mută mai jos">↓</button>
              <button class="btn danger sm" type="button" data-remove aria-label="Șterge linkul">✕</button>
            </div></div>`).join('') : '<p class="empty">Niciun link. În „Altele” vor rămâne doar Hartă și Organizare.</p>';
      };
      $('#links').addEventListener('input', e => {
        const item = e.target.closest('[data-i]'), k = e.target.dataset.k; if (item && k) links[+item.dataset.i][k] = e.target.value;
      });
      $('#links').addEventListener('click', e => {
        const item = e.target.closest('[data-i]'); if (!item) return; const i = +item.dataset.i;
        const mv = e.target.closest('[data-move]');
        if (mv) { const j = i + +mv.dataset.move; [links[i], links[j]] = [links[j], links[i]]; draw(); }
        else if (e.target.closest('[data-remove]')) { if (confirm(`Ștergi linkul „${links[i].title || 'fără titlu'}”?`)) { links.splice(i, 1); draw(); } }
      });
      $('#ladd').onclick = () => { links.push({ title: '', url: '' }); draw(); $$('#links [data-k=title]').pop().focus(); };
      draw();
      $('#lf').onsubmit = e => {
        e.preventDefault();
        const body = { links: links.map(l => ({ title: l.title.trim(), url: l.url.trim() })) };
        busy($('#lsave'), async () => { await api('admin/links/save', { method: 'POST', body }); toast('Linkurile au fost salvate și apar acum în meniul „Altele”.'); });
      };
    });
  };

  /* ======================================================  boot */
  (async () => {
    try {
      const { needed } = await api('setup');
      if (needed) return showSetup();
      const { user } = await api('admin/me');
      if (!user) return showLogin();
      S.me = user; await showApp();
    } catch (e) {
      app.innerHTML = `<div class="auth"><section class="card"><h1>Panoul nu poate porni</h1><p class="sub">${esc(e.message)}</p><a class="back" href="../">← Înapoi la site</a></section></div>`;
    }
  })();
})();
