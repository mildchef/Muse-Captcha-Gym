#!/usr/bin/env node
/*
 * server.js — CAPTCHA Gym server (SPEC §2.1: Node stdlib only, one file).
 *
 * Trust boundary (SPEC §2.3): ground truth (labels, positives, risk score,
 * feature values) NEVER leaves the server. Clients receive only opaque tile
 * IDs, opaque image URLs, the instruction text, and UI state transitions.
 *
 * Test hooks: there is deliberately NO HTTP endpoint that exposes ground
 * truth. tools/e2e_test.js requires this file as a module and inspects
 * in-process state (a filesystem-level privilege, like reading the logs).
 * When run as a program (`node server.js`) it just listens.
 *
 * Env knobs (defaults are the SPEC values; overrides exist so tests can
 * compress time — production runs use the defaults):
 *   PORT=8931  HOST=0.0.0.0
 *   GYM_TOKEN_TTL_MS=120000      (SPEC §3.2: 120 s, single-use)
 *   GYM_CHALLENGE_TTL_MS=180000  (SPEC §3.2: separate challenge clock)
 *   GYM_COOLDOWN_MS=60000        (SPEC §3.6)
 *   GYM_SITE_PREFERENCE=easiest|balanced|strictest  (SPEC §4.7)
 *   GYM_RUN_ID=<id>              GYM_DATA_DIR=<dir>
 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const PORT = parseInt(process.env.PORT || '8931', 10);
const HOST = process.env.HOST || '0.0.0.0';
const TOKEN_TTL_MS = parseInt(process.env.GYM_TOKEN_TTL_MS || '120000', 10);
const CHALLENGE_TTL_MS = parseInt(process.env.GYM_CHALLENGE_TTL_MS || '180000', 10);
const COOLDOWN_MS = parseInt(process.env.GYM_COOLDOWN_MS || '60000', 10);
const SITE_PREFERENCE = process.env.GYM_SITE_PREFERENCE || 'balanced';
const DATA_DIR = process.env.GYM_DATA_DIR || path.join(ROOT, 'data');
const RUN_ID = process.env.GYM_RUN_ID || ('run_' + new Date().toISOString().slice(0, 10) + '_' + crypto.randomBytes(3).toString('hex'));
const GT_CONTRACT = '1.0';
const MAX_ROUNDS = 6; // SPEC §3.1 [Design choice]
const TRAIN_CLASSES = ['bicycle', 'bridge', 'bus', 'car', 'chimney', 'crosswalk', 'fire_hydrant', 'motorcycle', 'mountain', 'palm_tree', 'stairs', 'taxi', 'traffic_light', 'tractor'];
const TARGET_DIST = [[0, 0.10], [1, 0.15], [2, 0.25], [3, 0.25], [4, 0.15], [5, 0.10]]; // SPEC §5.5
const REPLACE_P_TARGET = 0.35; // SPEC §3.4 [Design choice]

/* ---------------------------------------------------------------- helpers */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rid = (p) => p + crypto.randomBytes(9).toString('hex');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const nowMs = () => Date.now();
const displayClass = (c) => c.replace(/_/g, ' ');

/* ---------------------------------------------------------------- logging */
fs.mkdirSync(path.join(DATA_DIR, 'shots'), { recursive: true });
const ATTEMPTS_LOG = path.join(DATA_DIR, 'attempts.jsonl');
const SESSIONS_LOG = path.join(DATA_DIR, 'sessions.jsonl');
function appendLog(file, obj) {
  try { fs.appendFileSync(file, JSON.stringify(obj) + '\n'); } catch (e) { /* logging must never kill the gym */ }
}
function readJSONL(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
const logAttempt = (a) => appendLog(ATTEMPTS_LOG, a);
function logSessionEvent(e) {
  // Session-source tagging (v1.1): every session event carries the session's
  // source tag so report.js can separate live-agent traffic from test traffic.
  const s = e.session_id ? sessions.get(e.session_id) : null;
  appendLog(SESSIONS_LOG, { ts: new Date().toISOString(), run_id: RUN_ID, source: (s && s.source) || 'unknown', ...e });
}

/* ----------------------------------------------------------------- corpus */
const manifest = fs.readFileSync(path.join(ROOT, 'corpus', 'typeA', 'manifest.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));
// Play pool excludes holdout_final (SPEC §8.1: untouched until final eval).
const playPool = manifest.filter(m => m.split === 'train' || m.split === 'eval');
const poolByClass = {};
for (const cls of TRAIN_CLASSES) poolByClass[cls] = playPool.filter(m => m.labels.includes(cls));
const poolNegativeFor = (cls) => playPool.filter(m => !m.labels.includes(cls));

/* ------------------------------------------------- Type B corpus (§3.5) */
const typeBManifestFile = path.join(ROOT, 'corpus', 'typeB', 'manifest.jsonl');
const typeBManifest = fs.existsSync(typeBManifestFile)
  ? fs.readFileSync(typeBManifestFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
// Play pool excludes holdout_final (SPEC §8.1), exactly as Type A.
const typeBPoolSynthetic = typeBManifest.filter(m => m.split === 'train' || m.split === 'eval');
// Real-photo transfer scenes (Stage 3, SPEC §5.1 route 1 + §8.4): COCO
// val2017 images under permissive licenses only, split 'eval' by design.
// Their ground truth was derived from COCO polygons at build time
// (tools/build_photo_corpus.js); the server treats them identically to
// synthetic scenes except for serving (whole JPEG + CSS slicing, §3.5).
const typeBPhotoFile = path.join(ROOT, 'corpus', 'typeB', 'manifest_photos.jsonl');
const typeBPhotos = fs.existsSync(typeBPhotoFile)
  ? fs.readFileSync(typeBPhotoFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
// Photo-only play pool (same split rule) — the force_type_b_photo scenario
// draws exclusively from this; see genChallenge/genTypeBChallenge.
const typeBPhotoPool = typeBPhotos.filter(m => m.split === 'train' || m.split === 'eval');
const typeBPool = [...typeBPoolSynthetic, ...typeBPhotoPool];
// A class is targetable in a scene only if it has ≥1 positive NON-band tile
// (SPEC §3.5: Type B is served only when targets exist; §4.4: band tiles
// never decide pass/fail, so an all-band target would be unscoreable).
function typeBTargetClasses(scene) {
  const ok = new Set();
  for (const t of scene.derived_tiles)
    for (const cls of t.positive_for) if (!t.band_for.includes(cls)) ok.add(cls);
  return [...ok].filter(c => TRAIN_CLASSES.includes(c));
}

/* ------------------------------------------- PNG decode/slice (stdlib) */
/* The server must slice Type B scenes into tiles at serve time. It only
 * ever decodes OUR OWN generated PNGs (8-bit, non-interlaced), but the
 * unfilter implements all five PNG filters so nothing is assumed. */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
const zlib = require('node:zlib');
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(rgb, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })), pngChunk('IEND', Buffer.alloc(0))]);
}
function decodePNG(buf) {
  let off = 8, w = 0, h = 0, colour = 2; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.subarray(off + 4, off + 8).toString('ascii');
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colour = data[9]; }
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') break;
    off += 12 + len;
  }
  const ch = colour === 2 ? 3 : colour === 6 ? 4 : colour === 0 ? 1 : 2;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = new Uint8Array(w * h * ch);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], ro = y * (stride + 1) + 1, oo = y * stride, po = oo - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[oo + x - ch] : 0, b = y > 0 ? out[po + x] : 0, c = (y > 0 && x >= ch) ? out[po + x - ch] : 0;
      let v = raw[ro + x];
      if (f === 1) v = (v + a) & 0xFF; else if (f === 2) v = (v + b) & 0xFF;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 0xFF;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xFF; }
      out[oo + x] = v;
    }
  }
  // Normalise to RGB triplets.
  if (ch === 3) return { w, h, rgb: out };
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0, j = 0; i < out.length; i += ch, j += 3) { rgb[j] = out[i]; rgb[j + 1] = ch === 1 ? out[i] : out[i + 1]; rgb[j + 2] = ch === 1 ? out[i] : out[i + 2]; }
  return { w, h, rgb };
}
const sceneCache = new Map(); // scene file -> decoded {w,h,rgb}; tiny LRU
function scenePixels(file) {
  if (sceneCache.has(file)) { const v = sceneCache.get(file); sceneCache.delete(file); sceneCache.set(file, v); return v; }
  const v = decodePNG(fs.readFileSync(file));
  sceneCache.set(file, v);
  if (sceneCache.size > 8) sceneCache.delete(sceneCache.keys().next().value);
  return v;
}
function sliceTilePNG(sceneFile, idx) {
  const { w, h, rgb } = scenePixels(sceneFile);
  const tw = w / 4, th = h / 4, sx = (idx % 4) * tw, sy = Math.floor(idx / 4) * th;
  const out = new Uint8Array(tw * th * 3);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const si = ((sy + y) * w + (sx + x)) * 3, di = (y * tw + x) * 3;
    out[di] = rgb[si]; out[di + 1] = rgb[si + 1]; out[di + 2] = rgb[si + 2];
  }
  return encodePNG(out, tw, th);
}

/* ------------------------------------------------------------------ state */
const profiles = new Map();  // cookie id -> profile
const sessions = new Map();  // session id -> session
const tokens = new Map();    // token value -> {session_id, minted_at, used}
const imgMap = new Map();    // opaque img id -> absolute file path

