#!/usr/bin/env node
/*
 * tag_legacy_sources.js — ONE-TIME backfill for session-source tagging (v1.1).
 *
 * Records written before source tagging have no `source` field. The runs
 * that produced the existing data/ logs are known exactly (BUILD_NOTES.md):
 *   run_2026-10-10_274a17 — builder curl smoke test        → 'smoke'
 *   run_2026-10-10_0b580e — builder smoke (session only)   → 'smoke'
 *   run_2026-10-10_81d0c6 — live browser-agent sessions over the tunnel
 *                           (2026-10-10 17:42–17:54 UTC)    → 'live-agent'
 * This script stamps those run_ids and nothing else; any other untagged
 * record is left untouched (report.js counts it as 'unknown'). It is
 * idempotent and refuses to overwrite an existing source tag.
 * Run once: node tools/tag_legacy_sources.js [--data DIR]
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = process.argv.includes('--data') ? process.argv[process.argv.indexOf('--data') + 1] : path.join(__dirname, '..', 'data');
const RUN_SOURCE = {
  'run_2026-10-10_274a17': 'smoke',
  'run_2026-10-10_0b580e': 'smoke',
  'run_2026-10-10_81d0c6': 'live-agent',
};
for (const name of ['attempts.jsonl', 'sessions.jsonl']) {
  const file = path.join(DATA_DIR, name);
  if (!fs.existsSync(file)) { console.log(name + ': missing, skipped'); continue; }
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  let stamped = 0, already = 0, unknownRun = 0;
  const out = lines.map(l => {
    let rec; try { rec = JSON.parse(l); } catch { return l; }
    if (rec.source) { already++; return l; }
    const src = RUN_SOURCE[rec.run_id];
    if (!src) { unknownRun++; return l; }
    stamped++;
    return JSON.stringify({ ...rec, source: src });
  });
  fs.writeFileSync(file, out.join('\n') + '\n');
  console.log(`${name}: ${stamped} stamped, ${already} already tagged, ${unknownRun} left untagged (unmapped run)`);
}
