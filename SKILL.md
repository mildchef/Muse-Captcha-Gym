---
name: "captcha-gym"
title: "CAPTCHA Gym"
description: "Self-hosted training and evaluation gym for reCAPTCHA v2–style challenges: checkbox gate, 3×3 static/dynamic grids, 4×4 synthetic and real-photo grids, server-side ground truth, mock risk scorer, and agent-vs-human baseline recording. Use when an agent should practise or be measured on CAPTCHA-style image challenges, train under a versioned play brief, compare its solving metrics against a human baseline, or run the gym locally for another agent."
---

# CAPTCHA Gym

A zero-dependency Node 20+ web app that serves reCAPTCHA v2–style
challenges and scores every attempt server-side against known ground
truth. Design authority: `SPEC.md`. Full documentation: `README.md`.

## Install

Two modes:

1. **As a skill:** clone this repo into the workspace skills directory
   (`~/workspace/skills/captcha-gym`). This file is the skill entry
   point; the gym itself runs from the same directory.
2. **Standalone:** clone anywhere and run from the repo root.

The corpus is NOT in the clone (binaries and generated manifests are
gitignored). Build the synthetic corpus before first play:

```sh
node tools/build_corpus.js        # Type A 3×3 tiles
node tools/build_corpus_typeb.js  # Type B 4×4 synthetic scenes
```

The real-photo corpus is optional: it needs the MS COCO 2017 val
annotations (`instances_val2017.json` at `/tmp/coco/annotations/`, or
set `COCO_VAL_JSON`), then `node tools/build_photo_corpus.js`. Only
CC-BY / CC-BY-SA images are admitted (see `CREDITS.md`). Without it,
everything except `force_type_b_photo` works; that scenario returns
HTTP 503 `photo_corpus_unavailable`.

## Start and verify

```sh
node server.js   # 0.0.0.0:8931 (PORT/HOST env override)
```

Play page `/`, spectator dashboard `/results`. Sanity checks (each is
self-contained; no running server needed): `node tools/e2e_test.js`,
`node tools/leak_audit.js`, `node tools/validate_corpus.js` — all
must report 0 failed / 0 bad before you trust a local install.

## Play sessions

- Open the play URL in a browser. Pick a scenario with `?scenario=`:
  `natural` (default; risk scorer decides), `force_static`,
  `force_dynamic`, `force_type_b`, `force_type_b_photo`,
  `force_high_trust`, `force_low_trust`.
- Tag the session with `?source=` at creation: agent play is
  `live-agent` (the default). `human-<name>` is reserved for actual
  human-baseline play — never tag agent sessions with it.
- **Play under the current brief in `AGENT_BRIEF.md`** — inline its
  full text into the play task (browser tasks cannot read files) and
  record which brief version produced each batch. Essentials the
  brief governs: any recognizable part of the target counts (sliver
  rule); poles/shadows/reflections never count; dynamic grids loop
  click → wait for replacements → re-scan → Verify only when nothing
  matches; static 3×3 with no match = Skip; challenge rounds expire
  at 180 s, tokens at 120 s single-use.
- Play to a terminal state (token or failure); never stop early
  because rounds repeat.

## Record results

- The server logs every attempt to `data/attempts.jsonl`
  (gitignored, append-only). **Arbitrate all scores from that log** —
  per-attempt TP/FP/FN, precision/recall, exact-board, expiries —
  never from player self-reports.
- Batch summaries go in `TRAINING_LOG.md`, era-split by brief
  version, following the existing entry format. Checkbox-only
  sessions count as tokens, never as perception data.
- Reports: `node tools/report.js` (one population),
  `node tools/compare_report.js` (agent vs human).

## Training governance and the parity bar

Protocol: `TRAINING_REGIMEN.md`. A candidate brief validates over
≥8 scored photo attempts; promote it if it is not worse on precision
and better or equal on the failure mode it targets, otherwise revert
and record why. Human parity, judged on scored photo attempts over a
rolling 30-attempt window: **precision ≥ 0.95 AND recall ≥ 0.95 AND
exact-board ≥ 90% AND expiry rate ≤ 10%**, sustained across two
consecutive windows. Decision time is reported but does not gate
parity (managed-browser latency is a disclosed asymmetry).

## Scope and ethics — hard limits

- Own gym only: this trains and evaluates your own agent on your own
  site. Never point the gym, its corpus, or techniques learned from
  the brief at third-party sites or production CAPTCHAs.
- Nothing here interoperates with real reCAPTCHA: no Google JS, no
  sitekeys, no token injection; gym tokens are meaningless elsewhere.
- Ground truth stays server-side; keep the leak audit green.
- Human-baseline data is recorded with consent and published in
  aggregate only.