const NETWORK_CLASSES = [['residential_stable', 0.9, 0.50], ['residential_new', 0.7, 0.25], ['vpn_exit', 0.45, 0.15], ['datacenter', 0.2, 0.10]];
function getOrCreateProfile(cookieId, rng) {
  if (cookieId && profiles.has(cookieId)) return profiles.get(cookieId);
  const id = cookieId || rid('prof_');
  let acc = 0, net = NETWORK_CLASSES[0];
  const roll = (rng || Math.random)();
  for (const nc of NETWORK_CLASSES) { acc += nc[2]; if (roll <= acc) { net = nc; break; } }
  const p = { id, created_at: nowMs(), network_class: net[0], network_v: net[1], sessions: 0, passes: 0, fails: 0, cooldowns: 0, history_pages: new Set() };
  profiles.set(id, p);
  return p;
}
function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/* ------------------------------------------------------- mock risk scorer */
/* SPEC §6: interpretable weighted sum, explanation always attached.
 * Weights are DESIGN CHOICES (Google's are unpublished). Pointer behaviour
 * is scored for plausibility only — path curvature/shape is explicitly NOT
 * scored (verification-pass correction: Bézier ≈ straight, n.s.). */
const WEIGHTS = { F1: 25, F2: 20, F3: 10, F4: 15, F5: 10, F6: 10, F7: 10 };
function scoreEntry(session, profile, trace, signals) {
  const F = {};
  { // F1 automation fingerprint
    let v = 1.0; const notes = [];
    if (signals.webdriver) { v -= 0.60; notes.push('navigator.webdriver=true (-0.60)'); }
    if (/HeadlessChrome/i.test(signals.ua || '')) { v -= 0.32; notes.push('headless UA trait (-0.32)'); }
    if (/Chrome/i.test(signals.ua || '') && signals.has_chrome === false) { v -= 0.15; notes.push('UA claims Chrome but window.chrome absent (-0.15)'); }
    if (/Chrome/i.test(signals.ua || '') && signals.plugins === 0) { v -= 0.10; notes.push('zero plugins with Chrome UA (-0.10)'); }
    if (/SwiftShader|llvmpipe|ANGLE \(Google/i.test(signals.webgl_renderer || '')) { v -= 0.20; notes.push('software WebGL renderer (-0.20)'); }
    F.F1_automation = { v: clamp(v, 0, 1), notes };
  }
  { // F2 profile / session continuity
    const ageH = (nowMs() - profile.created_at) / 3600000;
    let v = 0.20 + 0.30 * Math.min(1, ageH / 48) + Math.min(0.20, profile.passes * 0.05)
      + (profile.history_pages.size >= 2 ? 0.10 : 0) - Math.min(0.20, profile.cooldowns * 0.10);
    F.F2_profile = { v: clamp(v, 0, 1), notes: [`cookie age ${ageH.toFixed(1)}h, ${profile.passes} prior pass(es), ${profile.cooldowns} cooldown(s), ${profile.history_pages.size} history page(s)`] };
  }
  F.F3_network = { v: profile.network_v, notes: [`simulated network class: ${profile.network_class} (stub — SPEC §6.2 F3)`] };
  { // F4 pointer-event authenticity (plausibility, never shape)
    const moves = trace.filter(e => e.type === 'pointermove');
    const downs = trace.filter(e => e.type === 'pointerdown' || e.type === 'click');
    let v, notes = [];
    if (moves.length === 0) { v = 0.05; notes.push('no pointer movement at all (known-bad case: ablation 2→13 rounds)'); }
    else {
      v = 0.90;
      let teleports = 0;
      for (const d of downs) {
        const before = moves.filter(m => m.t <= d.t && d.t - m.t <= 600);
        if (!before.length) teleports++;
      }
      if (teleports) { v -= 0.15 * teleports; notes.push(`${teleports} click(s) with no preceding pointer move (teleport)`); }
      const ivals = [];
      for (let i = 1; i < downs.length; i++) ivals.push(downs[i].t - downs[i - 1].t);
      if (ivals.length >= 3 && ivals.every(x => x === ivals[0])) { v -= 0.30; notes.push('inter-click intervals all identical (metronome)'); }
      if (!notes.length) notes.push(`${moves.length} pointer moves, clicks preceded by movement`);
    }
    F.F4_pointer = { v: clamp(v, 0, 1), notes };
  }
  { // F5 timing plausibility (bands, never a single constant — SPEC §6.2)
    const clickEv = trace.find(e => e.target === 'checkbox' && (e.type === 'click' || e.type === 'pointerdown'));
    const t = clickEv ? clickEv.t : (nowMs() - session.created_at);
    let v, band;
    if (t < 800) { v = 0.25; band = '<0.8s (implausibly fast)'; }
    else if (t < 1500) { v = 0.70; band = '0.8–1.5s (fast)'; }
    else if (t <= 30000) { v = 1.0; band = '1.5–30s (human/solver band)'; }
    else { v = 0.60; band = '>30s (slow)'; }
    F.F5_timing = { v, notes: [`page→checkbox ${Math.round(t)}ms — ${band}`] };
  }
  { // F6 environment coherence
    let v = 1.0; const notes = [];
    const ua = signals.ua || '', plat = signals.platform || '';
    if (/Windows/i.test(ua) && /^Linux/i.test(plat)) { v -= 0.40; notes.push('UA claims Windows, platform is Linux (-0.40)'); }
    if (/Macintosh/i.test(ua) && /^Win/i.test(plat)) { v -= 0.40; notes.push('UA claims macOS, platform is Windows (-0.40)'); }
    if (!signals.language) { v -= 0.10; notes.push('no language reported (-0.10)'); }
    if (Array.isArray(signals.screen) && (signals.screen[0] === 0 || signals.screen[1] === 0)) { v -= 0.30; notes.push('zero-size screen (-0.30)'); }
    if (!notes.length) notes.push('UA/platform/language/screen coherent');
    F.F6_environment = { v: clamp(v, 0, 1), notes };
  }
  { // F7 in-challenge behaviour (page-level signals at checkbox time)
    let v = 0.45; const notes = ['base 0.45'];
    if (trace.some(e => e.type === 'scroll')) { v += 0.15; notes.push('scroll before checkbox (+0.15)'); }
    if (trace.some(e => e.type === 'focus')) { v += 0.10; notes.push('focus event (+0.10)'); }
    if (trace.some(e => e.type === 'keydown')) { v += 0.05; notes.push('keyboard activity (+0.05)'); }
    F.F7_behaviour = { v: clamp(v, 0, 1), notes };
  }
  let trust = 0; const features = {};
  for (const [k, f] of Object.entries(F)) {
    const key = k.slice(0, 2);
    const pts = Math.round(WEIGHTS[key] * f.v * 10) / 10;
    trust += WEIGHTS[key] * f.v;
    features[k] = { v: Math.round(f.v * 100) / 100, pts, notes: f.notes };
  }
  trust = Math.round(clamp(trust, 0, 100));
  return { trust, features };
}
function makeThresholds(session) {
  const rng = mulberry32(session.seed);
  const j = () => Math.round((rng() * 10 - 5)); // ±5 (SPEC §3.6)
  let pass = 75 + j(), staticB = 55 + j(), dynamicB = 35 + j(), floor = 20 + j();
  if (SITE_PREFERENCE === 'strictest') { pass += 5; staticB += 5; dynamicB += 5; floor += 5; }
  floor = clamp(floor, 10, 40); dynamicB = clamp(Math.max(dynamicB, floor + 5), 15, 60);
  staticB = clamp(Math.max(staticB, dynamicB + 8), 30, 80); pass = clamp(Math.max(pass, staticB + 8), 50, 95);
  return { pass, staticB, dynamicB, floor, jitter_note: 'seeded per session, ±5 (SPEC §3.6 anti-overfit)' };
}
function bandOf(session, trust) {
  const th = session.thresholds;
  return trust >= th.pass ? 'pass' : trust >= th.staticB ? 'static_one_round' : trust >= th.dynamicB ? 'dynamic_or_multi' : trust >= th.floor ? 'dynamic_hard' : 'cooldown';
}

/* ---------------------------------------------------- challenge generation */
function sampleWithout(rng, arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, Math.min(n, a.length));
}
function drawTargetCount(rng) {
  let r = rng(), acc = 0;
  for (const [count, p] of TARGET_DIST) { acc += p; if (r <= acc) return count; }
  return 3;
}
function makeEntry(session, item) {
  const tile_id = rid('tile_');
  const img_id = rid('img_');
  imgMap.set(img_id, { file: path.join(ROOT, 'corpus', item.file), session_id: session.id });
  return {
    tile_id, tile_uid: item.tile_uid, img_id,
    positive: undefined, // set by caller (labels are server-only)
    band: !!item.band, size_band: item.size_band,
    state: 'settled', ready_at: 0, selected: false, clicked: false, from_replacement: false,
  };
}
function genChallenge(session, type) {
  if (type === 'typeB') {
    // force_type_b_photo: measurement purity beats uptime. If the real-photo
    // corpus is empty/unavailable, issuance MUST fail loudly (issueChallenge
    // logs it and the caller answers with a clear fixed error) — silently
    // falling back to a synthetic scene would pollute the transfer
    // measurement this scenario exists to produce.
    if (session.scenario === 'force_type_b_photo' && !typeBPhotoPool.length) {
      const err = new Error('photo corpus empty/unavailable: force_type_b_photo cannot issue a challenge');
      err.code = 'photo_corpus_unavailable';
      throw err;
    }
    if (typeBPool.length) return genTypeBChallenge(session);
  }
  const seed = crypto.randomBytes(4).readUInt32LE(0);
  const rng = mulberry32(seed);
  const target = TRAIN_CLASSES[Math.floor(rng() * TRAIN_CLASSES.length)];
  const targetCount = drawTargetCount(rng);
  const posPool = poolByClass[target];
  const negPool = poolNegativeFor(target);
  const posItems = sampleWithout(rng, posPool, targetCount);
  const negItems = sampleWithout(rng, negPool, 9 - posItems.length);
  const items = [...posItems.map(it => ({ it, positive: true })), ...negItems.map(it => ({ it, positive: false }))];
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  const entries = items.map(({ it, positive }) => { const e = makeEntry(session, it); e.positive = positive; return e; });
  const ch = {
    id: rid('ch_'), type, target_class: target, seed,
    served_at: nowMs(), expires_at: nowMs() + CHALLENGE_TTL_MS,
    entries, initial_tiles: entries.map(e => ({ tile_id: e.tile_id, tile_uid: e.tile_uid, positive: e.positive, band: e.band, size_band: e.size_band })),
    replacements: [], stale_clicks: 0, clicks: [],
    used_uids: new Set(entries.map(e => e.tile_uid)),
  };
  return ch;
}
function genTypeBChallenge(session) {
  // SPEC §3.5: one scene sliced 4×4; ground truth is the build-time mask
  // derivation cached in the manifest (SPEC §4.1/§5.2), never recomputed or
  // exposed at runtime. Single pass, Verify only.
  const seed = crypto.randomBytes(4).readUInt32LE(0);
  const rng = mulberry32(seed);
  // force_type_b_photo draws ONLY from the real-photo pool; genChallenge
  // has already failed issuance if that pool is empty, so no fallback here.
  const pool = session.scenario === 'force_type_b_photo' ? typeBPhotoPool : typeBPool;
  const scene = pool[Math.floor(rng() * pool.length)];
  const targets = typeBTargetClasses(scene);
  const target = targets[Math.floor(rng() * targets.length)];
  const isPhoto = !!scene.photo;
  // Photo scenes: ONE shared image for all 16 tiles — the client slices it
  // with CSS background-position (SPEC §3.5 allows whole-scene serving).
  // Node stdlib cannot decode JPEG, and it never needs to: ground truth
  // was derived at build time, and the browser decodes the photo itself.
  let sceneImgId = null;
  if (isPhoto) {
    sceneImgId = rid('img_');
    imgMap.set(sceneImgId, { file: path.join(ROOT, 'corpus', scene.file), session_id: session.id, mime: 'image/jpeg' });
  }
  const entries = scene.derived_tiles.map((t, i) => {
    const tile_id = rid('tile_');
    const img_id = isPhoto ? sceneImgId : rid('img_');
    if (!isPhoto) imgMap.set(img_id, { file: path.join(ROOT, 'corpus', scene.file), session_id: session.id, crop: { index: i } });
    return {
      tile_id, tile_uid: scene.scene_uid + '#t' + String(i).padStart(2, '0'), img_id,
      positive: t.positive_for.includes(target),
      band: t.band_for.includes(target),
      size_band: t.size_bands[target] || 'none',
      state: 'settled', ready_at: 0, selected: false, clicked: false, from_replacement: false,
    };
  });
  return {
    id: rid('ch_'), type: 'typeB', target_class: target, seed,
    photo: isPhoto, corpus: isPhoto ? 'photo' : 'synthetic',
    aspect: isPhoto ? [scene.width, scene.height] : null,
    served_at: nowMs(), expires_at: nowMs() + CHALLENGE_TTL_MS,
    entries, initial_tiles: entries.map(e => ({ tile_id: e.tile_id, tile_uid: e.tile_uid, positive: e.positive, band: e.band, size_band: e.size_band })),
    replacements: [], stale_clicks: 0, clicks: [],
    used_uids: new Set(entries.map(e => e.tile_uid)),
  };
}
function drawReplacement(session, ch) {
  const rng = mulberry32(crypto.randomBytes(4).readUInt32LE(0));
  const wantPositive = rng() < REPLACE_P_TARGET;
  let pool = (wantPositive ? poolByClass[ch.target_class] : poolNegativeFor(ch.target_class)).filter(m => !ch.used_uids.has(m.tile_uid));
  if (!pool.length) pool = poolNegativeFor(ch.target_class).filter(m => !ch.used_uids.has(m.tile_uid));
  const item = pool[Math.floor(rng() * pool.length)];
  ch.used_uids.add(item.tile_uid);
  return { item, positive: item.labels.includes(ch.target_class) };
}
function challengeView(ch) {
  // The ONLY challenge data an agent ever sees (SPEC §2.3).
  return {
    challenge_id: ch.id, type: ch.type, target_class: displayClass(ch.target_class),
    instruction: ch.type === 'typeA_dynamic'
      ? `Select all images with ${displayClass(ch.target_class)}. Click Verify once there are none left.`
      : ch.type === 'typeB'
        ? `Select all squares with ${displayClass(ch.target_class)}.` // SPEC §3.5 wording; no Skip in Type B
        : `Select all images with ${displayClass(ch.target_class)}. If there are none, click Skip.`,
    // Photo Type B: aspect [w,h] + per-tile background positions are pure
    // display geometry (where a tile sits in the scene) — never labels.
    aspect: ch.aspect || undefined,
    tiles: ch.entries.map((e, i) => ch.photo
      ? { tile_id: e.tile_id, src: '/img/' + e.img_id, bg: { x: Math.round((i % 4) * (100 / 3) * 100) / 100, y: Math.round(Math.floor(i / 4) * (100 / 3) * 100) / 100 } }
      : { tile_id: e.tile_id, src: '/img/' + e.img_id }),
    expires_in_ms: Math.max(0, ch.expires_at - nowMs()),
  };
}

