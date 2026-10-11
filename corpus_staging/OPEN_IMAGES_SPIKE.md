# Open Images spike — second photo source for the 8 COCO-missing classes

**Date:** 2026-10-10 · **Track:** dev (staged; nothing here is deployed) ·
**Question:** can Open Images supply grounded photo scenes for the classes
COCO 2017 lacks — bridge, chimney, crosswalk, mountain, palm_tree, stairs,
taxi, tractor — under the project's license rule?

## Verdict

**Feasible for 3 of 8 classes — stairs, palm_tree, taxi — and a 60-scene
pilot (20 per class) is built and validated in staging.** Infeasible from
Open Images for the other five: bridge, chimney, crosswalk, mountain and
tractor exist in OID only as *image-level* classes — no bounding boxes and
no segmentation masks exist for them in any split — so tile ground truth
cannot be derived mechanically. Bridge in particular has **no** OID
localization despite being the class with real-world prompt evidence
(FIELD_COMPARISON.md F1).

## License mechanics (the admission rule is enforceable, mechanically)

- OID image metadata (`*-images-with-rotation.csv`, one row per image)
  carries a **per-image `License` field** containing the Creative Commons
  license URL recorded for that photo, plus `OriginalURL`,
  `OriginalLandingURL`, `Author` — i.e. per-image provenance is a data
  column, not a dataset-level claim.
- The builder admits an image **iff its own License URL matches
  `/licenses/(by|by-sa)/`** and stores the recorded URL verbatim in the
  manifest (`license_url`), with `licence`, `author`, `original_url`,
  `flickr_url` (landing page) and `oi_image_id` alongside.
- Empirical license profile of the validation split: **all 41,620 images
  record exactly `https://creativecommons.org/licenses/by/2.0/`** — the
  gate rejected 0 of the 194 candidate image-appearances in this spike,
  but it is enforced per image regardless of that uniformity, and any
  future split/class expansion re-runs it. (The recorded license is the
  Flickr license as captured by the OID crawl — the same provenance
  basis as the COCO pipeline, which reads the license from COCO's
  per-image record instead.)

## Access mechanics (what was actually downloaded — ~74 MB total)

All from `storage.googleapis.com/openimages` (versioned annotation files;
the unversioned `2019_04/` paths return 403):

| File | Size | Use |
|---|---|---|
| `v5/class-descriptions-boxable.csv` | 12 KB | which classes have boxes at all |
| `2018_04/class-descriptions.csv` | ~0.5 MB | full class list (image-level MIDs) |
| `2018_04/validation/validation-images-with-rotation.csv` | 15.2 MB | per-image license + provenance + rotation |
| `v5/validation-annotations-bbox.csv` | 25.1 MB | validation boxes |
| `v5/validation-annotations-object-segmentation.csv` + `v5/classes-segmentation.txt` | 2.9 MB | checked: neither bridge nor stairs (nor the other six) is among the 350 segmentation classes |

Images themselves: direct Flickr originals are **CIDR-rate-limited
(HTTP 429, "Rate limited - CIDR range blocked")** from this VM's egress.
The official CVDF S3 mirror of the OID pool
(`open-images-dataset.s3.amazonaws.com/validation/<ImageID>.jpg`) serves
the same images by ImageID and worked cleanly (161/161 after the switch).
Caveat, verified: mirror bytes are **re-encoded** (MD5 ≠ the metadata's
`OriginalMD5`; long edge capped at 1024 px). Bbox coordinates are
normalized, so ground-truth fractions are unaffected; each manifest line
records `served_via: "cvdf_s3_mirror"` + `mirror_url`, and dimensions are
taken from the actual served file.

## Class-by-class outcome (validation split)

| Class | OID MID | Boxes? | Images w/ boxes | Pilot |
|---|---|---|---|---|
| stairs | /m/01lynh | ✓ boxable | 36 (45 boxes) | **20 scenes** |
| palm_tree | /m/0cdl1 | ✓ boxable | 122 (380 boxes) | **20 scenes** |
| taxi | /m/0pg52 | ✓ boxable | 36 (100 boxes) | **20 scenes** |
| bridge | /m/015kr | ✗ image-level only | — | blocked |
| chimney | /m/01jk_4 | ✗ image-level only | — | blocked |
| crosswalk ("Zebra crossing") | /m/014v7p | ✗ image-level only | — | blocked |
| mountain | /m/09d_r | ✗ image-level only | — | blocked |
| tractor | /m/013xlm | ✗ image-level only | — | blocked |

