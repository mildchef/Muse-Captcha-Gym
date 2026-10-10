#!/usr/bin/env node
/*
 * report.js — CAPTCHA Gym baseline report (SPEC §7, §9.1 item 6).
 * Pure function of the JSONL logs: reads data/attempts.jsonl +
 * data/sessions.jsonl and prints a one-page report with all three metric
 * levels (A risk/access, B perception, C behaviour/procedure). The server
 * exposes the same aggregation at /api/admin/metrics.
 * Usage: node tools/report.js [--run <run_id>] [--data <dir>] [--source <tag|all>]
 * The source filter defaults to live-agent (v1.1 session-source tagging);
 * the header always prints the pre-filter census so nothing is hidden.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const DATA_DIR = opt('data') || process.env.GYM_DATA_DIR || path.join(__dirname, '..', 'data');
const runFilter = opt('run');
// Source filter (v1.1): DEFAULT is live-agent only, so builder e2e/smoke
// traffic never blends into the baseline again. --source all disables the
// filter; --source e2e|smoke|unknown inspects one traffic class.
const sourceOpt = opt('source');
const sourceFilter = sourceOpt === null ? 'live-agent' : (sourceOpt === 'all' ? null : sourceOpt);

function readJSONL(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
const pct = (n, d) => (d ? (Math.round((n / d) * 1000) / 10) + '%' : 'n/a');
const num = (x, d = 3) => (x === null || x === undefined ? 'n/a' : Number(x).toFixed(d));
function percentile(sorted, p) { return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null; }

let attempts = readJSONL(path.join(DATA_DIR, 'attempts.jsonl'));
let events = readJSONL(path.join(DATA_DIR, 'sessions.jsonl'));
if (runFilter) { attempts = attempts.filter(a => a.run_id === runFilter); events = events.filter(e => e.run_id === runFilter); }
const sourceCensus = {}; // attempts per source tag, BEFORE the source filter — nothing is hidden silently
for (const a of attempts) { const t = a.source || 'unknown'; sourceCensus[t] = (sourceCensus[t] || 0) + 1; }
if (sourceFilter) {
  const tag = (r) => r.source || 'unknown';
  attempts = attempts.filter(a => tag(a) === sourceFilter);
  events = events.filter(e => tag(e) === sourceFilter);
}

/* ---- Level A: risk / access ---- */
const created = events.filter(e => e.event === 'session_created');
const scoredEv = events.filter(e => e.event === 'checkbox_scored');
const passedEv = events.filter(e => e.event === 'passed');
const tokenEv = events.filter(e => e.event === 'token_verified');
const bySession = {};
for (const a of attempts) (bySession[a.session_id] = bySession[a.session_id] || []).push(a);
const sessionsWithFail = Object.values(bySession).filter(l => l.some(a => a.outcome.result === 'fail'));
const recovered = sessionsWithFail.filter(l => l.some(a => a.outcome.result === 'pass')).length;

