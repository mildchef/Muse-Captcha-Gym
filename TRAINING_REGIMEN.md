# CAPTCHA Gym — standing training regimen

Owner: chocco. Original approval: Ben 2026-10-10 ("Go for it!").
**Continuous mode approved by Ben 2026-10-10: "train 24/7 until the
agents reach human level."** This document supersedes the Mon/Wed/Fri
cadence. Ben can pause, change, or kill the regimen at any time in the
originating chat.

## Objective — the human-parity bar (falsifiable, or it doesn't count)
Parity is judged on scored PHOTO attempts (source live-agent) under the
current validated-or-candidate brief, against the human population line
from `tools/compare_report.js`:

- Rolling window: the last **30 scored photo attempts**.
- Bar: **precision ≥ 0.95 AND recall ≥ 0.95 AND exact-board ≥ 90% AND
  expiry rate ≤ 10%**, sustained across **two consecutive windows**
  (i.e., two back-to-back 30-attempt evaluations both clearing the bar).
- On clearing both windows: declare **PARITY** in TRAINING_LOG.md and
  report it immediately in the originating chat. Then throttle this
  regimen to maintenance composition (1 rotating session per run) until
  the owner adjusts the schedule — do not keep grinding at full rate.
- Decision time is reported but does NOT gate parity: the agent plays
  through a managed browser (screenshot latency), the human plays
  direct; the asymmetry is disclosed in HUMAN_BASELINE.md. Accuracy
  parity is the goal.
- The human line is itself a small sample until Ben banks ≥20 scored
  human photo attempts (HUMAN_BASELINE.md target). Parity is declared
  against the human line as it stands, with its n always stated.

## Endgame — the gym is scaffolding (Ben, 2026-10-10)
The gym exists to PRODUCE the skill, not to run forever. Graduation =
parity declared (above) AND the brief converged (a validated brief whose
rules stop changing across successive validations). At graduation:
report it, fold the final validated brief into the repo's SKILL.md as
the shipped technique (so cloners get the capability without needing
the gym), and recommend retiring continuous training. After that the
gym's only remaining job is regression: if the skill's technique is
edited, or the agent model changes, a short gym run re-validates it —
the same role the Alora case plays for the OSINT skill.

Stall brake: if three consecutive candidate brief versions fail to
improve on their target failure mode, stop drafting new candidates,
report the stall in the originating chat with the numbers, and keep
playing the best validated brief at maintenance composition until the
owner directs otherwise. Grinding folklore forever is not training.

## Cadence and batch composition
- **Back-to-back runs, around the clock** (cron
  `captcha-gym-training-batch`, interval 20m — a run takes ~15–20 min,
  so the cadence is effectively continuous with a small gap for other
  browser work to interleave), reported per the rules below.
- Each run = **3 sessions, played SEQUENTIALLY** (one shared browser):
  1. Two photo sessions (`?scenario=force_type_b_photo`) under the
     CURRENT brief from AGENT_BRIEF.md (candidate version if one is
     validating).
  2. One rotating session: force_type_b → natural → force_dynamic →
     force_low_trust, rotating per run in that order.
- Extra sessions may be added ONLY to replace one lost to infrastructure
  (tunnel death / site unreachable) so the scored-attempt yield stays
  comparable.
- Runs share the browser with everything else Ben asks for; a queued
  run simply starts when the browser frees. Never spawn parallel play.

## Pre-flight (every run, before any play)
- `systemctl is-active captcha-gym captcha-gym-tunnel`; if units are
  missing (VM replaced), run `tools/install_services.sh`, start both,
  wait for the banner.
- Read the CURRENT tunnel URL from `LIVE_URL.txt` (never reuse an old
  one) and curl it — proceed only on HTTP 200.
- Read AGENT_BRIEF.md and TRAINING_LOG.md so the run uses the current
  brief and knows the running totals and parity windows it is adding to.

## Play rules for the runner
- Inline the current brief's full text into every browser task (tasks
  cannot read files). Include the CAPTCHA-preference note: the stored
  preference is solve/all_tasks; a task pausing on "ask/unavailable" is
  the known glitch — verify with get_captcha_preference and steer; after
  two refused steers, close and respawn the task.
- If the tunnel dies mid-run, re-read LIVE_URL.txt after supervision
  restarts it and steer/respawn the interrupted session at the new URL.
  Sessions lost to infrastructure are UNSCORED, never failures.
- Arbitrate every attempt from `data/attempts.jsonl` (source live-agent,
  run time window): TP/FP/FN per attempt from the server record; an
  agent's intended selection on an expired round may be reported as a
  counterfactual, clearly labeled, never counted.

## Brief governance (unchanged by continuous mode)
- A candidate brief version validates over its first ≥8 scored PHOTO
  attempts. Until then its numbers are reported separately as
  "candidate, n=…".
- After ≥8: compare with the previous version's photo line (precision,
  recall, exact-board, expiries, FN composition). Promote the candidate
  (mark it validated in AGENT_BRIEF.md) if it is not worse on precision
  and better or equal on the failure mode it was written to fix;
  otherwise revert play to the prior version and record why.
- Never change the brief mid-run. New rules are drafted from accumulated
  failure data, versioned in AGENT_BRIEF.md, and validated by later
  runs — folklore doesn't graduate.

## Reporting
- Append every run's numbers to TRAINING_LOG.md: run #, brief
  version(s), sessions/tokens, scored attempts per corpus with TP/FP/FN,
  precision/recall/exact-board (run + running per-brief totals),
  expiries, infra incidents, dominant failure mode in one line, and the
  current parity-window status. Era-split always; checkbox-only
  sessions count as tokens but never as perception data.
- Chat reports in the originating chat ONLY on a trigger:
  (a) PARITY declared, (b) a brief promoted or reverted, (c) the stall
  brake firing, (d) a run that could not play because the gym could not
  be revived, (e) the first run after 9:00 AM Pacific each day, which
  carries a 24-hour digest (attempts banked, per-brief lines, parity
  distance, human-line n). Routine runs end with result summary
  "no reportable events" and no user-facing message.
- If the gym cannot be revived, report that instead of playing — never
  fabricate a batch.
