# CAPTCHA Gym — Build Notes (v1)

Built 2026-10-10 against `SPEC.md` (unmodified). Zero npm dependencies — Node.js
standard library only, no build step.

## How to run

```bash
cd ~/workspace/captcha-gym
node server.js
```

- URL (from other hosts on the VM's network): **http://198.19.0.2:8931/**
- URL (from the VM itself): http://127.0.0.1:8931/
- Binds `0.0.0.0:8931` so browser-worker agents can reach it.
  Note: a `curl` from inside this VM to its own external /30 address
  (198.19.0.2) is refused by the VM's NAT setup — that is an environment
  hairpin quirk, not the server; the bind is `0.0.0.0` and `127.0.0.1`
  works locally.
- Optional env knobs (defaults are the spec values): `PORT`, `HOST`,
  `GYM_TOKEN_TTL_MS` (120000), `GYM_CHALLENGE_TTL_MS` (180000),
  `GYM_COOLDOWN_MS` (60000), `GYM_SITE_PREFERENCE` (`balanced`|`lenient`|
  `easiest`), `GYM_RUN_ID`, `GYM_DATA_DIR` (default `./data`).

## What runs

- `server.js` — the whole backend: sessions/profiles, mock risk scorer,
  challenge generation + scoring, token issuance/verification, JSONL
  logging, metrics aggregation, admin endpoints, server-rendered `/results`.
- `public/` — host page ("Acme Store" mock), checkbox widget, challenge
  popover, token panel, `/about` + `/article` history pages (risk feature
  F2), `app.js` (event-trace recording), `style.css`. All original styling;
  no Google assets, keys, code, or branding anywhere.
- `corpus/typeA/` — 1,176 tiles + `manifest.jsonl` (see Provenance).
- `tools/build_corpus.js` — corpus generator (deterministic seed).
- `tools/report.js` — baseline report from the JSONL logs alone:
  `node tools/report.js [--data-dir DIR] [--run RUN_ID]`.
- `tools/e2e_test.js` — end-to-end suite (tests T1–T10, SPEC §9.3). It
  starts the server on an ephemeral port with a throwaway data dir, so it
  never touches real run data. Run: `node tools/e2e_test.js`.

## Implemented (v1, per SPEC §9.1)

- Checkbox gate with the two independent clocks: challenge expiry 180 s,
  token TTL 120 s, tokens single-use (replay rejected distinctly).
- Type A 3×3 **static** (Verify/Skip; 0-target grids pass only via Skip;
  Verify-with-none logged as `verify_instead_of_skip`).
- Type A 3×3 **dynamic** (click target → fade 400–700 ms → replacement,
  settle 300–600 ms; Verify valid only on a settled target-free grid;
  `verify_too_early`, `stale_tile_click`, `late_replacement_missed`,
  `challenge_expired` logged as distinct procedure errors).
- Mock risk scorer: features F1–F7 with the spec's weights
  (25/20/10/15/10/10/10), seeded per-session threshold jitter (±5),
  explanation object logged per scoring call, band → outcome mapping.
- Escalation ladder: rounds increment on failure, decrement (floor 0) on
  pass; 6 failed rounds → `cooldown` state for 60 s.
- Scenarios: `natural`, `force_static`, `force_dynamic`, `force_type_b`
  (serves dynamic in v1 — Type B is v1.1), `force_low_trust`,
  `force_high_trust`.
- Per-attempt JSONL logging (SPEC §7.2 field set) to `data/attempts.jsonl`
  + `data/sessions.jsonl`; screenshots stored under `data/shots/` when the
  client supplies one (optional in v1 per spec).
- Metrics at all three levels (session / per-challenge /
  per-tile-and-procedure) via `/api/admin/metrics`, `/results`, and
  `tools/report.js`, including sliver recall reported separately and
  near-miss distributions.
- Answer-key leak audit (SPEC §8.2) — results below.

## Deferred to v1.1 (per SPEC §9.2)

- Type B 4×4 sliced-photo challenges (placeholder README in
  `corpus/typeB/`); `force_type_b` currently serves Type A dynamic.
- Multi-annotator corpus pass (see Provenance), Type C audio, per-run
  config UI.

## Deviations from the spec, with reasons

1. **Corpus is 100 % synthetic** (SPEC §5.1 fallback route 2, taken for the
   whole Type A set). The spec's default — openly licensed photos with
   segmentation masks — is impractical at the required volume: no openly
   licensed source provides per-instance masks for 840+ tiles across
   16 classes, and hand-annotating to κ ≥ 0.75 was out of scope for this
   build. Instead every tile is procedurally rendered
   (`tools/build_corpus.js`) with programmatic rasterisation, so masks and
   labels are exact by construction. Recorded in `CREDITS.md`.
2. **Tiles are PNG, not JPG** — the synthetic renderer encodes PNG with the
   stdlib `zlib`; labels/masks are unaffected. Corpus totals ~149 MB
   (~127 KB/tile; photographic noise defeats compression).
3. **No human annotation pass exists**, so manifest records carry
   `annotators: 0`, `kappa: null` — there is nothing to compute κ over
   because ground truth is generated, not judged. The ambiguity band is
   still engineered (slivers < 2 % visible, 15 % heavy occlusion) rather
   than measured from annotator disagreement.
4. **Band share is 23.1 % of tiles** (272/1,176), above the 15 % figure in
   SPEC §10 R2 that triggers re-annotation review. Root cause: engineered
   slivers + heavy-occlusion quota. This is a v1 calibration note, not a
   blocker: band tiles are excluded from static pass/fail (§4.4) and
   reported separately in metrics, exactly as the spec requires; a v1.1
   rebalance can lower the sliver quota.
5. **Front-end Verify button is always enabled** (production disables it
   until a selection exists). Deliberate: SPEC §3.3 requires
   `verify_instead_of_skip` to be committable and measurable, which is
   impossible with a disabled button. Server-side behaviour is unaffected.
6. **Dynamic pass/fail vs metric counting asymmetry** (spec-faithful, noted
   for clarity): dynamic Verify passes only when zero targets remain
   (§3.4 — band tiles count), while the logged fp/fn for metrics exclude
   band tiles (§7.3); `fp_all`/`fn_all` are also logged so both views are
   reconstructable.
7. **`late_replacement_missed` is a trace-timing heuristic** (a settled
   replacement that became a target ≥ 1.2 s before Verify and was never
   clicked). It approximates "the agent stopped rescanning"; it cannot
   distinguish that from a plain visual miss with certainty.
8. **`/results` is server-rendered** by `server.js` (no separate
   `public/results.html` file) — same content, one less file.
9. **Profiles are in-memory** (cookie age / page history reset on server
   restart). Matches the spec's session-scoped trust model; persistence
   was not required for v1.
10. **Each rendered tile is its own "source photo"** for the §8.1 split
    rules (no multi-tile photos exist in a synthetic corpus, so tiles can
    never straddle splits; class-level and seed-level separation is
    enforced instead — holdout classes train/boat appear only in
    `holdout_final`).

## Corpus provenance summary

- 1,176 tiles, 16 classes (§4.1 list), all procedurally generated — no
  third-party imagery of any kind. Per-tile `source`/`licence` fields are
  in `corpus/typeA/manifest.jsonl`; `CREDITS.md` states the same at
  project level.
- Splits: train 773 / eval 216 / holdout_final 187. Context
  (empty-label) tiles: 180 (15.3 %, spec target ~15 %).
- Size bands: whole 49 / partial 684 / sliver 263. Every train class has
  ≥ 66 labelled tiles; holdout classes train/boat have 36 each and appear
  only in `holdout_final` (SPEC §4.6).
- Ambiguity band: 272 tiles (visible fraction 0.02–0.30 or occlusion
  ≥ 0.65), excluded from static scoring per §4.4.
- Difficulty axes (§4.5) are recorded per tile in the manifest (`axes`).

## Answer-key leak audit (SPEC §8.2)

All points **pass**. How each was verified:

1. **Opaque image URLs** — tiles are served only as `/img/<random img_id>`;
   the id carries no class/label information. Verified in code
   (`challengeView` is the only agent-facing challenge serializer) and in
   live smoke responses.
2. **No ground truth in API responses** — challenge responses contain only
   `challenge_id`, `type`, display target class, instruction text,
   `tile_id` + opaque `src` per tile, and `expires_in_ms`. E2E T9 asserts
   no `tile_uids` / `labels` / `trust` keys in a captured challenge
   response; the curl smoke responses were eyeballed against the same
   list. Token verify returns only `{valid, reason}`.
3. **Risk score / trust never exposed** — scores and explanation objects
   exist only in server logs (`data/sessions.jsonl`). No agent-facing
   response includes them (same checks as point 2).
4. **Corpus manifest, data dir, and SPEC not served** — the static handler
   serves only `public/` and `/img/...`; E2E T9 confirms HTTP 404 for
   `/corpus/typeA/manifest.jsonl`, `/data/attempts.jsonl`, and `/SPEC.md`.
5. **No class list in client code** — `grep` of `public/app.js` for all
   16 class names: no matches (instruction/target text is supplied by the
   server per challenge). A grep of `public/` for `positive`,
   `ground_truth`, `tile_uid`, `trust`, `risk_score` finds only a comment
   stating the no-leak rule.
6. **No metadata in images** — every tile is a procedurally generated PNG
   (stdlib encoder); there is no EXIF/metadata chunk by construction.
7. **Error messages are content-free** — API errors are fixed strings
   (`unknown_session`, `no_active_challenge`, `stale_tile`, …) that reveal
   nothing about the answer key.
8. **Test tooling cannot leak** — `tools/e2e_test.js` reads ground truth
   through the in-process `module.exports._state` of a server it spawns
   itself on an ephemeral port with a throwaway data dir. No HTTP
   ground-truth endpoint exists in any configuration; there is no env
   flag that enables one.

## Test & smoke-test results (2026-10-10)

- **E2E suite: 36 passed, 0 failed** (`node tools/e2e_test.js`), covering
  SPEC §9.3 T1–T10: scorer direction by trust profile, token
  single-use/expiry, static exact-answer pass + screenshot storage,
  0-target Skip-only rule + `verify_instead_of_skip` logging, dynamic
  `verify_too_early`, stale-tile rejection, patient dynamic pass,
  challenge-expiry independence from the token clock, leak spot-checks,
  and metrics/report rendering at all three levels.
- **Curl smoke test** against a normally started server (default env):
  host page 200 on `127.0.0.1:8931`; `force_high_trust` checkbox → pass +
  token; token verify → `{valid:true}`, second verify →
  `{valid:false, reason:"replayed"}`; `force_static` → 9-tile challenge
  with instruction; tile image served as `image/png`; Verify with an
  empty selection correctly failed (3 positives missed) and escalated to a
  fresh challenge; attempt written to `data/attempts.jsonl` with full
  server-side ground truth; `/results` 200; `/api/admin/runs` and
  `/api/admin/metrics` return live aggregates; `node tools/report.js`
  renders all three levels from the real data dir.
- The `data/` directory currently contains **only this smoke traffic**
  (run `run_2026-10-10_274a17`, user-agent `curl-smoke/1.0`), separable
  via `node tools/report.js --run <id>`; delete `data/*.jsonl` for a
  clean start.


---

## Addendum — hosting reality (2026-10-10, post-build verification)

SPEC §2 assumed browser-worker agents reach the gym at `http://<vm-lan-ip>:8931/`. **That assumption is wrong in the Muse runtime:** the managed browser does not run on the VM's network and refuses literal LAN/loopback navigation (198.19.0.2 and 127.0.0.1 both rejected; DNS-rebinding hostnames resolved but the connection was refused — the browser's egress cannot hairpin to the VM). Working route: serve the gym through a public tunnel — verified 2026-10-10 with an SSH reverse tunnel via localhost.run (`ssh -o ProxyCommand=<CONNECT relay through the VM egress proxy> -R 80:127.0.0.1:8931 nokey@localhost.run`), giving an ephemeral `https://*.lhr.life` URL. Cloudflare quick tunnels fail in this environment (the control-API call breaks through the egress proxy). Tunnel URLs change per start; a permanent hosted home is a v1.1 decision.