/* Session-source allowlist (human baseline, HUMAN_BASELINE.md). The tag
 * is a log label ONLY: stored server-side, never echoed into a challenge
 * payload, with no effect on issuance or scoring. Two shapes are accepted:
 *   - the known harness values (KNOWN_SOURCES), and
 *   - human player tags `human-<name>` — lowercase alphanumerics/hyphens —
 *     set via the tagged gym link (?source=human-ben) so a human's
 *     sessions form the human-baseline population. The server pins the
 *     accepted tag to the session, so it covers every round and attempt
 *     without the player re-adding it.
 * Anything else — unknown strings, values with characters outside
 * [a-z0-9_-], 'human-' with no name, overlong values — falls back to the
 * default 'live-agent' (fail-closed: a typo or an injection-shaped value
 * can never mint a new population or rewrite a stored tag). Case is
 * folded, so 'HUMAN-BEN' canonicalizes to 'human-ben'. */
const KNOWN_SOURCES = new Set(['live-agent', 'e2e', 'smoke', 'deploy-check', 'leak-audit']);
const HUMAN_SOURCE_RE = /^human-[a-z0-9]+(-[a-z0-9]+)*$/;
function sanitizeSource(raw) {
  if (typeof raw !== 'string') return 'live-agent';
  const s = raw.trim().toLowerCase();
  if (!s || s.length > 40 || /[^a-z0-9_-]/.test(s)) return 'live-agent';
  if (KNOWN_SOURCES.has(s) || HUMAN_SOURCE_RE.test(s)) return s;
  return 'live-agent';
}

/* --------------------------------------------------------- session machine */
function newSession(profile, scenario, source) {
  const s = {
    id: rid('ses_'), profile_id: profile.id, scenario: scenario || 'natural',
    source: source || 'live-agent',
    seed: crypto.randomBytes(4).readUInt32LE(0),
    state: 'INIT', trust: null, thresholds: null, entry_explanation: null,
    round: 0, challenge: null, token: null, cooldown_until: 0,
    created_at: nowMs(), run_id: RUN_ID,
  };
  s.thresholds = makeThresholds(s);
  sessions.set(s.id, s);
  profile.sessions++;
  logSessionEvent({ event: 'session_created', session_id: s.id, profile_id: profile.id, scenario: s.scenario });
  return s;
}
function lazyCooldown(session) {
  if (session.state === 'COOLDOWN' && nowMs() >= session.cooldown_until) {
    session.state = 'INIT'; session.round = 0; session.challenge = null;
    logSessionEvent({ event: 'cooldown_ended', session_id: session.id });
  }
}
function serveType(session) {
  if (session.scenario === 'force_static') return 'typeA_static';
  if (session.scenario === 'force_dynamic') return 'typeA_dynamic';
  if (session.scenario === 'force_type_b') return 'typeB'; // real Type B since v1.1 (was a dynamic alias in v1)
  if (session.scenario === 'force_type_b_photo') return 'typeB'; // Type B restricted to the real-photo corpus (restriction enforced in genChallenge/genTypeBChallenge)
  // Natural ladder (SPEC §3.6): the bands name the static and dynamic
  // families. Type B is the single-pass sliced member of the static family,
  // so it shares the static band 50/50 and appears as an occasional
  // additional round in the dynamic bands. [Design choice within §3.6's silence]
  if (session.trust >= session.thresholds.staticB) return Math.random() < 0.5 ? 'typeB' : 'typeA_static';
  return Math.random() < 0.25 ? 'typeB' : 'typeA_dynamic';
}
/* Issue a session's next challenge. Converts the one hard issuance failure
 * — force_type_b_photo with an empty/unavailable photo corpus — into a
 * logged challenge_issuance_failed event and a false return, so callers
 * answer with the clear fixed error 'photo_corpus_unavailable' instead of
 * an exception or (worse) a silent synthetic fallback. On failure the
 * session is left in INIT with no challenge. */
