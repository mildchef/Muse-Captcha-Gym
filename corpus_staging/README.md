# corpus_staging — offline corpus work area

Everything here is **staged**: built offline, validated, and committed
for review. Nothing in this directory is read by the live server, and
nothing deploys from here except by an explicit era-boundary act of the
project owner. The live corpus (`../corpus/`) is untouched by this work.

## Contents

### typeB/ — photo HOLDOUT scenes for `train` and `boat` (58 scenes)

Built 2026-10-10 by `build_holdout_photos.js` from MS COCO 2017 val —
the same source, license discipline, and rasterization pipeline as the
live photo corpus (`../tools/build_photo_corpus.js`):

- **Why these two classes:** SPEC §4.6 holds `train` and `boat` out of
  the training corpus entirely; they exist only as final-holdout
  transfer tests (§5.4 final holdout: "+60 Type B scenes", "all
  holdout-class items"). The synthetic Type B corpus paints neither
  class, and the live photo builder deliberately leaves their instances
  unlabelled — so until now the final holdout had **zero** Type B
  train/boat items. These 58 scenes fill that hole (30 containing
  train, 29 containing boat, 1 scene containing both).
- **Why not the other 8 uncovered classes** (bridge, chimney,
  crosswalk, mountain, palm_tree, stairs, taxi, tractor): COCO 2017
  has no such categories — verified against `instances_val2017.json`
  (80 categories). They need a second permissive source (BUILD_NOTES
  already names Open Images, same license discipline).
- **License funnel** (rule unchanged: only COCO ids 4/5/7/8 admitted):
  train — 157 images with instances → 118 rejected on license, 6
  excluded as already used by the live photo corpus (§8.1
  source-photo disjointness), 33 candidates → 30 selected.
  boat — 121 images → 86 rejected on license, 1 live-overlap, 5
  geometry/targetability rejections, 29 candidates → 29 selected.
  Emitted licenses: 45× CC-BY, 12× CC-BY-SA, 1× no-known-restrictions.
  Per-image provenance is in the manifest, same schema as the live
  photo manifest, with `split: "holdout_final"` and uid prefix `h_`.
  Full funnel: `typeB/selection_stats.json`.
- **Band profile:** 441 positive (tile,class) pairs · ambiguity band
  8.2% · sliver 16.6% (live photo corpus, same computation: 13.1% /
  26.5%). The holdout set is somewhat less fragment-heavy — trains and
  boats fill frames.
- **Validation** (`validate_staging.js`, all green):
  `tools/validate_corpus.js` structural pass on the 58 mask PNGs
  (0 bad) + manifest↔mask consistency: every scene's positive set,
  band set, and size bands recomputed from its mask match the manifest
  exactly. 22 (tile,class) pairs carry small numeric overlap deltas
  vs the mask (max 0.0396 of tile area, **zero** classification
  impact) — the known upstream paint-count property of the shared
  rasterizer (it counts painted pixels; overlapping instances
  double-count vs the final-owner mask). The live corpus carries the
  same property more strongly (62/120 scenes, max delta 0.0757, 1
  positive-set difference). Staging deliberately reproduces the live
  pipeline verbatim rather than forking ground-truth semantics;
  whether to regenerate all manifests from masks is an era-boundary
  decision for the owner.
- **Deployment (owner, era boundary):** copy `typeB/photos/h_*` into
  `../corpus/typeB/photos/` and append
  `typeB/manifest_photos_holdout.jsonl` to the photo manifest.
  Safety: `server.js` builds every play pool with
  `split === 'train' || split === 'eval'`, so `holdout_final` lines
  are excluded from all play by construction — merging cannot leak
  holdout scenes into training. A final-eval harness reads the
  `holdout_final` lines deliberately.

## Rebuild

```sh
curl -O http://images.cocodataset.org/annotations/annotations_trainval2017.zip
mkdir -p _src && unzip annotations_trainval2017.zip 'annotations/instances_val2017.json' -d _src
node build_holdout_photos.js   # images fetched individually from images.cocodataset.org
node validate_staging.js       # + node ../tools/validate_corpus.js typeB/photos
```

---

# Addendum (2026-10-10, dev track): Open Images pilot

The Open Images spike ran — full findings in `OPEN_IMAGES_SPIKE.md`.
Outcome: OID localizes only **stairs, palm_tree, taxi** of the eight
COCO-missing classes (boxes; no masks for any of the eight), and a
third staged set now sits beside the holdout:

- `build_oi_pilot.js` — builder (per-image license gate on OID's own
  License column; boxes rasterized with the SPEC §4 derivation;
  `ground_truth_basis: "bbox"` stamped on every line).
- `typeB/manifest_photos_oi_pilot.jsonl` — 60 scenes (20 containing
  each of stairs / palm_tree / taxi), `typeB/photos/o_*` images +
  owner masks, `typeB/selection_stats_oi.json` — the selection funnel.
- `validate_oi_staging.js` — the same manifest↔mask consistency
  validation, OI flavor: **PASSED, 0 failures**.

Scenes carry split **`staging_oi`** — like `holdout_final`, a value the
live play pools (train|eval) never serve, so the pilot cannot leak into
training before an era-boundary deployment relabels it (recipe in the
spike report). Source CSVs (~43 MB of OID metadata) live in `_src/oi/`,
gitignored — regenerable from the URLs tabulated in the spike report.
Bridge/chimney/crosswalk/mountain/tractor remain ungrounded from any
current source (see the spike report for the blocker and next-best).

Rebuild:

```sh
# download the five OID files tabulated in OPEN_IMAGES_SPIKE.md into _src/oi/
node build_oi_pilot.js        # images fetched from the CVDF S3 mirror
node validate_oi_staging.js
```
