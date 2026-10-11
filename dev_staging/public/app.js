/* CAPTCHA Gym front end (SPEC §2.1: vanilla JS, no build step, no CDN).
 * The client is deliberately dumb: it renders what the server sends, records
 * an event trace (SPEC §6.4), and submits tile IDs. The answer key and every
 * score stay server-side at all times (SPEC §2.3). */
'use strict';

const $ = (id) => document.getElementById(id);
let sessionId = null;
let currentChallenge = null;
let widgetBusy = false;

/* ------------------------------------------------------------ event trace */
const trace = [];
function describeTarget(el) {
  if (!el || el === document.body) return { target: 'other', tile_id: null };
  const tile = el.closest ? el.closest('.tile') : null;
  if (tile) return { target: 'tile:' + tile.dataset.pos, tile_id: tile.dataset.tileId || null };
  const tagged = el.closest ? el.closest('[data-trace]') : null;
  if (tagged) return { target: tagged.dataset.trace, tile_id: null };
  return { target: 'other', tile_id: null };
}
function logEvent(type, e) {
  const d = describeTarget(e.target);
  trace.push({ t: Math.round(performance.now()), type, x: Math.round(e.clientX || 0), y: Math.round(e.clientY || 0), target: d.target, tile_id: d.tile_id });
  if (trace.length > 4000) trace.splice(0, trace.length - 4000);
}
let lastMove = 0;
document.addEventListener('pointermove', (e) => {
  const n = performance.now();
  if (n - lastMove < 45) return;
  lastMove = n; logEvent('pointermove', e);
}, true);
for (const t of ['pointerdown', 'pointerup', 'click']) document.addEventListener(t, (e) => logEvent(t, e), true);
document.addEventListener('keydown', (e) => trace.push({ t: Math.round(performance.now()), type: 'keydown', x: 0, y: 0, target: 'other', tile_id: null }));
window.addEventListener('focus', () => trace.push({ t: Math.round(performance.now()), type: 'focus', x: 0, y: 0, target: 'other', tile_id: null }));
let lastScroll = 0;
document.addEventListener('scroll', () => {
  const n = performance.now(); if (n - lastScroll < 200) return; lastScroll = n;
  trace.push({ t: Math.round(n), type: 'scroll', x: 0, y: Math.round(window.scrollY), target: 'other', tile_id: null });
}, true);

function clientSignals() {
  let renderer = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  } catch { /* no webgl — leave blank */ }
  return {
    webdriver: navigator.webdriver === true,
    ua: navigator.userAgent, platform: navigator.platform, language: navigator.language,
    plugins: navigator.plugins ? navigator.plugins.length : 0,
    has_chrome: typeof window.chrome !== 'undefined',
    webgl_renderer: renderer, screen: [window.screen.width, window.screen.height],
    timezone: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '',
  };
}

async function api(path, body) {
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
  return r.json();
}

/* ----------------------------------------------------------------- widget */
function setWidgetMsg(text) { $('widget-msg').textContent = text || ''; }
function resetWidget() {
  widgetBusy = false;
  $('checkbox').classList.remove('checked');
  $('checkbox').disabled = false;
  $('spinner').hidden = true;
  $('popover').hidden = true;
  currentChallenge = null;
}
function cooldownWidget(seconds) {
  resetWidget();
  $('checkbox').disabled = true;
  let left = seconds;
  setWidgetMsg(`Too many attempts. Try again in ${left}s.`);
  const iv = setInterval(() => {
    left--;
    if (left <= 0) { clearInterval(iv); $('checkbox').disabled = false; setWidgetMsg('You can try again now.'); }
    else setWidgetMsg(`Too many attempts. Try again in ${left}s.`);
  }, 1000);
}
function passWidget(token) {
  resetWidget();
  $('checkbox').classList.add('checked');
  $('checkbox').disabled = true;
  $('tokenValue').textContent = token;
  $('tokenPanel').hidden = false;
  setWidgetMsg('');
}

