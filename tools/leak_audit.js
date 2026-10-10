#!/usr/bin/env node
/*
 * leak_audit.js — SPEC §8.2 answer-key leak audit, end-to-end (Stage 5).
 *
 * Spins up a throwaway server (ephemeral port, temp data dir, sessions
 * tagged source 'leak-audit'), crawls EVERY agent-facing surface — host
 * pages, client JS/CSS, session/checkbox/click/verify/skip/token
 * responses for all challenge types (static, dynamic, Type B synthetic,
 * Type B photo), image responses, and error responses — and greps every
 * payload for ground-truth leakage. Also probes the forbidden paths
 * (corpora, masks, manifests, logs, source files) for 404s.
 *
 * The §8.2 rule: ground truth must be unrecoverable from anything the
 * agent can see. The operator surfaces (/results, /api/admin/*) are
 * checked separately and held to the weaker operator rule (scores and
 * outcomes yes; answer keys — tile uids, positive sets — never).
 *
 * Run: node tools/leak_audit.js   (exit 0 = audit clean)
 */
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.GYM_TOKEN_TTL_MS = '1500';
process.env.GYM_CHALLENGE_TTL_MS = '20000';
process.env.GYM_COOLDOWN_MS = '1200';
process.env.GYM_RUN_ID = 'run_leak_audit';
process.env.GYM_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-leak-'));
const gym = require('../server.js');

const CLASSES16 = ['bicycle', 'bridge', 'bus', 'car', 'chimney', 'crosswalk', 'fire hydrant', 'motorcycle', 'mountain', 'palm tree', 'stairs', 'taxi', 'traffic light', 'tractor', 'train', 'boat'];
// Data-bearing patterns (§8.2 bans ground-truth DATA in payloads — keys,
// values, filenames — not dictionary words: the audit greps for quoted JSON
// keys, value shapes and file extensions, never bare vocabulary).
const BAD_TOKENS = ['"positive"', 'positives_server_only', '"tile_uid"', '"labels"', '"trust"', '"risk"', '"derived_tiles"', '"scene_uid"', '"overlap"', '"band"', 'ground_truth', 'derived_tiles', 'flickr', 'licence', 'license_url', 'coco_id', '_mask', '.jpg"', '.png"', '.jpg?', '.png?'];
const BAD_SIGNALS = { webdriver: true, ua: 'HeadlessChrome', platform: 'Linux', language: 'en', plugins: 0, has_chrome: false, webgl_renderer: 'SwiftShader', screen: [800, 600] };

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
let BASE;
const payloads = []; // {label, text}
async function req(method, p, body) {
  const r = await fetch(BASE + p, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  return { status: r.status, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })(), headers: r.headers };
}
function capture(label, text) { payloads.push({ label, text }); }
async function sessionWithChallenge(scenario) {
  const s = await req('POST', '/api/session', { scenario, source: 'leak-audit' });
  capture('session create (' + scenario + ')', s.text);
  const sid = s.json.session_id;
  const cb = await req('POST', `/api/session/${sid}/checkbox`, { event_trace: [], client_signals: BAD_SIGNALS });
  capture('checkbox (' + scenario + ')', cb.text);
  return { sid, cb };
}

