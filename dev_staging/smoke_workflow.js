#!/usr/bin/env node
/*
 * smoke_workflow.js — end-to-end smoke test for the STAGED
 * workflow_cadence scenario (dev_staging only; never run against the
 * live server). Starts the staged server copy on port 8932 against the
 * COPIED data directory (dev_staging/data — a disposable snapshot of
 * the live logs), then plays the scenario through the public API:
 *
 *   Session 1 (happy path): checkbox must issue a challenge (never a
 *   checkbox-only pass); solve CADENCE_ROUNDS dynamic rounds back to
 *   back, asserting that (a) every round's prompt differs from the
 *   previous round's, (b) intermediate passes return pass+new_challenge
 *   with NO token, (c) only the final pass returns a token, and the
 *   token verifies. The copied attempts log must show one attempt per
 *   round, scenario workflow_cadence, with cadence stamps.
 *   Session 2 (failure path): deliberately select a negative tile in
 *   round 1 and verify — the round must fail, a fresh challenge with a
 *   DIFFERENT prompt must be served, and the cadence stamp must show
 *   the session is still on workflow_step 1 (a fail does not advance
 *   the workflow).
 *
 * Ground truth is read in-process via gym._state (the same harness the
 * e2e suite uses); nothing here is ever exposed over HTTP.
 * Exit code 0 = all checks pass.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

process.env.GYM_DATA_DIR = path.join(__dirname, 'data');
process.env.GYM_RUN_ID = 'run_smoke_workflow';
const gym = require('./server.js');
const DATA_DIR = process.env.GYM_DATA_DIR;
const PORT = 8932;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

const GOOD_SIGNALS = { webdriver: false, ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', platform: 'Linux x86_64', language: 'en-US', plugins: 3, has_chrome: true, webgl_renderer: 'Mesa Intel UHD', screen: [1920, 1080], timezone: 'America/Los_Angeles' };
const GOOD_TRACE = [
  { t: 120, type: 'focus', x: 0, y: 0, target: 'other', tile_id: null },
  { t: 900, type: 'pointermove', x: 60, y: 80, target: 'other', tile_id: null },
  { t: 2100, type: 'pointermove', x: 170, y: 210, target: 'other', tile_id: null },
  { t: 2500, type: 'pointerdown', x: 180, y: 220, target: 'checkbox', tile_id: null },
  { t: 2560, type: 'click', x: 180, y: 220, target: 'checkbox', tile_id: null },
];

async function req(method, p, body, cookie) {
  const headers = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  const r = await fetch(BASE + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const setCk = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* html */ }
  return { status: r.status, json, cookie: setCk.length ? setCk[0].split(';')[0] : cookie };
}
const state = (sid) => gym._state.sessions.get(sid);
const effSettled = (e) => e.state === 'settled' || (e.state === 'replacing' && Date.now() >= e.ready_at);

/* Solve the session's current dynamic challenge via the API, reading
 * ground truth in-process (e2e harness pattern). Returns the verify
 * response. */
async function solveCurrentRound(s) {
  let guard = 0;
  while (guard++ < 120) {
    const cur = state(s.sid).challenge;
    if (!cur) throw new Error('no active challenge while solving');
    const pos = cur.entries.find(e => e.positive && effSettled(e));
    if (!pos) {
      if (cur.entries.some(e => e.state === 'replacing' && Date.now() < e.ready_at)) { await sleep(300); continue; }
      break;
    }
    const click = (await req('POST', `/api/session/${s.sid}/click`, { challenge_id: cur.id, tile_id: pos.tile_id }, s.cookie)).json;
    if (!click.ok) throw new Error('click failed: ' + JSON.stringify(click));
    await sleep((click.settle_ms || 1000) + 250);
  }
  const cur = state(s.sid).challenge;
  if (cur.entries.some(e => e.positive)) throw new Error('positives remain after solve loop');
  const elapsed = Date.now() - cur.served_at;
  const trace = [...GOOD_TRACE,
    { t: elapsed + 400, type: 'pointermove', x: 100, y: 100, target: 'tile:0', tile_id: null },
    { t: elapsed + 900, type: 'click', x: 300, y: 400, target: 'verify', tile_id: null }];
  return (await req('POST', `/api/session/${s.sid}/verify`, { challenge_id: cur.id, selected_tile_ids: [], client_grid_state: cur.entries.map(e => e.tile_id), event_trace: trace }, s.cookie)).json;
}