$('checkbox').addEventListener('click', async () => {
  if (widgetBusy || $('checkbox').disabled) return;
  widgetBusy = true;
  $('spinner').hidden = false;
  const body = { event_trace: trace.slice(-2000), client_signals: clientSignals() };
  const res = await api(`/api/session/${sessionId}/checkbox`, body);
  $('spinner').hidden = true;
  if (res.outcome === 'pass') return passWidget(res.token);
  if (res.outcome === 'cooldown') return cooldownWidget(res.retry_after_s);
  if (res.outcome === 'challenge') { widgetBusy = false; return openChallenge(res.challenge, ''); }
  widgetBusy = false;
});

/* -------------------------------------------------------------- challenge */
function openChallenge(ch, msg) {
  currentChallenge = ch;
  $('instruction').textContent = ch.instruction;
  $('challenge-msg').textContent = msg || '';
  $('skipBtn').style.display = (ch.type === 'typeA_dynamic' || ch.type === 'typeB') ? 'none' : ''; // Skip exists only in Type A static (SPEC §3.3/§3.5)
  const grid = $('grid'); grid.innerHTML = '';
  grid.className = 'grid' + (ch.tiles.length === 16 ? ' grid-4' : '') + (ch.aspect ? ' grid-photo' : '');
  grid.style.aspectRatio = ch.aspect ? ch.aspect[0] + ' / ' + ch.aspect[1] : '';
  ch.tiles.forEach((tile, i) => {
    const b = document.createElement('button');
    b.className = 'tile'; b.dataset.tileId = tile.tile_id; b.dataset.pos = i; b.dataset.busy = '';
    if (tile.bg) {
      // Real-photo Type B (Stage 3): the tile is a CSS slice of the whole
      // scene image — background-size 400%×400%, position picks the cell.
      const fill = document.createElement('div');
      fill.className = 'photo-fill';
      fill.style.backgroundImage = `url("${tile.src}")`;
      fill.style.backgroundPosition = tile.bg.x + '% ' + tile.bg.y + '%';
      b.appendChild(fill);
    } else {
      const img = document.createElement('img');
      img.src = tile.src; img.alt = '';
      // One self-heal reload on a failed image fetch (v1.1): a single dropped
      // transfer over the tunnel otherwise leaves a broken-image tile the
      // agent must judge blind. Same opaque URL, one retry, then give up.
      img.addEventListener('error', () => {
        if (img.dataset.retried) return;
        img.dataset.retried = '1';
        img.src = tile.src + '?r=1';
      });
      b.appendChild(img);
    }
    b.addEventListener('click', () => onTileClick(b));
    grid.appendChild(b);
  });
  if (ch.aspect) {
    // Photo self-heal: background images fire no error events, so preload
    // the scene once; on failure, re-point every tile at a fresh fetch.
    const pre = new Image(); let retried = false;
    pre.onerror = () => {
      if (retried) return; retried = true;
      grid.querySelectorAll('.photo-fill').forEach(d => { d.style.backgroundImage = `url("${ch.tiles[0].src}?r=1")`; });
    };
    pre.src = ch.tiles[0].src;
  }
  $('popover').hidden = false;
}

