#!/usr/bin/env node
/*
 * build_oi_pilot.js — STAGING pilot builder for the CAPTCHA Gym photo
 * corpus from Open Images (V5/V6 annotation files over the OID image
 * pool). Dev-track tooling — output goes to corpus_staging/, NEVER into
 * the live corpus/ tree. Deployment is an era-boundary act performed
 * separately by the project owner.
 *
 * Why: 8 of the gym's 16 classes have no COCO 2017 category (bridge,
 * chimney, crosswalk, mountain, palm_tree, stairs, taxi, tractor —
 * verified by the predecessor against instances_val2017.json). Open
 * Images localizes only three of them with bounding boxes: stairs
 * (/m/01lynh), palm_tree (/m/0cdl1), taxi (/m/0pg52). Bridge, chimney,
 * crosswalk ("Zebra crossing"), mountain and tractor exist in OID only
 * as image-level classes — no boxes, no segmentation masks — so they
 * cannot be grounded mechanically from OID (see OPEN_IMAGES_SPIKE.md).
 *
 * LICENSE DISCIPLINE (project rule, unchanged): admit ONLY images whose
 * OWN recorded license — the per-image `License` field of the OID image
 * metadata CSV — is CC-BY or CC-BY-SA. The gate is mechanical: the
 * recorded license URL must match /licenses/(by|by-sa)/. Everything
 * else is rejected and counted. (The full OID validation split happens
 * to record CC BY 2.0 for all 41,620 images; the gate is enforced per
 * image regardless, and the recorded URL is stored verbatim in each
 * manifest line as provenance.)
 *
 * GROUND TRUTH BASIS — bounding boxes, NOT instance masks. OID has no
 * segmentation masks for these classes (checked: classes-segmentation
 * .txt, 350 classes). Boxes are rasterized with the SAME paint/order
 * semantics as tools/build_photo_corpus.js (boxes sorted by area
 * descending, painted pixels counted per tile, owner last-wins) and the
 * SAME derivation thresholds (SPEC §4: positive >= 0.5% of tile,
 * ambiguity band 0.5-2%, size bands whole >= 50% / partial 5-50% /
 * sliver 0.5-5%). Every manifest line is stamped
 * ground_truth_basis: "bbox" — a box includes background pixels a mask
 * would exclude, so box-derived tiles overstate object coverage; the
 * spike report quantifies this. IsGroupOf=1 boxes (crowd/region boxes,
 * the OID analog of COCO iscrowd) and IsDepiction=1 boxes (pictures of
 * the class inside the photo) are EXCLUDED from ground truth.
 *
 * DISJOINTNESS (§8.1): candidates whose Flickr photo id (from the OID
 * landing URL) appears in the live photo manifest or the staged holdout
 * manifest are excluded — the same Flickr photo must never sit in two
 * splits. Images with non-zero OID Rotation metadata are excluded
 * (bbox coordinates live in the upright frame; the raw Flickr file may
 * not be upright) and counted.
 *
 * Inputs (corpus_staging/_src/oi/):
 *   validation-images-with-rotation.csv  (OID image metadata + license)
 *   validation-annotations-bbox.csv      (OID validation boxes)
 * Outputs:
 *   corpus_staging/typeB/photos/o_NNNNNN.jpg + o_NNNNNN_mask.png
 *   corpus_staging/typeB/manifest_photos_oi_pilot.jsonl (split
 *     "staging_oi" — server play pools serve only train|eval, so these
 *     scenes are excluded from all play until an owner relabels them)
 *   corpus_staging/typeB/selection_stats_oi.json
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const B = require('../tools/build_corpus.js');

const STAGE = __dirname;
const SRC_DIR = path.join(STAGE, '_src', 'oi');
const OUT_DIR = path.join(STAGE, 'typeB', 'photos');
const LIVE_MANIFEST = path.join(STAGE, '..', 'corpus', 'typeB', 'manifest_photos.jsonl');
const HOLDOUT_MANIFEST = path.join(STAGE, 'typeB', 'manifest_photos_holdout.jsonl');
const CLASS_MAP = { '/m/01lynh': 'stairs', '/m/0cdl1': 'palm_tree', '/m/0pg52': 'taxi' };
const TARGETS = { stairs: 20, palm_tree: 20, taxi: 20 };
const MAX_SCENES = 60;
const POS_FLOOR = 0.005, BAND_HI = 0.02;
const CLASSES16 = ['bicycle', 'bridge', 'bus', 'car', 'chimney', 'crosswalk', 'fire_hydrant', 'motorcycle', 'mountain', 'palm_tree', 'stairs', 'taxi', 'traffic_light', 'tractor', 'train', 'boat'];
const CLASS_ID = {}; CLASSES16.forEach((c, i) => CLASS_ID[c] = i + 1);

/* Minimal RFC-4180 CSV reader (the OID metadata has quoted fields). */
function parseCSV(text) {
  const rows = []; let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

/* JPEG dimensions from the SOF0/SOF2 segment — stdlib only. */
function jpegDims(buf) {
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) return null;
  let off = 2;
  while (off + 4 < buf.length) {
    if (buf[off] !== 0xFF) return null;
    const marker = buf[off + 1];
    if (marker === 0xC0 || marker === 0xC2) {
      return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
    }
    if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD9)) { off += 2; continue; }
    const len = buf.readUInt16BE(off + 2);
    if (len < 2) return null;
    off += 2 + len;
  }
  return null;
}

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