/* ---- Level B: perception ---- */
const scoredAttempts = attempts.filter(a => a.outcome.scored);
const perClass = {};
let tp = 0, fp = 0, fn = 0, amb = 0, bandTiles = 0, allTiles = 0;
const posByBand = { whole: 0, partial: 0, sliver: 0 }, fnByBand = { whole: 0, partial: 0, sliver: 0 };
const perType = {}; // v1.1: perception sliced by challenge type — Type B reported separately (SPEC §7.2)
const typeBucket = (t) => perType[t] = perType[t] || { scored: 0, exact: 0, tp: 0, fp: 0, fn: 0, corpPhoto: 0, corpSynthetic: 0, posByBand: { whole: 0, partial: 0, sliver: 0 }, fnByBand: { whole: 0, partial: 0, sliver: 0 } };
for (const a of scoredAttempts) {
  const c = perClass[a.challenge.class] = perClass[a.challenge.class] || { tp: 0, fp: 0, fn: 0 };
  c.tp += a.outcome.tp || 0; c.fp += a.outcome.fp || 0; c.fn += a.outcome.fn || 0;
  tp += a.outcome.tp || 0; fp += a.outcome.fp || 0; fn += a.outcome.fn || 0;
  amb += a.outcome.ambiguity_errors || 0;
  const bk = typeBucket(a.challenge.type);
  bk.scored++; if (a.outcome.fp === 0 && a.outcome.fn === 0) bk.exact++;
  if (a.challenge.corpus === 'photo') bk.corpPhoto++; else bk.corpSynthetic++;
  bk.tp += a.outcome.tp || 0; bk.fp += a.outcome.fp || 0; bk.fn += a.outcome.fn || 0;
  for (const t of [...(a.challenge.tiles || []), ...(a.challenge.replacements || [])]) {
    allTiles++; if (t.band) bandTiles++;
    if (t.positive && posByBand[t.size_band] !== undefined) posByBand[t.size_band]++;
    if (t.positive && bk.posByBand[t.size_band] !== undefined) bk.posByBand[t.size_band]++;
  }
  for (const b of a.outcome.fn_bands || []) {
    if (fnByBand[b] !== undefined) fnByBand[b]++;
    if (bk.fnByBand[b] !== undefined) bk.fnByBand[b]++;
  }
}
const prec = tp + fp ? tp / (tp + fp) : null, rec = tp + fn ? tp / (tp + fn) : null;

/* ---- Level C: behaviour / procedure ---- */
const passedSessions = new Set(passedEv.map(e => e.session_id));
const sessionsWithAttempts = Object.keys(bySession).length;
const procCount = (code) => attempts.reduce((s, a) => s + (a.outcome.procedure_errors || []).filter(x => x === code).length, 0);
const dyn = attempts.filter(a => a.challenge.type === 'typeA_dynamic');
const stat = attempts.filter(a => a.challenge.type === 'typeA_static');
const typeB = attempts.filter(a => a.challenge.type === 'typeB');
const times = { typeA_static: [], typeA_dynamic: [], typeB: [] };
for (const a of attempts) if (a.timing && a.timing.challenge_ms != null && times[a.challenge.type]) times[a.challenge.type].push(a.timing.challenge_ms);
const dynPassed = dyn.filter(a => a.outcome.result === 'pass');

/* ---- Failure taxonomy (Stage 2): primary bucket per failed attempt ---- */
const TX = { failed: 0, perception: 0, procedure: 0, unscored: 0, both: 0, fnOnly: 0, fpOnly: 0, mixed: 0, byCode: {} };
for (const a of attempts) {
  if (a.outcome.result !== 'fail') continue;
  TX.failed++;
  const procs = a.outcome.procedure_errors || [];
  for (const c of procs) TX.byCode[c] = (TX.byCode[c] || 0) + 1;
  const hasProc = procs.length > 0;
  const hasPerc = !!a.outcome.scored && ((a.outcome.fp || 0) > 0 || (a.outcome.fn || 0) > 0);
  if (hasProc && hasPerc) TX.both++;
  if (hasProc) TX.procedure++;
  else if (hasPerc) {
    TX.perception++;
    if ((a.outcome.fp || 0) > 0 && (a.outcome.fn || 0) > 0) TX.mixed++;
    else if ((a.outcome.fn || 0) > 0) TX.fnOnly++; else TX.fpOnly++;
  } else TX.unscored++;
}
const sessionsFailedToPass = Object.keys(bySession).filter(id => !passedSessions.has(id)).length;

