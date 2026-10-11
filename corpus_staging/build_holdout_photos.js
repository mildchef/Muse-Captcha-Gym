#!/usr/bin/env node
/*
 * build_holdout_photos.js — STAGING builder for the CAPTCHA Gym photo
 * HOLDOUT set (SPEC §4.6 + §5.4 final holdout), built from MS COCO 2017
 * validation images. Dev-track tooling — output goes to corpus_staging/,
 * NEVER into the live corpus/ tree. Deployment is an era-boundary act
 * performed separately by the project owner.
 *
 * Why train + boat only: SPEC §4.6 holds `train` and `boat` out of the
 * training corpus entirely — they exist solely as final-holdout transfer
 * tests. The live photo corpus (tools/build_photo_corpus.js) deliberately
 * leaves their instances unlabelled. The other 8 uncovered gym classes
 * (bridge, chimney, crosswalk, mountain, palm_tree, stairs, taxi,
 * tractor) have NO COCO 2017 category at all (verified against
 * instances_val2017.json: 80 categories), so they cannot be built from
 * COCO — they need a second permissive source (BUILD_NOTES: Open Images).
 *
 * LICENSE DISCIPLINE: identical to tools/build_photo_corpus.js — admit
 * ONLY COCO license ids 4 (CC-BY), 5 (CC-BY-SA), 7 (no known
 * restrictions), 8 (US Gov work). NC/ND excluded. Per-image provenance
 * recorded in the manifest, same schema as manifest_photos.jsonl, with
 * split 'holdout_final' and uid prefix 'h_'.
 *
 * GROUND TRUTH: rasterizer copied verbatim from build_photo_corpus.js
 * (pixel-center even-odd fill; SPEC §4 positive ≥0.5%, band 0.5–2%,
 * whole/partial/sliver ≥50% / 5–50% / 0.5–5%). Source-photo disjointness
 * (§8.1): any COCO image already used by the live photo corpus is
 * excluded here.
 *
 * Input: instances_val2017.json via COCO_VAL_JSON env, defaulting to
 * corpus_staging/_src/annotations/instances_val2017.json.
 * Output: corpus_staging/typeB/photos/h_NNNNNN.jpg + _mask.png,
 *         corpus_staging/typeB/manifest_photos_holdout.jsonl,
 *         corpus_staging/typeB/selection_stats.json
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const B = require('../tools/build_corpus.js');

const STAGE = __dirname;
const OUT_DIR = path.join(STAGE, 'typeB', 'photos');
const SRC = process.env.COCO_VAL_JSON || path.join(STAGE, '_src', 'annotations', 'instances_val2017.json');
const LIVE_MANIFEST = path.join(STAGE, '..', 'corpus', 'typeB', 'manifest_photos.jsonl');
const PERMISSIVE_LICENSES = new Set([4, 5, 7, 8]);
const CLASS_MAP = { 'train': 'train', 'boat': 'boat' };
const TARGETS = { train: 30, boat: 30 };
const MAX_SCENES = 60;
const POS_FLOOR = 0.005, BAND_HI = 0.02;

function encodePNGgray(gray, w, h) {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; Buffer.from(gray.buffer, y * w, w).copy(raw, y * (w + 1) + 1); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    B.pngChunk('IHDR', ihdr), B.pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })), B.pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
const CLASSES16 = ['bicycle', 'bridge', 'bus', 'car', 'chimney', 'crosswalk', 'fire_hydrant', 'motorcycle', 'mountain', 'palm_tree', 'stairs', 'taxi', 'traffic_light', 'tractor', 'train', 'boat'];
const CLASS_ID = {}; CLASSES16.forEach((c, i) => CLASS_ID[c] = i + 1);

/* Rasterize one image's annotations → { tiles: derived_tiles, owner }
 * (verbatim from tools/build_photo_corpus.js — identical derivation) */