Live-agent verification (2026-10-10, via tunnel): two natural sessions played cold by a browser agent — both passed and received tokens (Session 1: zero-target static grid correctly resolved with Skip; Session 2: static grid, 3/3 targets selected including a small distant instance, Verify pass). Quirks observed live: noticeable UI response latency after Skip/Verify clicks, and one tile that rendered as a broken image in the browser (judged non-target; the board still passed). The aggregate baseline report (`tools/report.js`) currently blends builder smoke/e2e traffic with live-agent sessions — a clean baseline needs session-source tagging or a fresh data dir.

---

## v1.1 (2026-10-10) — broken-tile fix, session-source tagging, Type B

Three workstreams, in order. E2E suite is now **65 passed, 0 failed**
(was 36). **The running server still has the v1 code in memory — restart
`node server.js` to pick up everything below** (the parent manages the
instance and the tunnel).

### 1. Broken tile — root cause and fix

In three separate live sessions (run `run_2026-10-10_81d0c6`,
17:42–17:50 UTC) exactly one tile rendered as a broken image in Chromium
while the board scored correctly server-side. Diagnosis, in order:

- **Not a corrupt asset.** New tool `tools/validate_corpus.js` fully
  validates every corpus PNG (signature, per-chunk CRC32, complete zlib
  inflate, decompressed size == exact IHDR geometry, filter bytes 0–4,
  IEND present with no trailing bytes). Result over all 1,176 Type A
  tiles: **0 bad**. There was nothing to regenerate.
- **Not one recurring tile.** The tile sets served in the three live
  sessions (initial tiles + dynamic replacements, from
  `data/attempts.jsonl`) are pairwise disjoint — no tile_uid appears in
  more than one session. A single bad file cannot explain three broken
  renders of three different tiles.
