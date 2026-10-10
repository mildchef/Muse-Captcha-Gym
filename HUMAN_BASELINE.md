# CAPTCHA Gym — human baseline & publication recording

Ben's plan (2026-10-10): record agent-vs-human solving statistics
throughout training and PUBLISH the comparison when training is complete.
This file defines what is recorded, how the two populations stay separate,
and the human play protocol. Publication itself happens later, on Ben's
word — this file is about capturing publication-grade data from now on.

## Population separation (the hard rule)
- Agent sessions: source `live-agent` (front-end default) — the training
  batches and any agent play.
- Human sessions: source `human-ben` — set ONLY via the tagged link
  (the current gym URL from `LIVE_URL.txt` + `?source=human-ben`,
  combinable with `&scenario=`; see README "Human baseline"). The server
  allowlists source values (`human-<name>` plus the known harness tags)
  and pins the tag to the session for all its rounds; anything else
  falls back to `live-agent`. A human session without the tag is
  indistinguishable from an agent session and pollutes BOTH baselines —
  the 2026-10-10 unattributed walk-in session is the standing
  cautionary example and stays excluded from the human line (it remains
  untagged `live-agent` history; it is never relabeled).
- e2e/deploy-check sources are test traffic, never either population.

## What is recorded (per session, from server logs — same for both sides)
- Source, scenario, timestamps; checkbox outcome and trust explanation.
- Per attempt: corpus (photo/synthetic), class, served type, result,
  TP/FP/FN against the server-side ground truth, band tiles hit,
  procedure codes (empty submission, expiry, etc.).
- Round duration / decision time (grid issuance → submission), session
  rounds-to-token, token outcome.
- The brief version in force for agent sessions (from TRAINING_LOG.md
  batch entries); human sessions record "human, no brief".

## Comparison metrics (computed identically for both populations)
Implementation: `node tools/compare_report.js` (overall + per-corpus
rows; bug-era window excluded from both populations), plus the headline
population block on `/results`.
Per corpus and overall: scored attempts, TP/FP/FN, precision, recall,
exact-board rate, sliver recall, expiries, median decision time per
round, rounds per session, session token rate. Published tables are
era-split for the agent (brief v1 / v2 / v2.1 / …) with the human line
shown whole and per-period if the human plays across eras.

## Human play protocol (Ben)
- Play via the tagged link only; as many sessions as you like, whenever.
  Natural play — no brief, no rules coaching; solve the way you solve.
- Same scenarios the agent trains on are ideal: photo Type B is the
  frontier; some synthetic and natural sessions round out the comparison.
- A useful target by publication time: ≥10 human photo sessions
  (≥20 scored photo attempts) so the human line isn't anecdote-thin.
- Your stats are recorded under `human-ben`; only aggregate statistics
  are publication material — no session needs to be narrated.

## Publication notes (for the eventual write-up — record now, write later)
- The gym is a self-built impersonation of reCAPTCHA v2 mechanics
  (two-gate model, exact-match grading, separate challenge/token clocks);
  it cannot replicate Google's proprietary risk engine — say so in print.
- Ground truth: synthetic masks exact by construction; photo masks from
  COCO 2017 val (CC-BY/SA images only), with a documented ambiguity band
  excluded from scoring on both sides equally.
- Known asymmetries to disclose: the agent plays through a managed
  browser with screenshot latency (decision times include tooling
  overhead); the human plays directly. Input channel is a measured
  variable in the literature, not a hidden confound to bury.
