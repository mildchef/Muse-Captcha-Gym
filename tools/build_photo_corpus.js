#!/usr/bin/env node
/*
 * build_photo_corpus.js — CAPTCHA Gym REAL-PHOTO Type B transfer corpus
 * (SPEC §5.1 route 1 + §8.4 style-transfer set), built from MS COCO 2017
 * validation images. Stage 3.
 *
 * LICENSE DISCIPLINE (absolute — see CREDITS.md):
 * - COCO annotations are CC-BY 4.0 (COCO Consortium).
 * - Each IMAGE keeps its own Flickr license, recorded per image in the
 *   annotations file. This builder admits ONLY license ids:
 *     4  Attribution License (CC-BY 2.0)
 *     5  Attribution-ShareAlike License (CC-BY-SA 2.0)
 *     7  No known copyright restrictions
 *     8  United States Government Work
 *   All NonCommercial (1, 2) and NoDerivs (3, 6) images are EXCLUDED.
 *   Per-image license name/URL + Flickr URL are recorded in the manifest.
 *
 * GROUND TRUTH: COCO instance polygons are rasterized mechanically —
 * a pixel belongs to a class instance iff the pixel CENTER lies inside
 * the polygon (even-odd fill). Per-tile overlaps then follow SPEC §4
 * exactly (positive ≥0.5% of tile area; band 0.5–2%; whole/partial/
 * sliver bands). iscrowd=1 and bbox-only annotations are skipped.
 * The shipped mask PNG is the visible-owner map (annotations painted
 * largest-first so smaller instances own their overlaps).
 * Caveat, stated plainly: the polygons are human annotations — the
 * derivation is mechanical, but the source masks carry human-level
 * precision, unlike the synthetic corpus's by-construction masks.
 * That is exactly why photos are an EVAL/transfer set (§8.4), never
 * the scoring core: their split is 'eval'.
 *
 * Input: instances_val2017.json (COCO annotations_trainval2017.zip),
 * path via COCO_VAL_JSON env or /tmp/coco/annotations/instances_val2017.json.
 * Images are fetched individually from images.cocodataset.org.
 * Output: corpus/typeB/photos/p_NNNNNN.jpg + _mask.png + manifest_photos.jsonl
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const B = require('./build_corpus.js');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'corpus', 'typeB', 'photos');
const SRC = process.env.COCO_VAL_JSON || '/tmp/coco/annotations/instances_val2017.json';
const PERMISSIVE_LICENSES = new Set([4, 5, 7, 8]);
const CLASS_MAP = { 'bicycle': 'bicycle', 'car': 'car', 'motorcycle': 'motorcycle', 'bus': 'bus', 'traffic light': 'traffic_light', 'fire hydrant': 'fire_hydrant' };
// COCO 'train' and 'boat' are the gym's holdout classes (SPEC §4.6) and are
// deliberately NOT mapped: their instances stay unlabelled context.
const TARGETS = { bicycle: 25, bus: 25, car: 25, motorcycle: 25, traffic_light: 30, fire_hydrant: 20 };
const MAX_SCENES = 180, MIN_SCENES = 120;
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

/* Rasterize one image's annotations → { tiles: derived_tiles, owner } */
function rasterize(img, anns) {
  const { width: w, height: h } = img;
  const owner = new Uint8Array(w * h);
  const counts = Array.from({ length: 16 }, () => ({}));
  const tileArea = (w * h) / 16;
  const sorted = anns.slice().sort((a, b) => (b.area || 0) - (a.area || 0)); // large first; small own their overlaps
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
  if (!fs.existsSync(SRC)) { console.error('COCO val annotations not found at ' + SRC + ' — download annotations_trainval2017.zip from images.cocodataset.org and extract instances_val2017.json first.'); process.exit(1); }
  const coco = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const licById = {}; for (const l of coco.licenses) licById[l.id] = l;
  const catById = {}; for (const c of coco.categories) if (CLASS_MAP[c.name]) catById[c.id] = CLASS_MAP[c.name];
  const imgById = {}; for (const im of coco.images) imgById[im.id] = im;
  const annsByImg = {};
  for (const a of coco.annotations) {
    if (a.iscrowd || !catById[a.category_id] || !Array.isArray(a.segmentation)) continue;
    (annsByImg[a.image_id] = annsByImg[a.image_id] || []).push({ ...a, _gymClass: catById[a.category_id] });
  }
  // Candidate scenes
  const candidates = [];
  let skippedLicense = 0;
  for (const [imgId, anns] of Object.entries(annsByImg)) {
    const img = imgById[imgId];
    if (!img || img.width < 400 || img.height < 300) continue;
    if (!PERMISSIVE_LICENSES.has(img.license)) { skippedLicense++; continue; }
    const { tiles } = rasterize(img, anns);
    const present = new Set(); let targetable = false;
    for (const t of tiles) for (const c of t.positive_for) { present.add(c); if (!t.band_for.includes(c)) targetable = true; }
    const posTilesByClass = {};
    for (const c of present) posTilesByClass[c] = tiles.filter(t => t.positive_for.includes(c)).length;
    if (!targetable || !Object.values(posTilesByClass).some(n => n >= 2)) continue;
    candidates.push({ img, tiles, present: [...present] });
  }
  candidates.sort((a, b) => a.img.id - b.img.id);
  console.log(`candidates (permissive license, geometry ok): ${candidates.length}  ·  images skipped on license: ${skippedLicense}`);
  // Greedy balanced selection
  const containing = {}; const chosen = [];
  const need = (c) => (containing[c] || 0) < (TARGETS[c] || 0);
  for (const cand of candidates) {
    if (chosen.length >= MAX_SCENES) break;
    if (!cand.present.some(need)) continue;
    chosen.push(cand); for (const c of cand.present) containing[c] = (containing[c] || 0) + 1;
  }
  if (chosen.length < MIN_SCENES) {
    for (const cand of candidates) {
      if (chosen.length >= MIN_SCENES) break;
      if (chosen.includes(cand)) continue;
      chosen.push(cand); for (const c of cand.present) containing[c] = (containing[c] || 0) + 1;
    }
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
    const uid = 'p_' + String(n).padStart(6, '0');
    const file = `typeB/photos/${uid}.jpg`, mask = `typeB/photos/${uid}_mask.png`;
    fs.writeFileSync(path.join(ROOT, 'corpus', file), buf);
    const { owner } = rasterize(img, annsByImg[img.id]);
    fs.writeFileSync(path.join(ROOT, 'corpus', mask), encodePNGgray(owner, img.width, img.height));
    const lic = licById[img.license] || {};
    manifest.push({
      scene_uid: uid, file, mask, classes_present: cand.present.slice().sort(),
      source: 'coco', licence: lic.name || ('COCO license ' + img.license), license_url: lic.url || null,
      coco_id: img.id, flickr_url: img.flickr_url || null,
      split: 'eval', photo: true, width: img.width, height: img.height,
      annotators: 0, kappa: null, // human polygons (COCO); derivation mechanical — see header
      primary_class: null, sliver_engineered: false,
      axes: { occlusion: 'unknown', blur: 'unknown' },
      derived_tiles: tiles,
    });
  }
  fs.writeFileSync(path.join(ROOT, 'corpus', 'typeB', 'manifest_photos.jsonl'), manifest.map(m => JSON.stringify(m)).join('\n') + '\n');
  const licDist = {};
  for (const m of manifest) licDist[m.licence] = (licDist[m.licence] || 0) + 1;
  console.log(`emitted: ${manifest.length} photo scenes (${failed} download/verify failures dropped)`);
  console.log('license distribution:', licDist);
}
if (require.main === module) main();