/* Rasterize one image's boxes -> { tiles, owner }.
 * Same paint semantics as tools/build_photo_corpus.js: instances sorted
 * by area descending, every painted pixel counted per tile (overlaps
 * double-count), owner map last-wins. */
function rasterizeBoxes(w, h, boxes) {
  const owner = new Uint8Array(w * h);
  const counts = Array.from({ length: 16 }, () => ({}));
  const tileArea = (w * h) / 16;
  const sorted = boxes.slice().sort((a, b) => ((b.x1 - b.x0) * (b.y1 - b.y0)) - ((a.x1 - a.x0) * (a.y1 - a.y0)));
  for (const box of sorted) {
    const cls = box.cls, id = CLASS_ID[cls];
    const x0 = Math.max(0, Math.floor(box.x0 * w)), x1 = Math.min(w - 1, Math.ceil(box.x1 * w) - 1);
    const y0 = Math.max(0, Math.floor(box.y0 * h)), y1 = Math.min(h - 1, Math.ceil(box.y1 * h) - 1);
    for (let y = y0; y <= y1; y++) {
      const tileRow = Math.min(3, Math.floor(y / (h / 4))) * 4;
      for (let x = x0; x <= x1; x++) {
        owner[y * w + x] = id;
        const tile = tileRow + Math.min(3, Math.floor(x / (w / 4)));
        counts[tile][cls] = (counts[tile][cls] || 0) + 1;
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

function flickrIdFromUrl(u) {
  if (!u) return null;
  const m = String(u).match(/flickr\.com\/photos\/[^/]+\/(\d+)/);
  return m ? m[1] : null;
}
function licenseName(url) {
  const m = String(url || '').match(/licenses\/(by|by-sa)\/([0-9.]+)\//);
  if (!m) return null;
  return (m[1] === 'by' ? 'CC BY ' : 'CC BY-SA ') + m[2];
}

function main() {
  const metaPath = path.join(SRC_DIR, 'validation-images-with-rotation.csv');
  const bboxPath = path.join(SRC_DIR, 'validation-annotations-bbox.csv');
  for (const p of [metaPath, bboxPath]) if (!fs.existsSync(p)) { console.error('missing input: ' + p); process.exit(1); }

  // Image metadata (license gate lives here)
  const metaRows = parseCSV(fs.readFileSync(metaPath, 'utf8'));
  const mHead = metaRows[0].map(s => s.trim());
  const mi = {}; for (const k of ['ImageID', 'OriginalURL', 'OriginalLandingURL', 'License', 'Author', 'Rotation']) mi[k] = mHead.indexOf(k);
  const imgMeta = {};
  for (let i = 1; i < metaRows.length; i++) {
    const r = metaRows[i]; if (!r[mi.ImageID]) continue;
    imgMeta[r[mi.ImageID]] = { url: r[mi.OriginalURL], landing: r[mi.OriginalLandingURL], license: r[mi.License], author: r[mi.Author], rotation: r[mi.Rotation] };
  }

  // Flickr ids already used by the live corpus + staged holdout (§8.1)
  const usedFlickr = new Set();
  for (const mp of [LIVE_MANIFEST, HOLDOUT_MANIFEST]) {
    if (!fs.existsSync(mp)) continue;
    for (const line of fs.readFileSync(mp, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const id = flickrIdFromUrl(JSON.parse(line).flickr_url); if (id) usedFlickr.add(id);
    }
  }

  // Boxes for the three mapped classes
  const boxesByImg = {};
  const bboxLines = fs.readFileSync(bboxPath, 'utf8').split('\n');
  for (let i = 1; i < bboxLines.length; i++) {
    const f = bboxLines[i].split(','); if (f.length < 13) continue;
    const cls = CLASS_MAP[f[2]]; if (!cls) continue;
    (boxesByImg[f[0]] = boxesByImg[f[0]] || []).push({
      cls, x0: +f[4], x1: +f[5], y0: +f[6], y1: +f[7],
      groupOf: f[10] === '1', depiction: f[11] === '1',
    });
  }

  const stats = { source: 'open_images', splitSource: 'validation', perClass: {}, licenseGate: {}, emitted: 0, downloadFailures: 0 };
  for (const cls of Object.values(CLASS_MAP)) stats.perClass[cls] = {
    imagesWithBoxes: 0, boxesTotal: 0, boxesExcludedGroupOf: 0, boxesExcludedDepiction: 0,
    rejectedLicense: 0, rejectedRotation: 0, rejectedLiveOverlap: 0, rejectedGeometry: 0, candidates: 0, selected: 0,
  };

  const candidates = [];
  for (const [imgId, boxes] of Object.entries(boxesByImg)) {
    const meta = imgMeta[imgId]; if (!meta) continue;
    const classesHere = [...new Set(boxes.map(b => b.cls))];
    for (const c of classesHere) { stats.perClass[c].imagesWithBoxes++; stats.perClass[c].boxesTotal += boxes.filter(b => b.cls === c).length; }
    // License gate — per-image, mechanical, from the recorded license URL
    const licName = licenseName(meta.license);
    stats.licenseGate[meta.license] = (stats.licenseGate[meta.license] || 0) + 1;
    if (!licName) { for (const c of classesHere) stats.perClass[c].rejectedLicense++; continue; }
    // Rotation gate (annotation frame is upright)
    const rot = parseFloat(meta.rotation);
    if (meta.rotation !== '' && meta.rotation != null && !Number.isNaN(rot) && rot !== 0) { for (const c of classesHere) stats.perClass[c].rejectedRotation++; continue; }
    // Disjointness vs live + holdout Flickr photos
    const fid = flickrIdFromUrl(meta.landing) || flickrIdFromUrl(meta.url);
    if (fid && usedFlickr.has(fid)) { for (const c of classesHere) stats.perClass[c].rejectedLiveOverlap++; continue; }
    // Ground-truth boxes: drop group-of / depiction
    const gtBoxes = boxes.filter(b => {
      if (b.groupOf) { stats.perClass[b.cls].boxesExcludedGroupOf++; return false; }
      if (b.depiction) { stats.perClass[b.cls].boxesExcludedDepiction++; return false; }
      return true;
    });
    if (!gtBoxes.length) continue;
    candidates.push({ imgId, meta, licName, gtBoxes, classesHere: [...new Set(gtBoxes.map(b => b.cls))] });
  }
  console.log(`candidates after license/rotation/disjointness gates: ${candidates.length}`);

  // Download, dimension, targetability (needs real pixels).
  // Bytes come from the official CVDF S3 mirror of the OID pool
  // (open-images-dataset.s3.amazonaws.com/<split>/<ImageID>.jpg): direct
  // Flickr originals are CIDR-rate-limited (HTTP 429) from many egress
  // ranges. The mirror serves the same OID image by ImageID but
  // RE-ENCODED (its MD5 differs from the metadata's OriginalMD5), so
  // dimensions are taken from the actual file; bbox coordinates are
  // normalized, so ground truth is unaffected by the resize. License
  // provenance is the OID metadata row keyed by ImageID, not the bytes.
  const ready = [];
  for (const cand of candidates) {
    let buf;
    const mirrorUrl = `https://open-images-dataset.s3.amazonaws.com/validation/${cand.imgId}.jpg`;
    try { buf = execFileSync('curl', ['-sL', '--max-time', '40', mirrorUrl], { maxBuffer: 12 * 1024 * 1024 }); }
    catch { stats.downloadFailures++; continue; }
    cand.mirrorUrl = mirrorUrl;
    if (buf.length < 8000 || buf[0] !== 0xFF || buf[1] !== 0xD8 || buf[buf.length - 2] !== 0xFF || buf[buf.length - 1] !== 0xD9) { stats.downloadFailures++; continue; }
    const dims = jpegDims(buf);
    if (!dims || dims.width < 400 || dims.height < 300) { for (const c of cand.classesHere) stats.perClass[c].rejectedGeometry++; continue; }
    const { tiles } = rasterizeBoxes(dims.width, dims.height, cand.gtBoxes);
    const present = new Set(); let anyTargetable = false;
    for (const t of tiles) for (const c of t.positive_for) {
      present.add(c);
    }
    for (const c of present) {
      const posTiles = tiles.filter(t => t.positive_for.includes(c));
      if (posTiles.length >= 2 && posTiles.some(t => !t.band_for.includes(c))) anyTargetable = true;
    }
    if (!anyTargetable) { for (const c of cand.classesHere) stats.perClass[c].rejectedGeometry++; continue; }
    for (const c of present) stats.perClass[c].candidates++;
    ready.push({ ...cand, buf, dims, tiles, present: [...present] });
  }
  ready.sort((a, b) => a.imgId < b.imgId ? -1 : 1);
  console.log(`downloaded + targetable: ${ready.length}`);

  // Greedy balanced selection (same policy as the COCO builders)
  const containing = {}; const chosen = [];
  const need = (c) => (containing[c] || 0) < (TARGETS[c] || 0);
  for (const cand of ready) {
    if (chosen.length >= MAX_SCENES) break;
    if (!cand.present.some(need)) continue;
    chosen.push(cand); for (const c of cand.present) containing[c] = (containing[c] || 0) + 1;
  }
  console.log(`selected: ${chosen.length} scenes · containing per class:`, containing);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = []; let n = 0;
  for (const cand of chosen) {
    n++;
    const uid = 'o_' + String(n).padStart(6, '0');
    const file = `typeB/photos/${uid}.jpg`, mask = `typeB/photos/${uid}_mask.png`;
    fs.writeFileSync(path.join(OUT_DIR, `${uid}.jpg`), cand.buf);
    const { owner } = rasterizeBoxes(cand.dims.width, cand.dims.height, cand.gtBoxes);
    fs.writeFileSync(path.join(OUT_DIR, `${uid}_mask.png`), encodePNGgray(owner, cand.dims.width, cand.dims.height));
    manifest.push({
      scene_uid: uid, file, mask, classes_present: cand.present.slice().sort(),
      source: 'open_images', licence: cand.licName, license_url: cand.meta.license,
      coco_id: null, flickr_url: cand.meta.landing || null,
      oi_image_id: cand.imgId, author: cand.meta.author || null, original_url: cand.meta.url,
      served_via: 'cvdf_s3_mirror', mirror_url: cand.mirrorUrl,
      ground_truth_basis: 'bbox',
      split: 'staging_oi', photo: true, width: cand.dims.width, height: cand.dims.height,
      annotators: 0, kappa: null,
      primary_class: null, sliver_engineered: false,
      axes: { occlusion: 'unknown', blur: 'unknown' },
      derived_tiles: cand.tiles,
    });
  }
  for (const m of manifest) for (const c of m.classes_present) stats.perClass[c].selected++;
  stats.emitted = manifest.length; stats.containing = containing;
  const licDist = {}; for (const m of manifest) licDist[m.licence] = (licDist[m.licence] || 0) + 1;
  stats.licenseDistribution = licDist;
  fs.writeFileSync(path.join(STAGE, 'typeB', 'manifest_photos_oi_pilot.jsonl'), manifest.map(m => JSON.stringify(m)).join('\n') + '\n');
  fs.writeFileSync(path.join(STAGE, 'typeB', 'selection_stats_oi.json'), JSON.stringify(stats, null, 2) + '\n');
  console.log(`emitted: ${manifest.length} OI pilot scenes (${stats.downloadFailures} download/verify failures dropped)`);
  console.log('license distribution:', licDist);
  console.log('per-class stats:', JSON.stringify(stats.perClass, null, 1));
}
if (require.main === module) main();
