# CAPTCHA Gym

**A self-hosted CAPTCHA training and evaluation gym for browser agents:
reCAPTCHA v2–style challenges with server-side ground truth, an
interpretable mock risk scorer, and an agent-vs-human baseline recorded
on the same challenges, under the same ruler.**

> **Project Status: Testing paused indefinitely as of October 2026 due
> to AI token consumption and operational costs. The repository remains
> available for reference, independent experimentation, and potential
> future development.**

The evaluation environment was implemented, results were collected and
documented, and testing then stopped for resource and cost reasons.
The results below are the last recorded state (final run: Run #278,
2026-10-14). The human-parity target was **not** achieved, and there is
no scheduled date to resume testing. This is a preserved research and
portfolio project — not an abandoned one, and not a validated
production system.

## Overview

CAPTCHA Gym exists to answer, with data: *where exactly does a browser
agent fail at image-grid CAPTCHAs — perception, procedure, or pace —
and do versioned written instructions measurably move the numbers?* It
serves the full shape of the real thing — a checkbox gate backed by a
mock risk engine, 3×3 grids (static and dynamic fade-and-replace), and
4×4 grids sliced from synthetic scenes *and* real photographs — and
scores every attempt server-side: per-tile true/false positives,
precision/recall, exact-board rate, procedure errors, decision times.
Ground truth never reaches the player.

No model weights were trained or fine-tuned here. "Training" means an
experimental loop over **versioned instruction documents** (play
"briefs") given to a general browser agent: draft a rule from
measured failures, validate it over a fixed sample, promote or revert
it on the numbers.

## Key capabilities

- **Full challenge surface:** checkbox gate with a mock risk scorer
  (features F1–F7, jittered bands, escalation ladder); Type A 3×3
  static and dynamic grids; Type B 4×4 grids over synthetic and
  real-photo scenes.
- **Server-side ground-truth evaluation:** synthetic masks are exact by
  construction; photo masks derive from COCO 2017 annotations. A leak
  audit asserts no ground truth escapes to any client-visible surface.
- **Two independent clocks:** a challenge round expires after 180 s
  (an unsubmitted selection scores zero); a minted token expires after
  120 s and is single-use.
- **Failure taxonomy:** every attempt is classified perception,
  procedure (empty submission, verify-too-early, expiry), or unscored
  (infrastructure) — "can't see" is never confused with "ran out of
  time."
- **Ambiguity band:** genuinely debatable tiles are excluded from
  scoring, equally for both populations.
- **Population separation:** agent sessions are tagged `live-agent`;
  human sessions use a tagged `human-<name>` link, pinned at creation,
  and are computed through the identical code path.

## Architecture

One zero-dependency Node.js server (`server.js`, Node 20+, standard
library only) serves the play page, the spectator dashboard
(`/results`), the corpora, and the scoring API on port 8931. Every
attempt is appended to `data/attempts.jsonl` with its seed, ground
truth, risk explanation, timing, and event trace; reports are
generated from that log by `tools/report.js` and
`tools/compare_report.js` — never from player self-reports. The corpus
(~340 MB) is a rebuildable build output, not committed: synthetic
tiles and scenes come from `tools/build_corpus.js` /
`tools/build_corpus_typeb.js`; the photo set is built by
`tools/build_photo_corpus.js` from COCO 2017 val, admitting **only**
CC-BY / CC-BY-SA images (637 candidates rejected on license alone) —
120 scenes across 6 classes, with per-image provenance in
`CREDITS.md`.

## Performance results

Final recorded state, frozen 2026-10-14. The photo corpus (Type B, 4×4
real photographs) is the headline benchmark — the hardest corpus and
the one the parity bar was judged on. Numbers are server-arbitrated
from `data/attempts.jsonl` and era-split by instruction version in
`TRAINING_LOG.md`; period: 2026-10-10 → 2026-10-14.

