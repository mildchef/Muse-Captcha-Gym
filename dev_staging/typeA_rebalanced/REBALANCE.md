# Type A band-share rebalance — STAGED (not deployed)

**Date:** 2026-10-10 · **Track:** dev (staged; deployment is an
era-boundary act of the project owner) · **Trigger:** BUILD_NOTES.md
records the live Type A ambiguity-band share at **23.1%** of tiles,
above the **15%** figure in SPEC §10 R2 that triggers re-annotation
review. Root cause named there: engineered slivers + heavy-occlusion
quota. This staged build lowers exactly those two quotas.

## What changed (and nothing else)

`build_corpus.js` in this directory is a copy of
`tools/build_corpus.js` with two parameter changes, marked
`[REBALANCE]` inline, plus a redirected `OUT_DIR` so it can never
write into the live tree:

| Parameter | Live builder | Staged copy |
|---|---|---|
| Size draw — whole-ish | r < 0.28, target 0.26–0.55 | r < 0.30 (unchanged range) |
| Size draw — partial | r < 0.72, target 0.06–0.26 | r < 0.80 (unchanged range) |
| Size draw — sliver | quota **0.28**, target 0.006–0.045 | quota **0.20** (unchanged range) |
| Occlusion — none | oroll < 0.55 | oroll < 0.62 |
| Occlusion — partial | 0.55–0.85 (0.30) | 0.62–0.91 (0.29) |
| Occlusion — heavy | quota **0.15** | quota **0.09** |

Painters, PRNG, seed base (20261010), per-class counts (66 × 14 train
classes, 36 × 2 holdout classes, 180 context tiles), split policy and
the band definition itself (`frac > 0 && (frac < 0.02 || heavy)`) are
unchanged.

## Before / after (same computation over both manifests)

| Measure | Live corpus | Staged rebalance |
|---|---|---|
| Tiles | 1,176 | 1,176 |
| Context (empty-label) | 180 (15.3%) | 180 (15.3%) |
| **Band tiles** | **272 — 23.1% of all, 27.3% of labeled** | **178 — 15.1% of all, 17.9% of labeled** |
| Band via heavy occlusion | 167 | 96 |
| Band via sub-2% fraction only | 105 | 82 |
| Size bands whole / partial / sliver | 49 / 684 / 263 | 60 / 732 / 204 |
| Splits train / eval / holdout_final | 773 / 216 / 187 | 771 / 216 / 189 |

The staged corpus lands on the SPEC's 15% intent (15.1%). Both band
sources shrink; neither is eliminated — the band is a designed
difficulty axis (§4.4), not a defect, and slivers remain a substantial
minority (204 tiles) so sliver discipline is still trained. Split
counts drift by 2 because split assignment draws from the generation
seed stream; per-class minimums still hold (train/boat at 36 are the
§4.6 holdout classes by design).

## Validation

- `node tools/validate_corpus.js dev_staging/typeA_rebalanced/corpus/typeA`
  → **1,176 PNGs, 0 bad** (full structural pass).
- Manifest↔files: 1,176 manifest entries, 1,176 PNGs, 0 missing.
- Live corpus untouched: `corpus/typeA/manifest.jsonl` sha256
  `5040546e…a88` and 1,176 PNGs / 149 MB before and after this work;
  the staged builder's `OUT_DIR` points inside this directory by
  construction.

## Deployment note (era boundary)

Deploying = replacing `corpus/typeA/` with this directory's
`corpus/typeA/` and noting the era break: Type A band composition
changes (band tiles drop from 23.1% → 15.1% of draws), so static/
dynamic metrics across the boundary are not band-comparable without
slicing on the manifest's `band` flag — which both manifests record
per tile, so historical comparisons remain reconstructable.
Re-run `tools/e2e_test.js` + `tools/leak_audit.js` live as the
release gate (AGENTS.md rule).

Rebuild: `node build_corpus.js` in this directory (deterministic,
~15 s).
