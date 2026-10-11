# Gym vs field — do the gym's measured failure modes match the real world?

**Date:** 2026-10-10 · **Author:** dev track (parallel to live training)
**Question:** the gym has now measured a specific set of agent failure
modes. The project's field record — real CAPTCHA encounters from live
work — is small but real. Where do they agree, where does the gym train
things the field never showed, and what does the field know that the
gym doesn't train?

**Evidence, and its limits.** Gym side: `TRAINING_LOG.md` (era-split,
server-arbitrated; briefs v1/v2/v2.1, batches #1 + runs #2–#7) and
`BUILD_NOTES.md` (failure taxonomy, STATE OF THE GYM). Field side: the
CAPTCHA failure & handoff log and dynamic-grid technique notes in
`~/TOOLS.md` — three log entries, all from one day (2026-10-10) of
OSINT portal work (Alora case) against two Oregon portals. **Every
field challenge actually presented to the worker was solved.** The
field sample is therefore: tiny, one task type, one day, zero recorded
solving failures. Anything below that says "no field evidence" means
exactly that — absence in a small, success-only sample, not evidence
of absence in production. BUILD_NOTES itself sets the precedence:
"Production outcomes in the CAPTCHA failure log outrank every number
here."

## The field record, condensed

- **F1 — Oregon Judicial Dept portal** (`webportal.courts.oregon.gov`):
  checkbox + image grids on *nearly every search submission*; prompts
  included **buses, bridges, bicycles, stairs**; dynamic
  fade-and-replace grids, several rounds each. Worker solved all, no
  handoff. (TOOLS.md log, 2026-10-10.)
- **F2 — Oregon SOS BizSearch via automated fetch**: security/bot-wall
  page, no challenge offered — unsolvable *by design* (a fetcher is not
  a browser). In the live browser the same portal presented **no
  challenge at all**. The day's only real field failure was a routing/
  channel failure, not a solving failure.
- **F3 — Technique notes** (TOOLS.md, from the same work): the field
  discipline that mattered was procedural — click all matches, **wait
  for fade/replacement to settle**, re-scan the whole grid, Verify
  only when nothing matches; an early Verify returns "please also
  check the new images" and loops back; a genuinely stuck grid gets
  the reload button, not guesses.
- Field prompts observed: buses, bridges, bicycles, stairs — object
  classes on dynamic tile grids. No 4×4 sliced single-scene grid, no
  lockout, no expiry, and no perception miss is recorded.

## Gym failure modes → field match

### 1. Sliver / fragment misses — gym: measured, then fixed. Field: silent.
Gym: brief v1's photo era lost 3 of 5 FNs to sub-sliver borderline
fragments judged "on the line" (TRAINING_LOG, photo v1). Brief v2's
fragment-inclusion bias closed it completely — zero sliver misses in
the v2 era — and the corpus trains it deliberately (44
sliver-engineered synthetic scenes; 26.5% of live photo positive pairs
are slivers). Field: no fragment miss, near-miss, or fragment decision
is recorded; F1's grids were solved wholesale. **Verdict: keep
training it** — the any-overlap rule is the solver-proven production
convention (SPEC §4, Plesner et al.), and the gym proved the failure
real in its own house before fixing it. But label it honestly:
*research-supported, not field-confirmed.*

### 2. Whole-instance / region misses on crowded scenes — gym: THE dominant mode. Field: no analog in the sample.
Gym: this is the binding constraint on the parity bar. v2 era: all 6
FNs were whole-instance misses on crowded multi-instance car scenes
(a 9-positive board missed 4; a beach-rental board missed 2, twice, in
two different sessions). v2.1's census rule was written for exactly
this and was reverted — the mode did not improve (Run #2: all 5 photo
FNs whole-instance/region; batch #1: a counted cluster mapped one row
too high). Run #6 added a variant: sprawling single instances
under-selected — two fire-hydrant boards contributed FN8 + FN5 (13 of
the run's 17 photo FNs). After Run #7, v2 stands at recall .805,
exact-board 16/27 against bars of .95 / 90%.
Field: F1's challenges were dynamic grids of *independent tile
images*, not one sliced scene to enumerate. The field's corresponding
risk is different in shape: failing to notice a **newly replaced**
matching tile — covered by F3's re-scan discipline, and trained by the
gym's Type A dynamic loop. **Verdict: the gym's largest training
investment (sliced-scene enumeration on photos) has no counterpart in
our own field record.** Production reCAPTCHA does serve sliced grids
(the gym's SPEC rests on published research), so this is not wasted
work — but on project-internal evidence it is *unconfirmed*, and it
should not crowd out the dynamic-grid skills the field actually
exercised. The parity push is currently optimizing the mode with the
weakest field support.

### 3. Inter-object boundary / ownership errors — gym: rare, persistent, car-shaped. Field: silent.
Gym: v1's only FPs (2) came from one bus-vs-car boundary — the agent
saw a dark car behind a bus where COCO's mask assigns the pixels to
the bus. Brief v2's ownership rule held FP at 0 for long stretches,
but the mode persists at low rate, concentrated on car boards:
Run #5 FP3 on a single car board (attempt precision .700), Run #7
FP1 on a car board. Field: no boundary error recorded; F1's prompts
were distinct classes in separate tiles. **Verdict: real but minor;
keep the ownership rule, don't build new machinery for it.** Note the
gym-side subtlety: part of this "error" is annotation-contract, not
perception — the mask's ownership call is the ground truth by
definition (SPEC §4.1), and production's call is unpublished.

### 4. Clock expiries & procedure — gym: measured, fixed, and the strongest field match.
Gym: 4 expiries, all in the first two photo batches (2 under v1, 2
under v2) — every one a *procedure* loss, not perception: two held
counterfactually perfect selections (one pixel-perfect unsubmitted
traffic-light round; one bus board that would have scored TP9/0/0).
Brief v2's clock discipline (fewer screenshot passes, Verify in the
same flow) took expiries to **zero in every subsequent run**
(batches/runs #2–#7). Plus one `empty_submission` procedure error
(Run #2). Field: F3 is the same lesson wearing work clothes — the
field's recorded near-failure mode is premature Verify and
un-settled grids, and the countermeasure is patience + re-scan, i.e.
procedure. Production shows no 180 s countdown, so the gym's clock is
a training prosthetic; the *discipline* it teaches (settle, re-scan,
then commit) is verbatim the field technique. **Verdict: gym trains
the right thing; this is the one mode where gym measurement, brief
intervention, and field doctrine all agree.**

### 5. Decision-time profile — gym: ~4× slower than human. Field: tolerated, untested.
Gym: agent photo decision median ≈ 67 s vs the human baseline's
≈ 17 s; BUILD_NOTES flags static p50 72 s / dynamic p50 130 s against
the mock scorer's 3–30 s plausible band — "pace, not perception, is
the open training front." In-gym cost so far: the expiry losses in
mode 4 (now zero) and scorer-band blemish; sessions forgive retries,
so pace has not cost tokens directly. Field: F1's worker solved
"several rounds each" across many submissions with no recorded
lockout, timeout, or risk escalation — the recorded portals tolerated
slow, round-heavy solving. **Verdict: real gap, unproven field cost.**
The gym cannot settle this one: production risk scoring is exactly
what the mock scorer admits it cannot replicate (SPEC §1). Report
pace, don't over-train against an invented threshold.

### 6. Terminal cooldown (acceptance layer) — gym: seen once. Field: never.
Gym: Run #6, session 1 — six consecutive failed rounds ended in
"Too many attempts" cooldown, no token: repeated perception failure
converts into session-level refusal in the gym's ladder. Field: no
lockout or refusal recorded (and F2's wall was pre-challenge, a
different layer). **Verdict: keep the mechanic (it disciplines
retry behavior), but there is no field evidence for its thresholds.**

### 7. The stack failing, not the solver — both sides, same lesson.
Gym: the quarantined bug era (6 Type B attempts scored TP0/FP0/FN27)
was a front-end click bug — instrumentation failure masquerading as
perception failure; fixed, and `empty_submission` now files such
events under procedure automatically. Field: F2 (fetch bot-wall) and
the browser-task preference-misread glitch in TOOLS.md are the same
species — the channel/orchestration layer failed while solving skill
was never tested. **Verdict: the gym's taxonomy (perception /
procedure / server-acceptance) already encodes this; the field log
validates the taxonomy more than any single solving skill.**

## Field observations the gym does not train

- **Challenge cadence across a workflow.** F1: a challenge on *nearly
  every submission*, back-to-back, with the prompt switching between
  searches (buses → bridges → bicycles → stairs). Gym sessions are
  single-scenario sprints ending at one token. Nothing trains
  endurance, prompt-switching, or staying disciplined on the tenth
  consecutive challenge of a work session.
- **Field classes missing from the photo corpus.** Two of the four
  observed field prompt classes — **bridges** and **stairs** — have
  no photo-corpus presence (synthetic only). They also cannot be
  added from COCO: neither category exists in COCO 2017 (verified
  against `instances_val2017.json` for this memo's companion work).
  The photo corpus trains hardest on classes the field sample showed
  least (six vehicle/hydrant classes; the field showed two of them:
  buses, bicycles).
- **The no-challenge outcome.** F2's live-browser pass presented no
  challenge at all. The gym models gate outcomes with invented
  weights (SPEC §1 is explicit); there is no field data to calibrate
  the gate against, and the gym rightly doesn't pretend otherwise —
  but "sometimes the correct outcome is that nothing is asked" is a
  field fact the training distribution should keep represented
  (checkbox-only passes already occur in `natural` sessions).
- **Access-layer failure as a first-class outcome.** The field day's
  only failure was routing (fetch vs browser). That is portal-playbook
  doctrine, not solving skill — correctly out of the gym's scope, and
  named here so the comparison doesn't silently credit or blame the
  gym for it.

## Gym modes with no field evidence (recap)

Sliced-scene enumeration failure (mode 2, the dominant one),
boundary FPs (mode 3), cooldown thresholds (mode 6), and the
ambiguity-band accounting itself. None of this makes them wrong —
the gym's design rests on published solver research (SPEC Appendix
A) — but per the project's own precedence rule, they are
*research-supported* claims, and the field log currently confirms
only the procedural cluster (mode 4, and the taxonomy in mode 7).

## Bottom line

The gym and the field agree on the thing the field could actually
test: **procedure beats perception as the practical risk** — settle
the grid, re-scan, commit once; both records show that lesson being
learned and then holding. The gym's perception curriculum (slivers,
boundaries, enumeration) is ahead of the field evidence rather than
behind it: plausible, research-backed, and — for its single biggest
item, crowded-scene enumeration — still waiting for a field
encounter that resembles it. The most valuable next field data isn't
more gym attempts; it's more *field log entries* (every real portal
challenge, solved or not, with its format recorded: grid type, class,
rounds, outcome), because right now a one-day, all-success sample is
being asked to validate a whole training program.
