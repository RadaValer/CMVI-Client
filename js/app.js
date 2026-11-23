(() => {
  'use strict';
  const D = window.SITE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const view = $('#view');
  const lensEl = $('.lens');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- seeded randomness (stable per container, never hand-placed) ---------- */
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const between = (r, a, b) => a + r() * (b - a);
  const pick = (r, list) => list[Math.floor(r() * list.length)];
  const shuffle = (r, list) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- theme ---------- */
  const THEME_KEY = 'cmv-theme';
  const themePref = () => { try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; } };
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme(pref = themePref()) {
    const dark = pref === 'dark' || (pref === 'system' && systemDark.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }
  function setTheme(pref) { try { localStorage.setItem(THEME_KEY, pref); } catch (e) { /* private mode */ } applyTheme(pref); }
  systemDark.addEventListener('change', () => applyTheme());

  /* ---------- the four frame rectangles ----------
     Every scene gives, per rectangle, the screen position of its inner corner
     and its rotation. u() = Figma px, fr()/fb() = measured from right/bottom. */
  const u = n => `calc(${n} * var(--u))`;
  const fr = n => `calc(100vw - ${n} * var(--u))`;
  const fb = n => `calc(100vh - ${n} * var(--u))`;
  const HIDDEN_TL = [u(-40), u(-60), 16.5];
  const phoneMQ = matchMedia('(max-width: 820px)');
  const SCENES = {
    closed: { tl: ['49.7vw', '77.6vh', 16.5], tr: ['48vw', '75vh', -13.5], bl: ['47vw', '74vh', 16.5], br: ['52.2vw', '26.5vh', 12.3] },
    open: { tl: ['36.9vw', '35.9vh', 16.5], tr: ['70.3vw', '41.9vh', -13.5], bl: ['46.4vw', '77.3vh', 16.5], br: ['67.7vw', '56.7vh', 12.3] },
    off: { tl: ['-40vw', '-30vh', 16.5], tr: ['140vw', '-30vh', -13.5], bl: ['-40vw', '130vh', 16.5], br: ['140vw', '130vh', 12.5] },
    std: { tl: HIDDEN_TL, tr: [fr(88), u(98), -13.5], bl: [u(88), '42.6vh', 16.5], br: [fr(138), fb(127), 12.5] },
    home1: { tl: HIDDEN_TL, tr: [fr(150), u(68), -13.5], bl: [u(95), '29.6vh', 16.5], br: [fr(208), fb(98), 12.5] },
    home2: { tl: HIDDEN_TL, tr: [fr(85), u(117), -18], bl: [u(110), '20.8vh', 26], br: [fr(145), fb(138), 14.5] },
    home3: { tl: HIDDEN_TL, tr: [fr(115), u(68), -17], bl: [u(85), '39.6vh', 25], br: [fr(185), fb(88), 14.4] },
    home4: { tl: HIDDEN_TL, tr: [fr(58), u(143), -13.5], bl: [u(67), '69vh', 17], br: [fr(80), fb(150), 12.9] },
    orar: { tl: HIDDEN_TL, tr: [fr(104), u(86), -15], bl: [u(96), '38vh', 18.5], br: [fr(150), fb(140), 11] },
    supliniri: { tl: HIDDEN_TL, tr: [fr(76), u(112), -12], bl: [u(80), '47vh', 15], br: [fr(128), fb(118), 13.5] },
    profesori: { tl: HIDDEN_TL, tr: [fr(96), u(78), -16], bl: [u(74), '52vh', 19], br: [fr(160), fb(104), 10.5] },
    contact: { tl: HIDDEN_TL, tr: [fr(84), u(104), -13], bl: [u(92), '40vh', 16], br: [fr(142), fb(132), 12.5] },
    harta: { tl: HIDDEN_TL, tr: [fr(110), u(92), -14.5], bl: [u(84), '50vh', 17.5], br: [fr(156), fb(112), 13] },
    organizare: { tl: HIDDEN_TL, tr: [fr(72), u(108), -12.5], bl: [u(100), '35vh', 20], br: [fr(132), fb(136), 11.5] },
    cont: { tl: HIDDEN_TL, tr: [fr(130), u(70), -18], bl: [u(104), '30vh', 22], br: [fr(176), fb(96), 15] }
  };
  SCENES.home0 = SCENES.despre = SCENES.noutati = SCENES.std;
  SCENES.home5 = SCENES.contact;
  const rects = { tl: $('.r-tl'), tr: $('.r-tr'), bl: $('.r-bl'), br: $('.r-br') };

  /* The rectangles move on springs instead of fixed CSS transitions: each one keeps its
     speed when the target changes, so fast scrolling or quick page changes bend the path
     smoothly instead of restarting the animation. Slightly different springs per rectangle
     make the group move less mechanically. */
  const SPRING = { tl: [5.6, .86], tr: [6.2, .8], bl: [5.9, .84], br: [6.6, .78] }; // [stiffness ω (rad/s), damping ratio]
  const sim = {};
  for (const k in rects) sim[k] = { x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, tx: 0, ty: 0, tr: 0 };
  // scene coordinates are CSS lengths (vw, vh, calc with --u); a hidden probe inside .lens turns them into px
  const probe = document.createElement('i');
  probe.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;visibility:hidden';
  lensEl.append(probe);
  const toPx = v => { probe.style.left = v; return parseFloat(getComputedStyle(probe).left) || 0; };
  function paintRect(k) {
    const s = sim[k], el = rects[k];
    el.style.setProperty('--x', s.x.toFixed(2) + 'px');
    el.style.setProperty('--y', s.y.toFixed(2) + 'px');
    el.style.setProperty('--r', s.r.toFixed(3) + 'deg');
  }
  /* Ambient motion: once the intro has opened, every rectangle keeps drifting slowly around its
     place (two slow sine waves per axis with different periods, so the path never visibly repeats).
     The drift moves the spring target, so it blends with the page-change movement. Off on phones
     (the rectangles are off-screen there) and for "reduce motion". */
  const AMB = { // per rectangle: phase offsets and speed factors
    tl: [0.0, 1.7, 3.1, 1.00], tr: [2.2, 0.4, 5.0, 0.87], bl: [4.1, 2.9, 0.8, 1.12], br: [1.3, 5.3, 2.4, 0.94]
  };
  const ambientOn = () => booted && !reduced && !phoneMQ.matches && sceneName !== 'closed';
  function drift(k, t) {
    const [a, b, c, f] = AMB[k], amp = Math.min(1.3, Math.max(.6, Math.min(innerWidth, innerHeight) / 900));
    const w = t * f * 2 * Math.PI;
    return [
      amp * (9 * Math.sin(w / 13 + a) + 4 * Math.sin(w / 7.3 + b)),   // px
      amp * (8 * Math.sin(w / 11 + b) + 4 * Math.sin(w / 6.1 + c)),   // px
      .7 * Math.sin(w / 15 + c) + .3 * Math.sin(w / 8.7 + a)          // deg
    ];
  }
  let rafId = 0, lastT = 0;
  function step(now) {
    const dt = Math.min(.034, Math.max(.001, (now - lastT) / 1000)); lastT = now;
    const amb = ambientOn();
    let moving = amb;
    for (const k in sim) {
      const s = sim[k], [w, z] = SPRING[k], d = amb ? drift(k, now / 1000) : [0, 0, 0];
      [['x', 'vx', 'tx'], ['y', 'vy', 'ty'], ['r', 'vr', 'tr']].forEach(([p, v, t], j) => {
        const target = s[t] + d[j];
        for (let i = 0; i < 2; i++) { // two half-steps keep the spring stable on slow frames
          s[v] += (-w * w * (s[p] - target) - 2 * z * w * s[v]) * dt / 2;
          s[p] += s[v] * dt / 2;
        }
        if (Math.abs(s[p] - target) > .08 || Math.abs(s[v]) > .08) moving = true;
        else if (!amb) { s[p] = target; s[v] = 0; }
      });
      paintRect(k);
    }
    rafId = moving ? requestAnimationFrame(step) : 0;
  }
  let sceneName = null;
  function setScene(name, pulse = false, snap = false) {
    // phones: after the intro the rectangles leave the screen completely
    const scene = (phoneMQ.matches && name !== 'closed') ? SCENES.off : (SCENES[name] || SCENES.std);
    sceneName = name;
    // pulse: true for a page change, or a number for a lighter push (scrolling between home slides)
    const strength = pulse === true ? 1 : (+pulse || 0);
    const cx = innerWidth / 2, cy = innerHeight / 2, kick = .8 * strength * Math.min(innerWidth, innerHeight);
    for (const k in rects) {
      const s = sim[k];
      s.tx = toPx(scene[k][0]); s.ty = toPx(scene[k][1]); s.tr = scene[k][2];
      if (snap || reduced) { s.x = s.tx; s.y = s.ty; s.r = s.tr; s.vx = s.vy = s.vr = 0; paintRect(k); continue; }
      if (strength) {
        // lens "breath": a push towards the middle of the screen on the way to the new place
        const dx = cx - s.x, dy = cy - s.y, d = Math.hypot(dx, dy) || 1;
        s.vx += dx / d * kick; s.vy += dy / d * kick; s.vr += (k === 'tl' || k === 'bl' ? -1 : 1) * 22 * strength;
      }
    }
    if (!snap && !reduced && !rafId) { lastT = performance.now(); rafId = requestAnimationFrame(step); }
  }
  // sizes in vw/vh change with the window, so the targets are measured again
  let sceneResize = 0;
  addEventListener('resize', () => { clearTimeout(sceneResize); sceneResize = setTimeout(() => { if (sceneName) setScene(sceneName); }, 60); });

  /* ---------- accent bars: generated for every [data-accents] container ---------- */
  const GRADS = [['#9273c6', '#5d6fae'], ['#6baab4', '#4aa39b'], ['#6f9cc6', '#5777a4'], ['#7c85c2', '#55a189'],
    ['#8f70c6', '#3e3079'], ['#4f7fa6', '#9a7fc0'], ['#6fb9a0', '#2f6670'], ['#5c7088', '#2f6a6c']];
  const ACCENT_STYLES = {
    std: { t: [22, 30], unit: 'px', h: [22, 42], v: [20, 50], maxH: '520px', maxV: '300px', off: [-0.7, -0.3] },
    small: { t: [11, 18], unit: 'px', h: [5, 9], v: [14, 26], maxH: '110px', maxV: '90px', off: [-0.7, -0.3] },
    hero: { t: [28, 80], unit: 'u', h: [13, 36], v: [16, 40], maxH: '9999px', maxV: '9999px', off: [-1.3, -0.4] }
  };
  function buildAccents(root, salt) {
    $$('[data-accents]', root).forEach((el, index) => {
      $$(':scope > .accent', el).forEach(n => n.remove());
      const r = rng(hash(`${salt}|${index}|${el.dataset.seed || ''}`));
      const style = ACCENT_STYLES[el.dataset.accentStyle] || ACCENT_STYLES.std;
      const count = +el.dataset.accents || 2;
      const allowed = (el.dataset.accentSides || 'top,right,bottom,left').split(',');
      let sides = el.dataset.accentSides && allowed.length === count ? allowed : shuffle(r, allowed);
      while (sides.length < count) sides = sides.concat(shuffle(r, allowed));
      sides = sides.slice(0, count);
      const seen = {}; const total = {};
      sides.forEach(s => { total[s] = (total[s] || 0) + 1; });
      const usedGrads = new Set();
      sides.forEach((side, i) => {
        const horizontal = side === 'top' || side === 'bottom';
        const nth = seen[side] = (seen[side] || 0) + 1;
        // optional per-container limits: data-accent-range="from,to" (% of the edge), data-accent-thick="min,max"
        // "a,b" applies to every bar; "a,b;c,d" gives each bar its own stretch of the edge
        const ranges = (el.dataset.accentRange || '5,95').split(';');
        const [from, to] = (ranges[i] || ranges[0]).split(',').map(Number);
        const seg = (to - from) / total[side];
        // data-accent-len="a,b;;c,d": optional length range (% of the edge) per bar, empty = default
        const ownLen = ((el.dataset.accentLen || '').split(';')[i] || '').split(',').map(Number);
        const lenRange = ownLen.length === 2 ? ownLen : (horizontal ? style.h : style.v);
        const len = Math.min(between(r, ...lenRange), seg - 4); // -4 keeps neighbours on one edge apart
        const pos = from + seg * (nth - 1) + r() * Math.max(0, seg - len);
        const t = between(r, ...(el.dataset.accentThick ? el.dataset.accentThick.split(',').map(Number) : style.t));
        const off = -0.5; // always centred on the container edge: half inside, half outside
        let g; do { g = Math.floor(r() * GRADS.length); } while (usedGrads.has(g) && usedGrads.size < GRADS.length);
        if (el.dataset.accentGrad) g = +el.dataset.accentGrad; // optional: pin the colour pair
        usedGrads.add(g);
        const [c1, c2] = r() < 0.5 ? GRADS[g] : [...GRADS[g]].reverse();
        const bar = document.createElement('span');
        bar.className = `accent ${horizontal ? 'h' : 'v'} ${side}`;
        bar.style.cssText = `--t:${style.unit === 'u' ? `calc(${t.toFixed(1)} * var(--u))` : t.toFixed(0) + 'px'};--len:${len.toFixed(1)}%;` +
          `--max:${horizontal ? style.maxH : style.maxV};--pos:${pos.toFixed(1)}%;--off:calc(var(--t) * ${off.toFixed(2)});` +
          `--g:linear-gradient(${horizontal ? 90 : 180}deg,${c1},${c2});--d:${(0.15 + i * 0.12).toFixed(2)}s`;
        el.append(bar);
      });
    });
  }

  /* ---------- small helpers ---------- */
  const ICON = {
    download: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
    caret: '<svg viewBox="0 0 22 12" width="22" height="12" fill="currentColor"><path d="M1.6 0h18.8a1 1 0 0 1 .75 1.66l-9.4 10a1 1 0 0 1-1.5 0l-9.4-10A1 1 0 0 1 1.6 0z"/></svg>',
    left: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 1.5a10.5 10.5 0 0 0-1.64 20.87v-7.34H7.7V12h2.66V9.69c0-2.63 1.57-4.08 3.96-4.08 1.15 0 2.35.2 2.35.2v2.59h-1.32c-1.3 0-1.71.81-1.71 1.64V12h2.91l-.47 3.03h-2.44v7.34A10.5 10.5 0 0 0 12 1.5z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" stroke="none"/></svg>',
    youtube: '<svg viewBox="0 0 28 24" width="32" height="28" fill="currentColor"><path d="M26.4 5.6a3.3 3.3 0 0 0-2.3-2.3C22 2.7 14 2.7 14 2.7s-8 0-10.1.6A3.3 3.3 0 0 0 1.600 5.6C1 7.700 1 12 1 12s0 4.300.6 6.400a3.300 3.300 0 0 0 2.300 2.300c2.100.6 10.100.6 10.100.6s8 0 10.100-.6a3.300 3.300 0 0 0 2.300-2.300c.6-2.100.6-6.400.6-6.400s0-4.300-.6-6.400zM11.400 16V8l6.900 4-6.900 4z"/></svg>'
  };
  let toastTimer = 0;
  function toast(msg) {
    const t = $('.toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }
  /* ---------- data from the API (Node.js server, address in js/config.js) ---------- */
  const F = window.CMV_FORMAT;
  const API = ((window.CMV_CONFIG && window.CMV_CONFIG.apiUrl) || '').replace(/\/+$/, '');
  // the login of the site: a token sent in the Authorization header (the panel /admin has its own)
  const TOKEN_KEY = 'cmv-token-site';
  const token = {
    get() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } },
    set(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* private mode */ } }
  };
  async function api(route, { method = 'GET', body, params } = {}) {
    const qs = new URLSearchParams(params || {}).toString();
    const headers = {}, tok = token.get();
    if (method === 'POST') headers['Content-Type'] = 'application/json';
    if (tok) headers.Authorization = 'Bearer ' + tok;
    let res;
    try {
      res = await fetch(`${API}/api/${route}${qs ? '?' + qs : ''}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch (e) {
      throw new Error('Serverul nu răspunde. Verifică conexiunea la internet sau încearcă din nou peste un minut.');
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON: server misconfigured */ }
    if (res.status === 401 && tok) token.set(null); // the session ended on the server
    if (!res.ok || !data) { const err = new Error((data && data.error) || `Serverul a răspuns cu eroarea ${res.status}.`); err.status = res.status; throw err; }
    return data;
  }
  // DB.error.* holds the message to show when a section could not be loaded
  const DB = { news: [], tt: null, me: null, site: { school: { name: 'Colegiul „Mihai Viteazul” Ineu', social: {}, map: {} }, organization: [] }, subs: new Map(), error: {} };
  const EMPTY_TT = { periods: [], classes: [], teachers: [], subjects: [], rooms: [], entries: {}, days: 5, validFrom: null };
  // the external links of the "Altele" bar are edited in /admin; the ones in index.html are only a fallback
  function drawLinks() {
    const links = DB.site && DB.site.links; if (!Array.isArray(links)) return;
    $$('.subnav a[target="_blank"]').forEach(a => a.remove());
    $('.subnav').insertAdjacentHTML('beforeend', links.map(l => `<a href="${esc(l.url)}" role="menuitem" target="_blank" rel="noopener">${esc(l.title)}</a>`).join(''));
  }
  async function loadAll() {
    const [news, tt, me, site] = await Promise.allSettled([api('news'), api('timetable'), api('me'), api('site')]);
    if (site.status === 'fulfilled') { DB.site = site.value; drawLinks(); } else DB.error.site = site.reason.message;
    if (news.status === 'fulfilled') DB.news = news.value.news; else DB.error.news = news.reason.message;
    if (tt.status === 'fulfilled') DB.tt = tt.value; else { DB.tt = EMPTY_TT; DB.error.tt = tt.reason.message; }
    if (me.status === 'fulfilled') DB.me = me.value.user;
    buildClasses();
  }
  // a full-page message used when a section is empty or failed to load
  const notice = (title, text) => `<div class="page"><section class="panel subs" data-accents="2" data-accent-sides="top,bottom" data-seed="${esc(title)}">
    <div class="subs-empty"><p><b>${esc(title)}</b>${esc(text)}</p></div></section></div>`;
  const canSeeSubs = () => !!DB.me && (DB.me.role === 'profesor' || DB.me.role === 'admin');
  const teacherByCode = code => DB.tt.teachers.find(t => t.code === code);
  const teacherNames = codes => String(codes || '').split(',').filter(Boolean).map(c => (teacherByCode(c) || {}).name || c).join(', ');
  const subjectName = code => (DB.tt.subjects.find(s => s.code === code) || {}).name || code;

  /* ---------- classes & timetables ---------- */
  let CLASSES = [];
  function buildClasses() {
    CLASSES = DB.tt.classes.map(c => {
      const m = /^\s*(?:clasa\s+)?(0|[IVX]+|\d{1,2})\s*-?\s*(.*)$/i.exec(c.name);
      const letter = m ? m[2].trim() : '';
      const long = !m || !c.grade ? c.name : c.grade === '0' ? `pregătitoare ${letter}`.trim() : `a ${c.grade}-a ${letter}`.trim();
      return { id: c.name, level: c.level, grade: c.grade || c.name, long };
    });
    // a signed-in student sees their own class; everyone else the class they picked last time
    const mine = DB.me && DB.me.role === 'elev' && CLASSES.find(c => c.id === DB.me.class_name);
    let saved = null; try { saved = localStorage.getItem('cmv-class'); } catch (e) { /* private mode */ }
    if (mine) state.cls = mine.id;
    else if (!CLASSES.some(c => c.id === state.cls)) state.cls = CLASSES.some(c => c.id === saved) ? saved : (CLASSES[0] ? CLASSES[0].id : null);
  }
  const classById = id => CLASSES.find(c => c.id === id) || CLASSES[0];
  const DAY_LABELS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
  const days = () => DAY_LABELS.slice(0, Math.max(5, DB.tt.days || 5));
  const periodLabel = p => p.start ? `${p.start} - ${p.end}` : '';
  // grid[day][periodIndex] = list of { sub, tch, room, grp } (more than one when the class is split in groups)
  function timetableFor(cls) {
    const P = DB.tt.periods;
    const grid = days().map(() => P.map(() => []));
    (DB.tt.entries[cls.id] || []).forEach(([day, period, sub, tch, room, grp]) => {
      const col = P.findIndex(p => p.period === period);
      if (grid[day] && col >= 0) grid[day][col].push({ sub, tch, room, grp });
    });
    // drop Saturday/Sunday columns when they are empty for this class
    while (grid.length > 5 && grid[grid.length - 1].every(c => !c.length)) grid.pop();
    return grid;
  }

  /* ---------- pages ---------- */
  const weekday = new Date().getDay();
  const state = { ttDay: weekday >= 1 && weekday <= 5 ? weekday - 1 : 0, cls: null, pickerOpen: false, day: startOfDay(new Date()), weekStart: startOfDay(new Date()), query: '' };
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = d => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  const DOW = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa'];
  const DOW_LONG = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
  const abs = (x, y, w, h) => `style="--x:${x};--y:${y}${w != null ? `;--w:${w}` : ''}${h != null ? `;--h:${h}` : ''}"`;

  const PAGES = {
    despre() {
      const h = D.home;
      const tags = h.patron.tags.map((t, i) => `<li style="--i:${i}">${esc(t)}</li>`).join('');
      const cols = h.offer.columns.map(c => `
        <div class="offer-col" style="--rail:${c.rail};--rows:${c.profiles.length > 1 ? 2 : 1}">
          <h3>${esc(c.title)}</h3>
          <div class="offer-box">${c.profiles.map(p => `
            <article class="profile" style="--pg:${p.grad}">
              <h4>Profil <b>${esc(p.name)}</b></h4><small>Specializările:</small>
              <ul>${p.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
            </article>`).join('')}</div>
        </div>`).join('') + `<p class="panel offer-note">${esc(h.offer.note)}</p>`;
      return `
      <section class="hs" data-scene="home0"><div class="stage" style="--sx:56">
        <div class="abs panel" ${abs(239, 247, 1331, 164)} data-accents="1" data-accent-style="hero" data-accent-sides="top" data-accent-range="62,97" data-accent-thick="34,42" data-accent-grad="0" data-soft data-seed="emblem"></div>
        <div class="abs panel" ${abs(238, 450, 1331, 445)} data-accents="2" data-accent-style="hero" data-accent-sides="bottom,right" data-accent-thick="24,44" data-seed="emblem-jos"></div>
        <div class="abs deco deco-col" ${abs(321, 180, 146, 764)}></div>
        <img class="abs emblem" ${abs(753, 317, 300, 300)} src="assets/sigla.png" alt="Sigla Colegiului Mihai Viteazul Ineu">
        <p class="abs hero-text hero-welcome" ${abs(330, 655, 1170)}>${h.intro}</p>
      </div></section>

      <section class="hs" data-scene="home1"><div class="stage" style="--sx:10">
        <div class="abs panel" ${abs(266, 215, 1368, 600)} data-accents="2" data-accent-style="hero" data-accent-sides="top,right" data-accent-range="50,96" data-seed="patron"></div>
        <div class="abs deco mv-halo" ${abs(395, 290, 510, 510)}></div>
        <img class="abs" ${abs(415, 170, 470, 691)} src="assets/statue.png" alt="Statuia lui Mihai Viteazul">
        <div class="abs mv" ${abs(1000, 322, 590)}>
          <h2 class="mv-title">${esc(h.patron.title)}</h2>
          <div class="mv-rule"></div>
          <p class="eu-text">${h.patron.text}</p>
          <ul class="mv-tags mv-tags--row">${tags}</ul>
        </div>
      </div></section>

      <section class="hs" data-scene="home2"><div class="stage" style="--sx:27">
        <div class="abs panel" ${abs(268, 397, 1330, 338)} data-accents="4" data-accent-style="hero" data-accent-sides="top,top,bottom,bottom" data-accent-range="8,36;5,95;5,95;5,95" data-accent-thick="18,28" data-accent-len="7,10" data-seed="misiune"></div>
        <p class="abs hero-text" ${abs(353, 488, 500)}>${h.missionLeft}</p>
        <p class="abs hero-text" ${abs(1035, 488, 470)}>${h.missionRight}</p>
        <img class="abs" ${abs(860, 258, 100, 654)} src="assets/pencil.png" alt="">
      </div></section>

      <section class="hs" data-scene="home3"><div class="stage" style="--sx:0">
        <div class="abs panel" ${abs(263, 215, 1394, 620)} data-accents="2" data-accent-style="hero" data-accent-sides="top,bottom" data-accent-range="5,45;55,95" data-accent-thick="20,30" data-seed="europa"></div>
        <div class="abs deco eu-halo" ${abs(318, 300, 600, 420)}></div>
        <img class="abs" ${abs(322, 292, 632, 497)} src="assets/flag.png" alt="Drapelul Uniunii Europene">
        <div class="abs mv" ${abs(1030, 290, 570)}>
          <h2 class="eu-title">${esc(h.eu.title)}</h2>
          <div class="mv-rule"></div>
          <p class="eu-text">${h.eu.text}</p>
          <ul class="mv-tags eu-tags">${h.eu.tags.map((t, i) => `<li style="--i:${i}">${esc(t)}</li>`).join('')}</ul>
        </div>
      </div></section>

      <section class="hs" data-scene="home4"><div class="stage" style="--sx:32">
        <div class="abs offer" ${abs(337, 204, 1182)}>${cols}</div>
      </div></section>

      <section class="hs hs-contact" data-scene="home5"><div class="hs-contact-in">${PAGES.contact()}</div></section>
      <nav class="hs-dots" aria-label="Secțiuni">${[0, 1, 2, 3, 4, 5].map(i => `<button type="button" data-slide="${i}" aria-label="Secțiunea ${i + 1}"></button>`).join('')}</nav>`;
    },

    noutati() {
      let img = 0;
      if (DB.error.news) return notice('Noutățile nu au putut fi încărcate', DB.error.news);
      if (!DB.news.length) return notice('Nicio noutate', 'Anunțurile școlii vor apărea aici.');
      return `<div class="page"><div class="stack">${DB.news.map(n => {
        const docs = n.files.filter(f => f.kind === 'file'), imgs = n.files.filter(f => f.kind === 'image');
        return `
        <article class="panel news" data-accents="2" data-seed="${esc(n.id + n.title)}">
          <time datetime="${esc(n.date)}">${esc(F.longDate(n.date))}</time>
          <h2>${esc(n.title)}</h2>
          ${n.body ? `<div class="news-body">${F.body(n.body)}</div>` : ''}
          ${docs.length ? `<div class="files">${docs.map(f => `<a class="btn-grad file" href="${esc(f.url)}" download="${esc(f.name)}">${ICON.download}<span>${esc(f.name)}</span></a>`).join('')}</div>` : ''}
          ${imgs.length ? `<div class="thumbs">${imgs.map(i => `<button class="thumb" type="button" data-img="${img++}" aria-label="Mărește imaginea"><img src="${esc(i.url)}" alt="${esc(i.name.replace(/\.[a-z0-9]+$/i, ''))}" loading="lazy"></button>`).join('')}</div>` : ''}
        </article>`;
      }).join('')}</div></div>`;
    },

    orar() {
      if (DB.error.tt) return notice('Orarul nu a putut fi încărcat', DB.error.tt);
      if (!CLASSES.length) return notice('Orarul nu a fost încă publicat', 'Orarul claselor va apărea aici imediat ce este încărcat de administrator.');
      const levels = Object.keys(D.levels).map(id => {
        const grades = [];
        CLASSES.filter(c => c.level === id).forEach(c => { let g = grades.find(x => x.grade === c.grade); if (!g) grades.push(g = { grade: c.grade, list: [] }); g.list.push(c); });
        return { ...D.levels[id], grades };
      }).filter(l => l.grades.length);
      const valid = DB.tt.validFrom ? `Valabil din ${esc(F.shortDate(DB.tt.validFrom))}` : '';
      return `<div class="page page-orar">
        <section class="panel orar" data-accents="1" data-accent-sides="bottom" data-seed="orar">
          <div class="selector${state.pickerOpen ? ' open' : ''}">
            <button class="selector-head" type="button" aria-expanded="${state.pickerOpen}">
              <span>Clasa</span><b class="selector-name"></b>${ICON.caret}
            </button>
            <div class="picker"><div class="picker-in"><div class="picker-cols" style="--levels:${levels.length}">${levels.map(l => `
              <div class="level" style="--lg:${l.grad}"><h3>${esc(l.title)}</h3>
                ${l.grades.map(g => `<div class="grade" style="--n:${Math.max(3, Math.min(4, g.list.length))}">${g.list.map(c => `<button class="cls" type="button" data-cls="${esc(c.id)}">${esc(c.id)}</button>`).join('')}</div>`).join('')}
              </div>`).join('')}</div></div></div>
          </div>
          <div class="tt-wrap"><div class="tt-in">
            <div class="tt-m"></div>
            <div class="tt-scroll"><div class="tt"></div></div>
            <div class="tt-foot"><button class="btn-grad tt-dl" type="button">Descarcă imaginea</button><span>${valid}</span></div>
          </div></div>
        </section></div>`;
    },

    supliniri() {
      if (!canSeeSubs()) {
        return `<div class="page"><section class="panel subs" data-accents="2" data-accent-sides="top,bottom" data-seed="supliniri-login">
          <div class="subs-empty"><p><b>Doar pentru profesori</b>${DB.me ? 'Contul tău nu are acces la supliniri.' : 'Suplinirile sunt vizibile după autentificarea cu contul de profesor.'}</p>
          ${DB.me ? '' : '<a class="btn-grad subs-login" href="#/cont">Intră în cont</a>'}</div></section></div>`;
      }
      return `<div class="page page-supliniri">
        <section class="panel days" data-accents="2" data-accent-style="small" data-accent-sides="top,bottom" data-seed="zile">
          <button class="day-arrow" type="button" data-shift="-7" aria-label="Săptămâna anterioară"><span>${ICON.left}</span></button>
          <div class="day-list"></div>
          <button class="day-arrow" type="button" data-shift="7" aria-label="Săptămâna următoare"><span>${ICON.right}</span></button>
        </section>
        <section class="panel subs" data-accents="2" data-accent-sides="top,bottom" data-seed="supliniri"><div class="subs-body"></div></section>
      </div>`;
    },

    profesori() {
      return `<div class="page page--wide">
        <section class="panel teachers" data-accents="2" data-accent-sides="top,bottom" data-seed="profesori">
          <div class="teachers-head">
            <h2 class="underlined">Lista cu profesori</h2>
            <input class="field" type="search" placeholder="Caută..." aria-label="Caută un profesor" value="${esc(state.query)}">
          </div>
          <div class="t-list"></div>
        </section></div>`;
    },

    // also shown as the last Despre screen
    contact() {
      if (DB.error.site) return notice('Datele de contact nu au putut fi încărcate', DB.error.site);
      const s = DB.site.school, link = u => esc(u || '#');
      return `<div class="page page-contact">
        <div class="contact-grid">
          <section class="panel contact-form" data-accents="2" data-accent-sides="top,left" data-seed="formular">
            <h2>Contactează-ne</h2>
            <form class="form" data-form="contact" novalidate>
              <input class="field" name="nume" placeholder="Nume..." aria-label="Nume" required>
              <input class="field" name="email" type="email" placeholder="Email..." aria-label="Email" required>
              <input class="field full" name="topic" placeholder="Topic..." aria-label="Subiect" required>
              <textarea class="field full" name="mesaj" placeholder="Mesaj..." aria-label="Mesaj" required></textarea>
              <button class="btn-grad full" type="submit">Trimite</button>
            </form>
          </section>
          <section class="panel contact-info" data-accents="1" data-accent-sides="top" data-seed="date">
            <dl>
              <div><dt>Numele școlii</dt><dd>${esc(s.name)}</dd></div>
              <div><dt>Email școală</dt><dd><a href="mailto:${esc(s.emailSchool)}">${esc(s.emailSchool)}</a></dd></div>
              <div><dt>Email admin</dt><dd><a href="mailto:${esc(s.emailAdmin)}">${esc(s.emailAdmin)}</a></dd></div>
              ${s.emailWebmaster ? `<div><dt>Email administrator</dt><dd><a href="mailto:${esc(s.emailWebmaster)}">${esc(s.emailWebmaster)}</a></dd></div>` : ''}
              <div><dt>Telefon</dt><dd><a href="tel:${esc(s.phone.replace(/[^+\d]/g, ''))}">${esc(s.phone)}</a></dd></div>
              <div><dt>Adresa</dt><dd>${esc(s.address)}</dd></div>
            </dl>
          </section>
        </div>
        <section class="panel social"><span>Social media</span>
          <nav aria-label="Social media">
            <a href="${link(s.social.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.facebook}</a>
            <a href="${link(s.social.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.instagram}</a>
            <a href="${link(s.social.youtube)}" target="_blank" rel="noopener" aria-label="YouTube">${ICON.youtube}</a>
          </nav>
        </section></div>`;
    },

    harta() {
      if (DB.error.site) return notice('Harta nu a putut fi încărcată', DB.error.site);
      const s = DB.site.school, m = s.map, q = `${m.lat},${m.lng}`;
      return `<div class="page page-harta">
        <div class="map-grid">
          <section class="panel map-box" data-accents="2" data-accent-sides="top,bottom" data-seed="harta">
            <iframe title="Harta: ${esc(s.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=${q}&z=${m.zoom}&t=k&output=embed"></iframe>
          </section>
          <section class="panel map-info" data-accents="1" data-accent-sides="top" data-seed="adresa">
            <h2 class="underlined">Hartă</h2>
            <dl>
              <div><dt>Adresa</dt><dd>${esc(s.address)}</dd></div>
              <div><dt>Telefon</dt><dd><a href="tel:${esc(s.phone.replace(/[^+\d]/g, ''))}">${esc(s.phone)}</a></dd></div>
            </dl>
            <a class="btn-grad map-open" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">Deschide în Google Maps</a>
          </section>
        </div></div>`;
    },

    organizare() {
      return `<div class="page page-organizare">
        <section class="panel org" data-accents="2" data-accent-sides="top,bottom" data-seed="organizare">
          <h2 class="underlined">Organizare</h2>
          <p class="org-sub">Echipa managerială</p>
          <div class="org-grid">${DB.site.organization.map(g => `
            <article class="org-card" style="--pg:${g.css}">
              <h3>${esc(g.role)}</h3>
              <ul>${g.people.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
            </article>`).join('')}</div>
        </section></div>`;
    },

    cont() {
      const pref = themePref(), me = DB.me;
      const ROLE = { elev: 'Elev', profesor: 'Profesor', admin: 'Administrator' };
      const account = me ? `
          <h2>Contul meu</h2>
          <dl class="me">
            <div><dt>Nume</dt><dd>${esc(me.name)}</dd></div>
            <div><dt>Email</dt><dd>${esc(me.email)}</dd></div>
            <div><dt>Rol</dt><dd>${ROLE[me.role] || esc(me.role)}</dd></div>
            ${me.role === 'elev' && me.class_name ? `<div><dt>Clasa</dt><dd><a href="#/orar">${esc(me.class_name)}</a></dd></div>` : ''}
            ${me.role === 'profesor' && me.teacher_code ? `<div><dt>Cod în orar</dt><dd>${esc(me.teacher_code)}</dd></div>` : ''}
          </dl>
          ${me.role === 'profesor' ? '<div class="my-subs"></div>' : ''}
          <div class="me-actions">
            ${me.role === 'admin' ? '<a class="btn-grad" href="admin/">Panoul de administrare</a>' : ''}
            <button class="btn-grad btn-logout" type="button">Ieși din cont</button>
          </div>` : `
          <h2>Autentificare</h2>
          <form class="form" data-form="login" novalidate>
            <input class="field" name="email" type="email" placeholder="Email..." aria-label="Email" autocomplete="username" required>
            <input class="field" name="parola" type="password" placeholder="Parola..." aria-label="Parola" autocomplete="current-password" required>
            <button class="btn-grad" type="submit">Intră în cont</button>
          </form>
          <p class="hint">Conturile sunt create de administratorul școlii.</p>`;
      return `<div class="page page-cont">
        <section class="panel account" data-accents="3" data-seed="cont">
          ${account}
          <hr>
          <h2>Tema</h2>
          <div class="seg" role="group" aria-label="Tema">
            ${[['system', 'Sistem'], ['light', 'Luminos'], ['dark', 'Intunecat']].map(([k, l]) => `<button type="button" data-theme-set="${k}" class="${k === pref ? 'on' : ''}">${l}</button>`).join('')}
          </div>
          <p class="hint">„Sistem” urmează setarea dispozitivului tău.</p>
        </section></div>`;
    }
  };

  /* ---------- page behaviours ---------- */
  // one timetable cell may hold several lessons (groups); these join them for display
  const cellSub = list => list.map(c => c.sub).join(' / ');
  const cellTch = list => list.map(c => c.tch.replace(/,/g, ', ')).join(' / ');
  const cellTitle = list => list.map(c => `${subjectName(c.sub)}${c.grp ? ` (${c.grp})` : ''}: ${teacherNames(c.tch)}${c.room ? `, ${c.room}` : ''}`).join('\n');
  function drawTimetable() {
    const cls = classById(state.cls); if (!cls) return;
    const tt = timetableFor(cls), P = DB.tt.periods, DAYS = days().slice(0, tt.length);
    if (state.ttDay >= tt.length) state.ttDay = 0;
    $('.selector-name').textContent = cls.long;
    $$('.cls').forEach(b => b.classList.toggle('on', b.dataset.cls === cls.id));
    const cell = list => list.length ? `<div title="${esc(cellTitle(list))}"><span class="sub">${esc(cellSub(list))}</span><span class="tch">${esc(cellTch(list))}</span></div>` : '<div class="empty"></div>';
    $('.tt').style.setProperty('--cols', P.length + 1);
    $('.tt').innerHTML = '<div class="hd"></div>' +
      P.map(p => `<div class="hd"><span class="n">${p.period}</span><span class="t">${esc(periodLabel(p))}</span></div>`).join('') +
      tt.map((row, d) => `<div class="day">${DAYS[d]}</div>` + row.map(cell).join('')).join('');
    // phones get one day at a time instead of the wide grid
    const rows = tt[state.ttDay].map((list, i) => list.length ? `<div class="tt-row"><span class="ora">${P[i].period}</span><div>${list.map(c => `<b>${esc(subjectName(c.sub))}${c.grp ? ` <i>(${esc(c.grp)})</i>` : ''}</b><small>${esc(teacherNames(c.tch))}${c.room ? ` · ${esc(c.room)}` : ''}</small>`).join('')}</div><time>${esc(periodLabel(P[i]))}</time></div>` : '').join('');
    $('.tt-m').innerHTML = `<div class="tt-days" style="--days:${DAYS.length}">${DAYS.map((x, i) => `<button type="button" class="tt-day${i === state.ttDay ? ' on' : ''}" data-tt-day="${i}">${x}</button>`).join('')}</div>` + (rows || '<p class="t-none">Nicio oră în această zi.</p>');
  }
  function togglePicker(open = !state.pickerOpen) {
    state.pickerOpen = open;
    const sel = $('.selector'); if (!sel) return;
    sel.classList.toggle('open', open);
    $('.selector-head').setAttribute('aria-expanded', open);
  }
  function downloadTimetable() {
    const cls = classById(state.cls), tt = timetableFor(cls), P = DB.tt.periods, DAYS = days().slice(0, tt.length);
    const dark = document.documentElement.dataset.theme === 'dark';
    const C = dark ? { bg: '#252727', panel: '#2f383a', head: '#242b2d', cell: '#2a3234', text: '#fff' } : { bg: '#bccdd0', panel: '#a9bcbf', head: '#96a9ac', cell: '#a1b4b7', text: '#2c2c2e' };
    const cols = P.length + 1, rowsN = tt.length + 1;
    const cw = 158, ch = 87, gap = 10, px = 60, top = 150, W = px * 2 + cw * cols + gap * (cols - 1), H = top + ch * rowsN + gap * (rowsN - 1) + 80;
    const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2;
    const x = cv.getContext('2d'); x.scale(2, 2);
    const box = (bx, by, bw, bh, r, fill) => { x.beginPath(); x.roundRect ? x.roundRect(bx, by, bw, bh, r) : x.rect(bx, by, bw, bh); x.fillStyle = fill; x.fill(); };
    box(0, 0, W, H, 0, C.bg); box(20, 20, W - 40, H - 40, 40, C.panel);
    const g = x.createLinearGradient(px, 0, W - px, 0); g.addColorStop(0, '#5587ad'); g.addColorStop(1, '#8a6fb5');
    box(px, 55, W - px * 2, 60, 18, g);
    x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.font = '400 24px Inter, sans-serif'; x.fillText('Clasa', px + 46, 86);
    x.font = '700 24px Inter, sans-serif'; x.fillText(cls.long, px + 146, 86);
    x.textAlign = 'center';
    const put = (col, row, a, b, head, bold) => {
      const bx = px + col * (cw + gap), by = top + row * (ch + gap);
      box(bx, by, cw, ch, 8, head ? C.head : C.cell); x.fillStyle = C.text;
      x.font = `${bold ? 700 : 400} ${a.length > 9 ? 16 : 24}px Inter, sans-serif`; x.fillText(a, bx + cw / 2, by + (b ? 34 : ch / 2), cw - 12);
      if (b) { x.font = '400 12px Inter, sans-serif'; x.fillText(b, bx + cw / 2, by + 63, cw - 12); }
    };
    put(0, 0, '', '', true);
    P.forEach((p, i) => put(i + 1, 0, String(p.period), periodLabel(p), true, true));
    tt.forEach((row, d) => { put(0, d + 1, DAYS[d], '', true, true); row.forEach((list, i) => list.length && put(i + 1, d + 1, cellSub(list), cellTch(list))); });
    x.textAlign = 'left'; x.font = '400 12px Inter, sans-serif'; x.fillStyle = C.text;
    x.fillText(`${DB.site.school.name}${DB.tt.validFrom ? `, valabil din ${F.shortDate(DB.tt.validFrom)}` : ''}`, px, H - 48);
    const a = document.createElement('a'); a.download = `orar-${cls.id.replace(' ', '-')}.png`; a.href = cv.toDataURL('image/png'); a.click();
  }

  const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  // substitutions are fetched one 7-day strip at a time and cached
  function loadWeek(start) {
    const from = isoDate(start), to = isoDate(addDays(start, 6)), key = from;
    if (!DB.subs.has(key)) {
      DB.subs.set(key, api('substitutions', { params: { from, to } }).then(r => r.substitutions, err => { DB.subs.delete(key); throw err; }));
    }
    return DB.subs.get(key);
  }
  const subRow = s => ({ ora: s.period, cls: s.class_name, absent: s.absent_name, repl: s.substitute_name, sub: s.subject ? subjectName(s.subject) : '', room: s.room, note: s.note });
  async function substitutionsFor(date) {
    const all = await loadWeek(state.weekStart);
    const day = isoDate(date), list = all.filter(s => s.date === day).map(subRow);
    if (!list.length && (date.getDay() === 0 || date.getDay() === 6)) return null;
    return list;
  }
  let subsToken = 0;
  async function drawSubstitutions() {
    $('.day-list').innerHTML = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(state.weekStart, i);
      return `<button class="day-chip${+d === +state.day ? ' on' : ''}" type="button" data-day="${+d}"><b>${DOW[d.getDay()]}</b><small>${fmtDate(d)}</small></button>`;
    }).join('');
    const onChip = $('.day-chip.on'), strip = $('.day-list');
    if (onChip && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = onChip.offsetLeft - strip.offsetLeft - (strip.clientWidth - onChip.offsetWidth) / 2; // keep the chosen day in view on phones
    const d = state.day, token = ++subsToken;
    let list;
    try { list = await substitutionsFor(d); }
    catch (err) {
      if (token !== subsToken || !$('.subs-body')) return;
      $('.subs-body').innerHTML = `<div class="subs-empty"><p><b>Supliniri indisponibile</b>${esc(err.message)}</p></div>`;
      return;
    }
    if (token !== subsToken || !$('.subs-body')) return; // the user moved on while this was loading
    const head = `<div class="subs-head"><h2>${DOW_LONG[d.getDay()]}, ${fmtDate(d)}</h2><span>${list && list.length ? `${list.length} ${list.length === 1 ? 'suplinire' : 'supliniri'}` : ''}</span></div>`;
    $('.subs-body').innerHTML = head + (!list ? '<div class="subs-empty"><p><b>Weekend</b>Nu sunt cursuri în această zi.</p></div>'
      : !list.length ? '<div class="subs-empty"><p><b>Nicio suplinire</b>Toate orele se țin conform orarului.</p></div>'
        : `<div class="sub-table"><div class="sub-row th"><span>Ora</span><span>Clasa</span><span>Profesor absent</span><span>Înlocuitor</span><span>Disciplina</span><span>Sala</span></div>${list.map(s => `
          <div class="sub-row"${s.note ? ` title="${esc(s.note)}"` : ''}><span class="ora">${s.ora}</span><b>${esc(s.cls)}</b><span>${esc(s.absent)}</span><b>${esc(s.repl)}</b><span>${esc(s.sub)}${s.note ? ` <small class="sub-note">${esc(s.note)}</small>` : ''}</span><span>${esc(s.room)}</span></div>`).join('')}</div>`);
  }

  // on /cont, a teacher sees the substitutions that involve them over the next two weeks
  async function drawMySubs() {
    const box = $('.my-subs'), me = DB.me; if (!box || !me) return;
    const today = startOfDay(new Date()), from = isoDate(today), to = isoDate(addDays(today, 13));
    const name = me.teacher_code && teacherByCode(me.teacher_code) ? teacherByCode(me.teacher_code).name : me.name;
    try {
      const { substitutions } = await api('substitutions', { params: { from, to } });
      const mine = substitutions.filter(s => (me.teacher_code && (s.substitute_code === me.teacher_code || s.absent_code === me.teacher_code)) || s.substitute_name === name);
      box.innerHTML = `<h3>Supliniri în următoarele 2 săptămâni</h3>` + (mine.length ? `<ul>${mine.map(s => {
        const d = new Date(s.date + 'T00:00:00');
        const role = (s.substitute_code && s.substitute_code === me.teacher_code) || s.substitute_name === name ? 'suplinești' : 'ești suplinit(ă)';
        return `<li><b>${DOW_LONG[d.getDay()]}, ${fmtDate(d)}, ora ${s.period}</b> · clasa ${esc(s.class_name)} · ${role}${s.room ? ` · ${esc(s.room)}` : ''}</li>`;
      }).join('')}</ul>` : '<p class="hint">Nu ai nicio suplinire programată.</p>');
    } catch (err) { box.innerHTML = `<p class="hint">${esc(err.message)}</p>`; }
  }

  function drawTeachers() {
    const q = state.query.trim().toLowerCase();
    const strip = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const nq = strip(q);
    if (!DB.tt.teachers.length) { $('.t-list').innerHTML = `<p class="t-none">${esc(DB.error.tt || 'Lista profesorilor va apărea după încărcarea orarului.')}</p>`; return; }
    const list = DB.tt.teachers.filter(t => !nq || strip(t.name).includes(nq) || strip(t.code).includes(nq));
    const hl = name => { const i = nq ? strip(name).indexOf(nq) : -1; return i < 0 ? esc(name) : `${esc(name.slice(0, i))}<mark>${esc(name.slice(i, i + nq.length))}</mark>${esc(name.slice(i + nq.length))}`; };
    const cell = t => t ? `<div class="t-cell"><span>${hl(t.name)}</span><b>${esc(t.code)}</b></div>` : '<div class="t-cell"></div>';
    let rows = '';
    for (let i = 0; i < list.length; i += 2) rows += `<div class="t-row">${cell(list[i])}${cell(list[i + 1])}</div>`;
    $('.t-list').innerHTML = rows || `<p class="t-none">Niciun profesor găsit pentru „${esc(state.query)}”.</p>`;
  }

  /* lightbox */
  const lb = $('.lightbox'); let lbList = [], lbIndex = 0;
  function showImage(i) {
    lbIndex = Math.max(0, Math.min(lbList.length - 1, i));
    const im = lbList[lbIndex];
    $('.lb-img').src = im.src; $('.lb-img').alt = im.alt;
    $('.lb-download').href = im.src; $('.lb-download').download = im.name || im.src.split('/').pop();
    $('.lb-prev').disabled = lbIndex === 0; $('.lb-next').disabled = lbIndex === lbList.length - 1;
  }
  function openLightbox(i) { lbList = DB.news.flatMap(n => n.files.filter(f => f.kind === 'image').map(f => ({ src: f.url, alt: f.name, name: f.name }))); lb.hidden = false; document.body.style.overflow = 'hidden'; showImage(i); }
  function closeLightbox() { lb.hidden = true; document.body.style.overflow = ''; }
  lb.addEventListener('click', e => {
    if (e.target.closest('.lb-prev')) showImage(lbIndex - 1);
    else if (e.target.closest('.lb-next')) showImage(lbIndex + 1);
    else if (!e.target.closest('.lb-img, .lb-download')) closeLightbox();
  });
  document.addEventListener('keydown', e => {
    if (!lb.hidden) { if (e.key === 'Escape') closeLightbox(); if (e.key === 'ArrowLeft') showImage(lbIndex - 1); if (e.key === 'ArrowRight') showImage(lbIndex + 1); }
    else if (e.key === 'Escape' && state.pickerOpen) togglePicker(false);
  });

  /* delegated events for everything rendered inside #view */
  view.addEventListener('click', e => {
    const t = e.target;
    let el;
    if ((el = t.closest('[data-slide]'))) { showSlide(+el.dataset.slide); lastSlide = Date.now(); }
    else if ((el = t.closest('.thumb'))) openLightbox(+el.dataset.img);
    else if ((el = t.closest('[data-missing]'))) { e.preventDefault(); toast('Fișierul nu a fost încă încărcat pe site.'); }
    else if (t.closest('.selector-head')) togglePicker();
    else if ((el = t.closest('.cls'))) { state.cls = el.dataset.cls; try { localStorage.setItem('cmv-class', state.cls); } catch (e) { /* private mode */ } drawTimetable(); togglePicker(false); }
    else if (t.closest('.tt-dl')) downloadTimetable();
    else if ((el = t.closest('[data-tt-day]'))) { state.ttDay = +el.dataset.ttDay; drawTimetable(); }
    else if ((el = t.closest('.day-arrow'))) { state.weekStart = addDays(state.weekStart, +el.dataset.shift); state.day = addDays(state.day, +el.dataset.shift); drawSubstitutions(); }
    else if ((el = t.closest('.day-chip'))) { state.day = new Date(+el.dataset.day); drawSubstitutions(); }
    else if ((el = t.closest('[data-theme-set]'))) { setTheme(el.dataset.themeSet); $$('[data-theme-set]').forEach(b => b.classList.toggle('on', b === el)); }
    else if ((el = t.closest('.social a[href="#"]'))) { e.preventDefault(); toast('Linkul către pagina de social media nu este încă setat.'); }
    else if ((el = t.closest('.btn-logout'))) {
      el.disabled = true;
      // signed out locally even if the server can't be reached
      api('logout', { method: 'POST', body: {} }).catch(() => {})
        .then(() => { token.set(null); DB.me = null; DB.subs.clear(); buildClasses(); mount('cont'); toast('Ai ieșit din cont.'); });
    }
  });
  view.addEventListener('input', e => { if (e.target.matches('.teachers-head .field')) { state.query = e.target.value; drawTeachers(); } });
  view.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target; let ok = true;
    $$('.field', form).forEach(f => { const bad = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value)); f.classList.toggle('bad', bad); if (bad) ok = false; });
    if (!ok) return toast('Completează corect toate câmpurile.');
    if (form.dataset.form === 'contact') { form.reset(); toast('Mulțumim! Mesajul este gata de trimis, dar formularul nu este încă legat la un server.'); return; }
    const btn = $('button[type=submit]', form); btn.disabled = true;
    api('login', { method: 'POST', body: { email: form.email.value.trim(), password: form.parola.value } })
      .then(({ user, token: t }) => { token.set(t); DB.me = user; DB.subs.clear(); buildClasses(); mount('cont'); toast(`Bun venit, ${user.name}!`); })
      .catch(err => { btn.disabled = false; form.parola.value = ''; toast(err.message); });
  });

  /* ---------- router ---------- */
  const ROUTES = Object.keys(PAGES);
  const currentRoute = () => { const r = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]; return ROUTES.includes(r) ? r : 'despre'; };
  let route = null, booted = false, sectionObserver = null, swapTimer = 0;

  /* home (desktop): one screen at a time, scrolling swaps it and re-arranges the rectangles */
  const slideMQ = matchMedia('all'); // one screen at a time at every width, phones included
  let homeIndex = 0, lastSlide = 0, touchY = null, slideScene = 0;
  function showSlide(i, fromBelow = false) {
    const slides = $$('.hs'); if (!slides.length) return;
    homeIndex = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, k) => { s.classList.toggle('active', k === homeIndex); s.classList.toggle('before', k < homeIndex); });
    $$('.hs-dots button').forEach((b, k) => b.classList.toggle('on', k === homeIndex));
    // coming back up into a screen that scrolls: start at its bottom, where the visitor left it
    slides[homeIndex].scrollTop = fromBelow ? slides[homeIndex].scrollHeight : 0;
    if (booted) setScene('home' + homeIndex, homeIndex !== slideScene ? .55 : 0); // a smaller breath when the slide really changes
    slideScene = homeIndex;
  }
  const sliding = () => route === 'despre' && slideMQ.matches && lb.hidden && booted;
  // lock: long enough to swallow one wheel gesture; a swipe is one gesture already, so it needs less
  function stepSlide(dir, lock = 420) {
    const now = Date.now(); if (now - lastSlide < lock) return;
    const before = homeIndex; showSlide(homeIndex + dir, dir < 0);
    if (homeIndex !== before) lastSlide = now;
  }
  // a screen taller than the viewport scrolls inside itself first; only at its edge does the swipe change screens
  // (a few px of tolerance: phones scroll in fractions of a pixel)
  const atEdge = dir => { const s = $('.hs.active'); return !s || (dir > 0 ? s.scrollTop + s.clientHeight >= s.scrollHeight - 4 : s.scrollTop <= 4); };
  let touchEdge = { up: true, down: true };
  /* wheel / touchpad: one gesture = at most one screen. A touchpad keeps sending wheel events for
     a second or more after the fingers leave (inertia), so a gesture only ends after 200 ms without
     events, or when the deltas clearly grow again well after it started (a new swipe during the
     inertia of the previous one). Like on phones, a long screen first scrolls, and the screen only
     changes for a gesture that started at its edge. */
  let wheelLast = 0, wheelDelta = 0, wheelGesture = null;
  addEventListener('wheel', e => {
    const now = Date.now(), d = Math.abs(e.deltaY) * (e.deltaMode === 1 ? 33 : 1);
    const fresh = !wheelGesture || now - wheelLast > 200 || (now - wheelGesture.t > 350 && d >= 25 && d > wheelDelta * 2);
    wheelLast = now; wheelDelta = d;
    if (fresh) wheelGesture = { t: now, up: atEdge(-1), down: atEdge(1), used: false };
    if (!sliding() || wheelGesture.used || d <= 6) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    if ((dir > 0 ? wheelGesture.down : wheelGesture.up) && atEdge(dir)) { wheelGesture.used = true; stepSlide(dir, 0); }
  }, { passive: true });
  addEventListener('keydown', e => {
    if (!sliding() || e.target.matches('input, textarea')) return;
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); stepSlide(1); }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); stepSlide(-1); }
  });
  // swipes: the screen changes only if the gesture started at the edge it moves past
  // (so scrolling a long screen to its end never jumps straight to the next one), and stays there;
  // a long drag (> 50px) or a quick flick (> 24px in under 250 ms) both count
  let touchT = 0;
  addEventListener('touchstart', e => {
    touchY = e.touches.length > 1 || (e.target.closest && e.target.closest('.topbar')) ? null : e.touches[0].clientY;
    touchT = Date.now();
    touchEdge = { up: atEdge(-1), down: atEdge(1) };
  }, { passive: true });
  addEventListener('touchend', e => {
    if (touchY == null || !sliding()) return;
    const dy = touchY - e.changedTouches[0].clientY, quick = Date.now() - touchT < 250; touchY = null;
    const dir = dy > 0 ? 1 : -1;
    if ((Math.abs(dy) > 50 || (quick && Math.abs(dy) > 24)) && (dir > 0 ? touchEdge.down : touchEdge.up) && atEdge(dir)) stepSlide(dir, 280);
  }, { passive: true });
  slideMQ.addEventListener('change', () => { if (route === 'despre') mount('despre'); });
  phoneMQ.addEventListener('change', () => { if (booted) { const s = sceneName; sceneName = null; setScene(s); } });
  // page name in the phone header: the old one slides up and fades, the new one rises in from below
  let titleSwap = 0;
  function setNavTitle(text) {
    const el = $('.nav-current');
    if (el.textContent === text) return;
    clearTimeout(titleSwap); el.getAnimations().forEach(a => a.cancel());
    if (reduced || !el.textContent || !phoneMQ.matches) { el.textContent = text; return; }
    const ease = 'cubic-bezier(.2, .8, .2, 1)';
    el.animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-9px)', filter: 'blur(3px)' }], { duration: 150, easing: 'ease-in', fill: 'forwards' });
    titleSwap = setTimeout(() => {
      el.getAnimations().forEach(a => a.cancel());
      el.textContent = text;
      el.animate([{ opacity: 0, transform: 'translateY(10px)', filter: 'blur(3px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 320, easing: ease });
    }, 150);
  }
  function mount(next) {
    route = next;
    document.body.dataset.route = next;
    document.documentElement.classList.toggle('snap', next === 'despre');
    $$('[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === next));
    const link = $(`.nav-links [data-route="${next}"]`);
    setNavTitle(link ? link.textContent : 'Cont');
    document.title = `${link ? link.textContent : 'Cont'} · Colegiul „Mihai Viteazul” Ineu`;
    view.innerHTML = PAGES[next]();
    buildAccents(view, next);
    if (next === 'orar') drawTimetable();
    if (next === 'supliniri' && canSeeSubs()) drawSubstitutions();
    if (next === 'profesori') drawTeachers();
    if (next === 'cont') drawMySubs();
    if (sectionObserver) sectionObserver.disconnect();
    if (next === 'despre' && slideMQ.matches) { slideScene = 0; showSlide(0); }
    else if (next === 'despre') {
      // phones: the screens stack, so follow the scroll position instead
      homeIndex = 0;
      sectionObserver = new IntersectionObserver(entries => entries.forEach(en => { if (!en.isIntersecting) return; en.target.classList.add('in'); if (booted && route === 'despre') setScene(en.target.dataset.scene); }), { threshold: 0.12 });
      $$('.hs').forEach(s => sectionObserver.observe(s));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function navigate() {
    const next = currentRoute();
    if (next === route || !DB.tt) return; // before the data arrives, boot() mounts whatever the hash says
    $('.nav').classList.remove('open'); $('.nav-toggle').setAttribute('aria-expanded', 'false');
    state.pickerOpen = false;
    if (booted) setScene(next, true); // while the intro is still closed the rectangles stay put
    view.classList.add('leaving');
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => { mount(next); view.classList.remove('leaving'); }, reduced ? 0 : 230);
  }
  addEventListener('hashchange', navigate);
  // picking anything in the "Altele" bar closes it; it can reopen once the pointer has left
  $('.subnav').addEventListener('click', e => { const a = e.target.closest('a'); if (a) { $('.nav-more').classList.add('shut'); a.blur(); } });
  $('.nav-more').addEventListener('mouseleave', () => $('.nav-more').classList.remove('shut'));
  $('.nav-toggle').addEventListener('click', () => { const open = $('.nav').classList.toggle('open'); $('.nav-toggle').setAttribute('aria-expanded', open); });

  /* ---------- boot: shutter closed -> opens around the title -> settles on the page ---------- */
  applyTheme();
  document.body.classList.add('closed');
  setScene('closed', false, true);
  // the intro opens by itself INTRO_MS after the page starts loading, without waiting for the data;
  // the page is mounted as soon as the data arrives (before or after the opening)
  const INTRO_MS = 150;
  const finish = () => {
    document.body.classList.remove('booting', 'closed'); booted = true;
    const r = route || currentRoute();
    setScene(r === 'despre' ? 'home' + homeIndex : r);
  };
  if (reduced) { lensEl.classList.remove('no-anim'); finish(); }
  else setTimeout(() => {
    lensEl.classList.remove('no-anim'); lensEl.classList.add('reveal');
    finish();
    setTimeout(() => lensEl.classList.remove('reveal'), 1000);
  }, Math.max(0, INTRO_MS - performance.now()));
  loadAll().catch(err => { DB.tt = DB.tt || EMPTY_TT; DB.error.tt = DB.error.news = DB.error.site = err.message; buildClasses(); })
    .finally(() => mount(currentRoute()));
})();