function rasterize(img, anns) {
  const { width: w, height: h } = img;
  const owner = new Uint8Array(w * h);
  const counts = Array.from({ length: 16 }, () => ({}));
  const tileArea = (w * h) / 16;
  const sorted = anns.slice().sort((a, b) => (b.area || 0) - (a.area || 0));
  for (const ann of sorted) {
    const cls = ann._gymClass, id = CLASS_ID[cls];
    for (const poly of ann.segmentation) {
      if (!Array.isArray(poly) || poly.length < 6) continue;
      const xs = [], ys = [];
      for (let i = 0; i < poly.length; i += 2) { xs.push(poly[i]); ys.push(poly[i + 1]); }
      const yMin = Math.max(0, Math.floor(Math.min(...ys))), yMax = Math.min(h - 1, Math.ceil(Math.max(...ys)));
      const n = xs.length;
      for (let y = yMin; y <= yMax; y++) {
        const Y = y + 0.5, nodes = [];
        for (let i = 0, j = n - 1; i < n; j = i++) {
          if ((ys[i] > Y) !== (ys[j] > Y)) nodes.push(xs[i] + ((Y - ys[i]) / (ys[j] - ys[i])) * (xs[j] - xs[i]));
        }
        nodes.sort((a, b) => a - b);
        for (let k = 0; k + 1 < nodes.length; k += 2) {
          const x0 = Math.max(0, Math.ceil(nodes[k] - 0.5)), x1 = Math.min(w - 1, Math.ceil(nodes[k + 1] - 0.5) - 1);
          for (let x = x0; x <= x1; x++) {
            owner[y * w + x] = id;
            const tile = Math.min(3, Math.floor(y / (h / 4))) * 4 + Math.min(3, Math.floor(x / (w / 4)));
            counts[tile][cls] = (counts[tile][cls] || 0) + 1;
          }
        }
      }
    }
  }
  const tiles = counts.map(c => {
    const classes = {}, positive_for = [], band_for = [], size_bands = {};
    for (const [cls, n] of Object.entries(c)) {
      const ov = Math.round((n / tileArea) * 100000) / 100000;
      if (ov < POS_FLOOR) continue;
      classes[cls] = ov; positive_for.push(cls);
      if (ov < BAND_HI) band_for.push(cls);
      size_bands[cls] = ov >= 0.5 ? 'whole' : ov >= 0.05 ? 'partial' : 'sliver';
    }
    return { classes, positive_for, band_for, size_bands };
  });
  return { tiles, owner };
}

