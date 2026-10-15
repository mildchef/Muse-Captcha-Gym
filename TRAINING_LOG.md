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
- v2: 1253 attempts — P .899 / R .836 / exact 548/1253 / expiries 89
- v2.1: FINAL — 10 attempts — P .974 / R .841 / exact 5/10 / expiries 0. REVERTED after Run #2 (see AGENT_BRIEF.md); play returns to v2.
- Current brief for play: v2 (validated). Parity window (rolling 30 scored photo attempts): latest window evaluated by server after Run #278 (final run) — P .909 / R .844 / exact 12/30 = 40.0% / v2 photo expiry rate overall 89/1342 = 6.6% — does NOT clear the bar; parity not declared.
- PROJECT PAUSED INDEFINITELY as of 2026-10-14 (owner decision). See the Closeout entry at the end of this log and README.md "Performance results".

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

### Run #8 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #7's natural). Sessions: 3
played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T02:49:11Z–02:57:45Z, source live-agent,
4 scored attempts total, plus 1 unscored expired attempt.
- Photo (designated sessions): 3 attempts — TP10 / FP1 / FN0, P .909,
  R 1.000, exact-board 2/3, expiries 0. Session 1: car board perfect
  (TP3). Session 2: motorcycle board failed TP5 / FP1 / FN0, then a
  car board passed perfect (TP2).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 scored
  attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1
  (bus board pass), plus 1 unscored challenge_expired attempt on a
  first bus round (expiry 1 in this rotating session; session then
  re-checked and passed).
- Running per-brief photo totals: v2 = 30 attempts — TP109 / FP7 / FN24,
  P .940, R .820, exact-board 18/30, expiries 2 (both from the earlier
  v2 era; 0 photo expiries this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b1c564cf454047.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on session 1 only; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then played clean. Sessions 2 and 3 played clean with no pause.
- Dominant failure mode: a single false pick on one photo motorcycle
  board (FP1 in one attempt) — zero FNs this run; the historical
  whole-instance miss mode did not appear.
- Parity-window status: NOT PARITY. The rolling-30 window under v2
  is now complete for the first time (30/30 scored photo attempts):
  precision .940 is below the .95 bar, recall .820 is well below the
  .95 bar, and exact-board 18/30 = 60.0% is below the 90% bar; photo
  expiry rate (2/~32 rounds, ~6%) is within the ≤10% limit. This is
  a failed first window, so no consecutive-window count toward parity.

### Run #10 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #8's force_dynamic;
see reconciliation note below on rotation numbering). Sessions: 3
played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T03:27:31Z–03:34:35Z, source live-agent,
3 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 2 attempts — TP3 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 1. Session 1: bicycle board
  perfect (TP2). Session 2: fire-hydrant round expired unscored
  (challenge_expired), then a car board passed perfect (TP1).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (traffic-light board; all 3 initial tiles faded/replaced, re-scan
  clean, then Verify).
- Running per-brief photo totals (TRAINING_LOG-based, Run #8 + this
  run): v2 = 32 attempts — TP112 / FP7 / FN24, P .941, R .824,
  exact-board 20/32, expiries 3.
- RECONCILIATION NOTE — unlogged intervening run (presumed Run #9):
  server records show 2 photo sessions at 2026-10-11T03:09:23Z–
  03:19:45Z (before this run, after Run #8) that were NOT in
  TRAINING_LOG at this run's pre-flight or at logging time, with no
  rotating session recorded: 4 scored photo attempts — TP9 / FP0 /
  FN5, exact-board 2/4 (bus TP3/FN3; car TP2 perfect; bicycle
  TP0/FN2 with empty_submission; traffic_light TP4 perfect), plus 1
  unscored challenge_expired motorcycle attempt. This run is numbered
  #10 chronologically. If that run is logged later, do NOT re-add its
  attempts to the totals: server-reconciled v2 totals INCLUDING it
  and this run are 36 attempts — TP121 / FP7 / FN29, P .945,
  R .807, exact-board 22/36, expiries 4.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING
  (VM replaced — systemctl reported units not found, tunnel returned
  502, local port dead). Revived per protocol:
  tools/install_services.sh reinstalled and enabled both units,
  services started, LIVE_URL.txt tunnel
  (https://b1c564cf454047.lhr.life) verified HTTP 200 (local 200 too)
  before any play. No CAPTCHA-preference pause was reported in any
  of the 3 sessions this run; all played clean.
- Dominant failure mode: none in scored play this run — zero FPs and
  zero FNs across all corpora; the only loss was the 180 s expiry of
  the photo fire-hydrant round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window under v2
  (server, incl. intervening attempts): P .931 below the .95 bar,
  R .790 well below the .95 bar, exact-board 17/30 = 56.7% below the
  90% bar; v2 photo expiry rate overall 4/40 = 10.0%, at (not over)
  the ≤10% limit. No consecutive-window count toward parity.

### Run #11 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #10's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T03:46:07Z–03:59:32Z, source live-agent,
5 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 4 attempts — TP11 / FP1 / FN1, P .917,
  R .917, exact-board 2/4, expiries 1. Session 1: motorcycle board
  failed TP5 / FP1 / FN0, then a bus board passed perfect (TP1).
  Session 2: motorcycle board failed TP3 / FP0 / FN1 (partial band),
  a traffic-light round expired unscored (challenge_expired), then a
  car board passed perfect (TP2).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP4 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (taxi board pass;
  1 ambiguity-band tile excluded from scoring by the server).
- Running per-brief photo totals (server-reconciled, incl. the
  unlogged intervening run from Run #10's note): v2 = 40 attempts —
  TP132 / FP8 / FN30, P .943, R .815, exact-board 24/40, expiries 5.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b1c564cf454047.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in any of the 3 sessions;
  all played clean.
- Dominant failure mode: mixed small errors — one false pick on the
  first motorcycle board (FP1) and one partial-tile miss on the
  second (FN1), plus the traffic-light expiry; no whole-instance
  cluster miss this run.
- Parity-window status: NOT PARITY. Rolling-30 window under v2
  (server): P .923 below the .95 bar, R .807 well below the .95 bar,
  exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate
  overall 5/45 = 11.1%, now OVER the ≤10% limit. No
  consecutive-window count toward parity.

### Run #12 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #11's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T04:05:52Z–04:12:34Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP11 / FP0 / FN2, P 1.000,
  R .846, exact-board 2/3, expiries 0. Session 1: car board failed
  TP2 / FN2, then a car board passed perfect (TP2). Session 2: bus
  board passed perfect (TP7).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 43 attempts — TP143 / FP8 / FN32,
  P .947, R .817, exact-board 26/43, expiries 5 (all from earlier
  v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b1c564cf454047.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on session 2 only; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then played clean. Sessions 1 and 3 played clean.
- Dominant failure mode: a single partial/whole-tile miss pair on one
  photo car board (FN2 in one attempt) — zero FPs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .922 below the .95 bar, R .790 well
  below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar;
  v2 photo expiry rate overall 5/48 = 10.4%, just over the ≤10%
  limit. No consecutive-window count toward parity.

### Run #13 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #12's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T04:28:29Z–04:46:25Z, source live-agent,
6 scored attempts total, plus 2 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP32 / FP1 / FN3, P .970,
  R .914, exact-board 2/5, expiries 1. Session 1: motorcycle board
  failed TP6 / FN2 (partial + sliver), then a bus board passed
  perfect (TP8). Session 2: a motorcycle round expired unscored
  (challenge_expired), then motorcycle boards failed TP5 / FP1 / FN0
  and TP12 / FP0 / FN1 (partial), then a motorcycle board passed
  perfect (TP1).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 scored
  attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1,
  expiries 1 (a bus round expired unscored, then a bridge board
  passed perfect).
- Running per-brief photo totals: v2 = 48 attempts — TP175 / FP9 /
  FN35, P .951, R .833, exact-board 28/48, expiries 6.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b1c564cf454047.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on session 3 only; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then played clean. Sessions 1 and 2 played clean.
- Dominant failure mode: partial/sliver misses on photo motorcycle
  boards (all 3 photo FNs this run, all on motorcycle boards), plus
  1 false pick on a motorcycle board and 2 round expiries (1 photo,
  1 dynamic).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .950 at the bar, R .810 well below
  the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo
  expiry rate overall 6/54 = 11.1%, over the ≤10% limit. No
  consecutive-window count toward parity.

### Run #14 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #13's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T04:48:42Z–04:58:38Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP15 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: traffic-light board
  passed perfect (TP3). Session 2: bus board passed perfect (TP12).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (palm-tree board; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 50 attempts — TP190 / FP9 /
  FN35, P .955, R .844, exact-board 30/50, expiries 6 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b1c564cf454047.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on all 3 sessions; each
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then played clean.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; both photo boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .968 clears the .95 bar, R .896 remains
  below the .95 bar, exact-board 18/30 = 60.0% below the 90% bar;
  v2 photo expiry rate overall 6/56 = 10.7%, still over the ≤10%
  limit. No consecutive-window count toward parity.

### Run #15 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #14's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T05:06:17Z–05:17:08Z, source live-agent,
5 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 2 attempts — TP3 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 1. Session 1: bus round expired
  unscored (challenge_expired), then a car board passed perfect (TP1).
  Session 2: fire-hydrant board passed perfect (TP2).
- Photo (rotating session also served 1 photo round; counted here —
  same brief, corpus-split): traffic-light board failed TP1 / FP1 /
  FN0 (2 ambiguity errors recorded by the server).
- Photo run total: 3 attempts — TP4 / FP1 / FN0, P .800, R 1.000,
  exact-board 2/3, expiries 1.
- Synthetic (rotating session): 2 attempts — TP13 / FP1 / FN0,
  P .929, R 1.000, exact-board 1/2, expiries 0 (mountain board failed
  TP6 / FP1 / FN0; fire-hydrant board passed perfect TP7).
- Running per-brief photo totals: v2 = 53 attempts — TP194 / FP10 /
  FN35, P .951, R .847, exact-board 32/53, expiries 7.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b1c564cf454047.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on sessions 1 and 3; each
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then played clean. Session 2 played clean.
- Dominant failure mode: false picks — 1 FP on the photo traffic-light
  board and 1 FP on the synthetic mountain board; zero FNs this run.
  The other loss was the 180 s expiry of the photo bus round
  (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .956 clears the .95 bar, R .908 remains
  below the .95 bar, exact-board 19/30 = 63.3% below the 90% bar;
  v2 photo expiry rate overall 7/60 = 11.7%, over the ≤10% limit.
  No consecutive-window count toward parity.

### Run #17 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #15's force_type_b; rotation based
on the last logged run, per the Run #10 precedent). Sessions: 4 played
(1 natural attempt lost to a tunnel death and replaced), 1 token,
0 other sessions lost to infrastructure.
Window arbitrated: 2026-10-11T05:46:56Z–06:17:26Z, source live-agent,
9 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 8 attempts — TP38 / FP5 / FN10, P .884,
  R .792, exact-board 0/8, expiries 0. Session 1 (6 attempts, no
  token, terminal cooldown): car TP3/FP4/FN1, motorcycle TP4/FN2,
  car TP2/FN1, motorcycle TP7/FP1/FN1, bus TP5/FN1, motorcycle
  TP6/FN1. Session 2 (2 attempts, no token, no terminal server
  event — the agent reported its 3rd round stuck identical across
  repeated verifies, but the server recorded only these 2 scored
  attempts): fire_hydrant TP6/FN2, motorcycle TP5/FN1.
- Rotating (natural): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000,
  exact-board 1/1, expiries 0 (synthetic crosswalk board, pass,
  token). The first natural attempt never reached the server
  (tunnel death, "no tunnel" page — unscored, replaced per protocol
  at the new URL and passed).
- Running per-brief photo totals (server-reconciled, incl. the
  unlogged intervening run below): v2 = 66 attempts — TP256 / FP16 /
  FN53, P .941, R .828, exact-board 33/66, expiries 8.
- RECONCILIATION NOTE — unlogged intervening run (presumed Run #16):
  server records show 2 completed photo sessions at
  2026-10-11T05:26:21Z–05:37:38Z (after Run #15, before this run)
  that were NOT in TRAINING_LOG, plus a 3rd session created at
  05:38:27Z that never recorded an attempt (lost when the VM /
  services died): 5 scored photo attempts — TP24 / FP1 / FN8,
  P .960, R .750, exact-board 1/5, plus 1 unscored challenge_expired
  car attempt; 1 token (session 2 passed on a fire-hydrant board).
  This run is numbered #17 chronologically. Do NOT re-add its
  attempts: the running totals above already include them.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING
  (VM replaced — systemctl reported units not found, tunnel 502,
  local port dead). Revived per protocol: tools/install_services.sh
  reinstalled and enabled both units, services started, LIVE_URL.txt
  tunnel (https://b1c564cf454047.lhr.life) verified HTTP 200 (local
  200 too) before any play. Mid-run the tunnel died before session 3;
  supervision restarted it at a NEW URL
  (https://b8658ece85752f.lhr.life, verified HTTP 200) and the lost
  natural session was replaced there. The known
  CAPTCHA-preference glitch fired on session 2 only; it was verified
  via get_captcha_preference (solve/all_tasks) and steered once,
  then played. Sessions 1 and 3 played clean.
- Dominant failure mode: spread under-selection on photo boards —
  FN in all 8 photo attempts and zero exact photo boards this run,
  plus an FP4 blowup on the first car board (4 of the run's 5 FPs
  in a single attempt).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .938 below the .95 bar, R .849 well
  below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar;
  v2 photo expiry rate overall 8/74 = 10.8%, over the ≤10% limit.
  No consecutive-window count toward parity.

### Run #18 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #17's natural). Sessions: 3
played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T06:20:57Z–06:25:16Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP4 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: bus board passed
  perfect (TP2). Session 2: car board passed perfect (TP2; 1
  ambiguity-band tile excluded from scoring by the server).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP8 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (bridge board; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 68 attempts — TP260 / FP16 /
  FN53, P .942, R .831, exact-board 35/68, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b8658ece85752f.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in any of the 3 sessions;
  all played clean.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .943 below the .95 bar, R .847 well
  below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar;
  v2 photo expiry rate overall 8/76 = 10.5%, just over the ≤10%
  limit. No consecutive-window count toward parity.

### Run #19 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #18's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T06:27:41Z–06:36:40Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP17 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: motorcycle board
  passed perfect (TP16, all 16 tiles). Session 2: bicycle board
  passed perfect (TP1; 1 ambiguity-band tile excluded from scoring
  by the server).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (car board; dynamic replacements re-scanned until no tile matched,
  then Verify).
- Running per-brief photo totals: v2 = 70 attempts — TP277 / FP16 /
  FN53, P .945, R .839, exact-board 37/70, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b8658ece85752f.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on sessions 1 and 3; each
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then played clean. Session 2 played clean.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .948 below the .95 bar, R .863 well
  below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar;
  v2 photo expiry rate overall 8/78 = 10.3%, just over the ≤10%
  limit. No consecutive-window count toward parity.

### Run #20 — continuous run (2026-10-10, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #19's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T06:48:07Z–06:51:43Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP10 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: fire-hydrant board
  passed perfect (TP8). Session 2: car board passed perfect (TP2).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP4 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (mountain board
  pass).
- Running per-brief photo totals: v2 = 72 attempts — TP287 / FP16 /
  FN53, P .947, R .844, exact-board 39/72, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b8658ece85752f.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on sessions 1 and 3; each
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then played clean. Session 2 played clean.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .950 at the bar, R .878 well below
  the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo
  expiry rate overall 8/80 = 10.0%, at (not over) the ≤10% limit.
  No consecutive-window count toward parity.

### Run #21 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #20's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T07:08:04Z–07:11:26Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP14 / FP0 / FN2, P 1.000,
  R .875, exact-board 2/3, expiries 0. Session 1: bicycle board failed
  TP2 / FN2 (sliver + partial), then a fire-hydrant board passed
  perfect (TP8). Session 2: car board passed perfect (TP4).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 75 attempts — TP301 / FP16 /
  FN55, P .950, R .846, exact-board 41/75, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b8658ece85752f.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on all 3 sessions; each
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then played clean.
- Dominant failure mode: sliver + partial misses on a single photo
  bicycle board (both FNs in one attempt) — zero FPs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .947 below the .95 bar, R .873 well
  below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar;
  v2 photo expiry rate overall 8/83 = 9.6%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #22 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #21's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T07:25:59Z–07:39:11Z, source live-agent,
4 scored attempts total, plus 2 unscored rotating attempts.
- Photo (designated sessions): 3 attempts — TP16 / FP0 / FN1, P 1.000,
  R .941, exact-board 2/3, expiries 0. Session 1: fire-hydrant board
  failed TP2 / FN1, then a car board passed perfect (TP4). Session 2:
  motorcycle board passed perfect (TP10).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 scored
  attempt — TP0 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1,
  expiries 1, plus 1 unscored verify_too_early attempt. Bus round
  expired unscored (challenge_expired), chimney round failed
  unscored (verify_too_early), then a fire-hydrant round with no
  matching tile passed with an empty selection and token.
- Running per-brief photo totals: v2 = 78 attempts — TP317 / FP16 /
  FN56, P .952, R .850, exact-board 43/78, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b8658ece85752f.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on sessions 1 and 2;
  each was verified via get_captcha_preference (solve/all_tasks)
  and steered once, then played clean. Session 3 played clean.
- Dominant failure mode: a single partial-tile miss on the photo
  fire-hydrant board (the run's only FN) — zero FPs across all
  corpora; rotating losses were procedural (1 expiry, 1
  verify_too_early), both unscored.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .953 clears the .95 bar, R .871 well
  below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar;
  v2 photo expiry rate overall 8/86 = 9.3%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #23 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #22's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T07:47:55Z–07:55:34Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP18 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: fire-hydrant board
  passed perfect (TP16). Session 2: traffic-light board passed
  perfect (TP2; 2 ambiguity errors recorded by the server, excluded
  from scoring).
- Rotating (force_low_trust, synthetic): 2 attempts — TP17 / FP0 /
  FN1, P 1.000, R .944, exact-board 1/2, expiries 0. Fire-hydrant
  board failed TP8 / FN1, session entered a 58 s cooldown, then a
  crosswalk board passed perfect (TP9) with token.
- Running per-brief photo totals: v2 = 80 attempts — TP335 / FP16 /
  FN56, P .954, R .857, exact-board 45/80, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b8658ece85752f.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on session 1 only; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then played clean. Sessions 2 and 3 played clean.
- Dominant failure mode: a single missed tile on the synthetic
  fire-hydrant board (the run's only FN) — zero FPs and zero photo
  FNs this run; both photo boards were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .954 clears the .95 bar, R .873 well
  below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar;
  v2 photo expiry rate overall 8/88 = 9.1%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #24 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #23's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T08:08:29Z–08:15:56Z, source live-agent,
7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP18 / FP5 / FN0, P .783,
  R 1.000, exact-board 2/6, expiries 0. Session 1: car board passed
  perfect (TP1). Session 2 (5 rounds): fire_hydrant failed TP2 / FP1,
  motorcycle failed TP5 / FP1, car failed TP3 / FP1, bicycle failed
  TP4 / FP2, then a car board passed perfect (TP3).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP6 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (crosswalk board
  pass).
- Running per-brief photo totals: v2 = 86 attempts — TP353 / FP21 /
  FN56, P .944, R .863, exact-board 47/86, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING
  (VM replaced — systemctl reported units not found, tunnel returned
  502, local port dead). Revived per protocol:
  tools/install_services.sh reinstalled and enabled both units,
  services started, LIVE_URL.txt tunnel
  (https://b8658ece85752f.lhr.life) verified HTTP 200 (local 200 too)
  before any play. The known CAPTCHA-preference glitch fired on
  session 3 only; it was verified via get_captcha_preference
  (solve/all_tasks) and steered once, then played clean. Sessions 1
  and 2 played clean.
- Dominant failure mode: false picks on photo boards — all 5 FPs
  came from session 2's four failed boards (FP1–2 each on
  fire-hydrant, motorcycle, car, and bicycle boards); zero FNs
  this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .937 below the .95 bar, R .914 below
  the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo
  expiry rate overall 8/94 = 8.5%, within the ≤10% limit. No
  consecutive-window count toward parity.

### Run #25 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #24's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T08:27:05Z–08:29:58Z, source live-agent,
5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP12 / FP0 / FN9, P 1.000,
  R .571, exact-board 2/5, expiries 0. Session 1: car board failed
  TP3 / FN2 (sliver, sliver), car board failed TP5 / FN3 (sliver,
  sliver, partial), then a fire-hydrant board passed perfect (TP2).
  Session 2: car board failed TP0 / FP0 / FN4 (partial ×4,
  empty_submission procedure error), then a bus board passed
  perfect (TP2).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 91 attempts — TP365 / FP21 /
  FN65, P .946, R .849, exact-board 49/91, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b8658ece85752f.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in any of the 3 sessions;
  all played clean in a single sequential browser task.
- Dominant failure mode: under-selection on photo car boards — all
  9 FNs came from the three car boards (sliver/partial misses, incl.
  one empty submission TP0 / FN4); zero FPs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .958 clears the .95 bar, R .885 below
  the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo
  expiry rate overall 8/99 = 8.1%, within the ≤10% limit. No
  consecutive-window count toward parity.

### Run #26 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #25's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T08:47:31Z–08:56:39Z, source live-agent,
5 scored attempts total, plus 1 unscored expired attempt.
- Photo (designated sessions): 4 attempts — TP15 / FP2 / FN1, P .882,
  R .938, exact-board 2/4, expiries 0. Session 1: motorcycle board
  failed TP3 / FP2 / FN0, then a bicycle board passed perfect (TP2).
  Session 2: bus board failed TP8 / FP0 / FN1 (partial), then a
  fire-hydrant board passed perfect (TP2).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 scored
  attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1,
  expiries 1 (a motorcycle round expired unscored, then a stairs
  board passed perfect).
- Running per-brief photo totals: v2 = 95 attempts — TP380 / FP23 /
  FN66, P .943, R .852, exact-board 51/95, expiries 8 (all from
  earlier v2 eras; 0 photo expiries this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b8658ece85752f.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in any of the 3 sessions;
  all played clean in a single sequential browser task.
- Dominant failure mode: false picks on a single photo motorcycle
  board (FP2 in one attempt) plus a single partial miss on the bus
  board (the run's only FN).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .949 just below the .95 bar, R .902
  below the .95 bar, exact-board 18/30 = 60.0% below the 90% bar;
  v2 photo expiry rate overall 8/103 = 7.8%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #27 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #26's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T09:08:09Z–09:11:54Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP7 / FP0 / FN1, P 1.000,
  R .875, exact-board 2/3, expiries 0. Session 1: car board passed
  perfect (TP4; 1 ambiguity-band tile excluded from scoring by the
  server). Session 2: fire-hydrant board failed TP1 / FP0 / FN1
  (sliver miss), then a car board passed perfect (TP2).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP8 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (palm-tree board; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 98 attempts — TP387 / FP23 /
  FN67, P .944, R .852, exact-board 53/98, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b8658ece85752f.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on session 1 before play
  began; it was verified via get_captcha_preference (solve/all_tasks)
  and steered once, then all 3 sessions played clean in a single
  sequential browser task.
- Dominant failure mode: a single sliver miss on the photo
  fire-hydrant board (the run's only FN) — zero FPs across all
  corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .948 just below the .95 bar, R .901
  below the .95 bar, exact-board 18/30 = 60.0% below the 90% bar;
  v2 photo expiry rate overall 8/106 = 7.5%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #28 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #27's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T09:27:53Z–09:33:33Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP10 / FP8 / FN3, P .556,
  R .769, exact-board 2/5, expiries 0. Session 1: car board passed
  perfect (TP1; 1 ambiguity-band tile excluded from scoring by the
  server). Session 2: bicycle board failed TP0 / FP0 / FN1
  (empty_submission, sliver), car board failed TP3 / FP7 / FN0,
  motorcycle board failed TP2 / FP1 / FN2 (sliver + partial), then a
  car board passed perfect (TP4).
- Photo (rotating session also served 1 photo round; counted here —
  same brief, corpus-split): car board passed perfect (TP4; 1
  ambiguity-band tile excluded from scoring by the server).
- Photo run total: 6 attempts — TP14 / FP8 / FN3, P .636, R .824,
  exact-board 3/6, expiries 0.
- Synthetic: none this run — the rotating force_type_b session served
  only the photo round above.
- Running per-brief photo totals: v2 = 104 attempts — TP401 / FP31 /
  FN70, P .928, R .851, exact-board 56/104, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b8658ece85752f.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: false picks on photo boards — 8 FPs this
  run, 7 of them on a single car board in session 2 (TP3 / FP7);
  the remaining errors were an empty submission on the bicycle board
  (FN1) and sliver + partial misses on the motorcycle board (FN2).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .874 below the .95 bar, R .874 below
  the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo
  expiry rate overall 8/112 = 7.1%, within the ≤10% limit. No
  consecutive-window count toward parity.

### Run #29 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #28's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T09:46:02Z–09:49:53Z, source live-agent,
2 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP6 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed
  perfect (TP2). Session 2: bicycle board passed perfect (TP4).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 106 attempts — TP407 / FP31 /
  FN70, P .929, R .853, exact-board 58/106, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b8658ece85752f.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; all 3 sessions played
  clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; both photo boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .874 below the .95 bar, R .881 below
  the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo
  expiry rate overall 8/114 = 7.0%, within the ≤10% limit. No
  consecutive-window count toward parity.

### Run #30 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #29's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T10:06:23Z–10:13:30Z, source live-agent,
3 scored attempts total, plus 1 unscored expired attempt.
- Photo (designated sessions): 2 attempts — TP21 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: fire-hydrant board
  passed perfect (TP8). Session 2: bicycle board passed perfect
  (TP13).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 scored
  attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1,
  expiries 1 (a palm-tree round expired unscored, then a chimney
  board passed perfect).
- Running per-brief photo totals: v2 = 108 attempts — TP428 / FP31 /
  FN70, P .932, R .859, exact-board 60/108, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://b8658ece85752f.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before session 1; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: none in scored play this run — zero FPs and
  zero FNs across all corpora; the only loss was the 180 s expiry of
  the rotating palm-tree round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .881 below the .95 bar, R .888 below
  the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo
  expiry rate overall 8/116 = 6.9%, within the ≤10% limit. No
  consecutive-window count toward parity.

### Run #32 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after the intervening Run #31's
force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to
infrastructure.
Window arbitrated: 2026-10-11T10:48:43Z–10:53:55Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP20 / FP0 / FN5, P 1.000,
  R .800, exact-board 2/5, expiries 0. Session 1: car board failed
  TP7 / FN1 (partial), then a traffic-light board passed perfect
  (TP2). Session 2: car board failed TP0 / FN2 (partial + sliver,
  empty_submission), car board failed TP7 / FN2 (partial + sliver),
  then a car board passed perfect (TP4).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP8 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bridge board
  pass).
- Running per-brief photo totals (server-reconciled, incl. the
  unlogged intervening run below): v2 = 121 attempts — TP478 / FP41 /
  FN86, P .921, R .848, exact-board 64/121, expiries 8.
- RECONCILIATION NOTE — unlogged intervening run (presumed Run #31):
  server records show 3 sessions at 2026-10-11T10:26:34Z–10:40:28Z
  (after Run #30, before this run) that were NOT in TRAINING_LOG at
  this run's pre-flight: 8 scored photo attempts — TP30 / FP10 /
  FN11, P .750, R .732, exact-board 2/8, plus 1 synthetic attempt
  (force_low_trust bus board passed perfect TP1); 3 tokens (session 1
  passed on a car board, session 2 on a bus board, rotating session
  on the bus board). This run is numbered #32 chronologically. If
  that run is logged later, do NOT re-add its attempts: the running
  totals above already include them.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING
  (VM replaced — systemctl reported units not found, tunnel returned
  502, local port dead). Revived per protocol:
  tools/install_services.sh reinstalled and enabled both units,
  services started, LIVE_URL.txt tunnel
  (https://b8658ece85752f.lhr.life) verified HTTP 200 (local 200 too)
  before any play. The known CAPTCHA-preference glitch fired before
  play began; it was verified via get_captcha_preference
  (solve/all_tasks) and steered once, then all 3 sessions played
  clean in a single sequential browser task.
- Dominant failure mode: under-selection on photo car boards — all
  5 photo FNs came from the three failed car boards (partial/sliver
  misses, incl. one empty submission TP0 / FN2); zero FPs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .850 below the .95 bar, R .843 below
  the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo
  expiry rate overall 8/129 = 6.2%, within the ≤10% limit. No
  consecutive-window count toward parity.

### Run #33 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #32's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T11:08:19Z–11:14:04Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP18 / FP6 / FN3, P .750,
  R .857, exact-board 2/6, expiries 0. Session 1: motorcycle board
  failed TP5 / FN1 (partial), then a bus board passed perfect (TP4).
  Session 2: bicycle board failed TP2 / FP4 / FN2 (partial ×2),
  traffic-light board failed TP2 / FP1 / FN0, bicycle board failed
  TP3 / FP1 / FN0, then a traffic-light board passed perfect (TP2).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 127 attempts — TP496 / FP47 /
  FN89, P .913, R .848, exact-board 66/127, expiries 8 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: false picks on photo boards — 6 FPs this
  run, 4 of them on a single bicycle board in session 2 (TP2 / FP4 /
  FN2); the remaining FNs were partial misses on the motorcycle and
  bicycle boards.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .822 below the .95 bar, R .835 below
  the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo
  expiry rate overall 8/135 = 5.9%, within the ≤10% limit. No
  consecutive-window count toward parity.

### Run #34 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #33's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T11:28:55Z–11:40:18Z, source live-agent,
7 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 4 attempts — TP20 / FP5 / FN2, P .800,
  R .909, exact-board 2/4, expiries 1. Session 1: bus board failed
  TP7 / FP1 / FN2 (partial ×2), bicycle board failed TP2 / FP4 / FN0,
  a motorcycle round expired unscored (challenge_expired), then a
  bus board passed perfect (TP8). Session 2: traffic-light board
  passed perfect (TP3).
- Rotating (force_dynamic, synthetic Type A dynamic): 3 attempts —
  TP2 / FP1 / FN1, P .667, R .667, exact-board 1/3, expiries 0.
  Car board failed TP0 / FP1 / FN0, bus board failed TP0 / FP0 /
  FN1 (partial), then a tractor board passed (TP2).
- Running per-brief photo totals: v2 = 131 attempts — TP516 / FP52 /
  FN91, P .908, R .850, exact-board 68/131, expiries 9.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; all 3 sessions played
  clean in a single sequential browser task.
- Dominant failure mode: false picks on photo boards — 5 FPs this
  run, 4 of them on a single bicycle board (TP2 / FP4); the other
  errors were partial misses on the first bus board (FN2) and the
  180 s expiry of the photo motorcycle round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .850 below the .95 bar, R .845 below
  the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo
  expiry rate overall 9/140 = 6.4%, within the ≤10% limit. No
  consecutive-window count toward parity.

### Run #35 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #34's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T11:48:31Z–11:53:50Z, source live-agent,
5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP18 / FP0 / FN2, P 1.000,
  R .900, exact-board 2/4, expiries 0. Session 1: car board failed
  TP2 / FN1 (partial), bus board failed TP6 / FN1 (partial), then a
  car board passed perfect (TP4). Session 2: bus board passed perfect
  (TP6).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (palm-tree board; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 135 attempts — TP534 / FP52 /
  FN93, P .911, R .852, exact-board 70/135, expiries 9 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: partial-tile misses on photo boards — both
  FNs this run were partial misses (1 on the car board, 1 on the bus
  board in session 1); zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .862 below the .95 bar, R .851 well
  below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar;
  v2 photo expiry rate overall 9/144 = 6.3%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #36 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #35's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T12:09:01Z–12:17:45Z, source live-agent,
7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP20 / FP4 / FN5, P .833,
  R .800, exact-board 2/6, expiries 0. Session 1 (5 rounds, token on
  the 5th): car failed TP6 / FP3 / FN1 (sliver), bus failed TP6 /
  FN2 (partial ×2), bicycle failed TP2 / FN2 (sliver + partial),
  fire_hydrant failed TP2 / FP1 / FN0, then a traffic-light board
  passed perfect (TP2). Session 2: car board passed perfect (TP2).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP6 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (motorcycle
  board pass).
- Running per-brief photo totals: v2 = 141 attempts — TP554 / FP56 /
  FN98, P .908, R .850, exact-board 72/141, expiries 9 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before session 1; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: mixed errors concentrated in session 1's
  four failed boards — false picks (FP3 on the car board, FP1 on the
  fire-hydrant board) plus partial/sliver misses (FN2 each on the
  bus and bicycle boards, FN1 sliver on the car board); sessions 2
  and 3 were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .854 below the .95 bar, R .848 well
  below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar;
  v2 photo expiry rate overall 9/150 = 6.0%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #37 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #36's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T12:28:49Z–12:37:45Z, source live-agent,
10 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 10 attempts — TP38 / FP3 / FN15, P .927,
  R .717, exact-board 2/10, expiries 0. Session 1 (5 rounds, token on
  the 5th): car failed TP5 / FN3 (sliver ×2, partial), car failed
  TP0 / FN2 (partial ×2, empty_submission), motorcycle failed TP4 /
  FN2 (sliver, partial), traffic_light failed TP1 / FP2 / FN3
  (partial, sliver ×2), then a bicycle board passed perfect (TP1).
  Session 2 (5 rounds, token on the 5th): bicycle failed TP2 / FN2
  (sliver, partial), car failed TP7 / FN1 (partial), car failed TP3 /
  FN1 (sliver), motorcycle failed TP6 / FP1 / FN1 (sliver), then a bus
  board passed perfect (TP9).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 151 attempts — TP592 / FP59 /
  FN113, P .909, R .840, exact-board 74/151, expiries 9 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before session 1; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: under-selection on photo boards — 15 FNs
  across 8 failed boards, mostly sliver/partial misses (incl. one
  empty submission TP0 / FN2 on a car board); only 3 FPs this run
  (FP2 on the traffic-light board, FP1 on the motorcycle board).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .864 below the .95 bar, R .809 well
  below the .95 bar, exact-board 10/30 = 33.3% below the 90% bar;
  v2 photo expiry rate overall 9/160 = 5.6%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #38 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #37's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T12:48:06Z–13:00:14Z, source live-agent,
9 scored attempts total, plus 1 unscored expired attempt.
- Photo (designated sessions): 8 attempts — TP35 / FP6 / FN7, P .854,
  R .833, exact-board 2/8, expiries 0. Session 1 (3 rounds, token on
  the 3rd): car failed TP1 / FN1 (partial), car failed TP8 / FN1
  (sliver), then a traffic-light board passed perfect (TP2; 2
  ambiguity errors recorded by the server, excluded from scoring).
  Session 2 (5 rounds, token on the 5th): motorcycle failed TP3 /
  FP1 / FN2 (sliver + partial), car failed TP5 / FP3 / FN1 (partial),
  car failed TP6 / FN2 (sliver ×2), bicycle failed TP4 / FP2 / FN0,
  then a bicycle board passed perfect (TP6).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 scored
  attempt — TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1,
  expiries 1 (a fire-hydrant round expired unscored —
  challenge_expired — then a bicycle board passed perfect).
- Running per-brief photo totals: v2 = 159 attempts — TP627 / FP65 /
  FN120, P .906, R .839, exact-board 76/159, expiries 9 (all from
  earlier v2 eras; 0 photo expiries this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired on session 1 before play
  began; it was verified via get_captcha_preference (solve/all_tasks)
  and steered once, then all 3 sessions played clean in a single
  sequential browser task.
- Dominant failure mode: mixed errors on photo boards — under-selection
  (FN7 across 5 boards, mostly sliver/partial misses) plus false picks
  (FP6, concentrated on one car board FP3 and one bicycle board FP2);
  only 2 of 8 photo boards were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .904 below the .95 bar, R .808 well
  below the .95 bar, exact-board 10/30 = 33.3% below the 90% bar;
  v2 photo expiry rate overall 9/168 = 5.4%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #39 — continuous run (2026-10-11, brief v2 validated) — RECONCILED by Run #40
Composition (presumed, from server scenarios): 3 sessions sequential —
2× force_type_b_photo + 1 rotating (force_low_trust, next in rotation
after Run #38's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost
to infrastructure. This run was NOT in TRAINING_LOG at Run #40's
pre-flight; its numbers below are server-arbitrated by Run #40 and are
already included in Run #40's running totals — do NOT re-add them if
this run is logged again elsewhere.
Window arbitrated: 2026-10-11T13:06:55Z–13:18:45Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP21 / FP3 / FN2, P .875,
  R .913, exact-board 2/5, expiries 0. Session 1: car board failed
  TP1 / FP2 / FN0, then a bicycle board passed perfect (TP13).
  Session 2: fire-hydrant board failed TP2 / FN1 (sliver),
  traffic-light board failed TP4 / FP1 / FN1 (sliver), then a
  motorcycle board passed perfect (TP1).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP0 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (taxi board pass with an empty selection; no scored positive tiles).
- Running per-brief photo totals (after this run): v2 = 164 attempts —
  TP648 / FP68 / FN122, P .905, R .842, exact-board 78/164, expiries 9.
- Dominant failure mode: false picks on the photo car board (FP2)
  plus sliver misses on the fire-hydrant and traffic-light boards.
- Parity-window status (after this run): NOT PARITY. Rolling-30
  window (server): P .882, R .805, exact-board 9/30 = 30.0%.

### Run #40 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after the intervening Run #39's
force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to
infrastructure.
Window arbitrated: 2026-10-11T13:30:03Z–13:39:57Z, source live-agent,
5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP19 / FP1 / FN2, P .950,
  R .905, exact-board 2/4, expiries 0. Session 1: car board failed
  TP3 / FP1 / FN1 (whole-tile miss; 1 ambiguity error recorded by the
  server, excluded from scoring), bus board failed TP5 / FN1
  (partial), then a traffic-light board passed perfect (TP4).
  Session 2: bus board passed perfect (TP7; 1 ambiguity error
  recorded by the server, excluded from scoring).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP7 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (taxi board pass).
- Running per-brief photo totals: v2 = 168 attempts — TP667 / FP69 /
  FN124, P .906, R .843, exact-board 80/168, expiries 9 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were INACTIVE
  (tunnel returned 502, local port dead). Revived per protocol:
  tools/install_services.sh reinstalled and enabled both units,
  services started, LIVE_URL.txt tunnel
  (https://a845b2be6a5e33.lhr.life) verified HTTP 200 (local 200 too)
  before any play. The known CAPTCHA-preference glitch fired on the
  first browser task, which refused two steers despite
  get_captcha_preference confirming solve/all_tasks; per the standing
  lesson it was closed and a fresh task was spawned, which played
  all 3 sessions clean in a single sequential task.
- Dominant failure mode: small under-selection on the first photo
  session — one whole-tile miss on the car board and one partial
  miss on the bus board (the run's only 2 FNs), plus a single false
  pick on the car board (the run's only FP); session 2 and the
  rotating session were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .895 below the .95 bar, R .821 well
  below the .95 bar, exact-board 10/30 = 33.3% below the 90% bar;
  v2 photo expiry rate overall 9/177 = 5.1%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #41 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #40's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T13:49:05Z–13:50:37Z, source live-agent,
2 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP5 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed
  perfect (TP4). Session 2: bus board passed perfect (TP1).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 170 attempts — TP672 / FP69 /
  FN124, P .907, R .844, exact-board 82/170, expiries 9 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; both photo boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .902 below the .95 bar, R .822 well
  below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar;
  v2 photo expiry rate overall 9/179 = 5.0%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #42 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #41's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T14:08:23Z–14:18:13Z, source live-agent,
4 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 3 attempts — TP18 / FP0 / FN3, P 1.000,
  R .857, exact-board 2/3, expiries 1. Session 1: car board passed
  perfect (TP6; 1 ambiguity-band tile excluded from scoring by the
  server). Session 2: car board failed TP6 / FN3 (partial + sliver
  ×2), a bus round expired unscored (challenge_expired), then a
  bicycle board passed perfect (TP6; 1 ambiguity-band tile excluded
  from scoring by the server).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (crosswalk board; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 173 attempts — TP690 / FP69 /
  FN127, P .909, R .845, exact-board 84/173, expiries 10.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; all 3 sessions played
  clean in a single sequential browser task.
- Dominant failure mode: under-selection on a single photo car
  board — all 3 photo FNs came from that one attempt (partial +
  sliver misses); zero FPs across all corpora. The other loss was
  the 180 s expiry of the photo bus round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .910 below the .95 bar, R .845 well
  below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar;
  v2 photo expiry rate overall 10/183 = 5.5%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #43 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #42's force_dynamic).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. The rotating
session ended in terminal cooldown ("Too many attempts") after its
single failed round.
Window arbitrated: 2026-10-11T14:28:51Z–14:35:05Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP11 / FP0 / FN1, P 1.000,
  R .917, exact-board 2/3, expiries 0. Session 1: bus board failed
  TP6 / FN1 (partial miss; 2 ambiguity errors recorded by the server,
  excluded from scoring), then a bus board passed perfect (TP1).
  Session 2: car board passed perfect (TP4).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP10 / FP1 / FN0, P .909, R 1.000, exact-board 0/1, expiries 0
  (bicycle board failed; session entered terminal cooldown).
- Running per-brief photo totals: v2 = 176 attempts — TP701 / FP69 /
  FN128, P .910, R .846, exact-board 86/176, expiries 10 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: a single partial-tile miss on the first
  photo bus board (the run's only photo FN) — zero photo FPs this
  run; the rotating loss was a single false pick on the synthetic
  bicycle board (FP1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .925 below the .95 bar, R .872 well
  below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar;
  v2 photo expiry rate overall 10/186 = 5.4%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #44 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #43's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T14:48:54Z–14:54:21Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP6 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: bicycle board
  passed perfect (TP4). Session 2: bicycle board passed perfect
  (TP2).
- Photo (rotating session also served 1 photo round; counted here —
  same brief, corpus-split): bus board failed TP8 / FP0 / FN2
  (partial ×2).
- Photo run total: 3 attempts — TP14 / FP0 / FN2, P 1.000, R .875,
  exact-board 2/3, expiries 0.
- Synthetic (rotating session): 1 attempt — TP4 / FP0 / FN0,
  P 1.000, R 1.000, exact-board 1/1, expiries 0 (car board pass,
  token).
- Running per-brief photo totals: v2 = 179 attempts — TP715 / FP69 /
  FN130, P .912, R .846, exact-board 88/179, expiries 10 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then all 3 sessions played clean in a single
  sequential browser task.
- Dominant failure mode: partial-tile misses on the rotating photo
  bus board (both photo FNs in one attempt) — zero FPs across all
  corpora; both designated photo boards were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .926 below the .95 bar, R .885 below
  the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo
  expiry rate overall 10/189 = 5.3%, within the ≤10% limit. No
  consecutive-window count toward parity.

### Run #45 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #44's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T15:10:05Z–15:19:37Z, source live-agent,
8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 8 attempts — TP43 / FP6 / FN7, P .878,
  R .860, exact-board 2/8, expiries 0. Session 1 (3 rounds, token on
  the 3rd): bus board failed TP5 / FP0 / FN1 (sliver), car board
  failed TP4 / FP1 / FN0, then a motorcycle board passed perfect
  (TP3). Session 2 (5 rounds, token on the 5th): car board failed
  TP7 / FP4 / FN0 (1 ambiguity error recorded by the server, excluded
  from scoring), motorcycle board failed TP10 / FP0 / FN4 (sliver +
  partial ×3), motorcycle board failed TP4 / FP0 / FN2 (partial ×2),
  traffic-light board failed TP2 / FP1 / FN0 (1 ambiguity error
  recorded by the server, excluded from scoring), then a
  fire-hydrant board passed perfect (TP8).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 187 attempts — TP758 / FP75 /
  FN137, P .910, R .847, exact-board 90/187, expiries 10 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200, local 200 too;
  tunnel unit had restarted at 15:00Z before the run, same URL).
  The known CAPTCHA-preference glitch fired before play began; it
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then all 3 sessions played clean in a single
  sequential browser task.
- Dominant failure mode: mixed errors in session 2 — false picks
  (FP4 on the car board, FP1 on the traffic-light board) plus
  under-selection on the two motorcycle boards (FN4 + FN2, mostly
  partial misses); session 1's only FN was a sliver miss on the bus
  board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .922 below the .95 bar, R .892 below
  the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo
  expiry rate overall 10/197 = 5.1%, within the ≤10% limit. No
  consecutive-window count toward parity.

### Run #46 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #45's natural).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 1
ended in terminal cooldown ("Too many attempts") after 6 failed rounds.
Window arbitrated: 2026-10-11T15:28:40Z–15:39:08Z, source live-agent,
10 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP22 / FP4 / FN5, P .846,
  R .815, exact-board 1/7, expiries 0. Session 1 (6 attempts, no
  token, terminal cooldown): car failed TP4 / FN3 (partial ×2 +
  sliver; 1 ambiguity error, excluded from scoring), traffic-light
  failed TP4 / FN1 (sliver), bus failed TP9 / FP1 (1 ambiguity
  error, excluded), bus failed TP1 / FP1, bicycle failed TP1 / FN1
  (partial; 1 ambiguity error, excluded), car failed TP1 / FP2.
  Session 2: fire-hydrant board passed perfect (TP2) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 3 scored
  attempts — TP8 / FP0 / FN0 scored, P 1.000, R 1.000, exact-board
  3/3 by scored definition, expiries 0 (traffic-light TP1 and stairs
  TP4 both server-failed on a single ambiguity-band tile each —
  fn_all 1 each, ambiguity_errors 1 each, excluded from scored FN —
  then a taxi board passed perfect TP3 with token).
- Running per-brief photo totals: v2 = 194 attempts — TP780 / FP79 /
  FN142, P .908, R .846, exact-board 91/194, expiries 10 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: mixed errors in session 1 — under-selection
  (FN3 on the first car board, FN1 each on the traffic-light and
  bicycle boards) plus false picks spread across four boards (FP1
  on each bus board, FP2 on the final car board); session 2 and the
  rotating session were scored-exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .923 below the .95 bar, R .868 below
  the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo
  expiry rate overall 10/204 = 4.9%, within the ≤10% limit. No
  consecutive-window count toward parity.

### Run #47 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #46's force_dynamic).
Sessions: 4 played (1 replacement photo session added after a tunnel
death), 2 tokens, 1 session lost to infrastructure. Session 1 ended
in terminal cooldown ("Too many attempts") after 6 scored rounds;
session 2 was cut off mid-round by the tunnel death (its 3 scored
attempts count; its final motorcycle board never reached the server —
unscored, not failed); the replacement photo session and the rotating
session both tokened at the new URL.
Window arbitrated: 2026-10-11T15:46:57Z–16:29:52Z, source live-agent,
16 scored attempts total, plus 3 unscored expired photo attempts.
- Photo (all photo sessions): 15 attempts — TP55 / FP6 / FN20, P .902,
  R .733, exact-board 1/15, expiries 3. Session 1 (6 attempts, no
  token, cooldown): bus TP5/FN1 (partial), car TP6/FN1 (sliver),
  car TP6/FP3/FN1 (sliver), motorcycle TP2/FN2 (sliver+partial),
  car TP7/FN2 (sliver×2), car TP6/FN2 (sliver×2); plus 1 expired
  car round. Session 2 (3 attempts, lost to tunnel): motorcycle
  TP1/FP1/FN1 (partial), bicycle TP2/FN2 (sliver+partial),
  fire_hydrant TP2/FP1/FN0. Replacement session (6 attempts, token):
  car TP3/FP1/FN1 (partial), motorcycle TP5/FN1 (partial),
  motorcycle TP4/FN2 (sliver+partial), motorcycle TP2/FN3
  (sliver+partial+sliver), fire_hydrant TP2/FN1 (sliver), then a
  car board passed perfect (TP2); plus 2 expired rounds (car,
  motorcycle).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (tractor board; dynamic replacements re-scanned until no tile
  matched, then Verify, token).
- Running per-brief photo totals: v2 = 209 attempts — TP835 / FP85 /
  FN162, P .908, R .838, exact-board 92/209, expiries 13.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were active,
  tunnel URL from LIVE_URL.txt
  https://a845b2be6a5e33.lhr.life verified HTTP 200 (local 200 too).
  Mid-run the tunnel died during session 2 (agent reported "no
  tunnel" / ERR_EMPTY_RESPONSE on repeated reloads); supervision
  restarted it at a NEW URL (https://0c48112bebbfbf.lhr.life,
  verified HTTP 200) and the lost sessions were replaced there.
  The known CAPTCHA-preference glitch fired on the replacement
  task; it was verified via get_captcha_preference (solve/all_tasks)
  and steered once, then both replacement sessions played clean.
- Dominant failure mode: under-selection on photo boards — 20 FNs
  across 14 failed boards, almost all sliver/partial misses
  (motorcycle boards in the replacement session alone: FN1+FN2+FN3);
  only 1 of 15 photo boards was exact. FPs were secondary (6 total).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .882 below the .95 bar, R .789 well
  below the .95 bar, exact-board 4/30 = 13.3% below the 90% bar;
  v2 photo expiry rate overall 13/222 = 5.9%, within the ≤10% limit.
  No consecutive-window count toward parity.
Summary delivered: 2026-10-11 AM

### Run #48 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #47's force_low_trust).
Sessions: 3 replacement sessions played, 3 tokens, plus 3 initial
sessions lost to infrastructure before any play (tunnel death; never
reached the server — unscored, replaced per protocol).
Window arbitrated: 2026-10-11T16:40:08Z–16:44:47Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP13 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed
  perfect (TP2). Session 2: car board passed perfect (TP11).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP13 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bicycle board
  pass).
- Running per-brief photo totals: v2 = 211 attempts — TP848 / FP85 /
  FN162, P .909, R .840, exact-board 94/211, expiries 13 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were active and
  the tunnel URL from LIVE_URL.txt
  (https://0c48112bebbfbf.lhr.life) verified HTTP 200 (local 200 too).
  The units then died before the first play attempt (~16:36–16:38Z;
  tunnel 502, local port dead) and all 3 initial sessions were lost
  unscored ("no tunnel" page, no server record). Revived per
  protocol: tools/install_services.sh reinstalled and enabled both
  units, services started, the SAME URL verified HTTP 200 repeatedly
  before the replacement sessions played clean. No
  CAPTCHA-preference pause was reported in either attempt.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .899 below the .95 bar, R .812 well
  below the .95 bar, exact-board 6/30 = 20.0% below the 90% bar;
  v2 photo expiry rate overall 13/224 = 5.8%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #49 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #48's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T16:53:45Z–16:55:15Z, source live-agent,
2 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP7 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed
  perfect (TP5; 1 ambiguity-band tile excluded from scoring by the
  server). Session 2: fire-hydrant board passed perfect (TP2).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 213 attempts — TP855 / FP85 /
  FN162, P .910, R .841, exact-board 96/213, expiries 13 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://0c48112bebbfbf.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before session 1; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; both photo boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .919 below the .95 bar, R .821 well
  below the .95 bar, exact-board 8/30 = 26.7% below the 90% bar;
  v2 photo expiry rate overall 13/226 = 5.8%, within the ≤10% limit.
  No consecutive-window count toward parity.

### Run #50 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #49's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T17:10:09Z–17:20:16Z, source live-agent,
8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP37 / FP2 / FN4, P .949,
  R .902, exact-board 2/7, expiries 0. Session 1 (5 rounds, token on
  the 5th): car failed TP4 / FP1 / FN0 (1 ambiguity error recorded by
  the server, excluded from scoring), traffic_light failed TP2 / FN1
  (sliver), bus failed TP5 / FN1 (partial), traffic_light failed TP2 /
  FP1 / FN0, then a fire-hydrant board passed perfect (TP8).
  Session 2: car board failed TP8 / FN2 (sliver + partial), then a
  fire-hydrant board passed perfect (TP8).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (palm-tree board; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 220 attempts — TP892 / FP87 /
  FN166, P .911, R .843, exact-board 98/220, expiries 13 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 238 = v1 (8) + v2.1 (10) + v2 (220).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://0c48112bebbfbf.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: under-selection on photo boards — all 4 FNs
  were sliver/partial misses (traffic_light sliver, bus partial, car
  sliver + partial), with 2 secondary false picks in session 1 (FP1
  each on the car and traffic-light boards); only 2 of 7 photo boards
  were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .928 below the .95 bar, R .838 well
  below the .95 bar, exact-board 9/30 = 30.0% below the 90% bar;
  v2 photo expiry rate overall 13/233 = 5.6%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline (server compare report): human-ben — 3 sessions, 2 scored
  attempts total, 1 scored photo attempt (TP12 / FP0 / FN0).

### Run #51 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #50's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T17:34:36Z–17:45:48Z, source live-agent,
7 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 6 attempts — TP19 / FP6 / FN2, P .760,
  R .905, exact-board 2/6, expiries 1. Session 1: bus round expired
  unscored (challenge_expired), then a car board passed perfect (TP2).
  Session 2 (5 rounds, token on the 5th): fire_hydrant failed TP2 /
  FN1 (sliver; 1 ambiguity error recorded by the server, excluded
  from scoring), traffic_light failed TP2 / FP1 / FN0, car failed
  TP7 / FP1 / FN1 (partial), car failed TP4 / FP4 / FN0, then a car
  board passed perfect (TP2).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP7 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (bicycle board; dynamic re-scan clean, one non-target tile
  deselected before Verify, token).
- Running per-brief photo totals: v2 = 226 attempts — TP911 / FP93 /
  FN168, P .907, R .844, exact-board 100/226, expiries 14.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://0c48112bebbfbf.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: false picks on photo boards — 6 FPs this
  run, 4 of them on a single car board in session 2 (TP4 / FP4);
  the 2 FNs were a sliver miss (fire_hydrant) and a partial miss
  (car). The other loss was the 180 s expiry of session 1's bus
  round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .920 below the .95 bar, R .847 well
  below the .95 bar, exact-board 10/30 = 33.3% below the 90% bar;
  v2 photo expiry rate overall 14/240 = 5.8%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline unchanged from Run #50 (human-ben — 3 sessions, 2 scored
  attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #52 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #51's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T17:54:14Z–18:02:15Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP22 / FP3 / FN3, P .880,
  R .880, exact-board 2/5, expiries 0. Session 1: car board failed
  TP6 / FP2 / FN2 (partial + sliver), then a bus board passed perfect
  (TP8). Session 2: bicycle board failed TP2 / FP1 / FN0, motorcycle
  board failed TP3 / FP0 / FN1 (partial), then a car board passed
  perfect (TP3; 1 ambiguity error recorded by the server, excluded
  from scoring).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP6 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (taxi board pass).
- Running per-brief photo totals: v2 = 231 attempts — TP933 / FP96 /
  FN171, P .907, R .845, exact-board 102/231, expiries 14 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://0c48112bebbfbf.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: mixed errors on the first photo session's
  car board (FP2 + FN2 in one attempt, partial + sliver misses),
  plus a single false pick on the bicycle board and a single partial
  miss on the motorcycle board in session 2; both passing photo
  boards and the rotating board were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .910 below the .95 bar, R .885 below
  the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo
  expiry rate overall 14/245 = 5.7%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #53 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #52's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T18:11:16Z–18:16:17Z, source live-agent,
3 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 3 attempts — TP13 / FP0 / FN1, P 1.000,
  R .929, exact-board 2/3, expiries 1. Session 1: motorcycle round
  expired unscored (challenge_expired), then a car board passed
  perfect (TP4). Session 2: fire-hydrant board failed TP3 / FP0 /
  FN1 (sliver miss), then a bicycle board passed perfect (TP6; 1
  ambiguity error recorded by the server, excluded from scoring).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 234 attempts — TP946 / FP96 /
  FN172, P .908, R .846, exact-board 104/234, expiries 15.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://0c48112bebbfbf.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: a single sliver miss on the photo
  fire-hydrant board (the run's only FN) plus 1 photo round expiry
  (motorcycle, unsubmitted, unscored) — zero FPs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .920 below the .95 bar, R .881 below
  the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo
  expiry rate overall 15/249 = 6.0%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #54 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #53's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T18:30:47Z–18:37:46Z, source live-agent,
4 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 3 attempts — TP7 / FP1 / FN1, P .875,
  R .875, exact-board 2/3, expiries 1. Session 1: traffic-light round
  expired unscored (challenge_expired), then a car board passed
  perfect (TP3). Session 2: motorcycle board failed TP3 / FP1 / FN1
  (partial miss), then a car board passed perfect (TP1).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (mountain board pass).
- Running per-brief photo totals: v2 = 237 attempts — TP953 / FP97 /
  FN173, P .908, R .846, exact-board 106/237, expiries 16.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://0c48112bebbfbf.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference steer was needed; all 3 sessions played in a
  single sequential browser task.
- Dominant failure mode: one false pick plus one partial miss on the
  single failed photo motorcycle board (TP3 / FP1 / FN1), plus the
  180 s expiry of session 1's traffic-light round (unsubmitted,
  unscored); both car boards and the rotating board were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .917 below the .95 bar, R .924 below
  the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo
  expiry rate overall 16/253 = 6.3%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #55 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #54's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T18:49:30Z–18:55:38Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP9 / FP0 / FN3, P 1.000,
  R .750, exact-board 2/3, expiries 0. Session 1: bus board passed
  perfect (TP2). Session 2: bus board failed TP3 / FP0 / FN3
  (partial ×3; 1 ambiguity error recorded by the server, excluded
  from scoring), then a car board passed perfect (TP4).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (stairs board pass; no dynamic replacements observed by the agent).
- Running per-brief photo totals: v2 = 240 attempts — TP962 / FP97 /
  FN176, P .908, R .845, exact-board 108/240, expiries 16 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://0c48112bebbfbf.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: partial-tile misses on a single photo bus
  board — all 3 photo FNs came from that one attempt (TP3 / FN3,
  partial ×3); zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .914 below the .95 bar, R .901 below
  the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo
  expiry rate overall 16/256 = 6.25%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #56 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #55's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T19:10:21Z–19:19:55Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP8 / FP0 / FN2, P 1.000,
  R .800, exact-board 2/3, expiries 0. Session 1: car board passed
  perfect (TP1). Session 2: motorcycle board failed TP2 / FP0 / FN2
  (sliver + partial; 1 ambiguity error recorded by the server,
  excluded from scoring), then a bicycle board passed perfect (TP5).
- Photo (rotating session also served 3 photo rounds; counted here —
  same brief, corpus-split): 3 attempts — TP6 / FP0 / FN3, P 1.000,
  R .667, exact-board 1/3, expiries 0. Motorcycle board failed
  TP0 / FN1 (sliver; procedure error: empty_submission), bicycle
  board failed TP2 / FN2 (sliver + partial), then a car board passed
  perfect (TP4).
- Photo run total: 6 attempts — TP14 / FP0 / FN5, P 1.000, R .737,
  exact-board 3/6, expiries 0. No synthetic-corpus attempts this run
  (the rotating force_type_b session served photo rounds only).
- Running per-brief photo totals: v2 = 246 attempts — TP976 / FP97 /
  FN181, P .910, R .844, exact-board 111/246, expiries 16 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING
  (VM replaced — systemctl reported units not found, tunnel returned
  502, local port dead). Revived per protocol:
  tools/install_services.sh reinstalled and enabled both units,
  services started, LIVE_URL.txt tunnel
  (https://0c48112bebbfbf.lhr.life) verified HTTP 200 (local 200 too)
  before any play. The known CAPTCHA-preference glitch fired before
  session 1; it was verified via get_captcha_preference
  (solve/all_tasks) and steered once, then all 3 sessions played
  clean in a single sequential browser task.
- Dominant failure mode: under-selection on photo boards — all 5 FNs
  were sliver/partial misses (motorcycle FN2 + FN1, bicycle FN2),
  including one empty_submission on the rotating session's motorcycle
  board; zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .909 below the .95 bar, R .866 below
  the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo
  expiry rate overall 16/262 = 6.1%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #57 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #56's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T19:31:11Z–19:33:46Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP14 / FP0 / FN2, P 1.000,
  R .875, exact-board 2/3, expiries 0. Session 1: bus board failed
  TP8 / FN2 (both partial tiles), then a motorcycle board passed
  perfect (TP3 scored; 1 band tile excluded from scoring by the
  server). Session 2: traffic-light board passed perfect (TP3).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 249 attempts — TP990 / FP97 /
  FN183, P .911, R .844, exact-board 113/249, expiries 16 (all from
  earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://0c48112bebbfbf.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before session 1; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: partial-tile misses on a single photo bus
  board (both FNs in one attempt) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .914 below the .95 bar, R .862 below
  the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo
  expiry rate overall 16/265 = 6.0%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #58 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #57's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T19:48:37Z–19:55:34Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP9 / FP2 / FN0, P .818,
  R 1.000, exact-board 2/3, expiries 0. Session 1: car board passed
  perfect (TP5; 1 ambiguity error recorded by the server, excluded
  from scoring). Session 2: traffic-light board failed TP2 / FP2 /
  FN0, then a traffic-light board passed perfect (TP2).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (bicycle board; 3 initial matches plus 1 replacement match after
  fade, re-scan clean, then Verify).
- Running per-brief photo totals: v2 = 252 attempts — TP999 / FP99 /
  FN183, P .910, R .845, exact-board 115/252, expiries 16 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 272 (compare report), 2 more than the era-split
  log sum (v1 8 + v2.1 10 + v2 252 = 270) — a pre-existing log/server
  gap first measurable at this run's reconciliation, not created by
  this run (this run's window is fully accounted: 3 photo attempts);
  rolling-30 below is server-based and unaffected.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://0c48112bebbfbf.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; all 3 sessions played
  clean in a single sequential browser task.
- Dominant failure mode: false picks on a single photo traffic-light
  board (FP2 in one attempt) — zero FNs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .896 below the .95 bar, R .866 below
  the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo
  expiry rate overall 16/268 = 6.0%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #59 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #58's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T20:07:39Z–20:13:43Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP18 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: motorcycle board
  passed perfect (TP16, all 16 tiles). Session 2: car board passed
  perfect (TP2).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP8 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (palm-tree board; dynamic replacements re-scanned until no tile
  matched, then Verify; a transient tractor misclick was unmarked
  before verifying and did not reach the server as a pick).
- Running per-brief photo totals: v2 = 254 attempts — TP1017 / FP99 /
  FN183, P .911, R .848, exact-board 117/254, expiries 16 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 274, 2 more than the era-split log sum
  (v1 8 + v2.1 10 + v2 254 = 272) — the pre-existing gap noted at
  Run #58, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://0c48112bebbfbf.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .918 below the .95 bar, R .882 below
  the .95 bar, exact-board 18/30 = 60.0% below the 90% bar; v2 photo
  expiry rate overall 16/270 = 5.9%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #60 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #59's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T20:29:57Z–20:32:58Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP8 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: bicycle board
  passed perfect (TP4 scored; 2 ambiguity-band tiles among the
  positives excluded from scoring by the server). Session 2: bicycle
  board passed perfect (TP4).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP8 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bicycle board
  pass).
- Running per-brief photo totals: v2 = 256 attempts — TP1025 / FP99 /
  FN183, P .912, R .849, exact-board 119/256, expiries 16 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 276, 2 more than the era-split log sum
  (v1 8 + v2.1 10 + v2 256 = 274) — the pre-existing gap noted at
  Run #58, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://0c48112bebbfbf.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .950 at the bar, R .884 below the
  .95 bar, exact-board 19/30 = 63.3% below the 90% bar; v2 photo
  expiry rate overall 16/272 = 5.9%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #61 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #60's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T20:47:31Z–20:51:08Z, source live-agent,
2 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP5 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: bicycle board
  passed perfect (TP2). Session 2: motorcycle board passed perfect
  (TP3 scored; 1 ambiguity-band tile among the positives excluded
  from scoring by the server).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 258 attempts — TP1030 / FP99 /
  FN183, P .912, R .849, exact-board 121/258, expiries 16 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 278, 2 more than the era-split log sum
  (v1 8 + v2.1 10 + v2 258 = 276) — the pre-existing gap noted at
  Run #58, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://0c48112bebbfbf.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; all 3 sessions played
  clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; both photo boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .963 clears the .95 bar, R .890 below
  the .95 bar, exact-board 20/30 = 66.7% below the 90% bar; v2 photo
  expiry rate overall 16/274 = 5.8%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #62 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #61's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T21:12:36Z–21:27:16Z, source live-agent,
8 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 7 attempts — TP21 / FP3 / FN15, P .875,
  R .583, exact-board 2/7, expiries 1. Session 1: motorcycle round
  expired unscored (challenge_expired), then a bicycle board passed
  perfect (TP4 scored; 2 band tiles excluded from scoring by the
  server). Session 2 (6 rounds, token on the 6th): bus failed TP6 /
  FP2 / FN3 (partial + whole + partial), motorcycle failed TP2 / FN1
  (sliver; 1 ambiguity error, excluded from scoring), bus failed TP5 /
  FN1 (sliver), car failed TP1 / FP1 / FN7 (partial ×4 + whole ×3),
  fire_hydrant failed TP0 / FN3 (empty_submission; sliver + whole ×2;
  1 ambiguity error, excluded from scoring), then a car board passed
  perfect (TP3).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (bus board; 2 initial matches + 3 replacement matches after fade,
  re-scan clean, then Verify).
- Running per-brief photo totals: v2 = 265 attempts — TP1051 / FP102 /
  FN198, P .912, R .841, exact-board 123/265, expiries 17. Server
  cross-check: all-era scored photo attempts = 285 (compare report,
  bug-era excluded), 2 more than the era-split log sum
  (v1 8 + v2.1 10 + v2 265 = 283) — the pre-existing gap noted at
  Run #58, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2231bd0c31fff1.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; all 3 sessions played
  clean in a single sequential browser task.
- Dominant failure mode: under-selection concentrated in session 2 —
  15 photo FNs across 5 failed boards, worst on the car board
  (FN7, partial/whole misses) and the fire-hydrant board
  (empty_submission, FN3); 3 FPs secondary (bus FP2, car FP1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .944 below the .95 bar, R .797 well
  below the .95 bar, exact-board 18/30 = 60.0% below the 90% bar;
  v2 photo expiry rate overall 17/282 = 6.0%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #63 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #62's force_dynamic).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. The rotating
session ended in terminal cooldown ("Too many attempts") after its
single failed round.
Window arbitrated: 2026-10-11T21:33:09Z–21:42:29Z, source live-agent,
5 scored attempts total, 0 unscored expired attempts. (The
2026-10-11T21:27:16Z synthetic bus attempt belongs to Run #62's
rotating session and is not counted here.)
- Photo (designated sessions): 4 attempts — TP16 / FP1 / FN3, P .941,
  R .842, exact-board 2/4, expiries 0. Session 1: car board failed
  TP2 / FN1 (partial), then a car board passed perfect (TP1; 1
  ambiguity error recorded by the server, excluded from scoring).
  Session 2: car board failed TP0 / FP1 / FN2 (partial ×2; 2
  ambiguity errors recorded by the server, excluded from scoring),
  then a motorcycle board passed perfect (TP13).
- Photo (rotating session also served 1 photo round; counted here —
  same brief, corpus-split): car board failed TP1 / FP2 / FN0.
- Photo run total: 5 attempts — TP17 / FP3 / FN3, P .850, R .850,
  exact-board 2/5, expiries 0. No synthetic-corpus attempts this run
  (the rotating force_low_trust session served a photo Type B round).
- Running per-brief photo totals: v2 = 270 attempts — TP1068 / FP105 /
  FN201, P .910, R .842, exact-board 125/270, expiries 17 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 290, 2 more than the era-split log sum
  (v1 8 + v2.1 10 + v2 270 = 288) — the pre-existing gap noted at
  Run #58, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2231bd0c31fff1.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; all 3 sessions played
  clean in a single sequential browser task.
- Dominant failure mode: mixed errors on photo car boards — the
  rotating board's false picks (FP2) plus partial misses on the
  designated car boards (FN1 + FN2, with FP1 on the second); both
  passing boards were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .930 below the .95 bar, R .809 well
  below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar;
  v2 photo expiry rate overall 17/287 = 5.9%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at 14:43 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #64 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #63's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T21:49:31Z–21:54:30Z, source live-agent,
5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP11 / FP1 / FN0, P .917,
  R 1.000, exact-board 2/3, expiries 0. Session 1: bicycle board failed
  TP4 / FP1 / FN0, then a bicycle board passed perfect (TP4).
  Session 2: traffic-light board passed perfect (TP3).
- Rotating (force_type_b, synthetic Type B): 2 attempts — TP13 / FP1 /
  FN0, P .929, R 1.000, exact-board 1/2, expiries 0. Bicycle board
  failed TP5 / FP1 / FN0, then a car board passed perfect (TP8).
- Running per-brief photo totals: v2 = 273 attempts — TP1079 / FP106 /
  FN201, P .911, R .843, exact-board 127/273, expiries 17 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 293, 2 more than the era-split log sum
  (v1 8 + v2.1 10 + v2 273 = 291) — the pre-existing gap noted at
  Run #58, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2231bd0c31fff1.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: false picks — 1 FP on the first photo
  bicycle board and 1 FP on the synthetic bicycle board; zero FNs
  across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .924 below the .95 bar, R .826 well
  below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar;
  v2 photo expiry rate overall 17/290 = 5.9%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at 14:54 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #65 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #64's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T22:07:48Z–22:21:57Z, source live-agent,
8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 8 attempts — TP24 / FP1 / FN10, P .960,
  R .706, exact-board 2/8, expiries 0. Session 1 (3 attempts, token):
  bicycle board failed TP2 / FN1 (partial), car board failed TP0 /
  FN2 (partial ×2; empty_submission; 2 ambiguity errors recorded by
  the server, excluded from scoring), then a motorcycle board passed
  perfect (TP1). Session 2 (5 attempts, token): bus board failed
  TP9 / FN3 (partial ×3), traffic-light board failed TP3 / FN1
  (partial; 1 ambiguity error, excluded), car board failed TP5 /
  FN3 (sliver ×2 + partial), car board failed TP1 / FP1 (1 ambiguity
  error, excluded), then a motorcycle board passed perfect (TP3).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 281 attempts — TP1103 / FP107 /
  FN211, P .912, R .839, exact-board 129/281, expiries 17 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 301 (compare report), 2 more than the era-split
  log sum (v1 8 + v2.1 10 + v2 281 = 299) — the pre-existing gap
  noted at Run #58, unchanged by this run; rolling-30 below is
  server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING
  (VM replaced — systemctl reported units not found, tunnel and
  local port dead). Revived per protocol: tools/install_services.sh
  reinstalled and enabled both units, services started, LIVE_URL.txt
  tunnel (https://2231bd0c31fff1.lhr.life) verified HTTP 200 (local
  200 too) before any play. The known CAPTCHA-preference glitch
  fired before play began; it was verified via
  get_captcha_preference (solve/all_tasks) and steered once, then
  all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: under-selection on photo boards — all 10
  FNs were partial/sliver misses spread across 5 failed boards
  (worst: bus FN3 partials and car FN3 sliver+partial), plus one
  empty_submission on a car board; a single FP1 was secondary.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .930 below the .95 bar, R .791 well
  below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar;
  v2 photo expiry rate overall 17/298 = 5.7%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the
  PM summary is due on the first completed run after 21:00 PDT, and
  this run completed at 15:22 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #66 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #65's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T22:33:26Z–22:49:57Z, source live-agent,
10 scored attempts total, plus 2 unscored expired photo attempts.
- Photo (designated sessions): 9 attempts — TP40 / FP2 / FN13, P .952,
  R .755, exact-board 2/9, expiries 2. Session 1: traffic-light round
  expired unscored (challenge_expired), then a traffic-light board
  passed perfect (TP3). Session 2 (8 scored attempts, token on the
  last): bicycle failed TP2 / FN2 (sliver ×2), bus failed TP7 / FN2
  (partial ×2), motorcycle failed TP4 / FP2 / FN1 (partial), bicycle
  failed TP9 / FN1 (sliver), a bicycle round expired unscored
  (challenge_expired), fire_hydrant failed TP2 / FN2 (sliver +
  partial), bus failed TP6 / FN4 (partial ×4), bus failed TP5 / FN1
  (partial), then a bicycle board passed perfect (TP2).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (bridge board; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 290 attempts — TP1143 / FP109 /
  FN224, P .913, R .836, exact-board 131/290, expiries 19. Server
  cross-check: all-era scored photo attempts = 310 (compare report,
  bug-era excluded), 2 more than the era-split log sum
  (v1 8 + v2.1 10 + v2 290 = 308) — the pre-existing gap noted at
  Run #58, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2231bd0c31fff1.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: under-selection on photo boards — all 13
  FNs were sliver/partial misses spread across 6 failed boards
  (worst: bus FN4 partials), plus 2 round expiries; the only FPs
  (FP2) were on the motorcycle board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .928 below the .95 bar, R .730 well
  below the .95 bar, exact-board 9/30 = 30.0% below the 90% bar;
  v2 photo expiry rate overall 19/309 = 6.1%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the
  PM summary is due on the first completed run after 21:00 PDT, and
  this run completed at 15:50 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #67 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #66's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T22:58:03Z–23:06:44Z, source live-agent,
7 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 6 attempts — TP18 / FP3 / FN2, P .857,
  R .900, exact-board 2/6, expiries 1. Session 1: car round expired
  unscored (challenge_expired), then a fire-hydrant board passed
  perfect (TP4). Session 2: bus failed TP2 / FN2, traffic_light failed
  TP1 / FP1 / FN0, bicycle failed TP1 / FP1 / FN0, bicycle failed
  TP4 / FP1 / FN0, then a car board passed perfect (TP6).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (bicycle board; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 296 attempts — TP1161 / FP112 /
  FN226, P .912, R .837, exact-board 133/296, expiries 20.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2231bd0c31fff1.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: false picks on photo boards — FP3 spread
  across the traffic-light and two bicycle boards in session 2,
  plus FN2 on the bus board and the 180 s expiry of session 1's car
  round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .915 below the .95 bar, R .800 well
  below the .95 bar, exact-board 10/30 = 33.3% below the 90% bar;
  v2 photo expiry rate overall 20/316 = 6.3%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at 16:07 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #68 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #67's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T23:12:00Z–23:35:31Z, source live-agent,
8 scored attempts total, plus 2 unscored expired photo attempts.
- Photo (designated sessions): 7 attempts — TP21 / FP6 / FN6, P .778,
  R .778, exact-board 2/7, expiries 2. Session 1 (6 scored attempts,
  token): bicycle round expired unscored (challenge_expired), car
  failed TP3 / FP1 / FN0, car round expired unscored
  (challenge_expired), traffic_light failed TP9 / FP0 / FN2
  (partial ×2), motorcycle failed TP1 / FP1 / FN3 (partial ×3),
  traffic_light failed TP2 / FP1 / FN0, car failed TP0 / FP3 / FN1
  (sliver), then a traffic_light board passed perfect (TP3).
  Session 2: traffic-light board passed perfect (TP3) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP6 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (car board pass
  with token).
- Running per-brief photo totals: v2 = 303 attempts — TP1182 / FP118 /
  FN232, P .909, R .836, exact-board 135/303, expiries 22. Server
  cross-check: all-era scored photo attempts = 324 (compare report),
  3 more than the era-split log sum (v1 8 + v2.1 10 + v2 303 = 321)
  — the pre-existing gap was 2 at Runs #58–#66; rolling-30 below is
  server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2231bd0c31fff1.lhr.life verified HTTP 200, local 200 too).
  No parent steer was required this run; the parent verified the
  stored CAPTCHA preference (solve/all_tasks) proactively at spawn.
  NOTE — an interim agent message during play mislabeled several
  rounds after the expiry resets, but the agent's final report
  confirms all 3 sessions tokened, matching the server session log
  (`passed` events at 23:33:09Z, 23:34:09Z, 23:35:31Z). All numbers
  here are server-arbitrated per protocol.
- Dominant failure mode: mixed errors concentrated in session 1 —
  FP6 (worst: car board FP3) and FN6 (motorcycle FN3 partials,
  traffic-light FN2 partials, car FN1 sliver), plus 2 round
  expiries in that same session; sessions 2 and 3 were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .899 below the .95 bar, R .781 well
  below the .95 bar, exact-board 9/30 = 30.0% below the 90% bar;
  v2 photo expiry rate overall 22/325 = 6.8%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at ~16:44 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #69 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #68's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-11T23:53:54Z–23:58:22Z, source live-agent,
3 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 3 attempts — TP8 / FP2 / FN1, P .800,
  R .889, exact-board 2/3, expiries 1. Session 1: motorcycle round
  expired unscored (challenge_expired), then a traffic-light board
  passed perfect (TP2; 2 ambiguity errors recorded by the server,
  excluded from scoring). Session 2: bicycle board failed TP2 /
  FP2 / FN1 (partial miss), then a bicycle board passed perfect
  (TP4).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 306 attempts — TP1190 / FP120 /
  FN233, P .908, R .836, exact-board 137/306, expiries 23. Server
  cross-check: all-era scored photo attempts = 327 (compare report),
  3 more than the era-split log sum (v1 8 + v2.1 10 + v2 306 = 324)
  — the pre-existing gap noted at Run #68, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2231bd0c31fff1.lhr.life verified HTTP 200, local 200 too).
  No parent steer was required this run; the parent verified the
  stored CAPTCHA preference (solve/all_tasks) proactively at spawn,
  and all 3 sessions played clean in a single sequential browser
  task.
- Dominant failure mode: false picks on the first photo bicycle
  board (FP2 in one attempt) plus a single partial miss on that same
  board (the run's only FN), plus the 180 s expiry of session 1's
  motorcycle round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .882 below the .95 bar, R .802 well
  below the .95 bar, exact-board 10/30 = 33.3% below the 90% bar;
  v2 photo expiry rate overall 23/329 = 7.0%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at ~16:59 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #70 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #69's natural).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 2
ended in terminal cooldown ("Too many attempts") after 6 failed rounds.
Window arbitrated: 2026-10-12T00:10:32Z–00:21:36Z, source live-agent,
9 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 8 attempts — TP38 / FP10 / FN22, P .792,
  R .633, exact-board 1/8, expiries 0. Session 1 (2 rounds, token):
  car failed TP6 / FP3 / FN1 (sliver; 1 ambiguity error recorded by
  the server, excluded from scoring), then a bicycle board passed
  perfect (TP4; 1 ambiguity error, excluded). Session 2 (6 attempts,
  no token, terminal cooldown): car failed TP8 / FP1 / FN1 (sliver),
  motorcycle failed TP6 / FP0 / FN7 (partial/whole), fire_hydrant
  failed TP1 / FP1 / FN2 (sliver + whole; 1 ambiguity error,
  excluded), car failed TP2 / FP2 / FN2 (partial ×2), bus failed
  TP4 / FP3 / FN3 (partial + whole ×2; 2 ambiguity errors, excluded),
  motorcycle failed TP7 / FP0 / FN6 (partial/whole).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (traffic-light board; single matching tile clicked, replacements
  re-scanned clean, then Verify, token).
- Running per-brief photo totals: v2 = 314 attempts — TP1228 / FP130 /
  FN255, P .904, R .828, exact-board 138/314, expiries 23 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 335 (compare report, bug-era excluded), 3 more
  than the era-split log sum (v1 8 + v2.1 10 + v2 314 = 332) — the
  pre-existing gap noted at Runs #68–#69, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2231bd0c31fff1.lhr.life verified HTTP 200, local 200 too).
  No parent steer was required this run; the parent verified the
  stored CAPTCHA preference (solve/all_tasks) proactively at spawn,
  and all 3 sessions played clean in a single sequential browser
  task.
- Dominant failure mode: under-selection in session 2 — 21 of the
  run's 22 photo FNs came from that session's six failed boards
  (worst: motorcycle FN7 and motorcycle FN6, both partial/whole
  misses on the same crowded motorcycle photo), with false picks
  secondary (FP10 total, worst FP3 each on session 1's car board
  and session 2's bus board); only 1 of 8 photo boards was exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .846 below the .95 bar, R .747 well
  below the .95 bar, exact-board 9/30 = 30.0% below the 90% bar;
  v2 photo expiry rate overall 23/337 = 6.8%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at ~17:22 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #71 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #70's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T00:32:24Z–00:49:38Z, source live-agent,
7 scored attempts total, plus 2 unscored expired photo attempts.
- Photo (designated sessions): 6 attempts — TP25 / FP4 / FN1, P .862,
  R .962, exact-board 2/6, expiries 2. Session 1: bus round expired
  unscored (challenge_expired, during the pre-play CAPTCHA-preference
  pause), then the same bus board passed perfect (TP4). Session 2
  (5 scored rounds, token on the 5th): motorcycle failed TP5 / FP1 /
  FN0, bicycle failed TP4 / FP1 / FN0, car round expired unscored
  (challenge_expired), car failed TP1 / FP2 / FN0 (1 ambiguity error
  recorded by the server, excluded from scoring), car failed TP3 /
  FP0 / FN1 (sliver; 1 ambiguity error, excluded), then a
  fire-hydrant board passed perfect (TP8).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (bus board; initial match plus 1 replacement match after fade,
  re-scan clean, then Verify, token).
- Running per-brief photo totals: v2 = 320 attempts — TP1253 / FP134 /
  FN256, P .903, R .830, exact-board 140/320, expiries 25. Server
  cross-check: all-era scored photo attempts = 341 (compare report,
  bug-era excluded), 3 more than the era-split log sum
  (v1 8 + v2.1 10 + v2 320 = 338) — the pre-existing gap noted at
  Runs #68–#70, unchanged by this run; rolling-30 below is
  server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2231bd0c31fff1.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then all 3 sessions played clean in a single
  sequential browser task. That pause contributed to session 1's
  first-round expiry (unsubmitted, unscored).
- Dominant failure mode: false picks on photo boards — 4 FPs this
  run (FP2 on one car board, FP1 each on the motorcycle and bicycle
  boards); the only FN was a sliver miss on the second car board.
  The other losses were the 2 photo round expiries.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .818 below the .95 bar, R .778 well
  below the .95 bar, exact-board 9/30 = 30.0% below the 90% bar;
  v2 photo expiry rate overall 25/345 = 7.2%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at ~17:50 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #72 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #71's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T00:56:47Z–01:07:42Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP16 / FP3 / FN3, P .842,
  R .842, exact-board 2/5, expiries 0. Session 1: motorcycle board
  failed TP6 / FP0 / FN1 (sliver), car board failed TP0 / FP0 / FN2
  with an empty_submission procedure error (2 ambiguity errors
  recorded by the server), then a car board passed perfect (TP1;
  1 ambiguity error, excluded). Session 2: car board failed TP1 /
  FP3 / FN0, then a fire-hydrant board passed perfect (TP8).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP7 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (stairs board
  pass).
- Running per-brief photo totals: v2 = 325 attempts — TP1269 / FP137 /
  FN259, P .903, R .831, exact-board 142/325, expiries 25 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 346 (compare report, bug-era excluded), 3 more
  than the era-split log sum (v1 8 + v2.1 10 + v2 325 = 343) — the
  pre-existing gap noted at Runs #68–#71, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2231bd0c31fff1.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then all 3 sessions played clean in a single
  sequential browser task.
- Dominant failure mode: mixed — false picks on session 2's car
  board (FP3, the run's only FPs) plus an empty submission on
  session 1's car board (FN2) and a sliver miss on the motorcycle
  board (FN1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .820 below the .95 bar, R .776 well
  below the .95 bar, exact-board 10/30 = 33.3% below the 90% bar;
  v2 photo expiry rate overall 25/350 = 7.1%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at ~18:08 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #73 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating (natural, next in rotation after Run #72's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T01:12:45Z–01:20:19Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP25 / FP0 / FN10, P 1.000, R 0.714, exact-board 2/7, expiries 0.
  FN bands: 2 sliver, 6 partial, 2 other (empty_submission procedure error on bicycle board; 2 positives missed).
- Rotating (natural): 0 scored attempts (checkbox-only token).
- Running per-brief photo totals: v2 = 332 attempts — TP1294 / FP137 / FN269, P .904, R .828, exact-board 144/332, expiries 25.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with gym/tunnel (systemd units active, tunnel https://2231bd0c31fff1.lhr.life HTTP 200 at pre-flight). CAPTCHA-preference glitch fired once; verified via get_captcha_preference (solve/all_tasks) and steered once, then played clean.
- Dominant failure mode: under-selection on photo boards — all FN were missed tiles (sliver/partial), plus one empty submission on bicycle board (FN2) where the grid contained no visible bicycle.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .861, R .761, exact-board 10/30 = 33.3%; v2 photo expiry rate overall 25/357 = 7.0% within ≤10% limit.
- Reporting: no immediate trigger fired and no twice-daily summary was due (PM summary due on first run after 21:00 PDT; this run completed ~18:21 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #74 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #73's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T01:29:35Z–01:31:46Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP4 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed
  perfect (TP2 scored; 1 ambiguity-band tile among the positives
  excluded from scoring by the server). Session 2: fire-hydrant board
  passed perfect (TP2).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (mountain board; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 334 attempts — TP1298 / FP137 /
  FN269, P .905, R .828, exact-board 146/334, expiries 25. Server
  cross-check: all-era scored photo attempts = 355 (compare report),
  3 more than the era-split log sum (v1 8 + v2.1 10 + v2 334 = 352)
  — the pre-existing gap noted at Runs #68–#73, unchanged by this
  run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were INACTIVE
  (tunnel returned 502, local port dead). Revived per protocol:
  tools/install_services.sh reinstalled and enabled both units,
  services started, LIVE_URL.txt tunnel
  (https://2231bd0c31fff1.lhr.life) verified HTTP 200 (local 200 too)
  before any play. The known CAPTCHA-preference glitch fired before
  play began; it was verified via get_captcha_preference
  (solve/all_tasks) and steered once, then all 3 sessions played
  clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .857 below the .95 bar, R .755 well
  below the .95 bar, exact-board 10/30 = 33.3% below the 90% bar;
  v2 photo expiry rate overall 25/359 = 7.0%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at ~18:32 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #75 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #74's force_dynamic).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. The rotating
session ended in terminal cooldown ("Too many attempts") after its
single failed round.
Window arbitrated: 2026-10-12T01:49:28Z–01:52:48Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP3 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed
  perfect (TP1). Session 2: car board passed perfect (TP2).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP2 / FP1 / FN0, P .667, R 1.000, exact-board 0/1, expiries 0
  (mountain board failed; dynamic replacements re-scanned, then
  Verify; session entered terminal cooldown, no token).
- Running per-brief photo totals: v2 = 336 attempts — TP1301 / FP137 /
  FN269, P .905, R .829, exact-board 148/336, expiries 25 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 357 (compare report), 3 more than the era-split log
  sum (v1 8 + v2.1 10 + v2 336 = 354) — the pre-existing gap noted at
  Runs #68–#74, unchanged by this run; rolling-30 below is
  server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2231bd0c31fff1.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none in photo play this run — zero FPs and
  zero FNs on photo boards, both exact; the only error was a single
  false pick on the rotating synthetic mountain board (FP1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .867 below the .95 bar, R .755 well
  below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar;
  v2 photo expiry rate overall 25/361 = 6.9%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at ~18:53 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #76 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #75's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T02:07:07Z–02:20:48Z, source live-agent,
5 scored attempts total, plus 1 unscored expired attempt.
- Photo (designated sessions): 3 attempts — TP14 / FP0 / FN3, P 1.000,
  R .824, exact-board 2/3, expiries 0. Session 1: car board failed
  TP4 / FP0 / FN3 (partial ×2, sliver ×1; 1 ambiguity error recorded
  by the server, excluded from scoring), then a car board passed
  perfect (TP6; 1 ambiguity error, excluded). Session 2: car board
  passed perfect (TP4).
- Rotating (force_type_b, synthetic Type B): 2 scored attempts —
  TP10 / FP1 / FN0, P .909, R 1.000, exact-board 1/2, expiries 1
  (unscored, photo corpus). Fire-hydrant board failed TP5 / FP1 /
  FN0, then a motorcycle round expired unscored (challenge_expired,
  photo corpus — counted in the photo expiry total below), the
  session re-checked, and a palm-tree board passed perfect (TP5)
  with token.
- Running per-brief photo totals: v2 = 339 attempts — TP1315 / FP137 /
  FN272, P .906, R .829, exact-board 150/339, expiries 26. Server
  cross-check: all-era scored photo attempts = 360 (compare report),
  3 more than the era-split log sum (v1 8 + v2.1 10 + v2 339 = 357)
  — the pre-existing gap noted at Runs #68–#75, unchanged by this
  run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then all 3 sessions played clean in a single
  sequential browser task.
- Dominant failure mode: partial/sliver misses on session 1's first
  photo car board (all 3 photo FNs in one attempt) — zero photo FPs
  this run; the only FP was on the rotating synthetic fire-hydrant
  board, and the only other loss was the expired motorcycle round
  in the rotating session (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .892 below the .95 bar, R .743 well
  below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar;
  v2 photo expiry rate overall 26/365 = 7.1%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at ~19:21 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #77 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #76's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T02:28:07Z–02:35:46Z, source live-agent,
7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP35 / FP2 / FN6, P .946,
  R .854, exact-board 2/7, expiries 0. Session 1 (3 rounds, token):
  car failed TP2 / FN1 (partial), car failed TP2 / FN1 (sliver;
  1 ambiguity error recorded by the server, excluded from scoring),
  then a fire-hydrant board passed perfect (TP4). Session 2
  (4 rounds, token): bus failed TP6 / FN1 (partial; 1 ambiguity
  error, excluded), bus failed TP5 / FP2 / FN1 (sliver), motorcycle
  failed TP12 / FN2 (partial ×2), then a car board passed perfect
  (TP4).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 346 attempts — TP1350 / FP139 /
  FN278, P .907, R .829, exact-board 152/346, expiries 26 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 367, 3 more than the era-split log sum
  (v1 8 + v2.1 10 + v2 346 = 364) — the pre-existing gap noted at
  Runs #68–#76, unchanged by this run; rolling-30 below is
  server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: under-selection on photo boards — all
  6 photo FNs were partial/sliver misses (partial ×4, sliver ×2
  across the car, bus, and motorcycle boards); the only FPs were
  FP2 on session 2's second bus board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .934 below the .95 bar, R .831 well
  below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar;
  v2 photo expiry rate overall 26/372 = 7.0%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at ~19:36 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #78 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #77's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T02:48:14Z–02:54:40Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP24 / FP1 / FN2, P .960,
  R .923, exact-board 2/5, expiries 0. Session 1 (4 rounds, token):
  bicycle failed TP0 / FN1 (sliver; empty_submission), motorcycle
  failed TP7 / FN1 (partial), motorcycle failed TP5 / FP1 / FN0,
  then a traffic-light board passed perfect (TP4). Session 2:
  car board passed perfect (TP8).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (stairs board; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 351 attempts — TP1374 / FP140 /
  FN280, P .908, R .831, exact-board 154/351, expiries 26 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 372 (compare report), 3 more than the era-split log
  sum (v1 8 + v2.1 10 + v2 351 = 369) — the pre-existing gap noted at
  Runs #68–#77, unchanged by this run; rolling-30 below is
  server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: under-selection on session 1's first two
  photo boards — a sliver miss with empty_submission on the bicycle
  board (TP0 / FN1) and a partial miss on the motorcycle board
  (TP7 / FN1); the only FP was on session 1's second motorcycle
  board (TP5 / FP1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .950 at the bar, R .833 well below
  the .95 bar, exact-board 14/30 = 46.7% below the 90% bar;
  v2 photo expiry rate overall 26/377 = 6.9%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at ~19:55 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #79 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #78's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T03:08:32Z–03:13:19Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP11 / FP3 / FN0, P .786,
  R 1.000, exact-board 2/3, expiries 0. Session 1: car board passed
  perfect (TP2). Session 2: bicycle board failed TP2 / FP3 / FN0
  (1 ambiguity error recorded by the server, excluded from scoring),
  then a car board passed perfect (TP7).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (bus board; the single matching tile faded, was replaced by a
  non-matching tile, re-scan clean, then Verify).
- Running per-brief photo totals: v2 = 354 attempts — TP1385 / FP143 /
  FN280, P .906, R .832, exact-board 156/354, expiries 26 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 375 (compare report), 3 more than the era-split log
  sum (v1 8 + v2.1 10 + v2 354 = 372) — the pre-existing gap noted at
  Runs #68–#78, unchanged by this run; rolling-30 below is
  server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on a single photo bicycle board
  (all 3 photo FPs in one attempt) — zero FNs this run; both car
  boards and the rotating board were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .954 clears the .95 bar, R .855 remains
  well below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar;
  v2 photo expiry rate overall 26/380 = 6.8%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at ~20:13 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #80 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #79's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T03:32:56Z–03:37:07Z, source live-agent,
3 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 2 attempts — TP18 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 1. Session 1: motorcycle round
  expired unscored (challenge_expired), then a traffic-light board
  passed perfect (TP4; 2 band tiles among the positives, excluded
  from scoring by the server as scored TP4). Session 2: motorcycle
  board passed perfect (TP14).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP5 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (palm-tree board
  pass).
- Running per-brief photo totals: v2 = 356 attempts — TP1403 / FP143 /
  FN280, P .908, R .834, exact-board 158/356, expiries 27. Server
  cross-check: all-era scored photo attempts = 377 (compare report),
  3 more than the era-split log sum (v1 8 + v2.1 10 + v2 356 = 374)
  — the pre-existing gap noted at Runs #68–#79, unchanged by this
  run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then all 3 sessions played clean in a single
  sequential browser task.
- Dominant failure mode: none in scored play this run — zero FPs and
  zero FNs across all corpora; both scored photo boards were exact.
  The only loss was the 180 s expiry of session 1's first photo
  motorcycle round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .957 clears the .95 bar, R .863 remains
  well below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar;
  v2 photo expiry rate overall 27/383 = 7.0%, within the ≤10%
  limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 AM summary was delivered at Run #47; the PM
  summary is due on the first completed run after 21:00 PDT, and
  this run completed at ~20:37 PDT). Human baseline unchanged
  (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #81 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #80's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T03:49:28Z–04:00:16Z, source live-agent,
6 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 4 attempts — TP17 / FP2 / FN0, P .895,
  R 1.000, exact-board 2/4, expiries 0. Session 1: bus board failed
  TP9 / FP1 / FN0 (1 ambiguity error recorded by the server, excluded
  from scoring), then a traffic-light board passed perfect (TP3).
  Session 2: car board failed TP3 / FP1 / FN0, then a car board
  passed perfect (scored TP2; 1 band tile among the selections,
  excluded from scoring by the server).
- Photo (rotating session also served photo rounds; counted here —
  same brief, corpus-split): 1 scored attempt — car board failed
  TP1 / FP1 / FN0, plus 1 unscored expired car attempt
  (challenge_expired).
- Photo run total: 5 attempts — TP18 / FP3 / FN0, P .857, R 1.000,
  exact-board 2/5, expiries 1.
- Synthetic (rotating session): 1 attempt — TP4 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 1/1, expiries 0 (mountain board pass, token).
- Running per-brief photo totals: v2 = 361 attempts — TP1421 / FP146 /
  FN280, P .907, R .835, exact-board 160/361, expiries 28. Server
  cross-check: all-era scored photo attempts = 382 (compare report),
  3 more than the era-split log sum (v1 8 + v2.1 10 + v2 361 = 379)
  — the pre-existing gap noted at Runs #68–#80, unchanged by this
  run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then all 3 sessions played clean in a single
  sequential browser task.
- Dominant failure mode: false picks on photo boards — all 3 photo
  FPs came one per failed board (bus, car, and the rotating car
  board); zero FNs this run. The other loss was the 180 s expiry of
  the rotating session's second car round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .935 below the .95 bar, R .922 below
  the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo
  expiry rate overall 28/389 = 7.2%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired. The twice-daily PM summary
  IS due with this run (first completed run after 21:00 PDT) and is
  delivered in the run's chat report: Runs #48–#81 completed since
  the AM summary (34 runs; server sessions 102 created / 99 passed
  events in that window), 152 scored photo attempts banked under v2
  (209 → 361), cumulative v2 photo line P .907 / R .835 /
  exact-board 160/361, rolling-30 P .935 / R .922 / exact 17/30,
  expiry rate 7.2% overall, parity NOT reached (exact-board remains
  the largest gap, then precision/recall), dominant failure mode
  over the period remains sliver/partial under-selection on photo
  boards with episodic FP blowups, notable incidents include the
  Run #48 tunnel death/revival and repeated CAPTCHA-preference
  glitch steers. Human baseline unchanged (human-ben — 3 sessions,
  2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).
Summary delivered: 2026-10-11 PM

### Run #82 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #81's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure. (One extra
session record was created at the first load, which hit a tunnel /
Chrome error page and never recorded an attempt — unscored; the
agent reloaded and played session 1 clean.)
Window arbitrated: 2026-10-12T04:06:55Z–04:14:41Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP4 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed
  perfect (TP1). Session 2: traffic-light board passed perfect (TP3).
- Rotating (force_dynamic, synthetic Type A dynamic): 2 attempts —
  TP4 / FP0 / FN1, P 1.000, R .800, exact-board 1/2, expiries 0.
  Fire-hydrant board failed TP2 / FN1, then a crosswalk board passed
  perfect (TP2; dynamic replacement re-scanned and also marked, then
  Verify once no tile matched).
- Running per-brief photo totals: v2 = 363 attempts — TP1425 / FP146 /
  FN280, P .907, R .836, exact-board 162/363, expiries 28 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 384 (compare report), 3 more than the era-split log
  sum (v1 8 + v2.1 10 + v2 363 = 381) — the pre-existing gap noted at
  Runs #68–#81, unchanged by this run; rolling-30 below is
  server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel at pre-flight (both
  systemd units active, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  The first navigation hit a tunnel / Chrome error page; a reload
  loaded the gym and play proceeded — no scored session was lost.
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: none in photo play this run — zero FPs and
  zero FNs on photo boards, both exact; the only error was a single
  missed tile on the rotating synthetic fire-hydrant board (FN1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .935 below the .95 bar, R .921 below
  the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo
  expiry rate overall 28/391 = 7.2%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 PM summary was already delivered at
  Run #81; marker `Summary delivered: 2026-10-11 PM` is present, so
  no duplicate is sent). Human baseline unchanged (human-ben —
  3 sessions, 2 scored attempts total, 1 scored photo attempt
  TP12 / FP0 / FN0).

### Run #83 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #82's force_dynamic).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. The rotating
session ended in terminal cooldown ("Too many attempts") after its
single failed round.
Window arbitrated: 2026-10-12T04:29:05Z–04:33:37Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP10 / FP1 / FN0, P .909,
  R 1.000, exact-board 2/3, expiries 0. Session 1: traffic-light board
  passed perfect (TP2). Session 2: car board failed TP4 / FP1 / FN0,
  then a car board passed perfect (TP4).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP4 / FP0 / FN0 scored, P 1.000, R 1.000, exact-board 1/1 by scored
  definition, expiries 0 (stairs board server-failed on a single
  ambiguity-band tile — fn_all 1, ambiguity_errors 1, excluded from
  scored FN — then Verify after dynamic replacements re-scanned;
  session entered terminal cooldown, no token).
- Running per-brief photo totals: v2 = 366 attempts — TP1435 / FP147 /
  FN280, P .907, R .837, exact-board 164/366, expiries 28 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 387 (compare report), 3 more than the era-split log
  sum (v1 8 + v2.1 10 + v2 366 = 384) — the pre-existing gap noted at
  Runs #68–#82, unchanged by this run; rolling-30 below is
  server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: a single false pick on session 2's first
  photo car board (the run's only photo FP) — zero FNs across all
  corpora; the rotating loss was the ambiguity-band tile on the
  synthetic stairs board, excluded from scoring.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .931 below the .95 bar, R .924 below
  the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo
  expiry rate overall 28/394 = 7.1%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 PM summary was already delivered at
  Run #81; marker `Summary delivered: 2026-10-11 PM` is present, so
  no duplicate is sent). Human baseline unchanged (human-ben —
  3 sessions, 2 scored attempts total, 1 scored photo attempt
  TP12 / FP0 / FN0).

### Run #84 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #83's force_low_trust).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 1
ended in terminal cooldown after repeated failed rounds.
Window arbitrated: 2026-10-12T04:47:18Z–04:58:58Z, source live-agent,
8 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 7 attempts — TP18 / FP7 / FN13, P .720,
  R .581, exact-board 1/7, expiries 1. Session 1: first motorcycle
  round expired unscored (challenge_expired), then 6 scored fails —
  motorcycle TP4 / FP2 / FN9, fire hydrant TP1 / FP1 / FN1, car
  TP1 / FP1 / FN1, traffic light TP1 / FP1 / FN1, fire hydrant
  TP1 / FP1 / FN1, bicycle TP2 / FP1 / FN0 — ending in terminal
  cooldown, no token. Session 2: bus board passed perfect (TP8).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP6 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bridge board
  pass, token).
- Running per-brief photo totals: v2 = 373 attempts — TP1453 / FP154 /
  FN293, P .904, R .832, exact-board 165/373, expiries 29. Server
  cross-check: all-era scored photo attempts = 394 (compare report),
  3 more than the era-split log sum (v1 8 + v2.1 10 + v2 373 = 391)
  — the pre-existing gap noted at Runs #68–#83, unchanged by this
  run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then all 3 sessions played clean in a single
  sequential browser task.
- Dominant failure mode: severe under-selection on session 1's
  second motorcycle board (FN9) plus one false pick on each of 5
  consecutive failed photo boards in that session — zero errors in
  sessions 2–3.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .879 below the .95 bar, R .873 below
  the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo
  expiry rate overall 29/402 = 7.2%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 PM summary was already delivered at
  Run #81; marker `Summary delivered: 2026-10-11 PM` is present, so
  no duplicate is sent). Human baseline unchanged (human-ben —
  3 sessions, 2 scored attempts total, 1 scored photo attempt
  TP12 / FP0 / FN0).

### Run #85 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #84's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T05:10:45Z–05:13:47Z, source live-agent,
2 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 2 attempts — TP12 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 1. Session 1: bus round expired
  unscored (challenge_expired), then a car board passed perfect (TP8).
  Session 2: traffic-light board passed perfect (TP4 scored; 2
  ambiguity-band tiles excluded from scoring by the server).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 375 attempts — TP1465 / FP154 /
  FN293, P .905, R .833, exact-board 167/375, expiries 30. Server
  cross-check: all-era scored photo attempts = 396, 3 more than the
  era-split log sum (v1 8 + v2.1 10 + v2 375 = 393) — the pre-existing
  gap noted at Runs #68–#84, unchanged by this run; rolling-30 below
  is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were INACTIVE
  (tunnel 502, local port dead). Revived per protocol:
  tools/install_services.sh reinstalled and enabled both units,
  services started, LIVE_URL.txt tunnel
  (https://71fa19f5a86c5c.lhr.life) verified HTTP 200 (local 200 too)
  before any play. No CAPTCHA-preference pause was reported in the
  single sequential browser task; all 3 sessions played clean.
- Dominant failure mode: none in scored play — zero FPs and zero FNs;
  the only loss was the 180 s expiry of session 1's photo bus round
  (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .888 below the .95 bar, R .888 below
  the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo
  expiry rate overall 30/405 = 7.4%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 PM summary was already delivered at
  Run #81; marker `Summary delivered: 2026-10-11 PM` is present, so
  no duplicate is sent). Human baseline unchanged (human-ben —
  3 sessions, 2 scored attempts total, 1 scored photo attempt
  TP12 / FP0 / FN0).

### Run #86 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #85's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T05:28:39Z–05:32:35Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP15 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: traffic-light board
  passed perfect (TP3). Session 2: bus board passed perfect (TP12).
- Rotating (force_dynamic, synthetic Type A dynamic): 2 attempts —
  TP2 / FP0 / FN1, P 1.000, R .667, exact-board 1/2, expiries 0.
  Crosswalk board failed TP1 / FN1, then a palm-tree board passed
  perfect (TP1); dynamic replacements re-scanned until no tile
  matched before each Verify.
- Running per-brief photo totals: v2 = 377 attempts — TP1480 / FP154 /
  FN293, P .906, R .835, exact-board 169/377, expiries 30 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 398 (compare report), 3 more than the era-split log
  sum (v1 8 + v2.1 10 + v2 377 = 395) — the pre-existing gap noted at
  Runs #68–#85, unchanged by this run; rolling-30 below is
  server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then all 3 sessions played clean in a single
  sequential browser task.
- Dominant failure mode: none in photo play this run — zero FPs and
  zero FNs on photo boards, both exact; the only error was a single
  missed tile on the rotating synthetic crosswalk board (FN1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .897 below the .95 bar, R .903 below
  the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo
  expiry rate overall 30/407 = 7.4%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 PM summary was already delivered at
  Run #81; marker `Summary delivered: 2026-10-11 PM` is present, so
  no duplicate is sent). Human baseline unchanged (human-ben —
  3 sessions, 2 scored attempts total, 1 scored photo attempt
  TP12 / FP0 / FN0).

### Run #87 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #86's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T05:52:00Z–05:55:02Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP10 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: bicycle board
  passed perfect (TP4). Session 2: bus board passed perfect (TP6).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (fire-hydrant board; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 379 attempts — TP1490 / FP154 /
  FN293, P .906, R .836, exact-board 171/379, expiries 30 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 400 (compare report), 3 more than the era-split log
  sum (v1 8 + v2.1 10 + v2 379 = 397) — the pre-existing gap noted at
  Runs #68–#86, unchanged by this run; rolling-30 below is
  server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task. Note: session 1's first car grid was abandoned when
  the agent navigated to an enlarged image view, which reset the
  challenge — no server attempt was recorded for that grid
  (unscored, not an expiry); the session then passed on its bicycle
  board.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; all 3 boards were exact on the first submitted attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .901 below the .95 bar, R .908 below
  the .95 bar, exact-board 19/30 = 63.3% below the 90% bar; v2 photo
  expiry rate overall 30/409 = 7.3%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 PM summary was already delivered at
  Run #81; marker `Summary delivered: 2026-10-11 PM` is present, so
  no duplicate is sent). Human baseline unchanged (human-ben —
  3 sessions, 2 scored attempts total, 1 scored photo attempt
  TP12 / FP0 / FN0).

### Run #88 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #87's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T06:06:09Z–06:13:50Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP15 / FP0 / FN2, P 1.000,
  R .882, exact-board 2/4, expiries 0. Session 1: car board failed
  TP7 / FN1, car board failed TP2 / FN1, then a car board passed
  (TP2; 1 ambiguity error recorded by the server, excluded from
  scoring). Session 2: bicycle board passed perfect (TP4).
- Photo (rotating session also served photo rounds; counted here —
  same brief, corpus-split): 2 attempts — TP6 / FP1 / FN1, P .857,
  R .857, exact-board 1/2, expiries 0. Motorcycle board failed
  TP3 / FP1 / FN1, then a bicycle board passed perfect (TP3).
- Photo run total: 6 attempts — TP21 / FP1 / FN3, P .955, R .875,
  exact-board 3/6, expiries 0.
- Synthetic: 0 scored attempts this run (the rotating force_type_b
  session served photo-corpus rounds only).
- Running per-brief photo totals: v2 = 385 attempts — TP1511 / FP155 /
  FN296, P .907, R .836, exact-board 174/385, expiries 30 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 406 (compare report), 3 more than the era-split log
  sum (v1 8 + v2.1 10 + v2 385 = 403) — the pre-existing gap noted at
  Runs #68–#87, unchanged by this run; rolling-30 below is
  server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: single-tile under-selection on photo car
  boards (FN1 on each of session 1's two failed boards) plus one
  FP1/FN1 pair on the rotating motorcycle board — no exact-board
  blowup this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .910 below the .95 bar, R .884 below
  the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo
  expiry rate overall 30/415 = 7.2%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 PM summary was already delivered at
  Run #81; marker `Summary delivered: 2026-10-11 PM` is present, so
  no duplicate is sent). Human baseline unchanged (human-ben —
  3 sessions, 2 scored attempts total, 1 scored photo attempt
  TP12 / FP0 / FN0).

### Run #89 — continuous run (2026-10-11, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #88's force_type_b).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 2
ended in terminal cooldown ("Too many attempts") after 6 failed rounds.
Window arbitrated: 2026-10-12T06:28:52Z–06:42:36Z, source live-agent,
16 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 16 attempts — TP74 / FP16 / FN12,
  P .822, R .860, exact-board 1/16, expiries 1. Session 1 (10 scored
  attempts + 1 expired fire-hydrant round, token on the last):
  TP51 / FP7 / FN8, exact 1/10. Session 2 (6 attempts, no token,
  terminal cooldown): TP23 / FP9 / FN4, exact 0/6 (traffic_light,
  traffic_light, motorcycle, traffic_light, bus, fire_hydrant boards).
  FN bands this run: partial ×8, sliver ×4.
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 401 attempts — TP1585 / FP171 /
  FN308, P .903, R .837, exact-board 175/401, expiries 31. Server
  cross-check: all-era scored photo attempts = 422, 3 more than the
  era-split log sum (v1 8 + v2.1 10 + v2 401 = 419) — the pre-existing
  gap noted at Runs #68–#88, unchanged by this run; rolling-30 below
  is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://71fa19f5a86c5c.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: false picks on photo boards — 16 FPs this
  run (FP9 across session 2's 6 boards, FP7 across session 1's 10),
  with under-selection secondary (FN12, partial ×8 / sliver ×4);
  only 1 of 16 photo boards was exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .887 below the .95 bar, R .904 below
  the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo
  expiry rate overall 31/432 = 7.2%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (the 2026-10-11 PM summary was already delivered at
  Run #81; marker `Summary delivered: 2026-10-11 PM` is present, so
  no duplicate is sent; the next AM summary is due on the first
  completed run after 09:00 PDT on 2026-10-12). Human baseline
  unchanged (human-ben — 2 scored attempts total, 1 scored photo
  attempt TP12 / FP0 / FN0).

### Run #91 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #90's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T07:07:28Z–07:17:19Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP29 / FP1 / FN4, P .967,
  R .879, exact-board 2/5, expiries 0. Session 1: car board failed
  TP1 / FP1 / FN1 (sliver), car board failed TP3 / FP0 / FN1 (sliver),
  then a car board passed perfect (TP7). Session 2: motorcycle board
  failed TP2 / FP0 / FN2 (sliver + partial), then a motorcycle board
  passed perfect (TP16, all 16 tiles).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (palm-tree board; the initial tile and its dynamic replacement were
  both palm trees and both marked, re-scan clean, then Verify).
- Running per-brief photo totals: v2 = 408 attempts — TP1622 / FP172 /
  FN312, P .904, R .839, exact-board 179/408, expiries 31 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 429 (compare report), 3 more than the era-split log
  sum (v1 8 + v2.1 10 + v2 408 = 426) — the pre-existing gap noted at
  Runs #68–#90, unchanged by this run; rolling-30 below is server-based.
- RECONCILIATION NOTE — Run #90 body entry missing: at this run's
  pre-flight the running-totals header already included Run #90
  (v2 = 403 attempts) but no Run #90 batch entry existed in this log.
  Server records for that run (2026-10-12T06:46:27Z–06:50:23Z) show
  3 sessions, 3 tokens: 2 scored photo attempts — bicycle board passed
  perfect (TP4) and bus board passed perfect (TP4) — plus a rotating
  force_dynamic synthetic stairs board passed perfect (TP2). Those
  2 photo attempts are counted in the header totals only; do NOT
  re-add them. This run is numbered #91 chronologically, and its
  rotation follows Run #90's force_dynamic.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2850289d02e158.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo
  boards — all 4 photo FNs this run (sliver ×3, partial ×1, across
  the car and motorcycle boards), plus a single FP on session 1's
  first car board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .885 below the .95 bar, R .879 below
  the .95 bar, exact-board 9/30 = 30.0% below the 90% bar; v2 photo
  expiry rate overall 31/439 = 7.1%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 00:17 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #93 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #92's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T07:47:08Z–07:49:47Z, source live-agent,
2 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP4 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed
  perfect (TP2). Session 2: car board passed perfect (TP2).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 413 attempts — TP1639 / FP172 /
  FN315, P .905, R .839, exact-board 183/413, expiries 31 (all from
  earlier v2 eras; 0 this run). Server cross-check: all-era scored
  photo attempts = 434 (compare report), 3 more than the era-split log
  sum (v1 8 + v2.1 10 + v2 413 = 431) — the pre-existing gap noted at
  Runs #68–#92, unchanged by this run; rolling-30 below is
  server-based.
- RECONCILIATION NOTE — Run #92 body entry missing: at this run's
  pre-flight the running-totals header already included Run #92
  (v2 = 411 attempts) but no Run #92 batch entry existed in this log.
  Server records for that run (2026-10-12T07:26:46Z–07:31:57Z) show
  3 sessions, 3 tokens: 3 scored photo attempts — car board failed
  TP5 / FN3 (sliver ×2, partial ×1), motorcycle board passed perfect
  (TP6), fire-hydrant board passed perfect (TP2) — plus a rotating
  force_type_b synthetic chimney board passed perfect (TP2). Those
  3 photo attempts are counted in the header totals only; do NOT
  re-add them. This run is numbered #93 chronologically, and its
  rotation follows Run #92's force_type_b.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2850289d02e158.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; both photo boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .882 below the .95 bar, R .870 below
  the .95 bar, exact-board 10/30 = 33.3% below the 90% bar; v2 photo
  expiry rate overall 31/444 = 7.0%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 00:49 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #94 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating (force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T08:06:30Z–08:20:13Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP27 / FP4 / FN2, P .871, R .931, exact-board 2/7, expiries 0.
- Synthetic (force_dynamic): 1 attempt — TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0.
- Running per-brief photo totals: v2 = 420 attempts — TP1666 / FP176 / FN317, P .904, R .840, exact-board 185/420, expiries 31.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none (services active, tunnel URL verified, CAPTCHA preference verified solve/all_tasks, no tunnel death).
- Dominant failure mode: partial/sliver under-selection and false picks on photo boards (FN2 sliver×2, FP4 distributed across traffic_light×1, fire_hydrant×1, car×1, bus×1).
- Parity-window status: NOT PARITY. Rolling-30 window (server-based, inclusive) to be computed; prior rolling-30 was P .882 / R .870 / exact 10/30 =33.3% with expiries 7.0%, still below bars.

### Run #95 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #94's force_dynamic).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 3
ended in terminal cooldown ("Too many attempts") after 1 round.
Window arbitrated: 2026-10-12T08:28:07Z–08:33:39Z, source live-agent,
run_id run_2026-10-12_c005d3, 6 scored attempts total, 0 unscored
expired attempts.
- Photo (designated sessions): 5 attempts — TP21 / FP2 / FN2, P .913,
  R .913, exact-board 2/5, expiries 0. Session 1: motorcycle board
  failed TP5 / FP1 / FN0, then a car board passed perfect (TP2).
  Session 2: traffic-light board failed TP2 / FP1 / FN0, bus board
  failed TP8 / FP0 / FN2 (partial ×2), then a fire-hydrant board
  passed perfect (TP4).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP2 / FP0 / FN0 on the scored fields, P 1.000, R 1.000,
  exact-board 0/1, expiries 0 (traffic-light board; server result
  fail with 1 ambiguity error / fn_all 1 — a band tile — and the
  session ended in terminal cooldown, no token).
- Running per-brief photo totals: v2 = 425 attempts — TP1687 /
  FP178 / FN319, P .905, R .841, exact-board 187/425, expiries 31
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 448, 5 more than the era-split log
  sum (v1 8 + v2.1 10 + v2 425 = 443) — the gap noted as 3 at
  Run #93 grew by 2, most likely in Run #94's abbreviated entry;
  rolling-30 below is server-based regardless.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING
  (VM replaced — systemctl reported units not found, tunnel 502,
  local port dead). Revived per protocol: tools/install_services.sh
  reinstalled and enabled both units, services started, LIVE_URL.txt
  tunnel (https://2850289d02e158.lhr.life) verified HTTP 200 (local
  200 too) before any play. The known CAPTCHA-preference glitch
  fired before play began; it was verified via get_captcha_preference
  (solve/all_tasks) and steered once, then all 3 sessions played
  clean in a single sequential browser task.
- Dominant failure mode: mixed small errors on photo boards — 2
  false picks (motorcycle FP1, traffic-light FP1) and 2 partial-tile
  misses on the bus board (FN2, both partial band); no
  whole-instance cluster miss and no expiry this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .887 below the .95 bar, R .893 below
  the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo
  expiry rate overall 31/456 = 6.8%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 01:33 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 2 scored attempts total, 1 scored
  photo attempt TP12 / FP0 / FN0).

### Run #96 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #95's force_low_trust).
Sessions: 3 played, 1 token, 0 lost to infrastructure. Sessions 2 and 3
ended in terminal cooldown ("Too many attempts").
Window arbitrated: 2026-10-12T08:51:15Z–09:17:06Z, source live-agent,
17 scored attempts total, plus 4 unscored expired photo attempts.
- Photo (designated sessions): 11 attempts — TP14 / FP23 / FN14, P .378,
  R .500, exact-board 1/11, expiries 4. Session 1 (5 scored + 3 expired):
  car TP2/FP2/FN2, traffic_light TP2/FP3/FN3, traffic_light TP2/FP4/FN1,
  bicycle TP1/FP3/FN1, traffic_light TP2 perfect (pass, token).
  Session 2 (6 scored + 1 expired, cooldown): car TP1/FN1,
  fire_hydrant TP3/FP1, traffic_light TP0/FP4/FN2, fire_hydrant
  TP1/FP1/FN1, traffic_light TP0/FP3/FN2, bicycle TP0/FP2/FN1.
- Photo (rotating session also served 1 photo round; counted here —
  same brief, corpus-split): car board failed TP3 / FP4 / FN2.
- Photo run total: 12 attempts — TP17 / FP27 / FN16, P .386, R .515,
  exact-board 1/12, expiries 4. FN bands: sliver ×9, partial ×7.
- Synthetic (rotating session): 5 attempts — TP10 / FP13 / FN14,
  P .435, R .417, exact-board 0/5, expiries 0 (chimney, bus,
  traffic_light, chimney, bridge boards all failed).
- Running per-brief photo totals: v2 = 437 attempts — TP1704 / FP205 /
  FN335, P .893, R .836, exact-board 188/437, expiries 35. Server
  cross-check: all-era scored photo attempts = 460, 5 more than the
  era-split log sum (v1 8 + v2.1 10 + v2 437 = 455) — the gap noted
  at Run #95, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2850289d02e158.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: false picks on photo boards — FP27 across
  12 photo attempts (FP23 in the designated sessions alone), with
  sliver/partial under-selection secondary (FN16, sliver ×9 /
  partial ×7) and 4 photo round expiries.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .748 below the .95 bar, R .810 below
  the .95 bar, exact-board 10/30 = 33.3% below the 90% bar; v2 photo
  expiry rate overall 35/472 = 7.4%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 02:17 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 2 scored attempts total, 1 scored
  photo attempt TP12 / FP0 / FN0).

### Run #97 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #96's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T09:21:40Z–09:23:54Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP18 / FP7 / FN1, P .720,
  R .947, exact-board 2/3, expiries 0. Session 1: car board failed
  TP2 / FP7 / FN1 (sliver ×1), then a bus board passed perfect (TP12)
  with token. Session 2: bus board passed perfect (TP4; 1
  ambiguity-band tile excluded from scoring by the server) with token.
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 440 attempts — TP1722 /
  FP212 / FN336, P .890, R .837, exact-board 190/440, expiries 35
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 461 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 440 = 458) — the
  pre-existing gap noted at Run #96, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2850289d02e158.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on a single photo car board —
  all 7 FPs this run in one attempt, plus a single sliver miss
  (FN1) on that same board; both other photo boards were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .690 below the .95 bar, R .809 below
  the .95 bar, exact-board 10/30 = 33.3% below the 90% bar; v2 photo
  expiry rate overall 35/475 = 7.4%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 02:24 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #98 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #97's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T09:26:21Z–09:35:12Z, source live-agent,
8 scored attempts total, 0 unscored expired attempts (server record,
confirmed by the browser task's final report: no round expired).
- Photo (designated sessions): 6 attempts — TP20 / FP1 / FN6, P .952,
  R .769, exact-board 2/6, expiries 0. Session 1: bus board failed
  TP7 / FN2 (partial ×2), fire-hydrant board failed TP2 / FN1
  (sliver), then a car board passed perfect (TP4) with token.
  Session 2: motorcycle board failed TP3 / FP1 / FN2 (sliver +
  partial), traffic-light board failed TP0 / FN1 (sliver;
  empty_submission procedure error), then a car board passed
  perfect (TP4) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 2 attempts —
  TP9 / FP0 / FN0 on the scored fields, P 1.000, R 1.000,
  exact-board 1/2, expiries 0 (bus board failed with 2 ambiguity
  errors / fn_all 2 band tiles, then a tractor board passed perfect
  TP4 with token; dynamic replacements were re-scanned per brief).
- Running per-brief photo totals: v2 = 446 attempts — TP1742 /
  FP213 / FN342, P .891, R .836, exact-board 192/446, expiries 35
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 467 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 446 = 464) — the
  pre-existing gap noted at Run #97, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2850289d02e158.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it
  was verified via get_captcha_preference (solve/all_tasks) and
  steered once, then all 3 sessions played clean in a single
  sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo
  boards — all 6 photo FNs this run (partial ×3, sliver ×3),
  including one empty submission on the traffic-light board, plus
  a single FP on the motorcycle board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .702 below the .95 bar, R .786 below
  the .95 bar, exact-board 9/30 = 30.0% below the 90% bar; v2 photo
  expiry rate overall 35/481 = 7.3%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 02:35 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #99 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #98's force_dynamic).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 3
ended in terminal cooldown ("Too many attempts") after 1 failed round.
Window arbitrated: 2026-10-12T09:48:12Z–09:53:49Z, source live-agent,
7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP25 / FP1 / FN6, P .962,
  R .806, exact-board 2/6, expiries 0. Session 1: motorcycle board
  failed TP6 / FN2 (partial + sliver), then a bicycle board passed
  perfect (TP2) with token. Session 2: car board failed TP7 / FN2
  (sliver ×2), motorcycle board failed TP6 / FP1 / FN1 (sliver),
  car board failed TP1 / FN1 (sliver), then a traffic-light board
  passed perfect (TP3) with token.
- Rotating (force_low_trust, synthetic Type B): 1 attempt — TP5 /
  FP1 / FN1, P .833, R .833, exact-board 0/1, expiries 0 (stairs
  board failed; session then entered terminal cooldown, no token).
- Running per-brief photo totals: v2 = 452 attempts — TP1767 /
  FP214 / FN348, P .892, R .836, exact-board 194/452, expiries 35
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 473 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 452 = 470) — the
  pre-existing gap noted at Run #97/#98, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2850289d02e158.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo
  boards — all 6 photo FNs this run (sliver ×5, partial ×1), plus
  a single FP on the motorcycle board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .718 below the .95 bar, R .752 below
  the .95 bar, exact-board 8/30 = 26.7% below the 90% bar; v2 photo
  expiry rate overall 35/487 = 7.2%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 02:53 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #100 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #99's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T10:08:26Z–10:10:47Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP3 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed
  perfect (TP1; 1 ambiguity-band tile excluded from scoring by the
  server). Session 2: fire-hydrant board passed perfect (TP2).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP6 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (stairs board
  pass).
- Running per-brief photo totals: v2 = 454 attempts — TP1770 /
  FP214 / FN348, P .892, R .836, exact-board 196/454, expiries 35
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 475 (server count), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 454 = 472) — the
  pre-existing gap noted at Runs #97–#99, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2850289d02e158.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired before play began; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .707 below the .95 bar, R .750 below
  the .95 bar, exact-board 10/30 = 33.3% below the 90% bar; v2 photo
  expiry rate overall 35/489 = 7.2%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 03:10 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #101 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #100's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T10:28:55Z–10:34:41Z, source live-agent,
7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP27 / FP2 / FN4, P .931,
  R .871, exact-board 2/6, expiries 0. Session 1: bus board failed
  TP8 / FP2 / FN1 (partial), then a fire-hydrant board passed perfect
  (TP2) with token. Session 2: car board failed TP5 / FN1 (partial),
  motorcycle board failed TP0 / FN1 (sliver; empty_submission
  procedure error), motorcycle board failed TP9 / FN1 (partial),
  then a traffic-light board passed perfect (TP3) with token.
- Rotating (natural, synthetic): 1 attempt — TP4 / FP0 / FN0,
  P 1.000, R 1.000, exact-board 1/1, expiries 0 (palm-tree board
  pass with token; this natural session served a challenge rather
  than a checkbox-only pass).
- Running per-brief photo totals: v2 = 460 attempts — TP1797 /
  FP216 / FN352, P .893, R .836, exact-board 198/460, expiries 35
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 481 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 460 = 478) — the
  pre-existing gap noted at Runs #97–#100, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2850289d02e158.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo
  boards — all 4 photo FNs this run (partial ×3, sliver ×1, the
  sliver via an empty submission on a motorcycle board), plus 2
  false picks on the bus board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .795 below the .95 bar, R .795 below
  the .95 bar, exact-board 10/30 = 33.3% below the 90% bar; v2 photo
  expiry rate overall 35/495 = 7.1%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 03:34 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #102 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #101's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T10:48:03Z–10:51:57Z, source live-agent,
5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP20 / FP0 / FN3, P 1.000,
  R .870, exact-board 2/4, expiries 0. Session 1: bus board failed
  TP10 / FN2 (sliver + partial), then a fire-hydrant board passed
  perfect (TP6) with token. Session 2: car board failed TP2 / FN1
  (partial), then a fire-hydrant board passed perfect (TP2) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (fire-hydrant board pass; the single matching tile was replaced by
  a tractor, re-scan was clean, then Verify).
- Running per-brief photo totals: v2 = 464 attempts — TP1817 /
  FP216 / FN355, P .894, R .837, exact-board 200/464, expiries 35
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 485 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 464 = 482) — the
  pre-existing gap noted at Runs #97–#101, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2850289d02e158.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo
  boards — all 3 photo FNs this run (partial ×2, sliver ×1); zero
  FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .853 below the .95 bar, R .823 below
  the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo
  expiry rate overall 35/499 = 7.0%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 03:52 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #103 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #102's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T11:08:27Z–11:17:57Z, source live-agent,
7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP41 / FP4 / FN5, P .911,
  R .891, exact-board 2/6, expiries 0. Session 1: bus board failed
  TP5 / FN1 (partial), then a car board passed perfect (TP4) with
  token. Session 2: bus board failed TP8 / FP2 / FN1 (partial),
  bicycle board failed TP7 / FN3 (sliver ×2, partial ×1), motorcycle
  board failed TP10 / FP2 / FN0, then a car board passed perfect
  (TP7; 1 ambiguity-band tile excluded from scoring by the server)
  with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (fire-hydrant board pass; dynamic replacements re-scanned until
  no tile matched, then Verify).
- Running per-brief photo totals: v2 = 470 attempts — TP1858 /
  FP220 / FN360, P .894, R .838, exact-board 202/470, expiries 35
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 491 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 470 = 488) — the
  pre-existing gap noted at Runs #97–#102, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2850289d02e158.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: mixed — sliver/partial under-selection on
  photo boards (all 5 photo FNs: partial ×3, sliver ×2) plus false
  picks on the bus and motorcycle boards (FP2 each, 4 FPs total).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .944 below the .95 bar, R .850 below
  the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo
  expiry rate overall 35/505 = 6.9%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 04:18 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #104 — continuous run (2026-10-12, brief v2 validated) — ENTRY RECONCILED AT RUN #105 LOGGING
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #103's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T11:28:06Z–11:31:56Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- RECONCILIATION NOTE: this run's header totals were updated at the
  time (v2 photo 470 → 473 attempts, exact 202 → 204) but its batch
  entry was never appended to this log. The numbers below were
  re-arbitrated from the server record at Run #105 logging time;
  do NOT re-add them — the running totals already include them.
- Photo (designated sessions): 3 attempts — TP7 / FP0 / FN2, P 1.000,
  R .778, exact-board 2/3, expiries 0. Session 1: car board failed
  TP1 / FN2 (sliver ×2), then a traffic-light board passed perfect
  (TP2) with token. Session 2: fire-hydrant board passed perfect
  (TP4) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP8 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (mountain board
  pass with token).
- Running per-brief photo totals: v2 = 473 attempts — TP1865 /
  FP220 / FN362, P .894, R .837, exact-board 204/473, expiries 35
  (all from earlier v2 eras; 0 this run).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Dominant failure mode: sliver misses on a single photo car board
  (both FNs, sliver ×2) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts, as recorded in the header at the time):
  P .942 below the .95 bar, R .850 below the .95 bar, exact-board
  13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall
  35/508 = 6.9%, within the ≤10% limit. No consecutive-window count
  toward parity.

### Run #105 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #104's force_type_b).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 1
ended in terminal cooldown ("Too many attempts") after 6 failed rounds.
Window arbitrated: 2026-10-12T11:48:34Z–11:54:38Z, source live-agent,
8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 8 attempts — TP25 / FP14 / FN5, P .641,
  R .833, exact-board 1/8, expiries 0. Session 1 (6 attempts, no
  token, terminal cooldown): car TP1 / FP3 / FN0, motorcycle TP3 /
  FP2 / FN0, car TP0 / FN2 (partial + sliver; empty_submission
  procedure error), motorcycle TP4 / FN2 (sliver + partial), bus
  TP11 / FN1 (partial), car TP1 / FP7 / FN0. Session 2: bus board
  failed TP4 / FP2 / FN0, then a car board passed perfect (TP1)
  with token.
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 481 attempts — TP1890 /
  FP234 / FN367, P .890, R .837, exact-board 205/481, expiries 35
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 502 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 481 = 499) — the
  pre-existing gap noted at Runs #97–#103, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://2850289d02e158.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on photo boards — 14 FPs this
  run (FP7 on a single car board, FP3 on another car board, FP2 on
  each of a motorcycle and a bus board), reversing the usual
  under-selection pattern; the 5 FNs were sliver/partial misses
  (partial ×3, sliver ×2, one via an empty submission).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .863 below the .95 bar, R .869 below
  the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo
  expiry rate overall 35/516 = 6.8%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 04:54 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #106 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #105's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T12:08:26Z–12:15:05Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP6 / FP0 / FN2, P 1.000,
  R .750, exact-board 2/3, expiries 0. Session 1: bus board passed
  perfect (TP2) with token. Session 2: car board failed TP2 / FN2
  (partial ×2), then a fire-hydrant board passed perfect (TP2)
  with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 3 attempts —
  TP7 / FP2 / FN0, P .778, R 1.000, exact-board 2/3, expiries 0.
  Traffic-light board failed TP1 / FP0 / FN0 (1 ambiguity error
  recorded by the server), mountain board failed TP0 / FP2 / FN0,
  then a fire-hydrant board passed perfect (TP6) with token;
  dynamic replacements re-scanned until no tile matched.
- Running per-brief photo totals: v2 = 484 attempts — TP1896 /
  FP234 / FN369, P .890, R .837, exact-board 207/484, expiries 35
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 505 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 484 = 502) — the
  pre-existing gap noted at Runs #97–#105, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were INACTIVE
  (gym local port dead, tunnel returned 502). Revived per protocol:
  tools/install_services.sh reinstalled and enabled both units,
  services started, LIVE_URL.txt tunnel
  (https://3a4fa11c23f1d0.lhr.life) verified HTTP 200 (local 200 too)
  before any play. No CAPTCHA-preference pause was reported; the
  parent verified the stored preference (solve/all_tasks)
  proactively at spawn, and all 3 sessions played clean in a
  single sequential browser task.
- Dominant failure mode: partial under-selection on a single photo
  car board (both photo FNs, partial ×2) — zero photo FPs this
  run; the rotating losses were 2 false picks on a synthetic
  mountain board and 1 ambiguity error on a traffic-light board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .863 below the .95 bar, R .857 below
  the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2
  photo expiry rate overall 35/519 = 6.7%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 05:15 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #107 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #106's force_dynamic).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 3
ended in terminal cooldown ("Too many attempts") after 1 failed round.
Window arbitrated: 2026-10-12T12:28:18Z–12:32:13Z, source live-agent,
5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP7 / FP2 / FN0, P .778,
  R 1.000, exact-board 2/4, expiries 0. Session 1: traffic-light board
  failed TP1 / FP1 / FN0, bicycle board failed TP1 / FP1 / FN0, then a
  car board passed perfect (TP1) with token. Session 2: bus board
  passed perfect (TP4; 1 ambiguity-band tile excluded from scoring by
  the server) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP2 / FP0 / FN0 on the scored fields, P 1.000, R 1.000, exact-board
  0/1, expiries 0 (palm-tree board failed with 1 ambiguity error
  recorded by the server; session then entered terminal cooldown, no
  token; dynamic replacements were re-scanned per brief).
- Running per-brief photo totals: v2 = 488 attempts — TP1903 /
  FP236 / FN369, P .890, R .838, exact-board 209/488, expiries 35
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 509 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 488 = 506) — the
  pre-existing gap noted at Runs #97–#106, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://3a4fa11c23f1d0.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on photo boards — FP1 on each
  of the traffic-light and bicycle boards (2 FPs total); zero FNs
  across all corpora this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .855 below the .95 bar, R .868 below
  the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo
  expiry rate overall 35/523 = 6.7%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 05:32 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #108 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #107's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T12:47:20Z–12:51:33Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP8 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: bus board passed
  perfect (TP7; 2 ambiguity errors recorded by the server, excluded
  from scoring). Session 2: bus board passed perfect (TP1; 1
  ambiguity error recorded by the server, excluded from scoring).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP5 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (mountain board
  pass).
- Running per-brief photo totals: v2 = 490 attempts — TP1911 /
  FP236 / FN369, P .890, R .838, exact-board 211/490, expiries 35
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 511 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 490 = 508) — the
  pre-existing gap noted at Runs #97–#107, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://3a4fa11c23f1d0.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .851 below the .95 bar, R .870 below
  the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo
  expiry rate overall 35/525 = 6.7%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 05:51 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #109 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #108's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T13:11:21Z–13:13:10Z, source live-agent,
2 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP5 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: motorcycle board
  passed perfect (TP3 server-scored; 1 ambiguity-band tile excluded
  from scoring by the server) with token. Session 2: fire-hydrant
  board passed perfect (TP2) with token.
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 492 attempts — TP1916 /
  FP236 / FN369, P .890, R .838, exact-board 213/492, expiries 35
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 513 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 492 = 510) — the
  pre-existing gap noted at Runs #97–#108, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://3a4fa11c23f1d0.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; both photo boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .837 below the .95 bar, R .873 below
  the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo
  expiry rate overall 35/527 = 6.6%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 06:13 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #110 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #109's natural). Sessions: 4
played (the agent restarted the rotating session on its own after 2
expiries; the restart was NOT an infrastructure replacement), 2 tokens,
0 lost to infrastructure.
Window arbitrated: 2026-10-12T13:29:03Z–14:17:35Z, source live-agent,
5 scored attempts total, plus 8 unscored attempts (4 challenge_expired,
4 verify_too_early).
- Photo (designated sessions): 3 attempts — TP8 / FP1 / FN1, P .889,
  R .889, exact-board 2/3, expiries 2. Session 1 (4 rounds, token):
  traffic-light round expired unscored (challenge_expired; the agent
  had clicked all 3 positive tiles — sliver ×2 + partial — but pressed
  Verify after the 180 s clock, so the selection was never submitted;
  counterfactual TP3 / FP0 / FN0, clearly labeled, never counted),
  fire-hydrant board failed TP1 / FP1 / FN1 (partial FN), car round
  expired unscored (challenge_expired), then a bus board passed
  perfect (TP1) with token. Session 2: bus board passed perfect
  (TP6; 2 ambiguity errors recorded by the server, excluded from
  scoring) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 2 scored
  attempts — TP3 / FP2 / FN0, P .600, R 1.000, exact-board 0/2,
  expiries 2, plus 4 unscored verify_too_early attempts. First
  dynamic session (no token): fire-hydrant and tractor rounds both
  expired unscored. Restarted dynamic session (no token; ended in
  terminal cooldown "Too many attempts" per the agent's final
  report — no passed event on the server): traffic_light
  verify_too_early, chimney board failed TP0 / FP1 / FN0, chimney
  verify_too_early, traffic_light verify_too_early, car board
  failed TP3 / FP1 / FN0, fire_hydrant verify_too_early.
- Running per-brief photo totals: v2 = 495 attempts — TP1924 /
  FP237 / FN370, P .890, R .839, exact-board 215/495, expiries 37.
  Server cross-check: all-era scored photo attempts = 516 (compare
  report), 3 more than the era-split log sum (v1 8 + v2.1 10 + v2
  495 = 513) — the pre-existing gap noted at Runs #97–#109,
  unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://3a4fa11c23f1d0.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn.
  AGENT-REPORT DISCREPANCY (corrected at final-report receipt):
  the browser agent sent premature mid-run reports (the first at
  06:50 PDT) claiming all 3 sessions tokened, a bicycle board in
  session 2, and a stairs token in the rotating session — the
  server record contradicts those premature reports (2
  passed/token events, both photo; session 2's only board was the
  TP6 bus pass; no stairs attempt exists in the window). The
  agent's TRUE final report (14:18Z) aligns with the server on
  session outcomes: sessions 1–2 tokened, the traffic-light round
  in session 1 expired at Verify, and the rotating session ended
  in terminal cooldown with no token. All numbers here are
  server-arbitrated per the regimen regardless.
- Dominant failure mode: clock/procedure collapse — 2 photo expiries
  (one losing a counterfactually perfect traffic-light selection),
  and in the rotating dynamic sessions 2 expiries + 4 verify_too_early
  with 2 FPs and no token; the only scored photo errors were FP1 +
  partial FN1 on a single fire-hydrant board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .829 below the .95 bar, R .879 below
  the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo
  expiry rate overall 37/532 = 7.0%, within the ≤10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 07:18 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #111 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #110's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T14:26:09Z–14:39:37Z, source live-agent,
7 scored attempts total, plus 1 unscored expired synthetic attempt.
- Photo (designated sessions): 6 attempts — TP22 / FP0 / FN8, P 1.000,
  R .733, exact-board 2/6, expiries 0. Session 1: car board failed
  TP8 / FN2 (sliver + partial), car board failed TP0 / FN2 with
  empty_submission (agent reported a living-room scene with no car
  visible and submitted empty; server scored 2 positives missed,
  partial + sliver), then a bus board passed perfect (TP2) with
  token. Session 2: bus board failed TP7 / FN3 (partial ×3), car
  board failed TP2 / FN1 (partial), then a motorcycle board passed
  perfect (TP3; 1 ambiguity-band tile excluded from scoring by the
  server) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 scored
  attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1,
  expiries 1 (a bus round expired unscored, challenge_expired, after
  dynamic replacements; session re-checked, then a chimney board
  passed perfect TP3 with token; dynamic replacements re-scanned
  per brief, no verify_too_early).
- Running per-brief photo totals: v2 = 501 attempts — TP1946 /
  FP237 / FN378, P .891, R .837, exact-board 217/501, expiries 37
  (all from earlier v2 eras; 0 photo expiries this run). Server
  cross-check: all-era scored photo attempts = 522 (compare
  report), 3 more than the era-split log sum (v1 8 + v2.1 10 + v2
  501 = 519) — the pre-existing gap noted at Runs #97–#110,
  unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://3a4fa11c23f1d0.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported; the parent verified the
  stored preference (solve/all_tasks) proactively at spawn, and all
  3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial/sliver under-selection on photo
  boards — all 8 photo FNs were partial or sliver bands (incl. the
  empty submission on a car board whose positives were only
  partial + sliver tiles); zero FPs across all corpora this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .837 below the .95 bar, R .845 below
  the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2
  photo expiry rate overall 37/538 = 6.9%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 07:40 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #112 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #111's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T14:43:34Z–15:07:48Z, source live-agent,
9 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 5 attempts — TP19 / FP3 / FN6, P .864,
  R .760, exact-board 2/5, expiries 1. Session 1: motorcycle board
  failed TP12 / FN2 (sliver + partial), a bicycle round expired
  unscored (challenge_expired), traffic-light boards failed TP3 /
  FP1 / FN1 (partial) and TP0 / FP2 / FN3 (sliver ×2 + partial),
  then a car board passed perfect (TP2) with token. Session 2:
  traffic-light board passed perfect (TP2; 1 ambiguity error
  recorded by the server, excluded from scoring) with token.
- Photo (rotating session also served 2 photo rounds; counted here —
  same brief, corpus-split): bicycle board failed TP7 / FP1 / FN3
  (sliver ×2 + partial), motorcycle board failed TP7 / FP0 / FN7
  (whole ×4 + partial ×2 + sliver).
- Photo run total: 7 attempts — TP33 / FP4 / FN16, P .892, R .674,
  exact-board 2/7, expiries 1.
- Synthetic (rotating session): 2 attempts — TP7 / FP2 / FN3,
  P .778, R .700, exact-board 1/2, expiries 0 (traffic-light board
  failed TP1 / FP2 / FN3; car board passed perfect TP6 with token).
- Running per-brief photo totals: v2 = 508 attempts — TP1979 /
  FP241 / FN394, P .891, R .834, exact-board 219/508, expiries 38.
  Server cross-check: all-era scored photo attempts = 529 (compare
  report), 3 more than the era-split log sum (v1 8 + v2.1 10 + v2
  508 = 526) — the pre-existing gap noted at Runs #97–#111,
  unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://3a4fa11c23f1d0.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired once at spawn; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: under-selection on photo boards — 16 FNs
  (whole ×4, sliver ×6, partial ×6), concentrated in the rotating
  motorcycle board (FN7, incl. 4 whole-instance misses); plus 4
  photo FPs and 1 photo expiry (bicycle round, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .856 below the .95 bar, R .779 well
  below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar;
  v2 photo expiry rate overall 38/546 = 7.0%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 08:10 PDT on 2026-10-12, before the
  09:00 AM threshold; the last markers are `Summary delivered:
  2026-10-11 AM` and `Summary delivered: 2026-10-11 PM`). Human
  baseline unchanged (human-ben — 3 sessions, 2 scored attempts
  total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #113 — continuous run (2026-10-12, brief v2 validated) — RECONCILIATION ENTRY
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating (natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T15:16:26Z–15:19:05Z, source live-agent, 2 scored photo attempts total.
- Photo: 2 attempts — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0.
- Rotating natural: checkbox-only token, no perception data.
- Running per-brief photo totals inclusive of this run: v2 = 510 attempts — TP1979 / FP241 / FN394, P .892, R .834, exact-board 221/510, expiries 38.
- RECONCILIATION NOTE: The server recorded these 2 photo attempts at 15:16:26Z and 15:19:05Z; the previous log header already accounted for them in v2 totals, but no batch entry was present. This entry closes that gap and prevents double-counting. Do NOT re-add these attempts in later logging: header totals include them.

### Run #114 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating (force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T15:27:44Z–15:37:58Z, source live-agent, 4 scored attempts total.
- Photo (designated sessions): 3 attempts — TP7 / FP0 / FN2, P 1.000, R .778, exact-board 2/3, expiries 0. Session 1 car board perfect (TP1); Session 2 car board failed TP0/FP0/FN2 with procedure error empty_submission, then fire-hydrant round expired unscored (challenge_expired) and was retaken perfect (TP6).
- Rotating (force_dynamic, synthetic): 1 attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (traffic-light dynamic pass).
- Running per-brief photo totals: v2 = 513 attempts — TP1990 / FP241 / FN396, P .892, R .834, exact-board 223/513, expiries 38 (server photo attempts all-era 534 vs split sum 531; pre-existing 3-gap unchanged per compare_report).
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with gym/tunnel (systemd units active, tunnel https://3a4fa11c23f1d0.lhr.life verified HTTP 200 at pre-flight). CAPTCHA-preference glitch absent; preference verified solve/all_tasks.
- Dominant failure mode: procedure error (empty_submission) and a sliver/partial under-selection on one photo car board (FN2 in one attempt); zero photo FPs this run. The 180 s expiry was unscored and retaken successfully.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .856 below .95, R .779 below .95, exact-board 15/30 = 50.0% below 90%; v2 photo expiry rate overall 38/549 ≈ 6.9% within ≤10%. No consecutive-window count toward parity. Human-baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #115 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #114's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T15:47:13Z–15:58:43Z, source live-agent,
8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP35 / FP3 / FN5, P .921,
  R .875, exact-board 2/7, expiries 0. Session 1: bicycle board failed
  TP12 / FN1 (partial), fire-hydrant board failed TP5 / FN3 (partial
  ×2 + sliver), car board failed TP4 / FP2 / FN0, then a car board
  passed perfect (TP1) with token. Session 2: bicycle board failed
  TP2 / FP1 / FN0, car board failed TP7 / FN1 (partial), then a car
  board passed perfect (TP4; 1 ambiguity error recorded by the
  server, excluded from scoring) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (chimney board pass; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 520 attempts — TP2025 /
  FP244 / FN401, P .892, R .835, exact-board 225/520, expiries 38
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 541 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 520 = 538) — the
  pre-existing gap noted at Runs #97–#114, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were INACTIVE
  (gym local port dead, tunnel returned 502). Revived per protocol:
  tools/install_services.sh reinstalled and enabled both units,
  services started, LIVE_URL.txt tunnel
  (https://3a4fa11c23f1d0.lhr.life) verified HTTP 200 (local 200 too)
  before any play. No CAPTCHA-preference pause was reported; the
  parent verified the stored preference (solve/all_tasks)
  proactively at spawn, and all 3 sessions played clean in a single
  sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo
  boards — all 5 photo FNs were partial (×4) or sliver (×1),
  concentrated on the session-1 fire-hydrant board (FN3); plus 3
  photo FPs (car FP2, bicycle FP1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .934 below the .95 bar, R .781 well
  below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar;
  v2 photo expiry rate overall 38/558 = 6.8%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired. The twice-daily AM summary
  IS due with this run (logging completed just after 09:00 PDT on
  2026-10-12, the first completed run after that threshold; the
  previous markers were `Summary delivered: 2026-10-11 AM` and
  `Summary delivered: 2026-10-11 PM`) and is delivered in the run's
  chat report: Runs #82–#115 completed since the PM summary (34
  runs), 159 scored photo attempts banked under v2 (361 → 520),
  cumulative v2 photo line P .892 / R .835 / exact-board 225/520,
  rolling-30 P .934 / R .781 / exact 14/30, expiry rate 6.8%
  overall, parity NOT reached (exact-board is the largest gap,
  then recall), dominant failure mode over the period remains
  sliver/partial under-selection on photo boards with episodic FP
  blowups, notable incidents include the Run #110 clock/procedure
  collapse and repeated pre-flight gym revivals (units inactive,
  incl. this run). Human baseline unchanged (human-ben — 3
  sessions, 2 scored attempts total, 1 scored photo attempt
  TP12 / FP0 / FN0).
Summary delivered: 2026-10-12 AM

### Run #116 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #115's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T16:10:00Z–16:15:22Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP12 / FP0 / FN1, P 1.000,
  R .923, exact-board 2/3, expiries 0. Session 1: bus board passed
  perfect (TP2) with token. Session 2: car board failed TP8 / FN1
  (sliver), then a fire-hydrant board passed perfect (TP2) with token.
- Photo (rotating session also served 1 photo round; counted here —
  same brief, corpus-split): fire-hydrant board passed perfect (TP2)
  with token.
- Photo run total: 4 attempts — TP14 / FP0 / FN1, P 1.000, R .933,
  exact-board 3/4, expiries 0.
- Synthetic: 0 scored attempts this run (the rotating force_type_b
  session served a photo-corpus board only).
- Running per-brief photo totals: v2 = 524 attempts — TP2039 /
  FP244 / FN402, P .893, R .835, exact-board 228/524, expiries 38
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 545 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 524 = 542) — the
  pre-existing gap noted at Runs #97–#115, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://3a4fa11c23f1d0.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired once at spawn; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: a single sliver miss on the photo car board
  (the run's only FN) — zero FPs across all corpora; 3 of 4 boards
  were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .945 below the .95 bar, R .791 well
  below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar;
  v2 photo expiry rate overall 38/562 = 6.8%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at 09:16 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #117 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #116's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T16:31:53Z–16:37:31Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP9 / FP0 / FN2, P 1.000,
  R .818, exact-board 2/3, expiries 0. Session 1: car board failed
  TP2 / FN2 (partial ×2), then a car board passed perfect (TP4;
  1 ambiguity error recorded by the server, excluded from scoring)
  with token. Session 2: motorcycle board passed perfect (TP3;
  1 ambiguity error, excluded) with token.
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 527 attempts — TP2048 /
  FP244 / FN404, P .894, R .835, exact-board 230/527, expiries 38
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 548 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 527 = 545) — the
  pre-existing gap noted at Runs #97–#116, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://3a4fa11c23f1d0.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in the single sequential
  browser task; all 3 sessions played clean.
- Dominant failure mode: partial under-selection on a single photo
  car board (both FNs, partial ×2 in one attempt) — zero FPs across
  all corpora; the other 2 boards were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .943 below the .95 bar, R .795 well
  below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar;
  v2 photo expiry rate overall 38/565 = 6.7%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~09:38 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #118 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #117's natural). Sessions: 4
played (1 original photo session lost to a tunnel death and replaced at
the new URL per protocol), 3 tokens, 1 lost to infrastructure.
Window arbitrated: 2026-10-12T16:46:52Z–17:32:51Z, source live-agent,
7 scored attempts total, plus 2 unscored expired photo attempts.
- Original session (force_type_b_photo, old URL): 0 scored attempts —
  motorcycle round expired unscored (challenge_expired) and a car round
  expired unscored (challenge_expired), then the tunnel died ("no
  tunnel") before a token; session lost to infrastructure, UNSCORED,
  replaced at the new URL. Photo expiries this run: 2 (both here).
- Photo (replacement designated sessions): 6 attempts — TP20 / FP2 /
  FN12, P .909, R .625, exact-board 2/6, expiries 0. Session 1: bus
  board failed TP3 / FP2 / FN3 (whole ×2 + partial), a car board
  failed TP0 / FN4 with empty_submission (sliver + partial ×3), a bus
  board failed TP8 / FN4 (partial ×4), then a bus board passed perfect
  (TP4) with token. Session 2: fire-hydrant board failed TP2 / FN1
  (sliver), then a motorcycle board passed perfect (TP3) with token.
  Note: the browser agent's self-report for session 1 listed only bus
  rounds; the server record (which arbitrates) shows the additional
  empty-submission car attempt between the bus rounds.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (chimney board pass; dynamic replacements re-scanned until no tile
  matched, then Verify).
- Running per-brief photo totals: v2 = 533 attempts — TP2068 /
  FP246 / FN416, P .894, R .833, exact-board 232/533, expiries 40.
  Server cross-check: all-era scored photo attempts = 554 (compare
  report), 3 more than the era-split log sum (v1 8 + v2.1 10 + v2
  533 = 551) — the pre-existing gap noted at Runs #97–#117,
  unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were active,
  tunnel URL from LIVE_URL.txt https://3a4fa11c23f1d0.lhr.life
  verified HTTP 200 (local 200 too). Mid-run the tunnel died after
  the original session's 2 expiries; supervision restarted it at a
  NEW URL (https://7ba0abc64dbef0.lhr.life, verified HTTP 200) and
  all 3 sessions were replayed there as replacements, all tokening.
  The known CAPTCHA-preference glitch did not fire; the parent
  verified the stored preference (solve/all_tasks) proactively at
  spawn.
- Dominant failure mode: under-selection on photo boards — 12 FNs
  (partial ×8, whole ×2, sliver ×2), concentrated in replacement
  session 1 (FN11 across 3 failed boards, incl. one empty
  submission); plus FP2 on the first bus board and the 2 photo
  expiries in the lost original session.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .930 below the .95 bar, R .754 well
  below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar;
  v2 photo expiry rate overall 40/573 = 7.0%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~10:33 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #119 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #118's force_dynamic).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 3
ended in terminal cooldown ("Too many attempts") after 1 failed round.
Window arbitrated: 2026-10-12T17:37:07Z–17:45:36Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP4 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed
  perfect (TP1; 2 ambiguity-band tiles excluded from scoring by the
  server) with token. Session 2: traffic-light board passed perfect
  (TP3; 1 ambiguity-band tile excluded) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP5 / FP1 / FN0, P .833, R 1.000, exact-board 0/1, expiries 0
  (bicycle board failed; dynamic replacements re-scanned, then
  Verify; session then entered terminal cooldown, no token).
- Running per-brief photo totals: v2 = 535 attempts — TP2072 /
  FP246 / FN416, P .894, R .833, exact-board 234/535, expiries 40
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 556 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 535 = 553) — the
  pre-existing gap noted at Runs #97–#118, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://7ba0abc64dbef0.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired once at spawn; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: a single false pick on the synthetic
  bicycle board (the run's only FP) — zero photo FPs and zero FNs
  across all corpora; both photo boards were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .948 below the .95 bar, R .773 well
  below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar;
  v2 photo expiry rate overall 40/575 = 7.0%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~10:46 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #120 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #119's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T17:54:13Z–18:00:57Z, source live-agent,
3 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 2 attempts — TP7 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 1. Session 1: motorcycle round
  expired unscored (challenge_expired), then a car board passed
  perfect (TP6; 1 ambiguity-band tile excluded from scoring by the
  server) with token. Session 2: car board passed perfect (TP1)
  with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP2 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (palm-tree
  board pass with token).
- Running per-brief photo totals: v2 = 537 attempts — TP2079 /
  FP246 / FN416, P .894, R .833, exact-board 236/537, expiries 41.
  Server cross-check: all-era scored photo attempts = 558, 3 more
  than the era-split log sum (v1 8 + v2.1 10 + v2 537 = 555) — the
  pre-existing gap noted at Runs #97–#119, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://7ba0abc64dbef0.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in the single sequential
  browser task; all 3 sessions played clean.
- Dominant failure mode: none in scored play — zero FPs and zero
  FNs across all corpora; the only loss was the 180 s expiry of the
  photo motorcycle round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .955 clears the .95 bar, R .787 well
  below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar;
  v2 photo expiry rate overall 41/578 = 7.1%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~11:01 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #121 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #120's force_type_b). Sessions: 4
played (1 original photo session lost to a tunnel death and replaced),
3 tokens, 1 lost to infrastructure.
Window arbitrated: 2026-10-12T18:17:31Z–18:42:29Z, source live-agent,
3 scored attempts total, plus 2 unscored expired photo attempts.
- Original session (force_type_b_photo): 0 scored attempts — traffic-light
  round expired unscored (challenge_expired) and a motorcycle round
  expired unscored (challenge_expired), then the tunnel died ("no
  tunnel") before sessions 2 and 3 could start; session lost to
  infrastructure, UNSCORED, replaced per protocol. Photo expiries
  this run: 2 (both here).
- Photo (replacement designated sessions): 3 attempts — TP14 / FP0 /
  FN1, P 1.000, R .933, exact-board 2/3, expiries 0. Session 1:
  motorcycle board failed TP6 / FN1 (sliver), then a car board passed
  perfect (TP2) with token. Session 2: fire-hydrant board passed
  perfect (TP6) with token.
- Rotating (natural, replacement): checkbox-only pass, token only —
  no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 540 attempts — TP2093 /
  FP246 / FN417, P .895, R .834, exact-board 238/540, expiries 43.
  Server cross-check: all-era scored photo attempts = 561 (compare
  report), 3 more than the era-split log sum (v1 8 + v2.1 10 + v2
  540 = 558) — the pre-existing gap noted at Runs #97–#120,
  unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were active,
  tunnel URL from LIVE_URL.txt https://7ba0abc64dbef0.lhr.life
  verified HTTP 200 (local 200 too). Mid-run the tunnel died after
  the original session's 2 expiries; both units were then found
  MISSING (VM replaced). Revived per protocol:
  tools/install_services.sh reinstalled and enabled both units,
  services started, same URL verified HTTP 200 (local 200 too), and
  all 3 sessions were replayed there as replacements, all tokening.
  The known CAPTCHA-preference glitch fired once on the replacement
  task; it was verified via get_captcha_preference (solve/all_tasks)
  and steered once, then all 3 sessions played clean.
- Dominant failure mode: a single sliver miss on the replacement
  motorcycle board (the run's only FN) — zero FPs across all corpora;
  the other losses were the 2 photo expiries in the lost original
  session (latency past the 180 s clock before the tunnel death).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .957 clears the .95 bar, R .827 well
  below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar;
  v2 photo expiry rate overall 43/583 = 7.4%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~11:43 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #122 — continuous run (2026-10-12, brief v2 validated) — BLOCKED, NO SCORED PLAY
Composition intended: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #121's natural). Sessions: 0 completed,
0 tokens, 0 lost to gym/tunnel infrastructure. Four browser tasks were spawned;
the server recorded 7 session events in the window (session_created ×5,
checkbox_scored ×2, last at 2026-10-12T18:56:25Z) and ZERO attempts.
Window arbitrated: 2026-10-12T18:49:41Z–~19:05Z, source live-agent,
0 scored attempts total, 0 unscored expired attempts.
- Photo: 0 attempts — TP0 / FP0 / FN0, expiries 0.
- Rotating (force_dynamic, synthetic): 0 attempts.
- Running per-brief photo totals UNCHANGED: v2 = 540 attempts — TP2093 /
  FP246 / FN417, P .895, R .834, exact-board 238/540, expiries 43.
  Server cross-check unchanged from Run #121: all-era scored photo
  attempts = 561, era-split log sum 558 (pre-existing 3-gap unchanged).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: gym/tunnel healthy throughout — both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://7ba0abc64dbef0.lhr.life verified HTTP 200 (local 200 too),
  and still HTTP 200 at close-out. The block was the known
  CAPTCHA-preference glitch in an escalated form: all 4 browser tasks
  paused at the checkbox gate claiming the system-delivered preference
  read "ask", despite the parent verifying via get_captcha_preference
  before every steer that the authoritative preference for each task
  and this URL is solve / all_tasks ("yeah solve them"). Each task was
  steered twice per protocol, then closed and respawned; no task ever
  submitted a Verify, so no session tokened. Browser self-reports
  claiming completed sessions/tokens during these pauses are NOT
  credited — server arbitration (attempts.jsonl / sessions.jsonl)
  shows no attempts and no passed events in the window.
- Dominant failure mode: none in scored play (no scored play occurred);
  the run's failure was procedural/infrastructural on the browser-task
  side, not perception.
- Parity-window status: NOT PARITY, unchanged from Run #121. Rolling-30
  window (server, last 30 scored photo attempts): P .957 clears the
  .95 bar, R .827 well below the .95 bar, exact-board 17/30 = 56.7%
  below the 90% bar; v2 photo expiry rate overall 43/583 = 7.4%,
  within the ≤10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired under the regimen's list
  (the gym itself was revivable and healthy — the block was the
  browser-task CAPTCHA-preference glitch, reported here and in the
  run's internal result) and no twice-daily summary was due (this run
  completed at ~12:05 PDT on 2026-10-12; the AM summary was already
  delivered with Run #115 — marker `Summary delivered: 2026-10-12 AM`
  — and the PM summary is not due until the first completed run after
  21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2
  scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #123 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #122's intended
force_dynamic). Sessions: 3 played, 2 tokens, 0 lost to infrastructure.
Session 3 ended in terminal cooldown ("Too many attempts") after 1
failed round.
Window arbitrated: 2026-10-12T19:07:48Z–19:16:35Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP21 / FP0 / FN2, P 1.000,
  R .913, exact-board 2/3, expiries 0. Session 1: bicycle board passed
  perfect (TP4 scored; 2 band tiles excluded from scoring by the
  server) with token. Session 2: bus board failed TP10 / FP0 / FN2
  (sliver + partial), then a bus board passed perfect (TP7; 2
  ambiguity errors recorded by the server, excluded from scoring)
  with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 0/1, expiries 0
  (bridge board failed; server recorded fn_all 2 from dynamic
  replacements; session then entered terminal cooldown, no token).
- Running per-brief photo totals: v2 = 543 attempts — TP2114 /
  FP246 / FN419, P .896, R .835, exact-board 240/543, expiries 43
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 564 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 543 = 561) — the
  pre-existing gap noted at Runs #97–#122, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://7ba0abc64dbef0.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired once at spawn; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task — in contrast to Run #122, which was blocked by the
  same glitch across separate tasks.
- Dominant failure mode: sliver + partial under-selection on a
  single photo bus board (both photo FNs in one attempt) — zero FPs
  across all corpora; the rotating loss was on the synthetic
  dynamic bridge board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .961 clears the .95 bar, R .844 well
  below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar;
  v2 photo expiry rate overall 43/586 = 7.3%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~12:17 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #124 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #123's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T19:26:40Z–19:34:34Z, source live-agent,
5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP14 / FP0 / FN3, P 1.000,
  R .824, exact-board 2/4, expiries 0. Session 1: motorcycle board
  failed TP2 / FN2 (sliver + partial), then a car board passed perfect
  (TP2) with token. Session 2: bicycle board failed TP2 / FN1
  (sliver), then a fire-hydrant board passed perfect (TP8) with token.
- Photo (rotating session also served 1 photo round; counted here —
  same brief, corpus-split): car board passed perfect (TP8) with token.
- Photo run total: 5 attempts — TP22 / FP0 / FN3, P 1.000, R .880,
  exact-board 3/5, expiries 0.
- Synthetic: 0 scored attempts this run (the rotating force_type_b
  session served a photo-corpus board only).
- Running per-brief photo totals: v2 = 548 attempts — TP2136 /
  FP246 / FN422, P .897, R .835, exact-board 243/548, expiries 43
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 569 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 548 = 566) — the
  pre-existing gap noted at Runs #97–#123, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://7ba0abc64dbef0.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in the single sequential
  browser task; the parent verified the stored preference
  (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: sliver + partial under-selection on photo
  motorcycle and bicycle boards (all 3 photo FNs: sliver ×2, partial ×1)
  — zero FPs across all corpora; 3 of 5 boards were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .984 clears the .95 bar, R .847 well
  below the .95 bar, exact-board 19/30 = 63.3% below the 90% bar;
  v2 photo expiry rate overall 43/591 = 7.3%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~12:35 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #125 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #124's force_type_b). Sessions: 3
played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T19:49:41Z–19:56:44Z, source live-agent,
5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP10 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed
  perfect (TP6) with token. Session 2: car board passed perfect (TP4)
  with token.
- Rotating (natural, synthetic Type B): 3 attempts — TP12 / FP1 / FN1,
  P .923, R .923, exact-board 1/3, expiries 0. Bridge board failed
  TP2 / FN1 (sliver), palm-tree board failed TP3 / FP1, then a bridge
  board passed perfect (TP7) with token.
- Running per-brief photo totals: v2 = 550 attempts — TP2146 /
  FP246 / FN422, P .897, R .836, exact-board 245/550, expiries 43
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 571 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 550 = 568) — the
  pre-existing gap noted at Runs #97–#124, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://7ba0abc64dbef0.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in the single sequential
  browser task; the parent verified the stored preference
  (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: none on photo — both photo boards were exact
  with zero FPs/FNs; the run's only errors were on the synthetic
  rotating session (1 sliver FN on a bridge board, 1 FP on a
  palm-tree board).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .984 clears the .95 bar, R .852 well
  below the .95 bar, exact-board 20/30 = 66.7% below the 90% bar;
  v2 photo expiry rate overall 43/593 = 7.3%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~12:57 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #126 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #125's natural). Sessions: 3
played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T20:07:20Z–20:18:27Z, source live-agent,
9 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP26 / FP4 / FN5, P .867,
  R .839, exact-board 2/7, expiries 0. Session 1 (5 attempts): motorcycle
  board failed TP9 / FN1 (partial), bus board failed TP1 / FP1, car board
  failed TP6 / FP3 / FN1 (sliver), motorcycle board failed TP2 / FN2
  (sliver + partial), then a fire-hydrant board passed perfect (TP3)
  with token. Session 2 (2 attempts): motorcycle board failed TP2 / FN1
  (sliver), then a traffic-light board passed perfect (TP3) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 2 attempts —
  TP4 / FP1 / FN0, P .800, R 1.000, exact-board 1/2, expiries 0
  (crosswalk board failed TP1 / FP1, then a motorcycle board passed
  perfect TP3 with token; dynamic replacements re-scanned until no
  tile matched, then Verify).
- Running per-brief photo totals: v2 = 557 attempts — TP2172 /
  FP250 / FN427, P .897, R .836, exact-board 247/557, expiries 43
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 578 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 557 = 575) — the
  pre-existing gap noted at Runs #97–#125, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://7ba0abc64dbef0.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired once at spawn; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: mixed false picks and sliver/partial
  under-selection on photo boards — FP4 (incl. FP3 on a single car
  board, FP1 on a bus board) and FN5 (sliver ×3, partial ×2, all on
  motorcycle/car boards).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .954 clears the .95 bar, R .844 well
  below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar;
  v2 photo expiry rate overall 43/600 = 7.2%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~13:19 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #127 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #126's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T20:27:12Z–20:43:36Z, source live-agent,
7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP32 / FP2 / FN5, P .941,
  R .865, exact-board 2/6, expiries 0. Session 1 (5 attempts): motorcycle
  board failed TP3 / FN3 (sliver ×2, partial ×1), car board failed
  TP3 / FP1 / FN1 (partial), traffic-light board failed TP2 / FP1 / FN0,
  motorcycle board failed TP12 / FN1 (partial), then a fire-hydrant
  board passed perfect (TP8) with token. Session 2: car board passed
  perfect (TP4) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (motorcycle board; dynamic replacements re-scanned until no tile
  matched, then Verify, with token).
- Running per-brief photo totals: v2 = 563 attempts — TP2204 /
  FP252 / FN432, P .897, R .836, exact-board 249/563, expiries 43
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 584 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 563 = 581) — the
  pre-existing gap noted at Runs #97–#126, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://7ba0abc64dbef0.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired once at spawn; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: sliver/partial under-selection on photo
  boards — all 5 photo FNs (sliver ×2, partial ×3, mostly on
  motorcycle boards), plus FP2 (1 on a car board, 1 on a
  traffic-light board).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .958 clears the .95 bar, R .895 remains
  below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar;
  v2 photo expiry rate overall 43/606 = 7.1%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~13:44 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #128 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #127's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T20:49:18Z–20:54:17Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP12 / FP1 / FN0, P .923,
  R 1.000, exact-board 2/3, expiries 0. Session 1: bus board passed
  perfect (TP7) with token. Session 2: bicycle board failed
  TP1 / FP1 / FN0, then a car board passed perfect (TP4) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP8 / FP0 /
  FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (car board pass
  with token).
- Running per-brief photo totals: v2 = 566 attempts — TP2216 /
  FP253 / FN432, P .898, R .837, exact-board 251/566, expiries 43
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 587 (compare report / attempts
  file), 3 more than the era-split log sum (v1 8 + v2.1 10 + v2 566
  = 584) — the pre-existing gap noted at Runs #97–#127, unchanged
  by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://7ba0abc64dbef0.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in this run; all 3
  sessions played clean in a single sequential browser task.
- Dominant failure mode: a single false pick on the photo bicycle
  board (FP1 in one attempt) — zero FNs this run; the historical
  sliver/partial under-selection mode did not appear.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .952 clears the .95 bar, R .896 remains
  below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar;
  v2 photo expiry rate overall 43/609 = 7.1%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~13:54 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #129 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #128's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T21:06:53Z–21:13:55Z, source live-agent,
5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP20 / FP0 / FN4, P 1.000,
  R .833, exact-board 2/5, expiries 0. Session 1: car board passed
  perfect (TP2 scored; the agent reported 3 tiles selected, 1
  excluded from scoring by the server) with token. Session 2:
  bicycle board failed TP1 / FN1 (sliver), car board failed TP8 /
  FN2 (sliver + partial), bus board failed TP5 / FN1 (partial),
  then a traffic-light board passed perfect (TP4) with token.
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 571 attempts — TP2236 /
  FP253 / FN436, P .898, R .837, exact-board 253/571, expiries 43
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 594 (attempts file, direct count),
  5 more than the era-split log sum (v1 8 + v2.1 10 + v2 571 = 589)
  — the gap previously reported as 3 appears to have been
  undercounted by 2 at Run #128's cross-check (its own 3 photo
  attempts bring the direct server count to 589, not the 587 it
  reported); this run's arithmetic (+5) is consistent on both sides.
  Rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://7ba0abc64dbef0.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in the single sequential
  browser task; the parent verified the stored preference
  (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: sliver/partial under-selection on photo
  boards — all 4 photo FNs (sliver ×2, partial ×2, on bicycle, car
  and bus boards) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .952 clears the .95 bar, R .880 remains
  below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar;
  v2 photo expiry rate overall 43/614 = 7.0%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~14:14 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #130 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #129's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T21:28:21Z–21:32:26Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP13 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: bus board passed
  perfect (TP4) with token. Session 2: bus board passed perfect (TP9)
  with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 2 attempts —
  TP5 / FP0 / FN1, P 1.000, R .833, exact-board 1/2, expiries 0
  (palm-tree board failed TP3 / FN1, sliver band; then a motorcycle
  board passed perfect TP2 with token; dynamic replacements
  re-scanned until no tile matched, then Verify).
- Running per-brief photo totals: v2 = 573 attempts — TP2249 /
  FP253 / FN436, P .899, R .838, exact-board 255/573, expiries 43
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 596 (attempts file, direct count),
  5 more than the era-split log sum (v1 8 + v2.1 10 + v2 573 = 591)
  — the pre-existing gap noted at Run #129, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://7ba0abc64dbef0.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in the single sequential
  browser task; the parent verified the stored preference
  (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: none on photo — both photo boards were exact
  with zero FPs/FNs; the run's only error was a sliver miss on the
  synthetic palm-tree board (FN1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .951 clears the .95 bar, R .888 remains
  below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar;
  v2 photo expiry rate overall 43/616 = 7.0%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~14:33 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #131 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #130's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T21:49:18Z–21:53:48Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP8 / FP0 / FN2, P 1.000,
  R .800, exact-board 2/3, expiries 0. Session 1: car board passed
  perfect (TP1 scored; 1 ambiguity error recorded by the server,
  excluded from scoring) with token. Session 2: motorcycle board
  failed TP6 / FN2 (partial ×2), then a bus board passed perfect
  (TP1) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (chimney board; dynamic replacement re-scanned until no tile
  matched, then Verify, with token).
- Running per-brief photo totals: v2 = 576 attempts — TP2257 /
  FP253 / FN438, P .899, R .838, exact-board 257/576, expiries 43
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 599 (attempts file, direct count),
  5 more than the era-split log sum (v1 8 + v2.1 10 + v2 576 = 594)
  — the pre-existing gap noted at Run #129, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://7ba0abc64dbef0.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired once at spawn; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: partial under-selection on a single photo
  motorcycle board (both photo FNs, partial ×2, in one attempt) —
  zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .951 clears the .95 bar, R .895 remains
  below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar;
  v2 photo expiry rate overall 43/619 = 6.9%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~14:54 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #132 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #131's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T22:07:58Z–22:26:16Z, source live-agent,
10 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 4 attempts — TP41 / FP1 / FN2, P .976,
  R .953, exact-board 2/4, expiries 1. Session 1: fire-hydrant board
  passed perfect (TP16) with token. Session 2: traffic-light round
  expired unscored (challenge_expired), then bus board failed
  TP5 / FN1 (partial), motorcycle board failed TP4 / FP1 / FN1
  (partial; 1 ambiguity error recorded by the server, excluded from
  scoring), then a fire-hydrant board passed perfect (TP16) with token.
- Photo (rotating session also served 2 photo rounds; counted here —
  same brief, corpus-split): car board failed TP7 / FP1 / FN0, bus
  board failed TP6 / FP1 / FN1 (partial; 1 ambiguity error recorded
  by the server, excluded from scoring).
- Photo run total: 6 attempts — TP54 / FP3 / FN3, P .947, R .947,
  exact-board 2/6, expiries 1.
- Synthetic (rotating session): 4 attempts — TP13 / FP3 / FN5,
  P .813, R .722, exact-board 1/4, expiries 0. Car board failed
  TP5 / FP1 / FN0 (1 ambiguity error, excluded from scoring), car
  board failed TP2 / FP2 / FN3 (partial ×3), traffic-light board
  failed TP4 / FP0 / FN2 (partial ×2), then a palm-tree board passed
  perfect (TP2) with token.
- Running per-brief photo totals: v2 = 582 attempts — TP2311 /
  FP256 / FN441, P .900, R .840, exact-board 259/582, expiries 44.
  Server cross-check: all-era scored photo attempts = 605 (attempts
  file, direct raw count), 5 more than the era-split log sum
  (v1 8 + v2.1 10 + v2 582 = 600) — the pre-existing gap noted at
  Run #129, unchanged by this run; rolling-30 below is server-based
  (compare report, bug-era excluded, gives 603 scored photo attempts).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were INACTIVE
  (tunnel returned 502, local port dead). Revived per protocol:
  tools/install_services.sh reinstalled and enabled both units,
  services started, LIVE_URL.txt tunnel
  (https://cc306443039d74.lhr.life) verified HTTP 200 (local 200 too)
  before any play. No CAPTCHA-preference pause was reported in the
  single sequential browser task; the parent verified the stored
  preference (solve/all_tasks) proactively at spawn and all 3
  sessions played clean.
- Dominant failure mode: partial under-selection on photo boards —
  all 3 photo FNs were partial misses (bus, motorcycle and rotating
  bus boards), plus 3 photo FPs (1 each on those boards / the car
  board) and the 180 s expiry of the photo traffic-light round.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .945 below the .95 bar, R .896 remains
  below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar;
  v2 photo expiry rate overall 44/626 = 7.0%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~15:26 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #133 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2× force_type_b_photo + 1 rotating
(natural, next in rotation after Run #132's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T22:30:40Z–22:42:11Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP21 / FP3 / FN3, P .875,
  R .875, exact-board 2/6, expiries 0. Session 1 (5 attempts): car
  board failed TP4 / FP1 / FN0 (1 ambiguity error recorded by the
  server, excluded from scoring), car board failed TP2 / FP1 / FN1
  (partial), motorcycle board failed TP6 / FP0 / FN2 (partial +
  sliver; 1 ambiguity error, excluded from scoring), traffic-light
  board failed TP2 / FP1 / FN0, then a car board passed perfect
  (TP6) with token. Session 2: bicycle board passed perfect (TP1
  scored; 1 band tile excluded from scoring by the server) with token.
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 588 attempts — TP2332 /
  FP259 / FN444, P .900, R .840, exact-board 261/588, expiries 44
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 609 (compare report, bug-era
  excluded), 3 more than the era-split log sum (v1 8 + v2.1 10 +
  v2 588 = 606) — the pre-existing gap noted at Runs #97–#132,
  unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://cc306443039d74.lhr.life verified HTTP 200, local 200 too).
  The known CAPTCHA-preference glitch fired once at spawn; it was
  verified via get_captcha_preference (solve/all_tasks) and steered
  once, then all 3 sessions played clean in a single sequential
  browser task.
- Dominant failure mode: mixed false picks and sliver/partial
  under-selection on photo boards — FP3 (car ×2, traffic-light ×1)
  and FN3 (partial ×2, sliver ×1, on car and motorcycle boards).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .946 below the .95 bar, R .918 remains
  below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar;
  v2 photo expiry rate overall 44/632 = 7.0%, within the ≤10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~15:42 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #134 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #133's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T22:46:54Z-22:53:48Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP6 / FP0 / FN2, P 1.000,
  R .750, exact-board 2/3, expiries 0. Session 1: bicycle board failed
  TP2 / FP0 / FN2 (sliver + partial; 1 ambiguity error recorded by the
  server, excluded from scoring), then a car board passed perfect
  (TP1 scored) with token. Session 2: traffic-light board passed
  perfect (TP3) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt —
  TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (bridge board; dynamic replacements re-scanned until no tile
  matched, then Verify, with token).
- Running per-brief photo totals: v2 = 591 attempts — TP2338 /
  FP259 / FN446, P .900, R .840, exact-board 263/591, expiries 44
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 612 (compare report, bug-era
  excluded), 3 more than the era-split log sum (v1 8 + v2.1 10 +
  v2 591 = 609) — the pre-existing gap noted at Runs #97-#133,
  unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://cc306443039d74.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in the single sequential
  browser task; the parent verified the stored preference
  (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: sliver/partial under-selection on a single
  photo bicycle board (both photo FNs, sliver + partial, in one
  attempt) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .954 clears the .95 bar, R .912 remains
  below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar;
  v2 photo expiry rate overall 44/635 = 6.9%, within the <=10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~15:54 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #135 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #134's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T23:08:49Z-23:11:34Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP9 / FP0 / FN0, P 1.000,
  R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed
  perfect (TP8) with token. Session 2: car board passed perfect
  (TP1 scored; 1 ambiguity error recorded by the server, excluded
  from scoring) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0
  (chimney board; dynamic replacements re-scanned until no tile
  matched, then Verify, with token).
- Running per-brief photo totals: v2 = 593 attempts — TP2347 /
  FP259 / FN446, P .901, R .840, exact-board 265/593, expiries 44
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 614 (compare report), 3 more than
  the era-split log sum (v1 8 + v2.1 10 + v2 593 = 611) — the
  pre-existing gap noted at Runs #97-#134, unchanged by this run;
  rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://cc306443039d74.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in the single sequential
  browser task; the parent verified the stored preference
  (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: none this run — zero FPs and zero FNs across
  all corpora; both photo boards and the rotating board were exact
  on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .953 clears the .95 bar, R .911 remains
  below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar;
  v2 photo expiry rate overall 44/637 = 6.9%, within the <=10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~16:11 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #136 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #135's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T23:29:40Z-23:36:09Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP14 / FP0 / FN2, P 1.000,
  R .875, exact-board 2/4, expiries 0. Session 1: bus board passed
  perfect (TP4) with token. Session 2: car board failed TP5 / FN1
  (partial), traffic-light board failed TP1 / FN1 (sliver), then a
  car board passed perfect (TP4) with token.
- Rotating (force_type_b, synthetic Type B): 2 attempts — TP7 / FP0 /
  FN1, P 1.000, R .875, exact-board 1/2, expiries 0 (traffic-light
  board failed TP2 / FN1, partial; then a car board passed perfect
  TP5 with token).
- Running per-brief photo totals: v2 = 597 attempts — TP2361 /
  FP259 / FN448, P .901, R .841, exact-board 267/597, expiries 44
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 618 (compare report, bug-era
  excluded), 3 more than the era-split log sum (v1 8 + v2.1 10 +
  v2 597 = 615) — the pre-existing gap noted at Runs #97-#135,
  unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://cc306443039d74.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in the single sequential
  browser task; the parent verified the stored preference
  (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: sliver/partial under-selection on photo
  boards — both photo FNs (partial on the car board, sliver on the
  traffic-light board) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .960 clears the .95 bar, R .899 remains
  below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar;
  v2 photo expiry rate overall 44/641 = 6.9%, within the <=10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~16:36 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #137 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating
(natural, next in rotation after Run #136's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-12T23:49:50Z-23:52:18Z, source live-agent,
3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP11 / FP1 / FN1, P .917,
  R .917, exact-board 2/3, expiries 0. Session 1: motorcycle board
  failed TP3 / FP1 / FN1 (partial), then a car board passed perfect
  (TP4) with token. Session 2: bus board passed perfect (TP4) with
  token.
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Running per-brief photo totals: v2 = 600 attempts — TP2372 /
  FP260 / FN449, P .901, R .841, exact-board 269/600, expiries 44
  (all from earlier v2 eras; 0 this run). Server cross-check:
  all-era scored photo attempts = 621 (compare report, bug-era
  excluded), 3 more than the era-split log sum (v1 8 + v2.1 10 +
  v2 600 = 618) — the pre-existing gap noted at Runs #97-#136,
  unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight, tunnel URL from LIVE_URL.txt
  https://cc306443039d74.lhr.life verified HTTP 200, local 200 too).
  No CAPTCHA-preference pause was reported in the single sequential
  browser task; the parent verified the stored preference
  (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: mixed single false pick and partial
  under-selection on a single photo motorcycle board (FP1 + FN1
  partial, in one attempt) — the other two photo boards were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .952 clears the .95 bar, R .915 remains
  below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar;
  v2 photo expiry rate overall 44/644 = 6.8%, within the <=10% limit.
  No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~16:53 PDT on 2026-10-12; the AM
  summary was already delivered with Run #115 — marker
  `Summary delivered: 2026-10-12 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #138 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #137's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure after revival (initial session lost to tunnel death, unscored, then revived per protocol).
Window arbitrated: 2026-10-13T00:06:24Z-00:28:05Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP12 / FP3 / FN3, P .800, R .800, exact-board 2/4, expiries 0. Session 1: bus board perfect (TP4). Session 2: car board failed TP0 / FP1 / FN2 (sliver misses), then car board failed TP6 / FP2 / FN1 (sliver miss), then car board passed perfect (TP2).
- Rotating (force_dynamic, synthetic Type A dynamic): 3 attempts — TP13 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/3, expiries 0. Palm-tree board fail TP5, car board fail TP2, crosswalk board pass TP6.
- Running per-brief photo totals: v2 = 604 attempts — TP2384 / FP263 / FN452, P .901, R .841, exact-board 271/604, expiries 44 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 625 (compare report, bug-era excluded), 3 more than the era-split log sum (v1 8 + v2.1 10 + v2 604 = 622) — pre-existing gap unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: tunnel/server death mid-run (units inactive, “no tunnel” page) revived via tools/install_services.sh reinstall, then systemd start; tunnel restored to HTTP 200 at same URL, 0 scored attempts lost. CAPTCHA-preference glitch did not occur; all 3 sessions played clean.
- Dominant failure mode: partial/sliver under-selection on photo car boards (all 3 photo FNs were sliver; FPs also on car boards).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .931, R .893, exact-board 15/30 = 50.0%; v2 photo expiry rate overall 44/644 = 6.8% (within ≤10%). No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~17:28 PDT; AM summary delivered with Run #115 — marker `Summary delivered: 2026-10-12 AM` — PM summary not due until first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #139 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #138's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure after pre-flight revival.
Window arbitrated: 2026-10-13T00:36:37Z-00:38:58Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP23 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: bus board passed perfect (TP7) with token. Session 2: motorcycle board passed perfect (TP16) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP0 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (motorcycle board; no tile contained a motorcycle, verified with an empty selection, with token).
- Running per-brief photo totals: v2 = 606 attempts — TP2407 / FP263 / FN452, P .901, R .842, exact-board 273/606, expiries 44 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 627 (compare report, bug-era excluded), 3 more than the era-split log sum (v1 8 + v2.1 10 + v2 606 = 624) — the pre-existing gap noted at Runs #97-#138, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were INACTIVE (tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://cc306443039d74.lhr.life) verified HTTP 200 (local 200 too) before any play. The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; both photo boards and the rotating board were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .938 below the .95 bar, R .915 remains below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 44/650 = 6.8%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~17:39 PDT on 2026-10-12; the AM summary was already delivered with Run #115 — marker `Summary delivered: 2026-10-12 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #140 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #139's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T00:48:40Z-00:51:24Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP28 / FP0 / FN3, P 1.000, R .903, exact-board 2/3, expiries 0. Session 1: motorcycle board failed TP11 / FP0 / FN3 (sliver + partial x2), then a fire-hydrant board passed perfect (TP4 scored) with token. Session 2: bicycle board passed perfect (TP13) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP7 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bridge board pass, with token).
- Running per-brief photo totals: v2 = 609 attempts — TP2435 / FP263 / FN455, P .903, R .843, exact-board 275/609, expiries 44 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 630 (compare report, bug-era excluded), 3 more than the era-split log sum (v1 8 + v2.1 10 + v2 609 = 627) — the pre-existing gap noted at Runs #97-#139, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://cc306443039d74.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported in the single sequential browser task; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: sliver/partial under-selection on a single photo motorcycle board (all 3 photo FNs, sliver + partial x2, in one attempt) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .944 below the .95 bar, R .911 remains below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 44/653 = 6.7%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~17:51 PDT on 2026-10-12; the AM summary was already delivered with Run #115 — marker `Summary delivered: 2026-10-12 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #141 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #140's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T01:07:39Z-01:24:16Z, source live-agent, 8 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 8 attempts — TP18 / FP11 / FN5, P .621, R .783, exact-board 2/8, expiries 1. Session 1 (6 scored + 1 expired): traffic-light board failed TP2 / FP1 / FN1 (whole), bicycle board failed TP0 / FN2 (partial + sliver; empty_submission), bus board failed TP3 / FP1 / FN1 (whole), fire-hydrant board failed TP1 / FP1 / FN1 (partial), car board failed TP1 / FP2 / FN0, a car round expired unscored (challenge_expired), then a bicycle board passed perfect (TP6) with token. Session 2 (2 scored): car board failed TP3 / FP6 / FN0, then a bicycle board passed perfect (TP2) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 617 attempts — TP2453 / FP274 / FN460, P .899, R .842, exact-board 277/617, expiries 45. Server cross-check: all-era scored photo attempts = 638 (compare report, bug-era excluded), 3 more than the era-split log sum (v1 8 + v2.1 10 + v2 617 = 635) — the pre-existing gap noted at Runs #97-#140, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://cc306443039d74.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported in the single sequential browser task; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: false picks on photo boards — FP11 this run, including FP6 on a single session-2 car board and FP2 on a session-1 car board; FN5 was mixed (whole x2, partial x2, sliver x1), plus 1 photo expiry and 1 empty_submission on the bicycle board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .891 below the .95 bar, R .884 remains below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 45/662 = 6.8%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~18:24 PDT on 2026-10-12; the AM summary was already delivered with Run #115 — marker `Summary delivered: 2026-10-12 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #142 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #141's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T01:28:19Z-01:42:33Z, source live-agent, 5 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 4 attempts — TP12 / FP5 / FN0, P .706, R 1.000, exact-board 2/4, expiries 1. Session 1: motorcycle board passed perfect (TP3) with token. Session 2: bicycle round expired unscored (challenge_expired), then car board failed TP1 / FP1 / FN0, car board failed TP4 / FP4 / FN0, then a car board passed perfect (TP4) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bus board; dynamic replacements re-scanned until no tile matched, then Verify, with token).
- Running per-brief photo totals: v2 = 621 attempts — TP2465 / FP279 / FN460, P .898, R .843, exact-board 279/621, expiries 46. Server cross-check: all-era scored photo attempts = 642 (compare report, bug-era excluded), 3 more than the era-split log sum (v1 8 + v2.1 10 + v2 621 = 639) — the pre-existing gap noted at Runs #97-#141, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://cc306443039d74.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported in the single sequential browser task; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: false picks on photo car boards — all 5 photo FPs came from two car boards in session 2 (FP1 and FP4); zero FNs this run, plus the 180 s expiry of the photo bicycle round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .864 below the .95 bar, R .901 remains below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 46/667 = 6.9%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~18:42 PDT on 2026-10-12; the AM summary was already delivered with Run #115 — marker `Summary delivered: 2026-10-12 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #143 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #142's force_dynamic).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 3 ended in terminal cooldown ("Too many attempts") after 1 failed round.
Window arbitrated: 2026-10-13T01:48:19Z-01:56:27Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP21 / FP2 / FN4, P .913, R .840, exact-board 2/7, expiries 0. Session 1: motorcycle board failed TP0 / FP0 / FN1 (sliver; empty_submission), then a bicycle board passed perfect (TP3) with token. Session 2: bicycle board failed TP4 / FN1 (partial), bus board failed TP6 / FN1 (partial), bicycle board failed TP3 / FP1 / FN0, traffic-light board failed TP3 / FP1 / FN1 (partial), then a fire-hydrant board passed perfect (TP2 scored) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP4 / FP0 / FN1, P 1.000, R .800, exact-board 0/1, expiries 0 (traffic-light board failed, sliver FN1; session then hit terminal cooldown with no token).
- Running per-brief photo totals: v2 = 628 attempts — TP2486 / FP281 / FN464, P .898, R .843, exact-board 281/628, expiries 46 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 649 (compare report, bug-era excluded), 3 more than the era-split log sum (v1 8 + v2.1 10 + v2 628 = 646) — the pre-existing gap noted at Runs #97-#142, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://cc306443039d74.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 4 photo FNs (partial x3, sliver x1, incl. 1 empty_submission on the motorcycle board), plus FP2 on bicycle and traffic-light boards.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .853 below the .95 bar, R .891 remains below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 46/674 = 6.8%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~18:57 PDT on 2026-10-12; the AM summary was already delivered with Run #115 — marker `Summary delivered: 2026-10-12 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #144 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #143's force_low_trust).
Sessions: 3 played, 3 tokens, 1 initial session lost to a tunnel death mid-round (unscored, replaced per protocol after revival).
Window arbitrated: 2026-10-13T02:15:23Z-02:18:56Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP10 / FP8 / FN1, P .556, R .909, exact-board 2/4, expiries 0. Session 1: car board failed TP2 / FP7 / FN1 (sliver), then a traffic-light board passed perfect (TP2) with token. Session 2: fire-hydrant board failed TP2 / FP1 / FN0, then a car board passed perfect (TP4) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bicycle board pass, with token).
- Running per-brief photo totals: v2 = 632 attempts — TP2496 / FP289 / FN465, P .896, R .843, exact-board 283/632, expiries 46 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 654 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 632 = 650) — the pre-existing gap noted at Runs #97-#143 grew by 1 this run (Run #143's server count read 649 vs a reconciled 650 before this run's 4 attempts); rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: the tunnel died mid-round in the first session (page went to "no tunnel", that round never reached the server — unscored). At revival check both systemd units were INACTIVE (tunnel 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://cc306443039d74.lhr.life) verified HTTP 200 (local 200 too), and all 3 sessions were then replayed from scratch in the same browser task. The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then played clean.
- Dominant failure mode: false picks on photo boards — FP8 this run, including FP7 on a single session-1 car board; the run's only FN was a sliver miss on that same car board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .819 below the .95 bar, R .901 remains below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 46/678 = 6.8%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~19:19 PDT on 2026-10-12; the AM summary was already delivered with Run #115 — marker `Summary delivered: 2026-10-12 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #145 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #144's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T02:26:20Z-02:37:16Z, source live-agent, 4 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 4 attempts — TP13 / FP0 / FN2, P 1.000, R .867, exact-board 2/4, expiries 1. Session 1: motorcycle board failed TP2 / FP0 / FN1 (sliver), car board failed TP7 / FP0 / FN1 (partial), bicycle round expired unscored (challenge_expired), then a car board passed perfect (TP2) with token. Session 2: bicycle board passed perfect (TP2) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 636 attempts — TP2509 / FP289 / FN467, P .897, R .843, exact-board 285/636, expiries 47. Server cross-check: all-era scored photo attempts = 658 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 636 = 654) — the pre-existing gap noted at Runs #97-#144, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://cc306443039d74.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — both photo FNs (sliver x1 on motorcycle, partial x1 on car), zero FPs this run, plus the 180 s expiry of the photo bicycle round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .785 below the .95 bar, R .888 remains below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 47/683 = 6.9%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~19:37 PDT on 2026-10-12; the AM summary was already delivered with Run #115 — marker `Summary delivered: 2026-10-12 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #146 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #145's natural).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 1 ended in terminal cooldown ("Too many attempts") after 6 failed rounds.
Window arbitrated: 2026-10-13T02:46:49Z-02:58:17Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP15 / FP7 / FN4, P .682, R .789, exact-board 1/7, expiries 0. Session 1 (6 attempts, no token, terminal cooldown): car TP1 / FP1 / FN1 (whole), car TP3 / FP1 / FN0, bicycle TP0 / FP0 / FN2 (partial x2; empty_submission; 1 ambiguity error recorded by the server, excluded from scoring), car TP4 / FP2 / FN0, car TP3 / FP1 / FN1 (sliver), traffic-light TP2 / FP2 / FN0. Session 2: fire-hydrant board passed perfect (TP2) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (taxi board; dynamic replacements re-scanned until no tile matched, then Verify, with token).
- Running per-brief photo totals: v2 = 643 attempts — TP2524 / FP296 / FN471, P .895, R .843, exact-board 286/643, expiries 47 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 665 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 643 = 661) — the pre-existing gap noted at Runs #97-#145, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://cc306443039d74.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on photo boards — FP7 this run spread across session 1's car and traffic-light boards (FP1, FP1, FP2, FP1, FP2); FN4 was mixed (whole x1, partial x2 on the empty-submission bicycle board, sliver x1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .754 below the .95 bar, R .887 remains below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 47/690 = 6.8%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~19:58 PDT on 2026-10-12; the AM summary was already delivered with Run #115 — marker `Summary delivered: 2026-10-12 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #147 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #146's force_dynamic).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 3 ended in terminal cooldown ("Too many attempts") after its single failed round.
Window arbitrated: 2026-10-13T03:06:31Z-03:14:21Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: bicycle board passed perfect (TP4) with token. Session 2: traffic-light board passed perfect (TP2; 2 ambiguity errors recorded by the server, excluded from scoring) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP4 / FP0 / FN1, P 1.000, R .800, exact-board 0/1, expiries 0 (fire-hydrant board failed, partial FN1, terminal cooldown, no token).
- Running per-brief photo totals: v2 = 645 attempts — TP2530 / FP296 / FN471, P .895, R .843, exact-board 288/645, expiries 47 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 667 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 645 = 663) — the pre-existing gap noted at Runs #97-#146, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). Note the tunnel URL changed since Run #146 (was cc306443039d74) — read fresh per protocol. No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none on photo boards — both photo boards were exact; the run's only FN was a single partial miss on the synthetic fire-hydrant board in the rotating session.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .790 below the .95 bar, R .883 remains below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 47/692 = 6.8%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~20:14 PDT on 2026-10-12; the AM summary was already delivered with Run #115 — marker `Summary delivered: 2026-10-12 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #148 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #147's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T03:30:58Z-03:41:29Z, source live-agent, 8 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 4 attempts — TP26 / FP0 / FN4, P 1.000, R .867, exact-board 2/4, expiries 1. Session 1: motorcycle round expired unscored (challenge_expired), bus board failed TP10 / FN2 (partial x2), then a fire-hydrant board passed perfect (TP6) with token. Session 2: bus board failed TP8 / FN2 (partial x2), then a fire-hydrant board passed perfect (TP2) with token.
- Photo (rotating session also served 2 photo rounds; counted here — same brief, corpus-split): 2 attempts — TP3 / FP2 / FN1, P .600, R .750, exact-board 1/2, expiries 0. Car board failed TP2 / FP2 / FN1 (partial), then a car board passed perfect (TP1) with token.
- Photo run total: 6 attempts — TP29 / FP2 / FN5, P .935, R .853, exact-board 3/6, expiries 1.
- Synthetic (rotating session): 2 attempts — TP15 / FP1 / FN1, P .938, R .938, exact-board 0/2, expiries 0. Fire-hydrant board failed TP8 / FP1 / FN0, then a fire-hydrant board failed TP7 / FP0 / FN1 (partial); session then passed on the photo car round above.
- Running per-brief photo totals: v2 = 651 attempts — TP2559 / FP298 / FN476, P .896, R .843, exact-board 291/651, expiries 48. Server cross-check: all-era scored photo attempts = 673 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 651 = 669) — the pre-existing gap noted at Runs #97-#147, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial under-selection on photo bus boards — all 4 designated photo FNs were partial misses on the two bus boards (FN2 each); the rotating photo car board added FP2 + FN1 partial, plus the 180 s expiry of the photo motorcycle round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .838 below the .95 bar, R .867 remains below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 48/699 = 6.9%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~20:42 PDT on 2026-10-12; the AM summary was already delivered with Run #115 — marker `Summary delivered: 2026-10-12 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #149 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #148's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T03:50:15Z-04:01:29Z, source live-agent, 5 scored attempts total, plus 2 unscored expired photo attempts.
- Photo (designated sessions): 5 attempts — TP12 / FP4 / FN3, P .750, R .800, exact-board 2/5, expiries 2. Session 1 (3 scored + 2 expired): motorcycle round expired unscored (challenge_expired), traffic-light round expired unscored (challenge_expired), bicycle board failed TP2 / FP3 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), traffic-light board failed TP0 / FP0 / FN1 (sliver; empty_submission), then a traffic-light board passed perfect (TP2) with token. Session 2: motorcycle board failed TP6 / FP1 / FN2 (partial x2), then a fire-hydrant board passed perfect (TP2) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 656 attempts — TP2571 / FP302 / FN479, P .895, R .843, exact-board 293/656, expiries 50. Server cross-check: all-era scored photo attempts = 678 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 656 = 674) — the pre-existing gap noted at Runs #97-#148, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported in the single sequential browser task; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: mixed — false picks on the photo bicycle board (FP3 in one attempt) plus partial under-selection on the photo motorcycle board (FN2, partial x2) and a sliver empty-submission on a traffic-light board (FN1); plus 2 photo expiries in session 1 (both unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .812 below the .95 bar, R .858 remains below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 50/706 = 7.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired. The twice-daily PM summary IS due with this run (it completed at ~21:02 PDT on 2026-10-12, the first completed run after 21:00 PDT; the AM summary was delivered with Run #115 and no PM marker existed) and is delivered in the run's chat report in English only: Runs #116-#149 completed since the AM summary (34 runs, including blocked Run #122 with no scored play), 101 sessions played, 94 tokens, 136 scored photo attempts banked under v2 (520 -> 656), cumulative v2 photo line P .895 / R .843 / exact-board 293/656, rolling-30 P .812 / R .858 / exact 14/30, expiry rate 7.1% overall, parity NOT reached (exact-board is the largest gap, then precision and recall), dominant failure mode over the period remains sliver/partial under-selection on photo boards with episodic false-pick blowups on car boards, notable incidents include blocked Run #122 (escalated CAPTCHA-preference glitch), repeated tunnel deaths and pre-flight/mid-run gym revivals (Runs #118, #121, #138, #139, #144), and Run #149's 2 photo expiries in session 1. Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).
Summary delivered: 2026-10-12 PM

### Run #150 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #149's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T04:06:55Z-04:14:13Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP23 / FP0 / FN1, P 1.000, R .958, exact-board 2/3, expiries 0. Session 1: fire-hydrant board passed perfect (TP16) with token. Session 2: motorcycle board failed TP3 / FP0 / FN1 (partial; 1 ambiguity error recorded by the server, excluded from scoring), then a traffic-light board passed perfect (TP4) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bicycle board; single matching tile clicked, replacements re-scanned clean, then Verify).
- Running per-brief photo totals: v2 = 659 attempts — TP2594 / FP302 / FN480, P .896, R .844, exact-board 295/659, expiries 50 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 681 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 659 = 677) — the pre-existing gap noted at Runs #97-#149, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported in the single sequential browser task; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean.
- Dominant failure mode: a single partial-tile miss on the photo motorcycle board (the run's only FN) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .885 below the .95 bar, R .878 below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 50/709 = 7.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~21:14 PDT on 2026-10-12; the PM summary was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM` — so no duplicate summary is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #151 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #150's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T04:26:17Z-04:31:37Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP11 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1 bus board perfect (TP7). Session 2 car board perfect (TP4).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (motorcycle board, replacements re-scanned, no new matches).
- Running per-brief photo totals: v2 = 661 attempts — TP2605 / FP302 / FN480, P 0.896, R 0.845, exact-board 297/661, expiries 50 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 683, 4 more than era-split sum (v1 8 + v2.1 10 + v2 661 = 679) — gap unchanged; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). CAPTCHA-preference glitch paused at spawn; verified via get_captcha_preference (solve/all_tasks) and steered twice, then played clean.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; both photo boards exact on first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P ~0.897, R ~0.883, exact-board ~15/30; expiry rate overall 50/711 = 7.0%, within 10%. No consecutive window.
- Reporting: no immediate trigger fired and no twice-daily summary due (PM summary delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`).

### Run #152 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #151's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T04:46:26Z-04:51:59Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP24 / FP0 / FN1, P 1.000, R .960, exact-board 2/3, expiries 0. Session 1: fire-hydrant board passed perfect (TP2; 1 ambiguity error recorded by the server, excluded from scoring) with token. Session 2: car board failed TP6 / FP0 / FN1, then a fire-hydrant board passed perfect (TP16) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP7 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (tractor board pass; server scored 7 tiles, 1 tile excluded from scoring).
- Running per-brief photo totals: v2 = 664 attempts — TP2629 / FP302 / FN481, P .897, R .845, exact-board 299/664, expiries 50 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 686 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 664 = 682) — the pre-existing gap noted at Runs #97-#151, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were INACTIVE (gym local port dead, tunnel 502). Revived per protocol: tools/install_services.sh reinstalled/enabled both units, services started, LIVE_URL.txt tunnel (https://549af1d02358d1.lhr.life) verified HTTP 200 (local 200 too) before any play. No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: a single missed tile on the photo car board (the run's only FN) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .905 below the .95 bar, R .899 below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 50/714 = 7.0%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~21:52 PDT on 2026-10-12; the PM summary was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM` — so no duplicate summary is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #153 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #152's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T05:08:42Z-05:21:25Z, source live-agent, 7 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 7 attempts — TP34 / FP9 / FN3, P .791, R .919, exact-board 2/7, expiries 1. Session 1: car board failed TP3 / FP1 / FN1 (whole-tile miss), bicycle board failed TP2 / FP3 / FN0, then a bus board passed perfect (TP6) with token. Session 2: motorcycle board failed TP13 / FP0 / FN1 (partial), car board failed TP4 / FP1 / FN1 (partial), car board failed TP4 / FP4 / FN0, a car round expired unscored (challenge_expired), then a car board passed perfect (TP2) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 671 attempts — TP2663 / FP311 / FN484, P .895, R .846, exact-board 301/671, expiries 51. Server cross-check: all-era scored photo attempts = 693 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 671 = 689) — the pre-existing gap noted at Runs #97-#152, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on photo boards — FP9 across 3 attempts (bicycle FP3 in one attempt, car FP4 in one attempt, plus 2 single FPs), versus FN3 (whole x1, partial x2).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .894 below the .95 bar, R .917 below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 51/722 = 7.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~22:22 PDT on 2026-10-12; the PM summary was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM` — so no duplicate summary is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #154 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #153's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T05:28:10Z-05:31:38Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP6 / FP0 / FN2, P 1.000, R .750, exact-board 2/3, expiries 0. Session 1: fire-hydrant board passed perfect (TP2; 2 ambiguity errors recorded by the server, excluded from scoring) with token. Session 2: bicycle board failed TP2 / FP0 / FN2 (sliver + partial), then a car board passed perfect (TP2) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bridge board; dynamic replacements re-scanned until no tile matched, then Verify, with token).
- Running per-brief photo totals: v2 = 674 attempts — TP2669 / FP311 / FN486, P .896, R .846, exact-board 303/674, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 696 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 674 = 692) — the pre-existing gap noted at Runs #97-#153, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on a single photo bicycle board (both photo FNs, sliver x1 + partial x1, in one attempt) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .904 below the .95 bar, R .904 below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 51/725 = 7.0%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~22:31 PDT on 2026-10-12; the PM summary was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM` — so no duplicate summary is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #155 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #154's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T05:46:46Z-05:52:47Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP20 / FP0 / FN2, P 1.000, R .909, exact-board 2/3, expiries 0. Session 1: car board failed TP9 / FP0 / FN2 (partial x1 + whole x1), then a car board passed perfect (TP4) with token. Session 2: bus board passed perfect (TP7; 2 ambiguity errors recorded by the server, excluded from scoring) with token.
- Photo (rotating session also served 1 photo round; counted here — same brief, corpus-split): car board passed perfect (TP3; 1 ambiguity error recorded by the server, excluded from scoring) with token. The force_low_trust session was served a Type B photo board, so this run has no scored synthetic attempts.
- Photo run total: 4 attempts — TP23 / FP0 / FN2, P 1.000, R .920, exact-board 3/4, expiries 0.
- Running per-brief photo totals: v2 = 678 attempts — TP2692 / FP311 / FN488, P .896, R .846, exact-board 306/678, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 700 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 678 = 696) — the pre-existing gap noted at Runs #97-#154, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: under-selection on a single photo car board (both photo FNs, partial x1 + whole x1, in one attempt) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .902 below the .95 bar, R .914 below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 51/729 = 7.0%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~22:52 PDT on 2026-10-12; the PM summary was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM` — so no duplicate summary is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #156 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #155's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T06:06:12Z-06:12:48Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP8 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: traffic_light board passed perfect (TP3) with token. Session 2: car board passed perfect (TP5; 1 ambiguity error recorded by the server, excluded from scoring) with token.
- Photo (rotating session also served 2 photo rounds; counted here — same brief, corpus-split): 2 attempts — TP2 / FP5 / FN4, P .286, R .333, exact-board 0/2, expiries 0. Car board failed TP0 / FP5 / FN2 (partial FN x2), then a bicycle board failed TP2 / FP0 / FN2 (sliver x1 + partial x1), then the session passed on the synthetic board below.
- Photo run total: 4 attempts — TP10 / FP5 / FN4, P .667, R .714, exact-board 2/4, expiries 0.
- Synthetic (rotating session): 1 attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bicycle board pass with token; 2 ambiguity errors recorded by the server, excluded from scoring).
- Running per-brief photo totals: v2 = 682 attempts — TP2702 / FP316 / FN492, P .895, R .846, exact-board 308/682, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 704, 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 682 = 700) — the pre-existing gap noted at Runs #97-#155, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks + under-selection in the rotating session's photo rounds — FP5 on a single car board (all of the run's FPs) plus partial/sliver FNs on car and bicycle boards; designated photo sessions were perfect.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .904 below the .95 bar, R .898 below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 51/733 = 7.0%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~23:13 PDT on 2026-10-12; the PM summary was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM` — so no duplicate summary is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #157 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #156's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T06:27:50Z-06:31:16Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP19 / FP1 / FN2, P .950, R .905, exact-board 2/4, expiries 0. Session 1: fire-hydrant board failed TP3 / FP0 / FN1 (sliver), then a bus board passed perfect (TP1) with token. Session 2: car board failed TP2 / FP1 / FN1 (partial), then a bicycle board passed perfect (TP13) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 686 attempts — TP2721 / FP317 / FN494, P .896, R .846, exact-board 310/686, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 708 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 686 = 704) — the pre-existing gap noted at Runs #97-#156, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: mixed small errors on photo boards — sliver FN1 on the fire-hydrant board and partial FN1 + FP1 on the car board; no other errors.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .909 below the .95 bar, R .909 below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 51/737 = 6.9%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~23:31 PDT on 2026-10-12; the PM summary was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM` — so no duplicate summary is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #158 — continuous run (2026-10-12, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #157's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T06:46:12Z-06:49:22Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP8 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed perfect (TP2; 1 ambiguity-band tile excluded from scoring by the server) with token. Session 2: fire-hydrant board passed perfect (TP6) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bus board; the bus tile's replacement was a traffic light and no bus tiles remained on re-scan, then Verify, with token).
- Running per-brief photo totals: v2 = 688 attempts — TP2729 / FP317 / FN494, P .896, R .847, exact-board 312/688, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 710 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 688 = 706) — the pre-existing gap noted at Runs #97-#157, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .903 below the .95 bar, R .908 below the .95 bar, exact-board 18/30 = 60.0% below the 90% bar; v2 photo expiry rate overall 51/739 = 6.9%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~23:49 PDT on 2026-10-12; the PM summary was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM` — so no duplicate summary is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #159 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #158's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T07:10:14Z-07:15:46Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP14 / FP0 / FN3, P 1.000, R .824, exact-board 2/3, expiries 0. Session 1: car board passed perfect (TP6) with token. Session 2: car board failed TP5 / FN3 (sliver x2 + partial x1), then a traffic-light board passed perfect (TP3) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (chimney board; single matching tile clicked, replacement was a bicycle with no chimney, re-scan clean, then Verify, with token).
- Running per-brief photo totals: v2 = 691 attempts — TP2743 / FP317 / FN497, P .896, R .847, exact-board 314/691, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 713 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 691 = 709) — the pre-existing gap noted at Runs #97-#158, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on a single photo car board — all 3 photo FNs in one attempt (sliver x2, partial x1); zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .902 below the .95 bar, R .890 below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 51/742 = 6.9%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~00:16 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #160 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #159's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T07:26:14Z-07:29:12Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: bicycle board passed perfect (TP2) with token. Session 2: car board passed perfect (TP2) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (mountain board pass, TP6, with token).
- Running per-brief photo totals: v2 = 693 attempts — TP2747 / FP317 / FN497, P .897, R .847, exact-board 316/693, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 715 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 693 = 711) — the pre-existing gap noted at Runs #97-#159, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .899 below the .95 bar, R .893 below the .95 bar, exact-board 18/30 = 60.0% below the 90% bar; v2 photo expiry rate overall 51/744 = 6.9%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~00:29 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #161 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #160's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T07:48:25Z-07:50:36Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP6 / FP0 / FN2, P 1.000, R .750, exact-board 2/3, expiries 0. Session 1: traffic_light board passed perfect (TP4) with token. Session 2: car board failed TP0 / FP0 / FN2 (empty_submission, fn_bands partial + sliver), then a traffic_light board passed (TP2; 1 ambiguity error excluded from scoring) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 696 attempts — TP2753 / FP317 / FN499, P .897, R .847, exact-board 318/696, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 718 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 696 = 714) — the pre-existing gap noted at Runs #97-#160, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://549af1d02358d1.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired on session 1; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then played clean. Sessions 2 and 3 played in the same sequential task thereafter.
- Dominant failure mode: sliver/partial under-selection on a photo car board — an empty submission missing 2 positives (partial + sliver bands, per server), the run's only FNs; zero FPs.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .915 below the .95 bar, R .875 below the .95 bar, exact-board 19/30 = 63.3% below the 90% bar; v2 photo expiry rate overall 51/747 = 6.8%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~00:51 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #162 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #161's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T08:06:21Z-08:14:19Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP35 / FP0 / FN8, P 1.000, R .814, exact-board 2/7, expiries 0. Session 1: bicycle board failed TP1 / FN1 (sliver), fire_hydrant board failed TP1 / FN1 (sliver), bicycle board failed TP2 / FP0 / FN2 (partial x2; 2 ambiguity errors excluded from scoring), then a fire_hydrant board passed perfect (TP8) with token. Session 2: car board failed TP6 / FN1 (partial), motorcycle board failed TP10 / FN3 (partial, whole, partial; 1 ambiguity error), then a bus board passed perfect (TP7; 1 ambiguity error) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bus board; 2 initial tiles clicked, replacements re-scanned clean, then Verify, with token).
- Running per-brief photo totals: v2 = 703 attempts — TP2788 / FP317 / FN507, P .898, R .846, exact-board 320/703, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 725 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 703 = 721) — the pre-existing gap noted at Runs #97-#161, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://27e1541329ff4b.lhr.life verified HTTP 200, local 200 too). Note the tunnel URL changed since Run #161 (was 549af1d02358d1) — read fresh per protocol. No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 8 photo FNs (sliver x2, partial x5, whole x1 across 5 failed boards); zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .953 clears the .95 bar, R .852 below the .95 bar, exact-board 18/30 = 60.0% below the 90% bar; v2 photo expiry rate overall 51/754 = 6.8%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~01:14 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #163 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #162's force_dynamic).
Sessions: 3 played, 1 token, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T08:29:27Z-08:42:36Z, source live-agent, 10 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 9 attempts — TP32 / FP11 / FN7, P .744, R .821, exact-board 1/9, expiries 0. Session 1: traffic_light board failed TP1 / FP1 / FN0 (2 ambiguity errors), then a car board failed TP3 / FP7 / FN0 (van-body false picks), then a car board passed perfect TP4 / FP0 / FN0 with token. Session 2: motorcycle TP6 / FN2 (partial+sliver), traffic_light TP5 / FP1 / FN0, motorcycle TP8 / FN2 (partial pair), motorcycle TP2 / FN2 (sliver+partial), car TP2 / FN1 (sliver), car TP1 / FP2 / FN0 — all photo boards failed, no token (terminal cooldown).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP4 / FP0 / FN1, P 1.000, R .800, exact-board 0/1, expiries 0 (motorcycle board; one partial missed, then terminal cooldown, no token).
- Running per-brief photo totals: v2 = 712 attempts — TP2820 / FP328 / FN514, P .896, R .846, exact-board 321/712, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 734 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 712 = 730) — the pre-existing gap noted at Runs #97-#162, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://27e1541329ff4b.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference solve/all_tasks verified via get_captcha_preference; no CAPTCHA pause reported; all 3 sessions played clean.
- Dominant failure mode: false picks on photo boards — 11 FPs total, incl. FP7 blowup on the van-body car board; 7 FNs (sliver/partial) remain secondary for this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .908 below the .95 bar, R .843 below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 51/763 = 6.7% within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~01:42 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #164 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #163's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure after revival.
Window arbitrated: 2026-10-13T08:50:51Z-08:57:12Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP10 / FP2 / FN0, P .833, R 1.000, exact-board 2/4, expiries 0. Session 1: car board failed TP1 / FP1 / FN0, then a car board passed perfect (TP2) with token. Session 2: motorcycle board failed TP3 / FP1 / FN0 (1 ambiguity error excluded from scoring), then a bus board passed perfect (TP4) with token.
- Photo (rotating session also served 2 photo rounds; counted here — same brief, corpus-split): car board failed TP2 / FP1 / FN1 (partial), bus board failed TP6 / FP0 / FN4 (partial x4).
- Photo run total: 6 attempts — TP18 / FP3 / FN5, P .857, R .783, exact-board 2/6, expiries 0.
- Synthetic (rotating session): 2 attempts — TP6 / FP0 / FN1, P 1.000, R .857, exact-board 1/2, expiries 0 (traffic-light board failed TP1 / FN1 partial; stairs board passed perfect TP5, with token).
- Running per-brief photo totals: v2 = 718 attempts — TP2838 / FP331 / FN519, P .896, R .845, exact-board 323/718, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 740 (server arbitration), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 718 = 736) — the pre-existing gap noted at Runs #97-#163, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were INACTIVE (tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://27e1541329ff4b.lhr.life) verified HTTP 200 (local 200 too) before any play. No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial-tile under-selection on photo boards — all 5 photo FNs were partial-band, 4 of them on the rotating session's photo bus board (FN4 in one attempt); false picks were secondary (FP3, one each on two car boards and the motorcycle board).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .886 below the .95 bar, R .813 well below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo expiry rate overall 51/769 = 6.6%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~01:57 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #165 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #164's force_type_b).
Sessions: 3 played, 1 token, 0 lost to infrastructure. Both photo sessions ended in terminal cooldown ("Too many attempts") after 6 failed rounds each, with no token.
Window arbitrated: 2026-10-13T09:09:37Z-09:20:31Z, source live-agent, 12 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 12 attempts — TP27 / FP21 / FN32, P .562, R .458, exact-board 0/12, expiries 0. Session 1 (6 attempts, no token): car TP0/FP4/FN1 (sliver), bus TP5/FP1/FN5 (whole/partial), traffic_light TP0/FP3/FN2, motorcycle TP3/FP3/FN2, fire_hydrant TP1/FP1/FN1, traffic_light TP2/FP2/FN1. Session 2 (6 attempts, no token): car TP4/FP2/FN5, car TP2/FP1/FN0, car TP5/FP0/FN6 (whole/partial), fire_hydrant TP4/FP2/FN4, bicycle TP0/FP0/FN2 (empty_submission), bicycle TP1/FP2/FN3.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 730 attempts — TP2865 / FP352 / FN551, P .891, R .839, exact-board 323/730, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 752 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 730 = 748) — the pre-existing gap noted at Runs #97-#164, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://27e1541329ff4b.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired at session start; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then played clean in a single sequential browser task.
- Dominant failure mode: combined false picks and under-selection on photo boards — FP21 and FN32 across all 12 attempts with zero exact boards; FN bands were predominantly partial, with whole-instance and sliver misses secondary, plus one empty_submission on a bicycle board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .741 below the .95 bar, R .676 well below the .95 bar, exact-board 4/30 = 13.3% below the 90% bar; v2 photo expiry rate overall 51/781 = 6.5%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~02:21 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #166 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #165's natural).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Photo session 2 ended in terminal cooldown ("Too many attempts") after 6 failed rounds, with no token.
Window arbitrated: 2026-10-13T09:27:33Z-09:35:01Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP13 / FP4 / FN11, P .765, R .542, exact-board 1/7, expiries 0. Session 1: car board passed perfect (TP4) with token. Session 2 (6 attempts, no token): car TP4/FP2/FN0, traffic_light TP2/FP1/FN0 (1 ambiguity error), bicycle TP0/FN6 (empty_submission; partial x4, whole x2; 1 ambiguity error), bicycle TP0/FN2 (empty_submission; partial, sliver), traffic_light TP2/FP1/FN0, bicycle TP1/FN3 (sliver, partial, sliver; 2 ambiguity errors).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (palm-tree board; dynamic replacements re-scanned until no tile matched, then Verify, with token).
- Running per-brief photo totals: v2 = 737 attempts — TP2878 / FP356 / FN562, P .890, R .837, exact-board 324/737, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 759 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 737 = 755) — the pre-existing gap noted at Runs #97-#165, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://27e1541329ff4b.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified solve/all_tasks via get_captcha_preference proactively at spawn; no CAPTCHA-preference pause was reported; all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: under-selection on photo bicycle boards — all 11 photo FNs came from session 2's three bicycle boards, including 2 empty_submission procedure errors (FN6 and FN2); false picks were secondary (FP4, incl. FP2 on the first car board).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .710 below the .95 bar, R .589 well below the .95 bar, exact-board 3/30 = 10.0% below the 90% bar; v2 photo expiry rate overall 51/788 = 6.5%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~02:35 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #167 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #166's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T09:48:01Z-09:51:54Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP22 / FP0 / FN4, P 1.000, R .846, exact-board 2/4, expiries 0. Session 1: motorcycle board failed TP5 / FP0 / FN3 (partial x2 + sliver x1; 1 ambiguity error recorded by the server, excluded from scoring), then a car board passed perfect (TP8) with token. Session 2: bus board failed TP5 / FP0 / FN1 (partial), then a bus board passed perfect (TP4) with token.
- Rotating (force_low_trust, synthetic Type B): 1 attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (chimney board pass with token; served as a 4x4 synthetic board under the low-trust scenario).
- Running per-brief photo totals: v2 = 741 attempts — TP2900 / FP356 / FN566, P .891, R .837, exact-board 326/741, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 763 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 741 = 759) — the pre-existing gap noted at Runs #97-#166, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://27e1541329ff4b.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 4 photo FNs (partial x3, sliver x1 across the motorcycle and bus boards); zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .730 below the .95 bar, R .609 well below the .95 bar, exact-board 5/30 = 16.7% below the 90% bar; v2 photo expiry rate overall 51/792 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~02:52 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #168 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #167's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure in scored play (the first browser task was lost to a browser-observation failure plus a mid-run gym/tunnel death before any scored attempt; it was closed unscored and replaced after revival, per protocol).
Window arbitrated: 2026-10-13T10:21:47Z-10:27:04Z, source live-agent, 9 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 8 attempts — TP25 / FP0 / FN13, P 1.000, R .658, exact-board 2/8, expiries 0. Session 1 (4 attempts, token): fire_hydrant failed TP5 / FN3 (partial x2, sliver), motorcycle failed TP4 / FN2 (sliver, partial), motorcycle failed TP0 / FN4 (empty_submission; sliver, partial x3), bicycle passed perfect (TP1). Session 2 (4 attempts, token): fire_hydrant failed TP6 / FN2 (partial, sliver), bus failed TP5 / FN1 (partial), fire_hydrant failed TP2 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), fire_hydrant passed perfect (TP2).
- Photo (rotating session also served 1 photo round; counted here — same brief, corpus-split): bus board passed perfect (TP1) with token.
- Photo run total: 9 attempts — TP26 / FP0 / FN13, P 1.000, R .667, exact-board 3/9, expiries 0.
- Synthetic: none this run (the rotating force_type_b session was served a photo-corpus board).
- Running per-brief photo totals: v2 = 750 attempts — TP2926 / FP356 / FN579, P .892, R .835, exact-board 329/750, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 772 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 750 = 768) — the pre-existing gap noted at Runs #97-#167, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were active and the tunnel URL from LIVE_URL.txt (https://27e1541329ff4b.lhr.life) verified HTTP 200 (local 200 too). Mid-run the gym/tunnel died (units inactive, tunnel 502) while the first browser task also lost page observation ("Terminal page observation failed"); that task recorded 0 attempts and was closed unscored. The gym was revived per protocol (tools/install_services.sh reinstall, services started, tunnel restored to HTTP 200 at the same URL) and a fresh sequential task played all 3 sessions clean. The known CAPTCHA-preference glitch fired on the first task only; it was verified via get_captcha_preference (solve/all_tasks) and steered once before the task stalled on the infra failure. The replacement task played clean with no pause.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 13 photo FNs were sliver/partial band (partial x8, sliver x5), including one empty_submission on a motorcycle board (FN4); zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .806 below the .95 bar, R .606 well below the .95 bar, exact-board 6/30 = 20.0% below the 90% bar; v2 photo expiry rate overall 51/801 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~03:27 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #169 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #168's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T10:31:53Z-10:38:03Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP26 / FP3 / FN13, P .897, R .667, exact-board 2/7, expiries 0. Session 1 (5 attempts, token): car TP2/FN1 (partial), car TP3/FP3/FN1 (sliver), car TP0/FN3 (partial x3; empty_submission), bicycle TP4/FN6 (sliver x2, partial x4), car passed perfect (TP4). Session 2 (2 attempts, token): car TP2/FN2 (sliver, partial), car passed perfect (TP11).
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 757 attempts — TP2952 / FP359 / FN592, P .892, R .833, exact-board 331/757, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 779 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 757 = 775) — the pre-existing gap noted at Runs #97-#168, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://27e1541329ff4b.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 13 photo FNs were sliver/partial band (partial x9, sliver x4), including one empty_submission on a car board (FN3); false picks were secondary (FP3 on one car board).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .893 below the .95 bar, R .648 well below the .95 bar, exact-board 8/30 = 26.7% below the 90% bar; v2 photo expiry rate overall 51/808 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~03:38 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #170 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #169's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T10:47:40Z-10:53:09Z, source live-agent, 6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP27 / FP2 / FN2, P .931, R .931, exact-board 2/5, expiries 0. Session 1 (4 attempts, token): bicycle failed TP2 / FN1 (sliver), motorcycle failed TP6 / FN1 (sliver), car failed TP1 / FP2 / FN0, fire_hydrant passed perfect (TP16). Session 2 (1 attempt, token): car passed perfect (TP2).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bicycle board pass with token; dynamic replacements re-scanned until no tile matched, then Verify).
- Running per-brief photo totals: v2 = 762 attempts — TP2979 / FP361 / FN594, P .892, R .834, exact-board 333/762, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 784 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 762 = 780) — the pre-existing gap noted at Runs #97-#169, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://27e1541329ff4b.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver under-selection on photo boards — both photo FNs were sliver-band (bicycle and motorcycle boards); false picks were secondary (FP2 on one car board).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .938 below the .95 bar, R .711 well below the .95 bar, exact-board 9/30 = 30.0% below the 90% bar; v2 photo expiry rate overall 51/813 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~03:53 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #171 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #170's force_dynamic).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. The rotating session ended in terminal cooldown ("Too many attempts") with no token.
Window arbitrated: 2026-10-13T11:07:54Z-11:15:28Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP33 / FP1 / FN5, P .971, R .868, exact-board 2/7, expiries 0. Session 1 (1 attempt, token): bus board passed perfect (TP7; 2 ambiguity errors recorded by the server, excluded from scoring). Session 2 (6 attempts, token): bicycle failed TP2 / FN1 (sliver), car failed TP8 / FN1 (sliver), motorcycle failed TP0 / FN1 (sliver; empty_submission — the agent reported the image showed bicycles, not a motorcycle), car failed TP6 / FP1 / FN1 (partial), traffic_light failed TP3 / FN1 (partial; 1 ambiguity error), bus passed perfect (TP7; 1 ambiguity error).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP1 / FP0 / FN0 scored, P 1.000, R 1.000, exact-board 0/1 by result (fail; 1 ambiguity error recorded by the server, excluded from scoring; fn_all 1), expiries 0 (stairs board; the clicked tile was replaced, the grid was re-scanned with no new match, then Verify; session then entered terminal cooldown, no token).
- Running per-brief photo totals: v2 = 769 attempts — TP3012 / FP362 / FN599, P .893, R .834, exact-board 335/769, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 791 (server arbitration), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 769 = 787) — the pre-existing gap noted at Runs #97-#170, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://27e1541329ff4b.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 5 photo FNs were sliver/partial band (sliver x3, partial x2), including one empty_submission on a motorcycle board (FN1); the single FP was secondary (on one car board).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .953 clears the .95 bar, R .781 well below the .95 bar, exact-board 10/30 = 33.3% below the 90% bar; v2 photo expiry rate overall 51/820 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~04:15 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #172 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #171's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T11:29:00Z-11:30:43Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: fire_hydrant board passed perfect (TP2) with token. Session 2: bicycle board passed perfect (TP4) with token.
- Photo (rotating session also served 1 photo round; counted here — same brief, corpus-split): bus board passed perfect (TP6; 2 ambiguity errors recorded by the server, excluded from scoring) with token.
- Photo run total: 3 attempts — TP12 / FP0 / FN0, P 1.000, R 1.000, exact-board 3/3, expiries 0.
- Synthetic: none this run (the rotating force_type_b session was served a photo-corpus board).
- Running per-brief photo totals: v2 = 772 attempts — TP3024 / FP362 / FN599, P .893, R .835, exact-board 338/772, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 794 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 772 = 790) — the pre-existing gap noted at Runs #97-#171, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://27e1541329ff4b.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .952 clears the .95 bar, R .799 well below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 51/823 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~04:31 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #173 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #172's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T11:46:37Z-11:49:33Z, source live-agent, 2 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: fire-hydrant board passed perfect (TP2; 2 ambiguity errors recorded by the server, excluded from scoring) with token. Session 2: traffic-light board passed perfect (TP3) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 774 attempts — TP3029 / FP362 / FN599, P .893, R .835, exact-board 340/774, expiries 51 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 796 (server arbitration), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 774 = 792) — the pre-existing gap noted at Runs #97-#172, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING (VM replaced — systemctl reported units not found, tunnel 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://27e1541329ff4b.lhr.life) verified HTTP 200 (local 200 too) before any play. No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; both photo boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .952 clears the .95 bar, R .833 well below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 51/825 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~04:49 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #174 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #173's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T12:10:36Z-12:15:22Z, source live-agent, 5 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 4 attempts — TP18 / FP2 / FN0, P .900, R 1.000, exact-board 2/4, expiries 1. Session 1 (3 scored attempts, token): fire_hydrant round expired unscored (challenge_expired), motorcycle failed TP5 / FP1 / FN0, bicycle failed TP1 / FP1 / FN0, car passed perfect (TP4). Session 2 (1 attempt, token): car board passed perfect (TP8).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (chimney board pass; dynamic replacements re-scanned until no tile matched, then Verify).
- Running per-brief photo totals: v2 = 778 attempts — TP3047 / FP364 / FN599, P .893, R .836, exact-board 342/778, expiries 52. Server cross-check: all-era scored photo attempts = 800 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 778 = 796) — the pre-existing gap noted at Runs #97-#173, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://27e1541329ff4b.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on photo boards — FP1 each on the motorcycle and bicycle boards (the run's only tile errors; zero FNs), plus 1 photo round expiry (fire_hydrant, unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .939 below the .95 bar, R .861 well below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo expiry rate overall 52/830 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~05:15 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #175 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #174's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T12:27:50Z-12:33:45Z, source live-agent, 6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP15 / FP2 / FN2, P .882, R .882, exact-board 2/5, expiries 0. Session 1: motorcycle board failed TP0 / FP0 / FN1 (sliver, empty_submission procedure error), then a car board passed perfect (TP4) with token. Session 2: car board failed TP2 / FN1 (partial), car board failed TP7 / FP2 / FN0, then a car board passed (TP2; 1 ambiguity-band tile excluded from scoring by the server) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bridge board pass; dynamic replacements re-scanned until no tile matched, then Verify).
- Running per-brief photo totals: v2 = 783 attempts — TP3062 / FP366 / FN601, P .893, R .836, exact-board 344/783, expiries 52 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 805 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 783 = 801) — the pre-existing gap noted at Runs #97-#174, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://27e1541329ff4b.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: mixed small errors — sliver/partial under-selection accounted for both photo FNs (sliver via an empty submission on the motorcycle board, partial on a car board), plus FP2 on a single car board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .949 below the .95 bar, R .885 well below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo expiry rate overall 52/835 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~05:34 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #176 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #175's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T12:46:13Z-12:55:30Z, source live-agent, 4 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 3 scored attempts — TP11 / FP0 / FN1, P 1.000, R .917, exact-board 2/3, expiries 1. Session 1 (2 scored attempts + 1 expired, token): motorcycle board failed TP0 / FP0 / FN1 (sliver, empty_submission — agent reported no motorcycle visible, only bicycles/people), car round expired unscored (challenge_expired), then a car board passed perfect (TP5; 1 ambiguity error recorded by the server, excluded from scoring). Session 2 (1 attempt, token): fire_hydrant board passed perfect (TP6).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (mountain board pass with token).
- Running per-brief photo totals: v2 = 786 attempts — TP3073 / FP366 / FN602, P .894, R .836, exact-board 346/786, expiries 53. Server cross-check: all-era scored photo attempts = 808 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 786 = 804) — the pre-existing gap noted at Runs #97-#175, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://27e1541329ff4b.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task. The playing agent noted click drift from accessibility references and delayed Verify feedback in Session 1, which contributed to that session's car-round expiry — a browser-play artifact, not a gym/tunnel failure.
- Dominant failure mode: sliver under-selection on a photo motorcycle board (the run's only scored FN, via an empty submission), plus 1 photo round expiry (car, unsubmitted, unscored) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .950 clears the .95 bar, R .930 below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 53/839 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~05:56 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #177 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #176's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T13:08:03Z-13:13:24Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP15 / FP1 / FN0, P .938, R 1.000, exact-board 2/3, expiries 0. Session 1: bicycle board failed TP4 / FP1 / FN0, then a car board passed perfect (TP7) with token. Session 2: fire_hydrant board passed perfect (TP4) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 789 attempts — TP3088 / FP367 / FN602, P .894, R .837, exact-board 348/789, expiries 53. Server cross-check: all-era scored photo attempts = 811 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 789 = 807) — the pre-existing gap noted at Runs #97-#176, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200, local 200 too — note the tunnel subdomain changed since Run #176, re-read fresh per protocol). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: a single false pick on the photo bicycle board (FP1 in one attempt) — zero FNs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .941 below the .95 bar, R .941 below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 53/842 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~06:13 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #178 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #177's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T13:29:38Z-13:43:21Z, source live-agent, 10 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP21 / FP1 / FN9, P .955, R .700, exact-board 2/7, expiries 0. Session 1: bus board passed perfect (TP8) with token. Session 2 (6 attempts, token): motorcycle board failed TP4 / FN2 (sliver + partial), car board failed TP0 / FN4 (partial x4, empty_submission procedure error), fire_hydrant board failed TP2 / FN1 (sliver), car board failed TP3 / FP1 / FN0, bicycle board failed TP0 / FN2 (partial + sliver, empty_submission procedure error), then a car board passed perfect (TP4) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 3 attempts — TP7 / FP1 / FN1, P .875, R .875, exact-board 1/3, expiries 0. Crosswalk board failed TP0 / FN1 (partial), mountain board failed TP4 / FP1 / FN0 (dynamic replacements re-scanned), then a bridge board passed perfect (TP3) with token.
- Running per-brief photo totals: v2 = 796 attempts — TP3109 / FP368 / FN611, P .894, R .836, exact-board 350/796, expiries 53. Server cross-check: all-era scored photo attempts = 818 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 796 = 814) — the pre-existing gap noted at Runs #97-#177, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: under-selection on photo boards — all 9 photo FNs were sliver/partial misses, including 2 empty_submission procedure errors (car board FN4 and bicycle board FN2 in session 2).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .942 below the .95 bar, R .890 below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 53/849 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~06:43 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).
### Run #179 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #178's force_dynamic).
Sessions: 4 played, 3 tokens, 1 lost to infrastructure. The original first photo session was lost to a tunnel/gym death mid-round and was replaced per protocol after revival; the 3 replacement sessions all tokened.
Window arbitrated: 2026-10-13T13:47:38Z-14:13:38Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts in the server record.
- Photo (designated sessions): 6 attempts — TP16 / FP2 / FN2, P .889, R .889, exact-board 2/6, expiries 0. Original session (lost, no token): fire_hydrant board failed TP1 / FN1 (sliver), then a bicycle round was interrupted by the tunnel death (no server-scored expiry recorded). Replacement Session 1: car board failed TP1 / FN1 (partial), car board failed TP1 / FP1 / FN0, then a bus board passed perfect (TP6) with token. Replacement Session 2: car board failed TP4 / FP1 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), then a traffic_light board passed perfect (TP3) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP7 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (crosswalk board pass; dynamic replacements re-scanned until no tile matched, then Verify).
- Running per-brief photo totals: v2 = 802 attempts — TP3125 / FP370 / FN613, P .894, R .836, exact-board 352/802, expiries 53 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 824 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 802 = 820) — the pre-existing gap noted at Runs #97-#178, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were active, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200, local 200 too. Mid-run the tunnel/gym died (both units inactive, tunnel and local both unreachable, "no tunnel" page) during the original Session 1's bicycle round; that session is UNSCORED beyond its 1 banked scored attempt and was replaced. Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, same tunnel URL https://c5fe5c11043aa0.lhr.life verified HTTP 200 (local 200 too) before replacement play. The known CAPTCHA-preference glitch fired on the replacement task; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then played clean. The original task played clean with no pause.
- Dominant failure mode: mixed small errors on photo boards — sliver/partial under-selection accounted for both photo FNs (sliver on the fire_hydrant board, partial on a car board), plus 1 false pick on each of two car boards (FP2 total); zero FNs/FPs in rotating play.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .927 below the .95 bar, R .878 below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 53/855 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~07:13 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).


### Run #180 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #179's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T14:22:14Z-14:26:40Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: bus board passed perfect (TP2) with token. Session 2: bus board passed perfect (TP1) with token.
- Photo (rotating session also served 1 photo round; counted here — same brief, corpus-split): bus board passed perfect (TP8) with token.
- Photo run total: 3 attempts — TP11 / FP0 / FN0, P 1.000, R 1.000, exact-board 3/3, expiries 0.
- Synthetic: no scored synthetic attempts this run (the rotating force_type_b session served a photo board, counted above).
- Running per-brief photo totals: v2 = 805 attempts — TP3136 / FP370 / FN613, P .894, R .836, exact-board 355/805, expiries 53 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 827 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 805 = 823) — the pre-existing gap noted at Runs #97-#179, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired at the start of the single sequential browser task; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; all 3 photo boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .936 below the .95 bar, R .879 below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo expiry rate overall 53/858 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~07:27 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #181 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #180's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T14:33:04Z-14:38:24Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP11 / FP1 / FN0, P .917, R 1.000, exact-board 2/3, expiries 0. Session 1: car board failed TP1 / FP1 / FN0, then a bus board passed perfect (TP8) with token. Session 2: traffic-light board passed perfect (TP2) with token.
- Rotating (natural, synthetic Type B): 1 attempt — TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (taxi board pass with token; 2 ambiguity-band tiles excluded from scoring by the server).
- Photo run total: 3 attempts — TP11 / FP1 / FN0, P .917, R 1.000, exact-board 2/3, expiries 0.
- Running per-brief photo totals: v2 = 808 attempts — TP3147 / FP371 / FN613, P .895, R .837, exact-board 357/808, expiries 53 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 830 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 808 = 826) — the pre-existing gap noted at Runs #97-#180, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported in this run; all 3 sessions played clean in the single sequential browser task.
- Dominant failure mode: a single false pick on the photo car board (FP1 in one attempt) — zero FNs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .935 below the .95 bar, R .877 below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo expiry rate overall 53/861 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~07:38 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #182 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #181's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T14:47:07Z-14:57:41Z, source live-agent, 4 scored attempts total, plus 1 unscored expired attempt.
- Photo (designated sessions): 2 attempts — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: bus board passed perfect (TP1) with token. Session 2: traffic-light board passed perfect (TP2) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 2 scored attempts — TP2 / FP1 / FN0, P .667, R 1.000, exact-board 1/2, expiries 1. Bicycle board failed TP2 / FP1 / FN0, a chimney round expired unscored (challenge_expired), then a tractor board with no matching tile passed perfect (TP0) with token.
- Photo run total: 2 attempts — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0.
- Running per-brief photo totals: v2 = 810 attempts — TP3150 / FP371 / FN613, P .895, R .837, exact-board 359/810, expiries 53 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 832 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 810 = 828) — the pre-existing gap noted at Runs #97-#181, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported in this run; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in the single sequential browser task.
- Dominant failure mode: a single false pick on the synthetic bicycle board (FP1 in one attempt) plus 1 dynamic-round expiry (chimney, unscored) — photo boards were clean, with zero FPs and zero FNs.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .934 below the .95 bar, R .884 below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 53/863 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~07:58 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #183 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #182's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T15:10:11Z-15:22:16Z, source live-agent, 4 scored attempts total, plus 1 unscored expired attempt.
- Photo (designated sessions): 3 attempts — TP24 / FP3 / FN0, P .889, R 1.000, exact-board 2/3, expiries 0. Session 1: bicycle board passed perfect (TP4; 1 ambiguity error recorded by the server, excluded from scoring) with token. Session 2: car board failed TP4 / FP3 / FN0, then a motorcycle board passed perfect (TP16) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 scored attempt — TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 1. A motorcycle round expired unscored (challenge_expired), then a palm-tree board passed perfect (TP2) with token.
- Running per-brief photo totals: v2 = 813 attempts — TP3174 / FP374 / FN613, P .895, R .838, exact-board 361/813, expiries 53 (all from earlier v2 eras; 0 photo expiries this run). Server cross-check: all-era scored photo attempts = 835 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 813 = 831) — the pre-existing gap noted at Runs #97-#182, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on a single photo car board (FP3 in one attempt) — zero FNs across all corpora; the only other loss was the synthetic dynamic motorcycle round expiry (unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .933 below the .95 bar, R .903 below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 53/866 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~08:23 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #184 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #183's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T15:29:55Z-15:33:14Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP7 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: bus board passed perfect (TP4; 1 ambiguity error recorded by the server, excluded from scoring) with token. Session 2: motorcycle board passed perfect (TP3) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (fire_hydrant board pass with token).
- Photo run total: 2 attempts — TP7 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0.
- Running per-brief photo totals: v2 = 815 attempts — TP3181 / FP374 / FN613, P .895, R .838, exact-board 363/815, expiries 53 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 837 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 815 = 833) — the pre-existing gap noted at Runs #97-#183, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were INACTIVE (tunnel 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://c5fe5c11043aa0.lhr.life) verified HTTP 200 (local 200 too) before any play. No CAPTCHA-preference pause was reported in this run; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .934 below the .95 bar, R .912 below the .95 bar, exact-board 18/30 = 60.0% below the 90% bar; v2 photo expiry rate overall 53/868 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~08:33 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #185 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #184's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T15:49:20Z-15:53:02Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP20 / FP0 / FN4, P 1.000, R .833, exact-board 2/4, expiries 0. Session 1: bicycle board passed perfect (TP2) with token. Session 2: car board failed TP6 / FP0 / FN2 (sliver x2; 1 ambiguity error recorded by the server, excluded from scoring), bus board failed TP8 / FP0 / FN2 (partial x2), then a traffic_light board passed perfect (TP4) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Photo run total: 4 attempts — TP20 / FP0 / FN4, P 1.000, R .833, exact-board 2/4, expiries 0.
- Running per-brief photo totals: v2 = 819 attempts — TP3201 / FP374 / FN617, P .895, R .838, exact-board 365/819, expiries 53 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 841 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 819 = 837) — the pre-existing gap noted at Runs #97-#184, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 4 photo FNs were sliver/partial band (sliver x2, partial x2); zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .942 below the .95 bar, R .883 below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 53/872 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~08:54 PDT on 2026-10-13; the AM summary is not due until the first completed run after 09:00 PDT and the PM summary for 2026-10-12 was already delivered with Run #149 — marker `Summary delivered: 2026-10-12 PM`). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #186 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #185's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T16:10:03Z-16:27:08Z, source live-agent, 10 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 9 attempts — TP37 / FP6 / FN6, P .860, R .860, exact-board 2/9, expiries 1. Session 1: traffic-light board failed TP3 / FP1 / FN0, then a fire-hydrant board passed perfect (TP2) with token. Session 2: car board failed TP4 / FP1 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), car board failed TP1 / FP4 / FN0, bus board failed TP8 / FP0 / FN2 (partial x2), a traffic-light round expired unscored (challenge_expired), fire-hydrant board failed TP2 / FP0 / FN1 (sliver; 1 ambiguity error, excluded from scoring), bus board failed TP7 / FP0 / FN2 (partial x2; 2 ambiguity errors, excluded from scoring), motorcycle board failed TP9 / FP0 / FN1 (partial), then a bus board passed perfect (TP1) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (palm-tree board pass with token; dynamic replacements re-scanned until no tile matched, then Verify).
- Photo run total: 9 attempts — TP37 / FP6 / FN6, P .860, R .860, exact-board 2/9, expiries 1.
- Running per-brief photo totals: v2 = 828 attempts — TP3238 / FP380 / FN623, P .895, R .839, exact-board 367/828, expiries 54. Server cross-check: all-era scored photo attempts = 850 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 828 = 846) — the pre-existing gap noted at Runs #97-#185, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: mixed — false picks on photo car/traffic-light boards (FP6, including FP4 on a single car board) plus partial/sliver under-selection on photo bus/fire-hydrant/motorcycle boards (FN6: partial x5, sliver x1), and 1 photo expiry (traffic-light round, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .914 below the .95 bar, R .927 below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 54/882 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired. The twice-daily AM summary IS due with this run (it completed at ~09:27 PDT on 2026-10-13, the first completed run after 09:00 PDT; no AM marker existed) and is delivered in the run's chat report in English only: Runs #150-#186 completed since the 2026-10-12 PM summary (37 runs), 112 sessions played, 105 tokens, 172 scored photo attempts banked under v2 (656 -> 828), cumulative v2 photo line P .895 / R .839 / exact-board 367/828, rolling-30 P .914 / R .927 / exact 17/30, expiry rate 6.1% overall, parity NOT reached (exact-board is the largest gap, then precision and recall), dominant failure mode over the period remains sliver/partial under-selection on photo boards with episodic false-pick blowups on car boards, notable incidents include Run #184's pre-flight gym/tunnel revival, Run #179's replaced session after a tunnel/gym death, terminal-cooldown sessions in Runs #163, #165, #166 and #171, and this run's 1 photo expiry. Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).
Summary delivered: 2026-10-13 AM

### Run #187 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #186's force_dynamic).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T16:31:12Z-16:38:02Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP19 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: motorcycle board passed perfect (TP16) with token. Session 2: bicycle board passed perfect (TP3) with token.
- Photo (rotating session also served 1 photo round; counted here — same brief, corpus-split): traffic-light board passed perfect (TP2) with token. The force_low_trust session was served a Type B photo board, so this run has no scored synthetic attempts.
- Photo run total: 3 attempts — TP21 / FP0 / FN0, P 1.000, R 1.000, exact-board 3/3, expiries 0.
- Running per-brief photo totals: v2 = 831 attempts — TP3259 / FP380 / FN623, P .896, R .840, exact-board 370/831, expiries 54 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 853 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 831 = 849) — the pre-existing gap noted at Runs #97-#186, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all 3 photo boards, all exact; no failure mode to name.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .932 below the .95 bar, R .932 below the .95 bar, exact-board 19/30 = 63.3% below the 90% bar; v2 photo expiry rate overall 54/885 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~09:38 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #188 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #187's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T16:49:21Z-16:54:58Z, source live-agent, 6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP24 / FP0 / FN6, P 1.000, R .800, exact-board 2/4, expiries 0. Session 1: motorcycle board failed TP4 / FP0 / FN3 (partial, sliver, sliver; 1 ambiguity error recorded by the server, excluded from scoring), fire-hydrant board failed TP5 / FP0 / FN3 (partial x2, sliver), then a car board passed perfect (TP11) with token. Session 2: traffic-light board passed perfect (TP4) with token.
- Rotating (force_type_b): 2 attempts, corpus-split — photo traffic-light board failed TP2 / FP1 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), then a synthetic taxi board passed perfect (TP6) with token.
- Photo run total: 5 attempts — TP26 / FP1 / FN6, P .963, R .813, exact-board 2/5, expiries 0.
- Synthetic run total: 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0.
- Running per-brief photo totals: v2 = 836 attempts — TP3285 / FP381 / FN629, P .896, R .839, exact-board 372/836, expiries 54 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 858 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 836 = 854) — the pre-existing gap noted at Runs #97-#187, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported in this run; the parent verified the stored preference (solve/all_tasks) proactively at spawn and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 6 photo FNs were sliver/partial band (sliver x3, partial x3, on the motorcycle and fire-hydrant boards of session 1); the run's only FP was on the rotating photo traffic-light board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .937 below the .95 bar, R .902 below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 54/890 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~09:55 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #189 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #188's force_type_b).
Sessions: 4 played (1 partial session lost to a mid-run tunnel/gym death and replaced with 3 fresh sessions per protocol), 3 tokens, 1 lost to infrastructure.
Window arbitrated: 2026-10-13T17:12:08Z-17:37:15Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts.
- Photo (pre-death partial session, force_type_b_photo): 1 scored attempt reached the server before the tunnel died — car board failed TP7 / FP0 / FN1 (partial). Its subsequent bicycle board never recorded a scored attempt before the site went unreachable; the session was lost unscored beyond that attempt and replaced.
- Photo (fresh designated sessions): 6 attempts — TP25 / FP5 / FN5, P .833, R .833, exact-board 2/6, expiries 0. Fresh session 1: car board passed perfect (TP1) with token. Fresh session 2 (5 attempts, token): motorcycle failed TP12 / FN1 (partial), car failed TP0 / FN2 (partial x2, empty_submission procedure error), car failed TP4 / FP1 / FN0, bicycle failed TP0 / FP4 / FN2 (partial, sliver), then a fire-hydrant board passed perfect (TP8) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Photo run total: 7 attempts — TP32 / FP5 / FN6, P .865, R .842, exact-board 2/7, expiries 0.
- Running per-brief photo totals: v2 = 843 attempts — TP3317 / FP386 / FN635, P .896, R .839, exact-board 374/843, expiries 54 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 865 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 843 = 861) — the pre-existing gap noted at Runs #97-#188, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: pre-flight was clean (both systemd units active, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200, local 200 too). Mid-run, after the partial session's first scored attempt, the gym and tunnel both died ("no tunnel" page; on parent check both units were inactive/missing). Revived per protocol: tools/install_services.sh reinstalled/enabled both units, services were started, and the same tunnel URL https://c5fe5c11043aa0.lhr.life verified HTTP 200 (local 200 too) before the original browser task was steered to play 3 fresh sessions, which all tokened. No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn.
- Dominant failure mode: mixed — a false-pick blowup on one photo bicycle board (FP4 of the run's 5 FPs in a single attempt) plus partial/sliver under-selection (all 6 photo FNs: partial x5, sliver x1), including one empty_submission car board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .923 below the .95 bar, R .867 well below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 54/897 = 6.0%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~10:38 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #190 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #189's natural).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T17:46:12Z-17:53:20Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP8 / FP0 / FN1, P 1.000, R .889, exact-board 2/3, expiries 0. Session 1: traffic-light board passed perfect (TP2). Session 2: bicycle board failed TP4 / FN1 (partial), then a fire-hydrant board passed perfect (TP2).
- Rotating (force_dynamic, synthetic Type A dynamic): 2 attempts — TP4 / FP0 / FN1, P 1.000, R .800, exact-board 1/2, expiries 0 (crosswalk board failed TP1 / FN1 — late_replacement_missed per server, then a crosswalk board passed perfect TP3; dynamic replacement technique applied on the passing round).
- Running per-brief photo totals: v2 = 846 attempts — TP3325 / FP386 / FN636, P .896, R .839, exact-board 376/846, expiries 54 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 868 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 846 = 864) — the pre-existing gap noted at Runs #97-#189, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://c5fe5c11043aa0.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn.
- Dominant failure mode: partial under-selection — the run's only photo FN was a partial-tile miss on the bicycle board, and the run's only synthetic FN was a late replacement missed on the first dynamic crosswalk board; zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .922 below the .95 bar, R .861 well below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 54/900 = 6.0%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~10:54 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #192 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after the intervening run's force_low_trust; see reconciliation note below).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T19:01:55Z-19:18:58Z, source live-agent, 9 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 7 attempts — TP18 / FP9 / FN4, P .667, R .818, exact-board 2/7, expiries 1. Session 1: fire-hydrant round expired unscored (challenge_expired), bicycle board failed TP2 / FP4 / FN2 (partial x2), car board failed TP1 / FP3 / FN0, then a fire-hydrant board passed perfect (TP2) with token. Session 2: car board failed TP8 / FN2 (sliver, partial), traffic-light board failed TP2 / FP1, car board failed TP1 / FP1, then a car board passed perfect (TP2) with token.
- Rotating (force_type_b): 2 attempts, corpus-split — photo bicycle board failed TP3 / FP1 / FN0, then a synthetic mountain board passed perfect (TP6) with token.
- Photo run total: 8 attempts — TP21 / FP10 / FN4, P .677, R .840, exact-board 2/8, expiries 1.
- Synthetic run total: 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0.
- Running per-brief photo totals: v2 = 864 attempts — TP3364 / FP402 / FN652, P .893, R .838, exact-board 380/864, expiries 57. Server cross-check: all-era scored photo attempts = 886 (compare report, bug-era excluded), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 864 = 882) — the pre-existing gap noted at Runs #97-#190, unchanged by this run; rolling-30 below is server-based.
- RECONCILIATION NOTE — unlogged intervening run (presumed Run #191): server records show sessions at 2026-10-13T17:58:03Z-~19:01Z (after Run #190, before this run) that were NOT in TRAINING_LOG at this run's pre-flight or at logging time: 10 scored photo attempts — TP18 / FP6 / FN12, P .750, R .600, exact-board 2/10, plus 2 unscored challenge_expired photo rounds, and a rotating force_low_trust session with 1 scored synthetic attempt (motorcycle TP2 / FP0 / FN1, sliver) plus 1 unscored expired synthetic round and no token/pass event recorded after its 18:55Z cooldown ended. Photo sessions: ses_5170 car pass (TP1, token), ses_99fc bicycle fail TP0 / FN2 (partial, sliver; no token, no pass event), ses_d51c (8 scored attempts, token on a final perfect car board). This run is numbered #192 chronologically. If that run is logged later, do NOT re-add its attempts to the totals: the running totals above already include them.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://2dfad03be3676f.lhr.life verified HTTP 200, local 200 too — note the tunnel subdomain changed since Run #190, re-read fresh per protocol). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on photo boards — 10 FPs this run (FP4 + FP3 on session 1's bicycle and car boards, FP1-2 on three other boards), outweighing the 4 partial/sliver FNs; this run and the intervening run together produced the weakest rolling window in recent runs.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .794 below the .95 bar, R .787 well below the .95 bar, exact-board 9/30 = 30.0% below the 90% bar; v2 photo expiry rate overall 57/921 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~12:19 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #193 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #192's force_type_b).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T19:25:38Z-19:36:16Z, source live-agent, 6 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 6 attempts — TP23 / FP4 / FN5, P .852, R .821, exact-board 2/6, expiries 1. Session 1 (4 scored attempts + 1 expiry, token): bicycle board failed TP2 / FP3 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), traffic-light board failed TP3 / FP1 / FN1 (partial; 1 ambiguity error, excluded from scoring), traffic-light board failed TP0 / FP0 / FN2 (partial x2, empty_submission procedure error), car round expired unscored (challenge_expired), then a bus board passed perfect (TP4) with token. Session 2 (2 attempts, token): bus board failed TP10 / FP0 / FN2 (sliver, partial), then a car board passed perfect (TP4) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Photo run total: 6 attempts — TP23 / FP4 / FN5, P .852, R .821, exact-board 2/6, expiries 1.
- Running per-brief photo totals: v2 = 870 attempts — TP3387 / FP406 / FN657, P .893, R .838, exact-board 382/870, expiries 58. Server cross-check: all-era scored photo attempts = 892 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 870 = 888) — the pre-existing gap noted at Runs #97-#192, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://2dfad03be3676f.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference solve/all_tasks verified via get_captcha_preference before play; no CAPTCHA pause reported; all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial/sliver under-selection on photo boards — 5 photo FNs (partial x4, sliver x1, including one empty_submission traffic-light board), with false picks secondary (FP4: FP3 on the bicycle board, FP1 on a traffic-light board) and 1 photo expiry (car round, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .766 below the .95 bar, R .774 well below the .95 bar, exact-board 9/30 = 30.0% below the 90% bar; v2 photo expiry rate overall 58/928 = 6.25% within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~12:37 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #194 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #193's natural). Sessions: 4 played (2 original photo + 1 replacement photo + 1 replacement dynamic), 3 tokens, 1 session lost to infrastructure (original force_dynamic never reached the server) and 1 photo session replaced after it never tokened.
Window arbitrated: 2026-10-13T19:41:11Z-20:07:50Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP19 / FP1 / FN1, P .950, R .950, exact-board 1/3, expiries 0. Session 1: car board passed perfect (TP11) with token. Session 2 (no token, no terminal server event): traffic-light board failed TP2 / FP1 / FN0 (2 ambiguity errors recorded by the server, excluded from scoring), motorcycle board failed TP6 / FP0 / FN1 (sliver); its third (car) board then never changed across repeated verifies and produced NO server record — the session was abandoned as the tunnel was dying and replaced per protocol.
- Photo (replacement session; counted here — same brief): car board passed perfect (TP1) with token.
- Photo run total: 4 attempts — TP20 / FP1 / FN1, P .952, R .952, exact-board 2/4, expiries 0.
- Rotating (force_dynamic, synthetic Type A dynamic; original session lost to the tunnel death, replaced after revival): 1 attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (taxi board; 2 initial taxis plus 1 replacement taxi correctly picked after fade/re-scan, then Verify).
- Running per-brief photo totals: v2 = 874 attempts — TP3407 / FP407 / FN658, P .893, R .838, exact-board 384/874, expiries 58 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 896 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 874 = 892) — the pre-existing gap noted at Runs #97-#193, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: mid-run the gym died — after Session 2 the tunnel returned "no tunnel" on every attempt and both systemd units were found INACTIVE (tunnel 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://2dfad03be3676f.lhr.life — same subdomain reissued) verified HTTP 200 (local 200 too), and the two lost/incomplete sessions were replaced in the same browser task. Two spurious handoff notices from other tasks arrived during play and were disregarded; all numbers above are arbitrated from the server log only. CAPTCHA preference: the runtime initially read it as unavailable/ask in the browser task, but the parent had verified solve/all_tasks via get_captcha_preference before play and the task played without pausing.
- Dominant failure mode: mixed single errors on photo boards — 1 false pick on the traffic-light board and 1 sliver miss on the motorcycle board (the run's only FP and only FN); the larger loss was infrastructural (tunnel death, 1 session lost, 1 session replaced).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .807 below the .95 bar, R .793 well below the .95 bar, exact-board 9/30 = 30.0% below the 90% bar; v2 photo expiry rate overall 58/932 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~13:08 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #195 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #194's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T20:14:53Z–20:24:08Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP30 / FP4 / FN7, P .882, R .811, exact-board 2/6, expiries 0. Session 1: car board passed perfect (TP1) with token. Session 2 (5 attempts, token): motorcycle board failed TP12 / FP0 / FN2 (partial x2), motorcycle board failed TP2 / FP0 / FN2 (sliver + partial), car board failed TP1 / FP3 / FN0, motorcycle board failed TP11 / FP1 / FN3 (partial x3), then a car board passed perfect (TP3; 1 ambiguity error recorded by the server, excluded from scoring) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (mountain board; single matching tile clicked, replacement re-scanned clean, then Verify, with token).
- Running per-brief photo totals: v2 = 880 attempts — TP3437 / FP411 / FN665, P .893, R .838, exact-board 386/880, expiries 58 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 902 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 880 = 898) — the pre-existing gap noted at Runs #97–#194, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://2dfad03be3676f.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial/sliver under-selection on photo motorcycle boards — all 7 photo FNs (partial x6, sliver x1) came from session 2's three motorcycle boards; false picks were secondary (FP4: FP3 on one car board, FP1 on one motorcycle board).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .808 below the .95 bar, R .814 well below the .95 bar, exact-board 9/30 = 30.0% below the 90% bar; v2 photo expiry rate overall 58/938 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~13:24 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #196 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #195's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T20:30:59Z-20:35:29Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: traffic-light board passed perfect (TP3) with token. Session 2: car board passed perfect (TP2) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (motorcycle board pass with token).
- Running per-brief photo totals: v2 = 882 attempts — TP3442 / FP411 / FN665, P .893, R .838, exact-board 388/882, expiries 58 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 904 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 882 = 900) — the pre-existing gap noted at Runs #97-#195, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://2dfad03be3676f.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .840 below the .95 bar, R .833 well below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo expiry rate overall 58/940 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~13:35 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #197 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #196's force_type_b). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T20:47:01Z–21:24:11Z, source live-agent, 8 scored attempts total, plus 3 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP13 / FP4 / FN6, P .765, R .684, exact-board 2/7, expiries 3. Session 1: motorcycle board expired unscored (challenge_expired), then a bicycle board passed perfect (TP4) with token. Session 2 (6 scored + 2 expired, token): traffic-light board expired unscored, car board expired unscored, bus board failed TP3 / FP1 / FN3 (partial x3), traffic-light board failed TP1 / FP1 / FN0, fire-hydrant board failed TP2 / FP0 / FN1 (sliver), car board failed TP1 / FP1 / FN1 (sliver), fire-hydrant board failed TP1 / FP1 / FN1 (sliver), then a car board passed perfect (TP1) with token.
- Rotating (natural, synthetic Type B): 1 attempt — TP7 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (fire-hydrant board pass with token).
- Running per-brief photo totals: v2 = 889 attempts — TP3455 / FP415 / FN671, P .893, R .837, exact-board 390/889, expiries 61 (3 this run). Server cross-check: all-era scored photo attempts = 911 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 889 = 907) — the pre-existing gap noted at Runs #97–#196, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://2dfad03be3676f.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards in session 2 — all 6 photo FNs were partial x3 (bus board) and sliver x3 (fire-hydrant/car boards), with FP4 secondary; plus 3 photo-round expiries, all in the designated photo sessions.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .870 below the .95 bar, R .836 below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo expiry rate overall 61/950 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~14:24 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #198 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #197's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T21:34:18Z-21:41:16Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP10 / FP0 / FN2, P 1.000, R .833, exact-board 2/4, expiries 0. Session 1: car board failed TP5 / FP0 / FN1 (partial), car board failed TP2 / FP0 / FN1 (partial), then a bicycle board passed perfect (TP1) with token. Session 2: car board passed perfect (TP2) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP8 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (fire-hydrant board pass with token; dynamic replacements re-scanned in multiple waves until no tile matched, then Verify).
- Photo run total: 4 attempts — TP10 / FP0 / FN2, P 1.000, R .833, exact-board 2/4, expiries 0.
- Running per-brief photo totals: v2 = 893 attempts — TP3465 / FP415 / FN673, P .893, R .837, exact-board 392/893, expiries 61 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 915 (compare count from attempts.jsonl), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 893 = 911) — the pre-existing gap noted at Runs #97-#197, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://2dfad03be3676f.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial under-selection on photo car boards — both photo FNs were partial band, one on each of session 1's two failed car boards; zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .881 below the .95 bar, R .832 well below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 61/954 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~14:41 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #199 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #198's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T21:57:01Z–22:07:34Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP23 / FP2 / FN5, P .920, R .821, exact-board 2/6, expiries 0. Session 1: traffic_light board failed TP1 / FP0 / FN1 (sliver), bus board failed TP5 / FP0 / FN1 (partial), then a fire_hydrant board passed perfect (TP2; 2 ambiguity errors recorded by the server, excluded from scoring) with token. Session 2: motorcycle board failed TP4 / FP0 / FN2 (sliver + partial), bus board failed TP8 / FP2 / FN1 (partial), then a car board passed perfect (TP3) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (fire_hydrant board; initial matches clicked, replacements re-scanned clean, then Verify, with token).
- Photo run total: 6 attempts — TP23 / FP2 / FN5, P .920, R .821, exact-board 2/6, expiries 0.
- Running per-brief photo totals: v2 = 899 attempts — TP3488 / FP417 / FN678, P .893, R .837, exact-board 394/899, expiries 61 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 921 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 899 = 917) — the pre-existing gap noted at Runs #97–#198, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were INACTIVE (tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://2dfad03be3676f.lhr.life) verified HTTP 200 (local 200 too) before any play. The known CAPTCHA-preference glitch fired on the first browser task; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then played clean. All 3 sessions played in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 5 photo FNs were sliver/partial band (sliver x2, partial x3); false picks were secondary (FP2 on session 2's bus board).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .905 below the .95 bar, R .833 well below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 61/960 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~15:07 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #200 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #199's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T22:14:14Z–22:25:01Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP20 / FP2 / FN9, P .909, R .690, exact-board 2/7, expiries 0. Session 1: car board passed perfect (TP1; 1 ambiguity error recorded by the server, excluded from scoring) with token. Session 2 (6 attempts, token): fire_hydrant board failed TP3 / FN1 (sliver), fire_hydrant board failed TP5 / FN3 (partial x2, sliver), car board failed TP6 / FN1 (sliver; 1 ambiguity error, excluded from scoring), bicycle board failed TP1 / FP1 / FN0, car board failed TP3 / FP1 / FN4 (partial, whole x3), then a car board passed perfect (TP1; 1 ambiguity error, excluded from scoring) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (palm_tree board pass with token).
- Photo run total: 7 attempts — TP20 / FP2 / FN9, P .909, R .690, exact-board 2/7, expiries 0.
- Running per-brief photo totals: v2 = 906 attempts — TP3508 / FP419 / FN687, P .893, R .836, exact-board 396/906, expiries 61 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 928 (compare count from attempts.jsonl), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 906 = 924) — the pre-existing gap noted at Runs #97–#199, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://2dfad03be3676f.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards in session 2 — 6 of the 9 photo FNs were sliver/partial band (sliver x3, partial x3), plus 3 whole-instance misses on one car board (FN4 attempt: partial + whole x3); false picks were secondary (FP2, one each on the bicycle and car boards).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .880 below the .95 bar, R .765 well below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo expiry rate overall 61/967 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~15:26 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #201 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #200's force_type_b). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T22:30:12Z–22:39:02Z, source live-agent, 2 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 2 attempts — TP8 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 1. Session 1: bicycle round expired unscored (challenge_expired), then a car board passed perfect (TP2) with token. Session 2: fire_hydrant board passed perfect (TP6) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Photo run total: 2 attempts — TP8 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 1.
- Running per-brief photo totals: v2 = 908 attempts — TP3516 / FP419 / FN687, P .894, R .837, exact-board 398/908, expiries 62. Server cross-check: all-era scored photo attempts = 930 (server arbitration from attempts.jsonl), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 908 = 926) — the pre-existing gap noted at Runs #97–#200, unchanged by this run; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://2dfad03be3676f.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired on the first browser task; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then played clean. All 3 sessions played in a single sequential browser task.
- Dominant failure mode: none in scored play this run — zero FPs and zero FNs across all corpora; the only loss was the 180 s expiry of the photo bicycle round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .912 below the .95 bar, R .788 well below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 62/970 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~15:39 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #202 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #201's natural). Sessions: 4 played (3 original + 1 replacement dynamic), 3 tokens, 1 session lost to infrastructure (original force_dynamic never reached a Verify — tunnel died mid-round, unscored, replaced per protocol at the new URL).
Window arbitrated: 2026-10-13T22:50:58Z–23:09:09Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP21 / FP4 / FN8, P .840, R .724, exact-board 2/7, expiries 0. Session 1 (2 attempts, token): car board failed TP0 / FP1 / FN2 (sliver x2), then a fire_hydrant board passed perfect (TP2; 2 ambiguity errors recorded by the server, excluded from scoring) with token. Session 2 (5 attempts, token): car board failed TP5 / FP0 / FN3 (sliver x2, partial), car board failed TP7 / FP2 / FN1 (sliver), fire_hydrant board failed TP2 / FP1 / FN1 (sliver; 1 ambiguity error, excluded), motorcycle board failed TP3 / FP0 / FN1 (sliver), then a car board passed perfect (TP2) with token.
- Rotating (force_dynamic, synthetic Type A dynamic; original session lost to the tunnel death, replaced after revival): 1 attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (mountain board pass with token; dynamic replacements re-scanned until no tile matched, then Verify).
- Photo run total: 7 attempts — TP21 / FP4 / FN8, P .840, R .724, exact-board 2/7, expiries 0.
- Running per-brief photo totals: v2 = 915 attempts — TP3537 / FP423 / FN695, P .893, R .836, exact-board 400/915, expiries 62 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 939 (server arbitration from attempts.jsonl), 6 more than the era-split log sum (v1 8 + v2.1 10 + v2 915 = 933) — the pre-existing unlogged-era gap noted since Run #97, widened by 2 in the server count at this run's arbitration; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were active, tunnel URL from LIVE_URL.txt https://2dfad03be3676f.lhr.life verified HTTP 200 (local 200 too). Mid-run the tunnel died during the original force_dynamic session (crosswalk round, "no tunnel" page on reload and on re-navigation — session unscored, 0 Verify submitted); supervision restarted the tunnel at a NEW URL (https://511dc98ce476b1.lhr.life, verified HTTP 200, local 200 too) and the dynamic session was replaced there and passed. The known CAPTCHA-preference glitch fired on the first browser task; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then played clean. The replacement task played clean with no pause (preference verified proactively for the new URL).
- Dominant failure mode: sliver under-selection on photo boards — all 8 photo FNs were sliver x7 + partial x1, concentrated in session 2 (FN6 across its four failed boards); false picks were secondary (FP4).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .897 below the .95 bar, R .763 well below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo expiry rate overall 62/977 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~16:09 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #203 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #202's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T23:17:17Z–23:28:36Z, source live-agent, 4 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 3 attempts — TP11 / FP2 / FN0, P .846, R 1.000, exact-board 2/3, expiries 1. Session 1: car round expired unscored (challenge_expired), car board failed TP1 / FP2 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), then a fire_hydrant board passed perfect (TP4) with token. Session 2: motorcycle board passed perfect (TP6) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (mountain board pass with token; dynamic replacements re-scanned until no tile matched, then Verify).
- Photo run total: 3 attempts — TP11 / FP2 / FN0, P .846, R 1.000, exact-board 2/3, expiries 1.
- Running per-brief photo totals: v2 = 918 attempts — TP3548 / FP425 / FN695, P .893, R .836, exact-board 402/918, expiries 63. Server cross-check: all-era scored photo attempts = 940 (compare report from attempts.jsonl), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 918 = 936) — the pre-existing gap noted at Runs #97–#201, back to 4 at this run's arbitration (Run #202 reported 939 / gap 6); rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://511dc98ce476b1.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on the photo car board (FP2, the run's only tile errors) plus the 180 s expiry of session 1's first car round (unsubmitted, unscored) — zero FNs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .904 below the .95 bar, R .797 well below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 63/981 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~16:29 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #204 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #203's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T23:40:07Z–23:49:25Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP11 / FP0 / FN3, P 1.000, R .786, exact-board 0/3, expiries 0.
- Rotating (force_type_b, synthetic Type B): 4 attempts — TP19 / FP2 / FN1, P .905, R .950, exact-board 3/4, expiries 0.
- Photo run total: 3 attempts — TP11 / FP0 / FN3, P 1.000, R .786, exact-board 0/3, expiries 0.
- Running per-brief photo totals: v2 = 921 attempts — TP3559 / FP425 / FN698, P .893, R .836, exact-board 402/921, expiries 63.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://511dc98ce476b1.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards (FN3); false picks secondary on synthetic boards (FP2).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .904 below the .95 bar, R .797 well below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 63/984 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~16:49 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #205 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #204's force_type_b). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-13T23:55:48Z-23:58:39Z, source live-agent, 2 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed perfect (TP2; 1 ambiguity error recorded by the server, excluded from scoring) with token. Session 2: car board passed perfect (TP2) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Photo run total: 2 attempts — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0.
- Running per-brief photo totals: v2 = 923 attempts — TP3563 / FP425 / FN698, P .893, R .836, exact-board 404/923, expiries 63. Server cross-check: all-era scored photo attempts = 945 (server arbitration from attempts.jsonl), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 923 = 941) — the pre-existing gap noted at Runs #97-#204, unchanged at 4; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING (VM replaced — systemctl reported units not found, tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://511dc98ce476b1.lhr.life) verified HTTP 200 (local 200 too) before any play. CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; both photo boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .907 below the .95 bar, R .797 well below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 63/986 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~16:58 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #206 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #205's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T00:07:40Z-00:14:50Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP19 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: motorcycle board passed perfect (TP16, all 16 tiles) with token. Session 2: fire-hydrant board passed perfect (TP3; 1 ambiguity-band tile excluded from scoring by the server) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (mountain board; initial tile faded/replaced with a non-matching bicycle, a second mountain tile appeared on re-scan and was clicked, its replacement was non-matching, re-scan clean, then Verify, with token).
- Photo run total: 2 attempts — TP19 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0.
- Running per-brief photo totals: v2 = 925 attempts — TP3582 / FP425 / FN698, P .894, R .837, exact-board 406/925, expiries 63 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 947 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 925 = 943) — the pre-existing gap noted at Runs #97-#205, unchanged at 4; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://511dc98ce476b1.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired on the single sequential browser task before session 1; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .917 below the .95 bar, R .828 well below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 63/988 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~17:15 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #207 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #206's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T00:28:50Z–00:35:33Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP7 / FP0 / FN3, P 1.000, R .700, exact-board 2/4, expiries 0. Session 1: car board passed perfect (TP1; 1 ambiguity-band tile excluded from scoring by the server) with token. Session 2: car board failed TP2 / FP0 / FN1 (partial), car board failed TP0 / FP0 / FN2 (partial + sliver, empty_submission procedure error), then a bus board passed perfect (TP4) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP0 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (motorcycle board; no matching tile present, empty selection verified after dynamic re-scan, with token).
- Photo run total: 4 attempts — TP7 / FP0 / FN3, P 1.000, R .700, exact-board 2/4, expiries 0.
- Running per-brief photo totals: v2 = 929 attempts — TP3589 / FP425 / FN701, P .894, R .837, exact-board 408/929, expiries 63 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 951 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 929 = 947) — the pre-existing gap noted at Runs #97-#206, unchanged at 4; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://511dc98ce476b1.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial/sliver under-selection on photo car boards — all 3 photo FNs came from session 2's two car boards (partial x2 + sliver x1), including one empty submission on a board whose positives were only partial/sliver tiles; zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .927 below the .95 bar, R .815 well below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 63/992 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~17:36 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #208 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #207's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T00:50:34Z–00:56:52Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP17 / FP1 / FN2, P .944, R .895, exact-board 2/4, expiries 0. Session 1 (3 attempts, token): motorcycle board failed TP6 / FP0 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), car board failed TP3 / FP1 / FN1 (partial), then a car board passed TP2 / FP0 / FN0 with token (band tile excluded from scoring). Session 2 (1 attempt, token): bicycle board passed perfect TP6 / FP0 / FN0 (1 ambiguity error recorded by the server, excluded from scoring) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (stairs board pass with token; 1 ambiguity error recorded by the server, excluded from scoring).
- Photo run total: 4 attempts — TP17 / FP1 / FN2, P .944, R .895, exact-board 2/4, expiries 0.
- Running per-brief photo totals: v2 = 933 attempts — TP3606 / FP426 / FN703, P .894, R .837, exact-board 410/933, expiries 63 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 955 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 933 = 951) — the pre-existing gap noted at Runs #97–#207, unchanged at 4; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://511dc98ce476b1.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired on the first browser task; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — both photo FNs were sliver x1 + partial x1 (motorcycle and car boards in session 1), plus 1 false pick on that car board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .920 below the .95 bar, R .837 well below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 63/996 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~17:57 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #209 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #208's force_type_b). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T01:10:53Z-01:33:15Z, source live-agent, 3 scored attempts total, plus 2 unscored expired photo attempts.
- Photo (designated sessions): 3 attempts — TP15 / FP0 / FN1, P 1.000, R .938, exact-board 2/3, expiries 2. Session 1 (4 rounds, token): a car round expired unscored (challenge_expired), a car board failed TP6 / FP0 / FN1 (partial), a motorcycle round expired unscored (challenge_expired), then a bus board passed perfect (TP7) with token. Session 2 (1 round, token): car board passed perfect (TP2) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Photo run total: 3 attempts — TP15 / FP0 / FN1, P 1.000, R .938, exact-board 2/3, expiries 2.
- Running per-brief photo totals: v2 = 936 attempts — TP3621 / FP426 / FN704, P .895, R .837, exact-board 412/936, expiries 65. Server cross-check: all-era scored photo attempts = 958 (compare report), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 936 = 954) — the pre-existing gap noted at Runs #97-#208, unchanged at 4; rolling-30 below is server-based.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://511dc98ce476b1.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: clock expiries — 2 unscored photo rounds expired in session 1 (car and motorcycle), plus a single partial-tile miss on the scored car board (the run's only FN); zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .942 below the .95 bar, R .869 well below the .95 bar, exact-board 18/30 = 60.0% below the 90% bar; v2 photo expiry rate overall 65/1001 = 6.5%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~18:34 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #210 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #209's natural). Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 1 ended in terminal cooldown ("Too many attempts") after 6 scored rounds.
Window arbitrated: 2026-10-14T01:38:00Z-01:53:59Z, source live-agent, 10 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 9 attempts — TP22 / FP7 / FN30, P .759, R .423, exact-board 1/9, expiries 1. Session 1 (6 scored attempts, no token, cooldown): motorcycle round expired unscored (challenge_expired), car TP1/FP2/FN0, bicycle TP4/FP2/FN0, car TP7/FP0/FN2 (sliver x2), motorcycle TP0/FP0/FN5 (empty_submission, partial x5), bicycle TP1/FP1/FN0, bicycle TP0/FP0/FN13 (empty_submission; partial/sliver/whole). Session 2 (3 attempts, token): bus TP7/FP2/FN3 (partial x3), bus TP0/FP0/FN7 (empty_submission), then a car board passed perfect (TP2) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bus board; 3 initial buses plus 1 replacement bus correctly picked after re-scan, then Verify).
- Photo run total: 9 attempts — TP22 / FP7 / FN30, P .759, R .423, exact-board 1/9, expiries 1.
- Running per-brief photo totals: v2 = 945 attempts — TP3643 / FP433 / FN734, P .894, R .832, exact-board 413/945, expiries 66. Server cross-check: all-era scored photo attempts = 969 (compare count, live-agent), 6 more than the era-split log sum (v1 8 + v2.1 10 + v2 945 = 963) — the pre-existing gap noted at Runs #97-#209 grew from 4 to 6 during this interval (2 server attempts not attributable to any logged run window; rolling-30 below is server-based).
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://511dc98ce476b1.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task. Note: the agent's self-report undercounted session rounds versus the server record (it did not report the 3 empty_submission attempts); all numbers here are server-arbitrated per protocol.
- Dominant failure mode: empty submissions and large under-selection on photo boards — 3 empty_submission attempts accounted for FN25 of the run's FN30, plus sliver/partial misses on the remaining boards and FP7 spread across car/bicycle/bus boards.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .914 below the .95 bar, R .731 well below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo expiry rate overall 66/1011 = 6.5%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~18:54 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #211 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #210's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T01:57:00Z-02:01:27Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: fire-hydrant board passed perfect (TP2) with token. Session 2: car board passed perfect (TP1 scored; 1 ambiguity-band sliver tile excluded from scoring by the server) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (fire-hydrant board; 3 hydrant tiles incl. replacements correctly picked after re-scans, then Verify).
- Photo run total: 2 attempts — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0.
- Running per-brief photo totals: v2 = 947 attempts — TP3646 / FP433 / FN734, P .894, R .832, exact-board 415/947, expiries 66 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 969 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 947 = 965) — the pre-existing gap noted at Runs #97-#209. Reconciliation: Run #210's stated cross-check of 969 / gap 6 appears to have been the pre-exclusion count (bug-excluded total after Run #210 was 967); the bug-excluded total is 969 after this run's 2 photo attempts.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://511dc98ce476b1.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all 3 boards, all exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .929 below the .95 bar, R .727 well below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 66/1013 = 6.5%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~19:02 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).
### Run #212 — continuous run (2026-10-13, brief v2 validated) — CORRECTED ENTRY (supersedes the zero-yield draft logged minutes earlier; see infra note)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #211's force_low_trust), plus extra overlapping play from a replacement task (see infra note).
Sessions: 5 created, 4 tokens, 0 lost to infrastructure. Designated 3 sessions all tokened; the replacement task's session 1 also tokened; its session 2 was closed mid-play by the parent with no attempts recorded.
Window arbitrated: 2026-10-14T02:06:24Z-02:12:38Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP11 / FP0 / FN0, P 1.000, R 1.000, exact-board 3/3, expiries 0. Session 1: traffic-light board passed perfect (TP4) with token. Session 2: car board passed perfect (TP6; 1 ambiguity-band tile excluded from scoring) with token. Session 3 (rotating force_type_b, served a photo round — corpus-split as usual): car board passed perfect (TP1; 1 ambiguity-band tile excluded) with token.
- Photo (extra replacement-task session, same brief, counted here per server arbitration): 2 attempts — TP15 / FP0 / FN3, P 1.000, R .833, exact-board 1/2, expiries 0. Car board failed TP4 / FN3 (partial x2 + sliver x1), then a car board passed perfect (TP11) with token.
- Photo run total: 5 attempts — TP26 / FP0 / FN3, P 1.000, R .897, exact-board 4/5, expiries 0.
- Running per-brief photo totals: v2 = 952 attempts — TP3672 / FP433 / FN737, P .895, R .833, exact-board 419/952, expiries 66 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 974 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 952 = 970) — the pre-existing gap noted at Runs #97-#211, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: the gym was healthy throughout (both systemd units active; tunnel https://511dc98ce476b1.lhr.life + local HTTP 200 at pre-flight and post-run). The incident was on the runner side: an intermediate handoff from the first browser task was mistaken for a final result while that task was still running, and its early narrative (an abandoned round, an alternate tunnel URL) did not match the server record at that moment; a replacement task was spawned and briefly played in parallel (against the sequential rule), and a zero-yield entry was logged prematurely at ~02:09Z. The first task then completed all 3 designated sessions with tokens (server-verified passed events at 02:08:26Z, 02:09:48Z, 02:11:13Z), and the replacement task was closed by the parent at ~02:12Z to halt the extra play. This corrected entry, arbitrated from the full window after all play stopped, supersedes that draft in full. The alternate URL in the early narrative never appeared in LIVE_URL.txt and is disregarded.
- Dominant failure mode: under-selection on a single photo car board in the extra session (all 3 FNs: partial x2 + sliver x1) — zero FPs across the run; the designated sessions were perfect.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .933 below the .95 bar, R .740 well below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 66/1018 = 6.5%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~19:12 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #213 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #212's force_type_b). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T02:28:11Z-02:33:38Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP16 / FP0 / FN5, P 1.000, R .762, exact-board 2/3, expiries 0. Session 1: motorcycle board passed perfect (TP3 scored; agent selected 4 tiles, server scoring excludes band as usual) with token. Session 2: motorcycle board failed TP9 / FP0 / FN5 (partial x4 + sliver x1), then a car board passed perfect (TP4) with token.
- Rotating (natural): 2 attempts — TP4 / FP0 / FN2, P 1.000, R .667, exact-board 1/2, expiries 0. Stairs Type B board failed TP2 / FN2 (partial x2), then a tractor Type A static board passed perfect (TP2) with token.
- Photo run total: 3 attempts — TP16 / FP0 / FN5, P 1.000, R .762, exact-board 2/3, expiries 0.
- Running per-brief photo totals: v2 = 955 attempts — TP3688 / FP433 / FN742, P .895, R .833, exact-board 421/955, expiries 66 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 977 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 955 = 973) — the pre-existing gap noted at Runs #97-#212, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://511dc98ce476b1.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: under-selection on a single photo motorcycle board — all 5 photo FNs came from that one attempt (partial x4 + sliver x1); zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .930 below the .95 bar, R .707 well below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo expiry rate overall 66/1021 = 6.5%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~19:34 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #215 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #213's natural as logged at pre-flight; see reconciliation note — the intervening run also played force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T03:06:21Z-03:17:20Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP23 / FP3 / FN4, P .885, R .852, exact-board 2/6, expiries 0. Session 1: motorcycle board failed TP3 / FP2 / FN0 (1 ambiguity error), car board failed TP3 / FP0 / FN2 (sliver x2), then a fire-hydrant board passed perfect (TP2) with token. Session 2: bus board failed TP8 / FP0 / FN2 (partial x2), bicycle board failed TP4 / FP1 / FN0, then a bicycle board passed perfect (TP3) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (mountain board pass; initial matches faded/replaced, re-scan clean, then Verify).
- Photo run total: 6 attempts — TP23 / FP3 / FN4, P .885, R .852, exact-board 2/6, expiries 0.
- Running per-brief photo totals (server-reconciled, incl. the unlogged intervening run below): v2 = 966 attempts — TP3729 / FP439 / FN748, P .895, R .833, exact-board 425/966, expiries 66 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 988 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 966 = 984) — the pre-existing gap noted at Runs #97-#213, unchanged.
- RECONCILIATION NOTE — unlogged intervening run (presumed Run #214): server records show 3 completed sessions at 2026-10-14T02:46:59Z-02:58:50Z (after Run #213, before this run) that were NOT in TRAINING_LOG at this run's pre-flight or at logging time: 2x force_type_b_photo (both passed, tokens) plus a force_dynamic session passed after an initial dynamic session was created with no attempts recorded: 5 scored photo attempts — TP18 / FP3 / FN2, P .857, R .900, exact-board 2/5, expiries 0 (car TP1/FP2, bicycle TP4 perfect, fire_hydrant TP6/FN2, motorcycle TP5/FP1, car TP2 perfect), plus 2 scored synthetic dynamic attempts — TP8 / FP0 / FN1, exact-board 1/2. This run is numbered #215 chronologically. Do NOT re-add its attempts: the running totals above already include them. Because that run had not been logged at pre-flight, this run's rotating slot was chosen as force_dynamic from Run #213's natural, duplicating the intervening run's rotating scenario.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING (VM replaced — systemctl reported units not found, tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://511dc98ce476b1.lhr.life) verified HTTP 200 (local 200 too) before any play. The known CAPTCHA-preference glitch fired at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task. One stale Verify click in session 3 was not started by the page and was retried successfully with a fresh reference — not a submission, not scored.
- Dominant failure mode: mixed — under-selection on photo car and bus boards (all 4 photo FNs: sliver x2 on car, partial x2 on bus) plus false picks on motorcycle/bicycle boards (FP2 + FP1 of the run's 3 photo FPs).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .893 below the .95 bar, R .711 well below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 66/1032 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~20:18 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #216 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #215's force_dynamic). Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 1 ended in terminal cooldown ("Too many attempts") after 6 failed rounds.
Window arbitrated: 2026-10-14T03:28:20Z-03:37:53Z, source live-agent, 10 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 9 attempts — TP37 / FP4 / FN16, P .902, R .698, exact-board 1/9, expiries 0. Session 1 (6 attempts, no token, terminal cooldown): motorcycle TP5/FN3 (partial x2 + sliver), traffic_light TP0/FP2/FN1 (partial; 2 ambiguity errors), bicycle TP1/FN1 (sliver), car TP4/FP1/FN1 (sliver), motorcycle TP11/FN3 (sliver + partial x2), car TP2/FN2 (sliver + partial). Session 2 (3 attempts, token): motorcycle TP5/FP1/FN1 (sliver), bus TP6/FN4 (partial x4), traffic_light board passed perfect (TP3).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (traffic-light board; initial matches faded/replaced, replacement correctly picked after re-scan, then Verify).
- Photo run total: 9 attempts — TP37 / FP4 / FN16, P .902, R .698, exact-board 1/9, expiries 0.
- Running per-brief photo totals: v2 = 975 attempts — TP3766 / FP443 / FN764, P .895, R .831, exact-board 426/975, expiries 66 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 997 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 975 = 993) — the pre-existing gap noted at Runs #97-#215, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://511dc98ce476b1.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: under-selection on photo boards — all 16 photo FNs were sliver/partial misses spread across 8 of the 9 photo attempts (only the passing traffic-light board was exact), plus FP2 on the session-1 traffic-light board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .925 below the .95 bar, R .804 well below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 66/1041 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~20:38 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #217 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #216's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T03:48:33Z-03:52:35Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: traffic-light board passed perfect (TP4) with token. Session 2: fire-hydrant board passed perfect (TP2) with token.
- Rotating (force_type_b, synthetic Type B): 3 attempts — TP19 / FP3 / FN0, P .864, R 1.000, exact-board 1/3, expiries 0. Motorcycle board failed TP8 / FP2, car board failed TP5 / FP1, then a crosswalk board passed perfect (TP6) with token.
- Photo run total: 2 attempts — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0.
- Running per-brief photo totals: v2 = 977 attempts — TP3772 / FP443 / FN764, P .895, R .832, exact-board 428/977, expiries 66 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 999 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 977 = 995) — the pre-existing gap noted at Runs #97-#216, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://511dc98ce476b1.lhr.life verified HTTP 200). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none on photo boards (perfect run); the run's only errors were false picks on the synthetic rotating boards (motorcycle FP2, car FP1) — over-selection, not the usual photo sliver/partial under-selection.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .926 below the .95 bar, R .808 below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 66/1043 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~20:52 PDT on 2026-10-13; the AM summary was already delivered with Run #186 — marker `Summary delivered: 2026-10-13 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #218 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #217's force_type_b). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T04:08:39Z-04:14:51Z, source live-agent, 3 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 3 attempts — TP8 / FP1 / FN0, P .889, R 1.000, exact-board 2/3, expiries 1. Session 1: motorcycle board failed TP2 / FP1 / FN0, a car round expired unscored (challenge_expired), then a traffic-light board passed perfect (TP2) with token. Session 2: traffic-light board passed perfect (TP4) with token.
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Photo run total: 3 attempts — TP8 / FP1 / FN0, P .889, R 1.000, exact-board 2/3, expiries 1.
- Running per-brief photo totals: v2 = 980 attempts — TP3780 / FP444 / FN764, P .895, R .832, exact-board 430/980, expiries 67. Server cross-check: all-era scored photo attempts = 1002 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 980 = 998) — the pre-existing gap noted at Runs #97-#217, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://d1f34f8512b6a9.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: a single false pick on the photo motorcycle board (the run's only FP) plus 1 photo expiry (car round, unscored) — zero FNs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .916 below the .95 bar, R .816 below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 67/1047 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired. The twice-daily PM summary IS due with this run (first completed run after 21:00 PDT on 2026-10-13; no PM marker existed) and is delivered in the run's chat report in English only: Runs #187-#218 completed since the 2026-10-13 AM summary (32 run numbers, including 2 unlogged intervening runs reconciled from the server), 152 scored photo attempts banked under v2 (828 -> 980), cumulative v2 photo line P .895 / R .832 / exact-board 430/980, rolling-30 P .916 / R .816 / exact 13/30, expiry rate 6.4% overall, parity NOT reached (exact-board is the largest gap, then recall, then precision), dominant failure mode over the period remains sliver/partial under-selection on photo boards with episodic false-pick blowups on car boards, notable incidents include pre-flight gym/tunnel revivals, a replaced session after a tunnel death, terminal-cooldown sessions, and this run's 1 photo expiry. Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).
Summary delivered: 2026-10-13 PM

### Run #219 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #218's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T04:28:51Z-04:36:34Z, source live-agent, 4 scored attempts total, plus 1 unscored expired synthetic attempt.
- Photo (designated sessions): 3 attempts — TP15 / FP0 / FN1, P 1.000, R .938, exact-board 2/3, expiries 0. Session 1: fire-hydrant board passed perfect (TP6) with token. Session 2: fire-hydrant board failed TP3 / FP0 / FN1 (sliver x1), then a bicycle board passed perfect (TP6; 1 ambiguity error recorded by the server, excluded from scoring) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 scored attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, plus 1 unscored expired bicycle round (challenge_expired; the box was re-checked and the session then passed on a stairs board) with token.
- Photo run total: 3 attempts — TP15 / FP0 / FN1, P 1.000, R .938, exact-board 2/3, expiries 0.
- Running per-brief photo totals: v2 = 983 attempts — TP3795 / FP444 / FN765, P .895, R .832, exact-board 432/983, expiries 67 (all from earlier v2 eras; 0 this run — this run's only expiry was on the synthetic rotating session). Server cross-check: all-era scored photo attempts = 1005 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 983 = 1001) — the pre-existing gap noted at Runs #97-#218, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://d1f34f8512b6a9.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired at spawn (task paused claiming "ask/unavailable"); it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in the single sequential browser task.
- Dominant failure mode: a single sliver under-selection on a photo fire-hydrant board (the run's only FN; zero FPs on photo boards) — plus the unscored expired synthetic bicycle round on the rotating session.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .916 below the .95 bar, R .811 below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 67/1050 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~21:37 PDT on 2026-10-13; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — so no duplicate is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #220 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #219's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T04:48:45Z–04:52:52Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP13 / FP0 / FN4, P 1.000, R .765, exact-board 2/3, expiries 0. Session 1: traffic-light board passed perfect (TP3) with token. Session 2: car board failed TP4 / FP0 / FN4 (sliver x2, partial x2 — cars behind a fence at a baseball field), then a bicycle board passed perfect (TP6; 1 ambiguity error recorded by the server, excluded from scoring) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (crosswalk board; dynamic replacements re-scanned until no tile matched, then Verify) with token.
- Photo run total: 3 attempts — TP13 / FP0 / FN4, P 1.000, R .765, exact-board 2/3, expiries 0.
- Running per-brief photo totals: v2 = 986 attempts — TP3808 / FP444 / FN769, P .896, R .832, exact-board 434/986, expiries 67 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1008 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 986 = 1004) — the pre-existing gap noted at Runs #97–#219, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://d1f34f8512b6a9.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired at spawn (task paused claiming "ask/unavailable"); it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in the single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on a single photo car board (all 4 photo FNs in one attempt: sliver x2, partial x2) — zero FPs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .930 below the .95 bar, R .815 below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 67/1053 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~21:53 PDT on 2026-10-13; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — so no duplicate is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #221 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #220's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T05:08:01Z–05:13:37Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP24 / FP1 / FN6, P .960, R .800, exact-board 2/6, expiries 0. Session 1: bicycle board failed TP3 / FP1 / FN0, car board failed TP1 / FN1 (sliver), car board failed TP5 / FN4 (partial + sliver x3), then a traffic-light board passed perfect (TP2) with token. Session 2: car board failed TP7 / FN1 (partial), then a fire-hydrant board passed perfect (TP6) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP8 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (car board pass) with token.
- Photo run total: 6 attempts — TP24 / FP1 / FN6, P .960, R .800, exact-board 2/6, expiries 0.
- Running per-brief photo totals: v2 = 992 attempts — TP3832 / FP445 / FN775, P .896, R .832, exact-board 436/992, expiries 67 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1014 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 992 = 1010) — the pre-existing gap noted at Runs #97–#220, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://d1f34f8512b6a9.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired at spawn (task paused claiming "ask/unavailable"); it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in the single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo car boards (all 6 photo FNs in the two car attempts in sessions 1–2: sliver x4 + partial x2), plus a single false pick on the session-1 bicycle board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .945 below the .95 bar, R .805 below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 67/1059 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~22:13 PDT on 2026-10-13; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — so no duplicate is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #222 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #221's force_type_b). Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 2 ended in terminal cooldown ("Too many attempts") after 6 failed rounds.
Window arbitrated: 2026-10-14T05:28:25Z–05:38:23Z, source live-agent, 12 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 7 attempts — TP48 / FP1 / FN7, P .980, R .873, exact-board 1/7, expiries 0. Session 1: fire-hydrant board passed perfect (TP16) with token. Session 2 (6 attempts, no token, terminal cooldown): car TP7 / FN2 (sliver x2), bicycle TP3 / FN1 (partial), traffic_light TP2 / FP1 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), bus TP8 / FN2 (partial x2), car TP5 / FN1 (partial), car TP7 / FN1 (partial).
- Rotating (natural, synthetic): 5 attempts — TP7 / FP0 / FN10, P 1.000, R .412, exact-board 1/5, expiries 0. Bridge board skipped (server scored TP0 / FN3 — sliver x2, partial), crosswalk TP0 / FN1 (partial), motorcycle TP3 / FN2 (partial x2), car board skipped (server scored TP0 / FN4 — whole x2, partial, sliver), then a bicycle dynamic board passed perfect (TP4) with token; dynamic replacements re-scanned until no tile matched, then Verify.
- Photo run total: 7 attempts — TP48 / FP1 / FN7, P .980, R .873, exact-board 1/7, expiries 0.
- Running per-brief photo totals: v2 = 999 attempts — TP3880 / FP446 / FN782, P .897, R .832, exact-board 437/999, expiries 67 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1021 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 999 = 1017) — the pre-existing gap noted at Runs #97–#221, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING (VM replaced — systemctl reported units not found, tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://d1f34f8512b6a9.lhr.life) verified HTTP 200 (local 200 too) before any play. No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn.
- Dominant failure mode: sliver/partial under-selection on photo boards (all 7 photo FNs: sliver x2, partial x5 across the session-2 car/bicycle/bus boards), plus a single false pick on the photo traffic-light board; the rotating natural session also lost 10 synthetic tiles to under-selection, including two boards the agent skipped believing no target was present.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .967 clears the .95 bar, R .833 below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 67/1066 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~22:38 PDT on 2026-10-13; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — so no duplicate is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #223 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #222's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T05:48:26Z–05:51:29Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP8 / FP0 / FN2, P 1.000, R .800, exact-board 2/3, expiries 0. Session 1: fire-hydrant board passed (TP2) with token. Session 2: motorcycle board failed TP4 / FP0 / FN2 (sliver x1, partial x1), then a car board passed perfect (TP2) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (palm-tree board; dynamic replacements re-scanned until no tile matched, then Verify) with token.
- Photo run total: 3 attempts — TP8 / FP0 / FN2, P 1.000, R .800, exact-board 2/3, expiries 0.
- Running per-brief photo totals: v2 = 1002 attempts — TP3888 / FP446 / FN784, P .897, R .832, exact-board 439/1002, expiries 67 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1024 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1002 = 1020) — the pre-existing gap noted at Runs #97–#222, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://d1f34f8512b6a9.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on the photo motorcycle board (both photo FNs in one attempt: sliver x1, partial x1) — zero FPs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .971 clears the .95 bar, R .845 below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 67/1069 = 6.3%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~22:52 PDT on 2026-10-13; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — so no duplicate is sent). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #224 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #223's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T06:08:27Z–06:12:55Z, source live-agent, 6 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 5 attempts — TP21 / FP2 / FN2, P .913, R .913, exact-board 2/5, expiries 0. Session 1: car board failed TP4 / FP2 / FN0, then a bus board passed perfect (TP2) with token. Session 2: motorcycle board failed TP12 / FP0 / FN1 (partial; 1 ambiguity error recorded by the server, excluded from scoring), motorcycle board failed TP0 / FP0 / FN1 (sliver, empty_submission procedure error), then a traffic-light board passed perfect (TP3) with token.
- Rotating (force_low_trust, synthetic Type B): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bus board pass) with token.
- Photo run total: 5 attempts — TP21 / FP2 / FN2, P .913, R .913, exact-board 2/5, expiries 0.
- Running per-brief photo totals: v2 = 1007 attempts — TP3909 / FP448 / FN786, P .897, R .833, exact-board 441/1007, expiries 67 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1029 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1007 = 1025) — the pre-existing gap noted at Runs #97–#223, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://d1f34f8512b6a9.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: mixed — false picks on the photo car board (FP2 in one attempt) plus sliver/partial under-selection on the photo motorcycle boards (FN1 partial, FN1 sliver with an empty submission).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .965 clears the .95 bar, R .862 below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 67/1074 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~23:13 PDT on 2026-10-13; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #225 — continuous run (2026-10-13, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #224's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T06:27:46Z–06:31:14Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 3 attempts — TP13 / FP1 / FN0, P .929, R 1.000, exact-board 2/3, expiries 0. Session 1: bus board passed perfect (TP8; 1 ambiguity error recorded by the server, excluded from scoring) with token. Session 2: car board failed TP4 / FP1 / FN0 (1 ambiguity error, excluded), then a motorcycle board passed perfect (TP1) with token.
- Photo (rotating session also served 1 photo round; counted here — same brief, corpus-split): car board failed TP1 / FP1 / FN1 (sliver).
- Photo run total: 4 attempts — TP14 / FP2 / FN1, P .875, R .933, exact-board 2/4, expiries 0.
- Synthetic (rotating session): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (crosswalk board pass) with token.
- Running per-brief photo totals: v2 = 1011 attempts — TP3923 / FP450 / FN787, P .897, R .833, exact-board 443/1011, expiries 67 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1033 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1011 = 1029) — the pre-existing gap noted at Runs #97–#224, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://d1f34f8512b6a9.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn. All 3 sessions played in a single sequential browser task.
- Dominant failure mode: false picks on photo car boards (FP1 in each of the two car attempts) plus a single sliver miss on the rotating photo car board — zero other FNs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .958 clears the .95 bar, R .856 below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 67/1078 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~23:31 PDT on 2026-10-13; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #227 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural; rotation was determined at spawn from the last logged run, #225, whose rotating was force_type_b — see the reconciliation note below: presumed Run #226 also played natural, so natural repeats here and the next run owes force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T07:06:57Z–07:20:38Z, source live-agent, 6 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 6 attempts — TP20 / FP6 / FN4, P .769, R .833, exact-board 2/6, expiries 1. Session 1 (5 attempts, token): car board failed TP3 / FP4 / FN1, motorcycle board failed TP6 / FP0 / FN1 (1 ambiguity error recorded by the server, excluded from scoring), car board failed TP1 / FP2 / FN0, car board failed TP0 / FP0 / FN2 with an empty_submission procedure error, then a car board passed perfect (TP2). Session 2 (1 scored attempt + 1 expiry, token): a motorcycle round expired unscored (challenge_expired), then a fire-hydrant board passed perfect (TP8).
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 1022 attempts — TP3960 / FP458 / FN794, P .896, R .833, exact-board 447/1022, expiries 68. Server cross-check: all-era scored photo attempts = 1044 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1022 = 1040) — the pre-existing gap noted at Runs #97–#225, unchanged.
- RECONCILIATION NOTE — unlogged intervening run (presumed Run #226): server records show a complete run at 2026-10-14T06:46:49Z–06:53:02Z (after Run #225, before this run) that was NOT in TRAINING_LOG at this run's pre-flight or at logging time: 3 sessions, 3 tokens (2x force_type_b_photo + 1 rotating natural, checkbox-only), 5 scored photo attempts — TP17 / FP2 / FN3, P .895, R .850, exact-board 2/5 (car TP7 / FP1 / FN0; motorcycle TP2 / FN3; fire_hydrant TP4 perfect; traffic_light TP2 / FP1; car TP2 perfect), 0 expiries. This run is numbered #227 chronologically. If that run is logged later, do NOT re-add its attempts: the running totals above already include them (v2 was 1011 attempts before it; +5 intervening +6 this run = 1022).
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were inactive (tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://d1f34f8512b6a9.lhr.life) verified HTTP 200 (local 200 too) before any play. The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then played clean. All 3 sessions played in a single sequential browser task.
- Dominant failure mode: false picks on photo car boards — all 6 FPs came from car boards (FP4 on the first board, FP2 on the third), plus an empty submission on a car board (FN2); the only other FN was a single miss on the motorcycle board, and the session-2 motorcycle round was lost to the 180 s clock (expiry 1, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .908 below the .95 bar, R .871 below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo expiry rate overall 68/1090 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~00:21 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #228 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #227's natural; Run #227's note said the next run owed force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T07:26:45Z–07:33:14Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP9 / FP1 / FN2, P .900, R .818, exact-board 2/4, expiries 0. Session 1: car board failed TP1 / FP1 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), car board failed TP3 / FP0 / FN2 (both FNs sliver), then a motorcycle board passed (TP3 / FP0 / FN0; band tile excluded) with token. Session 2: traffic-light board passed (TP2 / FP0 / FN0; 2 ambiguity errors recorded by the server, excluded from scoring) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bus board pass; dynamic replacements re-scanned until no tile matched, then Verify) with token.
- Running per-brief photo totals: v2 = 1026 attempts — TP3969 / FP459 / FN796, P .896, R .833, exact-board 449/1026, expiries 68 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1048 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1026 = 1044) — the pre-existing gap noted at Runs #97–#227, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://d1f34f8512b6a9.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn. All 3 sessions played in a single sequential browser task.
- Dominant failure mode: sliver misses on a single photo car board (both photo FNs in one attempt, both sliver), plus a single false pick on the other photo car board (FP1) — zero other errors this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .893 below the .95 bar, R .858 below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 68/1094 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~00:33 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #229 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #228's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T07:48:25Z–07:52:45Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 4 attempts — TP15 / FP1 / FN1, P .938, R .938, exact-board 2/4, expiries 0. Session 1: car board failed TP1 / FP1 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), traffic-light board failed TP0 / FP0 / FN1 (sliver, empty_submission procedure error), then a bicycle board passed perfect (TP3) with token. Session 2: car board passed perfect (TP11) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (traffic-light board pass; dynamic replacements re-scanned until no tile matched, then Verify) with token.
- Running per-brief photo totals: v2 = 1030 attempts — TP3984 / FP460 / FN797, P .896, R .833, exact-board 451/1030, expiries 68 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1052 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1030 = 1048) — the pre-existing gap noted at Runs #97–#228, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://d1f34f8512b6a9.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn. All 3 sessions played in a single sequential browser task.
- Dominant failure mode: mixed small errors on photo boards — a single false pick on the first car board (FP1) and a single sliver miss with an empty submission on the traffic-light board (FN1); the other two photo boards were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .879 below the .95 bar, R .872 below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 68/1098 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~00:53 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #230 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #229's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T08:08:33Z–08:15:07Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 6 attempts — TP32 / FP6 / FN3, P .842, R .914, exact-board 2/6, expiries 0. Session 1 (5 attempts, token): motorcycle board failed TP3 / FP3 / FN0, car board failed TP3 / FP0 / FN2 (both FNs sliver), bicycle board failed TP12 / FP0 / FN1 (partial), car board failed TP4 / FP3 / FN0, then a motorcycle board passed perfect (TP6). Session 2 (1 attempt, token): car board passed perfect (TP4).
- Photo (rotating session also served 1 photo round; counted here — same brief, corpus-split): car board passed perfect (TP4).
- Photo run total: 7 attempts — TP36 / FP6 / FN3, P .857, R .923, exact-board 3/7, expiries 0.
- Synthetic (rotating session): 1 attempt — TP4 / FP0 / FN1, P 1.000, R .800, exact-board 0/1, expiries 0 (tractor board failed, partial FN1, 1 ambiguity error recorded by the server, excluded from scoring; session then passed on the photo car round above).
- Running per-brief photo totals: v2 = 1037 attempts — TP4020 / FP466 / FN800, P .896, R .834, exact-board 454/1037, expiries 68 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1059 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1037 = 1055) — the pre-existing gap noted at Runs #97–#229, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://d1f34f8512b6a9.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn. All 3 sessions played in a single sequential browser task.
- Dominant failure mode: false picks on photo boards in session 1 — all 6 photo FPs came from its first and fourth boards (motorcycle FP3, car FP3), plus sliver/partial misses (car sliver x2, bicycle partial x1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .860 below the .95 bar, R .888 below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 68/1105 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~01:15 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #231 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #230's force_type_b). Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 1 ended in terminal cooldown ("Too many attempts") after 6 failed rounds.
Window arbitrated: 2026-10-14T08:27:06Z–08:39:01Z, source live-agent, 7 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 7 attempts — TP31 / FP1 / FN8, P .969, R .795, exact-board 1/7, expiries 1. Session 1 (6 attempts, no token, terminal cooldown): motorcycle board failed TP12 / FP0 / FN1 (partial; 1 ambiguity error recorded by the server, excluded from scoring), bicycle board failed TP1 / FP1 / FN0, bicycle board failed TP2 / FP0 / FN2 (sliver, partial; 1 ambiguity error, excluded), car board failed TP7 / FP0 / FN1 (partial), car board failed TP7 / FP0 / FN2 (partial, sliver), car board failed TP0 / FP0 / FN2 (partial, sliver; empty_submission procedure error). Session 2 (1 scored attempt + 1 expiry, token): a car round expired unscored (challenge_expired), then a fire-hydrant board passed perfect (TP2).
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Running per-brief photo totals: v2 = 1044 attempts — TP4051 / FP467 / FN808, P .897, R .834, exact-board 455/1044, expiries 69. Server cross-check: all-era scored photo attempts = 1066 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1044 = 1062) — the pre-existing gap noted at Runs #97–#230, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were inactive (tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://d1f34f8512b6a9.lhr.life) verified HTTP 200 (local 200 too) before any play. No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn. All 3 sessions played in a single sequential browser task.
- Dominant failure mode: under-selection on photo boards — all 8 photo FNs were sliver/partial misses (incl. one empty submission on a car board), plus a single false pick on a bicycle board (FP1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .878 below the .95 bar, R .865 below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo expiry rate overall 69/1113 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~01:39 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #232 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #231's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T08:46:35Z–08:50:36Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #231 and this run (server check: 0 attempts in 08:39:02Z–08:46:35Z).
- Photo (designated sessions): 2 attempts — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: fire-hydrant board passed perfect (TP2). Session 2: fire-hydrant board passed perfect (TP4).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (tractor board pass) with token.
- Running per-brief photo totals: v2 = 1046 attempts — TP4057 / FP467 / FN808, P .897, R .834, exact-board 457/1046, expiries 69 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1068 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1046 = 1064) — the pre-existing gap noted at Runs #97–#231, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://d1f34f8512b6a9.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .886 below the .95 bar, R .867 below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 69/1115 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~01:55 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #233 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #232's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T09:09:49Z–09:12:00Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #232 and this run (server check: 0 attempts in 08:50:37Z–09:06:27Z).
- Photo (designated sessions): 2 attempts — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: traffic-light board passed perfect (TP2) with token. Session 2: traffic-light board passed perfect (TP3) with token.
- Rotating (force_low_trust, synthetic Type B): 1 attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (stairs board pass with token).
- Photo run total: 2 attempts — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0.
- Running per-brief photo totals: v2 = 1048 attempts — TP4062 / FP467 / FN808, P .897, R .834, exact-board 459/1048, expiries 69 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1070 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1048 = 1066) — the pre-existing gap noted at Runs #97–#232, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://00f23d3c836265.lhr.life verified HTTP 200, local 200 too; the tunnel URL had rotated since Run #232). The known CAPTCHA-preference glitch fired at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .911 below the .95 bar, R .876 below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 69/1117 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~02:12 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #234 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #233's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T09:29:13Z–09:31:27Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #233 and this run (server check: 0 attempts in 09:12:01Z–09:26:17Z).
- Photo (designated sessions): 2 attempts — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: bicycle board passed perfect (TP3) with token. Session 2: traffic-light board passed perfect (TP3) with token.
- Photo (rotating session also served 1 photo round; counted here — same brief, corpus-split): bicycle board passed (TP1 / FP0 / FN0; 1 ambiguity error recorded by the server, excluded from scoring) with token.
- Photo run total: 3 attempts — TP7 / FP0 / FN0, P 1.000, R 1.000, exact-board 3/3, expiries 0.
- Running per-brief photo totals: v2 = 1051 attempts — TP4069 / FP467 / FN808, P .897, R .834, exact-board 462/1051, expiries 69 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1073 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1051 = 1069) — the pre-existing gap noted at Runs #97–#233, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://00f23d3c836265.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .929 below the .95 bar, R .893 below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 69/1120 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~02:31 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #235 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #234's force_type_b). Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 1 ended in terminal cooldown ("Too many attempts") after 6 failed rounds.
Window arbitrated: 2026-10-14T09:49:06Z–09:54:40Z, source live-agent, 10 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #234 and this run (server check: 0 attempts in 09:31:28Z–09:49:05Z).
- Photo (designated sessions): 8 attempts — TP13 / FP2 / FN9, P .867, R .591, exact-board 1/8, expiries 0. Session 1 (6 attempts, no token, terminal cooldown): bicycle TP0 / FP1 / FN1 (sliver), car TP0 / FP0 / FN2 (empty_submission; partial, sliver), car TP0 / FP0 / FN2 (empty_submission; partial, partial), bicycle TP3 / FP0 / FN1 (partial), car TP2 / FP1 / FN1 (partial), fire_hydrant TP2 / FP0 / FN1 (sliver). Session 2 (2 attempts, token): car TP2 / FP0 / FN1 (partial), then a car board passed perfect (TP4).
- Photo (rotating session also served 1 photo round; counted here — same brief, corpus-split): car board failed TP4 / FP0 / FN3 (partial, partial, sliver).
- Photo run total: 9 attempts — TP17 / FP2 / FN12, P .895, R .586, exact-board 1/9, expiries 0.
- Synthetic (rotating session): 1 attempt — TP0 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (Type A static motorcycle board with no matching tile, correctly Skipped, pass with token).
- Running per-brief photo totals: v2 = 1060 attempts — TP4086 / FP469 / FN820, P .897, R .833, exact-board 463/1060, expiries 69 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1082 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1060 = 1078) — the pre-existing gap noted at Runs #97–#234, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were inactive (tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://00f23d3c836265.lhr.life) verified HTTP 200 (local 200 too) before any play. No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn. All 3 sessions played in a single sequential browser task.
- Dominant failure mode: under-selection on photo boards — all 12 photo FNs were sliver/partial misses, including 2 empty submissions on car boards in session 1 (FN4 from those two attempts).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .919 below the .95 bar, R .816 below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 69/1129 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~02:55 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #236 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #235's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T10:09:25Z–10:15:47Z, source live-agent, 6 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #235 and this run (server check: 0 attempts in 09:54:41Z–10:09:24Z).
- Photo (designated sessions): 5 attempts — TP20 / FP1 / FN3, P .952, R .870, exact-board 2/5, expiries 0. Session 1: bus board failed TP1 / FP1 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), bus board failed TP8 / FP0 / FN2 (both FNs partial), then a motorcycle board passed perfect (TP6) with token. Session 2: bus board failed TP1 / FP0 / FN1 (partial), then a traffic-light board passed perfect (TP4) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP7 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (palm-tree board pass; dynamic replacements re-scanned until no tile matched, then Verify) with token.
- Running per-brief photo totals: v2 = 1065 attempts — TP4106 / FP470 / FN823, P .897, R .833, exact-board 465/1065, expiries 69 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1087 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1065 = 1083) — the pre-existing gap noted at Runs #97–#235, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://00f23d3c836265.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial misses on photo bus boards — all 3 photo FNs were partial misses on bus boards (FN2 on session 1's second board, FN1 on session 2's first board), plus a single false pick on session 1's first bus board (FP1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .959 clears the .95 bar, R .803 well below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 69/1134 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~03:16 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #237 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #236's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T10:28:28Z–10:30:48Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #236 and this run (server check: window begins after Run #236's last attempt at 10:15:47Z).
- Photo (designated sessions): 3 attempts — TP13 / FP0 / FN1, P 1.000, R .929, exact-board 2/3, expiries 0. Session 1: bicycle board passed perfect (TP4) with token. Session 2: car board failed TP7 / FP0 / FN1 (partial), then a car board passed perfect (TP2) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (tractor board pass; dynamic replacements re-scanned until no tile matched, then Verify) with token.
- Running per-brief photo totals: v2 = 1068 attempts — TP4119 / FP470 / FN824, P .898, R .833, exact-board 467/1068, expiries 69 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1090 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1068 = 1086) — the pre-existing gap noted at Runs #97–#236, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://00f23d3c836265.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: a single partial miss on one photo car board (the run's only FN) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .956 clears the .95 bar, R .791 well below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 69/1137 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~03:30 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #238 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #237's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T10:49:21Z–10:52:43Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #237 and this run (server check: window begins after Run #237's last attempt at 10:30:48Z, with 0 attempts in between).
- Photo (designated sessions): 2 attempts — TP7 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: motorcycle board passed perfect (TP3) with token. Session 2: car board passed perfect (TP4) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP8 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (stairs board pass) with token.
- Photo run total: 2 attempts — TP7 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0.
- Running per-brief photo totals: v2 = 1070 attempts — TP4126 / FP470 / FN824, P .898, R .834, exact-board 469/1070, expiries 69 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1092 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1070 = 1088) — the pre-existing gap noted at Runs #97–#237, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://00f23d3c836265.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — zero FPs and zero FNs across all corpora; all 3 boards were exact on the first attempt.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .968 clears the .95 bar, R .812 well below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo expiry rate overall 69/1139 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~03:52 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #239 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #238's force_type_b). Sessions: 3 played after revival, 3 tokens, plus 1 pre-revival session lost to infrastructure (unscored, no round issued).
Window arbitrated: 2026-10-14T11:16:02Z–11:20:41Z, source live-agent, 4 scored attempts total, plus 1 unscored expired attempt. No intervening unlogged attempts between Run #238 and this run (server check: window begins after Run #238's last attempt at 10:52:43Z, with 0 attempts in between; the pre-revival checkbox click recorded no attempt).
- Photo (designated sessions): 4 attempts — TP17 / FP0 / FN2, P 1.000, R .895, exact-board 2/4, expiries 1. Session 1: a motorcycle round expired unscored (challenge_expired), then a traffic-light board passed TP2 / FP0 / FN0 (1 ambiguity error recorded by the server, excluded from scoring) with token. Session 2: motorcycle board failed TP5 / FP0 / FN1 (sliver), fire-hydrant board failed TP2 / FP0 / FN1 (sliver; 1 ambiguity error, excluded), then a fire-hydrant board passed perfect (TP8) with token.
- Rotating (natural): checkbox-only session — token issued with no grid rounds, 0 scored attempts; counts as a token, never as perception data.
- Photo run total: 4 attempts — TP17 / FP0 / FN2, P 1.000, R .895, exact-board 2/4, expiries 1.
- Running per-brief photo totals: v2 = 1074 attempts — TP4143 / FP470 / FN826, P .898, R .834, exact-board 471/1074, expiries 70. Server cross-check: all-era scored photo attempts = 1096 (compare report, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1074 = 1092) — the pre-existing gap noted at Runs #97–#238, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: MAJOR — at pre-flight both systemd units were active and the tunnel URL from LIVE_URL.txt (https://00f23d3c836265.lhr.life) verified HTTP 200, but the tunnel died mid-Session 1 (grid never issued; the domain then returned only "no tunnel"). Both units were found inactive/missing; the parent ran tools/install_services.sh, restarted captcha-gym and captcha-gym-tunnel, and the same URL verified HTTP 200 again (local 200 too). Play resumed from Session 1 in the same browser task; the lost session is unscored, not failed. The known CAPTCHA-preference glitch also fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once.
- Dominant failure mode: sliver under-selection on photo boards (both FNs were sliver misses — motorcycle x1, fire hydrant x1) — zero FPs this run, plus 1 expiry.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .968 clears the .95 bar, R .836 below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 70/1144 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired (the gym WAS revived and the run played, so trigger (d) does not apply) and no twice-daily summary was due (this run completed at ~04:21 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #240 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #239's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T11:28:45Z–11:34:12Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #239 and this run (server check: 0 attempts in 11:20:42Z–11:26:44Z).
- Photo (designated sessions): 4 attempts — TP14 / FP0 / FN4, P 1.000, R .778, exact-board 2/4, expiries 0. Session 1 (3 attempts, token): car board failed TP5 / FP0 / FN3 (sliver, sliver, partial), car board failed TP2 / FP0 / FN1 (partial), then a traffic-light board passed perfect (TP4). Session 2 (1 attempt, token): traffic-light board passed perfect (TP3).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (tractor board pass; dynamic replacements re-scanned until no tile matched, then Verify) with token.
- Photo run total: 4 attempts — TP14 / FP0 / FN4, P 1.000, R .778, exact-board 2/4, expiries 0.
- Running per-brief photo totals: v2 = 1078 attempts — TP4157 / FP470 / FN830, P .898, R .834, exact-board 473/1078, expiries 70. Server cross-check: all-era scored photo attempts = 1100 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1078 = 1096) — the pre-existing gap noted at Runs #97–#239, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://00f23d3c836265.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; the parent verified the stored preference (solve/all_tasks) proactively at spawn. All 3 sessions played in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo car boards — all 4 photo FNs were on car boards (sliver x2, partial x2); zero FPs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .969 clears the .95 bar, R .812 well below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 70/1148 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~04:34 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #241 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #240's force_dynamic). Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 3 ended in terminal cooldown ("Too many attempts") after 3 rounds.
Window arbitrated: 2026-10-14T11:49:46Z–12:01:52Z, source live-agent, 4 scored attempts total, plus 2 unscored expired attempts. No intervening unlogged attempts between Run #240 and this run (server check: 0 attempts in 11:34:13Z–11:49:45Z).
- Photo (designated sessions): 3 attempts — TP32 / FP0 / FN1, P 1.000, R .970, exact-board 2/3, expiries 0. Session 1: motorcycle board failed TP12 / FP0 / FN1 (partial), then a motorcycle board passed perfect (TP16) with token. Session 2: car board passed perfect (TP4) with token.
- Rotating (force_low_trust): 1 scored attempt — TP4 / FP3 / FN0, P .571, R 1.000, exact-board 0/1, expiries 2. A synthetic car round expired unscored (challenge_expired), a photo bus round expired unscored (challenge_expired, counted in the photo expiry total below), then a synthetic crosswalk board failed TP4 / FP3 / FN0 and the session ended in terminal cooldown with no token.
- Photo run total: 3 attempts — TP32 / FP0 / FN1, P 1.000, R .970, exact-board 2/3, expiries 1 (the rotating photo bus round; 0 in the designated sessions).
- Running per-brief photo totals: v2 = 1081 attempts — TP4189 / FP470 / FN831, P .899, R .834, exact-board 475/1081, expiries 71. Server cross-check: all-era scored photo attempts = 1103 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1081 = 1099) — the pre-existing gap noted at Runs #97–#240, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://00f23d3c836265.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: expiries in the rotating session (2 rounds lost to the 180 s clock, both unscored) plus false picks on the synthetic crosswalk board (FP3); on photo boards only a single partial-tile miss (FN1 on a motorcycle board), with zero photo FPs.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .976 clears the .95 bar, R .839 well below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 71/1152 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~05:02 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #242 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #241's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T12:10:31Z–12:16:54Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #241 and this run (server check: 0 attempts in 12:01:53Z–12:10:30Z).
- Photo (designated sessions): 3 attempts — TP6 / FP1 / FN2, P .857, R .750, exact-board 2/3, expiries 0. Session 1: motorcycle board failed TP2 / FP1 / FN2 (sliver, partial), then a car board passed perfect (TP2) with token. Session 2: bus board passed perfect (TP2) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP7 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (tractor board pass; 1 ambiguity error recorded by the server, excluded from scoring) with token.
- Photo run total: 3 attempts — TP6 / FP1 / FN2, P .857, R .750, exact-board 2/3, expiries 0.
- Running per-brief photo totals: v2 = 1084 attempts — TP4195 / FP471 / FN833, P .899, R .834, exact-board 477/1084, expiries 71 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1106 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1084 = 1102) — the pre-existing gap noted at Runs #97–#241, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://00f23d3c836265.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on the photo motorcycle board (both photo FNs, sliver + partial, on that one board) plus 1 false pick on the same board — all other boards this run were exact.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .977 clears the .95 bar, R .863 well below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo expiry rate overall 71/1155 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~05:17 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #243 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #242's force_type_b). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T12:28:50Z–12:36:17Z, source live-agent, 4 scored attempts total, plus 1 unscored expired photo attempt. No intervening unlogged attempts between Run #242 and this run (server check: 0 attempts in 12:16:55Z–12:26:00Z).
- Photo (designated sessions): 4 attempts — TP13 / FP0 / FN3, P 1.000, R .813, exact-board 2/4, expiries 1. Session 1: car board passed perfect (TP4) with token. Session 2: motorcycle board failed TP6 / FP0 / FN2 (partial, sliver), a car round expired unscored (challenge_expired), a bicycle board failed TP2 / FP0 / FN1 (whole), then a motorcycle board passed perfect (TP1) with token.
- Rotating (natural): checkbox-only session — token issued with no grid rounds, 0 scored attempts; counts as a token, never as perception data.
- Photo run total: 4 attempts — TP13 / FP0 / FN3, P 1.000, R .813, exact-board 2/4, expiries 1.
- Running per-brief photo totals: v2 = 1088 attempts — TP4208 / FP471 / FN836, P .899, R .834, exact-board 479/1088, expiries 72. Server cross-check: all-era scored photo attempts = 1110 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1088 = 1106) — the pre-existing gap noted at Runs #97–#242, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://00f23d3c836265.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported; all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: under-selection on photo boards — all 3 photo FNs in Session 2 (motorcycle partial + sliver, bicycle whole-instance); zero FPs this run, plus 1 expiry.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .985 clears the .95 bar, R .872 well below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 72/1160 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~05:37 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #244 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #243's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T12:49:53Z–12:59:01Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #243 and this run (server check: 0 attempts in 12:36:18Z–12:49:52Z).
- Photo (designated sessions): 6 attempts — TP22 / FP0 / FN9, P 1.000, R .710, exact-board 2/6, expiries 0. Session 1 (4 attempts, token): motorcycle board failed TP4 / FP0 / FN2 (sliver, partial), bicycle board failed TP0 / FP0 / FN2 (partial, sliver; empty_submission procedure error), motorcycle board failed TP10 / FP0 / FN4 (sliver, partial x3), then a traffic-light board passed perfect (TP3). Session 2 (2 attempts, token): bicycle board failed TP3 / FP0 / FN1 (partial; 2 ambiguity errors recorded by the server, excluded from scoring), then a car board passed perfect (TP2).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (chimney board pass; dynamic replacements re-scanned until no tile matched, then Verify) with token.
- Photo run total: 6 attempts — TP22 / FP0 / FN9, P 1.000, R .710, exact-board 2/6, expiries 0.
- Running per-brief photo totals: v2 = 1094 attempts — TP4230 / FP471 / FN845, P .900, R .834, exact-board 481/1094, expiries 72 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1116 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1094 = 1112) — the pre-existing gap noted at Runs #97–#243, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were inactive (tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://00f23d3c836265.lhr.life) verified HTTP 200 (local 200 too) before any play. Post-run both units were active and the tunnel verified HTTP 200 again. The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 9 photo FNs were sliver or partial misses (motorcycle x6, bicycle x3, including one empty submission on a bicycle board); zero FPs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .992 clears the .95 bar, R .853 well below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 72/1166 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~05:59 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #245 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #244's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T13:09:38Z–13:15:59Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts.
- Photo (designated sessions): 2 attempts — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: motorcycle board passed perfect (server TP3; the 4th selected positive was a band tile, excluded from scoring) with token. Session 2: car board passed perfect (TP2) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 2 attempts — TP4 / FP0 / FN0, P 1.000, R 1.000, expiries 0, with token. Tractor round failed with an empty submission whose 2 positives were both ambiguity-band tiles (2 ambiguity errors, excluded from scoring; TP0 / FP0 / FN0 scored), triggering a ~55s cooldown; after the cooldown the taxi round passed perfect (TP4, dynamic replacements re-scanned until no tile matched, then Verify).
- Photo run total: 2 attempts — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0.
- Running per-brief photo totals: v2 = 1096 attempts — TP4235 / FP471 / FN845, P .900, R .834, exact-board 483/1096, expiries 72 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1118 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1096 = 1114) — the pre-existing gap noted at Runs #97–#244, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://00f23d3c836265.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task. One in-session cooldown (~55s) on the rotating session after the ambiguity-excluded tractor round; waited out and token obtained in the same session.
- Dominant failure mode: none on photo boards this run — both boards were exact with zero FPs and zero FNs. The only miss was the rotating tractor round's empty submission on ambiguity-band positives (excluded from scoring).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .992 clears the .95 bar, R .850 well below the .95 bar, exact-board 17/30 = 56.7% below the 90% bar; v2 photo expiry rate overall 72/1168 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~06:17 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #246 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #245's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T13:28:32Z–13:34:33Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #245 and this run (server check: 0 attempts in 13:15:59Z–13:28:31Z).
- Photo (designated sessions): 3 attempts — TP10 / FP0 / FN1, P 1.000, R .909, exact-board 2/3, expiries 0. Session 1: bus board failed TP3 / FP0 / FN1 (partial), then a fire-hydrant board passed perfect (TP2) with token. Session 2: car board passed perfect (TP5; 1 ambiguity error recorded by the server, excluded from scoring) with token.
- Rotating (force_type_b): 4 attempts — 3 photo attempts TP13 / FP2 / FN4, P .867, R .765, exact-board 0/3, plus 1 synthetic attempt TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0. Bus board failed TP4 / FP0 / FN2 (partial x2), car board failed TP0 / FP1 / FN2 (partial x2), bus board failed TP9 / FP1 / FN0, then a synthetic palm-tree board passed perfect (TP4) with token; each photo attempt recorded 1 ambiguity error, excluded from scoring.
- Photo run total: 6 attempts — TP23 / FP2 / FN5, P .920, R .821, exact-board 2/6, expiries 0.
- Running per-brief photo totals: v2 = 1102 attempts — TP4258 / FP473 / FN850, P .900, R .834, exact-board 485/1102, expiries 72 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1124 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1102 = 1120) — the pre-existing gap noted at Runs #97–#245, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://00f23d3c836265.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial under-selection on photo boards in the rotating session — all 5 photo FNs were partial misses (bus x3, car x2 across the run), plus 2 false picks in the rotating photo rounds; zero FPs in the designated sessions.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .977 clears the .95 bar, R .833 well below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo expiry rate overall 72/1174 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~06:34 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #247 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #246's force_type_b). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T13:49:00Z–13:56:00Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #246 and this run (server check: 0 attempts in 13:34:34Z–13:49:00Z).
- Photo (designated sessions): 4 attempts — TP9 / FP0 / FN3, P 1.000, R .750, exact-board 2/4, expiries 0. Session 1: bus board failed TP2 / FP0 / FN2 (partial, partial), then a car board passed perfect (TP2) with token. Session 2: car board failed TP3 / FP0 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), then a car board passed perfect (TP2; 1 ambiguity error, excluded) with token.
- Rotating (natural): checkbox-only session — token issued with no grid rounds, 0 scored attempts; counts as a token, never as perception data.
- Photo run total: 4 attempts — TP9 / FP0 / FN3, P 1.000, R .750, exact-board 2/4, expiries 0.
- Running per-brief photo totals: v2 = 1106 attempts — TP4267 / FP473 / FN853, P .900, R .833, exact-board 487/1106, expiries 72 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1128 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1106 = 1124) — the pre-existing gap noted at Runs #97–#246, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://00f23d3c836265.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial/sliver under-selection on photo boards — all 3 photo FNs were partial or sliver misses (bus partial x2, car sliver x1); zero FPs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .975 clears the .95 bar, R .836 well below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 72/1178 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~06:57 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #248 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #247's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T14:14:03Z–14:25:04Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #247 and this run (server check: 0 attempts in 13:56:01Z–14:14:02Z).
- Photo (designated sessions): 7 attempts — TP27 / FP7 / FN6, P .794, R .818, exact-board 2/7, expiries 0. Session 1 (4 attempts, token): car board failed TP2 / FP6 / FN1 (sliver), bicycle board failed TP4 / FP1 / FN0, car board failed TP1 / FP0 / FN1 (sliver), then a bicycle board passed perfect (TP4). Session 2 (3 attempts, token): motorcycle board failed TP11 / FP0 / FN3 (partial x3), car board failed TP3 / FP0 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), then a fire-hydrant board passed perfect (TP2).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP5 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bicycle board pass; dynamic replacements re-scanned until no tile matched, then Verify) with token.
- Photo run total: 7 attempts — TP27 / FP7 / FN6, P .794, R .818, exact-board 2/7, expiries 0.
- Running per-brief photo totals: v2 = 1113 attempts — TP4294 / FP480 / FN859, P .899, R .833, exact-board 489/1113, expiries 72 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1135 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1113 = 1131) — the pre-existing gap noted at Runs #97–#247, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were inactive (tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://13e2c75e5d8f2b.lhr.life) verified HTTP 200 (local 200 too) before any play. Post-run both units were active and the tunnel verified HTTP 200 again. The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on photo boards — 7 FPs this run, 6 of them on the first car board (FP6 in one attempt) — plus sliver/partial under-selection (all 6 photo FNs: sliver x3, partial x3).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .918 below the .95 bar, R .795 well below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 72/1185 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~07:25 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #249 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #248's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T14:31:33Z–14:42:18Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #248 and this run (server check: 0 attempts in 14:25:05Z–14:31:32Z).
- Photo (designated sessions): 3 attempts — TP8 / FP0 / FN2, P 1.000, R .800, exact-board 2/3, expiries 0. Session 1: bicycle board passed perfect (TP2; 1 ambiguity error recorded by the server, excluded from scoring) with token. Session 2: bicycle board failed TP2 / FP0 / FN2 (sliver, partial; 1 ambiguity error, excluded), then a car board passed perfect (TP4; 1 ambiguity error, excluded) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 2 attempts — TP10 / FP1 / FN0, P .909, R 1.000, exact-board 1/2, expiries 0. Bicycle board failed TP5 / FP1 / FN0, then a motorcycle board passed perfect (TP5) with token.
- Photo run total: 3 attempts — TP8 / FP0 / FN2, P 1.000, R .800, exact-board 2/3, expiries 0.
- Running per-brief photo totals: v2 = 1116 attempts — TP4302 / FP480 / FN861, P .900, R .833, exact-board 491/1116, expiries 72 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1138 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1116 = 1134) — the pre-existing gap noted at Runs #97–#248, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://13e2c75e5d8f2b.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on a photo bicycle board — both photo FNs were on that board (sliver x1, partial x1); zero photo FPs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .915 below the .95 bar, R .789 well below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 72/1188 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~07:42 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #250 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #249's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T14:52:06Z–15:00:26Z, source live-agent, 5 attempts total (4 scored, 1 unscored expired). No intervening unlogged attempts between Run #249 and this run (server check: 0 attempts in 14:42:19Z–14:52:05Z).
- Photo (designated sessions): 3 scored attempts — TP15 / FP1 / FN0, P .938, R 1.000, exact-board 2/3, expiries 1. Session 1 (1 attempt, token): car board passed perfect (TP8). Session 2 (2 scored attempts + 1 expiry, token): motorcycle board failed TP5 / FP1 / FN0, a car round expired unscored (challenge_expired), then a car board passed perfect (TP2).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (mountain board passed perfect) with token.
- Photo run total: 3 attempts — TP15 / FP1 / FN0, P .938, R 1.000, exact-board 2/3, expiries 1.
- Running per-brief photo totals: v2 = 1119 attempts — TP4317 / FP481 / FN861, P .900, R .834, exact-board 493/1119, expiries 73. Server cross-check: all-era scored photo attempts = 1141 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1119 = 1137) — the pre-existing gap noted at Runs #97–#249, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://13e2c75e5d8f2b.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: a single false pick on a photo motorcycle board (FP1) plus one challenge expiry in session 2 — zero photo FNs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .913 below the .95 bar, R .820 below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 73/1192 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~08:02 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #251 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #250's force_type_b). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T15:10:01Z–15:14:30Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #250 and this run (server check: 0 attempts in 15:00:27Z–15:10:00Z).
- Photo (designated sessions): 3 attempts — TP6 / FP1 / FN0, P .857, R 1.000, exact-board 2/3, expiries 0. Session 1: car board passed perfect (TP1) with token. Session 2: traffic-light board failed TP3 / FP1 / FN0, then a fire-hydrant board passed perfect (TP2) with token.
- Rotating (natural, synthetic Type B): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (fire-hydrant board passed perfect) with token.
- Photo run total: 3 attempts — TP6 / FP1 / FN0, P .857, R 1.000, exact-board 2/3, expiries 0.
- Running per-brief photo totals: v2 = 1122 attempts — TP4323 / FP482 / FN861, P .900, R .834, exact-board 495/1122, expiries 73 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1144 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1122 = 1140) — the pre-existing gap noted at Runs #97–#250, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://13e2c75e5d8f2b.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired once at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: a single false pick on a photo traffic-light board (FP1 in one attempt) — zero photo FNs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .899 below the .95 bar, R .852 below the .95 bar, exact-board 15/30 = 50.0% below the 90% bar; v2 photo expiry rate overall 73/1195 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~08:15 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #252 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #251's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T15:30:02Z–15:44:01Z, source live-agent, 7 attempts total (6 scored, 1 unscored expired). No intervening unlogged attempts between Run #251 and this run (server check: 0 attempts in 15:14:31Z–15:30:01Z).
- Photo (designated sessions): 5 scored attempts — TP17 / FP2 / FN1, P .895, R .944, exact-board 2/5, expiries 1. Session 1 (2 attempts, token): traffic-light board failed TP2 / FP1 / FN0, then a bicycle board passed perfect (TP4). Session 2 (3 scored attempts + 1 expiry, token): motorcycle board failed TP5 / FP1 / FN0, bus board failed TP5 / FP0 / FN1, a car round expired unscored (challenge_expired), then a car board passed perfect (TP1).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP3 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bridge board passed perfect) with token.
- Photo run total: 5 attempts — TP17 / FP2 / FN1, P .895, R .944, exact-board 2/5, expiries 1.
- Running per-brief photo totals: v2 = 1127 attempts — TP4340 / FP484 / FN862, P .900, R .834, exact-board 497/1127, expiries 74. Server cross-check: all-era scored photo attempts = 1149 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1127 = 1145) — the pre-existing gap noted at Runs #97–#251, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://13e2c75e5d8f2b.lhr.life verified HTTP 200, local 200 too). No CAPTCHA-preference pause was reported in this run; all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on photo boards (FP1 on a traffic-light board and FP1 on a motorcycle board) plus one missed tile on a bus board (FN1), with one challenge expiry in session 2.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .887 below the .95 bar, R .864 below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 74/1201 = 6.1%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~08:44 PDT on 2026-10-14; the PM summary was already delivered with Run #218 — marker `Summary delivered: 2026-10-13 PM` — and the AM summary is not due until the first completed run after 09:00 PDT on 2026-10-14). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #253 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #252's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T15:50:41Z–16:04:49Z, source live-agent, 5 scored attempts total, plus 1 unscored expired photo attempt. No intervening unlogged attempts between Run #252 and this run (server check: 0 attempts in 15:44:02Z–15:50:40Z).
- Photo (designated sessions): 4 attempts — TP18 / FP1 / FN2, P .947, R .900, exact-board 2/4, expiries 1. Session 1 (3 scored attempts + 1 expiry, token): car board failed TP1 / FP0 / FN1 (partial), a car round expired unscored (challenge_expired), fire-hydrant board failed TP1 / FP1 / FN1 (partial), then a car board passed perfect (TP11). Session 2 (1 attempt, token): car board passed perfect (TP5; 1 ambiguity error recorded by the server, excluded from scoring).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (chimney board pass; dynamic replacements re-scanned until no tile matched, then Verify) with token.
- Photo run total: 4 attempts — TP18 / FP1 / FN2, P .947, R .900, exact-board 2/4, expiries 1.
- Running per-brief photo totals: v2 = 1131 attempts — TP4358 / FP485 / FN864, P .900, R .834, exact-board 499/1131, expiries 75. Server cross-check: all-era scored photo attempts = 1153 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1131 = 1149) — the pre-existing gap noted at Runs #97–#252, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://13e2c75e5d8f2b.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial under-selection on photo boards — both photo FNs were partial misses (car x1, fire hydrant x1) — plus 1 false pick on the fire-hydrant board and 1 challenge expiry in session 1.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .893 below the .95 bar, R .886 below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 75/1206 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired. A twice-daily summary WAS due and is delivered with this run (this run completed at ~09:05 PDT on 2026-10-14, the first completed run after 09:00 PDT on 2026-10-14; the previous summary was the PM summary delivered with Run #218). Summary delivered: 2026-10-14 AM. Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #254 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #253's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T16:16:19Z–16:27:04Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #253 and this run (server check: 0 attempts in 16:04:50Z–16:16:18Z).
- Photo (designated sessions): 6 attempts — TP24 / FP6 / FN5, P .800, R .828, exact-board 2/6, expiries 0. Session 1 (2 attempts, token): car board failed TP4 / FP0 / FN3 (partial x2, sliver x1; 1 ambiguity error recorded by the server, excluded from scoring), then a traffic-light board passed perfect (TP4). Session 2 (4 attempts, token): traffic-light board failed TP1 / FP1 / FN1 (sliver), car board failed TP6 / FP3 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), motorcycle board failed TP3 / FP2 / FN0, then a fire-hydrant board passed perfect (TP6).
- Rotating (force_type_b, synthetic Type B): 2 attempts — TP13 / FP1 / FN0, P .929, R 1.000, exact-board 1/2, expiries 0. Fire-hydrant board failed TP7 / FP1 / FN0, then a mountain board passed perfect (TP6) with token.
- Photo run total: 6 attempts — TP24 / FP6 / FN5, P .800, R .828, exact-board 2/6, expiries 0.
- Running per-brief photo totals: v2 = 1137 attempts — TP4382 / FP491 / FN869, P .899, R .835, exact-board 501/1137, expiries 75 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1159 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1137 = 1155) — the pre-existing gap noted at Runs #97–#253, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were MISSING (VM replaced — systemctl reported units not found, tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://13e2c75e5d8f2b.lhr.life) verified HTTP 200 (local 200 too) before any play. CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on photo boards in session 2 (FP6 across traffic-light, car, and motorcycle boards) plus sliver/partial under-selection (FN5: car partial x2 / sliver x1, traffic-light sliver x1, car sliver x1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .904 below the .95 bar, R .883 below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 75/1212 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~09:28 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #255 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #254's force_type_b). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T16:34:43Z–16:37:31Z, source live-agent, 2 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #254 and this run (server check: 0 attempts in 16:27:05Z–16:34:42Z).
- Photo (designated sessions): 2 attempts — TP15 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: car board passed perfect (TP8) with token. Session 2: car board passed perfect (TP7; 1 ambiguity error recorded by the server, excluded from scoring) with token.
- Rotating (natural, checkbox-only): 0 attempts — no challenge round was served; verification completed directly on the checkbox, token issued. Counts as a token only, never as perception data.
- Photo run total: 2 attempts — TP15 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0.
- Running per-brief photo totals: v2 = 1139 attempts — TP4397 / FP491 / FN869, P .900, R .835, exact-board 503/1139, expiries 75 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1161 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1139 = 1157) — the pre-existing gap noted at Runs #97–#254, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://13e2c75e5d8f2b.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none this run — both photo boards were exact with zero FPs and zero FNs.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .918 below the .95 bar, R .898 below the .95 bar, exact-board 16/30 = 53.3% below the 90% bar; v2 photo expiry rate overall 75/1214 = 6.2%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~09:38 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #257 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #255's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T17:58:36Z–18:10:29Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts. Intervening unlogged attempts between Run #255 and this run are reconciled in the note below (server check: 9 attempts in 16:37:32Z–17:56:00Z, all from the presumed Run #256).
- Photo (designated sessions): 6 attempts — TP32 / FP1 / FN8, P .970, R .800, exact-board 2/6, expiries 0. Session 1 (1 attempt, token): fire-hydrant board passed perfect (TP8). Session 2 (5 attempts, token): car board failed TP5 / FN3 (sliver x2, partial), car board failed TP3 / FP1 / FN1 (sliver), car board failed TP6 / FN2 (sliver, partial), bus board failed TP8 / FN2 (partial x2), then a car board passed perfect (TP2).
- Rotating (force_dynamic, synthetic Type A dynamic): 2 attempts — TP6 / FP0 / FN1, P 1.000, R .857, exact-board 1/2, expiries 0. Crosswalk board failed TP0 / FN1 (partial; empty initial read, server scored 1 positive tile), then a fire-hydrant board passed perfect (TP6) with token; dynamic replacements were re-scanned until no tile matched before Verify.
- Photo run total: 6 attempts — TP32 / FP1 / FN8, P .970, R .800, exact-board 2/6, expiries 0.
- Running per-brief photo totals (server-reconciled, incl. the unlogged intervening run below): v2 = 1150 attempts — TP4459 / FP495 / FN881, P .900, R .835, exact-board 506/1150, expiries 79. Server cross-check: all-era scored photo attempts = 1172 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1150 = 1168) — the pre-existing gap noted at Runs #97–#255, unchanged.
- RECONCILIATION NOTE — unlogged intervening run (presumed Run #256): server records show 3 photo sessions at 2026-10-14T16:51:59Z–17:44:03Z (after Run #255, before this run) that were NOT in TRAINING_LOG at this run's pre-flight or at logging time, with no rotating session recorded and only 1 session passing (token): 5 scored photo attempts — TP30 / FP3 / FN4, P .909, R .882, exact-board 1/5 (traffic_light TP2 / FP1; bicycle TP2 / FN2 partial x2, 2 ambiguity errors excluded from scoring; bus TP6 perfect pass; bicycle TP12 / FN1 sliver; bus TP8 / FP2 / FN1 partial), plus 4 unscored challenge_expired attempts (traffic_light x2, bus x1, and 1 more traffic_light in the final session). This run is numbered #257 chronologically. If that run is logged later, do NOT re-add its attempts to the totals: the running totals above already include them.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://13e2c75e5d8f2b.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 8 photo FNs this run were sliver (x4) or partial (x4) misses, concentrated in session 2's car boards (FN6 across 3 car boards) plus a bus board (FN2); 1 false pick on a car board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .910 below the .95 bar, R .876 below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 79/1229 = 6.4%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~11:11 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #259 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #257's force_dynamic). Sessions: 4 played (1 replacement rotating session added after the original rotating session was lost to a tunnel death), 3 tokens, 1 session lost to infrastructure.
Window arbitrated: 2026-10-14T19:19:45Z–19:52:07Z, source live-agent, 4 scored attempts total, plus 2 unscored expired photo attempts. Intervening unlogged attempts between Run #257 and this run are reconciled in the note below (server check: 2 attempts in 18:16:48Z–19:00:07Z, all from the presumed Run #258).
- Photo (designated sessions): 3 attempts — TP12 / FP2 / FN0, P .857, R 1.000, exact-board 2/3, expiries 2. Session 1 (1 attempt, token): fire-hydrant board passed perfect (TP6). Session 2 (2 scored attempts + 2 expiries, token): a car round expired unscored (challenge_expired), a second car round expired unscored (challenge_expired), a car board failed TP2 / FP2 / FN0, then a bicycle board passed perfect (TP4).
- Rotating (force_low_trust, synthetic Type A dynamic): original session served a bridge round but recorded 0 attempts — lost when the tunnel died (agent reported a stuck tile, then "no tunnel" on reload and on the base URL; unscored, replaced per protocol). Replacement session (1 attempt, token): bridge board passed perfect TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (dynamic replacements re-scanned until no tile matched, then Verify).
- Photo run total: 3 attempts — TP12 / FP2 / FN0, P .857, R 1.000, exact-board 2/3, expiries 2.
- Running per-brief photo totals (server-reconciled, incl. the unlogged intervening run below): v2 = 1153 attempts — TP4471 / FP497 / FN881, P .900, R .835, exact-board 508/1153, expiries 83. Server cross-check: all-era scored photo attempts = 1175 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1153 = 1171) — the pre-existing gap noted at Runs #97–#257, unchanged.
- RECONCILIATION NOTE — unlogged intervening run (presumed Run #258): server records show 1 photo session at 2026-10-14T18:16:48Z–19:00:07Z (after Run #257, before this run) that was NOT in TRAINING_LOG at this run's pre-flight or at logging time, with no rotating session recorded and no token: 0 scored photo attempts, plus 2 unscored challenge_expired photo attempts (fire_hydrant, car). This run is numbered #259 chronologically. If that run is logged later, do NOT re-add its attempts to the totals: the running totals above already include its 2 expiries.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were active, tunnel URL from LIVE_URL.txt https://7c8fe9e14a256a.lhr.life verified HTTP 200 (local 200 too). Mid-run the tunnel died during the original rotating session; at post-session check both systemd units were MISSING (VM replaced — systemctl reported units not found, tunnel returned 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://7c8fe9e14a256a.lhr.life, same URL) verified HTTP 200 (local 200 too), and the lost rotating session was replaced there and tokened. CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported in either browser task.
- Dominant failure mode: false picks on a single photo car board (FP2 in one attempt) plus 2 challenge expiries on photo car rounds in session 2 — zero photo FNs this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .912 below the .95 bar, R .880 below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 83/1236 = 6.7%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired (the gym WAS revived and the run played, so trigger (d) does not apply) and no twice-daily summary was due (this run completed at ~12:52 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #260 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #259's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T20:00:27Z–20:10:24Z, source live-agent, 8 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #259 and this run (server check: 0 attempts in 19:52:08Z–20:00:26Z).
- Photo (designated sessions): 7 attempts — TP23 / FP7 / FN4, P .767, R .852, exact-board 2/7, expiries 0. Session 1 (4 attempts, token): bicycle board failed TP1 / FP1 / FN0, car board failed TP4 / FP3 / FN0, motorcycle board failed TP6 / FP0 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), then a traffic-light board passed perfect (TP2; 1 ambiguity error recorded by the server, excluded from scoring). Session 2 (3 attempts, token): car board failed TP6 / FP3 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), car board failed TP0 / FP0 / FN2 (partial + sliver, empty_submission procedure error), then a car board passed perfect (TP4; 1 ambiguity error recorded by the server, excluded from scoring).
- Photo (rotating session also served 1 photo round; counted here — same brief, corpus-split): bus board passed perfect TP8 / FP0 / FN0 (1 ambiguity error recorded by the server, excluded from scoring) with token. No synthetic scored attempts this run — the rotating force_type_b session served a photo-corpus board.
- Photo run total: 8 attempts — TP31 / FP7 / FN4, P .816, R .886, exact-board 3/8, expiries 0.
- Running per-brief photo totals: v2 = 1161 attempts — TP4502 / FP504 / FN885, P .899, R .836, exact-board 511/1161, expiries 83 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1183 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1161 = 1179) — the pre-existing gap noted at Runs #97–#259, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://7c8fe9e14a256a.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on photo boards — FP7 total (FP3 on each of two failed car boards, plus FP1 on the bicycle board) — plus sliver/partial under-selection (FN4: motorcycle sliver x1, car sliver x1, car partial + sliver x1 in an empty submission).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .883 below the .95 bar, R .873 below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 83/1244 = 6.7%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~13:11 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #261 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #260's force_type_b). Sessions: 4 played (1 natural session lost to a tunnel death and replaced), 3 tokens, 1 lost to infrastructure.
Window arbitrated: 2026-10-14T20:21:31Z–20:42:25Z, source live-agent, 4 scored attempts total, plus 1 unscored expired photo attempt. No intervening unlogged attempts between Run #260 and this run (server check: 0 attempts in 20:10:25Z–20:21:30Z).
- Photo (designated sessions): 3 attempts — TP8 / FP0 / FN1, P 1.000, R .889, exact-board 2/3, expiries 1. Session 1: traffic-light round expired unscored (challenge_expired), then a car board passed perfect (TP2) with token. Session 2: fire-hydrant board failed TP2 / FP0 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), then a car board passed perfect (TP4) with token.
- Rotating (natural, synthetic Type A static): 1 attempt — TP2 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bus board pass) with token. The first natural attempt never reached the server (tunnel death — unscored, replaced per protocol after the gym was revived).
- Running per-brief photo totals: v2 = 1164 attempts — TP4510 / FP504 / FN886, P .899, R .836, exact-board 513/1164, expiries 84. Server cross-check: all-era scored photo attempts = 1186 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1164 = 1182) — the pre-existing gap noted at Runs #97–#260, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were active and the tunnel URL from LIVE_URL.txt (https://7c8fe9e14a256a.lhr.life) was verified HTTP 200 (local 200 too). Mid-run the tunnel died before session 3 and both systemd units were then found MISSING (VM replaced). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, and the same tunnel URL was verified HTTP 200 (local 200 too) before the replacement session was played. The known CAPTCHA-preference glitch fired at spawn on the first task; it was verified via get_captcha_preference (solve/all_tasks) and steered twice, then played. The replacement task played clean with no pause.
- Dominant failure mode: a single sliver miss on the photo fire-hydrant board (the run's only FN) plus the 180 s expiry of the photo traffic-light round (unsubmitted, unscored) — zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .888 below the .95 bar, R .888 below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 84/1248 = 6.7%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired (the gym WAS revived and the run played, so trigger (d) does not apply) and no twice-daily summary was due (this run completed at ~13:42 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #262 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #261's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T20:46:59Z–20:59:58Z, source live-agent, 9 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #261 and this run (server check: 0 attempts in 20:42:26Z–20:45:08Z).
- Photo (designated sessions): 8 attempts — TP23 / FP4 / FN9, P .852, R .719, exact-board 2/8, expiries 0. Session 1 (4 attempts, token): car board failed TP0 / FP0 / FN2 (partial + sliver, empty_submission procedure error), car board failed TP2 / FP1 / FN1 (partial), bus board failed TP7 / FP0 / FN2 (partial x2; 1 ambiguity error recorded by the server, excluded from scoring), then a traffic-light board passed perfect (TP2). Session 2 (4 attempts, token): car board failed TP4 / FP2 / FN0, fire-hydrant board failed TP5 / FP0 / FN3 (partial x2, sliver), car board failed TP1 / FP1 / FN1 (sliver), then a traffic-light board passed perfect (TP2; 1 ambiguity error recorded by the server, excluded from scoring).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP8 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bus board pass; dynamic replacements re-scanned across 3 passes until no tile matched, then Verify) with token.
- Photo run total: 8 attempts — TP23 / FP4 / FN9, P .852, R .719, exact-board 2/8, expiries 0.
- Running per-brief photo totals: v2 = 1172 attempts — TP4533 / FP508 / FN895, P .899, R .835, exact-board 515/1172, expiries 84 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1194 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1172 = 1190) — the pre-existing gap noted at Runs #97–#261, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://7c8fe9e14a256a.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 9 photo FNs were partial (x6) or sliver (x3), including one empty submission on the first car board; plus FP4 across two car boards and one further car board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .887 below the .95 bar, R .840 below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo expiry rate overall 84/1256 = 6.7%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~14:00 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #263 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #262's force_dynamic). Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 3 ended in terminal cooldown ("Too many attempts") after 1 failed round.
Window arbitrated: 2026-10-14T21:06:39Z–21:10:18Z, source live-agent, 3 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #262 and this run (server check: 0 attempts in 20:59:59Z–21:06:38Z).
- Photo (designated sessions): 2 attempts — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0. Session 1: fire-hydrant board passed perfect (TP2) with token. Session 2: car board passed perfect (TP4) with token.
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP3 / FP1 / FN0, P .750, R 1.000, exact-board 0/1, expiries 0 (car board failed; 2 ambiguity errors recorded by the server, excluded from scoring; dynamic replacements re-scanned before Verify; session then ended in terminal cooldown, no token).
- Photo run total: 2 attempts — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 0.
- Running per-brief photo totals: v2 = 1174 attempts — TP4539 / FP508 / FN895, P .899, R .835, exact-board 517/1174, expiries 84 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1196 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1174 = 1192) — the pre-existing gap noted at Runs #97–#262, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://7c8fe9e14a256a.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: none on photo boards — both photo boards were exact with zero FPs and zero FNs; the run's only error was a single false pick on the synthetic dynamic car board (FP1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .889 below the .95 bar, R .836 below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 84/1258 = 6.7%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~14:11 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #264 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #263's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T21:18:16Z–21:33:39Z, source live-agent, 9 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #263 and this run (server check: 0 attempts in 21:10:19Z–21:18:15Z).
- Photo (designated sessions): 7 attempts — TP48 / FP4 / FN11, P .923, R .814, exact-board 2/7, expiries 0. Session 1 (4 attempts, token): bus board failed TP6 / FN1 (partial), motorcycle board failed TP11 / FN3 (sliver, partial x2), car board failed TP1 / FN2 (sliver x2), then a car board passed perfect (TP1). Session 2 (3 attempts, token): motorcycle board failed TP10 / FN4 (partial x3, sliver), bicycle board failed TP3 / FP4 / FN1 (partial), then a motorcycle board passed perfect (TP16).
- Rotating (force_type_b, synthetic Type B): 2 attempts — TP11 / FP0 / FN1, P 1.000, R .917, exact-board 1/2, expiries 0 (bus board failed TP4 / FN1 (sliver), then a bridge board passed perfect (TP7) with token).
- Photo run total: 7 attempts — TP48 / FP4 / FN11, P .923, R .814, exact-board 2/7, expiries 0.
- Running per-brief photo totals: v2 = 1181 attempts — TP4587 / FP512 / FN906, P .900, R .835, exact-board 519/1181, expiries 84 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1203 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1181 = 1199) — the pre-existing gap noted at Runs #97–#263, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none during play (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://7c8fe9e14a256a.lhr.life verified HTTP 200, local 200 too). Post-run the systemd units were found missing (VM-replacement symptom — systemctl reported units not found, tunnel 502, local port dead); revived per protocol after play: tools/install_services.sh reinstalled and enabled both units, services started, tunnel URL https://7c8fe9e14a256a.lhr.life verified HTTP 200 (local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 11 photo FNs were partial (x7) or sliver (x4); plus FP4 concentrated on a single photo bicycle board.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .878 below the .95 bar, R .830 below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 84/1265 = 6.6%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~14:33 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #265 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #264's force_type_b). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T21:52:49Z–22:01:50Z, source live-agent, 7 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #264 and this run (server check: 0 attempts in 21:33:40Z–21:52:48Z).
- Photo (designated sessions): 7 attempts — TP20 / FP7 / FN3, P .741, R .870, exact-board 2/7, expiries 0. Session 1 (1 attempt, token): bicycle board passed perfect (TP2). Session 2 (6 attempts, token): car board failed TP6 / FP3 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), car board failed TP3 / FP0 / FN1 (partial), car board failed TP1 / FP2 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), car board failed TP2 / FP0 / FN1 (partial), car board failed TP4 / FP2 / FN0, then a car board passed perfect (TP2).
- Rotating (natural): checkbox-only pass, token only — no perception data, not counted in any scored total.
- Photo run total: 7 attempts — TP20 / FP7 / FN3, P .741, R .870, exact-board 2/7, expiries 0.
- Running per-brief photo totals: v2 = 1188 attempts — TP4607 / FP519 / FN909, P .899, R .835, exact-board 521/1188, expiries 84 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1210 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1188 = 1206) — the pre-existing gap noted at Runs #97–#264, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://7c8fe9e14a256a.lhr.life verified HTTP 200, local 200 too). The known CAPTCHA-preference glitch fired at spawn; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on photo car boards — all 7 FPs came from session 2's car boards (FP3, FP2, and FP2 across three failed attempts); plus sliver/partial under-selection (FN3: sliver x1, partial x2, all on car boards).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .886 below the .95 bar, R .818 below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 84/1272 = 6.6%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~15:02 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #266 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #265's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T22:34:28Z–22:40:48Z, source live-agent, 5 scored attempts total, plus 1 unscored expired photo attempt. No intervening unlogged attempts between Run #265 and this run (server check: 0 attempts in 22:01:51Z–22:34:27Z).
- Photo (designated sessions): 4 attempts — TP24 / FP1 / FN1, P .960, R .960, exact-board 2/4, expiries 1. Session 1 (3 scored attempts, token): car round expired unscored (challenge_expired), bus board failed TP6 / FP0 / FN1 (partial; 2 ambiguity errors recorded by the server, excluded from scoring), bicycle board failed TP4 / FP1 / FN0, then a fire-hydrant board passed perfect (TP2; 2 ambiguity errors recorded by the server, excluded from scoring). Session 2: bus board passed perfect (TP12) with token.
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (stairs board pass; dynamic replacements re-scanned across multiple passes until no tile matched, then Verify) with token.
- Photo run total: 4 attempts — TP24 / FP1 / FN1, P .960, R .960, exact-board 2/4, expiries 1.
- Running per-brief photo totals: v2 = 1192 attempts — TP4631 / FP520 / FN910, P .899, R .836, exact-board 523/1192, expiries 85. Server cross-check: all-era scored photo attempts = 1214 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1192 = 1210) — the pre-existing gap noted at Runs #97–#265, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://7c8fe9e14a256a.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: mixed small errors on photo boards — one partial miss on the bus board (the run's only FN) and one false pick on the bicycle board (the run's only FP), plus the 180 s expiry of the photo car round (unsubmitted, unscored).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .888 below the .95 bar, R .836 below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo expiry rate overall 85/1277 = 6.7%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~15:41 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #267 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #266's force_dynamic). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-14T22:49:15Z–22:52:38Z, source live-agent, 4 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #266 and this run (server check: 0 attempts in 22:40:49Z–22:49:14Z).
- Photo (designated sessions): 3 attempts — TP5 / FP0 / FN2, P 1.000, R .714, exact-board 2/3, expiries 0. Session 1 (1 attempt, token): car board passed perfect (TP2). Session 2 (2 attempts, token): car board failed TP2 / FP0 / FN2 (partial x2), then a car board passed perfect (TP1).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt — TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (traffic-light board pass; the single matching tile was clicked, its replacement (stairs, no traffic light) was re-scanned across the whole grid, then Verify) with token.
- Photo run total: 3 attempts — TP5 / FP0 / FN2, P 1.000, R .714, exact-board 2/3, expiries 0.
- Running per-brief photo totals: v2 = 1195 attempts — TP4636 / FP520 / FN912, P .899, R .836, exact-board 525/1195, expiries 85 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1217 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1195 = 1213) — the pre-existing gap noted at Runs #97–#266, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://7c8fe9e14a256a.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial under-selection on photo boards — both photo FNs were partial misses on a single car board in session 2; zero FPs across all corpora this run.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .887 below the .95 bar, R .840 below the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo expiry rate overall 85/1280 = 6.6%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~15:53 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #268 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #267's force_low_trust). Sessions: 4 played (1 original photo session lost to a tunnel death and replaced; the 3 replacement sessions were played fresh after revival), 3 tokens, 1 lost to infrastructure.
Window arbitrated: 2026-10-14T23:11:41Z–23:21:54Z, source live-agent, 3 scored attempts total, plus 1 unscored expired photo attempt. No intervening unlogged attempts between Run #267 and this run (server check: 0 attempts in 22:52:39Z–23:11:40Z; all 4 attempts in the window are this run's).
- Photo (designated sessions): 2 attempts — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 1. Original session (lost to infrastructure): a car round expired unscored (challenge_expired), then a second car round never reached the server before the tunnel died (unscored, session replaced per protocol). Replacement session 1: car board passed perfect (TP2) with token. Replacement session 2: traffic-light board passed perfect (TP2) with token.
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (bus board pass) with token.
- Photo run total: 2 attempts — TP4 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2, expiries 1.
- Running per-brief photo totals: v2 = 1197 attempts — TP4640 / FP520 / FN912, P .899, R .836, exact-board 527/1197, expiries 86. Server cross-check: all-era scored photo attempts = 1219 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1197 = 1215) — the pre-existing gap noted at Runs #97–#267, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were active, tunnel URL from LIVE_URL.txt https://7c8fe9e14a256a.lhr.life verified HTTP 200 (local 200 too). Mid-run the tunnel died during the original session 1 (agent reported expired rounds, then "no tunnel" on reload and on sessions 2–3); both systemd units were then found MISSING (VM replaced — systemctl reported units not found, tunnel 502, local port dead). Revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://7c8fe9e14a256a.lhr.life, same URL) verified HTTP 200 (local 200 too), and all 3 sessions were replayed fresh in the same browser task and tokened. CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported in either play pass.
- Dominant failure mode: none in scored play this run — zero FPs and zero FNs across all corpora; all 3 scored boards were exact. The only loss was the 180 s expiry of the original photo car round (unsubmitted, unscored) before the tunnel death.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .890 below the .95 bar, R .852 below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 86/1283 = 6.7%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired (the gym WAS revived and the run played, so trigger (d) does not apply) and no twice-daily summary was due (this run completed at ~16:22 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #269 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (natural, next in rotation after Run #268's force_type_b). Sessions: 3 played in the scored pass, 3 tokens, 0 lost to infrastructure in that pass; plus 1 earlier session created in the first browser task that produced no attempts and was abandoned after two refused CAPTCHA-preference steers (see infra incidents).
Window arbitrated: 2026-10-14T23:41:00Z–23:57:54Z, source live-agent, 12 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #268 and this run (server check: 0 attempts in 23:21:55Z–23:40:59Z).
- Photo (designated sessions): 11 attempts — TP46 / FP7 / FN11, P .868, R .807, exact-board 2/11, expiries 0. Session 1 (6 attempts, token): car board failed TP4 / FP1 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), bicycle board failed TP6 / FP1 / FN4 (sliver x2, partial x2), fire-hydrant board failed TP2 / FP0 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), bus board failed TP9 / FP1 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), motorcycle board failed TP5 / FP1 / FN0, then a traffic-light board passed perfect (TP2). Session 2 (5 attempts, token): traffic-light board failed TP2 / FP1 / FN0, motorcycle board failed TP11 / FP0 / FN3 (sliver, partial x2), bicycle board failed TP0 / FP2 / FN1 (sliver), traffic-light board failed TP1 / FP0 / FN2 (partial, sliver), then a bicycle board passed perfect (TP4).
- Rotating (natural, synthetic Type A static): 1 attempt — TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (chimney board pass) with token.
- Photo run total: 11 attempts — TP46 / FP7 / FN11, P .868, R .807, exact-board 2/11, expiries 0.
- Running per-brief photo totals: v2 = 1208 attempts — TP4686 / FP527 / FN923, P .899, R .835, exact-board 529/1208, expiries 86 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1230 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1208 = 1226) — the pre-existing gap noted at Runs #97–#268, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: the known CAPTCHA-preference glitch fired repeatedly. The first browser task paused at Session 1, was verified via get_captcha_preference (solve/all_tasks) and steered, then reported the tunnel had died (Session 1 reload and Sessions 2–3 all showed "no tunnel", 0 rounds played), was steered a second time and paused again on the same dead tunnel, and was then closed and respawned per protocol; its one created session (23:27:15Z) produced no attempts and is unscored. After that task was closed, both systemd units were found inactive (tunnel 502, local port dead); revived per protocol: tools/install_services.sh reinstalled and enabled both units, services started, LIVE_URL.txt tunnel (https://7c8fe9e14a256a.lhr.life, same URL) verified HTTP 200 (local 200 too). The fresh respawned task also paused once at its first challenge; it was verified via get_captcha_preference (solve/all_tasks) and steered once, then all 3 sessions played clean in a single sequential browser task. Both systemd units were active at post-run check (tunnel and local HTTP 200).
- Dominant failure mode: sliver/partial under-selection on photo boards — all 11 photo FNs were sliver (x6) or partial (x5); plus false picks spread across photo boards (FP7, with FP2 concentrated on session 2's first bicycle board).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .871 below the .95 bar, R .853 below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo expiry rate overall 86/1294 = 6.6%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired (the gym WAS revived and the run played, so trigger (d) does not apply) and no twice-daily summary was due (this run completed at ~17:00 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #270 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_dynamic, next in rotation after Run #269's natural). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-15T00:08:05Z–00:16:57Z, source live-agent, 6 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #269 and this run (server check: 0 attempts in 23:57:55Z–00:08:04Z).
- Photo (designated sessions): 5 attempts — TP9 / FP1 / FN3, P .900, R .750, exact-board 2/5, expiries 0. Session 1 (1 attempt, token): car board passed perfect (TP4). Session 2 (4 attempts, token): car board failed TP2 / FP0 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), bicycle board failed TP0 / FP0 / FN2 (partial + sliver, empty_submission procedure error), bus board failed TP1 / FP1 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), then a fire-hydrant board passed (TP2; 1 ambiguity error recorded by the server, excluded from scoring).
- Rotating (force_dynamic, synthetic Type A dynamic): 1 attempt — TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (motorcycle board pass; dynamic replacement re-scanned until no tile matched, then Verify) with token.
- Photo run total: 5 attempts — TP9 / FP1 / FN3, P .900, R .750, exact-board 2/5, expiries 0.
- Running per-brief photo totals: v2 = 1213 attempts — TP4695 / FP528 / FN926, P .899, R .835, exact-board 531/1213, expiries 86 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1235 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1213 = 1231) — the pre-existing gap noted at Runs #97–#269, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://1057ae2e4f9b85.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver/partial under-selection on photo boards — all 3 photo FNs were sliver (x2) or partial (x1), including an empty submission on the bicycle board; plus a single false pick on the bus board (FP1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .885 below the .95 bar, R .840 below the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo expiry rate overall 86/1299 = 6.6%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~17:17 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #271 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_low_trust, next in rotation after Run #270's force_dynamic). Sessions: 9 created in the window (overlapping browser tasks opened extra photo sessions — see infra incidents), 4 tokens, 0 lost to infrastructure. Passed sessions: ses_04ff5a19, ses_c02e14ae, ses_21bc38c1, ses_a45c42af (all photo).
Window arbitrated: 2026-10-15T00:22:25Z–00:32:12Z, source live-agent, 7 scored attempts total, plus 3 unscored expired attempts. No intervening unlogged attempts between Run #270 and this run (server check: 0 attempts in 00:16:58Z–00:22:24Z).
- Photo (designated sessions): 7 attempts — TP32 / FP2 / FN3, P .941, R .914, exact-board 4/7, expiries 1. Session ses_a45c42af (4 attempts, token): car board failed TP0 / FP0 / FN2 (partial + sliver, empty_submission procedure error), bicycle board failed TP3 / FP0 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), car board failed TP1 / FP2 / FN0 (1 ambiguity error recorded by the server, excluded from scoring), then a traffic-light board passed perfect (TP3). Session ses_04ff5a19: car board passed perfect (TP11) with token. Session ses_c02e14ae: bus board passed perfect (TP12) with token. Session ses_21bc38c1: car board passed (TP2; 1 ambiguity error recorded by the server, excluded from scoring) with token. One further photo session (ses_b68cc05a, motorcycle round) expired unscored (challenge_expired); two more photo sessions (ses_2db04fae, ses_963292ea) were created and reached checkbox/challenge stage but recorded no attempt before the run was closed.
- Rotating (force_low_trust, synthetic Type A dynamic): 0 scored attempts, expiries 2, 0 tokens. Session ses_cbb8e127: bus round expired unscored (challenge_expired), session re-checked the box for a further round that recorded no attempt. Session ses_c2a2d109: crosswalk round expired unscored (challenge_expired), session re-checked the box and recorded no further attempt.
- Photo run total: 7 attempts — TP32 / FP2 / FN3, P .941, R .914, exact-board 4/7, expiries 1.
- Running per-brief photo totals: v2 = 1220 attempts — TP4727 / FP530 / FN929, P .899, R .836, exact-board 535/1220, expiries 87. Server cross-check: all-era scored photo attempts = 1242 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1220 = 1238) — the pre-existing gap noted at Runs #97–#270, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight, tunnel URL from LIVE_URL.txt https://1057ae2e4f9b85.lhr.life verified HTTP 200, local 200 too). Browser-task layer was chaotic this run: the first task failed on tile clicks (screenshot-ID error) and reported no scored play, a second task's reported rounds/times did not match the server record, and multiple tasks were found still running concurrently on the shared browser profile, opening overlapping sessions and delivering premature reports whose claimed successes were NOT in attempts.jsonl. All scoring above is server-arbitrated only; agent self-reports were discarded where they conflicted. The known CAPTCHA-preference glitch fired on two tasks; each was verified via get_captcha_preference (solve/all_tasks) and steered once, then played. All browser tasks were closed by the parent at 00:32Z to end the overlap; the window was re-arbitrated after a settle check with no further attempts landing.
- Dominant failure mode: mixed — sliver/partial under-selection on the first photo session (FN3, incl. one empty submission) plus a single FP2 car board in the same session; the rotating sessions' only losses were 180 s expiries (unsubmitted, unscored), and one photo motorcycle round also expired unscored.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .917 below the .95 bar, R .853 below the .95 bar, exact-board 14/30 = 46.7% below the 90% bar; v2 photo expiry rate overall 87/1307 = 6.7%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~17:33 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #272 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating (force_type_b, next in rotation after Run #271's force_low_trust). Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-15T00:39:36Z–00:44:46Z, source live-agent, 5 scored attempts total, 0 unscored expired attempts. No intervening unlogged attempts between Run #271 and this run (server check: 0 attempts in 00:32:13Z–00:39:35Z).
- Photo (designated sessions): 4 attempts — TP18 / FP2 / FN1, P .900, R .947, exact-board 2/4, expiries 0. Session 1 (3 attempts, token): car board failed TP3 / FP0 / FN1 (sliver; 1 ambiguity error recorded by the server, excluded from scoring), bus board failed TP9 / FP2 / FN0, then a fire-hydrant board passed perfect (TP2). Session 2 (1 attempt, token): bus board passed perfect (TP4; 1 ambiguity error recorded by the server, excluded from scoring).
- Rotating (force_type_b, synthetic Type B): 1 attempt — TP6 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1, expiries 0 (car board pass) with token.
- Photo run total: 4 attempts — TP18 / FP2 / FN1, P .900, R .947, exact-board 2/4, expiries 0.
- Running per-brief photo totals: v2 = 1224 attempts — TP4745 / FP532 / FN930, P .899, R .836, exact-board 537/1224, expiries 87 (all from earlier v2 eras; 0 this run). Server cross-check: all-era scored photo attempts = 1246 (server arbitration from attempts.jsonl, bug-era excluded, live-agent), 4 more than the era-split log sum (v1 8 + v2.1 10 + v2 1224 = 1242) — the pre-existing gap noted at Runs #97–#271, unchanged.
- Brief governance: no candidate in validation; play continues on validated v2. No promotion/reversion. Stall-brake count unchanged (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units active at pre-flight and post-run, tunnel URL from LIVE_URL.txt https://1057ae2e4f9b85.lhr.life verified HTTP 200, local 200 too). CAPTCHA preference verified proactively via get_captcha_preference (solve/all_tasks) before play; no CAPTCHA pause was reported and all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: false picks on one photo bus board (FP2 in a single attempt), plus a single sliver miss on the photo car board (the run's only FN).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last 30 scored photo attempts): P .902 below the .95 bar, R .859 below the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo expiry rate overall 87/1311 = 6.6%, within the <=10% limit. No consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary was due (this run completed at ~17:45 PDT on 2026-10-14; the AM summary was already delivered with Run #253 — marker `Summary delivered: 2026-10-14 AM` — and the PM summary is not due until the first completed run after 21:00 PDT). Human baseline unchanged (human-ben — 3 sessions, 2 scored attempts total, 1 scored photo attempt TP12 / FP0 / FN0).

### Run #274 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating
(natural, next in rotation after Run #272's force_type_b; rotation based
on the last logged run, per the Run #10/#17 precedent). Sessions: 3
played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-15T01:13:42Z–01:26:40Z, source live-agent,
9 scored attempts total, plus 1 unscored expired photo attempt.
- Photo (designated sessions): 9 attempts — TP14 / FP3 / FN7, P .824,
  R .667, exact-board 2/9, expiries 1. Session 1 (5 scored attempts,
  token): bus failed TP1 / FN1 (partial), traffic_light failed
  TP0 / FN1 (empty_submission), motorcycle failed TP2 / FN2 (sliver,
  partial), traffic_light failed TP0 / FN2 (empty_submission), a car
  round expired unscored (challenge_expired), then a traffic_light
  board passed perfect (TP2). Session 2 (4 attempts, token): car
  failed TP1 / FP1 / FN1 (sliver), bicycle failed TP1 / FP1 / FN0,
  bicycle failed TP1 / FP1 / FN0, then a motorcycle board passed
  perfect (TP6).
- Rotating (natural): checkbox-only pass, token only — no perception
  data, not counted in any scored total.
- Photo run total: 9 attempts — TP14 / FP3 / FN7, P .824, R .667,
  exact-board 2/9, expiries 1.
- Running per-brief photo totals: v2 = 1234 attempts — TP4761 /
  FP542 / FN938, P .898, R .835, exact-board 539/1234, expiries 89.
  Server cross-check: all-era scored photo attempts = 1256 (server
  arbitration from attempts.jsonl, bug-era excluded, live-agent), 4
  more than the era-split log sum (v1 8 + v2.1 10 + v2 1234 = 1252)
  — the pre-existing gap noted at Runs #97–#272, unchanged.
- RECONCILIATION NOTE — unlogged intervening partial session
  (presumed Run #273): server records show 1 photo session created
  at 2026-10-15T00:48:17Z (after Run #272, before this run) that was
  NOT in TRAINING_LOG at this run's pre-flight or at logging time
  and never recorded a token or a session end: 1 scored photo attempt
  — car TP2 / FP7 / FN1, plus 1 unscored challenge_expired
  traffic_light attempt. The session showed no activity after
  00:55:03Z. This run is numbered #274 chronologically. Do NOT
  re-add its attempts: the running totals above already include
  them (1224 + 1 intervening + 9 this run = 1234).
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight and post-run, tunnel URL from LIVE_URL.txt
  https://1057ae2e4f9b85.lhr.life verified HTTP 200, local 200 too).
  CAPTCHA preference verified proactively via get_captcha_preference
  (solve/all_tasks) before play; no CAPTCHA pause was reported and
  all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: under-selection on photo boards in
  session 1 — 6 of the run's 7 FNs there, including 2
  empty_submission traffic_light boards (FN1 and FN2) and
  sliver/partial misses on the bus and motorcycle boards; plus
  1 false pick on each of session 2's 3 failed boards (FP3 total).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .843 below the .95 bar, R .812 below
  the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo
  expiry rate overall 89/1323 = 6.7%, within the <=10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~18:28 PDT on 2026-10-14; the AM
  summary was already delivered with Run #253 — marker
  `Summary delivered: 2026-10-14 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #275 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating
(force_dynamic, next in rotation after Run #274's natural). Sessions: 3
played, 3 tokens, 0 lost to infrastructure during play.
Window arbitrated: 2026-10-15T01:37:35Z–01:51:55Z, source live-agent,
7 scored attempts total, 0 unscored expired attempts. No intervening
unlogged attempts between Run #274 and this run (server check: 0
attempts in 01:26:41Z–01:37:34Z). An early spurious handoff claiming
all 3 sessions complete arrived while the task was still running and
the server window was still empty; it was discarded and all scoring
below is server-arbitrated only — the task's real completion at
01:52:26Z matched the server record in rounds, classes, and tokens.
- Photo (designated sessions): 5 attempts — TP31 / FP0 / FN3, P 1.000,
  R .912, exact-board 2/5, expiries 0. Session 1 (1 attempt, token):
  traffic-light board passed perfect (TP2; 2 ambiguity errors recorded
  by the server, excluded from scoring). Session 2 (4 attempts,
  token): bus board failed TP5 / FP0 / FN1 (partial), car board failed
  TP10 / FP0 / FN1 (partial), bicycle board failed TP12 / FP0 / FN1
  (partial), then a bicycle board passed perfect (TP2).
- Rotating (force_dynamic, synthetic Type A dynamic): 2 attempts —
  TP9 / FP0 / FN0, P 1.000, R 1.000, exact-board 2/2 by the server
  tool definition (FP0/FN0 scored), expiries 0. Fire-hydrant round
  recorded result=fail with scored TP7 / FP0 / FN0 (1 ambiguity error
  recorded by the server, excluded from scoring; fn_all=1 late
  replacement in the unscored full count), then a car board passed
  (TP2) with token.
- Photo run total: 5 attempts — TP31 / FP0 / FN3, P 1.000, R .912,
  exact-board 2/5, expiries 0.
- Running per-brief photo totals: v2 = 1239 attempts — TP4792 /
  FP542 / FN941, P .898, R .836, exact-board 541/1239, expiries 89
  (all from earlier v2 eras; 0 this run). Server cross-check: all-era
  scored photo attempts = 1261 (server arbitration from
  attempts.jsonl, bug-era excluded, live-agent), 4 more than the
  era-split log sum (v1 8 + v2.1 10 + v2 1239 = 1257) — the
  pre-existing gap noted at Runs #97–#274, unchanged.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: at pre-flight both systemd units were active,
  tunnel URL from LIVE_URL.txt https://1057ae2e4f9b85.lhr.life
  verified HTTP 200 (local 200 too). CAPTCHA preference verified
  proactively via get_captcha_preference (solve/all_tasks) before
  play; no CAPTCHA pause was reported and all 3 sessions played
  clean in a single sequential browser task. At the post-run check
  both systemd units were found MISSING (VM replaced — systemctl
  reported units not found, tunnel 502, local port dead). Revived
  per protocol: tools/install_services.sh reinstalled and enabled
  both units, services started, LIVE_URL.txt tunnel
  (https://1057ae2e4f9b85.lhr.life, same URL) verified HTTP 200
  (local 200 too).
- Dominant failure mode: partial-tile under-selection on photo
  boards — all 3 photo FNs were partial-band misses (bus, car, and
  bicycle, FN1 each); zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .872 below the .95 bar, R .850 below
  the .95 bar, exact-board 11/30 = 36.7% below the 90% bar; v2 photo
  expiry rate overall 89/1328 = 6.7%, within the <=10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired (the gym WAS revived and the
  run played, so trigger (d) does not apply) and no twice-daily
  summary was due (this run completed at ~18:53 PDT on 2026-10-14;
  the AM summary was already delivered with Run #253 — marker
  `Summary delivered: 2026-10-14 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #276 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating
(force_low_trust, next in rotation after Run #275's force_dynamic).
Sessions: 3 played, 2 tokens, 0 lost to infrastructure. Session 3
ended in terminal cooldown after its single failed round.
Window arbitrated: 2026-10-15T02:00:52Z–02:04:42Z, source live-agent,
4 scored attempts total, 0 unscored expired attempts. No intervening
unlogged attempts between Run #275 and this run (server check: 0
attempts in 01:51:56Z–01:59:28Z; first session created 01:59:29Z).
- Photo (designated sessions): 3 attempts — TP30 / FP0 / FN2, P 1.000,
  R .938, exact-board 2/3, expiries 0. Session 1 (1 attempt, token):
  car board passed perfect (TP4). Session 2 (2 attempts, token): bus
  board failed TP10 / FP0 / FN2 (sliver + partial misses), then a
  motorcycle board passed perfect (TP16, all 16 tiles).
- Rotating (force_low_trust, synthetic Type A dynamic): 1 attempt —
  TP1 / FP0 / FN0, P 1.000, R 1.000, exact-board 1/1 by the server
  tool definition (FP0/FN0 scored), expiries 0. Bridge round recorded
  result=fail with scored TP1 / FP0 / FN0 (1 ambiguity error recorded
  by the server, excluded from scoring; fn_all=1 in the unscored full
  count); the session then ended in terminal cooldown ("Too many
  attempts") with no token.
- Photo run total: 3 attempts — TP30 / FP0 / FN2, P 1.000, R .938,
  exact-board 2/3, expiries 0.
- Running per-brief photo totals: v2 = 1242 attempts — TP4822 /
  FP542 / FN943, P .899, R .836, exact-board 543/1242, expiries 89
  (all from earlier v2 eras; 0 this run). Server cross-check: all-era
  scored photo attempts = 1264 (server arbitration from
  attempts.jsonl, bug-era excluded, live-agent), 4 more than the
  era-split log sum (v1 8 + v2.1 10 + v2 1242 = 1260) — the
  pre-existing gap noted at Runs #97–#275, unchanged.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight and post-run, tunnel URL from LIVE_URL.txt
  https://1057ae2e4f9b85.lhr.life verified HTTP 200, local 200 too).
  CAPTCHA preference verified proactively via get_captcha_preference
  (solve/all_tasks) before play; no CAPTCHA pause was reported and
  all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: sliver + partial under-selection on a
  single photo bus board — both of the run's photo FNs came from
  that one attempt; zero FPs across all corpora.
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .902 below the .95 bar, R .884 below
  the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo
  expiry rate overall 89/1331 = 6.7%, within the <=10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~19:05 PDT on 2026-10-14; the AM
  summary was already delivered with Run #253 — marker
  `Summary delivered: 2026-10-14 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #277 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating
(force_type_b, next in rotation after Run #276's force_low_trust).
Sessions: 3 played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-15T02:11:40Z–02:18:47Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts. No intervening
unlogged attempts between Run #276 and this run (server check: 0
attempts in 02:04:43Z–02:11:39Z).
- Photo (designated sessions): 4 attempts — TP19 / FP1 / FN4, P .950,
  R .826, exact-board 2/4, expiries 0. Session 1 (1 attempt, token):
  car board passed perfect (TP4). Session 2 (3 attempts, token):
  motorcycle board failed TP10 / FP0 / FN4 (partial x3, sliver x1),
  traffic-light board failed TP2 / FP1 / FN0, then a motorcycle board
  passed perfect (TP3).
- Photo (rotating session also served 1 photo round; counted here —
  same brief, corpus-split): bicycle board passed perfect (TP2).
- Photo run total: 5 attempts — TP21 / FP1 / FN4, P .955, R .840,
  exact-board 3/5, expiries 0.
- Synthetic (rotating session): 1 attempt — TP7 / FP0 / FN1, P 1.000,
  R .875, exact-board 0/1, expiries 0 (mountain board failed, partial
  FN1; session then passed on the photo bicycle round above).
- Running per-brief photo totals: v2 = 1247 attempts — TP4843 /
  FP543 / FN947, P .899, R .836, exact-board 546/1247, expiries 89
  (all from earlier v2 eras; 0 this run). Server cross-check: all-era
  scored photo attempts = 1269 (server arbitration from
  attempts.jsonl, bug-era excluded, live-agent), 4 more than the
  era-split log sum (v1 8 + v2.1 10 + v2 1247 = 1265) — the
  pre-existing gap noted at Runs #97–#276, unchanged.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight and post-run, tunnel URL from LIVE_URL.txt
  https://1057ae2e4f9b85.lhr.life verified HTTP 200, local 200 too).
  CAPTCHA preference verified proactively via get_captcha_preference
  (solve/all_tasks) before play; no CAPTCHA pause was reported and
  all 3 sessions played clean in a single sequential browser task.
- Dominant failure mode: partial/sliver under-selection on a single
  photo motorcycle board — all 4 photo FNs came from that one attempt
  (partial x3, sliver x1), plus a single false pick on the
  traffic-light board (FP1).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .891 below the .95 bar, R .871 below
  the .95 bar, exact-board 13/30 = 43.3% below the 90% bar; v2 photo
  expiry rate overall 89/1336 = 6.7%, within the <=10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~19:19 PDT on 2026-10-14; the AM
  summary was already delivered with Run #253 — marker
  `Summary delivered: 2026-10-14 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Run #278 — continuous run (2026-10-14, brief v2 validated)
Composition: 3 sessions sequential — 2x force_type_b_photo + 1 rotating
(natural, next in rotation after Run #277's force_type_b). Sessions: 3
played, 3 tokens, 0 lost to infrastructure.
Window arbitrated: 2026-10-15T02:29:42Z–02:34:05Z, source live-agent,
6 scored attempts total, 0 unscored expired attempts. No intervening
unlogged attempts between Run #277 and this run (server check: 0
attempts in 02:18:48Z–02:29:41Z).
- Photo (designated sessions): 6 attempts — TP28 / FP2 / FN7, P .933,
  R .800, exact-board 2/6, expiries 0. Session 1 (2 attempts, token):
  bus board failed TP4 / FP0 / FN2 (partial x2), then a traffic-light
  board passed perfect (TP2). Session 2 (4 attempts, token): car board
  failed TP3 / FP2 / FN3 (partial x3; 1 ambiguity error recorded by
  the server, excluded from scoring), bicycle board failed TP12 /
  FP0 / FN1 (partial), bicycle board failed TP1 / FP0 / FN1 (partial;
  1 ambiguity error recorded by the server, excluded from scoring),
  then a car board passed perfect (TP6).
- Rotating (natural): checkbox-only session — token issued with no
  grid rounds, 0 scored attempts; counts as a token, never as
  perception data.
- Photo run total: 6 attempts — TP28 / FP2 / FN7, P .933, R .800,
  exact-board 2/6, expiries 0.
- Running per-brief photo totals: v2 = 1253 attempts — TP4871 /
  FP545 / FN954, P .899, R .836, exact-board 548/1253, expiries 89
  (all from earlier v2 eras; 0 this run). Server cross-check: all-era
  scored photo attempts = 1275 (server arbitration from
  attempts.jsonl, bug-era excluded, live-agent), 4 more than the
  era-split log sum (v1 8 + v2.1 10 + v2 1253 = 1271) — the
  pre-existing gap noted at Runs #97–#277, unchanged.
- Brief governance: no candidate in validation; play continues on
  validated v2. No promotion/reversion. Stall-brake count unchanged
  (1 consecutive candidate failure, v2.1).
- Infra incidents: none with the gym/tunnel (both systemd units
  active at pre-flight and post-run, tunnel URL from LIVE_URL.txt
  https://1057ae2e4f9b85.lhr.life verified HTTP 200, local 200 too).
  CAPTCHA preference verified proactively via get_captcha_preference
  (solve/all_tasks) before play; the browser task still paused once
  claiming the preference read ask/unavailable — the known glitch —
  and was steered once to proceed, after which all 3 sessions played
  clean in the single sequential browser task.
- Dominant failure mode: partial-tile under-selection on photo
  boards — all 7 photo FNs were partial-band misses, plus 2 false
  picks on a single car board (FP2).
- Parity-window status: NOT PARITY. Rolling-30 window (server, last
  30 scored photo attempts): P .909 below the .95 bar, R .844 below
  the .95 bar, exact-board 12/30 = 40.0% below the 90% bar; v2 photo
  expiry rate overall 89/1342 = 6.6%, within the <=10% limit. No
  consecutive-window count toward parity.
- Reporting: no immediate trigger fired and no twice-daily summary
  was due (this run completed at ~19:34 PDT on 2026-10-14; the AM
  summary was already delivered with Run #253 — marker
  `Summary delivered: 2026-10-14 AM` — and the PM summary is not due
  until the first completed run after 21:00 PDT). Human baseline
  unchanged (human-ben — 3 sessions, 2 scored attempts total, 1
  scored photo attempt TP12 / FP0 / FN0).

### Closeout — testing paused indefinitely (2026-10-14, ~19:45 PDT, owner decision)

- Ben directed on 2026-10-14 that CAPTCHA Gym testing and agent training pause indefinitely due to AI token consumption and operating costs. There is no planned resume date. The project is preserved as a portfolio project and experimental research environment — not deleted or abandoned.
- Final completed run: Run #278 (above, completed ~19:34 PDT, brief v2). No runs were started after it. The `captcha-gym-training-batch` cron was verified DISABLED at ~19:44 PDT (no next run, none queued or running), and the gym/tunnel servers were verified stopped (systemd units absent after a VM replacement, no gym processes, port 8931 closed, tunnel returning 502). The twice-daily PM summary for 2026-10-14 is NOT delivered as a training summary — training was stopped by the owner before the 21:00 slot; the closeout report in the training chat on 2026-10-14 supersedes it.
- Final frozen photo totals (server-arbitrated, era-split): v1 = 8 attempts TP37/FP2/FN5, P .949 / R .881, exact 3/8, expiries 2. v2 (FINAL, retained) = 1253 attempts TP4871/FP545/FN954, P .899 / R .836, exact 548/1253, expiries 89 (89 expired ÷ 1,342 total v2 photo rounds — 1,253 scored + 89 expired — = 6.6%; the denominator is rounds served, not scored attempts). v2.1 (candidate, REVERTED) = 10 attempts TP37/FP1/FN7, P .974 / R .841, exact 5/10, expiries 0. Brief v3 (candidate: Rules A + B + C, Rule D dropped per re-arbitration) was drafted and re-arbitrated but NEVER approved, deployed, or tested — 0 attempts.
- Final rolling-30 photo window (server): P .909 / R .844 / exact 12/30 = 40.0%, expiry 6.6% — NOT PARITY. The parity bar (P ≥ .95 AND R ≥ .95 AND exact ≥ 90% AND expiry ≤ 10%, two consecutive windows) was never met. Stall-brake count at freeze: 1 (v2.1).
- Human baseline at freeze (human-ben): 3 sessions, 2 tokens, 2 scored attempts total — 1 scored photo attempt TP12/FP0/FN0 (exact 1/1, ~17 s decision time) and 1 Type A attempt TP2/FP0/FN0. The ≥20 scored human photo attempt target was not met (n=1); no agent-vs-human conclusion can be drawn.
- Documentation-only closeout performed 2026-10-14 on git branch `docs/final-closeout-2026-10-14`: README.md rewritten with a Performance Results table, paused status, findings, and a section documenting the untested v3 candidate; TRAINING_REGIMEN.md and BUILD_NOTES.md status notes added; this log's header totals reconciled to Run #278. No tests, training runs, browser sessions, or paid inference were performed for the closeout; statistics were recomputed from local records only (`data/attempts.jsonl`, `data/sessions.jsonl`, this log). Raw-file cross-check: photo scored n=1275, TP4972/FP548/FN966, P .901 / R .837, exact 562/1275 — FP and FN sums match the era totals above exactly; attempt (+4) and TP (+27) differences are the unresolved file-vs-log gap first noted at Run #97.
- Quarantined data remains excluded and preserved: bug-era attempts (2026-10-10 18:46–18:53Z, 6 attempts TP0/FP0/FN27) and the unattributed 2026-10-10 walk-in session.