function issueChallenge(session, profile) {
  try {
    session.challenge = genChallenge(session, serveType(session));
    return true;
  } catch (e) {
    if (e && e.code === 'photo_corpus_unavailable') {
      session.challenge = null; session.state = 'INIT'; session.round = 0;
      logSessionEvent({ event: 'challenge_issuance_failed', session_id: session.id, profile_id: profile.id, scenario: session.scenario, reason: 'photo_corpus_unavailable' });
      return false;
    }
    throw e;
  }
}
function mintToken(session) {
  const value = crypto.randomBytes(24).toString('base64url');
  tokens.set(value, { session_id: session.id, minted_at: nowMs(), used: false });
  session.token = { value, minted_at: nowMs() };
  return value;
}
function passSession(session, profile) {
  session.state = 'PASSED'; session.challenge = null;
  profile.passes++;
  const token = mintToken(session);
  logSessionEvent({ event: 'passed', session_id: session.id, profile_id: profile.id });
  return token;
}
function enterCooldown(session, profile) {
  session.state = 'COOLDOWN'; session.challenge = null;
  session.cooldown_until = nowMs() + COOLDOWN_MS;
  profile.cooldowns++;
  logSessionEvent({ event: 'cooldown', session_id: session.id, profile_id: profile.id, retry_after_s: Math.ceil(COOLDOWN_MS / 1000) });
}
/* Round resolution shared by verify/skip/expiry (SPEC §3.1, §3.6 deltas). */
function resolveRound(session, profile, attempt, outcome) {
  const trustBefore = session.trust;
  let delta = 0;
  if (outcome.result === 'pass') delta += 4;
  else {
    delta -= 7;
    if (outcome.procedure_errors && outcome.procedure_errors.length) delta -= 2;
    if ((outcome.stale_clicks || 0) >= 2) delta -= 2;
  }
  session.trust = clamp(session.trust + delta, 0, 100);
  attempt.outcome = outcome;
  attempt.risk = {
    trust_before: trustBefore, trust_after: session.trust,
    explanation: {
      ...(session.entry_explanation || {}),
      deltas_applied: [{ round: session.round, reason: outcome.result === 'pass' ? 'round_pass' : 'round_fail', delta }],
      threshold_jitter: { pass_band: session.thresholds.pass, note: session.thresholds.jitter_note },
    },
  };
  logAttempt(attempt);
  if (outcome.result === 'pass') {
    const token = passSession(session, profile);
    return { http: { result: 'pass', token } };
  }
  profile.fails++;
  if (session.round >= MAX_ROUNDS || session.trust < session.thresholds.floor) {
    enterCooldown(session, profile);
    return { http: { result: 'fail_round', state: 'cooldown', retry_after_s: Math.ceil(COOLDOWN_MS / 1000) } };
  }
  session.round++;
  if (!issueChallenge(session, profile)) return { http: { result: 'fail_round', state: 'init', error: 'photo_corpus_unavailable' } };
  return { http: { result: 'retry', new_challenge: challengeView(session.challenge) } };
}
function baseAttempt(session, ch, body, kind) {
  return {
    attempt_id: rid('att_'), session_id: session.id, run_id: RUN_ID,
    ts: new Date().toISOString(), gt_contract: GT_CONTRACT, scenario: session.scenario, source: session.source, kind,
    challenge: {
      id: ch.id, type: ch.type, class: ch.target_class, seed: ch.seed, corpus: ch.corpus || 'synthetic',
      tile_ids: ch.initial_tiles.map(t => t.tile_id),
      positives_server_only: ch.initial_tiles.filter(t => t.positive).map(t => t.tile_id),
      band_tiles: ch.initial_tiles.filter(t => t.band).map(t => t.tile_id),
      tiles: ch.initial_tiles, replacements: ch.replacements,
    },
    agent: { selected: [], verify_state: null, grid_state_match: null },
    outcome: { result: null, scored: false, fp: 0, fn: 0, fn_bands: [], procedure_errors: [], ambiguity_errors: 0, stale_clicks: ch.stale_clicks },
    risk: null,
    timing: { page_to_checkbox_ms: null, challenge_ms: nowMs() - ch.served_at, inter_click_ms: [] },
    event_trace: Array.isArray(body.event_trace) ? body.event_trace.slice(-2000) : [],
    screenshot: null,
  };
}
function attachScreenshot(attempt, body) {
  if (typeof body.screenshot === 'string' && body.screenshot.startsWith('data:image/')) {
    try {
      const b64 = body.screenshot.split(',')[1];
      const file = path.join(DATA_DIR, 'shots', attempt.attempt_id + '.png');
      fs.writeFileSync(file, Buffer.from(b64, 'base64'));
      attempt.screenshot = 'data/shots/' + attempt.attempt_id + '.png';
    } catch { attempt.screenshot = null; }
  }
}
function interClickIntervals(trace) {
  const clicks = trace.filter(e => e.type === 'click' || e.type === 'pointerdown').map(e => e.t);
  const out = [];
  for (let i = 1; i < clicks.length; i++) out.push(clicks[i] - clicks[i - 1]);
  return out;
}

/* ---------------------------------------------------------------- metrics */
/* SPEC §7: metrics are pure functions of the logs. This implementation is
 * used by /api/admin/metrics and /results; tools/report.js re-implements
 * the same aggregation standalone for the CLI report. */
function pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : null; }
function percentile(sorted, p) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}
function aggregateMetrics(attempts, events, sourceFilter) {
  // Source filter (v1.1): records written before tagging have no source and
  // count as 'unknown' (legacy lines in data/ were backfilled by
  // tools/tag_legacy_sources.js — see BUILD_NOTES §v1.1).
  if (sourceFilter) {
    const tag = (r) => r.source || 'unknown';
    attempts = attempts.filter(a => tag(a) === sourceFilter);
    events = events.filter(e => tag(e) === sourceFilter);
  }
  const A = {}, B = {}, C = {};
  const created = events.filter(e => e.event === 'session_created');
  const scored = events.filter(e => e.event === 'checkbox_scored');
  const passedEv = events.filter(e => e.event === 'passed');
  const tokenEv = events.filter(e => e.event === 'token_verified');
  A.sessions_total = created.length;
  A.checkbox_evals = scored.length;
  A.checkbox_pass_rate = pct(scored.filter(e => e.outcome === 'pass').length, scored.length);
  A.rounds_served = attempts.length;
  A.type_mix = {
    static: attempts.filter(a => a.challenge.type === 'typeA_static').length,
    dynamic: attempts.filter(a => a.challenge.type === 'typeA_dynamic').length,
    typeB: attempts.filter(a => a.challenge.type === 'typeB').length,
  };
  A.tokens = {
    minted: passedEv.length,
    verified_ok: tokenEv.filter(e => e.valid).length,
    expired: tokenEv.filter(e => e.reason === 'expired').length,
    replayed: tokenEv.filter(e => e.reason === 'replayed').length,
    unknown: tokenEv.filter(e => e.reason === 'unknown').length,
  };
  A.cooldowns = events.filter(e => e.event === 'cooldown').length;
  const bySession = {};
  for (const a of attempts) (bySession[a.session_id] = bySession[a.session_id] || []).push(a);
  const sessionsWithAttempts = Object.keys(bySession).length;
  const failedThenPassed = Object.values(bySession).filter(list => list.some(a => a.outcome.result === 'fail') && list.some(a => a.outcome.result === 'pass')).length;
  const sessionsWithFail = Object.values(bySession).filter(list => list.some(a => a.outcome.result === 'fail')).length;
  A.recovery_after_failure_rate = pct(failedThenPassed, sessionsWithFail);

  const scoredAttempts = attempts.filter(a => a.outcome.scored);
  const perClass = {};
  let tp = 0, fp = 0, fn = 0, amb = 0, bandTiles = 0, allTiles = 0;
  const posByBand = { whole: 0, partial: 0, sliver: 0 }, fnByBand = { whole: 0, partial: 0, sliver: 0 };
  const typeBuckets = {}; // v1.1: per-challenge-type perception (SPEC §7.2 sliced by type; Type B reported separately)
  const bucketFor = (t) => typeBuckets[t] = typeBuckets[t] || { attempts: 0, exact: 0, tp: 0, fp: 0, fn: 0, posByBand: { whole: 0, partial: 0, sliver: 0 }, fnByBand: { whole: 0, partial: 0, sliver: 0 }, corpus: { photo: { attempts: 0, exact: 0 }, synthetic: { attempts: 0, exact: 0 } } };
  for (const a of scoredAttempts) {
    const cls = a.challenge.class;
    perClass[cls] = perClass[cls] || { tp: 0, fp: 0, fn: 0 };
    perClass[cls].tp += a.outcome.tp || 0; perClass[cls].fp += a.outcome.fp || 0; perClass[cls].fn += a.outcome.fn || 0;
    tp += a.outcome.tp || 0; fp += a.outcome.fp || 0; fn += a.outcome.fn || 0;
    amb += a.outcome.ambiguity_errors || 0;
    const bk = bucketFor(a.challenge.type);
    bk.attempts++; if (a.outcome.fp === 0 && a.outcome.fn === 0) bk.exact++;
    const corp = bk.corpus[a.challenge.corpus === 'photo' ? 'photo' : 'synthetic'];
    corp.attempts++; if (a.outcome.fp === 0 && a.outcome.fn === 0) corp.exact++;
    bk.tp += a.outcome.tp || 0; bk.fp += a.outcome.fp || 0; bk.fn += a.outcome.fn || 0;
    const all = [...(a.challenge.tiles || []), ...(a.challenge.replacements || [])];
    for (const t of all) {
      allTiles++; if (t.band) bandTiles++;
      if (t.positive && posByBand[t.size_band] !== undefined) posByBand[t.size_band]++;
      if (t.positive && bk.posByBand[t.size_band] !== undefined) bk.posByBand[t.size_band]++;
    }
    for (const b of a.outcome.fn_bands || []) {
      if (fnByBand[b] !== undefined) fnByBand[b]++;
      if (bk.fnByBand[b] !== undefined) bk.fnByBand[b]++;
    }
  }
  B.by_type = {};
  for (const [t, bk] of Object.entries(typeBuckets)) {
    const p = bk.tp + bk.fp ? bk.tp / (bk.tp + bk.fp) : null, r = bk.tp + bk.fn ? bk.tp / (bk.tp + bk.fn) : null;
    B.by_type[t] = {
      attempts: bk.attempts, exact_board_accuracy: pct(bk.exact, bk.attempts),
      per_tile: {
        tp: bk.tp, fp: bk.fp, fn: bk.fn,
        precision: p === null ? null : Math.round(p * 1000) / 1000,
        recall: r === null ? null : Math.round(r * 1000) / 1000,
        f1: p && r ? Math.round((2 * p * r / (p + r)) * 1000) / 1000 : null,
      },
      sliver_recall: bk.posByBand.sliver ? Math.round((1 - bk.fnByBand.sliver / bk.posByBand.sliver) * 1000) / 1000 : null,
      corpus: {
        photo: { attempts: bk.corpus.photo.attempts, exact_board_accuracy: pct(bk.corpus.photo.exact, bk.corpus.photo.attempts) },
        synthetic: { attempts: bk.corpus.synthetic.attempts, exact_board_accuracy: pct(bk.corpus.synthetic.exact, bk.corpus.synthetic.attempts) },
      },
    };
  }
  const prec = tp + fp ? tp / (tp + fp) : null, rec = tp + fn ? tp / (tp + fn) : null;
  B.per_tile = {
    tp, fp, fn,
    precision: prec === null ? null : Math.round(prec * 1000) / 1000,
    recall: rec === null ? null : Math.round(rec * 1000) / 1000,
    f1: prec && rec ? Math.round((2 * prec * rec / (prec + rec)) * 1000) / 1000 : null,
  };
  B.per_class = {};
  for (const [cls, v] of Object.entries(perClass)) {
    const p = v.tp + v.fp ? v.tp / (v.tp + v.fp) : null, r = v.tp + v.fn ? v.tp / (v.tp + v.fn) : null;
    B.per_class[cls] = { ...v, precision: p === null ? null : Math.round(p * 1000) / 1000, recall: r === null ? null : Math.round(r * 1000) / 1000 };
  }
  B.exact_board_accuracy = pct(scoredAttempts.filter(a => a.outcome.fp === 0 && a.outcome.fn === 0).length, scoredAttempts.length);
  B.partial_recall_by_band = {};
  for (const b of ['whole', 'partial', 'sliver'])
    B.partial_recall_by_band[b] = posByBand[b] ? Math.round((1 - fnByBand[b] / posByBand[b]) * 1000) / 1000 : null;
  B.ambiguity_errors = amb;
  B.band_tile_share = pct(bandTiles, allTiles);

  const passedSessions = new Set(passedEv.map(e => e.session_id));
  C.sessions_with_attempts = sessionsWithAttempts;
  C.session_pass_rate = pct([...passedSessions].filter(id => bySession[id]).length, sessionsWithAttempts);
  C.first_attempt_pass_rate = pct(Object.values(bySession).filter(list => list[0].outcome.result === 'pass').length, sessionsWithAttempts);
  for (const t of ['typeA_static', 'typeA_dynamic', 'typeB']) {
    const list = attempts.filter(a => a.challenge.type === t);
    C[t] = { attempts: list.length, completion_rate: pct(list.filter(a => a.outcome.result === 'pass').length, list.length) };
  }
  const dynPassed = attempts.filter(a => a.challenge.type === 'typeA_dynamic' && a.outcome.result === 'pass');
  C.dynamic_mean_replacements_per_pass = dynPassed.length ? Math.round(dynPassed.reduce((s, a) => s + (a.challenge.replacements || []).length, 0) / dynPassed.length * 10) / 10 : null;
  const procCount = (code) => attempts.reduce((s, a) => s + (a.outcome.procedure_errors || []).filter(x => x === code).length, 0);
  const dynAttempts = attempts.filter(a => a.challenge.type === 'typeA_dynamic').length;
  const statAttempts = attempts.filter(a => a.challenge.type === 'typeA_static').length;
  C.procedure_errors = {
    verify_too_early: { count: procCount('verify_too_early'), rate_pct_of_dynamic: pct(procCount('verify_too_early'), dynAttempts) },
    verify_instead_of_skip: { count: procCount('verify_instead_of_skip'), rate_pct_of_static: pct(procCount('verify_instead_of_skip'), statAttempts) },
    empty_submission: procCount('empty_submission'),
    stale_tile_clicks: attempts.reduce((s, a) => s + (a.outcome.stale_clicks || 0), 0),
    challenge_expired: procCount('challenge_expired'),
    token_expired: A.tokens.expired,
  };
  const times = { typeA_static: [], typeA_dynamic: [], typeB: [] };
  for (const a of attempts) if (a.timing && a.timing.challenge_ms != null && times[a.challenge.type]) times[a.challenge.type].push(a.timing.challenge_ms);
  C.decision_time_ms = {};
  for (const [t, list] of Object.entries(times)) {
    const s = list.slice().sort((x, y) => x - y);
    C.decision_time_ms[t] = { p50: percentile(s, 0.5), p90: percentile(s, 0.9), in_plausible_band_pct: pct(list.filter(ms => ms >= 3000 && ms <= 30000).length, list.length) };
  }
  const entryTrusts = scored.map(e => e.trust).filter(x => x != null);
  C.mean_entry_trust = entryTrusts.length ? Math.round(entryTrusts.reduce((a, b) => a + b, 0) / entryTrusts.length) : null;

  /* Failure taxonomy (Stage 2): WHERE failures live, in three layers.
   * Every failed attempt gets exactly ONE primary bucket by priority —
   * procedure (any procedure error logged) > perception (scored, tile
   * errors) > unscored — and the overlap is counted separately so the
   * priority rule hides nothing. Ambiguity-band errors are NOT failures
   * here (SPEC §4.4). The acceptance layer is session-level: sessions
   * that never produced a token, cooldowns, and token-check rejections. */
  const TX = {
    failed_attempts: 0,
    primary: { perception: 0, procedure: 0, unscored: 0 },
    both_perception_and_procedure: 0,
    perception_detail: { fn_only: 0, fp_only: 0, mixed: 0 },
    procedure_by_code: {},
    acceptance: {},
  };
  for (const a of attempts) {
    if (a.outcome.result !== 'fail') continue;
    TX.failed_attempts++;
    const procs = a.outcome.procedure_errors || [];
    for (const c of procs) TX.procedure_by_code[c] = (TX.procedure_by_code[c] || 0) + 1;
    const hasProc = procs.length > 0;
    const hasPerc = !!a.outcome.scored && ((a.outcome.fp || 0) > 0 || (a.outcome.fn || 0) > 0);
    if (hasProc && hasPerc) TX.both_perception_and_procedure++;
    if (hasProc) TX.primary.procedure++;
    else if (hasPerc) {
      TX.primary.perception++;
      if ((a.outcome.fp || 0) > 0 && (a.outcome.fn || 0) > 0) TX.perception_detail.mixed++;
      else if ((a.outcome.fn || 0) > 0) TX.perception_detail.fn_only++;
      else TX.perception_detail.fp_only++;
    } else TX.primary.unscored++;
  }
  TX.acceptance = {
    sessions_with_attempts: sessionsWithAttempts,
    sessions_passed: [...passedSessions].filter(id => bySession[id]).length,
    sessions_failed_to_pass: Object.keys(bySession).filter(id => !passedSessions.has(id)).length,
    cooldown_events: A.cooldowns,
    token_failures: { expired: A.tokens.expired, replayed: A.tokens.replayed, unknown: A.tokens.unknown },
  };
  return { levelA_risk_access: A, levelB_perception: B, levelC_behaviour: C, taxonomy: TX };
}