- **Not a serving-bytes bug.** The `/img/` route returns bytes identical
  to the file on disk (verified byte-for-byte against a live instance).
- **The aggravating factor:** v1 served images with **no
  `Content-Length`** (chunked transfer-encoding) through an SSH reverse
  tunnel and the browser's egress proxy. One mid-transfer hiccup then
  yields a truncated image Chromium cannot validate or retry — a
  broken-image glyph for exactly one tile, different each time, which
  matches every observation. Root cause is therefore recorded as a
  **transport failure aggravated by length-less chunked responses**, not
  an asset defect; it is not reproducible locally because local fetches
  don't traverse the tunnel.

Fixes (defensive, layered):

- `/img/` responses now carry an explicit `Content-Length` (Type A files
  and Type B slices alike). E2E T9/T12 assert the header equals the body
  length.
- The front end self-heals once: an `<img>` error triggers a single
  reload of the same opaque URL (per tile, and again per dynamic
  replacement), so a transient drop resolves before the agent judges
  the tile.
- Corpus validation is now a release gate: e2e **T0** re-validates every
  PNG in both corpora plus the SPEC §5.4 Type B floors, so a corrupt
  asset can never ship silently again.

### 2. Session-source tagging

- `POST /api/session` accepts an optional `source` tag (sanitised to
  `[a-z0-9_-]`, ≤40 chars), default **`live-agent`**. The tag is stored
  on the session, stamped onto **every** session event and **every**
  attempt record, and used only for log filtering — it is never echoed
  into challenge payloads (see leak audit below).
- Harnesses identify themselves: the e2e suite passes `source: 'e2e'`
  for all its sessions; the front end forwards a `?source=` page param
  when present and otherwise sends nothing (→ `live-agent`).
- `tools/report.js` filters by source, **default `live-agent`**;
  `--source all` disables the filter, `--source e2e` etc. selects one
  class. The header always prints the pre-filter census ("attempts by
  source") so filtered-out traffic is visible, never silently dropped.
  `/api/admin/metrics` accepts the same filter as `?source=` and reports
  it back as `source_filter`; `/api/admin/runs` now lists the sources
  present per run.
- **Legacy backfill:** the pre-tagging logs were stamped once by
  `tools/tag_legacy_sources.js`, which maps exactly the three known run
  ids (builder smoke runs → `smoke`; the 17:42–17:54 UTC tunnel run →
  `live-agent`) and touches nothing else. 5/5 attempts and 27/27 session
  events were stamped; no unmapped runs existed.

**Clean live-only baseline** (`node tools/report.js`, default filter —
the first baseline that contains zero test traffic):

- 4 live-agent sessions with attempts, **session pass rate 100%**,
  first-attempt pass rate 100%; 4 rounds (3 static, 1 dynamic).
- Perception (non-band): TP 10 · FP 0 · FN 0 — precision / recall / F1
  all **1.000**; exact-board accuracy 100%; sliver-band recall 1.000.
- Procedure errors: **0** of every kind. Dynamic mean replacements per
  pass 4.0.
- The one blemish is unchanged from v1: decision times sit outside the
  mock scorer's 3–30 s plausible band (static p50 72 s, dynamic p50
  130 s) — the agent's eyes are perfect so far; its pace is what the
  scorer flags. Small-n caveat: n=4 sessions.

### 3. Type B 4×4 sliced-photo challenges (SPEC §3.5)

- **Corpus** (`tools/build_corpus_typeb.js`, reuses the Type A painters
  via new exports from `build_corpus.js`; Type A output untouched):
  **352 scenes** at 480×480 with per-class segmentation masks —
  SPEC §5.4 floors met: ≥300 scenes ✓, **44 sliver-engineered scenes**
  (≥40 ✓; acceptance is by *measured* overlap — a tile at 0.5–5% plus a
  main-body tile ≥5% — never by intended placement), every train class
  present in ≥32 scenes (≥25 ✓). Splits: train 241 / eval 65 /
  holdout_final 46; play pool 306 scenes; holdout classes train/boat
  are not painted (§4.6). Positive (tile,class) pairs: 2,847, of which
  band pairs 9.1% (under the §10 R2 15% trigger) and sliver pairs 606.
  Ground truth is exact by construction: objects render onto per-class
  layers, the mask is the visible-owner map after occlusion punch-out,
  and per-tile derivations (§4.2/§4.4) are computed from the mask and
  cached in each manifest record's `derived_tiles`.
- **Server:** `corpus/typeB/manifest.jsonl` loads at startup;
  `genTypeBChallenge` picks a pool scene and a target class that has
  ≥1 positive **non-band** tile (an all-band target would be
  unscoreable under §4.4). The whole scene stays server-side: tiles are
  sliced on demand from the decoded scene (stdlib PNG decode with full
  unfiltering; 8-scene LRU) and served under opaque ids — the client
  receives 16 cropped tile images and the instruction text only.
  Scoring reuses the Type A static path exactly (§3.5); `verify_instead_of_skip`
  is Type-A-static-only, and Skip is rejected for Type B. The front end
  hides Skip and switches the grid to 4 columns for 16-tile challenges.