/* ---- print ---- */
const L = [];
L.push('════════════════════════════════════════════════════════════════');
L.push(`CAPTCHA GYM — BASELINE REPORT${runFilter ? '  (run ' + runFilter + ')' : ''}`);
L.push(`generated ${new Date().toISOString()} · gt_contract 1.0 · source: ${DATA_DIR}`);
L.push(`source filter: ${sourceFilter || 'all'} · attempts by source (pre-filter): ${Object.entries(sourceCensus).map(([k, v]) => k + ' ' + v).join(' · ') || 'none'}`);
L.push('════════════════════════════════════════════════════════════════');
L.push('');
L.push('LEVEL A — RISK / ACCESS');
L.push(`  Sessions created:            ${created.length}`);
L.push(`  Checkbox pass rate:          ${pct(scoredEv.filter(e => e.outcome === 'pass').length, scoredEv.length)}  (${scoredEv.length} evaluations)`);
L.push(`  Rounds served:               ${attempts.length}  (static ${stat.length} / dynamic ${dyn.length} / typeB ${typeB.length})`);
L.push(`  Tokens minted:               ${passedEv.length}`);
L.push(`  Token checks — ok/expired/replayed/unknown: ${tokenEv.filter(e => e.valid).length}/${tokenEv.filter(e => e.reason === 'expired').length}/${tokenEv.filter(e => e.reason === 'replayed').length}/${tokenEv.filter(e => e.reason === 'unknown').length}`);
L.push(`  Cooldowns:                   ${events.filter(e => e.event === 'cooldown').length}`);
L.push(`  Recovery after a failed round: ${pct(recovered, sessionsWithFail.length)}`);
L.push('');
L.push('LEVEL B — PERCEPTION (non-band tiles; FP and FN always separate)');
L.push(`  Per-tile totals:             TP ${tp} · FP ${fp} · FN ${fn}`);
L.push(`  Precision / recall / F1:     ${num(prec)} / ${num(rec)} / ${prec && rec ? num(2 * prec * rec / (prec + rec)) : 'n/a'}`);
L.push(`  Exact-board accuracy:        ${pct(scoredAttempts.filter(a => a.outcome.fp === 0 && a.outcome.fn === 0).length, scoredAttempts.length)}  (per-challenge; compare session rate below)`);
L.push(`  Recall by size band — whole: ${posByBand.whole ? num(1 - fnByBand.whole / posByBand.whole) : 'n/a'} · partial: ${posByBand.partial ? num(1 - fnByBand.partial / posByBand.partial) : 'n/a'} · SLIVER: ${posByBand.sliver ? num(1 - fnByBand.sliver / posByBand.sliver) : 'n/a'}`);
L.push(`  Ambiguity-band errors:       ${amb}  (reported separately, never in P/R — SPEC §4.4)`);
L.push(`  Band-tile share of corpus served: ${pct(bandTiles, allTiles)}`);
L.push('  Per class (P / R):');
for (const [cls, v] of Object.entries(perClass).sort())
  L.push(`    ${cls.padEnd(15)} ${num(v.tp + v.fp ? v.tp / (v.tp + v.fp) : null, 2)} / ${num(v.tp + v.fn ? v.tp / (v.tp + v.fn) : null, 2)}   (tp ${v.tp}, fp ${v.fp}, fn ${v.fn})`);
