#!/usr/bin/env node
/*
 * compare_report.js — CAPTCHA Gym agent-vs-human comparison (HUMAN_BASELINE.md).
 *
 * Why a separate tool instead of a --mode on report.js: report.js is the
 * single-population baseline report — it slices ONE source through a
 * filter and its header/output contract is asserted by e2e (T11) and
 * quoted in TRAINING_LOG.md. The publication comparison is a different
 * shape: TWO populations side by side, population definitions (not exact
 * tags), and an exclusion window (the quarantined bug era) that must never
 * leak into the baseline numbers. Keeping the tools separate means
 * neither contract can contaminate the other.
 *
 * Populations (HARD separation rules — population is by source tag only):
 *   agent = source exactly 'live-agent'
 *   human = source starting with 'human-' (set via the tagged link,
 *           ?source=human-ben — see server.js sanitizeSource)
 * Every other source (e2e, smoke, deploy-check, leak-audit, unknown) is
 * test/operator traffic and belongs to NEITHER population. Records in the
 * quarantined bug-era window 2026-10-10 18:46:00Z–18:54:00Z (a client bug
 * submitted empty Type B selections; instrumentation-invalid, see
 * BUILD_NOTES) are excluded from BOTH populations and counted in the
 * header. The unattributed 2026-10-10 ~19:52Z walk-in session is
 * untagged 'live-agent' traffic: it stays in the agent pool's history
 * exactly as documented in TRAINING_LOG.md and is NEVER relabeled human.
 *
 * Usage: node tools/compare_report.js [--data <dir>] [--run <run_id>]
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const DATA_DIR = opt('data') || process.env.GYM_DATA_DIR || path.join(__dirname, '..', 'data');
const runFilter = opt('run');

const BUG_ERA_START = '2026-10-10T18:46:00.000Z', BUG_ERA_END = '2026-10-10T18:54:00.000Z';
const inBugEra = (r) => r.ts >= BUG_ERA_START && r.ts < BUG_ERA_END;

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

const tag = (r) => r.source || 'unknown';
const sourceCensus = {};
for (const a of attempts) sourceCensus[tag(a)] = (sourceCensus[tag(a)] || 0) + 1;
const bugAttempts = attempts.filter(inBugEra).length;
const bugEvents = events.filter(inBugEra).length;
attempts = attempts.filter(a => !inBugEra(a));
events = events.filter(e => !inBugEra(e));

const POPULATIONS = [
  { key: 'agent', label: "source 'live-agent'", pred: (t) => t === 'live-agent' },
  { key: 'human', label: "source 'human-*'", pred: (t) => t.startsWith('human-') },
];

/* One population slice → its metric row set. sessions/tokens come from the
 * session-event log; everything else from attempt records. */
function popStats(pa, pe) {
  const scored = pa.filter(a => a.outcome && a.outcome.scored);
  let tp = 0, fp = 0, fn = 0;
  for (const a of scored) { tp += a.outcome.tp || 0; fp += a.outcome.fp || 0; fn += a.outcome.fn || 0; }
  const exact = scored.filter(a => (a.outcome.fp || 0) === 0 && (a.outcome.fn || 0) === 0).length;
  const expiries = pa.filter(a => (a.outcome.procedure_errors || []).includes('challenge_expired')).length;
  // Median per-round decision time: challenge issuance → submission, over
  // submitted rounds. Expired rounds are excluded — their recorded time
  // is the challenge clock running out, not a decision.
  const times = pa.filter(a => a.timing && a.timing.challenge_ms != null && !(a.outcome.procedure_errors || []).includes('challenge_expired'))
    .map(a => a.timing.challenge_ms).sort((x, y) => x - y);
  return {
    sessions: pe.filter(e => e.event === 'session_created').length,
    tokens: pe.filter(e => e.event === 'passed').length,
    scored: scored.length, tp, fp, fn,
    precision: tp + fp ? tp / (tp + fp) : null,
    recall: tp + fn ? tp / (tp + fn) : null,
    exact, expiries,
    medianMs: percentile(times, 0.5),
  };
}
/* Per-corpus rows are attempt-scoped: their sessions/tokens count the
 * distinct sessions that served ≥1 attempt of that corpus (and how many
 * of those passed). A session can appear in both corpora, so the rows do
 * not sum to the overall row — the overall row is the session-log truth. */
function corpusStats(pa, pe) {
  const s = popStats(pa, []); // attempt-side metrics only; session fields set below
  const passedIds = new Set(pe.filter(e => e.event === 'passed').map(e => e.session_id));
  const ids = new Set(pa.map(a => a.session_id));
  s.sessions = ids.size;
  s.tokens = [...ids].filter(id => passedIds.has(id)).length;
  return s;
}
const fmtRow = (name, s) =>
  `  ${name.padEnd(10)} sessions ${s.sessions} · tokens ${s.tokens} · scored attempts ${s.scored} · TP ${s.tp} · FP ${s.fp} · FN ${s.fn} · precision ${num(s.precision)} · recall ${num(s.recall)} · exact-board ${pct(s.exact, s.scored)} · expiries ${s.expiries} · median decision ${s.medianMs === null ? 'n/a' : s.medianMs + 'ms'}`;

const L = [];
L.push('════════════════════════════════════════════════════════════════');
L.push(`CAPTCHA GYM — AGENT vs HUMAN COMPARISON${runFilter ? '  (run ' + runFilter + ')' : ''}`);
L.push(`generated ${new Date().toISOString()} · gt_contract 1.0 · source: ${DATA_DIR}`);
L.push(`attempts by source (pre-filter): ${Object.entries(sourceCensus).map(([k, v]) => k + ' ' + v).join(' · ') || 'none'}`);
L.push(`excluded by bug-era window (2026-10-10 18:46–18:54Z): ${bugAttempts} attempts · ${bugEvents} events`);
L.push('populations: agent = live-agent · human = human-* · every other source is test traffic, in neither');
L.push('════════════════════════════════════════════════════════════════');
for (const pop of POPULATIONS) {
  const pa = attempts.filter(a => pop.pred(tag(a)));
  const pe = events.filter(e => pop.pred(tag(e)));
  const humanTagsLine = pop.key === 'human' ? `  (tags: ${[...new Set(pa.concat(pe).map(tag))].sort().join(', ') || 'none'})` : '';
  L.push('');
  L.push(`POPULATION ${pop.key} — ${pop.label}${humanTagsLine}`);
  if (!pe.length && !pa.length) { L.push('  no records yet'); continue; }
  L.push(fmtRow('overall', popStats(pa, pe)));
  L.push(fmtRow('photo', corpusStats(pa.filter(a => a.challenge && a.challenge.corpus === 'photo'), pe)));
  L.push(fmtRow('synthetic', corpusStats(pa.filter(a => !(a.challenge && a.challenge.corpus === 'photo')), pe)));
}
L.push('');
L.push('Per-corpus sessions*/tokens* count distinct sessions that served ≥1 attempt of');
L.push('that corpus (a session can appear in both rows); the overall row is session-log truth.');
L.push('Median decision excludes expired rounds (their time is the clock, not a decision).');
L.push('Asymmetry disclosure (HUMAN_BASELINE.md): the agent plays through a managed browser');
L.push('with screenshot latency; the human plays directly. Decision times are not like-for-like.');
console.log(L.join('\n'));