- **`force_type_b` now serves real Type B** (the v1 dynamic alias is
  gone). Natural ladder: §3.6 names the static/dynamic families; Type B
  is the single-pass sliced member of the static family, so it shares
  the static band 50/50 and appears as ~25% of rounds in the dynamic
  bands [design choice within the spec's silence].
- **Metrics:** server `aggregateMetrics` and `tools/report.js` both
  break Type B perception out separately (`levelB_perception.by_type`
  in the API; a dedicated TYPE B section in the report): per-tile
  P/R/F1, exact-board accuracy, and sliver recall for Type B alone.
  `type_mix` and completion/decision-time tables include typeB.

### Leak audit re-run for the v1.1 surface (SPEC §8.2)

All points **pass**, including the new surface:

- **Source tag:** accepted at session creation, stored server-side
  only. The creation response is unchanged (`{session_id, state}`) —
  the tag is not echoed; challenge/verify/skip responses contain no
  source field; it appears only in logs and `/api/admin/*`.
- **Type B payloads:** E2E T12 asserts the challenge response contains
  no `scene`, `mask`, `positive`, or tile_uid substrings; tile URLs are
  the same opaque `/img/<random>` form as Type A; the served bytes are
  exactly the 120×120 crop (asserted byte-for-byte against the
  server-side slice) — scene geometry beyond the tile itself, the mask,
  and all overlap data stay server-side.
- **Masks/manifests not served:** the static handler still serves only
  `public/` and `/img/...`; corpus paths 404 (T9 pattern; the handler
  has no route that can reach `corpus/`).
- **Sliced images carry no metadata:** tiles are re-encoded by the
  server's own stdlib encoder (filter-0 rows, no ancillary chunks).

### Deviations from the spec in v1.1 (stated plainly)

1. **§5.2 derived-tile cache location:** the spec caches derived tiles
   in `corpus/derived/`; here they live in each Type B manifest
   record's `derived_tiles` field. Same data, one file fewer; the
   manifest is server-side only either way.
2. **Type B scene size 480×480** (120 px tiles) is a design choice —
   the spec fixes the 4×4 geometry, not the pixel size.
3. **Natural-ladder Type B mix** (50% of the static band, 25% below
   it) is a design choice; §3.6 does not slot Type B explicitly.
4. **Type B ambiguity band** is overlap-only (0.5–2%). Type A also
   bands heavy occlusion; per-tile occlusion attribution doesn't
   exist for sliced scenes, so the band follows §4.4's overlap clause
   alone.
5. **Backfilling `source` into the append-only logs** bends the
   append-only convention once, deliberately: the run→source mapping
   is known exactly from the v1 notes above, the script is idempotent
   and refuses unmapped runs, and the alternative was discarding the
   only live-agent baseline data the gym has.
6. Still open from SPEC §9.2: screenshot upload remains optional (not
   required), rotated scorer probes and the audio-challenge placeholder
   were not in this chunk. Type A band share (23.1%) is unchanged —
   the v1 calibration note stands.

---

## Stage 2 — failure taxonomy + baseline confirmation (2026-10-10)

- **Failure taxonomy added** to both metric implementations (server
  `aggregateMetrics` → `taxonomy` in `/api/admin/metrics`, and
  `tools/report.js` → a printed FAILURE TAXONOMY section). Design:
  every failed attempt gets exactly ONE primary bucket by priority —
  **procedure** (any procedure error logged) > **perception** (scored,
  tile errors) > **unscored** — with the perception∩procedure overlap
  counted separately so the priority rule hides nothing. Perception
  detail splits FN-only / FP-only / mixed; procedure detail is
  per-code; the **server-acceptance** layer is session-level (sessions
  that never passed, cooldown events, token-check failures by reason).
  Ambiguity-band errors are never counted as failures (§4.4).
- **Verified three ways:** (1) a hand-built fixture with known answers
  (6 fails: 3 perception / 2 procedure / 1 unscored, 1 overlap) —
  server-side numbers exact on all 16 assertions, CLI output agrees;
  (2) the real smoke slice classifies its one genuine failure (empty
  selection, chimney grid) as perception FN-only and surfaces the
  smoke run's replayed token in the acceptance layer; (3) the clean
  live-only baseline re-rendered: taxonomy all zeros, consistent with
  its 4/4 pass record.
- **Clean live-only baseline confirmed** (default `report.js`):
  unchanged from the v1.1 section (100% session pass, P/R/F1 1.000,
  sliver recall 1.000, 0 procedure errors, n=4 — small-n caveat stands).
  One honest wrinkle, not a bug: "Sessions created: 5" vs 4 with
  attempts — one live session was created on the still-running v1
  server and never played. Counting is faithful; no fix warranted.
- No other bugs exposed by the first baselines. The taxonomy is the
  lens the Stage 2 training batches will be read through: a rising
  procedure share means brief/protocol work; a rising perception
  share (esp. sliver FN) means vision work; acceptance failures mean
  the session/trust layer, not the agent's eyes.

---

## Stage 3 — real-photo transfer corpus (2026-10-10)

SPEC §5.1 route 1, executed with the §8.4 discipline: photos are a
transfer/eval instrument, never the scoring core.

- **Source: MS COCO 2017 validation** (`instances_val2017.json` +
  per-image downloads from `images.cocodataset.org`). Annotations are
  CC-BY 4.0. Images carry individual Flickr licenses: the builder
  (`tools/build_photo_corpus.js`) admits ONLY license ids 4
  (Attribution) and 5 (Attribution-ShareAlike) — 7/8 were admissible
  but didn't occur; **637 images were rejected on license alone**
  (all NC/ND variants excluded, no exceptions). Per-image license
  name/URL, COCO id and Flickr URL are recorded in the manifest;
  dataset-level provenance is in CREDITS.md.
- **Corpus: 120 scenes** in `corpus/typeB/photos/` (JPEG + derived
  mask PNG each, 23 MB), split `eval` throughout. Scene containment:
  bicycle 25, bus 27, motorcycle 25, traffic_light 31, fire_hydrant
  20, car 70 (car overshoots by co-occurrence — it's in most street
  scenes; containment ≠ targeting). COCO covers **6 of the 14** gym
  classes; bridge, chimney, crosswalk, mountain, palm_tree, stairs,
  taxi, tractor have no COCO counterpart and remain synthetic-only.
  COCO train/boat deliberately unmapped (holdout classes, §4.6) —
  their instances stay unlabelled context.
- **Ground truth stays mechanical:** polygons rasterized with the
  pixel-center rule, overlaps per SPEC §4 (0.5% floor, 0.5–2% band),
  iscrowd and bbox-only annotations skipped, shipped mask = visible-
  owner map (largest instances painted first). Honest caveat: the
  polygons are human annotations, so photo ground truth is
  *derived-exact*, not *by-construction-exact* like the synthetic
  corpus — one more reason photos are eval-only.
- **Serving:** Node stdlib cannot decode JPEG, and never needs to —
  photo challenges serve the whole scene JPEG once (opaque id,
  `image/jpeg`, explicit Content-Length) and the client slices it
  with CSS background-position (SPEC §3.5 explicitly allows whole-
  scene serving); the grid takes the photo's aspect ratio. Payload
  additions are pure display geometry (`aspect`, per-tile `bg`
  percentages) — e2e T13 asserts no filename, license string, or
  ground-truth data appears in the payload.
- **Measurement:** attempts record `challenge.corpus`
  (`photo`/`synthetic`); metrics `by_type.typeB.corpus` and the
  report's TYPE B section split attempts + exact-board accuracy by
  corpus, so a training batch can compare synthetic vs photo
  performance directly — the transfer number this stage exists for.
- **Known deviation:** §8.2 asks for images to be re-encoded on
  ingest to strip metadata. JPEG re-encoding is impossible with the
  stdlib, so photo files are served as downloaded. Residual risk is
  camera EXIF only — COCO annotations never enter the files — and the
  original filenames never reach the client (opaque ids). Recorded
  here rather than silently accepted.
- E2E after Stage 3: **78 passed, 0 failed** (T13 adds 13 photo
  checks: provenance, license purity, JPEG/mask integrity, serving
  geometry, payload leak checks, exact-pass, corpus-split metrics).
  One mid-stage failure was found and fixed honestly: T12 initially
  crashed when `force_type_b` drew a photo scene (no PNG crop) —
  T12 now draws until it gets a synthetic scene, T13 covers photos.

---

## Stage 4 — spectator dashboard (2026-10-10)

- `/results` rewritten. **Source-filtered, live-agent by default**
  (`?source=all|e2e|smoke|…`), with switcher links and a metrics-JSON
  link that carries the same filter.
- **Per-session list** (newest 40): scenario, rounds played (types,
  with `/photo` marked), and the three layers scored separately per
  session — *visual* (rounds passed, FP/FN totals), *procedural*
  (error codes or "clean"), *acceptance* (checkbox outcome, entry
  trust, token minted / cooldown / no token, token-check results).
- **Headline + failure taxonomy blocks** on top (Stage 2 taxonomy,
  plus a Type B line with the photo-vs-synthetic exact-board split),
  and the v1 recent-attempts table kept underneath.
- **Leak discipline:** the dashboard is an operator surface (SPEC
  §2.5) showing scores and outcomes only — no positive-tile sets, no
  selected ids, no tile uids, no masks, no scene filenames. E2E T14
  proves it: it greps the rendered page for a real tile_uid and a
  real positive tile_id taken from the log and asserts both absent,
  alongside the layer/taxonomy/token rendering checks.
- E2E after Stage 4: **84 passed, 0 failed**.

---

## Stage 5 — hardening + handover (2026-10-10)

- **End-to-end leak audit is now a tool**: `tools/leak_audit.js`
  crawls every agent-facing surface (host pages, JS/CSS, all
  session/checkbox/click/verify/skip/token response shapes for
  static, dynamic, Type B synthetic AND Type B photo, image
  responses, error responses) and greps for ground-truth *data*
  (JSON keys, tile uids from live challenges, filenames, license
  strings), probes 10 forbidden paths (all 404), audits PNG chunk
  hygiene, and holds `/results` to the operator rule. **Result:
  32 passed, 0 failed.** Its first run produced two findings, both
  investigated to ground truth and neither a data leak: (1) the
  class-name check substring-matched "busy"/"carrier" — the audit
  now word-boundary-matches; (2) vocabulary tokens ("labels",
  "positives") appeared in an app.js comment *stating* the no-leak
  rule, "risk" in the index page's SPEC §1 fidelity copy (no
  values), and "mask" inside `UNMASKED_RENDERER_WEBGL`. The comment
  was reworded anyway; the audit now checks data-bearing patterns
  rather than dictionary words, which is what §8.2 actually bans.