Selection funnel (mirrors the COCO builders' rules): license gate →
rotation gate (non-zero OID Rotation excluded — bbox coordinates live in
the upright frame) → Flickr-photo-id disjointness vs the live photo
manifest and the staged holdout (0 collisions found) → geometry ≥400×300
from the actual JPEG → ground truth from non-group, non-depiction boxes
only (excluded: 96 IsGroupOf + 3 IsDepiction boxes across the three
classes) → targetability (≥2 positive tiles, ≥1 non-band, per class) →
greedy balanced pick. Stairs: 36→32 candidates→20; palm_tree: 122→88→20;
taxi: 36→31→20.

## Ground-truth basis caveat — boxes, not masks

OID has no segmentation masks for these classes, so tiles are derived
from **bounding boxes** rasterized with the live pipeline's exact paint
semantics and SPEC §4 thresholds, and every manifest line is stamped
`ground_truth_basis: "bbox"`. A box includes background pixels a polygon
would exclude, which systematically inflates coverage. The pilot's
profile shows it: of 639 positive (tile, class) pairs — **71% whole,
24% partial, only 4.7% sliver; ambiguity-band share 2.0%** (vs 8.2% band
share in the polygon-based staged holdout). Practical meaning: these
scenes train *detection and enumeration* of stairs/palm_tree/taxi, but
they under-train the sliver discipline that dominates photo-corpus
errors, and their band is thinner than the real distribution. Treat the
pilot as a coverage patch, not a difficulty peer of the COCO corpus.

Validation: `corpus_staging/validate_oi_staging.js` (mask↔manifest
classification consistency, license/provenance/split checks,
targetability bar) — **PASSED, 0 failures**, 60/60 scenes: 20 containing
each class; positive pairs stairs 198 · palm_tree 210 · taxi 231.

## Deployment recipe (era boundary, owner's act)

1. Relabel `split: "staging_oi"` → `"eval"` in
   `typeB/manifest_photos_oi_pilot.jsonl` (play pools serve train|eval
   only; the staging value is unservable by construction).
2. Append the manifest lines to `corpus/typeB/manifest_photos.jsonl` and
   copy `corpus_staging/typeB/photos/o_*` into `corpus/typeB/photos/`.
3. Note the era break in TRAINING_LOG.md: photo attempts after this
   point can draw stairs/palm_tree/taxi prompts for the first time, and
   the corpus's aggregate band/sliver profile shifts (bbox-basis scenes
   are whole-heavy). The `ground_truth_basis` field distinguishes them
   in every manifest line.
4. Re-run `tools/validate_corpus.js` + `tools/e2e_test.js` live as the
   release gate (AGENTS.md rule).

Expansion headroom, if wanted later: the validation split still holds
~12 stairs, ~68 palm_tree and ~11 taxi candidate images unused, and the
test/train splits hold far more (train bbox CSV is GB-scale — pull
class-filtered subsets only, never wholesale).

## Blocked classes — next-best source recommendation

Bridge is the one that matters (real portal prompts; stairs is now
covered). Options, honestly graded:

- **Mapillary Vistas** has a bridge class with polygon masks, but its
  license is CC BY-NC-SA — the NC clause **fails this project's
  permissive-only rule**. Not admissible without the owner changing the
  rule.
- **OID image-level bridge images + hand-drawn boxes**: the photos are
  already license-clean (CC BY 2.0, per-image). A small set (~15–20
  scenes) with boxes annotated by hand would match this pilot's bbox
  basis exactly. Cost is human annotation time, not licensing.
- A targeted Flickr search restricted to CC-BY/CC-BY-SA bridge photos +
  the same hand-boxing is equivalent; OID's pool is the cheaper starting
  set because the license metadata is already tabulated.

Chimney/crosswalk/mountain/tractor have no field evidence and no OID
grounding; recommend leaving them synthetic-only until a permissive
masked source appears.