| Version / Population | Scored Attempts | Precision | Recall | Exact-Board Accuracy | Expiries |
|---|---|---|---|---|---|
| Agent — brief v1 (superseded) | 8 | .949 | .881 | 3/8 (37.5%) | 2 |
| Agent — brief v2 (**final retained**) | 1,253 | .899 | .836 | 548/1,253 (43.7%) | 89 |
| Agent — brief v2.1 (candidate, **reverted**) | 10 | .974 | .841 | 5/10 (50.0%) | 0 |
| Agent — brief v3 (candidate, **never deployed**) | 0 | — | — | — | — |
| Human baseline (owner; sample too small to be statistically meaningful) | 1 photo (2 scored total) | 1.000 | 1.000 | 1/1 | 0 |

**The human-parity target was not achieved.** The bar (from
`TRAINING_REGIMEN.md`) was a rolling 30-scored-photo-attempt window at
precision ≥ .95 **and** recall ≥ .95 **and** exact-board ≥ 90% **and**
expiry rate ≤ 10%, sustained across two consecutive windows. The final
rolling-30 window stood at precision **.909**, recall **.844**,
exact-board **12/30 (40.0%)**; only the expiry rate was inside its
limit. Read the expiry figures carefully: the v2-era rate of
**6.6%** is 89 expired rounds ÷ **1,342 total photo rounds** — the
1,253 scored attempts *plus* the 89 expired rounds themselves.
Expired rounds are unscored by definition, so the denominator is all
rounds served, not the scored-attempt count; against the 1,253 scored
attempts alone, the same 89 expiries would read 7.1%. Exact-board
accuracy was always the largest gap.

Reading the table honestly:

- **v1 → v2: a failure-mode fix, not an overall win.** In each
  version's initial validation sample — n=8 attempts apiece, far too
  small to rank the versions overall — precision rose .949 → 1.000
  and exact boards 3/8 → 6/8, and v1's dominant leak (sub-sliver
  fragment misses) dropped to zero; recall moved the other way,
  .881 → .833, on the same samples. At full scale, v2's
  1,253-attempt line (P .899 / R .836) sits *below* v1's small-sample
  precision and recall, with exact-board higher (43.7% vs 37.5%).
  What v2 verifiably improved was specific: the sliver failure mode,
  and clock discipline — the overall expiry rate fell from 11.7% in
  the earliest era to a stable ~6.6% (same rounds-served denominator
  as above).
- **v2.1 was a regression on its target and was reverted.** Its raw
  line (n=10) looks respectable, but exact-board rate trailed v2's
  validation pace and the whole-instance misses it was written to fix
  did not improve. Under the governance rule — promote only if not
  worse on precision *and* better-or-equal on the target failure mode
  — it was rolled back as candidate failure #1.