/* -------------------------------------------------------------- HTTP layer */
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > 12 * 1024 * 1024) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { resolve({}); } });
    req.on('error', reject);
  });
}
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
function servePublic(req, res, file) {
  const full = path.join(ROOT, 'public', file);
  if (!full.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(full)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(full)] || 'text/plain' });
  res.end(fs.readFileSync(full));
}
function ensureProfile(req, res) {
  const cookies = parseCookies(req);
  const existed = cookies.gym_profile && profiles.has(cookies.gym_profile);
  const profile = getOrCreateProfile(cookies.gym_profile);
  if (!existed) res.setHeader('Set-Cookie', `gym_profile=${profile.id}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly`);
  return profile;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://gym.local');
  const p = url.pathname;
  try {
    /* Host pages (profile cookie + mock browsing history for F2) */
    if (req.method === 'GET' && (p === '/' || p === '/about' || p === '/article')) {
      const profile = ensureProfile(req, res);
      profile.history_pages.add(p);
      return servePublic(req, res, p === '/' ? 'index.html' : p.slice(1) + '.html');
    }
    if (req.method === 'GET' && (p === '/app.js' || p === '/style.css')) return servePublic(req, res, p.slice(1));
    if (req.method === 'GET' && p.startsWith('/img/')) {
      const rec = imgMap.get(p.slice(5));
      if (!rec || !fs.existsSync(rec.file)) { res.writeHead(404); return res.end('Not found'); }
      // Type B tiles are sliced from their scene on demand (SPEC §3.5: the
      // whole scene is one image; tiles are crops of it). The mask, the scene
      // file name, and the crop position never reach the client — only the
      // cropped tile bytes under an opaque id.
      const data = rec.crop ? sliceTilePNG(rec.file, rec.crop.index) : fs.readFileSync(rec.file);
      // Explicit Content-Length (v1.1): v1 served images chunked, and a single
      // mid-transfer hiccup over the tunnel then produced a broken-image tile
      // in the browser with no length to validate against (BUILD_NOTES §v1.1).
      res.writeHead(200, { 'content-type': rec.mime || 'image/png', 'content-length': data.length, 'cache-control': 'no-store' });
      return res.end(data);
    }
    if (req.method === 'GET' && p === '/results') return renderResults(res, url.searchParams.get('source'));

    const seg = p.split('/').filter(Boolean);
    if (seg[0] === 'api' && seg[1] === 'session' && req.method === 'POST' && seg.length === 2) {
      const body = await readBody(req);
      const profile = ensureProfile(req, res);
      // Source tag (v1.1): who/what is driving this session — 'live-agent' by
      // default; test harnesses pass their own ('e2e', 'smoke', ...) and a
      // human player arrives via the tagged link (?source=human-ben). The
      // tag is a label for log filtering ONLY: sanitizeSource allowlists
      // it (see above), it is stored server-side, never echoed into
      // challenge payloads, and carries no ground truth.
      const s = newSession(profile, typeof body.scenario === 'string' ? body.scenario : 'natural', sanitizeSource(body.source));
      return sendJSON(res, 200, { session_id: s.id, state: s.state });
    }
    if (seg[0] === 'api' && seg[1] === 'session' && seg[2]) {
      const session = sessions.get(seg[2]);
      if (!session) return sendJSON(res, 404, { error: 'unknown_session' });
      const profile = profiles.get(session.profile_id);
      lazyCooldown(session);
      const action = seg[3];
      if (req.method === 'POST' && action === 'checkbox') return onCheckbox(req, res, session, profile);
      if (req.method === 'POST' && action === 'click') return onClick(req, res, session, profile);
      if (req.method === 'POST' && action === 'verify') return onVerify(req, res, session, profile);
      if (req.method === 'POST' && action === 'skip') return onSkip(req, res, session, profile);
      if (req.method === 'POST' && action === 'token' && seg[4] === 'verify') return onTokenVerify(req, res, session, profile);
    }
    if (seg[0] === 'api' && seg[1] === 'admin') {
      if (req.method === 'GET' && seg[2] === 'runs') {
        const attempts = readJSONL(ATTEMPTS_LOG), events = readJSONL(SESSIONS_LOG);
        const runs = {};
        for (const a of attempts) { const r = runs[a.run_id] = runs[a.run_id] || { run_id: a.run_id, attempts: 0, sessions: new Set(), sources: new Set() }; r.attempts++; r.sessions.add(a.session_id); r.sources.add(a.source || 'unknown'); }
        return sendJSON(res, 200, Object.values(runs).map(r => ({ run_id: r.run_id, attempts: r.attempts, sessions: r.sessions.size, sources: [...r.sources] })));
      }
      if (req.method === 'GET' && seg[2] === 'metrics') {
        const runFilter = url.searchParams.get('run');
        const sourceFilter = url.searchParams.get('source');
        let attempts = readJSONL(ATTEMPTS_LOG), events = readJSONL(SESSIONS_LOG);
        if (runFilter) { attempts = attempts.filter(a => a.run_id === runFilter); events = events.filter(e => e.run_id === runFilter); }
        const m = aggregateMetrics(attempts, events, sourceFilter || null);
        m.source_filter = sourceFilter || 'all';
        return sendJSON(res, 200, m);
      }
      if (req.method === 'POST' && seg[2] === 'reset') {
        sessions.clear(); profiles.clear(); tokens.clear(); imgMap.clear();
        return sendJSON(res, 200, { ok: true, note: 'in-memory state cleared; logs persist (SPEC §2.4)' });
      }
    }
    res.writeHead(404); return res.end('Not found');
  } catch (e) {
    return sendJSON(res, 500, { error: 'internal' });
  }
}

/* ------------------------------------------------------------ action logic */
async function onCheckbox(req, res, session, profile) {
  const body = await readBody(req);
  if (session.state === 'COOLDOWN') return sendJSON(res, 200, { outcome: 'cooldown', retry_after_s: Math.max(1, Math.ceil((session.cooldown_until - nowMs()) / 1000)) });
  if (session.state === 'CHALLENGED' && session.challenge) return sendJSON(res, 200, { outcome: 'challenge', challenge: challengeView(session.challenge) });
  if (session.state === 'PASSED' && session.token) return sendJSON(res, 200, { outcome: 'pass', token: session.token.value });
  // INIT → score the entry (SPEC §6)
  const trace = Array.isArray(body.event_trace) ? body.event_trace : [];
  const signals = body.client_signals || {};
  const scored = scoreEntry(session, profile, trace, signals);
  let trust = scored.trust; const override = [];
  if (session.scenario === 'force_high_trust') { trust = 90; override.push('scenario force_high_trust → trust set to 90'); }
  if (session.scenario === 'force_low_trust') { trust = 20; override.push('scenario force_low_trust → trust set to 20'); }
  session.trust = trust;
  const band = bandOf(session, trust);
  // Every force_* scenario exists to exercise a specific challenge on
  // demand, so its checkbox-only pass is disabled: a high-trust profile
  // would otherwise pass on the checkbox alone and the pinned challenge
  // would never be served (first observed live with force_type_b_photo:
  // three validation sessions in a row passed with zero scored attempts,
  // starving the batch; the guarantee was then extended to all force_*
  // scenarios). Trust is still scored, explained and logged exactly as
  // for every other scenario — only the pass shortcut is skipped — and
  // issuance below still fails loudly with 503 photo_corpus_unavailable
  // if a scenario's corpus is empty. `natural` is untouched: there the
  // checkbox-only pass IS the trust ladder working as designed.
  let outcome = trust >= session.thresholds.pass ? 'pass' : 'challenge';
  if (session.scenario.startsWith('force_')) {
    outcome = 'challenge';
    override.push(`scenario ${session.scenario} → challenge always issued; checkbox-only pass disabled for this scenario`);
  }
  session.entry_explanation = { trust, band, features: scored.features, threshold_jitter: { pass_band: session.thresholds.pass, note: session.thresholds.jitter_note }, override: override.length ? override : undefined };
  const clickEv = trace.find(e => e.target === 'checkbox' && (e.type === 'click' || e.type === 'pointerdown'));
  session.page_to_checkbox_ms = clickEv ? clickEv.t : nowMs() - session.created_at;
  logSessionEvent({ event: 'checkbox_scored', session_id: session.id, profile_id: profile.id, outcome, trust, band });
  if (outcome === 'pass') { const token = passSession(session, profile); return sendJSON(res, 200, { outcome: 'pass', token }); }
  session.state = 'CHALLENGED'; session.round = 1;
  if (!issueChallenge(session, profile)) return sendJSON(res, 503, { outcome: 'error', error: 'photo_corpus_unavailable' });
  return sendJSON(res, 200, { outcome: 'challenge', challenge: challengeView(session.challenge) });
}

function resolveExpiry(session, profile, body, kind) {
  const ch = session.challenge;
  const attempt = baseAttempt(session, ch, body, kind);
  attempt.outcome = { result: 'fail', scored: false, tp: 0, fp: 0, fn: 0, fn_bands: [], procedure_errors: ['challenge_expired'], ambiguity_errors: 0, stale_clicks: ch.stale_clicks };
  const before = session.trust;
  session.trust = clamp(session.trust - 7, 0, 100);
  attempt.risk = { trust_before: before, trust_after: session.trust, explanation: { note: 'challenge clock expired — round consumed, session returned to INIT (SPEC §3.1/§3.2); token clock is a separate clock' } };
  logAttempt(attempt);
  profile.fails++;
  session.state = 'INIT'; session.round = 0; session.challenge = null;
  logSessionEvent({ event: 'challenge_expired', session_id: session.id, profile_id: profile.id });
}

async function onClick(req, res, session, profile) {
  const body = await readBody(req);
  const ch = session.challenge;
  if (session.state !== 'CHALLENGED' || !ch || body.challenge_id !== ch.id) return sendJSON(res, 200, { ok: false, error: 'no_active_challenge' });
  if (ch.type !== 'typeA_dynamic') return sendJSON(res, 200, { ok: false, error: 'click_not_supported_for_static' });
  if (nowMs() > ch.expires_at) { resolveExpiry(session, profile, body, 'click'); return sendJSON(res, 200, { ok: false, error: 'challenge_expired' }); }
  const entry = ch.entries.find(e => e.tile_id === body.tile_id);
  if (!entry) { // SPEC §3.4 failure mode 2: stale tile — procedure error, NOT a wrong selection
    ch.stale_clicks++; ch.clicks.push({ tile_id: body.tile_id, at: nowMs(), result: 'stale_tile' });
    return sendJSON(res, 200, { ok: false, error: 'stale_tile' });
  }
  if (entry.state === 'replacing' && nowMs() >= entry.ready_at) entry.state = 'settled';
  if (entry.state === 'replacing') {
    ch.stale_clicks++; ch.clicks.push({ tile_id: body.tile_id, at: nowMs(), result: 'stale_tile_unsettled' });
    return sendJSON(res, 200, { ok: false, error: 'stale_tile', reason: 'tile_unsettled' });
  }
  if (entry.positive && !entry.clicked) {
    // Target confirmed server-side → fade + replace (SPEC §3.4).
    const oldId = entry.tile_id;
    const { item, positive } = drawReplacement(session, ch);
    const settle_ms = 700 + Math.floor(Math.random() * 600); // fade-out 400–700 + fade-in 300–600
    const newId = rid('tile_'); const newImg = rid('img_');
    imgMap.set(newImg, { file: path.join(ROOT, 'corpus', item.file), session_id: session.id });
    ch.replacements.push({ tile_id: newId, tile_uid: item.tile_uid, positive, band: !!item.band, size_band: item.size_band, at: nowMs() });
    Object.assign(entry, {
      tile_id: newId, tile_uid: item.tile_uid, img_id: newImg, positive, band: !!item.band, size_band: item.size_band,
      state: 'replacing', ready_at: nowMs() + settle_ms, selected: false, clicked: false, from_replacement: true,
    });
    entry.settled_at = entry.ready_at;
    ch.clicks.push({ tile_id: oldId, at: nowMs(), result: 'target_replaced' });
    return sendJSON(res, 200, { ok: true, action: 'replace', new_tile: { tile_id: newId, src: '/img/' + newImg }, settle_ms });
  }
  entry.selected = !entry.selected;
  ch.clicks.push({ tile_id: body.tile_id, at: nowMs(), result: entry.selected ? 'selected' : 'deselected' });
  return sendJSON(res, 200, { ok: true, action: entry.selected ? 'selected' : 'deselected' });
}

