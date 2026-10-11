# Decision memo — manifest ground truth: paint-count vs mask-derived

**Date:** 2026-10-10 · **For:** the project owner, at the next era
boundary · **Question:** the photo pipelines record per-tile overlaps
two different ways. Which one is the ground truth?

## The discrepancy, precisely

Every Type B photo builder (live COCO, staged holdout, both OID
pilots) rasterizes instances largest-first and, **while painting**,
counts painted pixels per (tile, class) into the manifest's
`derived_tiles`. It also writes an owner mask in which each pixel
belongs to exactly one class — the last (smallest) painter wins. Where
two instances overlap, the larger instance keeps paint-count credit
for pixels the mask assigns to the smaller one. Paint counts are
therefore ≥ mask counts, one-directionally, only on overlapped tiles.

This is not cosmetic, because of where the numbers flow: **the server
scores from `derived_tiles`** (server.js reads `scene.derived_tiles`
at load and at verify). The shipped masks are currently used by
validators only — the contract artifact nobody scores against.

Measured magnitude (validator recomputation, mask → tiles vs
manifest):

| Corpus | Scenes affected | Max numeric delta | Classification impact |
|---|---|---|---|
| Staged COCO holdout (58 scenes) | 22 (tile,class) pairs differ | 0.0396 of tile area | **0** positive-set differences |
| Live photo corpus (120 scenes, 922 positive pairs) | 62/120 scenes carry ≥1 delta | 0.0757 of tile area | **1** positive-set difference (≈0.1% of pairs) |

Synthetic corpora are unaffected: Type B synthetic derivations are
computed from the mask by construction, and Type A ground truth is a
label set, not a fraction.

## The contract problem

SPEC §4.1 defines the quantity: `overlap(tile, class) =
mask_pixels(class ∩ tile) / tile_pixel_area`. The manifests therefore
**deviate from the contract text** on every overlapped tile, by up to
7.6% of a tile. Any third party who clones the repo and derives
ground truth from the shipped masks — the documented procedure — gets
different numbers than the server scores with, and exactly one live
(tile, class) pair flips positive/negative between the two readings.

## Option A — regenerate `derived_tiles` from the masks (SPEC-literal)

- **Work:** one regeneration pass over the live photo manifest + the
  three staged manifests (masks are all on disk; the recomputation
  already exists inside the validators), builder changes so future
  corpora derive from the owner map post-rasterization, full
  re-validation. Small, deterministic, an afternoon at most.
- **Effect on history:** historical photo attempts were scored against
  paint-count truth. Regeneration changes the truth under them; the
  honest handling is to freeze history, mark the era break, and not
  rescore (attempt logs keep their own recorded positives). Expected
  reclassification pressure is tiny — the measured flip rate is ~0.1%
  of pairs — but it is not zero, so cross-era photo precision/recall
  comparisons carry a footnote until the boundary.
- **Gain:** manifest, mask, server and SPEC §4.1 all say the same
  thing; the shipped mask becomes authoritative; the validators'
  special-case ("classification-level only, fractions are the build
  record") disappears.

## Option B — formally accept paint-count semantics

- **Work:** amend SPEC §4.1 to define overlap as painted-pixel share
  (overlaps double-counted toward every painting class), with a
  contract version bump per §4.5; annotate the manifests'
  semantics in the README. No data changes, no builder changes.
- **Effect on history:** none — full backward comparability, forever.
- **Cost:** the deviation becomes permanent and documented rather
  than fixed. The shipped masks remain non-authoritative (a standing
  trap for reproducers, who must be told to ignore the masks and
  trust `derived_tiles`), and "overlap" in this project permanently
  means something slightly different from the mask geometry —
  including counting object area that is not visible in the scene,
  which sits awkwardly next to §4.2's visible-fraction framing and
  the sliver rule's "any recognizable part" basis.

## Recommendation — Option A, at the era boundary

The discrepancy is small today precisely because overlap-heavy scenes
are rare in a 120-scene corpus; it grows with every corpus expansion
(the staged sets already add 136 scenes, several deliberately
multi-instance). Fixing it costs one regeneration pass while the
corpora are still small, restores the SPEC as the single source of
truth, and makes the shipped masks mean what §4.1 says they mean. The
comparability cost is bounded and measurable (≈0.1% of pairs, one
known flip), and the era-boundary mechanism already exists to absorb
exactly this kind of break. Option B's only real asset — zero churn —
buys a permanent contract wart whose confusion cost lands on every
future reproducer instead.

Whichever way the call goes, it should be made once, for all photo
corpora together (live + holdout + OI pilot + bridge pilot), and
recorded as a contract/semantics note in TRAINING_LOG.md at the
boundary.