- **After that, volume stopped helping.** Cumulative v2 precision /
  recall / exact-board were .912 / .849 / 46.5% at 256 attempts
  (Run #60) and .899 / .836 / 43.7% at 1,253 attempts (Run #278). The
  most recent 425 attempts in isolation scored .908 / .831 / 42.6% —
  the same plateau, re-measured.
- **The human line is an anecdote, not a baseline.** The target was
  ≥20 scored human photo attempts; exactly **1** was ever recorded
  (TP12 / FP0 / FN0, ~17 s decision time), plus one Type A attempt, in
  3 sessions. No agent-vs-human conclusion should be drawn from it.
- **Other corpora (all-era, recomputed from the attempt log):**
  Type B synthetic — 101 attempts, P .935 / R .935, exact 66/101.
  Type A dynamic — 149 attempts, P .966 / R .975, exact 118/149.
  Type A static — 8 attempts, P .941 / R .842. Server logs record 890
  agent sessions, 806 reaching a token, and 57 empty-submission plus
  5 verify-too-early procedure errors overall.
- **Quarantined data, kept visible:** a front-end bug on 2026-10-10
  (18:46–18:53Z) silently discarded Type B clicks, producing 6
  attempts scored TP0 / FP0 / FN27 — instrumentation-invalid, excluded
  from every line above, preserved in the log. One unattributed
  walk-in session from the same day is likewise excluded.
- **Reconciliation note.** The era figures above are
  `TRAINING_LOG.md`'s per-run arbitrations. Recomputing independently
  from the raw attempt log (`data/attempts.jsonl` — filter:
  source `live-agent`, scored verify records, photo corpus, all brief
  eras pooled) gives 1,275 attempts (TP4972 / FP548 / FN966,
  P .901 / R .837, exact 562/1275). Excluded from *both* computations:
  the quarantined bug era, every human-baseline record (a separate
  population), test-harness sources (`smoke`, `deploy-check`, `e2e`),
  and expired or otherwise unscored rounds. The FP and FN sums match
  the log's era totals (548 and 966) exactly; attempts differ by +4
  and TP by +27 — four scored photo attempts present in the raw file
  that no brief era in the log accounts for, a gap first noted at
  Run #97 and still unresolved. The era-split log figures are the
  published ones; nothing was adjusted to force a match.

Full per-run history: [`TRAINING_LOG.md`](TRAINING_LOG.md).

## The untested v3 candidate — what it was, and what it was designed to fix

Brief v3 was drafted on 2026-10-11 (`BRIEF_V3_DRAFT.md`, plus
`BRIEF_V3_ADDENDUM.md`) from the failure record above, re-arbitrated
twice at larger scale (2026-10-13, 2026-10-14), and **never approved,
never deployed, and never tested** — it has zero attempts and no
results. It is documented here because its design is the project's
clearest statement of what the data said to do next:

- **Rule A — adjacency completion.** After confirming an instance,
  sweep its four neighbour tiles for partial continuations of that
  same object. Target: partial-fragment misses — 556 of the 966 photo
  false negatives (slivers: another 342; fragments together are 93%
  of all misses). V2's border sweep hunted lone slivers but
  under-weighted continuations of already-found objects.
- **Rule B — sparse-board restraint.** On boards with only 1–3
  positive tiles, switch off v2's fragment-inclusion bias for new
  tiles unless a specific object part can be named. Target:
  over-selection — sparse boards ran precision .726 at scale (FP170
  on TP450), the largest recoverable precision loss, against .961 on
  crowded boards.
- **Rule C — two-class recheck.** A targeted pre-Verify second pass
  for the vehicle classes: cars carried roughly half of all false
  positives (P .849); motorcycles paired P .948 with an exact-board
  rate of only ~21%; bicycles had the worst recall of any frequent
  class (R .761).
- **Rule D — crowded-board census (proposed, then dropped).** The
  addendum proposed a census on crowded boards after whole-instance
  misses spiked to 16.2% of false negatives in one segment.
  Re-arbitration at full scale reversed that premise: whole-instance
  misses are only ~7% of false negatives, and crowded boards are
  mid-pack or better on recall. The recommendation on file when
  testing stopped was to drop Rule D.

Had it been approved, v3 would have faced the same governance as
every candidate: ≥8 scored photo attempts, era-split, promote only if
precision is not worse *and* the target failure modes improve —
otherwise revert as candidate failure #2. Whether it would have
improved the plateau is unknown; the honest claim is narrower: its
three retained rules aimed precisely at the measured loss composition
(fragment false negatives, sparse-board false positives, vehicle-class
errors) that no amount of additional v2 volume had moved.

## Engineering decisions and tradeoffs

- **Instructions as the experimental variable.** Each brief rule cites
  the measured failure it answers to; rules that don't move numbers
  get reverted (v2.1 is the worked example). Improvements stay
  attributable — at the cost of a hard ceiling: a fresh player with no
  memory of prior runs can only improve when the brief does.
- **Era-split accounting, always.** Results are never pooled across
  brief versions, instrumentation eras, or populations, even when
  pooling would look better.
- **Exact-match grading.** A board is exact or it is not — the same
  harshness as the real thing. This multiplies per-tile error (a
  95%-per-tile player still fails most 9-positive boards), which is
  why exact-board lagged furthest behind the bar.
## Quick start

Requirements: Node 20+, no dependencies, no build step. The clone does
not contain the corpus; rebuild it, then start the server:

```sh
node tools/build_corpus.js        # Type A tiles  -> corpus/typeA/
node tools/build_corpus_typeb.js  # Type B scenes -> corpus/typeB/
node server.js                    # http://localhost:8931/ · dashboard: /results
```

The real-photo corpus is optional (the gym runs fully on synthetic
alone) and requires COCO 2017 val annotations plus
`node tools/build_photo_corpus.js`; without it, `force_type_b_photo`
fails loudly with HTTP 503 rather than silently falling back.
Verification suites exist (`tools/e2e_test.js`, `tools/leak_audit.js`,
`tools/validate_corpus.js`); at the reference install on 2026-10-10
they reported e2e 164 / 0 failed, leak audit 33 / 0, 1,880 corpus PNGs
valid. They were **not** re-run for this closeout. Scenarios are
selected by query string (`?scenario=` — `natural`, `force_static`,
`force_dynamic`, `force_type_b`, `force_type_b_photo`,
`force_high_trust`, `force_low_trust`); see `AGENT_BRIEF.md` for play
doctrine and `SPEC.md` for the design.

## Known limitations and unresolved challenges

1. **Fidelity.** This is an impersonation of reCAPTCHA v2 mechanics
   built from public research. The mock risk scorer's weights are
   design choices; Google's are unpublished and unknowable from here,
   and production risk decisions lean on IP/account reputation no
   local harness can simulate.
2. **The fragment ceiling.** Whole-tile recall was ~95%, but partial
   tiles scored ~84% and slivers ~61% — and fragments are 75% of all
   scored positive tiles. That perception limit, not procedure or
   pace, is what parity died on.
3. **The human baseline never materialized** (n=1 photo attempt
   against a target of ≥20), so the agent-vs-human comparison the gym
   was built to publish cannot be drawn from this data.
4. **Finite, self-made corpus.** 120 photo scenes is a transfer probe,
   not a distribution; results do not generalize to production CAPTCHA
   difficulty.
5. **Tokens minted here are meaningless outside the gym**, and
   decision-time comparisons carry a disclosed asymmetry (the agent
   plays through a managed browser; the human plays direct).

## Project status and future work

Testing is paused indefinitely (see the status box at the top); the
training cron is disabled and the gym servers are stopped. The frozen
record is: 278 logged training runs, a final retained brief of **v2**,
one reverted candidate (v2.1), one untested candidate (v3), and the
parity target unachieved. If work resumes, the documented next steps
are, in order: a ruling on validating brief v3 (Rules A + B + C as
drafted, Rule D dropped), banking a real human baseline, and only
then re-evaluating the parity bar. The graduation path planned for a
successful outcome — folding the final validated brief into
`SKILL.md` as a shipped technique and retiring to regression-only
training — was never triggered.

## Scope and ethics

The gym trains and evaluates **your own agent, on your own site**. It
is not a CAPTCHA-solving service, must never be pointed at third-party
sites, and nothing here interoperates with real reCAPTCHA (no Google
JS, no sitekeys, no token injection). Human-baseline play is by the
project's owner, recorded with consent, and published in aggregate
only.

## Documentation

`SPEC.md` — design authority · `BUILD_NOTES.md` — build journal ·
`AGENT_BRIEF.md` — versioned play briefs (v2 final; v2.1 reverted) ·
`BRIEF_V3_DRAFT.md` / `BRIEF_V3_ADDENDUM.md` — the untested candidate,
held out of the published repository pending an owner ruling ·
`TRAINING_REGIMEN.md` — protocol and parity bar · `TRAINING_LOG.md` —
full scoreboard (278 runs) · `HUMAN_BASELINE.md` — human protocol ·
`CREDITS.md` — corpus licensing · `SKILL.md` — the gym as a Muse
skill · `AGENTS.md` — house rules.

## License

MIT — see `LICENSE`. Photo-corpus images remain under their original
CC licenses (see `CREDITS.md`).