async function onTileClick(btn) {
  if (!currentChallenge || btn.dataset.busy === '1') return;
  // Type A static AND Type B toggle locally (SPEC §3.3/§3.5): both are
  // single-pass games scored from the set submitted at Verify — there is
  // no per-click server protocol for them. (Bug history: Type B used to
  // fall through to the dynamic path below; the server rejects /click for
  // non-dynamic challenges, the response matched no branch, and the click
  // was silently dropped — Type B selections never registered.)
  if (currentChallenge.type === 'typeA_static' || currentChallenge.type === 'typeB') { btn.classList.toggle('selected'); return; }
  // Dynamic: the server decides what a click means (SPEC §3.4).
  btn.dataset.busy = '1';
  const clickedAt = performance.now();
  const res = await api(`/api/session/${sessionId}/click`, { challenge_id: currentChallenge.challenge_id, tile_id: btn.dataset.tileId });
  if (res.ok && res.action === 'replace') {
    const img = btn.querySelector('img');
    img.classList.add('fading'); // old tile fades out (400–700ms in production grammar)
    setTimeout(() => {
      delete img.dataset.retried; // fresh image gets its own self-heal chance
      img.src = res.new_tile.src;
      btn.dataset.tileId = res.new_tile.tile_id;
      img.classList.remove('fading');
      img.classList.add('appearing');
      const wait = Math.max(0, res.settle_ms - (performance.now() - clickedAt));
      setTimeout(() => { img.classList.remove('appearing'); btn.dataset.busy = ''; }, wait);
    }, 550);
    return;
  }
  btn.dataset.busy = '';
  if (res.ok && (res.action === 'selected' || res.action === 'deselected')) { btn.classList.toggle('selected', res.action === 'selected'); return; }
  if (res.error === 'stale_tile') { $('challenge-msg').textContent = 'That image already changed — take another look.'; return; }
  if (res.error === 'challenge_expired') { resetWidget(); setWidgetMsg('Verification expired. Check the box again.'); return; }
  // Any other error must never fail silently (that silence is what hid the
  // Type B click bug): surface it so the failure is visible in the UI.
  if (res.error) { $('challenge-msg').textContent = 'That click did not register — please try again.'; return; }
}

function handleRoundResult(res) {
  // workflow_cadence: an intermediate round pass carries the NEXT
  // challenge instead of a token — the workflow continues until the
  // final round. Only a pass WITH a token ends the session.
  if (res.result === 'pass' && res.new_challenge) return openChallenge(res.new_challenge, `Round ${res.cadence.rounds_passed} of ${res.cadence.rounds_required} done — next challenge…`);
  if (res.result === 'pass') return passWidget(res.token);
  if (res.result === 'retry') return openChallenge(res.new_challenge, 'Please try again.');
  if (res.result === 'fail_round' && res.state === 'cooldown') return cooldownWidget(res.retry_after_s);
  if (res.result === 'challenge_expired') { resetWidget(); return setWidgetMsg('Verification expired. Check the box again.'); }
}

$('verifyBtn').addEventListener('click', async () => {
  if (!currentChallenge) return;
  const tiles = [...$('grid').children];
  const selected = tiles.filter(t => t.classList.contains('selected')).map(t => t.dataset.tileId);
  const body = {
    challenge_id: currentChallenge.challenge_id,
    selected_tile_ids: selected,
    event_trace: trace.slice(-2000),
  };
  if (currentChallenge.type === 'typeA_dynamic') body.client_grid_state = tiles.map(t => t.dataset.tileId);
  handleRoundResult(await api(`/api/session/${sessionId}/verify`, body));
});

$('skipBtn').addEventListener('click', async () => {
  if (!currentChallenge) return;
  handleRoundResult(await api(`/api/session/${sessionId}/skip`, { challenge_id: currentChallenge.challenge_id, event_trace: trace.slice(-2000) }));
});

$('tokenCheckBtn').addEventListener('click', async () => {
  const res = await api(`/api/session/${sessionId}/token/verify`, { token: $('tokenValue').textContent });
  $('tokenCheckResult').textContent = res.valid ? 'Host check: token valid ✔' : `Host check: rejected (${res.reason})`;
});

/* ------------------------------------------------------------------- init */
(async function init() {
  const params = new URLSearchParams(location.search);
  const scenario = params.get('scenario') || 'natural';
  // Source tag (v1.1): test harnesses identify themselves (?source=e2e etc.)
  // so their traffic never blends into the live-agent baseline. A plain page
  // load sends nothing and the server defaults the tag to 'live-agent'.
  const body = { scenario };
  const source = params.get('source');
  if (source) body.source = source;
  const res = await api('/api/session', body);
  sessionId = res.session_id;
})();
