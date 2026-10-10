# CAPTCHA Gym — standing training regimen

Owner: chocco. Approved by Ben 2026-10-10 ("Go for it!").
Cadence: **Monday / Wednesday / Friday, ~10:30 AM Pacific**, one batch,
reported in the OSINT/gym side chat where the schedule was created.
Ben can pause, change, or kill the regimen at any time in that chat.

## Batch composition (5 sessions, played SEQUENTIALLY — one shared browser)
1. Three photo sessions (`?scenario=force_type_b_photo`) under the CURRENT
   brief from AGENT_BRIEF.md (candidate version if one is validating).
2. One synthetic Type B session (`?scenario=force_type_b`).
3. One rotating session: natural → force_dynamic → force_low_trust,
   rotating per batch in that order.
Extra sessions may be added to a batch ONLY to replace one lost to
infrastructure (tunnel death / site unreachable) so the scored-attempt
yield stays comparable.

## Pre-flight (every batch, before any play)
- `systemctl is-active captcha-gym captcha-gym-tunnel`; if units are
  missing (VM replaced), run `tools/install_services.sh`, start both,
  wait for the banner.
- Read the CURRENT tunnel URL from `LIVE_URL.txt` (never reuse an old
  one) and curl it — proceed only on HTTP 200.
- Read AGENT_BRIEF.md and TRAINING_LOG.md so the batch uses the current
  brief and knows the running totals it is adding to.

## Play rules for the runner
- Inline the current brief's full text into every browser task (tasks
  cannot read files). Include the CAPTCHA-preference note: the stored
  preference is solve/all_tasks; a task pausing on "ask/unavailable" is
  the known glitch — verify with get_captcha_preference and steer; after
  two refused steers, close and respawn the task.
- If the tunnel dies mid-batch, re-read LIVE_URL.txt after supervision
  restarts it and steer/respawn the interrupted session at the new URL.
  Sessions lost to infrastructure are UNSCORED, never failures.
- Arbitrate every attempt from `data/attempts.jsonl` (source live-agent,
  batch time window): TP/FP/FN per attempt from the server record; an
  agent's intended selection on an expired round may be reported as a
  counterfactual, clearly labeled, never counted.

## Brief governance
- A candidate brief version validates over its first ≥8 scored PHOTO
  attempts. Until then its numbers are reported separately as
  "candidate, n=…".
- After ≥8: compare with the previous version's photo line (precision,
  recall, exact-board, expiries, FN composition). Promote the candidate
  (mark it validated in AGENT_BRIEF.md) if it is not worse on precision
  and better or equal on the failure mode it was written to fix;
  otherwise revert play to the prior version and record why.
- Never change the brief mid-batch. New rules are drafted from a batch's
  failure data, versioned in AGENT_BRIEF.md, and validated by later
  batches — folklore doesn't graduate.

## Reporting (every batch, in the originating chat)
One message: batch #, brief version(s), sessions/tokens, scored attempts
per corpus with TP/FP/FN, precision/recall/exact-board for the batch and
the running per-brief totals, expiries, infra incidents, and the batch's
dominant failure mode in one line. Era-split always; checkbox-only
sessions count as tokens but never as perception data. Append the same
numbers to TRAINING_LOG.md. If the gym cannot be revived, report that
instead of playing — never fabricate a batch.
