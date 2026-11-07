/* Riff Looper – Gitarren-Loops für YouTube – Content Script
 * (c) 2026 Ulrich Hofer – MIT License
 * A/B-Loop, Tempo, Speed-Trainer, gespeicherte Loops, MIDI-Fußsteuerung (Web MIDI).
 * Hinweis: YouTube erzwingt Trusted Types – deshalb wird das DOM ohne innerHTML gebaut.
 */
(() => {
  'use strict';
  if (window.__yglLoaded) return;
  window.__yglLoaded = true;

  // ---------------------------------------------------------------- Konstanten
  const ACTIONS = [
    ['cycle', 'Smart-Taste (A → B+Loop → aus)'],
    ['setA', 'A setzen'],
    ['setB', 'B setzen + Loop an'],
    ['toggleLoop', 'Loop an/aus'],
    ['playPause', 'Play / Pause'],
    ['jumpA', 'Zurück zu A'],
    ['speedDown', 'Tempo −5 %'],
    ['speedUp', 'Tempo +5 %'],
    ['prevLoop', 'Vorheriger gespeicherter Loop'],
    ['nextLoop', 'Nächster gespeicherter Loop'],
    ['speedPedal', 'Expression-Pedal → Tempo'],
  ];

  const KEYS = { // Alt (Mac: Option) + Taste
    KeyA: 'setA', KeyB: 'setB', KeyL: 'toggleLoop', KeyS: 'cycle', KeyJ: 'jumpA',
    ArrowDown: 'speedDown', ArrowUp: 'speedUp', Comma: 'prevLoop', Period: 'nextLoop',
    KeyG: 'togglePanel', KeyZ: 'zoom',
  };

  const DEFAULT_SETTINGS = {
    gap: 0, preroll: 0,
    trainerOn: false, trainerStep: 5, trainerEvery: 3, trainerTarget: 100,
    switchMode: 'momentary', pedalMin: 25, pedalMax: 100,
    midiEnabled: false, collapsed: false, pos: null,
    showMidi: false, showSettings: false,
  };

  const MIN_RATE = 0.25, MAX_RATE = 2;

  const S = {
    a: null, b: null, loop: false, reps: 0, zoom: false,
    videoId: null, saved: [], savedIdx: -1,
    midiMap: {}, learning: null, midiStatus: 'nicht verbunden', midiInputs: [], lastMsg: '–',
    lastCC: {}, lastTrig: {},
    gapTimer: null, dragView: null, video: null,
    settings: { ...DEFAULT_SETTINGS },
  };

  // ---------------------------------------------------------------- Helfer
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  function fmt(t) {
    if (t == null || !isFinite(t)) return '–:––';
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
  }

  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  const store = {
    get(area, keys) {
      return new Promise((res) => {
        try { chrome.storage[area].get(keys, (r) => res(r || {})); } catch { res({}); }
      });
    },
    set(area, obj) { try { chrome.storage[area].set(obj); } catch { /* Kontext ungültig nach Reload */ } },
  };

  const saveSettings = () => store.set('sync', { yglSettings: S.settings });
  const saveMidiMap = () => store.set('sync', { yglMidiMap: S.midiMap });
  const saveLoops = () => { if (S.videoId) store.set('local', { ['yglLoops:' + S.videoId]: S.saved }); };

  function getVideoId() {
    const u = new URL(location.href);
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(shorts|live)\/([\w-]+)/);
    return m ? m[2] : null;
  }

  const getPlayer = () => document.querySelector('#movie_player');
  const getVideo = () => {
    const p = getPlayer();
    return (p && (p.querySelector('video.html5-main-video') || p.querySelector('video'))) || null;
  };
  const isAd = () => !!getPlayer()?.classList.contains('ad-showing');

  // ---------------------------------------------------------------- Loop-Logik
  function setSpeed(r) {
    const v = getVideo(); if (!v) return;
    v.playbackRate = Math.round(clamp(r, MIN_RATE, MAX_RATE) * 100) / 100;
    render();
  }

  // Eigene Sprünge markieren, damit sie nicht als manueller Sprung gelten
  function seekTo(v, t) {
    S.selfSeekTarget = t;
    v.currentTime = t;
  }
  // Ein Sprung gilt als eigener, wenn er genau auf unser letztes Sprungziel geht
  const isSelfSeek = (v) => S.selfSeekTarget != null && Math.abs(v.currentTime - S.selfSeekTarget) < 0.05;

  // Manueller Sprung (YouTube-Fortschrittsbalken, Timeline, Tastatur) aus dem Loop heraus → Loop aus
  function onSeeking() {
    const v = S.video;
    if (!v || isSelfSeek(v)) return;
    if (S.loop && S.a != null && S.b != null && (v.currentTime < S.a - 0.25 || v.currentTime > S.b + 0.05)) {
      S.loop = false; S.reps = 0; cancelGap(); render();
    }
  }

  function cancelGap() {
    if (S.gapTimer) { clearTimeout(S.gapTimer); S.gapTimer = null; }
  }

  function setA(v) {
    S.a = Math.max(0, v.currentTime - (S.settings.preroll || 0));
    if (S.b != null && S.b <= S.a + 0.05) { S.b = null; S.loop = false; }
    S.savedIdx = -1;
  }

  function setB(v) {
    if (S.a == null) S.a = 0;
    const t = v.currentTime;
    if (t <= S.a + 0.05) return;
    S.b = t; S.loop = true; S.reps = 0; S.savedIdx = -1;
    cancelGap();
    seekTo(v, S.a);
    if (v.paused) v.play();
  }

  function clearLoop() {
    cancelGap();
    S.a = null; S.b = null; S.loop = false; S.reps = 0; S.zoom = false; S.savedIdx = -1;
  }

  function onLoopEnd(v) {
    S.reps++;
    const st = S.settings;
    if (st.trainerOn && st.trainerEvery > 0 && S.reps % st.trainerEvery === 0) {
      const target = st.trainerTarget / 100;
      if (v.playbackRate < target - 0.001) {
        v.playbackRate = Math.round(Math.min(target, v.playbackRate + st.trainerStep / 100) * 100) / 100;
      }
    }
    seekTo(v, S.a);
    if (st.gap > 0) {
      v.pause();
      S.gapTimer = setTimeout(() => { S.gapTimer = null; if (S.loop) v.play(); }, st.gap * 1000);
    }
    render();
  }

  function checkLoop() {
    const v = S.video;
    if (!v || !S.loop || S.a == null || S.b == null || S.gapTimer || isAd()) return;
    // Laufender manueller Sprung: erst auswerten, nicht zurück zu A werfen
    if (v.seeking && !isSelfSeek(v)) { onSeeking(); return; }
    if (v.currentTime >= S.b) onLoopEnd(v);
  }

  function tick() {
    checkLoop();
    if (ui.panel && ui.panel.isConnected) renderTimeline();
    requestAnimationFrame(tick);
  }

  function loadSaved(i) {
    if (!S.saved.length) return;
    const n = S.saved.length;
    i = ((i % n) + n) % n;
    const L = S.saved[i];
    const v = getVideo(); if (!v) return;
    cancelGap();
    S.savedIdx = i; S.a = L.a; S.b = L.b; S.loop = true; S.reps = 0;
    if (L.speed) v.playbackRate = L.speed;
    seekTo(v, L.a);
    if (v.paused) v.play();
  }

  function saveCurrentLoop() {
    if (S.a == null || S.b == null) return;
    const v = getVideo();
    const name = (ui.nameInput.value || '').trim() || `Loop ${S.saved.length + 1}`;
    S.saved.push({ name, a: S.a, b: S.b, speed: v ? v.playbackRate : 1 });
    S.saved.sort((x, y) => x.a - y.a);
    S.savedIdx = S.saved.findIndex((L) => L.a === S.a && L.b === S.b);
    ui.nameInput.value = '';
    saveLoops();
  }

  function nudge(which, delta) {
    const v = getVideo();
    const dur = v && isFinite(v.duration) ? v.duration : Infinity;
    if (which === 'a' && S.a != null) {
      S.a = clamp(S.a + delta, 0, (S.b ?? dur) - 0.05);
      if (S.loop && v) seekTo(v, S.a);
    }
    if (which === 'b' && S.b != null) {
      S.b = clamp(S.b + delta, (S.a ?? 0) + 0.05, dur);
      // B verkürzt: kurz vor B anspielen, um das Ende zu hören
      if (S.loop && v) seekTo(v, Math.max(S.a, S.b - 1.5));
    }
  }

  function doAction(name, opt = {}) {
    if (name === 'togglePanel') { S.settings.collapsed = !S.settings.collapsed; saveSettings(); render(); return; }
    const v = getVideo(); if (!v) return;
    switch (name) {
      case 'setA': setA(v); break;
      case 'setB': setB(v); break;
      case 'cycle':
        if (S.loop) clearLoop();
        else if (S.a != null && S.b == null) setB(v);
        else { S.b = null; setA(v); }
        break;
      case 'toggleLoop':
        if (S.a != null && S.b != null) {
          S.loop = !S.loop; S.reps = 0; cancelGap();
          if (S.loop) { seekTo(v, S.a); if (v.paused) v.play(); }
        }
        break;
      case 'playPause': cancelGap(); if (v.paused) v.play(); else v.pause(); break;
      case 'jumpA': cancelGap(); if (S.a != null) seekTo(v, S.a); if (v.paused) v.play(); break;
      case 'speedDown': setSpeed(v.playbackRate - 0.05); break;
      case 'speedUp': setSpeed(v.playbackRate + 0.05); break;
      case 'speedReset': setSpeed(1); break;
      case 'prevLoop': loadSaved(S.savedIdx < 0 ? S.saved.length - 1 : S.savedIdx - 1); break;
      case 'nextLoop': loadSaved(S.savedIdx + 1); break;
      case 'clear': clearLoop(); break;
      case 'zoom': if (S.a != null && S.b != null) S.zoom = !S.zoom; break;
      case 'nudge': nudge(opt.which, opt.delta); break;
      case 'save': saveCurrentLoop(); break;
    }
    render();
  }

  // ---------------------------------------------------------------- MIDI
  function describeKey(key) {
    if (!key) return 'nicht belegt';
    const [t, ch, n] = key.split(':');
    const label = { cc: 'CC', note: 'Note', pc: 'PC' }[t] || t;
    return `${label} ${n} · Kanal ${+ch + 1}`;
  }

  async function initMidi() {
    if (!navigator.requestMIDIAccess) { S.midiStatus = 'Web MIDI nicht verfügbar (Chrome/Edge nötig)'; render(); return; }
    S.midiStatus = 'verbinde …'; render();
    try {
      const acc = await navigator.requestMIDIAccess({ sysex: false });
      const bind = () => {
        S.midiInputs = [];
        for (const inp of acc.inputs.values()) {
          inp.onmidimessage = onMidi;
          if (inp.state === 'connected') S.midiInputs.push(inp.name);
        }
        S.midiStatus = S.midiInputs.length ? 'verbunden' : 'kein Gerät gefunden';
        render();
      };
      bind();
      acc.onstatechange = bind;
      if (!S.settings.midiEnabled) { S.settings.midiEnabled = true; saveSettings(); }
    } catch (e) {
      S.midiStatus = 'Zugriff verweigert – Schloss-Symbol links in der Adressleiste → MIDI-Geräte: Zulassen, dann Seite neu laden';
      console.warn('[Riff Looper] MIDI:', e);
      render();
    }
  }

  function onMidi(e) {
    const st = e.data[0], d1 = e.data[1], d2 = e.data.length > 2 ? e.data[2] : 0;
    const type = st & 0xf0, ch = st & 0x0f;
    let t;
    if (type === 0x90 && d2 > 0) t = 'note';
    else if (type === 0xb0) t = 'cc';
    else if (type === 0xc0) t = 'pc';
    else return; // Note-Off, Clock usw. ignorieren

    const key = `${t}:${ch}:${d1}`;
    S.msgCount = (S.msgCount || 0) + 1;
    if (t === 'cc') S.lastCC[key] = d2;
    S.lastMsg = describeKey(key) + (t === 'cc' || t === 'note' ? ` = ${d2}` : '') + `  (${S.msgCount} empfangen)`;

    // MIDI-Learn
    if (S.learning) {
      const act = S.learning;
      const isPedal = act === 'speedPedal';
      if (isPedal && t !== 'cc') { renderMidiInfo(); return; }
      for (const k of Object.keys(S.midiMap)) if (S.midiMap[k] === key) delete S.midiMap[k];
      S.midiMap[act] = key;
      S.learning = null;
      S.lastTrig[key] = performance.now(); // Loslassen des Lern-Tritts nicht auslösen
      saveMidiMap();
      render();
      return;
    }

    for (const act of Object.keys(S.midiMap)) {
      if (S.midiMap[act] !== key) continue;
      if (act === 'speedPedal') {
        const lo = S.settings.pedalMin / 100, hi = S.settings.pedalMax / 100;
        setSpeed(lo + (d2 / 127) * (hi - lo));
        continue;
      }
      if (t === 'cc') {
        // Standard: jeder Wert > 0 ist ein Tritt (Loslassen mit Wert 0 wird ignoriert).
        // Funktioniert für Taster (127/0) und für Controller, die bei jedem Tritt denselben Wert senden.
        // „Jede Nachricht“: für rastende Schalter, die abwechselnd 127 und 0 senden.
        if (S.settings.switchMode === 'momentary' && d2 === 0) continue;
      }
      const now = performance.now();
      if (now - (S.lastTrig[key] || 0) < 120) continue; // Entprellen
      S.lastTrig[key] = now;
      doAction(act);
    }
    renderMidiInfo();
  }

  // ---------------------------------------------------------------- UI
  const ui = {};

  function viewRange() {
    if (S.dragView) return S.dragView;
    const v = S.video;
    const dur = v && isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    if (S.zoom && S.a != null && S.b != null) {
      const pad = Math.max(2, (S.b - S.a) * 0.3);
      return [Math.max(0, S.a - pad), dur ? Math.min(dur, S.b + pad) : S.b + pad];
    }
    return [0, dur || 1];
  }

  function timeFromX(clientX) {
    const r = ui.timeline.getBoundingClientRect();
    const f = clamp((clientX - r.left) / r.width, 0, 1);
    const [vs, ve] = viewRange();
    return vs + f * (ve - vs);
  }

  const pct = (t) => { const [vs, ve] = viewRange(); return clamp(((t - vs) / (ve - vs)) * 100, 0, 100); };

  function makeHandleDraggable(handle, which) {
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      handle.setPointerCapture(e.pointerId);
      S.dragView = viewRange();
      const move = (ev) => {
        const t = timeFromX(ev.clientX);
        if (which === 'a') S.a = Math.min(t, (S.b ?? Infinity) - 0.05);
        else S.b = Math.max(t, (S.a ?? 0) + 0.05);
        S.savedIdx = -1;
        renderTimes();
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        S.dragView = null;
        const v = getVideo();
        if (v && S.loop) seekTo(v, which === 'a' ? S.a : Math.max(S.a, S.b - 1.5));
        render();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  function makePanelDraggable(grip) {
    grip.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      const startX = e.clientX, startY = e.clientY;
      const x0 = ui.panel.offsetLeft, y0 = ui.panel.offsetTop;
      const move = (ev) => {
        S.settings.pos = { x: x0 + ev.clientX - startX, y: y0 + ev.clientY - startY };
        placePanel();
      };
      const up = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        saveSettings();
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
    });
  }

  function placePanel() {
    const p = ui.panel, parent = p.parentElement;
    if (!parent) return;
    const pos = S.settings.pos || { x: 12, y: 12 };
    const maxX = Math.max(0, parent.clientWidth - p.offsetWidth);
    const maxY = Math.max(0, parent.clientHeight - p.offsetHeight);
    p.style.left = clamp(pos.x, 0, maxX) + 'px';
    p.style.top = clamp(pos.y, 0, maxY) + 'px';
  }

  function numInput(key, min, max, step, title) {
    return h('input', {
      type: 'number', class: 'ygl-num', min, max, step, title, 'data-key': key,
      onchange: (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) S.settings[key] = clamp(val, min, max);
        e.target.value = S.settings[key];
        saveSettings();
      },
    });
  }

  function buildPanel() {
    const btn = (label, action, title, cls = '', opt) =>
      h('button', { class: 'ygl-btn ' + cls, title, onclick: (e) => { e.preventDefault(); doAction(action, opt ? opt(e) : {}); } }, label);
    const nudgeBtn = (label, which, sign) =>
      h('button', {
        class: 'ygl-btn ygl-mini', title: 'Klick: 0,1 s · Shift-Klick: 1 s',
        onclick: (e) => { e.preventDefault(); doAction('nudge', { which, delta: sign * (e.shiftKey ? 1 : 0.1) }); },
      }, label);

    // Kopfzeile
    ui.status = h('span', { class: 'ygl-status' });
    ui.midiDot = h('span', { class: 'ygl-mididot', title: 'MIDI' });
    ui.collapseBtn = h('button', { class: 'ygl-icon', title: 'Ein-/ausklappen (Alt+G)', onclick: () => doAction('togglePanel') });
    ui.header = h('div', { class: 'ygl-header' },
      h('span', { class: 'ygl-title' }, '🎸 Riff Looper'), ui.status, h('span', { class: 'ygl-spacer' }), ui.midiDot, ui.collapseBtn);
    makePanelDraggable(ui.header);

    // Timeline
    ui.region = h('div', { class: 'ygl-region' });
    ui.playhead = h('div', { class: 'ygl-playhead' });
    ui.handleA = h('div', { class: 'ygl-handle ygl-ha', title: 'A ziehen' }, 'A');
    ui.handleB = h('div', { class: 'ygl-handle ygl-hb', title: 'B ziehen' }, 'B');
    ui.timeline = h('div', { class: 'ygl-tl', title: 'Klicken = springen, A/B-Griffe ziehen' },
      ui.region, ui.playhead, ui.handleA, ui.handleB);
    ui.timeline.addEventListener('pointerdown', (e) => {
      if (e.target === ui.handleA || e.target === ui.handleB) return;
      const v = getVideo(); if (!v) return;
      cancelGap();
      v.currentTime = timeFromX(e.clientX);
    });
    makeHandleDraggable(ui.handleA, 'a');
    makeHandleDraggable(ui.handleB, 'b');
    ui.tlStart = h('span'); ui.tlNow = h('span', { class: 'ygl-now' }); ui.tlEnd = h('span');
    ui.zoomBtn = btn('🔍 Zoom', 'zoom', 'Timeline auf den Loop zoomen (Alt+Z)', 'ygl-mini');
    const tlLabels = h('div', { class: 'ygl-tllabels' }, ui.tlStart, ui.tlNow, ui.zoomBtn, ui.tlEnd);

    // A/B-Zeile
    ui.aTime = h('span', { class: 'ygl-time' }); ui.bTime = h('span', { class: 'ygl-time' });
    ui.lenTime = h('span', { class: 'ygl-len' });
    const abRow = h('div', { class: 'ygl-row ygl-ab' },
      h('span', { class: 'ygl-tag ygl-tag-a' }, 'A'), nudgeBtn('−', 'a', -1), ui.aTime, nudgeBtn('+', 'a', 1),
      h('span', { class: 'ygl-spacer' }), ui.lenTime, h('span', { class: 'ygl-spacer' }),
      h('span', { class: 'ygl-tag ygl-tag-b' }, 'B'), nudgeBtn('−', 'b', -1), ui.bTime, nudgeBtn('+', 'b', 1));

    // Haupt-Buttons
    ui.loopBtn = btn('⟲ Loop', 'toggleLoop', 'Loop an/aus (Alt+L)', 'ygl-loopbtn');
    ui.playBtn = btn('⏯', 'playPause', 'Play/Pause');
    const mainRow = h('div', { class: 'ygl-row' },
      btn('[ A', 'setA', 'Startpunkt setzen (Alt+A)', 'ygl-a'),
      btn('B ]', 'setB', 'Endpunkt setzen, Loop startet (Alt+B)', 'ygl-b'),
      ui.loopBtn,
      btn('⏮ A', 'jumpA', 'Zurück zu A (Alt+J)'),
      ui.playBtn,
      btn('✕', 'clear', 'Loop löschen', 'ygl-mini'));

    // Tempo
    ui.speedVal = h('span', { class: 'ygl-speedval', title: 'Doppelklick = 100 %', ondblclick: () => doAction('speedReset') });
    ui.speedSlider = h('input', {
      type: 'range', class: 'ygl-slider', min: MIN_RATE * 100, max: MAX_RATE * 100, step: 5,
      oninput: (e) => setSpeed(+e.target.value / 100),
    });
    const speedRow = h('div', { class: 'ygl-row' },
      h('span', { class: 'ygl-label' }, 'Tempo'),
      btn('−', 'speedDown', 'Langsamer (Alt+↓)', 'ygl-mini'),
      ui.speedSlider,
      btn('+', 'speedUp', 'Schneller (Alt+↑)', 'ygl-mini'),
      ui.speedVal);
    const presetRow = h('div', { class: 'ygl-row ygl-presets' },
      ...[50, 60, 70, 75, 80, 90, 100].map((p) =>
        h('button', { class: 'ygl-btn ygl-chip', onclick: () => setSpeed(p / 100) }, p + '%')));

    // Gespeicherte Loops
    ui.nameInput = h('input', { type: 'text', class: 'ygl-text', placeholder: 'Name (z. B. „Solo Takt 5–8“)' });
    ui.nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAction('save'); });
    ui.saveBtn = btn('💾 Speichern', 'save', 'Aktuellen Loop für dieses Video speichern', 'ygl-mini');
    ui.savedList = h('div', { class: 'ygl-saved' });
    const savedBox = h('div', { class: 'ygl-section' },
      h('div', { class: 'ygl-row' }, ui.nameInput, ui.saveBtn), ui.savedList);

    // Einstellungen
    ui.trainerChk = h('input', {
      type: 'checkbox', onchange: (e) => { S.settings.trainerOn = e.target.checked; S.reps = 0; saveSettings(); },
    });
    ui.gapSel = h('select', { class: 'ygl-sel', onchange: (e) => { S.settings.gap = +e.target.value; saveSettings(); } },
      ...[0, 0.5, 1, 2, 3, 4].map((s) => h('option', { value: s }, s ? `${s} s` : 'keine')));
    ui.prerollSel = h('select', { class: 'ygl-sel', onchange: (e) => { S.settings.preroll = +e.target.value; saveSettings(); } },
      ...[0, 0.1, 0.2, 0.3, 0.5, 1].map((s) => h('option', { value: s }, s ? `${s} s` : 'aus')));
    ui.settingsBox = h('div', { class: 'ygl-section' },
      h('div', { class: 'ygl-row' }, h('span', { class: 'ygl-label ygl-wide' }, 'Pause zwischen Durchgängen'), ui.gapSel),
      h('div', { class: 'ygl-row' }, h('span', { class: 'ygl-label ygl-wide', title: 'A wird um diesen Wert früher gesetzt – gleicht die Reaktionszeit beim Treten aus' }, 'A-Vorlauf (Reaktionszeit)'), ui.prerollSel),
      h('div', { class: 'ygl-row' },
        h('label', { class: 'ygl-label ygl-wide' }, ui.trainerChk, ' Speed-Trainer')),
      h('div', { class: 'ygl-row ygl-indent' },
        '+', numInput('trainerStep', 1, 25, 1, 'Schritt in %'), '% alle',
        numInput('trainerEvery', 1, 20, 1, 'Durchgänge'), 'Durchgänge bis',
        numInput('trainerTarget', 30, 200, 5, 'Zieltempo in %'), '%'),
      h('div', { class: 'ygl-hint' }, 'Tastatur: Alt/⌥ + A, B, L, S (Smart), J, ↑/↓, , / . (Loops), Z (Zoom), G (Panel)'));

    // MIDI
    ui.midiStatus = h('span', { class: 'ygl-midistatus' });
    ui.midiLast = h('span', { class: 'ygl-midilast' });
    ui.midiConnect = h('button', { class: 'ygl-btn ygl-mini', onclick: () => initMidi() }, 'MIDI verbinden');
    ui.modeSel = h('select', { class: 'ygl-sel', onchange: (e) => { S.settings.switchMode = e.target.value; saveSettings(); } },
      h('option', { value: 'momentary' }, 'Standard (Wert > 0 = Tritt)'),
      h('option', { value: 'latching' }, 'Jede Nachricht = Tritt'));
    ui.midiRows = h('div', { class: 'ygl-midirows' });
    ui.midiBox = h('div', { class: 'ygl-section' },
      h('div', { class: 'ygl-row' }, ui.midiConnect, ui.midiStatus),
      h('div', { class: 'ygl-row ygl-small' }, 'Letzte Nachricht: ', ui.midiLast),
      h('div', { class: 'ygl-row' }, h('span', { class: 'ygl-label ygl-wide' }, 'Auswertung (bei CC)'), ui.modeSel),
      ui.midiRows,
      h('div', { class: 'ygl-row ygl-small' }, 'Pedal-Bereich',
        numInput('pedalMin', 25, 200, 5, 'Tempo bei Pedalwert 0 (%)'), '% –',
        numInput('pedalMax', 25, 200, 5, 'Tempo bei Pedalwert 127 (%)'), '%'));

    for (const [act, label] of ACTIONS) {
      const map = h('span', { class: 'ygl-map', 'data-act': act });
      const learn = h('button', {
        class: 'ygl-btn ygl-mini ygl-learn', 'data-act': act,
        onclick: () => { S.learning = S.learning === act ? null : act; render(); },
      }, 'Lernen');
      const del = h('button', {
        class: 'ygl-btn ygl-mini', title: 'Zuordnung löschen',
        onclick: () => { delete S.midiMap[act]; saveMidiMap(); render(); },
      }, '✕');
      ui.midiRows.append(h('div', { class: 'ygl-row ygl-midirow' }, h('span', { class: 'ygl-actlabel' }, label), map, learn, del));
    }

    // Klappbare Bereiche
    const toggle = (key, label) => {
      const b = h('button', {
        class: 'ygl-fold', onclick: () => { S.settings[key] = !S.settings[key]; saveSettings(); render(); },
      });
      b.dataset.label = label;
      return b;
    };
    ui.foldSettings = toggle('showSettings', '⚙ Üben');
    ui.foldMidi = toggle('showMidi', '🎛 MIDI-Fußschalter');

    ui.body = h('div', { class: 'ygl-body' },
      ui.timeline, tlLabels, abRow, mainRow, speedRow, presetRow, savedBox,
      ui.foldSettings, ui.settingsBox, ui.foldMidi, ui.midiBox);

    ui.panel = h('div', { class: 'ygl-panel' }, ui.header, ui.body);

    // Klicks/Tasten im Panel nicht an den YouTube-Player weitergeben
    for (const ev of ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'wheel', 'keydown', 'keyup', 'keypress', 'contextmenu']) {
      ui.panel.addEventListener(ev, (e) => e.stopPropagation());
    }
  }

  // ---------------------------------------------------------------- Rendern
  function renderTimes() {
    ui.aTime.textContent = fmt(S.a);
    ui.bTime.textContent = fmt(S.b);
    ui.lenTime.textContent = S.a != null && S.b != null ? `Länge ${(S.b - S.a).toFixed(1)} s` : '';
    renderTimeline();
  }

  function renderTimeline() {
    const v = S.video;
    const [vs, ve] = viewRange();
    const hasA = S.a != null, hasB = S.b != null;
    ui.handleA.style.display = hasA ? '' : 'none';
    ui.handleB.style.display = hasB ? '' : 'none';
    if (hasA) ui.handleA.style.left = pct(S.a) + '%';
    if (hasB) ui.handleB.style.left = pct(S.b) + '%';
    if (hasA && hasB) {
      ui.region.style.display = '';
      ui.region.style.left = pct(S.a) + '%';
      ui.region.style.width = (pct(S.b) - pct(S.a)) + '%';
      ui.region.classList.toggle('ygl-active', S.loop);
    } else ui.region.style.display = 'none';
    if (v) {
      ui.playhead.style.left = pct(v.currentTime) + '%';
      const nowTxt = fmt(v.currentTime);
      if (ui.tlNow.textContent !== nowTxt) ui.tlNow.textContent = nowTxt;
    }
    const st = fmt(vs), en = fmt(ve);
    if (ui.tlStart.textContent !== st) ui.tlStart.textContent = st;
    if (ui.tlEnd.textContent !== en) ui.tlEnd.textContent = en;
  }

  function renderSaved() {
    clear(ui.savedList);
    if (!S.saved.length) {
      ui.savedList.append(h('div', { class: 'ygl-empty' }, 'Noch keine gespeicherten Loops für dieses Video.'));
      return;
    }
    S.saved.forEach((L, i) => {
      ui.savedList.append(h('div', { class: 'ygl-saveditem' + (i === S.savedIdx ? ' ygl-cur' : '') },
        h('button', { class: 'ygl-savedname', title: 'Loop laden', onclick: () => { loadSaved(i); render(); } },
          h('b', {}, L.name), ` ${fmt(L.a)}–${fmt(L.b)} · ${Math.round((L.speed || 1) * 100)}%`),
        h('button', {
          class: 'ygl-btn ygl-mini', title: 'Löschen',
          onclick: () => {
            S.saved.splice(i, 1);
            if (S.savedIdx === i) S.savedIdx = -1; else if (S.savedIdx > i) S.savedIdx--;
            saveLoops(); render();
          },
        }, '✕')));
    });
  }

  function renderMidiInfo() {
    ui.midiLast.textContent = S.lastMsg;
  }

  function renderMidi() {
    const connected = S.midiStatus === 'verbunden';
    ui.midiDot.className = 'ygl-mididot' + (connected ? ' ygl-on' : '');
    ui.midiDot.title = 'MIDI: ' + S.midiStatus + (S.midiInputs.length ? ' (' + S.midiInputs.join(', ') + ')' : '');
    ui.midiStatus.textContent = S.midiStatus + (S.midiInputs.length ? ': ' + S.midiInputs.join(', ') : '');
    ui.midiConnect.style.display = connected ? 'none' : '';
    for (const el of ui.midiRows.querySelectorAll('.ygl-map')) el.textContent = describeKey(S.midiMap[el.dataset.act]);
    for (const el of ui.midiRows.querySelectorAll('.ygl-learn')) {
      const on = S.learning === el.dataset.act;
      el.textContent = on ? (el.dataset.act === 'speedPedal' ? 'Pedal bewegen …' : 'Jetzt treten …') : 'Lernen';
      el.classList.toggle('ygl-learning', on);
    }
    renderMidiInfo();
  }

  function render() {
    if (!ui.panel) return;
    const st = S.settings;
    const v = getVideo();
    ui.panel.classList.toggle('ygl-collapsed', !!st.collapsed);
    ui.collapseBtn.textContent = st.collapsed ? '▸' : '▾';

    let status = '';
    if (S.loop) status = `⟲ ${S.reps}×`;
    else if (S.a != null && S.b == null) status = 'A gesetzt – B?';
    if (v && Math.abs(v.playbackRate - 1) > 0.001) status += ` · ${Math.round(v.playbackRate * 100)}%`;
    if (S.gapTimer) status += ' · Pause';
    ui.status.textContent = status;

    ui.loopBtn.classList.toggle('ygl-on', S.loop);
    ui.loopBtn.disabled = !(S.a != null && S.b != null);
    ui.zoomBtn.classList.toggle('ygl-on', S.zoom);
    ui.zoomBtn.disabled = !(S.a != null && S.b != null);
    ui.saveBtn.disabled = !(S.a != null && S.b != null);

    if (v) {
      const r = Math.round(v.playbackRate * 100);
      ui.speedVal.textContent = r + ' %';
      if (document.activeElement !== ui.speedSlider) ui.speedSlider.value = r;
    }

    ui.gapSel.value = String(st.gap);
    ui.prerollSel.value = String(st.preroll);
    ui.trainerChk.checked = !!st.trainerOn;
    ui.modeSel.value = st.switchMode;
    for (const inp of ui.panel.querySelectorAll('input.ygl-num')) {
      if (document.activeElement !== inp) inp.value = st[inp.dataset.key];
    }

    ui.settingsBox.style.display = st.showSettings ? '' : 'none';
    ui.midiBox.style.display = st.showMidi ? '' : 'none';
    ui.foldSettings.textContent = (st.showSettings ? '▾ ' : '▸ ') + ui.foldSettings.dataset.label;
    ui.foldMidi.textContent = (st.showMidi ? '▾ ' : '▸ ') + ui.foldMidi.dataset.label;

    renderTimes();
    renderSaved();
    renderMidi();
    placePanel();
  }

  // ---------------------------------------------------------------- Einbindung in YouTube
  function attachVideo(v) {
    S.video = v;
    v.addEventListener('timeupdate', checkLoop);
    v.addEventListener('seeking', onSeeking);
    v.addEventListener('ratechange', render);
    v.addEventListener('loadedmetadata', render);
    v.addEventListener('play', () => { cancelGap(); render(); });
    v.addEventListener('pause', render);
  }

  async function onNewVideo(id) {
    S.videoId = id;
    clearLoop();
    S.saved = [];
    if (id) {
      const r = await store.get('local', 'yglLoops:' + id);
      if (S.videoId === id) S.saved = r['yglLoops:' + id] || [];
    }
    render();
  }

  function ensureAttached() {
    const player = getPlayer();
    const id = getVideoId();
    if (!player || !id) { if (ui.panel) ui.panel.style.display = 'none'; return; }
    if (!ui.panel) { buildPanel(); render(); }
    ui.panel.style.display = '';
    if (ui.panel.parentElement !== player) { player.appendChild(ui.panel); placePanel(); }
    const v = getVideo();
    if (v && v !== S.video) attachVideo(v);
    if (id !== S.videoId) onNewVideo(id);
  }

  function onKey(e) {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const act = KEYS[e.code];
    if (!act || !getVideoId()) return;
    e.preventDefault();
    e.stopPropagation();
    doAction(act);
  }

  async function init() {
    const r = await store.get('sync', ['yglSettings', 'yglMidiMap']);
    S.settings = { ...DEFAULT_SETTINGS, ...(r.yglSettings || {}) };
    S.midiMap = r.yglMidiMap || {};
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('yt-navigate-finish', ensureAttached);
    window.addEventListener('resize', () => ui.panel && placePanel());
    document.addEventListener('fullscreenchange', () => setTimeout(() => ui.panel && placePanel(), 300));
    setInterval(ensureAttached, 1000);
    ensureAttached();
    if (S.settings.midiEnabled) initMidi();
    requestAnimationFrame(tick);
  }

  init();
})();
