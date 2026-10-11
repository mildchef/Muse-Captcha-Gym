# workflow_cadence — staged scenario design

**Status:** STAGED in `dev_staging/` (a copy of the live server + front
end). Nothing here is deployed; the live tree is untouched. Deployment
is an era-boundary act by the project owner (recipe at the bottom).
**Evidence:** `smoke_workflow.js` 21/21 checks pass; the full existing
e2e suite passes against this staged copy 164/164 (recipe below).

## Why this scenario exists — the field pattern

FIELD_COMPARISON.md (dev track, from the ~/TOOLS.md field log) found
the gym's biggest realism gap was not any single challenge but the
*cadence* of real portal work:

- **F1 (Oregon Judicial Department portal):** a challenge on nearly
  every submission, across a multi-search work session — checkbox gates
  followed by image-grid rounds, with prompts switching between
  submissions (buses, bridges, bicycles, stairs in one session).
- **F3 (technique):** the field skill is a *loop* — solve, submit,
  immediately face the next challenge — not a single isolated round.
- The live gym trains rounds one token at a time: pass once, session
  over. Nothing exercises sustained back-to-back solving, prompt
  switching under session continuity, or the discipline of not
  stopping after the first success.

`workflow_cadence` closes that gap in the gym's own grammar.

## Mechanics

A `workflow_cadence` session is a **workflow of N consecutive dynamic
Type A rounds** (N = `GYM_CADENCE_ROUNDS`, default **4**):

- **Challenge on every submission, no checkbox-only exit.** The
  checkbox gate always issues a challenge for this scenario (same
  treatment as `force_*`, with its own logged override reason). The
  entry risk score is still computed, explained and logged exactly as
  for every other scenario — only the pass shortcut is skipped.
- **Every round is dynamic Type A** (fade-and-replace), served from
  the existing Type A corpus. No new images, no new challenge type:
  the fade/settle/re-scan mechanics are the production ones, reused
  verbatim.
- **The prompt switches every round.** At session creation the server
  draws a prompt sequence by shuffling `TRAIN_CLASSES` with the
  session's seeded RNG (classes are distinct, so consecutive prompts
  can never repeat). Each issued challenge — first, retry, or
  post-expiry — takes the next prompt in the sequence.
- **A token is minted only when the final round passes.** An
  intermediate pass returns
  `{result:'pass', cadence:{rounds_passed, rounds_required, complete:false}, new_challenge}`
  and the session stays in `CHALLENGED` with the next challenge already
  issued. The front end (staged `public/app.js`) renders the next
  challenge on that response; only a token-carrying pass shows the
  pass widget.
- **Failures behave exactly as in the base game** — trust −7 (with
  the usual procedure/staleness extras), a fresh challenge with the
  next prompt, cooldown at `MAX_ROUNDS` (6) total rounds or below the
  trust floor. Consequence worth naming: a workflow tolerates at most
  **2 failed rounds** before cooldown (4 passes must fit in 6 rounds)
  — the gym's escalation pressure, analogous to a portal locking a
  session after repeated failures.
- **Expiry mid-workflow** returns the session to the checkbox gate
  (base-game rule), but the cadence state is kept: rounds already
  passed stay passed, and the next issued challenge continues the
  prompt sequence.
- Trust deltas are unchanged (+4 per passed round, so a clean
  workflow nets +16 before the token).

## Tagging and scoring

No scoring changes: every round is scored by the existing dynamic
verifier (grid-state match, settled-replacement checks, procedure
error taxonomy) and logged as a normal attempt with
`scenario: "workflow_cadence"`. Each attempt additionally carries a
`cadence` stamp —

```json
"cadence": { "workflow_step": 2, "rounds_required": 4,
             "challenges_issued": 3, "prompt": "stairs" }
```

(`workflow_step` = `rounds_passed + 1` at attempt time: the workflow
slot the attempt is trying to fill, so a failed attempt and its retry
share a step.) Session events add `cadence_round_passed` (per
intermediate pass) and `cadence_complete` (once, before the normal
`passed` event). Reports can therefore slice cadence attempts by step
— e.g. does accuracy decay across a workflow? — with zero changes to
report tooling, since the attempts remain ordinary scored attempts.

Sessions played by tests use source `smoke`/`e2e` as usual; the staged
copy writes only to `dev_staging/data/`.

## What deployment changes (era boundary)

Deploying = applying this staged copy's diff to the live tree:

- `server.js`: **+39 diff lines in 8 hunks** — `CADENCE_ROUNDS` config;
  cadence state in `newSession`; `serveType` mapping to
  `typeA_dynamic`; prompt pinning in `issueChallenge`/`genChallenge`;
  intermediate-pass branch + `cadence_complete` in `resolveRound`;
  checkbox always-challenge override; `cadence` stamp in
  `baseAttempt`. No existing behavior changes for any other scenario
  (proven by the e2e suite: 164/164 against the staged copy).
- `public/app.js`: one branch in `handleRoundResult` (pass +
  `new_challenge` → render next challenge).
- No corpus, brief, regimen, or data changes. Suggested era note in
  TRAINING_LOG.md when deployed: cadence attempts are a new scenario
  population and must be reported separately from the photo-parity
  window (they are Type A synthetic; the parity bar is photo-only and
  unaffected).

## Run the staged copy

```sh
cd dev_staging
node smoke_workflow.js        # staged server on :8932, plays the
                              # scenario end-to-end via the API,
                              # 21 checks, exits non-zero on failure
# Full regression suite against the staged copy:
mkdir -p tools && cp ../tools/{e2e_test,validate_corpus,report,compare_report}.js tools/
node tools/e2e_test.js        # 164 passed, 0 failed (2026-10-10)
```

The staged server resolves its corpus through the `corpus` symlink
(read-only; the live corpus is never written by the server) and its
data through `dev_staging/data/` (created on first run; smoke traffic
is tagged source `smoke`, run `run_smoke_workflow`).