L.push('');
L.push('TYPE B — PERCEPTION (4×4 sliced scenes, broken out separately)');
{
  const bt = perType['typeB'];
  if (!bt || !bt.scored) L.push('  No scored Type B attempts in this slice.');
  else {
    const bp = bt.tp + bt.fp ? bt.tp / (bt.tp + bt.fp) : null, br = bt.tp + bt.fn ? bt.tp / (bt.tp + bt.fn) : null;
    L.push(`  Scored attempts:             ${bt.scored}`);
    L.push(`  Per-tile totals:             TP ${bt.tp} · FP ${bt.fp} · FN ${bt.fn}`);
    L.push(`  Precision / recall / F1:     ${num(bp)} / ${num(br)} / ${bp && br ? num(2 * bp * br / (bp + br)) : 'n/a'}`);
    L.push(`  Exact-board accuracy:        ${pct(bt.exact, bt.scored)}`);
    L.push(`  Recall by size band — whole: ${bt.posByBand.whole ? num(1 - bt.fnByBand.whole / bt.posByBand.whole) : 'n/a'} · partial: ${bt.posByBand.partial ? num(1 - bt.fnByBand.partial / bt.posByBand.partial) : 'n/a'} · SLIVER: ${bt.posByBand.sliver ? num(1 - bt.fnByBand.sliver / bt.posByBand.sliver) : 'n/a'}`);
    L.push(`  Corpus split — synthetic: ${bt.corpSynthetic} attempts · real-photo (transfer): ${bt.corpPhoto} attempts`);
  }
}
L.push('');
L.push('LEVEL C — BEHAVIOUR / PROCEDURE');
L.push(`  Session pass rate:           ${pct([...passedSessions].filter(id => bySession[id]).length, sessionsWithAttempts)}  (${sessionsWithAttempts} sessions with attempts)`);
L.push(`  First-attempt pass rate:     ${pct(Object.values(bySession).filter(l => l[0].outcome.result === 'pass').length, sessionsWithAttempts)}`);
L.push(`  Completion — static: ${pct(stat.filter(a => a.outcome.result === 'pass').length, stat.length)} · dynamic: ${pct(dyn.filter(a => a.outcome.result === 'pass').length, dyn.length)} · typeB: ${pct(typeB.filter(a => a.outcome.result === 'pass').length, typeB.length)}`);
L.push(`  Dynamic mean replacements per pass: ${dynPassed.length ? (dynPassed.reduce((s, a) => s + (a.challenge.replacements || []).length, 0) / dynPassed.length).toFixed(1) : 'n/a'}`);
L.push('  Procedure errors:');
L.push(`    verify_too_early:          ${procCount('verify_too_early')}  (${pct(procCount('verify_too_early'), dyn.length)} of dynamic attempts)`);
L.push(`    verify_instead_of_skip:    ${procCount('verify_instead_of_skip')}  (${pct(procCount('verify_instead_of_skip'), stat.length)} of static attempts)`);
L.push(`    empty_submission:          ${procCount('empty_submission')}  (all-empty Verify vs a grid with positives — client/instrumentation signature, counted as procedure, never perception)`);
L.push(`    stale_tile_clicks:         ${attempts.reduce((s, a) => s + (a.outcome.stale_clicks || 0), 0)}`);
L.push(`    challenge_expired:         ${procCount('challenge_expired')}`);
L.push(`    token_expired checks:      ${tokenEv.filter(e => e.reason === 'expired').length}`);
for (const t of ['typeA_static', 'typeA_dynamic', 'typeB']) {
  const s = times[t].slice().sort((a, b) => a - b);
  L.push(`  Decision time ${t.replace('typeA_', '')}: p50 ${percentile(s, 0.5) ?? 'n/a'}ms · p90 ${percentile(s, 0.9) ?? 'n/a'}ms · in plausible band (3–30s): ${pct(times[t].filter(ms => ms >= 3000 && ms <= 30000).length, times[t].length)}`);
}
L.push('');
L.push('FAILURE TAXONOMY — WHERE FAILURES LIVE (primary bucket per failed attempt)');
L.push(`  Failed attempts:             ${TX.failed} of ${attempts.length} rounds`);
L.push(`    perception (tile errors):  ${TX.perception}  — FN-only ${TX.fnOnly} · FP-only ${TX.fpOnly} · mixed ${TX.mixed}`);
L.push(`    procedure (protocol):      ${TX.procedure}${TX.both ? `  (incl. ${TX.both} that also had tile errors)` : ''}`);
for (const [code, n] of Object.entries(TX.byCode).sort()) L.push(`      ${code}: ${n}`);
L.push(`    unscored (neither):        ${TX.unscored}`);
L.push('  Server-acceptance layer (session level):');
L.push(`    Sessions that never passed: ${sessionsFailedToPass} of ${sessionsWithAttempts} with attempts · cooldown events: ${events.filter(e => e.event === 'cooldown').length}`);
L.push(`    Token-check failures:       ${tokenEv.filter(e => !e.valid).length} (expired ${tokenEv.filter(e => e.reason === 'expired').length} · replayed ${tokenEv.filter(e => e.reason === 'replayed').length} · unknown ${tokenEv.filter(e => e.reason === 'unknown').length})`);
L.push('');
L.push('Reminder (SPEC §1): gym scores measure gym performance. Production');
L.push('outcomes in the CAPTCHA failure log (~/TOOLS.md) outrank these numbers.');
console.log(L.join('\n'));