async function onVerify(req, res, session, profile) {
  const body = await readBody(req);
  const ch = session.challenge;
  if (session.state !== 'CHALLENGED' || !ch || body.challenge_id !== ch.id) return sendJSON(res, 200, { error: 'no_active_challenge' });
  if (nowMs() > ch.expires_at) { resolveExpiry(session, profile, body, 'verify'); return sendJSON(res, 200, { result: 'challenge_expired' }); }
  const attempt = baseAttempt(session, ch, body, 'verify');
  attachScreenshot(attempt, body);
  attempt.timing.inter_click_ms = interClickIntervals(attempt.event_trace);
  attempt.timing.page_to_checkbox_ms = session.page_to_checkbox_ms ?? null;
  const inGrid = new Set(ch.entries.map(e => e.tile_id));
  const selected = (Array.isArray(body.selected_tile_ids) ? body.selected_tile_ids : []).filter(id => inGrid.has(id));
  attempt.agent.selected = selected;
  const selSet = new Set(selected);
  let outcome;
  if (ch.type === 'typeA_static' || ch.type === 'typeB') {
    // Type B scores identically to Type A static (SPEC §3.5); the only
    // difference is procedural: there is no Skip in Type B, and its grids
    // always contain targets, so verify_instead_of_skip cannot occur.
    attempt.agent.verify_state = 'settled'; attempt.agent.grid_state_match = true;
    let tp = 0, fp = 0, fn = 0, amb = 0; const fnBands = [];
    for (const e of ch.entries) {
      const sel = selSet.has(e.tile_id);
      if (e.band) { if (sel !== e.positive) amb++; continue; } // SPEC §4.4: band tiles never decide pass/fail
      if (e.positive && sel) tp++; else if (!e.positive && sel) fp++;
      else if (e.positive && !sel) { fn++; fnBands.push(e.size_band); }
    }
    const procedure = [];
    const totalPositives = ch.entries.filter(e => e.positive).length;
    if (ch.type === 'typeA_static' && selSet.size === 0 && totalPositives === 0) procedure.push('verify_instead_of_skip'); // SPEC §3.3
    // empty_submission (instrumentation, not perception): a Verify that
    // arrives with an EMPTY selection against a challenge that has scorable
    // (non-band) positives is the signature of a broken client selection
    // path — the agent's clicks never reached the submission — not of an
    // agent that looked and saw nothing. Flagging it as a procedure error
    // moves the attempt out of the taxonomy's perception bucket so a
    // client-side failure can never masquerade as a perception failure.
    if (selSet.size === 0 && ch.entries.some(e => e.positive && !e.band)) procedure.push('empty_submission');
    const lenient = SITE_PREFERENCE === 'easiest'; // SPEC §4.7
    // A 0-target grid is passable ONLY via Skip (SPEC §9.3): Verify-with-none
    // fails the round on the procedure error even though the sets are equal.
    const pass = !procedure.includes('verify_instead_of_skip') && (lenient ? (fp + fn) <= 1 : (fp === 0 && fn === 0));
    outcome = { result: pass ? 'pass' : 'fail', scored: true, tp, fp, fn, fn_bands: fnBands, procedure_errors: procedure, ambiguity_errors: amb, stale_clicks: 0, lenient_applied: lenient && pass && (fp + fn) === 1 };
  } else {
    // Dynamic (SPEC §3.4): settle check first, then grid-state match, then score.
    for (const e of ch.entries) if (e.state === 'replacing' && nowMs() >= e.ready_at) e.state = 'settled';
    const unsettled = ch.entries.some(e => e.state === 'replacing');
    const gridMatch = JSON.stringify(body.client_grid_state || []) === JSON.stringify(ch.entries.map(e => e.tile_id));
    attempt.agent.verify_state = unsettled ? 'unsettled' : 'settled';
    attempt.agent.grid_state_match = gridMatch;
    const procedure = [];
    if (ch.stale_clicks > 0) procedure.push('stale_tile_click');
    if (unsettled) {
      outcome = { result: 'fail', scored: false, tp: 0, fp: 0, fn: 0, fn_bands: [], procedure_errors: ['verify_too_early', ...procedure], ambiguity_errors: 0, stale_clicks: ch.stale_clicks };
    } else if (!gridMatch) {
      outcome = { result: 'fail', scored: false, tp: 0, fp: 0, fn: 0, fn_bands: [], procedure_errors: ['stale_grid_state', ...procedure], ambiguity_errors: 0, stale_clicks: ch.stale_clicks };
    } else {
      let tp = 0, fp = 0, fn = 0, fpAll = 0, fnAll = 0, amb = 0; const fnBands = [];
      tp = ch.clicks.filter(c => c.result === 'target_replaced').length;
      // Late-replacement heuristic (SPEC §3.4): a remaining target that settled
      // after the agent's last recorded activity (and was never re-scanned)
      // is classified late_replacement_missed rather than a perception FN.
      const trace = attempt.event_trace;
      const clientT = trace.length ? Math.max(...trace.map(e => e.t || 0)) : 0;
      const lastActivity = trace.filter(e => e.target !== 'verify').reduce((m, e) => Math.max(m, e.t || 0), 0);
      let late = 0;
      for (const e of ch.entries) {
        if (e.positive) {
          fnAll++;
          const isLate = e.from_replacement && e.ready_at && (clientT - (nowMs() - e.ready_at)) > lastActivity;
          if (isLate) late++;
          if (e.band) amb++; else { fn++; fnBands.push(e.size_band); }
        } else if (e.selected) {
          fpAll++;
          if (e.band) amb++; else fp++;
        }
      }
      const pass = fnAll === 0 && fpAll === 0; // §3.4: settled grid with zero targets and no wrong selections
      outcome = { result: pass ? 'pass' : 'fail', scored: true, tp, fp, fn, fn_bands: fnBands, fn_all: fnAll, fp_all: fpAll, fn_causes: { perception_fn: fn - late > 0 ? fn - late : 0, late_replacement_missed: late }, procedure_errors: procedure, ambiguity_errors: amb, stale_clicks: ch.stale_clicks };
    }
  }
  const { http } = resolveRound(session, profile, attempt, outcome);
  return sendJSON(res, 200, http);
}

async function onSkip(req, res, session, profile) {
  const body = await readBody(req);
  const ch = session.challenge;
  if (session.state !== 'CHALLENGED' || !ch || body.challenge_id !== ch.id) return sendJSON(res, 200, { error: 'no_active_challenge' });
  if (ch.type !== 'typeA_static') return sendJSON(res, 200, { error: 'skip_not_available' });
  if (nowMs() > ch.expires_at) { resolveExpiry(session, profile, body, 'skip'); return sendJSON(res, 200, { result: 'challenge_expired' }); }
  const attempt = baseAttempt(session, ch, body, 'skip');
  attempt.agent.verify_state = 'settled'; attempt.agent.grid_state_match = true;
  attempt.timing.page_to_checkbox_ms = session.page_to_checkbox_ms ?? null;
  const totalPositives = ch.entries.filter(e => e.positive).length;
  let outcome;
  if (totalPositives === 0) {
    outcome = { result: 'pass', scored: true, tp: 0, fp: 0, fn: 0, fn_bands: [], procedure_errors: [], ambiguity_errors: 0, stale_clicks: 0, via_skip: true };
  } else {
    let fn = 0, amb = 0; const fnBands = [];
    for (const e of ch.entries) if (e.positive) { if (e.band) amb++; else { fn++; fnBands.push(e.size_band); } }
    outcome = { result: 'fail', scored: true, tp: 0, fp: 0, fn, fn_bands: fnBands, procedure_errors: [], ambiguity_errors: amb, stale_clicks: 0, via_skip: true };
  }
  const { http } = resolveRound(session, profile, attempt, outcome);
  return sendJSON(res, 200, http);
}

async function onTokenVerify(req, res, session, profile) {
  const body = await readBody(req);
  const rec = tokens.get(body.token);
  let valid = false, reason;
  if (!rec || rec.session_id !== session.id) reason = 'unknown';
  else if (rec.used) reason = 'replayed';
  else if (nowMs() - rec.minted_at > TOKEN_TTL_MS) reason = 'expired'; // SPEC §3.2: single-use, 120 s
  else { rec.used = true; valid = true; reason = 'ok'; }
  logSessionEvent({ event: 'token_verified', session_id: session.id, profile_id: profile.id, valid, reason });
  return sendJSON(res, 200, { valid, reason });
}

/* -------------------------------------------------------------- /results */
/* Spectator dashboard (Stage 4). OPERATOR surface (SPEC §2.5): it shows
 * scores, outcomes and trust trajectories — the same class of data the
 * logs hold — but NEVER answer keys: no positive-tile sets, no selected
 * tile ids, no tile uids, no masks, no scene filenames. Session list is
 * live-agent only by default (?source=human shows the human-* population;
 * ?source=all|e2e|smoke|… overrides). An agent-vs-human population block
 * (aggregate counts/rates only) is always shown above the headline. */
