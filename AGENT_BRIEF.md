# CAPTCHA Gym — standard agent play brief

Canonical brief for live agent sessions in the gym. The parent inlines this
into browser-task assignments (tasks cannot read files). Versioned; every
validation batch records which brief version produced it.

## v2 — 2026-10-10 (trained on the first photo-corpus results)

Baseline it answers to (photo corpus, brief v1): 8 scored attempts,
TP37 / FP2 / FN5 — precision .949, recall .881, exact-board 3/8,
2 rounds lost to the 180 s clock. Synthetic Type B was TP12 / FP0 / FN0.

### Standing rules (all session types)
- Read the prompt; it names ONE target class. Select only that class.
- A tile counts ONLY if it contains part of the actual object itself.
  Support poles/arms, sign posts, shadows, and reflections (water, windows,
  shiny paint) NEVER count.
- Objects straddle tile borders. Sweep tiles adjacent to obvious instances,
  and before submitting ANY round, do one dedicated border sweep hunting for
  a lone sliver: a wheel arc, a housing edge, a stripe tip, a nozzle tip.
  A whole target can hide in a single sliver tile.
- Confirm selected tiles show the visible selected state (blue border +
  check) before Verify.
- 3×3 static: if NO tile contains the target, Skip — never guess.
- 3×3 dynamic: click all matches, WAIT for fades/replacements to settle,
  re-scan the whole grid, click new matches; repeat until no tile matches;
  only then Verify. A "new images" error means loop back to re-scanning.
- Play until a token/success state or a terminal failure state. Never stop
  early because rounds repeat.

### v2 rule 1 — fragment inclusion bias (fixes the "on the line" misses)
When a border fragment is genuinely torn between "sitting on the line" and
"crossing into the tile," COUNT IT IN. Measured basis: photo-era misses from
under-inclusion (sliver/partial FNs) outnumbered false picks 5 to 2, and
ambiguity-band tiles are excluded from scoring anyway — a borderline pick
is cheap; a borderline miss loses the tile outright. This applies to
fragments of the OBJECT (wheel, housing, body panel, frond) — never to
poles, shadows, or reflections, which stay excluded no matter how torn.

### v2 rule 2 — clock discipline (fixes the expiry losses)
Each round has a 180-second clock from grid issuance; one perfect selection
already died unsubmitted. Therefore:
- Budget the round: first pass = whole-picture read + obvious tiles;
  second pass = border sweep; then click, confirm marks ONCE, Verify.
- Prefer careful first clicks over fast ones: misclick-and-correct loops
  are what actually eat the clock (one expiry came from fixing misassigned
  clicks, not from slow looking).
- Do not re-screenshot to admire a confirmed selection. Marks confirmed →
  Verify in the same flow.
- If a round expires, re-check the box and continue calmly; an expiry says
  nothing about the selections.

### v2 rule 3 — overlapping-object boundaries (fixes the bus/car FPs)
When vehicles/objects overlap, judge each tile by which object's BODY
occupies it: a tile holding a bus's side panel is a bus tile even if a car
sits behind/inside the same frame region; a car's mirror, light, or panel
crossing into a tile makes THAT tile a car tile. Name the owner of the
fragment before clicking it. If you cannot name the owner, apply rule 1
only when the fragment's shape clearly belongs to the target class.

## v2.1 — 2026-10-10 (drafted from the v2 validation data; REVERTED 2026-10-10 after Run #2)

**Governance decision (Run #2, 2026-10-10): REVERTED — play returns to v2.**
v2.1 final photo line at validation (10 scored attempts): TP37 / FP1 / FN7 —
precision .974, recall .841, exact-board 5/10, expiries 0. Versus v2
(P 1.000 / R .833 / exact 6/8 / expiries 2): precision is worse (the batch #1
FP1 stands unrepaired), exact-board is worse, and the whole-instance FN mode
it was written to fix did not improve (recall flat; this run's 5 photo FNs
were again whole-instance/region misses, incl. one empty submission on a car
board). Its one clear win — zero expiries under rule 5's clock protocol —
does not meet the promote bar ("not worse on precision AND better or equal
on the target failure mode"). Rule 5 may be re-proposed in a future candidate
drafted from accumulated data; v2.1 as a whole is not played again. This is
candidate failure #1 for the stall brake (3 consecutive = fire).

Validation it answers to (photo corpus, brief v2): 8 scored attempts,
TP30 / FP0 / FN6 — precision 1.000, recall .833, exact-board 6/8,
2 expiries, 9/9 sessions tokened. Versus v1 (TP37 / FP2 / FN5, P .949,
R .881, exact 3/8): precision and exact-board doubled/up, recall flat
within noise — but the FN composition changed completely: ZERO sliver
misses under v2; all 6 FNs were whole-instance/region misses on crowded
multi-instance car scenes (a 9-positive board missed 4; the beach-rental
board missed 2 twice, two different agents, same photo). Both expiries
killed strong selections (one counterfactually perfect: TP9 / FP0 / FN0).

### v2.1 rule 4 — instance census before tile mapping (fixes the FN mode)
On any scene with multiple instances of the target class, FIRST count the
instances in a left-to-right, top-to-bottom census, THEN map each counted
instance to its tiles. Clusters of small or distant instances (parked-car
rows, background vehicles) span more tiles than they appear to: check the
tiles LEFT of and ABOVE the obvious cluster tiles, not just the tiles the
cluster seems to sit in. Whole instances are lost by never being counted,
not by fragment judgment.

### v2.1 rule 5 — big-board clock protocol (fixes the expiry mode)
If a board needs 8+ selections, the confirmation pass is the enemy: skip
the separate confirmation screenshot entirely, trust the mark glimpses
seen while clicking, and Verify immediately after the border sweep ends.
A submitted near-complete selection always outranks an unsubmitted
perfect one — an unsubmitted board scores zero no matter how good it was.
(Improvised successfully mid-session 2026-10-10; now doctrine.)

### v2.1 rule 6 — ownership is NOT exclusive (clarifies rule 3 of v2)
A tile counts for the named class if the named class's own body or
fragment is present in it — even when a different, larger vehicle
dominates the same tile. Another vehicle occupying a tile does not veto
the target's fragment there. (The v2 bus-street board: tiles assigned
wholesale to the buses hid 4 car-positive tiles.)

## v1 — 2026-10-10 (original brief; superseded by v2 for photo work)
Standing rules above, without the three v2 rules; fragment calls were made
on a neutral "recognizable part" standard, no explicit clock budget, no
overlap-ownership rule.