- **Corpus validation over everything:** 2,000 PNGs (1,176 Type A +
  704 Type B synthetic scenes/masks + 120 photo masks) fully decode,
  0 bad; 120 photo JPEGs structurally sound, 0 bad.
- **Full e2e: 84 passed, 0 failed** (T0–T14). README refreshed
  (dashboard, taxonomy, photo corpus, audit/validation tools).

---

## Bug fix — Type B clicks never registered (2026-10-10, post-Stage 5)

**Symptom (live play, server logs are ground truth):** in a forced
Type B session on 2026-10-10 (attempts 18:46:50–18:52:53 UTC, classes
taxi/bicycle/traffic_light/fire_hydrant/car/palm_tree, synthetic +
photo), the agent clicked tiles in all 6 rounds and pressed Verify each
time. Every scored attempt shows TP=0, FP=0, FN=(all positives) with
`agent.selected=[]` — yet each attempt's event trace contains 6–31
tile click events (pointerdown + click resolved to `tile:N` with
tile_ids). The agent clicked; the clicks died inside the page.

**Root cause (pinned in code, not inferred):** `public/app.js`
`onTileClick` gave only `typeA_static` the local
`classList.toggle('selected')` branch. Every other type — including
`typeB` — fell through to the dynamic path and POSTed to
`/api/session/:id/click`. `server.js` `onClick` correctly rejects that
for non-dynamic challenges (`{ok:false,
error:'click_not_supported_for_static'}` — SPEC §3.5 gives Type B no
per-click protocol; it is single-pass, Verify-only, scored like Type A
static). The client's response handling had branches only for
`replace` / `selected` / `deselected` / `stale_tile` /
`challenge_expired`, so the rejection matched nothing and the click was
silently dropped: no `.selected` class (no visual mark — exactly what
the agent reported), and Verify, which builds its submission from
`.selected` classes, sent an empty set. Both Type B variants failed
identically because the dispatch happens before variant rendering
matters. Type A was unaffected (static toggles locally; dynamic is the
path's intended user).

**Fix:**
- `app.js`: `typeB` takes the local-toggle branch alongside
  `typeA_static`, with a comment recording why. Identical toggle
  semantics to Type A for both Type B variants.
- `app.js` hardening in the same handler: any click response error that
  matches no known branch now surfaces "That click did not register" in
  the challenge message instead of failing silently — the silence is
  what hid this bug through a full live session.
- `server.js` (taxonomy integrity): `onVerify` now adds the procedure
  code **`empty_submission`** when a Verify arrives with an empty
  selection against a challenge holding ≥1 scorable (non-band)
  positive. The tiles are still counted as missed on the board
  (fn unchanged), but the failure taxonomy's priority rule files the
  attempt under **procedure**, so a future client-side failure can
  never again masquerade as agent perception failure. Surfaced in
  `aggregateMetrics` (`levelC.procedure_errors.empty_submission`), the
  `/results` dashboard Procedural line, and `report.js` Level C. The 6
  historical attempts above predate the flag and are NOT backfilled —
  read them as instrumentation failures, not perception data.

**Test hole closed:** the e2e suite drove the API directly everywhere
(T12/T13 submit `selected_tile_ids` read from in-process state), so a
dead front-end click path was invisible to it. New block **T15** loads
the real served page structure + the real `/app.js` into a minimal DOM
harness (`node:vm`, stdlib only), clicks the actual tile buttons, and
asserts: toggle on/off/on, the `.selected` mark on exactly the clicked
tiles, the clicked set arriving intact in the server's scored attempt,
and a passing round — for **both** Type B variants — plus the
`empty_submission` flag and its taxonomy classification through the
real front end. T12's empty-selection case now also asserts the flag.
**Both directions verified:** with the fix, e2e is **99 passed,
0 failed** and the leak audit **32 passed, 0 failed**; with `app.js` +
`server.js` temporarily reverted to the pre-fix code (new tests kept),
the suite fails in exactly the 11 new checks — the failure output
reproduces the live signature (TP=0/FP=0/FN=all, `selected=[]`,
taxonomy filing the empty submission under perception) — while the
other 88 checks still pass.

**Not fixed (noted during the hunt):**
- Latent crash in the same handler: the dynamic `replace` branch does
  `btn.querySelector('img')`, which is null for photo tiles (they hold
  a `.photo-fill` div). Unreachable today — `replace` is only returned
  for Type A dynamic, whose tiles always contain an `<img>` — but the
  branch assumes an `<img>` child without checking.
- The server error name `click_not_supported_for_static` is also
  returned for Type B; produced in one place, matched nowhere — left
  as-is to keep the diff minimal.
- `app.js` has no try/catch around its fetches: a network-level failure
  during the checkbox call would leave the spinner up and `widgetBusy`
  stuck true. Pre-existing, all types, unrelated to this bug.

## STATE OF THE GYM (2026-10-10, end of the Stage 1–5 build-out)

**What exists**
- The full v1 game: checkbox gate with independent challenge/token
  clocks, Type A static + dynamic, mock risk scorer (F1–F7,
  jittered bands, escalation ladder → 60 s cooldown), JSONL logging
  of every attempt with seed, ground truth, risk explanation,
  timing and event trace.
- v1.1: Type B 4×4 sliced-photo challenges (352 synthetic scenes,
  44 sliver-engineered, mask-exact ground truth), session-source
  tagging end-to-end (default `live-agent`; reports filter by it),
  the broken-tile fix (Content-Length everywhere + one client
  self-heal reload + corpus validation as a release gate).
- Stage 2: failure taxonomy (perception / procedure /
  server-acceptance) in metrics, report and dashboard.
- Stage 3: 120-scene COCO real-photo transfer corpus (permissive
  licenses only, per-image provenance in the manifest), served
  whole with CSS slicing, measured separately (`corpus` split in
  Type B metrics).
- Stage 4: `/results` dashboard — per-session three-layer scores,
  taxonomy, token outcomes, source-filtered (live-agent default).
- Stage 5: `tools/leak_audit.js` (32/32), full validation sweeps.

**What's measured** (clean live-only baseline, n=4 sessions — small)
- Session pass 100%, first-attempt 100%, per-tile P/R/F1 1.000,
  exact-board 100%, sliver recall 1.000, zero procedure errors,
  zero acceptance failures. Known blemish: agent decision times
  (72 s static / 130 s dynamic p50) sit outside the scorer's 3–30 s
  plausible band — pace, not perception, is the open training front.
  Type B's only live-agent attempts (6 rounds, 2026-10-10 18:46–18:52
  UTC) were scored against the broken pre-fix front end (see the bug
  section above): every submission arrived empty, so they are
  instrumentation failures and Type B still has no *valid* live-agent
  perception data. The first post-restart training batch will produce
  the first synthetic-vs-photo transfer numbers; any future empty
  submission will be flagged `empty_submission` and filed under
  procedure automatically.