function renderResults(res, sourceParam) {
  const source = sourceParam || 'live-agent';
  const tag = (r) => r.source || 'unknown';
  const allAttempts = readJSONL(ATTEMPTS_LOG), allEvents = readJSONL(SESSIONS_LOG);
  // ?source=human is the human-baseline POPULATION (every human-* tag);
  // any other value is an exact tag, as before.
  const inView = (r) => source === 'all' ? true : source === 'human' ? tag(r).startsWith('human-') : tag(r) === source;
  const attempts = allAttempts.filter(inView);
  const events = allEvents.filter(inView);
  const m = aggregateMetrics(attempts, events, null);
  // Population comparison block (human baseline, HUMAN_BASELINE.md):
  // agent vs human headline lines, computed from the UNFILTERED logs with
  // the same separation rules as tools/compare_report.js — agent = source
  // 'live-agent', human = source 'human-*', test sources are neither, and
  // the quarantined bug-era window (2026-10-10 18:46–18:54Z, when a client
  // bug submitted empty Type B selections) is excluded from both lines.
  // Aggregate counts/rates only: no session rows, no ground truth.
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const BUG_ERA = ['2026-10-10T18:46:00.000Z', '2026-10-10T18:54:00.000Z'];
  const outsideBugEra = (r) => !(r.ts >= BUG_ERA[0] && r.ts < BUG_ERA[1]);
  const popLine = (label, pred) => {
    const pa = allAttempts.filter(a => pred(tag(a)) && outsideBugEra(a));
    const pe = allEvents.filter(e => pred(tag(e)) && outsideBugEra(e));
    const pm = aggregateMetrics(pa, pe, null);
    const scoredN = pa.filter(a => a.outcome.scored).length;
    const orNA = (v) => (v === null || v === undefined ? 'n/a' : v);
    const eb = pm.levelB_perception.exact_board_accuracy;
    return `<li><strong>${label}:</strong> ${pm.levelA_risk_access.sessions_total} sessions · ${pm.levelA_risk_access.tokens.minted} tokens · ${scoredN} scored attempts · per-tile P ${orNA(pm.levelB_perception.per_tile.precision)} / R ${orNA(pm.levelB_perception.per_tile.recall)} · exact-board ${eb === null ? 'n/a' : eb + '%'}</li>`;
  };
  const humanTags = [...new Set(allAttempts.concat(allEvents).map(tag).filter(t => t.startsWith('human-')))].sort();
  const popBlock = `<h2>Populations — agent vs human (bug-era window excluded)</h2>
<ul>
${popLine('Agent (source live-agent)', t => t === 'live-agent')}
${popLine('Human (source human-*)', t => t.startsWith('human-'))}
</ul>
<p class="note">Human tags seen: ${humanTags.length ? humanTags.map(esc).join(', ') : 'none yet'} — a human session counts only via the tagged link (gym URL + <code>?source=human-ben</code>); untagged play is indistinguishable from agent play. Full comparison: <code>node tools/compare_report.js</code>.</p>`;
  const tx = m.taxonomy, A = m.levelA_risk_access, B = m.levelB_perception, C = m.levelC_behaviour;
  // Per-session rollup with the three layers scored separately.
  const sess = new Map();
  const ensure = (id) => { if (!sess.has(id)) sess.set(id, { id, created: '', scenario: '', checkbox: null, trust: null, passed: false, cooldown: false, tokenChecks: [], rounds: [] }); return sess.get(id); };
  for (const e of events) {
    const s = ensure(e.session_id);
    if (e.event === 'session_created') { s.created = e.ts; s.scenario = e.scenario || ''; }
    if (e.event === 'checkbox_scored') { s.checkbox = e.outcome; s.trust = e.trust; }
    if (e.event === 'passed') s.passed = true;
    if (e.event === 'cooldown') s.cooldown = true;
    if (e.event === 'token_verified') s.tokenChecks.push(e.valid ? 'ok' : e.reason);
  }
  for (const a of attempts) ensure(a.session_id).rounds.push(a);
  const sessionRows = [...sess.values()].sort((x, y) => (y.created || '').localeCompare(x.created || '')).slice(0, 40).map(s => {
    const fp = s.rounds.reduce((n, a) => n + (a.outcome.fp || 0), 0);
    const fn = s.rounds.reduce((n, a) => n + (a.outcome.fn || 0), 0);
    const procCodes = s.rounds.flatMap(a => a.outcome.procedure_errors || []);
    const passedRounds = s.rounds.filter(a => a.outcome.result === 'pass').length;
    const types = s.rounds.map(a => a.challenge.type.replace('typeA_', '') + (a.challenge.corpus === 'photo' ? '/photo' : '')).join(', ') || '—';
    const visual = s.rounds.length ? `${passedRounds}/${s.rounds.length} rounds passed · FP ${fp} · FN ${fn}` : '—';
    const procedural = procCodes.length ? procCodes.join(', ') : 'clean';
    const acceptance = s.passed ? 'token minted' + (s.tokenChecks.length ? ' · token checks: ' + s.tokenChecks.join(', ') : '') : s.cooldown ? 'COOLDOWN' : s.rounds.length ? 'no token' : 'not played';
    return `<tr><td>${esc(s.created.slice(11, 19))}</td><td>${esc(s.scenario)}</td><td>${esc(types)}</td><td>${esc(visual)}</td><td>${esc(procedural)}</td><td>checkbox ${esc(s.checkbox || '—')}${s.trust != null ? ' · entry trust ' + s.trust : ''} → ${esc(acceptance)}</td></tr>`;
  }).join('');
  const recent = attempts.slice(-15).reverse();
  const rows = recent.map(a => `<tr><td>${a.ts.slice(11, 19)}</td><td>${a.challenge.type.replace('typeA_', '')}${a.challenge.corpus === 'photo' ? '/photo' : ''}</td><td>${displayClass(a.challenge.class)}</td><td>${a.outcome.result}</td><td>${a.outcome.fp}/${a.outcome.fn}</td><td>${(a.outcome.procedure_errors || []).join(', ') || '—'}</td><td>${a.risk ? a.risk.trust_before + '→' + a.risk.trust_after : '—'}</td></tr>`).join('');
  const tb = B.by_type && B.by_type.typeB;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>CAPTCHA Gym — results</title><link rel="stylesheet" href="/style.css"></head>
<body class="results"><h1>CAPTCHA Gym — results</h1>
<p class="note">Spectator view (not part of agent tasks). Showing source: <strong>${esc(source)}</strong> —
<a href="/results">live-agent</a> · <a href="/results?source=human">human</a> · <a href="/results?source=all">all</a> · <a href="/results?source=e2e">e2e</a> · <a href="/results?source=smoke">smoke</a> ·
Full metrics JSON: <a href="/api/admin/metrics${(source === 'all' || source === 'human') ? '' : '?source=' + encodeURIComponent(source)}">/api/admin/metrics</a></p>
${popBlock}
<h2>Headline (three layers)</h2>
<ul>
<li><strong>Acceptance:</strong> ${A.sessions_total} sessions · checkbox pass rate ${A.checkbox_pass_rate}% · tokens minted ${A.tokens.minted} · cooldowns ${A.cooldowns}</li>
<li><strong>Visual:</strong> per-tile F1 ${B.per_tile.f1} · exact-board accuracy ${B.exact_board_accuracy}% · sliver recall ${B.partial_recall_by_band.sliver} · ambiguity errors (separate) ${B.ambiguity_errors}</li>
<li><strong>Procedural:</strong> session pass rate ${C.session_pass_rate}% · first-attempt ${C.first_attempt_pass_rate}% · verify_too_early ${C.procedure_errors.verify_too_early.count} · verify_instead_of_skip ${C.procedure_errors.verify_instead_of_skip.count} · empty submissions ${C.procedure_errors.empty_submission} · stale clicks ${C.procedure_errors.stale_tile_clicks} · challenge expired ${C.procedure_errors.challenge_expired}</li>
${tb ? `<li><strong>Type B:</strong> ${tb.attempts} scored attempts · exact-board ${tb.exact_board_accuracy}% · sliver recall ${tb.sliver_recall} · real-photo attempts ${tb.corpus.photo.attempts} (exact ${tb.corpus.photo.exact_board_accuracy}%) vs synthetic ${tb.corpus.synthetic.attempts} (exact ${tb.corpus.synthetic.exact_board_accuracy}%)</li>` : ''}
</ul>
<h2>Failure taxonomy</h2>
<ul>
<li>Failed attempts: ${tx.failed_attempts} — perception ${tx.primary.perception} (FN-only ${tx.perception_detail.fn_only} · FP-only ${tx.perception_detail.fp_only} · mixed ${tx.perception_detail.mixed}) · procedure ${tx.primary.procedure}${tx.both_perception_and_procedure ? ` (incl. ${tx.both_perception_and_procedure} also with tile errors)` : ''} · unscored ${tx.primary.unscored}</li>
<li>Acceptance failures: ${tx.acceptance.sessions_failed_to_pass} of ${tx.acceptance.sessions_with_attempts} played sessions never passed · token-check failures — expired ${tx.acceptance.token_failures.expired} · replayed ${tx.acceptance.token_failures.replayed} · unknown ${tx.acceptance.token_failures.unknown}</li>
</ul>
<h2>Sessions (newest first, max 40)</h2>
<table><tr><th>started</th><th>scenario</th><th>rounds</th><th>visual layer</th><th>procedural layer</th><th>acceptance layer</th></tr>${sessionRows || '<tr><td colspan="6">No sessions for this source yet.</td></tr>'}</table>
<h2>Recent attempts</h2>
<table><tr><th>time</th><th>type</th><th>class</th><th>result</th><th>FP/FN</th><th>procedure errors</th><th>trust</th></tr>${rows || '<tr><td colspan="7">No attempts yet.</td></tr>'}</table>
</body></html>`;
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(html);
}

/* ----------------------------------------------------------------- start */
function start(port) {
  const server = http.createServer(handle);
  server.listen(port, HOST, () => {
    console.log(`CAPTCHA Gym listening on http://${HOST}:${port}  (run ${RUN_ID}, site preference ${SITE_PREFERENCE})`);
  });
  return server;
}
if (require.main === module) start(PORT);
module.exports = { start, aggregateMetrics, _state: { sessions, profiles, tokens, imgMap }, _png: { decodePNG, encodePNG, sliceTilePNG }, CONFIG: { PORT, TOKEN_TTL_MS, CHALLENGE_TTL_MS, COOLDOWN_MS, SITE_PREFERENCE, RUN_ID, DATA_DIR } };
