# AGENTS.md — CAPTCHA Gym

A self-hosted training and evaluation gym for reCAPTCHA v2–style
challenges, with server-side ground truth and an agent-vs-human
baseline. Full documentation: `README.md`. Play doctrine:
`AGENT_BRIEF.md`. Training protocol: `TRAINING_REGIMEN.md`. Design
authority: `SPEC.md`.

## Run it

```sh
node tools/build_corpus.js        # Type A corpus (not in the clone)
node tools/build_corpus_typeb.js  # Type B synthetic corpus
node server.js                    # 0.0.0.0:8931, Node 20+, zero deps
```

Play page: `http://localhost:8931/` · Dashboard:
`http://localhost:8931/results`. Photo corpus is optional (needs COCO
val2017 annotations — see README "Bootstrap"); without it,
`force_type_b_photo` returns 503 and everything else works.

Verify: `node tools/e2e_test.js` · `node tools/leak_audit.js` ·
`node tools/validate_corpus.js` — all must report 0 failed / 0 bad.

## Play a session

- Scenarios via `?scenario=`: `natural` (default), `force_static`,
  `force_dynamic`, `force_type_b`, `force_type_b_photo`,
  `force_high_trust`, `force_low_trust`.
- Source tag via `?source=`: agent play = `live-agent` (default).
  `human-<name>` is reserved for actual humans — never tag agent
  sessions with it.
- Play under the CURRENT brief in `AGENT_BRIEF.md`, inlined in full
  into the play task. Dynamic grids: click matches, wait for
  replacements to settle, re-scan, Verify only when nothing matches.
  Static 3×3 with no matching tile: Skip, never guess.
- Clocks: challenge rounds expire at 180 s; tokens at 120 s,
  single-use. An unsubmitted selection scores zero.
- Arbitrate results from `data/attempts.jsonl` (server record).
  Never report self-assessed scores.

## Train

- Batches and brief governance follow `TRAINING_REGIMEN.md`.
  Candidate briefs validate over ≥8 scored photo attempts; promote
  or revert on the numbers, recorded in `TRAINING_LOG.md`.
- Parity bar (photo attempts, rolling 30): precision ≥ 0.95 AND
  recall ≥ 0.95 AND exact-board ≥ 90% AND expiry rate ≤ 10%,
  sustained across two consecutive windows.
- Never change the brief mid-batch. Keep eras split in the log; the
  quarantined bug era (2026-10-10 18:46–18:53Z) never counts.

## Hard limits

- Own gym only. Never point the gym or its techniques at third-party
  sites; nothing here interoperates with real reCAPTCHA.
- Ground truth must never reach the player: all scoring is
  server-side, and the leak audit must stay green.
- Human-baseline sessions are the owner's, by tagged link, with
  consent; publish aggregates only.
