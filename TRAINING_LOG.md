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
- v2: 27 attempts — P .943 / R .805 / exact 16/27 / expiries 2
- v2.1: FINAL — 10 attempts — P .974 / R .841 / exact 5/10 / expiries 0. REVERTED after Run #2 (see AGENT_BRIEF.md); play returns to v2.
- Current brief for play: v2 (validated). Parity window (rolling 30 scored photo attempts under the current brief): v2 stands at 27/30 — window incomplete, parity not evaluable yet.

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

### Run #2 — first continuous run (2026-10-10, brief v2.1 candidate)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-10T23:52:42Z–00:07:29Z, source live-agent,
7 scored attempts total.
- Photo (designated sessions, 3 attempts): TP21 / FP0 / FN1 — P 1.000,
  R .955, exact-board 2/3 (motorcycle FN1; car and bus boards perfect).
- Photo (rotating session also served 2 photo rounds; counted here —
  same brief, corpus-split): TP4 / FP0 / FN4 — motorcycle FN2 and a car
  board submitted empty (procedure error: empty_submission).
- Photo run total: 5 attempts — TP25 / FP0 / FN5, P 1.000, R .833,
  exact-board 2/5, expiries 0.
- Synthetic (rotating session): 2 attempts — TP11 / FP0 / FN1,
  P 1.000, R .917, exact-board 1/2 (traffic light FN1; stairs perfect).
- Running per-brief photo totals: v2.1 = 10 attempts — TP37 / FP1 / FN7,
  P .974, R .841, exact-board 5/10, expiries 0.
- Brief governance: v2.1 reached ≥8 scored photo attempts → evaluated
  vs v2 (P 1.000 / R .833 / exact 6/8 / expiries 2). REVERTED: precision
  worse, exact-board worse, whole-instance FN mode unimproved; only the
  expiry mode improved (0 vs 2). Reasoning recorded in AGENT_BRIEF.md.
  Play returns to v2. Candidate failure #1 toward the stall brake.
- Infra incidents: none with the gym/tunnel (both active, HTTP 200 at
  pre-flight). The known CAPTCHA-preference glitch fired on sessions 2
  and 3; each was verified via get_captcha_preference (solve/all_tasks)
  and steered once, then played clean.
- Dominant failure mode: whole-instance/region misses on photo boards
  (all 5 photo FNs), unchanged from the v2 era.
- Parity-window status: NOT PARITY. Rolling-30 window under the current
  brief is incomplete (v2: 8/30 scored photo attempts banked). Recall
  remains the binding constraint (~.83–.84 across v2/v2.1 eras vs the
  .95 bar).