async function main() {
  const server = gym.start(PORT);
  await new Promise(r => server.on('listening', r));
  console.log(`staged server on :${PORT}, data dir ${DATA_DIR}`);
  try {
    /* ---- Session 1: happy path, full workflow ---- */
    console.log('Session 1 — full workflow:');
    const r1 = await req('POST', '/api/session', { scenario: 'workflow_cadence', source: 'smoke' });
    const s1 = { sid: r1.json.session_id, cookie: r1.cookie };
    check('session created', !!s1.sid);
    const ck = (await req('POST', `/api/session/${s1.sid}/checkbox`, { event_trace: GOOD_TRACE, client_signals: GOOD_SIGNALS }, s1.cookie)).json;
    check('checkbox issues a challenge (no checkbox-only exit)', ck.outcome === 'challenge', JSON.stringify(ck).slice(0, 160));
    check('first challenge is dynamic Type A', state(s1.sid).challenge && state(s1.sid).challenge.type === 'typeA_dynamic');

    const prompts = [];
    let token = null;
    const roundsRequired = state(s1.sid).cadence.rounds_required;
    for (let round = 1; round <= roundsRequired; round++) {
      const ch = state(s1.sid).challenge;
      prompts.push(ch.target_class);
      const v = await solveCurrentRound(s1);
      if (round < roundsRequired) {
        check(`round ${round} pass returns next challenge, no token`, v.result === 'pass' && !!v.new_challenge && !v.token, JSON.stringify(v).slice(0, 160));
        check(`round ${round} cadence stamp in response`, !!v.cadence && v.cadence.rounds_passed === round && v.cadence.complete === false, JSON.stringify(v.cadence));
      } else {
        check(`final round (${round}) pass returns a token`, v.result === 'pass' && typeof v.token === 'string', JSON.stringify(v).slice(0, 160));
        token = v.token;
      }
    }
    check('prompt switches every round (no consecutive repeat)', prompts.every((p, i) => i === 0 || p !== prompts[i - 1]), prompts.join(' -> '));
    check('at least 2 distinct prompts across the workflow', new Set(prompts).size >= 2, prompts.join(','));
    console.log('       prompts: ' + prompts.join(' → '));
    const tv = (await req('POST', `/api/session/${s1.sid}/token/verify`, { token }, s1.cookie)).json;
    check('minted token verifies', tv.valid === true, JSON.stringify(tv));

    /* ---- Session 2: failure keeps the workflow on step 1 ---- */
    console.log('Session 2 — failed round does not advance the workflow:');
    const r2 = await req('POST', '/api/session', { scenario: 'workflow_cadence', source: 'smoke' });
    const s2 = { sid: r2.json.session_id, cookie: r2.cookie };
    await req('POST', `/api/session/${s2.sid}/checkbox`, { event_trace: GOOD_TRACE, client_signals: GOOD_SIGNALS }, s2.cookie);
    const chA = state(s2.sid).challenge;
    const neg = chA.entries.find(e => !e.positive);
    const clk = (await req('POST', `/api/session/${s2.sid}/click`, { challenge_id: chA.id, tile_id: neg.tile_id }, s2.cookie)).json;
    check('negative tile click registers as a selection', clk.ok && clk.action === 'selected', JSON.stringify(clk));
    const elapsed = Date.now() - chA.served_at;
    const vBad = (await req('POST', `/api/session/${s2.sid}/verify`, { challenge_id: chA.id, selected_tile_ids: [neg.tile_id], client_grid_state: chA.entries.map(e => e.tile_id), event_trace: [...GOOD_TRACE, { t: elapsed + 900, type: 'click', x: 300, y: 400, target: 'verify', tile_id: null }] }, s2.cookie)).json;
    check('wrong selection fails the round (retry, no token)', vBad.result === 'retry' && !!vBad.new_challenge && !vBad.token, JSON.stringify(vBad).slice(0, 160));
    const chB = state(s2.sid).challenge;
    check('retry serves a fresh challenge with a switched prompt', !!chB && chB.id !== chA.id && chB.target_class !== chA.target_class, `${chA.target_class} -> ${chB && chB.target_class}`);

    /* ---- Log evidence in the COPIED data dir ---- */
    console.log('Log evidence (copied data dir):');
    const attempts = fs.readFileSync(path.join(DATA_DIR, 'attempts.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
      .filter(a => a.run_id === 'run_smoke_workflow');
    const a1 = attempts.filter(a => a.session_id === s1.sid);
    check(`session 1 logged ${roundsRequired} scored pass attempts`, a1.length === roundsRequired && a1.every(a => a.outcome.result === 'pass'), `got ${a1.length}`);
    check('session 1 attempts carry cadence stamps (steps 1..N, prompts match play)', a1.every((a, i) => a.cadence && a.cadence.workflow_step === i + 1 && a.cadence.prompt === prompts[i]),
      JSON.stringify(a1.map(a => a.cadence)));
    const a2 = attempts.filter(a => a.session_id === s2.sid);
    check('session 2 failed attempt stamped workflow_step 1', a2.length === 1 && a2[0].cadence && a2[0].cadence.workflow_step === 1 && a2[0].outcome.result !== 'pass', JSON.stringify(a2.map(a => a.cadence)));
    const events = fs.readFileSync(path.join(DATA_DIR, 'sessions.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
      .filter(e => e.run_id === 'run_smoke_workflow' && e.session_id === s1.sid);
    check('cadence_round_passed events logged for intermediate rounds', events.filter(e => e.event === 'cadence_round_passed').length === roundsRequired - 1,
      events.map(e => e.event).join(','));
    check('cadence_complete event logged once', events.filter(e => e.event === 'cadence_complete').length === 1);
  } finally {
    server.close();
  }
  console.log(`\nSMOKE RESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error('smoke crashed:', e); process.exit(1); });