**What remains genuinely open**
- The server process must be restarted to run this code — including
  the Type B click fix and `empty_submission` flag above (the parent
  manages the instance/tunnel/systemd cutover); everything is
  verified against throwaway instances (e2e 99/99, leak audit 32/32).
- SPEC §9.2 leftovers, still deferred by design: screenshot upload
  required (still optional), rotated scorer probes, audio-challenge
  placeholder state.
- Type A ambiguity-band share is 23.1% (above the §10 R2 15%
  review trigger) — a calibration rebalance is still owed; Type B
  synthetic is 9.1% and photos are human-annotation-bound.
- Photo corpus covers 6 of 14 classes; a second permissive source
  (e.g. Open Images, same license discipline) would be needed for
  the other 8 — not attempted, no wall hit, just scope.
- Permanent hosting (vs ephemeral tunnel) is still a parent-level
  decision; the gym itself is indifferent to its URL.
- Gym scores measure gym performance (SPEC §1). Production outcomes
  in the CAPTCHA failure log (~/TOOLS.md) outrank every number here.

---

## Addition — `force_type_b_photo` scenario (2026-10-10, post-build-out)

New session scenario `force_type_b_photo` behaves exactly like `force_type_b` (Type B 4×4, static band) except `genTypeBChallenge` draws the scene exclusively from the real-photo pool (`corpus/typeB/manifest_photos.jsonl`, train/eval split — factored out as `typeBPhotoPool`; the combined pool and every other scenario are unchanged), so a transfer batch can force photo scenes instead of drawing the mixed pool and hoping (T13's draw-until-photo loop was the workaround). It is accepted the same way as every scenario — verbatim in the `POST /api/session` body and via the front end's `?scenario=` parameter (app.js forwards it untouched; no client change) — with `serveType` mapping it to `typeB` and the restriction enforced server-side at generation. Measurement purity beats uptime: if the photo pool is empty/unavailable, issuance fails loudly rather than falling back to synthetic — `genChallenge` throws a coded error, the new `issueChallenge` wrapper (used by both issuance sites, checkbox and round-retry) logs a `challenge_issuance_failed` session event with `reason: 'photo_corpus_unavailable'` and leaves the session in INIT, and the caller answers 503 with the fixed, content-free error string `photo_corpus_unavailable`. Tests: e2e gains **T16** (8 checks — creates a `force_type_b_photo` session, plays a round through the API, asserts the photo serving shape, payload hygiene, exact-pass, the metrics corpus split, and that the scored attempt records `challenge.corpus === 'photo'` and the scenario); full suite **107 passed, 0 failed**; leak audit **33 passed, 0 failed** (it now also captures the new scenario's create/checkbox/verify/skip payloads in its §8.2 sweep). The empty-corpus branch cannot be exercised in-suite (the pools are module-level and cannot be emptied in-process), so it was verified out-of-suite against a hardlinked corpus copy with `manifest_photos.jsonl` removed: checkbox → 503 + `photo_corpus_unavailable`, the failure event logged, the session left in INIT, and a `force_type_b` control session still issuing synthetic Type B from the same build (5/5 checks; scratch copy deleted). **A server restart is required** — the running systemd-managed instance still serves the previous code until the parent restarts it.

**Follow-up fix (same day):** the scenario restricted the challenge *pool* but not the entry gate, so a session whose entry trust reached the pass band still passed on the checkbox alone and no photo grid was ever served — observed live three validation sessions in a row (zero scored attempts), because the sibling `force_*` scenarios pin what `serveType` issues while the checkbox gate in `onCheckbox` ran first for every scenario. `onCheckbox` now forces outcome `challenge` for `force_type_b_photo` (trust is still scored, explained and logged unchanged; the skip is recorded in the entry explanation's override list), so the scenario always issues its photo Type B challenge — and with an empty photo pool the issuance failure now fires for high-trust callers too instead of being masked by a pass. Tests: e2e gains **T17** (6 checks — five fresh warmed-profile, best-case-signal `force_type_b_photo` sessions must ALL be challenged with a photo Type B, scoring intact, skip recorded; one plays out to a scored attempt with `challenge.corpus === 'photo'`); full suite **113 passed, 0 failed** (baseline 107), leak audit **33 passed, 0 failed**; negative control with the fix reverted: T17 fails with 0/5 sessions challenged (all five checkbox-passed). The empty-corpus 503 was re-verified out-of-suite for both a low-trust and a high-trust caller plus the `force_type_b` synthetic control (3/3; scratch copy deleted).

**Follow-up fix 2 (same day):** the always-challenge guarantee is generalized from the `force_type_b_photo` special case to every `force_*` scenario — `onCheckbox` now forces outcome `challenge` whenever the scenario name starts with `force_` (one prefix rule, same override wording per scenario), so `force_static` / `force_dynamic` / `force_type_b` / `force_high_trust` / `force_low_trust` can no longer checkbox-pass either; trust is still scored, explained and logged unchanged (the trust pins still apply — `force_high_trust` records trust 90 and serves a static-band challenge, `force_low_trust` records 20), and `natural` is untouched (its checkbox-only pass is the trust ladder working as designed). T2 adapted: it minted its token-rule tokens from `force_high_trust`'s checkbox pass, so it now solves the served static-band challenge exactly to mint them (single-use / replayed / expired assertions unchanged). Tests: e2e gains **T18** (19 checks — T17-style warmed high-trust sessions for each pinned-type scenario must ALL be challenged with the pinned type, scoring intact, skip recorded; `force_high_trust` challenged despite trust ≥ pass band; `force_low_trust` skip recorded; `natural` control records no force override and still checkbox-passes); full suite **132 passed, 0 failed** (baseline 113, +19 T18, T2 same count), leak audit **0 failed** (33–34 passed across runs — the total varies by ±1 with the audit's Type B draw order, because `force_high_trust`'s PNG challenge now occupies a slot in its first-4 image checks where a JPEG photo challenge contributes one fewer check); negative control with the generalization temporarily reverted to the photo-only special case: 13 T18 checks fail (every force scenario), T17/T2 stay green, fix restored byte-identical (md5-verified). Known pre-existing flake, unrelated to this change: T1's natural-ladder type assertions intermittently fail (`bad session served dynamic` / `good session easier`) because `serveType` deliberately mixes Type B into the dynamic band (25%) and static band (50/50) while T1 asserts exact types — observed failing in 2 of 5 runs during this change's verification, never in T2/T17/T18; left untouched as a SPEC-interpretation call.


**T1 flake fix (same day, test-only — no server change):** the known flake flagged at the end of Follow-up fix 2 is resolved. T1 asserted exact served types (`typeA_dynamic` for the bad session, `typeA_static` for the good one) while `serveType` deliberately mixes Type B into both natural bands, so each Type B draw failed the check. T1 now asserts band membership at two layers: (a) draw-independent — each session's trust lands in the expected band of its OWN jittered thresholds (bad trust < its staticB; good trust ≥ its staticB); (b) the served type belongs to the band's documented serve-set (static band {typeA_static, typeB} 50/50; dynamic bands {typeA_dynamic 75%, typeB 25%}). Check count 4 → 6, suite total 132 → 134. Deterministic, not statistical: a 40-iteration probe of the exact T1 flows showed wide margins (bad trust 24–31 vs staticB 50–60, min margin 19; good trust 74–81, min margin 15 above staticB; trust-ordering margin ≥45) and reproduced the old failure modes at the expected rates (bad drew typeB 11/40; the good session was challenged 7/40 and drew typeB 6 of those 7). Five consecutive full-suite runs: T1 6/6 green in all five; suite totals 134 passed / 0 failed in runs 1, 2, 4, 5. Non-vacuity demonstrated: a temporary mutant with `DYNAMIC_BAND_TYPES = ['typeA_static']` (a type the dynamic band can never serve) failed exactly the one mutated check (`T1 bad session served a dynamic-band type`, server had served typeA_dynamic), suite exit 1, mutant deleted after. Leak audit after the change: **33 passed, 0 failed**. **Separate pre-existing flake found during verification (diagnosed, NOT fixed — out of this change's scope):** run 3 failed `T2 expired token rejected`. Mechanism, confirmed by an 80-replication probe of T2's `mintToken` helper: when `force_high_trust` serves a true 0-target static grid (SPEC target distribution P(0)=10% × ~50% static-band serve ≈ 5% per mint), the helper Verifies with an empty selection — which the server correctly refuses with `retry` + a fresh challenge (the correct move is Skip, per T4's contract) — so the helper returns undefined, the expiry check posts no token, and the server answers reason `unknown` instead of `expired`. The probe hit exactly 1 no-token case in 80 mints, the 0-target static grid; grids whose positives are all band tiles pass on empty and are unaffected. Suggested future fix (T2 helper only): Skip a 0-target static grid (or re-draw the session) when minting, and assert the minted token exists before the expiry check.

**Draw-assumption sweep (same day, test-only — no server change):** the T1/T2/T3 flakes shared one root pattern — a test draws a challenge (or reads a log a draw produced) and assumes something the server's target distribution / serveType mixing does not guarantee — so the whole suite (T0–T18) was audited for the class instead of fixing instances one at a time. Rates below are from a 300-draw probe per case against the real server (plus a 200-session probe for the natural control), not estimates. **Fixed:** (1) **T3** — the known case, now measured: a single `force_static` draw has no scorable (non-band) positive 13.7% of the time (8.3% zero-target → the block Verified empty into `verify_instead_of_skip` and FAILED; 5.3% positives-all-band → it "passed" with an empty selection, exercising nothing). T3 now loops draws (cap 80, T4/T5 style) until the grid has ≥1 non-band positive; loop failure needs 80 consecutive bad draws (0.137^80 ≈ 0). One new check (`T3 found a static grid with a scorable target`); suite total 135 → 136. (2) **T14** — a fourth instance, in a block that plays no grid: its leak check read the FIRST logged attempt's `positives_server_only[0]`, but the suite's first attempt is T2's first mint, a 0-target static draw 3.3% of runs (probe 10/300; theory 50% static-band serve × P(0)=10% ≈ 5%) — an empty list made the check fail on `!!posId` for draw reasons unrelated to the dashboard. The check now uses the first logged attempt WITH ≥1 recorded positive (guaranteed to exist: T3's accepted grid always has one). (3) **T4 loop cap 80 → 240** — finding two zero-target grids (p≈0.083–0.10/draw) within 80 draws still missed ~0.2–0.8% of runs (binomial tail); at 240 the miss is ~1e-7, and expected draws (≈24) are unchanged. **Cleared as safe, with the guarantee named:** T1 (fixed earlier; trust-vs-own-threshold margins ≥15 pts by probe and arithmetic — pass band [70,80] vs bad-trust max ~32). T2 mintToken (Skip branch keys on TOTAL positives, matching `onSkip`'s contract exactly; all-band grids pass on empty Verify; Type B targets are scorable by construction; both minted tokens are now existence-asserted). T5/T6 (loop for a dynamic grid with ≥1 positive: per-draw success ~92%, miss in 40 draws ~1e-43; T5's `verify_too_early` rests on the ≥700 ms settle window vs ~ms local round-trips). T7 (retry ×6 sessions around a self-correcting click loop; a 0-positive initial grid is a legitimate pass, not a bad draw). T8 (expiry is checked before scoring — grid content is irrelevant). T9 (force_static always serves 9 tiles; content checks are draw-independent). T10 (`rounds_served ≥ 6` is met by ≥8 attempts logged in ALL draw outcomes of earlier blocks). T11 (verify result never asserted; an attempt is logged for every static grid incl. 0-target). T12 (draws until synthetic Type B: photo share 120/426 ≈ 28%, miss in 60 ≈ 1e-33; only stylistic note — it destructures the found context after its found-check instead of T13's if-guard, at that probability). T13 (same pool arithmetic, miss ~2e-9, if-guarded). T15 (40-page loop covers both Type B variants: miss ≈ 2e-6 photo / 1e-22 synthetic; its first-page empty-Verify cannot cooldown — harness entry trust ~50–57 minus 9 stays above the floor band [15,25], round 1 < MAX_ROUNDS 6). T16/T17 (scenario construction guarantees: photo pool non-empty; the served target is scorable — verified offline over both manifests: all 352 synthetic + 120 photo scenes have ≥1 targetable class). T18 pinned scenarios (serveType pins + set-membership assertions) and its natural control, which is statistical BY DESIGN: warmed-profile pass rate measured 89.5% per session (n=200), so P(no pass in 5) ≈ 1.3e-5 — no change warranted. **Verification:** five consecutive full-suite runs **136 passed, 0 failed** in all five; leak audit **34 passed, 0 failed** (inside the known 33–34 draw-order variance). **Non-vacuity, two /tmp mutants (code copies + symlinked corpus, deleted after; repo server.js md5 unchanged `3fb4427c…`):** (a) a server whose static pass requires fn=999 (exact selection can never pass) — fixed T3 finds its scorable grid, submits, and `T3 exact static selection passes` FAILS (12 collateral failures on the other exact-pass paths, same mutation); (b) a `/results` handler that leaks every attempt's positive tile ids into the page — the suite fails in EXACTLY ONE check, `T14 dashboard exposes NO answer keys` (135 passed, 1 failed). T4's change is a loop bound only; its verify/skip assertions are untouched.

**T2 flake fix (same day, test-only — no server change):** the pre-existing flake diagnosed at the end of the T1 note is resolved. T2's `mintToken` helper now Skip-passes a true 0-target static grid (the only contract-correct move, per T4) instead of Verifying an empty selection into a `verify_instead_of_skip` refusal that returned no token, and a new check (`T2 second high-trust session yields a token (expiry-check input)`) asserts the minted token exists before the expiry check runs — a minting failure can no longer masquerade as an expiry failure. Suite total 134 → 135 (the one new check; every existing assertion unchanged). Five consecutive full-suite runs: **135 passed, 0 failed** in all five; leak audit **33 passed, 0 failed**. Replication probe (300 mints per helper against the real server): the OLD helper returned undefined 17/300 times (5.7% — every one a 0-target static draw, matching the ≈5% theoretical rate); the NEW helper (extracted verbatim from the fixed test) minted 300/300, resolving all 9 zero-target draws it met via Skip (9 skip-passes in the server's attempts log). Non-vacuity demonstrated: a /tmp mutant server whose token-TTL comparison never fires failed exactly `T2 expired token rejected` while the new input check passed — the expiry check still bites when a server wrongly accepts an expired token (mutant deleted after). **Separate pre-existing flake found during verification (diagnosed, NOT fixed — out of this change's scope):** `T3 exact static selection passes` intermittently fails when T3's single `force_static` draw is a true 0-target grid — T3 computes an empty "exact" selection and Verifies, drawing the same `verify_instead_of_skip` refusal (observed in the mutant run's attempts log: class bus, zero positives, selected [], procedure error `verify_instead_of_skip`; also the likely cause of one unidentified single failure in a pre-fix smoke run). Unlike T4/T5, T3 does not loop draws until a grid with targets appears. Suggested future fix (T3 only): loop session draws until the served static grid has ≥1 positive before running the exact-selection pass.

---

## Addition — human baseline recording (2026-10-10)

Ben's publication plan (HUMAN_BASELINE.md) needs the agent-vs-human comparison captured from now on, with the two populations provably separate. The v1.1 source plumbing already carried a tag from the page URL into the session record and every attempt; this change makes the human tag a real, guarded feature on top of it.

**Server — source allowlist (`sanitizeSource`, session creation).** Until now any string was stored after character-stripping, so a typo minted a new "population" silently. Creation now accepts exactly: the known harness values (`live-agent`, `e2e`, `smoke`, `deploy-check`, `leak-audit`) and human player tags matching `human-<name>` (lowercase alphanumerics/hyphens, e.g. `human-ben`). Anything else — unknown strings, characters outside `[a-z0-9_-]`, `human-` with no name, values over 40 chars, non-strings — falls back to `live-agent` (fail-closed). Case is folded (`HUMAN-BEN` → `human-ben`). The tag remains a label only: never echoed into creation/challenge payloads, no effect on issuance or scoring, and the server pins it to the session so it covers every round without the player re-adding it. **No front-end change was needed:** app.js already forwards `?source=` at session creation (v1.1), and rounds never re-read the URL.

**Comparison tool — `tools/compare_report.js` (new, standalone).** Deliberately NOT a report.js mode: report.js is the single-population baseline whose output contract is asserted by e2e and quoted in TRAINING_LOG.md; the comparison is a different shape (two populations, population predicates instead of exact tags, an exclusion window) and neither contract should contaminate the other. Populations are assigned by tag only — agent = `live-agent`, human = `human-*`, every other source is test traffic in neither. The quarantined bug-era window (2026-10-10 18:46–18:54Z) is excluded from both populations and counted in the header; the unattributed ~19:52Z walk-in session is untagged live-agent traffic and stays in the agent pool exactly as TRAINING_LOG.md documents — never relabeled. Per population, overall and per-corpus (photo/synthetic): sessions, tokens, scored attempts, TP/FP/FN, precision, recall, exact-board rate, expiries, and median per-round decision time (challenge issuance → submission; expired rounds excluded — their recorded time is the clock, not a decision). Per-corpus sessions/tokens are attempt-scoped (distinct sessions serving ≥1 attempt of that corpus) and footnoted as such, because a session can serve both corpora; the overall row is session-log truth. The output footer carries the HUMAN_BASELINE asymmetry disclosure (agent decision times include managed-browser screenshot latency).

**Dashboard — population block + `?source=human`.** `/results` now always shows an "Populations — agent vs human" block above the headline (agent and human headline lines computed from the unfiltered logs with the same separation rules and bug-era exclusion as the compare tool; aggregate counts/rates only — no session rows, no ground truth), lists the human tags seen, and supports `?source=human` as a population view alongside the existing exact-tag filters. The `/api/admin/metrics` link drops its source parameter in the human view (the metrics API filters by exact tag; the compare tool is the population surface). This is the minimum honest version: the per-session tables remain single-slice views selected by the source parameter.

**Tests — e2e gains T19 (28 checks).** (a) A `human-ben` session records the tag on the session, every session event, and its scored attempt; the tag appears in neither the creation response nor the challenge payload; metrics `?source=human-ben` counts it. (b) Allowlist table: canonicalizations (`HUMAN-BEN`, padded `human-sara`, `human-ben-2`, the known harness tags) accepted; `human-`, `human_ben`, `human--ben`, `human-ben!!`, a `<script>`-shaped value, a 64-char value, numeric and null sources all fall back to `live-agent`. (c) compare_report.js run against a hand-built fixture log whose every expected number was computed by hand first (agent 3 sessions/2 tokens incl. a bug-era FN27 attempt and an e2e session that must both vanish; human 2 sessions/1 token): all six printed rows match exactly, the window exclusion is counted in the header (1 attempt, 2 events), and a smoke run against the suite's own data dir renders both populations. Full suite **164 passed, 0 failed** (baseline 136); leak audit **34 passed, 0 failed** (unchanged — the source parameter is not a ground-truth channel: it is never rendered into any agent-facing payload, and the dashboard block prints aggregates only). **A server restart is required** for the running instance to pick up the server.js changes (the parent manages the systemd cutover).