### Run #3 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T00:52:28Z–00:59:59Z, source live-agent,
3 scored attempts total.
- Photo (designated sessions): 3 attempts — TP14 / FP0 / FN1, P 1.000,
  R .933, exact-board 2/3, expiries 0. Bicycle board missed 1 partial
  tile (TP2/FN1, fail then passed on the car round); car board perfect
  (TP4); bus board perfect (TP8).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 11 attempts — TP44 / FP0 / FN7,
  P 1.000, R .863, exact-board 8/11, expiries 2 (both from the earlier
  v2 era; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING
  (VM replaced — systemctl reported units not found, tunnel returned
  502). Revived per protocol: tools/install_services.sh reinstalled
  and enabled both units, services started, LIVE_URL.txt tunnel
  (https://3bab56cead70b0.lhr.life) verified HTTP 200 (local 200 too)
  before any play. The known CAPTCHA-preference glitch fired on all
  3 sessions; each was verified via get_captcha_preference
  (solve/all_tasks) and steered once, then played clean.
- Dominant failure mode: a single partial-tile miss on the bicycle
  board (1 FN total this run; no whole-instance cluster miss this time).
- Parity-window status: NOT PARITY. Rolling-30 window under the
  current brief is incomplete (v2: 11/30 scored photo attempts
  banked). Running recall .863 remains the binding constraint vs the
  .95 bar; precision is at 1.000 and exact-board 8/11 = 72.7% vs the
  90% bar.

### Run #4 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #3's natural). Sessions: 3
played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T01:26:12Z–01:33:06Z, source live-agent,
3 scored attempts total.
- Photo (designated sessions): 2 attempts — TP5 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Both bicycle boards perfect
  (TP4 and TP1).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (bus board, incl. one replacement bus correctly picked after fade).
- Running per-brief photo totals: v2 = 13 attempts — TP49 / FP0 / FN7,
  P 1.000, R .875, exact-board 10/13, expiries 2 (both from the earlier
  v2 era; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b1c564cf454047.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on session 3 only; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then played clean.
- Dominant failure mode: none this run — zero FNs, zero FPs across
  all corpora; the historical binding mode (whole-instance misses on
  crowded car scenes) did not appear (both photo boards were bicycle).
- Parity-window status: NOT PARITY. Rolling-30 window under the
  current brief is incomplete (v2: 13/30 scored photo attempts
  banked). Running recall .875 remains the binding constraint vs the
  .95 bar; precision is at 1.000 and exact-board 10/13 = 76.9% vs the
  90% bar.

### Run #5 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #4's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T01:46:00Z–01:52:24Z, source live-agent,
4 scored attempts total.
- Photo (designated sessions): 3 attempts — TP7 / FP3 / FN0, P .700,
  R 1.000, exact-board 2/3, expiries 0. Session 1 car board perfect
  (TP4). Session 2: car board failed with TP1 / FP3 / FN0, then a
  fire-hydrant board passed perfect (TP2).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (stairs board; single matching tile correctly picked, replacement
  re-scanned, then Verify).
- Running per-brief photo totals: v2 = 16 attempts — TP56 / FP3 / FN7,
  P .949, R .889, exact-board 12/16, expiries 2 (both from the earlier
  v2 era; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b1c564cf454047.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on session 3 only; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then played clean.
- Dominant failure mode: false picks on a single photo car board
  (FP3 in one attempt) — the first FPs under v2; all other boards
  this run were exact, with zero FNs.
- Parity-window status: NOT PARITY. Rolling-30 window under the
  current brief is incomplete (v2: 16/30 scored photo attempts
  banked). Running precision .949 and recall .889 remain below the
  .95 bars; exact-board 12/16 = 75.0% vs the 90% bar.

### Run #6 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #5's force_low_trust).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 1
ended in terminal cooldown ("Too many attempts") after 6 failed rounds.
Window arbitrated: 2026-10-11T02:08:00Z–02:20:32Z, source live-agent,
9 scored attempts total.
- Photo (designated sessions): 7 attempts — TP29 / FP2 / FN17, P .935,
  R .630, exact-board 1/7, expiries 0. Session 1 (6 attempts, no token):
  car TP1/FN1, fire_hydrant TP8/FN8, traffic_light TP3/FP1/FN0,
  fire_hydrant TP1/FP1/FN5, bus TP7/FN2, bicycle TP3/FN1. Session 2:
  bus board perfect (TP6) with token.
- Photo (rotating session also served 1 photo round; counted here —
  same brief, corpus-split): car board perfect (TP3).
- Photo run total: 8 attempts — TP32 / FP2 / FN17, P .941, R .653,
  exact-board 2/8, expiries 0.
- Synthetic (rotating session): 1 attempt — TP2 / FP2 / FN0,
  P .500, R 1.000, exact-board 0/1 (tractor board failed, then the
  session passed on the photo car round above).
- Running per-brief photo totals: v2 = 24 attempts — TP88 / FP5 / FN24,
  P .946, R .786, exact-board 14/24, expiries 2 (both from the earlier
  v2 era; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b1c564cf454047.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on all 3 sessions; each
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then played clean.
- Dominant failure mode: large under-selection on photo fire-hydrant
  boards — 13 of this run's 17 photo FNs came from the two hydrant
  boards in session 1 (FN8 and FN5).
- Parity-window status: NOT PARITY. Rolling-30 window under the
  current brief is incomplete (v2: 24/30 scored photo attempts
  banked). Running precision .946 is just below the .95 bar and
  recall .786 fell sharply this run vs the .95 bar; exact-board
  14/24 = 58.3% vs the 90% bar.

### Run #7 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #6's force_type_b). Sessions: 3
played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T02:25:52Z–02:31:55Z, source live-agent,
3 scored attempts total.
- Photo (designated sessions): 3 attempts — TP11 / FP1 / FN0, P .917,
  R 1.000, exact-board 2/3, expiries 0. Session 1: bus board perfect
  (TP7). Session 2: car board failed TP1 / FP1 / FN0, then a
  traffic-light board passed perfect (TP3).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 27 attempts — TP99 / FP6 / FN24,
  P .943, R .805, exact-board 16/27, expiries 2 (both from the earlier
  v2 era; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b1c564cf454047.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on sessions 1 and 3; each
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then played clean. Session 2 played clean with no pause.
- Dominant failure mode: a single false pick on one photo car board
  (FP1 in one attempt) — zero FNs this run; the historical
  whole-instance miss mode did not appear.
- Parity-window status: NOT PARITY. Rolling-30 window under the
  current brief is incomplete (v2: 27/30 scored photo attempts
  banked). Running precision .943 is just below the .95 bar and
  recall .805 remains the binding constraint vs the .95 bar;
  exact-board 16/27 = 59.3% vs the 90% bar.