function main() {
  if (!fs.existsSync(SRC)) { console.error('COCO val annotations not found at ' + SRC); process.exit(1); }
  const coco = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const licById = {}; for (const l of coco.licenses) licById[l.id] = l;
  const catById = {}; for (const c of coco.categories) if (CLASS_MAP[c.name]) catById[c.id] = CLASS_MAP[c.name];
  const imgById = {}; for (const im of coco.images) imgById[im.id] = im;

  // Source-photo disjointness vs the live photo corpus (§8.1)
  const liveCocoIds = new Set();
  if (fs.existsSync(LIVE_MANIFEST)) {
    for (const line of fs.readFileSync(LIVE_MANIFEST, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const m = JSON.parse(line); if (m.coco_id != null) liveCocoIds.add(m.coco_id);
    }
  }

  const annsByImg = {};
  for (const a of coco.annotations) {
    if (a.iscrowd || !catById[a.category_id] || !Array.isArray(a.segmentation)) continue;
    (annsByImg[a.image_id] = annsByImg[a.image_id] || []).push({ ...a, _gymClass: catById[a.category_id] });
  }

  // Candidate funnel with per-stage counts, per class
  const stats = { funnel: {}, perClass: {} };
  for (const cls of Object.values(CLASS_MAP)) {
    stats.perClass[cls] = { imagesWithInstances: 0, rejectedLicense: 0, admittedLicenseIds: {}, rejectedGeometry: 0, rejectedLiveOverlap: 0, candidates: 0, selected: 0 };
  }
  const classOfImg = {}; // imgId -> Set of mapped classes present (pre-filter)
  for (const [imgId, anns] of Object.entries(annsByImg)) {
    classOfImg[imgId] = new Set(anns.map(a => a._gymClass));
    for (const c of classOfImg[imgId]) stats.perClass[c].imagesWithInstances++;
  }
  const candidates = [];
  for (const [imgId, anns] of Object.entries(annsByImg)) {
    const img = imgById[imgId];
    const classes = classOfImg[imgId];
    if (liveCocoIds.has(img.id)) { for (const c of classes) stats.perClass[c].rejectedLiveOverlap++; continue; }
    if (!PERMISSIVE_LICENSES.has(img.license)) { for (const c of classes) stats.perClass[c].rejectedLicense++; continue; }
    for (const c of classes) stats.perClass[c].admittedLicenseIds[img.license] = (stats.perClass[c].admittedLicenseIds[img.license] || 0) + 1;
    if (!img || img.width < 400 || img.height < 300) { for (const c of classes) stats.perClass[c].rejectedGeometry++; continue; }
    const { tiles } = rasterize(img, anns);
    const present = new Set(); let targetable = false;
    for (const t of tiles) for (const c of t.positive_for) { present.add(c); if (!t.band_for.includes(c)) targetable = true; }
    const posTilesByClass = {};
    for (const c of present) posTilesByClass[c] = tiles.filter(t => t.positive_for.includes(c)).length;
    if (!targetable || !Object.values(posTilesByClass).some(n => n >= 2)) { for (const c of classes) stats.perClass[c].rejectedGeometry++; continue; }
    for (const c of present) stats.perClass[c].candidates++;
    candidates.push({ img, tiles, present: [...present] });
  }
  candidates.sort((a, b) => a.img.id - b.img.id);
  console.log(`candidates (permissive, geometry ok, disjoint from live): ${candidates.length}`);

  // Greedy balanced selection (same policy as the live builder)
  const containing = {}; const chosen = [];
  const need = (c) => (containing[c] || 0) < (TARGETS[c] || 0);
  for (const cand of candidates) {
    if (chosen.length >= MAX_SCENES) break;
    if (!cand.present.some(need)) continue;
    chosen.push(cand); for (const c of cand.present) containing[c] = (containing[c] || 0) + 1;
  }
  console.log(`selected: ${chosen.length} scenes · containing per class:`, containing);

  // Download + emit
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = []; let n = 0, failed = 0;
  for (const cand of chosen) {
    const { img, tiles } = cand;
    const url = 'http://images.cocodataset.org/val2017/' + img.file_name;
    let buf;
    try { buf = execFileSync('curl', ['-s', '--max-time', '30', url], { maxBuffer: 8 * 1024 * 1024 }); }
    catch { failed++; continue; }
    if (buf.length < 8000 || buf[0] !== 0xFF || buf[1] !== 0xD8 || buf[buf.length - 2] !== 0xFF || buf[buf.length - 1] !== 0xD9) { failed++; continue; }
    n++;
    const uid = 'h_' + String(n).padStart(6, '0');
    const file = `typeB/photos/${uid}.jpg`, mask = `typeB/photos/${uid}_mask.png`;
    fs.writeFileSync(path.join(OUT_DIR, `${uid}.jpg`), buf);
    const { owner } = rasterize(img, annsByImg[img.id]);
    fs.writeFileSync(path.join(OUT_DIR, `${uid}_mask.png`), encodePNGgray(owner, img.width, img.height));
    const lic = licById[img.license] || {};
    manifest.push({
      scene_uid: uid, file, mask, classes_present: cand.present.slice().sort(),
      source: 'coco', licence: lic.name || ('COCO license ' + img.license), license_url: lic.url || null,
      coco_id: img.id, flickr_url: img.flickr_url || null,
      split: 'holdout_final', photo: true, width: img.width, height: img.height,
      annotators: 0, kappa: null,
      primary_class: null, sliver_engineered: false,
      axes: { occlusion: 'unknown', blur: 'unknown' },
      derived_tiles: tiles,
    });
  }
  for (const m of manifest) for (const c of m.classes_present) stats.perClass[c].selected++;
  const manPath = path.join(STAGE, 'typeB', 'manifest_photos_holdout.jsonl');
  fs.writeFileSync(manPath, manifest.map(m => JSON.stringify(m)).join('\n') + '\n');
  const licDist = {};
  for (const m of manifest) licDist[m.licence] = (licDist[m.licence] || 0) + 1;
  stats.emitted = manifest.length; stats.downloadFailures = failed; stats.licenseDistribution = licDist;
  stats.containing = containing;
  fs.writeFileSync(path.join(STAGE, 'typeB', 'selection_stats.json'), JSON.stringify(stats, null, 2) + '\n');
  console.log(`emitted: ${manifest.length} holdout photo scenes (${failed} download/verify failures dropped)`);
  console.log('license distribution:', licDist);
  console.log('per-class stats:', JSON.stringify(stats.perClass, null, 1));
}
if (require.main === module) main();