async function main() {
  const server = gym.start(0);
  await new Promise(r => server.on('listening', r));
  BASE = `http://127.0.0.1:${server.address().port}`;
  console.log('leak audit against ' + BASE);

  /* Static agent-facing files */
  for (const p of ['/', '/about', '/article', '/app.js', '/style.css']) {
    const r = await req('GET', p);
    check('GET ' + p + ' serves', r.status === 200);
    capture('GET ' + p, r.text);
  }
  const staticAll = payloads.map(p => p.text).join('\n');
  // Word-boundary matching: substrings would false-positive on ordinary
  // words ("busy", "carrier") — the rule is class NAMES as words.
  const classHit = (text) => CLASSES16.filter(c => new RegExp('\\b' + c.replace(/ /g, '\\s') + '\\b', 'i').test(text));
  check('static files contain no class names (§8.2: no label info in page/JS)', classHit(staticAll).length === 0, classHit(staticAll).join(','));

  /* Challenge flows: capture every response shape */
  const challenges = [];
  for (const scenario of ['force_static', 'force_dynamic', 'force_high_trust']) {
    const { sid, cb } = await sessionWithChallenge(scenario);
    if (cb.json && cb.json.challenge) challenges.push({ sid, ch: gym._state.sessions.get(sid).challenge, view: cb.json.challenge });
    if (cb.json && cb.json.token) {
      const tv = await req('POST', `/api/session/${sid}/token/verify`, { token: cb.json.token });
      capture('token verify ok', tv.text);
      const tv2 = await req('POST', `/api/session/${sid}/token/verify`, { token: cb.json.token });
      capture('token verify replayed', tv2.text);
    }
  }
  // Type B: draw until both synthetic and photo challenges are captured.
  let sawSynthetic = false, sawPhoto = false;
  for (let i = 0; i < 80 && (!sawSynthetic || !sawPhoto); i++) {
    const { sid, cb } = await sessionWithChallenge('force_type_b');
    if (!cb.json || !cb.json.challenge) continue;
    const ch = gym._state.sessions.get(sid).challenge;
    if (ch.photo && !sawPhoto) { sawPhoto = true; challenges.push({ sid, ch, view: cb.json.challenge }); }
    if (!ch.photo && !sawSynthetic) { sawSynthetic = true; challenges.push({ sid, ch, view: cb.json.challenge }); }
  }
  check('captured both Type B variants (synthetic + photo)', sawSynthetic && sawPhoto);
  // force_type_b_photo: capture the forced-photo scenario's payloads too,
  // so the sweep below covers its create/checkbox/verify/skip shapes.
  {
    const { sid, cb } = await sessionWithChallenge('force_type_b_photo');
    const chP = cb.json && cb.json.challenge ? gym._state.sessions.get(sid).challenge : null;
    check('force_type_b_photo issues a photo challenge', !!chP && chP.photo === true);
    if (chP) challenges.push({ sid, ch: chP, view: cb.json.challenge });
  }
  // Round-response shapes: verify-empty, skip, bogus ids, unknown session.
  for (const { sid, ch } of challenges) {
    const v = await req('POST', `/api/session/${sid}/verify`, { challenge_id: ch.id, selected_tile_ids: [], client_grid_state: ch.entries.map(e => e.tile_id), event_trace: [] });
    capture('verify response (' + ch.type + (ch.photo ? '/photo' : '') + ')', v.text);
    const sk = await req('POST', `/api/session/${sid}/skip`, { challenge_id: ch.id, event_trace: [] });
    capture('skip response (' + ch.type + ')', sk.text);
    const bogus = await req('POST', `/api/session/${sid}/verify`, { challenge_id: 'ch_bogus', selected_tile_ids: [], event_trace: [] });
    capture('verify bogus-challenge response', bogus.text);
    if (ch.type === 'typeA_dynamic') {
      const target = ch.entries.find(e => e.positive);
      if (target) {
        const click = await req('POST', `/api/session/${sid}/click`, { challenge_id: ch.id, tile_id: target.tile_id });
        capture('dynamic click (replace) response', click.text);
        const stale = await req('POST', `/api/session/${sid}/click`, { challenge_id: ch.id, tile_id: target.tile_id });
        capture('dynamic click (stale) response', stale.text);
      }
    }
  }
  const unk = await req('POST', '/api/session/ses_unknown/checkbox', { event_trace: [], client_signals: {} });
  capture('unknown session response', unk.text);
  check('unknown session is a content-free 404', unk.status === 404 && unk.text.includes('unknown_session'));

  /* The core §8.2 assertions over every captured agent payload */
  const allAgentText = payloads.map(p => p.text).join('\n');
  const allUids = [];
  for (const s of gym._state.sessions.values()) if (s.challenge) for (const e of s.challenge.entries) allUids.push(e.tile_uid);
  for (const s of gym._state.sessions.values()) if (s.challenge) for (const t of s.challenge.initial_tiles) allUids.push(t.tile_uid);
  check('no tile_uid from any live challenge appears in any payload', !allUids.some(u => allAgentText.includes(u)), allUids.filter(u => allAgentText.includes(u)).slice(0, 3).join(','));
  const leakedTokens = BAD_TOKENS.filter(t => allAgentText.toLowerCase().includes(t.toLowerCase()));
  check('no ground-truth data patterns in any payload (' + BAD_TOKENS.join(', ') + ')', leakedTokens.length === 0, leakedTokens.join(','));
  // Per-challenge: no class name other than the target class may appear.
  let classLeak = [];
  for (const { view } of challenges) {
    const raw = JSON.stringify(view).toLowerCase();
    for (const c of CLASSES16) if (c !== view.target_class.toLowerCase() && raw.includes(c)) classLeak.push(c + ' in ' + view.target_class + ' challenge');
  }
  check('challenge payloads name only their own target class', classLeak.length === 0, classLeak.join('; '));

  /* Image responses: bytes + headers + PNG chunk hygiene */
  for (const { view } of challenges.slice(0, 4)) {
    const t = view.tiles[0];
    const r = await fetch(BASE + t.src);
    const buf = Buffer.from(await r.arrayBuffer());
    check(`image for ${view.type} tile: content-length == bytes`, r.headers.get('content-length') === String(buf.length));
    if ((r.headers.get('content-type') || '').includes('png')) {
      const chunks = [];
      let off = 8;
      while (off < buf.length) { const len = buf.readUInt32BE(off); chunks.push(buf.subarray(off + 4, off + 8).toString('ascii')); off += 12 + len; }
      check('synthetic/sliced PNG carries only IHDR/IDAT/IEND chunks (no metadata)', chunks.every(c => ['IHDR', 'IDAT', 'IEND'].includes(c)), chunks.join(','));
    }
  }

  /* Forbidden paths must 404 */
  const photoMan = fs.readFileSync(path.join(__dirname, '..', 'corpus', 'typeB', 'manifest_photos.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const forbidden = ['/corpus/typeA/manifest.jsonl', '/corpus/typeB/manifest.jsonl', '/corpus/typeB/manifest_photos.jsonl',
    '/corpus/' + photoMan[0].mask, '/corpus/' + photoMan[0].file, '/data/attempts.jsonl', '/data/sessions.jsonl',
    '/SPEC.md', '/server.js', '/tools/report.js', '/BUILD_NOTES.md'];
  for (const p of forbidden) {
    const r = await req('GET', p);
    check('GET ' + p + ' → 404', r.status === 404, 'got ' + r.status);
  }

  /* Operator surface: scores yes, answer keys never (weaker rule, still bound) */
  const dash = await req('GET', '/results?source=all');
  const someUid = allUids[0], somePositive = (() => { for (const s of gym._state.sessions.values()) if (s.challenge) { const p = s.challenge.initial_tiles.find(t => t.positive); if (p) return p.tile_id; } return null; })();
  check('/results renders', dash.status === 200);
  check('/results contains no tile_uid / positive tile_id', !!someUid && !dash.text.includes(someUid) && !!somePositive && !dash.text.includes(somePositive));
  check('/results contains no positives vocabulary', !dash.text.includes('positives_server_only'));

  console.log(`\nleak audit: ${passed} passed, ${failed} failed`);
  server.close();
  process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error('leak audit crashed:', e); process.exit(2); });
