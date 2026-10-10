# CAPTCHA Gym — training log & scoreboard

Durable record of agent play. All numbers arbitrated from the server's own
attempt logs (`data/attempts.jsonl`, source `live-agent` only), never from
agent self-reports alone. Reporting is ALWAYS era-split (see
TRAINING_REGIMEN.md). Excluded forever: the bug-era attempts (below) and the
unattributed walk-in session of 2026-10-10 ~19:52Z.

## Eras

### v1 era — synthetic, original brief (2026-10-10, pre-Type-B-fix)
3 cold sessions, 3 tokens. Scored attempts: 4 — TP10 / FP0 / FN0, all pass.
Known defect at the time: one tile rendered as a broken image (root cause
found later: chunked responses with no Content-Length through the tunnel).

### BUG ERA — QUARANTINED, instrumentation-invalid (2026-10-10 18:46–18:53Z)
6 Type B attempts, TP0 / FP0 / FN27. Cause: app.js dispatch fall-through —
Type B clicks died silently in the handler, every Verify submitted an empty
selection. NOT agent failures; never counted in any baseline. Fixed; see
BUILD_NOTES.md.

### Post-fix synthetic — first training batch (2026-10-10)
5 sessions, 5 tokens (incl. 1 checkbox-only pass, no perception data).
Scored attempts: 4 — TP19 / FP0 / FN0, exact-board 4/4.

### Photo corpus — brief v1 (2026-10-10)
3 sessions, 3 tokens. Scored attempts: 8 — TP37 / FP2 / FN5.
Precision .949, recall .881, exact-board 3/8. Expiries: 2 (both traffic
light; one held a pixel-perfect unsubmitted selection).
Failure modes: sub-sliver borderline fragments judged "on the line" (3 FN);
one bus-vs-car boundary → the only 2 FPs in agent gym history; single
partial-tile misses on huge multi-instance rounds.

### Photo corpus — brief v2 (2026-10-10)
9 sessions, 9 tokens (incl. 3 checkbox-only passes served before the
force-scenario fix; no perception data from those). Scored attempts: 8 —
TP30 / FP0 / FN6. Precision 1.000, recall .833, exact-board 6/8.
Expiries: 2 (one counterfactually perfect bus board, would-be TP9/0/0).
Failure modes: ZERO sliver misses (v1's main leak, closed). All 6 FNs were
whole-instance misses on crowded multi-instance car scenes (9-positive
board missed 4; beach-rental board missed 2, twice, two agents).

## Running totals by brief (photo corpus)
- v1: 8 attempts — P .949 / R .881 / exact 3/8 / expiries 2
- v2: 8 attempts — P 1.000 / R .833 / exact 6/8 / expiries 2
- v2.1: candidate — 5 attempts so far (batch #1) — P .923 / R .857 / exact 3/5 / expiries 0. Validates at ≥8.

## Batch entries
(Appended per batch by the regimen: date, batch #, brief version,
composition, per-corpus scored attempts with TP/FP/FN, exact-board,
expiries, tokens, infra incidents, failure-mode notes.)

### Batch #1 — shakedown (2026-10-10, brief v2.1 candidate)
Composition: 3 photo sessions (shakedown scope). Sessions: 4 played,
3 tokens; 1 session lost to a tunnel death mid-round (traffic-light
round never reached the server — unscored, replaced per protocol).
Scored photo attempts: 5 — TP12 / FP1 / FN2. Precision .923,
recall .857, exact-board 3/5, expiries 0.
Notes: census produced a perfect 4-tile bottom-strip sweep incl. the
right-edge sliver car (session 1) and a clean 6-tile hydrant map
(session 2, 2 band picks). Failures: an aerial parking-lot board where
the counted cluster was mapped one row too high (FP1 on the over-mapped
tile, FN1 on the true tile below the band tile), and a single partial
tile missed beside a correctly-called tail-light fragment. FP1 is the
first false pick since brief v1. v2.1 remains CANDIDATE (needs ≥8
scored photo attempts; at 5).
