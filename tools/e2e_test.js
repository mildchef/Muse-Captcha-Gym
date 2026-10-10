#!/usr/bin/env node
/*
 * e2e_test.js — CAPTCHA Gym acceptance tests (SPEC §9.3).
 *
 * Starts the server IN-PROCESS on an ephemeral port with compressed clocks
 * (env overrides; production defaults are the SPEC values) and a throwaway
 * data dir, then drives it over real HTTP. Ground truth for assertions is
 * read from the in-process state (module require — a filesystem privilege),
 * because the API deliberately exposes NO ground-truth hook (SPEC §2.3).
 *
 * Run: node tools/e2e_test.js   (exit code 0 = all pass)
 */
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

process.env.GYM_TOKEN_TTL_MS = '1500';
process.env.GYM_CHALLENGE_TTL_MS = '20000'; // long enough for multi-replacement dynamic rounds; T8 waits it out
process.env.GYM_COOLDOWN_MS = '1200';
process.env.GYM_RUN_ID = 'run_e2e_test';
process.env.GYM_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-e2e-'));

const gym = require('../server.js');
const { validatePNG } = require('./validate_corpus.js');
const DATA_DIR = process.env.GYM_DATA_DIR;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

const GOOD_SIGNALS = { webdriver: false, ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', platform: 'Linux x86_64', language: 'en-US', plugins: 3, has_chrome: true, webgl_renderer: 'Mesa Intel UHD', screen: [1920, 1080], timezone: 'America/Los_Angeles' };
const BAD_SIGNALS = { webdriver: true, ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36', platform: 'Linux x86_64', language: 'en-US', plugins: 0, has_chrome: false, webgl_renderer: 'SwiftShader', screen: [1920, 1080], timezone: 'UTC' };
const GOOD_TRACE = [
  { t: 120, type: 'focus', x: 0, y: 0, target: 'other', tile_id: null },
  { t: 300, type: 'scroll', x: 0, y: 140, target: 'other', tile_id: null },
  { t: 900, type: 'pointermove', x: 60, y: 80, target: 'other', tile_id: null },
  { t: 1500, type: 'pointermove', x: 130, y: 160, target: 'other', tile_id: null },
  { t: 2100, type: 'pointermove', x: 170, y: 210, target: 'other', tile_id: null },
  { t: 2350, type: 'pointermove', x: 178, y: 218, target: 'checkbox', tile_id: null },
  { t: 2500, type: 'pointerdown', x: 180, y: 220, target: 'checkbox', tile_id: null },
  { t: 2560, type: 'click', x: 180, y: 220, target: 'checkbox', tile_id: null },
];
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

let BASE;
async function req(method, p, body, cookie) {
  const headers = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  const r = await fetch(BASE + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const setCk = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* html */ }
  return { status: r.status, json, text, cookie: setCk.length ? setCk[0].split(';')[0] : cookie };
}
const state = (sid) => gym._state.sessions.get(sid);
const lastAttemptFor = (sid) => {
  const lines = fs.readFileSync(path.join(DATA_DIR, 'attempts.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  return lines.filter(a => a.session_id === sid).pop();
};
async function newSession(scenario, cookie, source = 'e2e') {
  // The suite tags its own traffic 'e2e' (v1.1) so it can never blend into a
  // live-agent baseline; T11 verifies the untagged default separately.
  const r = await req('POST', '/api/session', { scenario, source }, cookie);
  return { sid: r.json.session_id, cookie: r.cookie };
}
async function checkbox(sid, trace, signals, cookie) {
  return (await req('POST', `/api/session/${sid}/checkbox`, { event_trace: trace, client_signals: signals }, cookie)).json;
}

async function main() {
  const server = gym.start(0);
  await new Promise(r => server.on('listening', r));
  BASE = `http://127.0.0.1:${server.address().port}`;
  console.log('e2e against ' + BASE + ' (data: ' + DATA_DIR + ')');

  /* T0 — corpus validation (v1.1): every PNG in BOTH corpora must fully
   * decode (signature, CRCs, complete zlib stream, exact IHDR geometry).
   * This is the regression gate for the v1 "broken tile" hunt: a corrupt
   * asset can never ship again without failing here. */
  {
    const corpusRoot = path.join(__dirname, '..', 'corpus');
    const aMan = fs.readFileSync(path.join(corpusRoot, 'typeA', 'manifest.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    const bMan = fs.readFileSync(path.join(corpusRoot, 'typeB', 'manifest.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    let checked = 0, bad = 0;
    for (const m of aMan) { checked++; if (validatePNG(fs.readFileSync(path.join(corpusRoot, m.file))).length) bad++; }
    for (const m of bMan) for (const f of [m.file, m.mask]) { checked++; if (validatePNG(fs.readFileSync(path.join(corpusRoot, f))).length) bad++; }
    check('T0 every corpus PNG fully decodes (typeA tiles + typeB scenes/masks)', bad === 0, bad + ' bad of ' + checked);
    check('T0 Type B corpus meets SPEC §5.4 floor (≥300 scenes)', bMan.length >= 300, 'scenes=' + bMan.length);
    check('T0 Type B sliver-engineered scenes ≥40 (§5.4)', bMan.filter(m => m.sliver_engineered).length >= 40, 'slivers=' + bMan.filter(m => m.sliver_engineered).length);
    const perClassB = {};
    for (const m of bMan) for (const c of m.classes_present) perClassB[c] = (perClassB[c] || 0) + 1;
    const TRAIN14 = ['bicycle', 'bridge', 'bus', 'car', 'chimney', 'crosswalk', 'fire_hydrant', 'motorcycle', 'mountain', 'palm_tree', 'stairs', 'taxi', 'traffic_light', 'tractor'];
    check('T0 every train class appears in ≥25 Type B scenes (§5.4)', TRAIN14.every(c => (perClassB[c] || 0) >= 25), JSON.stringify(perClassB));
    const poolB = bMan.filter(m => m.split === 'train' || m.split === 'eval');
    check('T0 Type B play pool excludes holdout_final (§8.1)', poolB.length > 0 && poolB.every(m => m.split !== 'holdout_final') && bMan.some(m => m.split === 'holdout_final'));
  }

  /* T1 — scorer direction (SPEC §9.3): webdriver + no mouse = harder.
   * Assertions are BAND-level, not exact-type: serveType deliberately
   * mixes Type B into both natural bands (static band 50/50 with
   * typeA_static; dynamic bands 25% Type B / 75% typeA_dynamic — see
   * serveType + BUILD_NOTES "Natural-ladder Type B mix"), so the old
   * exact-type checks flaked on every Type B draw. Each case therefore
   * asserts (a) the draw-independent fact that the session's trust
   * lands in the expected band of its OWN jittered thresholds, and
   * (b) that the served type belongs to that band's documented
   * serve-set. A 40-iteration probe of these exact flows showed the
   * trust margins are wide (bad ≥19 pts below staticB, good ≥15 pts
   * above it, ordering ≥45 pts), so both layers are deterministic. */
  {
    const STATIC_BAND_TYPES = ['typeA_static', 'typeB'];   // serveType static band: 50/50
    const DYNAMIC_BAND_TYPES = ['typeA_dynamic', 'typeB']; // serveType dynamic bands: 75/25
    const bad = await newSession('natural');
    const badRes = await checkbox(bad.sid, [], BAD_SIGNALS, bad.cookie);
    const badTrust = state(bad.sid).trust;
    const badStaticB = state(bad.sid).thresholds.staticB;
    // warm a profile: browse the mock site first (F2 history), then session
    let ck = (await req('GET', '/')).cookie;
    await req('GET', '/about', null, ck); await req('GET', '/article', null, ck);
    const good = await newSession('natural', ck);
    const goodRes = await checkbox(good.sid, GOOD_TRACE, GOOD_SIGNALS, good.cookie);
    const goodTrust = state(good.sid).trust;
    const goodStaticB = state(good.sid).thresholds.staticB;
    check('T1 bad session is challenged', badRes.outcome === 'challenge');
    check('T1 bad session trust lands in a dynamic band (below its staticB threshold)', badTrust < badStaticB, `trust=${badTrust} staticB=${badStaticB}`);
    check('T1 bad session served a dynamic-band type (typeA_dynamic or typeB)', !!badRes.challenge && DYNAMIC_BAND_TYPES.includes(badRes.challenge.type), JSON.stringify(badRes).slice(0, 120));
    check('T1 good session trust reaches the static band (at or above its staticB threshold)', goodTrust >= goodStaticB, `trust=${goodTrust} staticB=${goodStaticB}`);
    check('T1 good session easier (pass or static-band type)', goodRes.outcome === 'pass' || (!!goodRes.challenge && STATIC_BAND_TYPES.includes(goodRes.challenge.type)), JSON.stringify(goodRes).slice(0, 120));
    check('T1 trust ordering good > bad', goodTrust > badTrust, `good=${goodTrust} bad=${badTrust}`);
  }

  /* T2 — token rules: single-use + 120s-equivalent expiry (SPEC §9.3).
   * Tokens are minted by completing a session. force_high_trust pins
   * trust at 90 but — like every force_* scenario — always issues its
   * challenge (T18), so the tokens here come from solving the served
   * static-band challenge exactly (trust 90 ≥ staticB always, so the
   * served type is typeA_static or typeB, both single-verify). A true
   * 0-target static draw is Skip-passed instead — see mintToken. */
  {
    const mintToken = async (s) => {
      const res = await checkbox(s.sid, GOOD_TRACE, GOOD_SIGNALS, s.cookie);
      if (res.outcome === 'pass') return res.token;
      const ch = state(s.sid).challenge;
      // A true 0-target static grid is passable ONLY via Skip (SPEC
      // §9.3; T4's contract): Verify-with-none is refused with
      // verify_instead_of_skip plus a fresh challenge and yields no
      // token. The old helper Verified anyway, so ~5% of mints returned
      // undefined and the expiry check below failed with reason
      // 'unknown' — a minting failure masquerading as an expiry one.
      if (ch.type === 'typeA_static' && !ch.entries.some(e => e.positive)) {
        const sk = (await req('POST', `/api/session/${s.sid}/skip`, { challenge_id: ch.id, event_trace: GOOD_TRACE }, s.cookie)).json;
        return sk.token;
      }
      const sel = ch.entries.filter(e => e.positive && !e.band).map(e => e.tile_id);
      const v = (await req('POST', `/api/session/${s.sid}/verify`, { challenge_id: ch.id, selected_tile_ids: sel, event_trace: GOOD_TRACE }, s.cookie)).json;
      return v.token;
    };
    const s1 = await newSession('force_high_trust');
    const t1 = await mintToken(s1);
    check('T2 high-trust session yields a token', !!t1);
    const v1 = (await req('POST', `/api/session/${s1.sid}/token/verify`, { token: t1 }, s1.cookie)).json;
    check('T2 token verifies once', v1.valid === true && v1.reason === 'ok');
    const v2 = (await req('POST', `/api/session/${s1.sid}/token/verify`, { token: t1 }, s1.cookie)).json;
    check('T2 token reuse rejected (replayed)', v2.valid === false && v2.reason === 'replayed');
    const s2 = await newSession('force_high_trust');
    const t2 = await mintToken(s2);
    check('T2 second high-trust session yields a token (expiry-check input)', !!t2);
    await sleep(1600); // > compressed TTL of 1500ms (production: 120s, SPEC §3.2)
    const v3 = (await req('POST', `/api/session/${s2.sid}/token/verify`, { token: t2 }, s2.cookie)).json;
    check('T2 expired token rejected', v3.valid === false && v3.reason === 'expired');
  }

  /* T3 — static: exact agent passes; screenshot stored.
   * Draw until the served grid has at least one SCORABLE (non-band)
   * positive — the same draw-loop style as T4/T5. A single force_static
   * draw has no scorable positive ~13.7% of the time (probe, n=300:
   * 8.3% zero-target per TARGET_DIST P(0)=10%, 5.3% positives-all-band):
   * the zero-target case made this block Verify an empty selection into
   * the verify_instead_of_skip refusal and FAIL, and the all-band case
   * made it "pass" with an empty selection, exercising nothing. With a
   * ≥1-non-band-positive grid the exact selection below is non-empty and
   * the pass is a real selection pass. Loop failure needs 80 consecutive
   * bad draws: 0.137^80 ≈ 0. */
  {
    let ctx = null;
    for (let i = 0; i < 80 && !ctx; i++) {
      const s = await newSession('force_static');
      const res = await checkbox(s.sid, [], BAD_SIGNALS, s.cookie);
      if (res.outcome !== 'challenge' || !res.challenge || res.challenge.type !== 'typeA_static') continue;
      const ch = state(s.sid).challenge;
      if (ch && ch.entries.some(e => e.positive && !e.band)) ctx = { s, res, ch };
    }
    check('T3 found a static grid with a scorable target', !!ctx);
    if (ctx) {
      const { s, res, ch } = ctx;
      check('T3 static challenge served', res.outcome === 'challenge' && res.challenge.type === 'typeA_static');
      const selected = ch.entries.filter(e => e.positive && !e.band).map(e => e.tile_id);
      const v = (await req('POST', `/api/session/${s.sid}/verify`, { challenge_id: ch.id, selected_tile_ids: selected, event_trace: GOOD_TRACE, screenshot: TINY_PNG }, s.cookie)).json;
      check('T3 exact static selection passes', v.result === 'pass' && !!v.token, JSON.stringify(v));
      const att = lastAttemptFor(s.sid);
      check('T3 attempt logged with screenshot path', !!att && att.screenshot === 'data/shots/' + att.attempt_id + '.png' && fs.existsSync(path.join(DATA_DIR, 'shots', att.attempt_id + '.png')));
    }
  }

  /* T4 — static 0-target grid: Skip passes, Verify logs procedure error */
  {
    let foundA = null, foundB = null;
    // Cap raised 80 → 240: finding TWO zero-target grids (p≈0.083–0.10
    // per draw) in 80 draws still misses ~0.2–0.8% of runs (binomial
    // tail); at 240 draws the miss is ~1e-7. Expected draws ≈ 24 either
    // way — the loop exits as soon as both are found.
    for (let i = 0; i < 240 && (!foundA || !foundB); i++) {
      const s = await newSession('force_static');
      const res = await checkbox(s.sid, [], BAD_SIGNALS, s.cookie);
      if (res.outcome !== 'challenge') continue;
      const ch = state(s.sid).challenge;
      if (ch.entries.some(e => e.positive)) continue;
      if (!foundA) foundA = { s, ch }; else foundB = { s, ch };
    }
    check('T4 found 0-target grids to test', !!foundA && !!foundB);
    if (foundA) {
      const v = (await req('POST', `/api/session/${foundA.s.sid}/verify`, { challenge_id: foundA.ch.id, selected_tile_ids: [], event_trace: [] }, foundA.s.cookie)).json;
      const att = lastAttemptFor(foundA.s.sid);
      check('T4 verify-with-none on 0-target grid fails', v.result !== 'pass');
      check('T4 verify_instead_of_skip logged', !!att && att.outcome.procedure_errors.includes('verify_instead_of_skip'), att && JSON.stringify(att.outcome.procedure_errors));
    }
    if (foundB) {
      const v = (await req('POST', `/api/session/${foundB.s.sid}/skip`, { challenge_id: foundB.ch.id, event_trace: [] }, foundB.s.cookie)).json;
      check('T4 skip on 0-target grid passes', v.result === 'pass' && !!v.token, JSON.stringify(v));
    }
  }

  /* T5 — dynamic: impatient agent fails with verify_too_early (SPEC §9.3) */
  {
    let ctx = null;
    for (let i = 0; i < 40 && !ctx; i++) {
      const s = await newSession('force_dynamic');
      const res = await checkbox(s.sid, [], BAD_SIGNALS, s.cookie);
      if (res.outcome !== 'challenge') continue;
      const ch = state(s.sid).challenge;
      if (ch.entries.some(e => e.positive)) ctx = { s, ch };
    }
    check('T5 found dynamic grid with a target', !!ctx);
    if (ctx) {
      const target = ctx.ch.entries.find(e => e.positive);
      const click = (await req('POST', `/api/session/${ctx.s.sid}/click`, { challenge_id: ctx.ch.id, tile_id: target.tile_id }, ctx.s.cookie)).json;
      check('T5 target click starts replacement', click.ok === true && click.action === 'replace');
      const gridState = state(ctx.s.sid).challenge.entries.map(e => e.tile_id);
      const v = (await req('POST', `/api/session/${ctx.s.sid}/verify`, { challenge_id: ctx.ch.id, selected_tile_ids: [], client_grid_state: gridState, event_trace: [] }, ctx.s.cookie)).json;
      const att = lastAttemptFor(ctx.s.sid);
      check('T5 verify during fade fails', v.result !== 'pass');
      check('T5 verify_too_early logged', !!att && att.outcome.procedure_errors.includes('verify_too_early'), att && JSON.stringify(att.outcome.procedure_errors));
    }
  }

  /* T6 — dynamic: stale tile click rejected without perception penalty */
  {
    let ctx = null;
    for (let i = 0; i < 40 && !ctx; i++) {
      const s = await newSession('force_dynamic');
      const res = await checkbox(s.sid, [], BAD_SIGNALS, s.cookie);
      if (res.outcome !== 'challenge') continue;
      const ch = state(s.sid).challenge;
      if (ch.entries.some(e => e.positive)) ctx = { s, ch };
    }
    if (ctx) {
      const target = ctx.ch.entries.find(e => e.positive);
      const oldId = target.tile_id;
      await req('POST', `/api/session/${ctx.s.sid}/click`, { challenge_id: ctx.ch.id, tile_id: oldId }, ctx.s.cookie);
      const stale = (await req('POST', `/api/session/${ctx.s.sid}/click`, { challenge_id: ctx.ch.id, tile_id: oldId }, ctx.s.cookie)).json;
      check('T6 stale tile rejected as stale_tile', stale.ok === false && stale.error === 'stale_tile', JSON.stringify(stale));
      check('T6 stale click counted on challenge', state(ctx.s.sid).challenge.stale_clicks >= 1);
    } else check('T6 found dynamic grid with a target', false);
  }

  /* T7 — dynamic: patient exact agent passes */
  {
    let done = false;
    for (let attemptNo = 0; attemptNo < 6 && !done; attemptNo++) {
      const s = await newSession('force_dynamic');
      const res = await checkbox(s.sid, [], BAD_SIGNALS, s.cookie);
      if (res.outcome !== 'challenge') continue;
      const ch = state(s.sid).challenge;
      // The server normalises tile state lazily (on the next request), so a
      // direct in-process read must apply the same effective-state rule.
      const effSettled = (e) => e.state === 'settled' || (e.state === 'replacing' && Date.now() >= e.ready_at);
      let guard = 0;
      while (guard++ < 80) {
        const cur = state(s.sid).challenge;
        if (!cur) break;
        const pos = cur.entries.find(e => e.positive && effSettled(e));
        if (!pos) {
          if (cur.entries.some(e => e.state === 'replacing' && Date.now() < e.ready_at)) { await sleep(300); continue; }
          break;
        }
        const click = (await req('POST', `/api/session/${s.sid}/click`, { challenge_id: cur.id, tile_id: pos.tile_id }, s.cookie)).json;
        if (!click.ok) break;
        await sleep((click.settle_ms || 1000) + 200);
      }
      const cur = state(s.sid).challenge;
      if (!cur || cur.entries.some(e => e.positive)) continue;
      const trace = [...GOOD_TRACE, { t: 9000, type: 'pointermove', x: 100, y: 100, target: 'tile:0', tile_id: null }, { t: 9500, type: 'click', x: 300, y: 400, target: 'verify', tile_id: null }];
      const v = (await req('POST', `/api/session/${s.sid}/verify`, { challenge_id: cur.id, selected_tile_ids: [], client_grid_state: cur.entries.map(e => e.tile_id), event_trace: trace }, s.cookie)).json;
      if (v.result === 'pass') done = true;
      else console.log('    (T7 retry: ' + JSON.stringify(v) + ')');
    }
    check('T7 patient dynamic agent passes', done);
  }

  /* T8 — challenge clock expires independently (SPEC §9.3) */
  {
    const s = await newSession('force_static');
    const res = await checkbox(s.sid, [], BAD_SIGNALS, s.cookie);
    const ch = state(s.sid).challenge;
    await sleep(20500); // > compressed challenge TTL 20000ms (production: 180s)
    const v = (await req('POST', `/api/session/${s.sid}/verify`, { challenge_id: ch.id, selected_tile_ids: [], event_trace: [] }, s.cookie)).json;
    check('T8 expired challenge rejected as challenge_expired', v.result === 'challenge_expired', JSON.stringify(v));
    check('T8 session returned to INIT', state(s.sid).state === 'INIT');
    const att = lastAttemptFor(s.sid);
    check('T8 challenge_expired logged as procedure error', !!att && att.outcome.procedure_errors.includes('challenge_expired'));
  }

  /* T9 — leak audit spot checks (SPEC §8.2) */
  {
    check('T9 manifest not served', (await req('GET', '/corpus/typeA/manifest.jsonl')).status === 404);
    check('T9 data dir not served', (await req('GET', '/data/attempts.jsonl')).status === 404);
    check('T9 SPEC not served', (await req('GET', '/SPEC.md')).status === 404);
    const s = await newSession('force_static');
    const res = await checkbox(s.sid, [], BAD_SIGNALS, s.cookie);
    const raw = JSON.stringify(res);
    const ch = state(s.sid).challenge;
    const uidLeak = ch.entries.some(e => raw.includes(e.tile_uid));
    check('T9 challenge response has no tile_uids / labels / trust', !uidLeak && !raw.includes('positive') && !raw.includes('trust') && !raw.includes('labels'));
    const img = await req('GET', res.challenge.tiles[0].src, null, s.cookie);
    check('T9 tile image serves as PNG', img.status === 200);
    const ir = await fetch(BASE + res.challenge.tiles[0].src);
    const ibuf = Buffer.from(await ir.arrayBuffer());
    check('T9 tile image carries Content-Length matching the body (v1.1 broken-tile fix)', ir.headers.get('content-length') === String(ibuf.length), 'header=' + ir.headers.get('content-length') + ' bytes=' + ibuf.length);
  }

  /* T10 — metrics endpoint + report generator (SPEC §9.3) */
  {
    const m = (await req('GET', '/api/admin/metrics')).json;
    check('T10 metrics endpoint returns three levels', !!m.levelA_risk_access && !!m.levelB_perception && !!m.levelC_behaviour);
    check('T10 metrics counted the test attempts', m.levelA_risk_access.rounds_served >= 6, 'rounds=' + m.levelA_risk_access.rounds_served);
    const out = execFileSync(process.execPath, [path.join(__dirname, 'report.js'), '--data', DATA_DIR], { encoding: 'utf8' });
    check('T10 report.js renders all three levels', out.includes('LEVEL A') && out.includes('LEVEL B') && out.includes('LEVEL C'));
    check('T10 report shows session pass rate + exact-board accuracy', out.includes('Session pass rate') && out.includes('Exact-board accuracy'));
    check('T10 report shows sliver recall line', out.includes('SLIVER'));
    const results = await req('GET', '/results');
    check('T10 /results page renders', results.status === 200 && results.text.includes('CAPTCHA Gym'));
  }

  /* T11 — session-source tagging (v1.1): tags flow end-to-end and
   * report/metrics filtering keeps test traffic out of the live baseline */
  {
    const s = await newSession('force_static');
    const res = await checkbox(s.sid, [], BAD_SIGNALS, s.cookie);
    const ch = state(s.sid).challenge;
    const sel = ch.entries.filter(e => e.positive && !e.band).map(e => e.tile_id);
    await req('POST', `/api/session/${s.sid}/verify`, { challenge_id: ch.id, selected_tile_ids: sel, event_trace: GOOD_TRACE }, s.cookie);
    check('T11 session carries its source tag', state(s.sid).source === 'e2e', state(s.sid).source);
    const att = lastAttemptFor(s.sid);
    check('T11 attempt log record carries source', !!att && att.source === 'e2e', att && att.source);
    const evLines = fs.readFileSync(path.join(DATA_DIR, 'sessions.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(e => e.session_id === s.sid);
    check('T11 session events carry source', evLines.length > 0 && evLines.every(e => e.source === 'e2e'));
    const mE2e = (await req('GET', '/api/admin/metrics?source=e2e')).json;
    const mLive = (await req('GET', '/api/admin/metrics?source=live-agent')).json;
    check('T11 metrics ?source=e2e counts the tagged traffic', mE2e.source_filter === 'e2e' && mE2e.levelA_risk_access.rounds_served >= 1, 'e2e rounds=' + mE2e.levelA_risk_access.rounds_served);
    check('T11 metrics ?source=live-agent excludes e2e traffic', mLive.levelA_risk_access.rounds_served === 0, 'live rounds=' + mLive.levelA_risk_access.rounds_served);
    const rDef = await req('POST', '/api/session', { scenario: 'force_high_trust' });
    check('T11 untagged session defaults to live-agent', state(rDef.json.session_id).source === 'live-agent', state(rDef.json.session_id).source);
    const outDef = execFileSync(process.execPath, [path.join(__dirname, 'report.js'), '--data', DATA_DIR], { encoding: 'utf8' });
    check('T11 report.js defaults to the live-agent filter', outDef.includes('source filter: live-agent') && outDef.includes('e2e'), outDef.split('\n').slice(0, 5).join(' | '));
    const outE2e = execFileSync(process.execPath, [path.join(__dirname, 'report.js'), '--data', DATA_DIR, '--source', 'e2e'], { encoding: 'utf8' });
    check('T11 report.js --source e2e renders the tagged slice', outE2e.includes('source filter: e2e') && !/Rounds served:\s+0\s/.test(outE2e));
  }

  /* T12 — Type B 4×4 sliced photo (SPEC §3.5, v1.1) */
  {
    // The pool mixes synthetic + real-photo scenes (Stage 3); T12 exercises
    // the synthetic slice path, T13 the photo path — draw until synthetic.
    let ctxB = null;
    for (let i = 0; i < 60 && !ctxB; i++) {
      const s = await newSession('force_type_b');
      const res = await checkbox(s.sid, [], BAD_SIGNALS, s.cookie);
      if (res.outcome === 'challenge' && res.challenge.type === 'typeB' && !state(s.sid).challenge.photo) ctxB = { s, res };
    }
    check('T12 force_type_b serves a real typeB challenge (not the v1 dynamic alias)', !!ctxB && ctxB.res.challenge.type === 'typeB', ctxB && JSON.stringify(ctxB.res).slice(0, 140));
    const { s, res } = ctxB;
    check('T12 typeB grid has 16 tiles', !!res.challenge && res.challenge.tiles.length === 16);
    check('T12 typeB instruction offers no Skip', !!res.challenge && !/Skip/.test(res.challenge.instruction), res.challenge && res.challenge.instruction);
    const ch = state(s.sid).challenge;
    const rawB = JSON.stringify(res);
    check('T12 typeB response leaks no scene/mask/uid/ground-truth data', !rawB.includes('scene') && !rawB.includes('mask') && !rawB.includes('positive') && !ch.entries.some(e => rawB.includes(e.tile_uid)));
    const tile0 = res.challenge.tiles[0];
    const r0 = await fetch(BASE + tile0.src);
    const tbuf = Buffer.from(await r0.arrayBuffer());
    check('T12 typeB tile served with Content-Length', r0.headers.get('content-length') === String(tbuf.length));
    const rec = gym._state.imgMap.get(tile0.src.slice(5));
    check('T12 served tile bytes equal the server-side scene slice', tbuf.equals(gym._png.sliceTilePNG(rec.file, rec.crop.index)));
    const dec = gym._png.decodePNG(tbuf);
    check('T12 served tile decodes to 120×120', dec.w === 120 && dec.h === 120, dec.w + 'x' + dec.h);
    const sk = (await req('POST', `/api/session/${s.sid}/skip`, { challenge_id: ch.id, event_trace: [] }, s.cookie)).json;
    check('T12 Skip is rejected for typeB', sk.error === 'skip_not_available', JSON.stringify(sk));
    const sel = ch.entries.filter(e => e.positive && !e.band).map(e => e.tile_id);
    const v = (await req('POST', `/api/session/${s.sid}/verify`, { challenge_id: ch.id, selected_tile_ids: sel, event_trace: GOOD_TRACE }, s.cookie)).json;
    check('T12 exact typeB selection passes', v.result === 'pass' && !!v.token, JSON.stringify(v));
    const att = lastAttemptFor(s.sid);
    check('T12 typeB attempt logged with type + source', !!att && att.challenge.type === 'typeB' && att.source === 'e2e');
    const s2 = await newSession('force_type_b');
    await checkbox(s2.sid, [], BAD_SIGNALS, s2.cookie);
    const ch2 = state(s2.sid).challenge;
    const v2 = (await req('POST', `/api/session/${s2.sid}/verify`, { challenge_id: ch2.id, selected_tile_ids: [], event_trace: [] }, s2.cookie)).json;
    check('T12 empty selection fails (typeB always has targets)', v2.result !== 'pass');
    const att2 = lastAttemptFor(s2.sid);
    check('T12 empty-selection failure records the missed tiles (fn>0), never verify_instead_of_skip', !!att2 && att2.outcome.fn > 0 && !att2.outcome.procedure_errors.includes('verify_instead_of_skip'), att2 && JSON.stringify(att2.outcome));
    check('T12 empty-selection failure is flagged empty_submission (instrumentation, not perception)', !!att2 && att2.outcome.procedure_errors.includes('empty_submission'), att2 && JSON.stringify(att2.outcome.procedure_errors));
    const m = (await req('GET', '/api/admin/metrics?source=e2e')).json;
    check('T12 metrics break Type B perception out separately (by_type)', !!m.levelB_perception.by_type.typeB && m.levelB_perception.by_type.typeB.attempts >= 2, JSON.stringify(m.levelB_perception.by_type));
    check('T12 type_mix counts typeB rounds', m.levelA_risk_access.type_mix.typeB >= 2, JSON.stringify(m.levelA_risk_access.type_mix));
    const out = execFileSync(process.execPath, [path.join(__dirname, 'report.js'), '--data', DATA_DIR, '--source', 'e2e'], { encoding: 'utf8' });
    check('T12 report TYPE B section renders with sliver line', out.includes('TYPE B — PERCEPTION') && out.includes('SLIVER'));
  }

  /* T13 — real-photo Type B transfer corpus (Stage 3, SPEC §5.1/§8.4) */
  {
    const corpusRoot = path.join(__dirname, '..', 'corpus');
    const pMan = fs.readFileSync(path.join(corpusRoot, 'typeB', 'manifest_photos.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    check('T13 photo corpus exists (≥100 scenes)', pMan.length >= 100, 'scenes=' + pMan.length);
    check('T13 every photo scene carries license provenance', pMan.every(m => m.source === 'coco' && m.licence && m.license_url && m.coco_id && m.split === 'eval'));
    check('T13 only permissive licenses admitted (no NC/ND)', pMan.every(m => /Attribution/.test(m.licence) && !/NonCommercial|NoDerivs/.test(m.licence)), JSON.stringify([...new Set(pMan.map(m => m.licence))]));
    let jpgBad = 0, maskBad = 0;
    for (const m of pMan) {
      const buf = fs.readFileSync(path.join(corpusRoot, m.file));
      if (buf[0] !== 0xFF || buf[1] !== 0xD8 || buf[buf.length - 2] !== 0xFF || buf[buf.length - 1] !== 0xD9) jpgBad++;
      if (validatePNG(fs.readFileSync(path.join(corpusRoot, m.mask))).length) maskBad++;
    }
    check('T13 every photo JPEG is structurally sound (SOI/EOI)', jpgBad === 0, jpgBad + ' bad');
    check('T13 every photo mask PNG fully decodes', maskBad === 0, maskBad + ' bad');
    // Serve path: draw force_type_b sessions until a photo challenge appears.
    let photoCtx = null;
    for (let i = 0; i < 60 && !photoCtx; i++) {
      const s = await newSession('force_type_b');
      const res = await checkbox(s.sid, [], BAD_SIGNALS, s.cookie);
      if (res.outcome === 'challenge' && state(s.sid).challenge.photo) photoCtx = { s, res };
    }
    check('T13 photo challenge is served by force_type_b', !!photoCtx);
    if (photoCtx) {
      const { s, res } = photoCtx;
      const ch = state(s.sid).challenge;
      check('T13 photo challenge carries aspect + 16 bg-sliced tiles sharing one image', Array.isArray(res.challenge.aspect) && res.challenge.tiles.length === 16 && res.challenge.tiles.every(t => t.bg) && new Set(res.challenge.tiles.map(t => t.src)).size === 1);
      const positions = new Set(res.challenge.tiles.map(t => t.bg.x + ',' + t.bg.y));
      check('T13 bg positions cover all 16 grid cells', positions.size === 16);
      const ir = await fetch(BASE + res.challenge.tiles[0].src);
      const ibuf = Buffer.from(await ir.arrayBuffer());
      const rec = gym._state.imgMap.get(res.challenge.tiles[0].src.slice(5));
      check('T13 photo serves as image/jpeg with Content-Length == file size', ir.headers.get('content-type') === 'image/jpeg' && ir.headers.get('content-length') === String(fs.statSync(rec.file).size) && ibuf.length === fs.statSync(rec.file).size);
      const rawP = JSON.stringify(res);
      check('T13 photo payload leaks no filename/license/ground truth', !rawP.includes('.jpg') && !rawP.includes('licence') && !rawP.includes('coco') && !rawP.includes('positive') && !ch.entries.some(e => rawP.includes(e.tile_uid)));
      const sel = ch.entries.filter(e => e.positive && !e.band).map(e => e.tile_id);
      const v = (await req('POST', `/api/session/${s.sid}/verify`, { challenge_id: ch.id, selected_tile_ids: sel, event_trace: GOOD_TRACE }, s.cookie)).json;
      check('T13 exact photo selection passes', v.result === 'pass' && !!v.token, JSON.stringify(v));
      const att = lastAttemptFor(s.sid);
      check('T13 photo attempt logged with corpus=photo', !!att && att.challenge.corpus === 'photo', att && att.challenge.corpus);
      const m = (await req('GET', '/api/admin/metrics?source=e2e')).json;
      check('T13 metrics corpus split counts photo attempts', m.levelB_perception.by_type.typeB.corpus.photo.attempts >= 1, JSON.stringify(m.levelB_perception.by_type.typeB.corpus));
    }
  }

  /* T14 — spectator dashboard (Stage 4): layered, source-filtered, no keys */
  {
    const dash = await req('GET', '/results?source=e2e');
    check('T14 dashboard renders with taxonomy + session list', dash.status === 200 && dash.text.includes('Failure taxonomy') && dash.text.includes('Sessions (newest first'));
    check('T14 dashboard scores the three layers separately', dash.text.includes('Acceptance:') && dash.text.includes('Visual:') && dash.text.includes('Procedural:'));
    check('T14 dashboard shows token outcomes', dash.text.includes('token minted') && dash.text.includes('token-check failures'));
    const lines = fs.readFileSync(path.join(DATA_DIR, 'attempts.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    // The leak check needs a REAL positive tile id, so use the first
    // logged attempt that HAS one — not lines[0]: the suite's first
    // attempt is T2's first mint, whose grid is a 0-target static draw
    // ~3–5% of runs (probe: 10/300; theory 50% static × P(0)=10%),
    // leaving positives_server_only empty and this check failing on
    // !!posId for draw reasons that have nothing to do with the
    // dashboard. An attempt with ≥1 positive is guaranteed to exist by
    // now (T3's accepted grid always has a scorable positive).
    const withPos = lines.find(a => (a.challenge.positives_server_only || []).length > 0);
    const aUid = withPos && withPos.challenge.tiles[0].tile_uid;
    const posId = withPos && withPos.challenge.positives_server_only[0];
    check('T14 dashboard exposes NO answer keys (tile uids / positive ids absent)', !!posId && !dash.text.includes(aUid) && !dash.text.includes(posId) && !dash.text.includes('positives_server_only'));
    const dashLive = await req('GET', '/results');
    check('T14 dashboard defaults to live-agent only', dashLive.status === 200 && dashLive.text.includes('<strong>live-agent</strong>'));
    const dashAll = await req('GET', '/results?source=all');
    check('T14 dashboard ?source=all renders', dashAll.status === 200 && dashAll.text.includes('<strong>all</strong>'));
  }

  /* T15 — FRONT-END click path (regression gate for the Type B selection
   * bug): every block above drives the API directly — which is exactly how
   * a dead front-end click handler shipped: the API was fine while real
   * Type B tile clicks never registered a selection (app.js routed Type B
   * into the dynamic /click path, whose rejection it silently ignored).
   * This block loads the REAL served page structure + the REAL /app.js
   * into a minimal DOM harness (Node vm, stdlib only), clicks the actual
   * tile buttons, and asserts the clicked selection reaches server
   * scoring intact — for BOTH Type B variants (server-sliced synthetic
   * tiles and CSS-sliced photo tiles). */
  {
    const vm = require('node:vm');
    class El {
      constructor(tag) {
        this.tagName = String(tag || 'div').toUpperCase();
        this.id = ''; this.children = []; this.parent = null;
        this.dataset = {}; this.style = {}; this._listeners = {};
        this._classes = new Set(); this.textContent = ''; this.hidden = false; this.disabled = false;
      }
      get className() { return [...this._classes].join(' '); }
      set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
      get classList() {
        const s = this._classes;
        return {
          add: (...cs) => cs.forEach(c => s.add(c)),
          remove: (...cs) => cs.forEach(c => s.delete(c)),
          toggle: (c, force) => { if (force === undefined) { if (s.has(c)) s.delete(c); else s.add(c); } else if (force) s.add(c); else s.delete(c); },
          contains: (c) => s.has(c),
        };
      }
      set innerHTML(v) { if (v === '') { for (const c of this.children) c.parent = null; this.children = []; } }
      get innerHTML() { return ''; }
      appendChild(ch) { ch.parent = this; this.children.push(ch); return ch; }
      addEventListener(t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); }
      querySelectorAll(sel) {
        const out = [];
        const match = (el) => sel.startsWith('.') ? el._classes.has(sel.slice(1)) : el.tagName === sel.toUpperCase();
        const walk = (el) => { for (const c of el.children) { if (match(c)) out.push(c); walk(c); } };
        walk(this); return out;
      }
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
      closest(sel) { let el = this; while (el) { if (sel === '[data-trace]' ? !!el.dataset.trace : sel.startsWith('.') && el._classes.has(sel.slice(1))) return el; el = el.parent; } return null; }
    }
    const domClick = async (el) => { for (const f of (el && el._listeners.click) || []) await f({ target: el, clientX: 0, clientY: 0 }); await sleep(15); };
    const waitFor = async (fn, timeoutMs = 10000) => { const t0 = Date.now(); for (;;) { let v = null; try { v = fn(); } catch { /* binding not ready yet */ } if (v) return v; if (Date.now() - t0 > timeoutMs) return null; await sleep(40); } };
    const appJsSource = await (await fetch(BASE + '/app.js')).text();
    const indexHtml = await (await fetch(BASE + '/')).text();
    const pageDefs = [];
    for (const m of indexHtml.matchAll(/<(\w+)([^>]*)>/g)) {
      const idM = /\bid="([^"]+)"/.exec(m[2]); if (!idM) continue;
      const dtM = /data-trace="([^"]+)"/.exec(m[2]);
      pageDefs.push({ tag: m[1], id: idM[1], trace: dtM ? dtM[1] : null });
    }
    check('T15 harness parsed the real page (widget ids present)', ['checkbox', 'grid', 'verifyBtn', 'skipBtn', 'tokenCheckBtn'].every(id => pageDefs.some(d => d.id === id)), pageDefs.map(d => d.id).join(','));
    async function loadGymPage(search) {
      const byId = new Map();
      for (const d of pageDefs) { const el = new El(d.tag); el.id = d.id; if (d.trace) el.dataset.trace = d.trace; byId.set(d.id, el); }
      const documentStub = {
        body: new El('body'),
        getElementById: (id) => byId.get(id) || null,
        createElement: (tag) => { const el = new El(tag); if (tag === 'canvas') el.getContext = () => null; return el; },
        addEventListener: () => {},
      };
      let cookie = '';
      const jarFetch = async (p, opts = {}) => {
        const headers = { ...(opts.headers || {}) };
        if (cookie) headers.cookie = cookie;
        const r = await fetch(BASE + p, { ...opts, headers });
        const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
        if (sc.length) cookie = sc[0].split(';')[0];
        return r;
      };
      await (await jarFetch('/')).text(); // a browser loads the page (profile cookie) before app.js runs
      const sandbox = {
        console, setTimeout, clearTimeout, setInterval, clearInterval, URLSearchParams, performance,
        navigator: { webdriver: false, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', platform: 'Linux x86_64', language: 'en-US', plugins: { length: 3 } },
        location: { search }, screen: { width: 1920, height: 1080 }, chrome: {}, scrollY: 0,
        Image: class { constructor() { this.onerror = null; } },
        fetch: jarFetch, document: documentStub, addEventListener: () => {},
      };
      sandbox.window = sandbox;
      const ctx = vm.createContext(sandbox);
      vm.runInContext(appJsSource, ctx, { filename: 'app.js' });
      const sid = await waitFor(() => vm.runInContext('sessionId', ctx));
      return { ctx, byId, sid };
    }
    const vmChallenge = (page) => { try { return vm.runInContext('currentChallenge', page.ctx); } catch { return null; } };
    let coveredSynthetic = false, coveredPhoto = false, emptyFlagChecked = false;
    for (let pageNo = 0; pageNo < 40 && !(coveredSynthetic && coveredPhoto); pageNo++) {
      const page = await loadGymPage('?scenario=force_type_b&source=e2e');
      if (!page.sid) { check('T15 front-end page init creates a session', false, 'page ' + pageNo); break; }
      await domClick(page.byId.get('checkbox'));
      const view0 = await waitFor(() => { const c = vmChallenge(page); return c && c.type === 'typeB' ? c : null; });
      if (!view0) continue;
      if (!emptyFlagChecked) {
        // Press Verify with nothing selected, through the real front end:
        // the board records the misses AND flags empty_submission, and the
        // failure taxonomy files the attempt under procedure — a broken
        // client can never again masquerade as a perception failure.
        const srvCh = state(page.sid).challenge;
        await domClick(page.byId.get('verifyBtn'));
        const attE = await waitFor(() => { const a = lastAttemptFor(page.sid); return a && a.challenge.id === srvCh.id ? a : null; });
        check('T15 front-end empty Verify is flagged empty_submission', !!attE && attE.outcome.procedure_errors.includes('empty_submission'), attE && JSON.stringify(attE.outcome.procedure_errors));
        const txOne = attE ? gym.aggregateMetrics([attE], [], null).taxonomy : null;
        check('T15 taxonomy files the empty submission under procedure, not perception', !!txOne && txOne.primary.procedure === 1 && txOne.primary.perception === 0, txOne && JSON.stringify(txOne.primary));
        emptyFlagChecked = true;
        await waitFor(() => { const c = vmChallenge(page); return c && c.challenge_id !== view0.challenge_id ? c : null; });
      }
      const srv = state(page.sid).challenge;
      if (!srv || srv.type !== 'typeB') continue;
      const isPhoto = !!srv.photo;
      if (isPhoto ? coveredPhoto : coveredSynthetic) continue;
      const variant = isPhoto ? 'photo' : 'synthetic';
      const grid = page.byId.get('grid');
      check('T15 front end rendered 16 Type B tiles (' + variant + ')', grid.children.length === 16, 'children=' + grid.children.length);
      const btnByTileId = new Map(grid.children.map(b => [b.dataset.tileId, b]));
      const clickIds = srv.entries.filter(e => e.positive).map(e => e.tile_id);
      // Toggle semantics, identical to Type A static: on → off → on.
      const firstBtn = btnByTileId.get(clickIds[0]);
      await domClick(firstBtn); const t1 = firstBtn.classList.contains('selected');
      await domClick(firstBtn); const t2 = firstBtn.classList.contains('selected');
      await domClick(firstBtn); const t3 = firstBtn.classList.contains('selected');
      check('T15 Type B tile toggles selected on/off/on (' + variant + ')', t1 === true && t2 === false && t3 === true, `on=${t1} off=${t2} on=${t3}`);
      for (const id of clickIds.slice(1)) await domClick(btnByTileId.get(id));
      check('T15 every clicked Type B tile shows the selected mark, others do not (' + variant + ')', srv.entries.every(e => btnByTileId.get(e.tile_id).classList.contains('selected') === e.positive));
      await domClick(page.byId.get('verifyBtn'));
      const att = await waitFor(() => { const a = lastAttemptFor(page.sid); return a && a.challenge.id === srv.id ? a : null; });
      check('T15 the clicked selection reached server scoring intact (' + variant + ')', !!att && JSON.stringify([...att.agent.selected].sort()) === JSON.stringify([...clickIds].sort()), att && JSON.stringify(att.agent.selected));
      check('T15 front-end Type B round passes — tp = non-band positives, fp/fn 0 (' + variant + ')', !!att && att.outcome.result === 'pass' && att.outcome.fp === 0 && att.outcome.fn === 0 && att.outcome.tp === srv.entries.filter(e => e.positive && !e.band).length, att && JSON.stringify(att.outcome));
      if (isPhoto) coveredPhoto = true; else coveredSynthetic = true;
    }
    check('T15 BOTH Type B variants played end-to-end through the real front end', coveredSynthetic && coveredPhoto, `synthetic=${coveredSynthetic} photo=${coveredPhoto}`);
  }

  /* T16 — force_type_b_photo scenario: Type B drawn ONLY from the
   * real-photo corpus, so a transfer batch can force photo scenes instead
   * of drawing the mixed pool and hoping (T13's draw-until-photo loop is
   * the workaround this scenario replaces). Plays one round through the
   * API exactly like T12/T13 and asserts the scored attempt's corpus.
   * (The empty-photo-corpus issuance failure is NOT covered here: the
   * pools are module-level and cannot be emptied in-process — that branch
   * is verified out-of-suite against a corpus copy; see BUILD_NOTES.) */
  {
    const s = await newSession('force_type_b_photo');
    const res = await checkbox(s.sid, [], BAD_SIGNALS, s.cookie);
    check('T16 force_type_b_photo serves a typeB challenge', res.outcome === 'challenge' && !!res.challenge && res.challenge.type === 'typeB', JSON.stringify(res).slice(0, 140));
    const ch = state(s.sid).challenge;
    check('T16 challenge scene is from the photo corpus (server-side)', !!ch && ch.photo === true && ch.corpus === 'photo');
    check('T16 photo grid has 16 bg-sliced tiles sharing one image', !!res.challenge && res.challenge.tiles.length === 16 && res.challenge.tiles.every(t => t.bg) && new Set(res.challenge.tiles.map(t => t.src)).size === 1);
    const rawPh = JSON.stringify(res);
    check('T16 payload leaks no filename/license/ground truth', !rawPh.includes('.jpg') && !rawPh.includes('licence') && !rawPh.includes('coco') && !rawPh.includes('positive') && !ch.entries.some(e => rawPh.includes(e.tile_uid)));
    const sel = ch.entries.filter(e => e.positive && !e.band).map(e => e.tile_id);
    const v = (await req('POST', `/api/session/${s.sid}/verify`, { challenge_id: ch.id, selected_tile_ids: sel, event_trace: GOOD_TRACE }, s.cookie)).json;
    check('T16 exact photo selection passes', v.result === 'pass' && !!v.token, JSON.stringify(v));
    const att = lastAttemptFor(s.sid);
    check('T16 scored attempt records challenge.corpus === photo', !!att && att.challenge.type === 'typeB' && att.challenge.corpus === 'photo', att && att.challenge.corpus);
    check('T16 attempt records the scenario', !!att && att.scenario === 'force_type_b_photo', att && att.scenario);
    const m = (await req('GET', '/api/admin/metrics?source=e2e')).json;
    check('T16 metrics corpus split counts the photo attempt', m.levelB_perception.by_type.typeB.corpus.photo.attempts >= 1, JSON.stringify(m.levelB_perception.by_type.typeB.corpus));
  }

  /* T17 — force_type_b_photo NEVER passes on the checkbox alone: the
   * scenario exists to measure photo play, but the entry gate used to
   * pass any session whose trust reached the pass band, so a high-trust
   * profile got a token with no grid ever served (observed live three
   * times in a row, starving a validation batch of scored attempts).
   * Repeat the exact starvation conditions — fresh profile, browsing
   * history warmed, best-case trace + signals — across several fresh
   * sessions, and assert every one is served a photo Type B challenge
   * instead, with entry scoring untouched (trust + explanation still
   * recorded). One session is played out so the scored attempt's corpus
   * is asserted under high-trust conditions too (T16 covers low-trust). */
  {
    const N = 5;
    let challenged = 0, photoTypeB = 0, scoredIntact = 0, skipMarked = 0, wouldHavePassed = 0;
    let playSid = null, playCookie = null;
    for (let i = 0; i < N; i++) {
      // warm a FRESH profile: land + browse the mock site (F2 history)
      let ck = (await req('GET', '/')).cookie;
      await req('GET', '/about', null, ck); await req('GET', '/article', null, ck);
      const s = await newSession('force_type_b_photo', ck);
      const res = await checkbox(s.sid, GOOD_TRACE, GOOD_SIGNALS, s.cookie);
      const st = state(s.sid);
      if (res.outcome === 'challenge' && !!res.challenge) challenged++;
      if (res.challenge && res.challenge.type === 'typeB' && st.challenge && st.challenge.photo === true && st.challenge.corpus === 'photo') photoTypeB++;
      if (typeof st.trust === 'number' && st.entry_explanation && st.entry_explanation.features) scoredIntact++;
      if (st.entry_explanation && Array.isArray(st.entry_explanation.override) && st.entry_explanation.override.some(o => o.includes('force_type_b_photo'))) skipMarked++;
      if (st.trust >= st.thresholds.pass) wouldHavePassed++;
      if (!playSid) { playSid = s.sid; playCookie = s.cookie; }
    }
    check(`T17 all ${N} fresh high-trust force_type_b_photo sessions are challenged (no checkbox-only pass)`, challenged === N, `challenged=${challenged}/${N}`);
    check('T17 every served challenge is a photo Type B', photoTypeB === N, `photoTypeB=${photoTypeB}/${N}`);
    check('T17 entry scoring untouched (trust + explanation recorded)', scoredIntact === N, `scoredIntact=${scoredIntact}/${N}`);
    check('T17 pass-skip recorded in the entry explanation override', skipMarked === N, `skipMarked=${skipMarked}/${N}`);
    console.log(`  info T17 ${wouldHavePassed}/${N} sessions had trust ≥ their pass band (would have checkbox-passed pre-fix)`);
    const ch = state(playSid).challenge;
    const sel = ch.entries.filter(e => e.positive && !e.band).map(e => e.tile_id);
    const v = (await req('POST', `/api/session/${playSid}/verify`, { challenge_id: ch.id, selected_tile_ids: sel, event_trace: GOOD_TRACE }, playCookie)).json;
    check('T17 high-trust photo round plays out and passes', v.result === 'pass' && !!v.token, JSON.stringify(v));
    const att = lastAttemptFor(playSid);
    check('T17 scored attempt records challenge.corpus === photo', !!att && att.challenge.type === 'typeB' && att.challenge.corpus === 'photo', att && att.challenge.corpus);
  }

  /* T18 — EVERY force_* scenario always issues its challenge (the T17
   * guarantee, generalized): a force_* scenario pins a challenge so a
   * specific skill can be exercised on demand, but the entry gate ran
   * first for all of them, so a high-trust profile could checkbox-pass
   * and the pinned challenge was never served. Under T17's starvation
   * conditions (fresh warmed profile, best-case trace + signals) every
   * force_* session must be challenged with its pinned type, entry
   * scoring untouched, and the skip recorded in the entry explanation's
   * override list. `natural` is the control: no force override, and the
   * checkbox-only pass must still be reachable there. */
  {
    const warmCookie = async () => {
      let ck = (await req('GET', '/')).cookie;
      await req('GET', '/about', null, ck); await req('GET', '/article', null, ck);
      return ck;
    };
    const forceSkip = (st, scenario) => !!(st.entry_explanation && Array.isArray(st.entry_explanation.override) && st.entry_explanation.override.some(o => o.includes('scenario ' + scenario + ' → challenge always issued')));
    const PINNED = { force_static: 'typeA_static', force_dynamic: 'typeA_dynamic', force_type_b: 'typeB' };
    for (const [scenario, pinnedType] of Object.entries(PINNED)) {
      const N = 3;
      let challenged = 0, typed = 0, scoredIntact = 0, skipMarked = 0;
      for (let i = 0; i < N; i++) {
        const s = await newSession(scenario, await warmCookie());
        const res = await checkbox(s.sid, GOOD_TRACE, GOOD_SIGNALS, s.cookie);
        const st = state(s.sid);
        if (res.outcome === 'challenge' && !!res.challenge) challenged++;
        if (res.challenge && res.challenge.type === pinnedType) typed++;
        if (typeof st.trust === 'number' && st.entry_explanation && st.entry_explanation.features) scoredIntact++;
        if (forceSkip(st, scenario)) skipMarked++;
      }
      check(`T18 all ${N} fresh high-trust ${scenario} sessions are challenged (no checkbox-only pass)`, challenged === N, `challenged=${challenged}/${N}`);
      check(`T18 ${scenario} serves its pinned type (${pinnedType})`, typed === N, `typed=${typed}/${N}`);
      check(`T18 ${scenario} entry scoring untouched (trust + explanation recorded)`, scoredIntact === N, `scoredIntact=${scoredIntact}/${N}`);
      check(`T18 ${scenario} pass-skip recorded in the entry explanation override`, skipMarked === N, `skipMarked=${skipMarked}/${N}`);
    }
    // force_high_trust: trust pinned to 90, always ≥ the pass band
    // (pass threshold ≤ 85), so pre-fix this checkbox-passed every time.
    {
      const s = await newSession('force_high_trust', await warmCookie());
      const res = await checkbox(s.sid, GOOD_TRACE, GOOD_SIGNALS, s.cookie);
      const st = state(s.sid);
      check('T18 force_high_trust is challenged despite trust ≥ pass band', res.outcome === 'challenge' && !!res.challenge, JSON.stringify(res).slice(0, 120));
      check('T18 force_high_trust challenge is a static-band type', !!res.challenge && (res.challenge.type === 'typeA_static' || res.challenge.type === 'typeB'), res.challenge && res.challenge.type);
      check('T18 force_high_trust still pins trust to 90 and records both overrides', st.trust === 90 && Array.isArray(st.entry_explanation.override) && st.entry_explanation.override.some(o => o.includes('trust set to 90')) && forceSkip(st, 'force_high_trust'), JSON.stringify(st.entry_explanation && st.entry_explanation.override));
    }
    // force_low_trust: trust pinned to 20 (challenged anyway) — the
    // guarantee shows up as the recorded skip in the override list.
    {
      const s = await newSession('force_low_trust', await warmCookie());
      const res = await checkbox(s.sid, GOOD_TRACE, GOOD_SIGNALS, s.cookie);
      const st = state(s.sid);
      check('T18 force_low_trust is challenged with trust pinned to 20', res.outcome === 'challenge' && !!res.challenge && st.trust === 20, `outcome=${res.outcome} trust=${st.trust}`);
      check('T18 force_low_trust pass-skip recorded in the entry explanation override', forceSkip(st, 'force_low_trust'), JSON.stringify(st.entry_explanation && st.entry_explanation.override));
    }
    // natural control: untouched by the force rule.
    {
      const N = 5;
      let passes = 0, forced = 0;
      for (let i = 0; i < N; i++) {
        const s = await newSession('natural', await warmCookie());
        const res = await checkbox(s.sid, GOOD_TRACE, GOOD_SIGNALS, s.cookie);
        const st = state(s.sid);
        if (res.outcome === 'pass') passes++;
        if (st.entry_explanation && Array.isArray(st.entry_explanation.override) && st.entry_explanation.override.some(o => o.includes('challenge always issued'))) forced++;
      }
      check('T18 natural records no force override', forced === 0, `forced=${forced}/${N}`);
      check('T18 natural at high trust may still checkbox-pass', passes >= 1, `passes=${passes}/${N}`);
    }
  }

  /* T19 — human baseline tagging (HUMAN_BASELINE.md): a `human-<name>`
   * source tag records end-to-end exactly like the known harness tags
   * (the server pins it to the session, so it covers every round without
   * the player re-adding it), and tools/compare_report.js turns the two
   * populations into the agent-vs-human table. The allowlist is
   * fail-closed: anything outside the known sources + `human-<name>`
   * pattern falls back to 'live-agent', so a typo or an injection-shaped
   * value can never mint a new population. The tag is a label only — it
   * must never appear in a creation or challenge payload. */
  {
    // (a) tagged human session: creation + events + attempt all carry it,
    //     and the tag never leaks into anything the client receives.
    const rCreate = await req('POST', '/api/session', { scenario: 'force_static', source: 'human-ben' });
    const sid = rCreate.json.session_id;
    check('T19 creation response does not echo the source tag', !JSON.stringify(rCreate.json).includes('human'), JSON.stringify(rCreate.json));
    check('T19 session carries the human-ben tag', state(sid).source === 'human-ben', state(sid).source);
    const res = await checkbox(sid, [], BAD_SIGNALS, rCreate.cookie);
    check('T19 challenge payload carries no source tag', !JSON.stringify(res).includes('human-ben'));
    const ch = state(sid).challenge;
    const sel = ch.entries.filter(e => e.positive && !e.band).map(e => e.tile_id);
    await req('POST', `/api/session/${sid}/verify`, { challenge_id: ch.id, selected_tile_ids: sel, event_trace: GOOD_TRACE }, rCreate.cookie);
    const att = lastAttemptFor(sid);
    check('T19 attempt log record carries human-ben', !!att && att.source === 'human-ben', att && att.source);
    const evLines = fs.readFileSync(path.join(DATA_DIR, 'sessions.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(e => e.session_id === sid);
    check('T19 session events carry human-ben', evLines.length > 0 && evLines.every(e => e.source === 'human-ben'));
    const mHuman = (await req('GET', '/api/admin/metrics?source=human-ben')).json;
    check('T19 metrics ?source=human-ben counts the tagged traffic', mHuman.levelA_risk_access.rounds_served >= 1, 'human rounds=' + mHuman.levelA_risk_access.rounds_served);

    // (b) allowlist: canonical case-folding accepted; everything outside
    //     the pattern falls back to 'live-agent'.
    const accepted = { 'HUMAN-BEN': 'human-ben', '  human-sara  ': 'human-sara', 'human-ben-2': 'human-ben-2', 'leak-audit': 'leak-audit', 'deploy-check': 'deploy-check' };
    for (const [raw, want] of Object.entries(accepted)) {
      const r = await req('POST', '/api/session', { scenario: 'natural', source: raw });
      check(`T19 source ${JSON.stringify(raw)} canonicalizes to ${want}`, state(r.json.session_id).source === want, state(r.json.session_id).source);
    }
    const rejected = ['human-', 'human_ben', 'not-a-source', 'human-ben!!', 'human--ben', 'human-ben"><script>alert(1)</script>', 'x'.repeat(64), 42, null];
    for (const raw of rejected) {
      const r = await req('POST', '/api/session', { scenario: 'natural', source: raw });
      check(`T19 source ${JSON.stringify(raw)} falls back to live-agent`, state(r.json.session_id).source === 'live-agent', state(r.json.session_id).source);
    }

    // (c) compare_report.js against a hand-computed fixture: every number
    //     below was computed by hand from these exact records (agent:
    //     3 sessions/2 tokens, one bug-era session + FN27 attempt and one
    //     e2e session that must both vanish; human: 2 sessions/1 token).
    const fx = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-cmp-'));
    const fA = [], fE = [];
    const fAtt = (ts, src, sid2, corpus, scored, tp2, fp2, fn2, ms, proc) => fA.push({ ts, source: src, session_id: sid2, run_id: 'run_fixture', challenge: { type: 'typeB', class: 'car', corpus }, outcome: { result: scored && fp2 === 0 && fn2 === 0 ? 'pass' : 'fail', scored, tp: tp2, fp: fp2, fn: fn2, procedure_errors: proc || [] }, timing: { challenge_ms: ms } });
    const fEv = (ts, src, sid2, event) => fE.push({ ts, source: src, session_id: sid2, event, run_id: 'run_fixture' });
    for (const s2 of ['ses_a1', 'ses_a2', 'ses_a3']) fEv('2026-10-11T09:59:00.000Z', 'live-agent', s2, 'session_created');
    fEv('2026-10-11T10:01:00.000Z', 'live-agent', 'ses_a1', 'passed'); fEv('2026-10-11T10:11:00.000Z', 'live-agent', 'ses_a2', 'passed');
    fAtt('2026-10-11T10:00:00.000Z', 'live-agent', 'ses_a1', 'photo', true, 3, 0, 0, 60000);
    fAtt('2026-10-11T10:05:00.000Z', 'live-agent', 'ses_a1', 'photo', true, 2, 1, 1, 30000);
    fAtt('2026-10-11T10:10:00.000Z', 'live-agent', 'ses_a2', 'synthetic', true, 4, 0, 0, 20000);
    fAtt('2026-10-11T10:15:00.000Z', 'live-agent', 'ses_a3', 'synthetic', false, 0, 0, 0, 180000, ['challenge_expired']);
    for (const s2 of ['ses_h1', 'ses_h2']) fEv('2026-10-11T10:59:00.000Z', 'human-ben', s2, 'session_created');
    fEv('2026-10-11T11:01:00.000Z', 'human-ben', 'ses_h1', 'passed');
    fAtt('2026-10-11T11:00:00.000Z', 'human-ben', 'ses_h1', 'photo', true, 5, 0, 1, 15000);
    fAtt('2026-10-11T11:05:00.000Z', 'human-ben', 'ses_h2', 'synthetic', true, 2, 2, 0, 10000);
    fEv('2026-10-11T11:59:00.000Z', 'e2e', 'ses_t1', 'session_created'); fEv('2026-10-11T12:01:00.000Z', 'e2e', 'ses_t1', 'passed');
    fAtt('2026-10-11T12:00:00.000Z', 'e2e', 'ses_t1', 'photo', true, 9, 9, 9, 5000);
    fEv('2026-10-10T18:47:00.000Z', 'live-agent', 'ses_b1', 'session_created'); fEv('2026-10-10T18:48:00.000Z', 'live-agent', 'ses_b1', 'passed');
    fAtt('2026-10-10T18:50:00.000Z', 'live-agent', 'ses_b1', 'synthetic', true, 0, 0, 27, 40000);
    fs.writeFileSync(path.join(fx, 'attempts.jsonl'), fA.map(x => JSON.stringify(x)).join('\n') + '\n');
    fs.writeFileSync(path.join(fx, 'sessions.jsonl'), fE.map(x => JSON.stringify(x)).join('\n') + '\n');
    const out = execFileSync(process.execPath, [path.join(__dirname, 'compare_report.js'), '--data', fx], { encoding: 'utf8' });
    const agentHalf = out.split('POPULATION human')[0];
    const humanHalf = 'POPULATION human' + out.split('POPULATION human')[1];
    check('T19 compare excludes the bug-era window and counts it in the header', out.includes('excluded by bug-era window (2026-10-10 18:46–18:54Z): 1 attempts · 2 events'));
    check('T19 compare agent overall matches the hand-computed fixture', agentHalf.includes('overall    sessions 3 · tokens 2 · scored attempts 3 · TP 9 · FP 1 · FN 1 · precision 0.900 · recall 0.900 · exact-board 66.7% · expiries 1 · median decision 30000ms'), agentHalf.split('\n').filter(l => l.includes('overall')).join(' | '));
    check('T19 compare agent photo row matches (attempt-scoped sessions*/tokens*)', agentHalf.includes('photo      sessions 1 · tokens 1 · scored attempts 2 · TP 5 · FP 1 · FN 1 · precision 0.833 · recall 0.833 · exact-board 50% · expiries 0 · median decision 60000ms'));
    check('T19 compare agent synthetic row matches (expiry counted, its time excluded from median)', agentHalf.includes('synthetic  sessions 2 · tokens 1 · scored attempts 1 · TP 4 · FP 0 · FN 0 · precision 1.000 · recall 1.000 · exact-board 100% · expiries 1 · median decision 20000ms'));
    check('T19 compare human overall matches the hand-computed fixture', humanHalf.includes('overall    sessions 2 · tokens 1 · scored attempts 2 · TP 7 · FP 2 · FN 1 · precision 0.778 · recall 0.875 · exact-board 0% · expiries 0 · median decision 15000ms'), humanHalf.split('\n').filter(l => l.includes('overall')).join(' | '));
    check('T19 compare human synthetic row matches', humanHalf.includes('synthetic  sessions 1 · tokens 0 · scored attempts 1 · TP 2 · FP 2 · FN 0 · precision 0.500 · recall 1.000 · exact-board 0% · expiries 0 · median decision 10000ms'));
    check('T19 compare keeps e2e traffic out of both populations', !agentHalf.includes('TP 18') && !humanHalf.includes('TP 16'));
    const outSelf = execFileSync(process.execPath, [path.join(__dirname, 'compare_report.js'), '--data', DATA_DIR], { encoding: 'utf8' });
    check('T19 compare runs on the suite data dir and renders both populations', outSelf.includes('POPULATION agent') && outSelf.includes('POPULATION human'));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  server.close();
  process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error('e2e crashed:', e); process.exit(2); });
