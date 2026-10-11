#!/usr/bin/env node
/*
 * build_bridge_pilot.js — STAGING pilot builder for the one class Open
 * Images cannot ground mechanically: bridge (/m/015kr exists in OID
 * only as an image-level class — no boxes, no segmentation masks; see
 * OPEN_IMAGES_SPIKE.md). Dev-track tooling — output goes to
 * corpus_staging/, NEVER into the live corpus/ tree.
 *
 * Method: photos are selected from OID validation images carrying a
 * human-verified image-level bridge label (Confidence=1), passed
 * through the SAME gates as build_oi_pilot.js (per-image license from
 * the OID metadata License column, rotation, Flickr disjointness vs
 * live + holdout + OI pilot), downloaded from the CVDF S3 mirror — and
 * then boxed BY HAND. The boxes live in bridge_annotations.json: an
 * agent viewed each selected photo and estimated normalized boxes
 * around the bridge structure (span/deck/towers/piers; not water, not
 * sky, not reflections, not unrelated skyline). Candidates whose bridge
 * could not be boxed honestly (a pier/dock mislabel, a diffuse highway
 * interchange, a train-dominated guideway) were DROPPED, with reasons
 * recorded in the annotations file.
 *
 * HONESTY FLAGS, by design: every manifest line carries
 * ground_truth_basis: "bbox_hand", annotators: 1, and an `annotation`
 * block naming the method, the single annotator and the estimate
 * precision (~±0.02). There is no second annotator, so kappa is null
 * and cannot be computed. These are agent-estimated boxes: this set
 * trains detection/enumeration of bridge, NOT sliver discipline (a box
 * includes background a polygon would exclude, and hand estimates are
 * coarser than OID's own boxes). Same raster pipeline and SPEC §4
 * derivation thresholds as build_oi_pilot.js.
 *
 * Split is "staging_oi" — server play pools serve only train|eval, so
 * these scenes are unservable until an owner relabels them.
 *
 * Inputs (corpus_staging/_src/oi/):
 *   validation-images-with-rotation.csv        (metadata + license)
 *   validation-annotations-human-imagelabels.csv (image-level labels)
 *   bridge_annotations.json                     (the hand boxes)
 * Outputs:
 *   corpus_staging/typeB/photos/b_NNNNNN.jpg + b_NNNNNN_mask.png
 *   corpus_staging/typeB/manifest_photos_bridge_pilot.jsonl
 *   corpus_staging/typeB/selection_stats_bridge.json
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
const ANN_PATH = path.join(STAGE, 'bridge_annotations.json');
const BRIDGE_MID = '/m/015kr';
const POS_FLOOR = 0.005, BAND_HI = 0.02;
const CLASSES16 = ['bicycle', 'bridge', 'bus', 'car', 'chimney', 'crosswalk', 'fire_hydrant', 'motorcycle', 'mountain', 'palm_tree', 'stairs', 'taxi', 'traffic_light', 'tractor', 'train', 'boat'];
const CLASS_ID = {}; CLASSES16.forEach((c, i) => CLASS_ID[c] = i + 1);

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
function jpegDims(buf) {
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) return null;
  let off = 2;
  while (off + 4 < buf.length) {
    if (buf[off] !== 0xFF) return null;
    const marker = buf[off + 1];
    if (marker === 0xC0 || marker === 0xC2) return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
    if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD9)) { off += 2; continue; }
    const len = buf.readUInt16BE(off + 2); if (len < 2) return null;
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
/* Same paint semantics as build_oi_pilot.js / build_photo_corpus.js:
 * boxes sorted by area descending, painted pixels counted per tile
 * (overlaps double-count), owner map last-wins. */
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
  const ann = JSON.parse(fs.readFileSync(ANN_PATH, 'utf8'));
  const wanted = Object.keys(ann.scenes);
  const metaPath = path.join(SRC_DIR, 'validation-images-with-rotation.csv');
  const labelsPath = path.join(SRC_DIR, 'validation-annotations-human-imagelabels.csv');
  for (const p of [metaPath, labelsPath]) if (!fs.existsSync(p)) { console.error('missing input: ' + p); process.exit(1); }

  // The annotated images must genuinely carry the OID bridge label.
  const bridgeLabeled = new Set();
  for (const line of fs.readFileSync(labelsPath, 'utf8').split('\n')) {
    const f = line.split(',');
    if (f.length >= 4 && f[2] === BRIDGE_MID && f[3].trim() === '1') bridgeLabeled.add(f[0]);
  }

  const metaRows = parseCSV(fs.readFileSync(metaPath, 'utf8'));
  const mHead = metaRows[0].map(s => s.trim());
  const mi = {}; for (const k of ['ImageID', 'OriginalURL', 'OriginalLandingURL', 'License', 'Author', 'Rotation']) mi[k] = mHead.indexOf(k);
  const imgMeta = {};
  for (let i = 1; i < metaRows.length; i++) {
    const r = metaRows[i]; if (!r[mi.ImageID]) continue;
    imgMeta[r[mi.ImageID]] = { url: r[mi.OriginalURL], landing: r[mi.OriginalLandingURL], license: r[mi.License], author: r[mi.Author], rotation: r[mi.Rotation] };
  }

  const usedFlickr = new Set(); const usedOids = new Set();
  for (const mp of [path.join(STAGE, '..', 'corpus', 'typeB', 'manifest_photos.jsonl'),
                    path.join(STAGE, 'typeB', 'manifest_photos_holdout.jsonl'),
                    path.join(STAGE, 'typeB', 'manifest_photos_oi_pilot.jsonl')]) {
    if (!fs.existsSync(mp)) continue;
    for (const line of fs.readFileSync(mp, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const m = JSON.parse(line);
      const fid = flickrIdFromUrl(m.flickr_url); if (fid) usedFlickr.add(fid);
      if (m.oi_image_id) usedOids.add(m.oi_image_id);
    }
  }

  const stats = {
    source: 'open_images', splitSource: 'validation', class: 'bridge',
    poolBridgeLabeledConf1: bridgeLabeled.size,
    annotatedCandidates: wanted.length, droppedAfterViewing: ann.dropped_after_viewing,
    emitted: 0, downloadFailures: 0, rejected: [], targetabilityDropped: [],
  };
  const manifest = []; let n = 0;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const imgId of wanted.slice().sort()) {
    const sceneAnn = ann.scenes[imgId];
    if (!bridgeLabeled.has(imgId)) { stats.rejected.push({ imgId, reason: 'not bridge-labeled (conf=1) in OID' }); continue; }
    const meta = imgMeta[imgId];
    if (!meta) { stats.rejected.push({ imgId, reason: 'no metadata row' }); continue; }
    const licName = licenseName(meta.license);
    if (!licName) { stats.rejected.push({ imgId, reason: 'license gate: ' + meta.license }); continue; }
    const rot = parseFloat(meta.rotation);
    if (meta.rotation !== '' && meta.rotation != null && !Number.isNaN(rot) && rot !== 0) { stats.rejected.push({ imgId, reason: 'rotation ' + meta.rotation }); continue; }
    const fid = flickrIdFromUrl(meta.landing) || flickrIdFromUrl(meta.url);
    if ((fid && usedFlickr.has(fid)) || usedOids.has(imgId)) { stats.rejected.push({ imgId, reason: 'flickr/oi overlap with live or staged corpora' }); continue; }
    const mirrorUrl = `https://open-images-dataset.s3.amazonaws.com/validation/${imgId}.jpg`;
    let buf;
    try { buf = execFileSync('curl', ['-sL', '--max-time', '40', mirrorUrl], { maxBuffer: 64 * 1024 * 1024 }); }
    catch { stats.downloadFailures++; stats.rejected.push({ imgId, reason: 'download failed' }); continue; }
    if (buf.length < 8000 || buf[0] !== 0xFF || buf[1] !== 0xD8 || buf[buf.length - 2] !== 0xFF || buf[buf.length - 1] !== 0xD9) { stats.downloadFailures++; stats.rejected.push({ imgId, reason: 'not a complete JPEG' }); continue; }
    const dims = jpegDims(buf);
    if (!dims || dims.width < 400 || dims.height < 300) { stats.rejected.push({ imgId, reason: 'geometry ' + (dims ? dims.width + 'x' + dims.height : 'unknown') }); continue; }
    const boxes = sceneAnn.boxes.map(b => ({ cls: 'bridge', x0: b[0], y0: b[1], x1: b[2], y1: b[3] }));
    const { tiles, owner } = rasterizeBoxes(dims.width, dims.height, boxes);
    const posTiles = tiles.filter(t => t.positive_for.includes('bridge'));
    if (posTiles.length < 2 || !posTiles.some(t => !t.band_for.includes('bridge'))) {
      stats.targetabilityDropped.push({ imgId, positiveTiles: posTiles.length });
      continue;
    }
    n++;
    const uid = 'b_' + String(n).padStart(6, '0');
    fs.writeFileSync(path.join(OUT_DIR, `${uid}.jpg`), buf);
    fs.writeFileSync(path.join(OUT_DIR, `${uid}_mask.png`), encodePNGgray(owner, dims.width, dims.height));
    manifest.push({
      scene_uid: uid, file: `typeB/photos/${uid}.jpg`, mask: `typeB/photos/${uid}_mask.png`,
      classes_present: ['bridge'],
      source: 'open_images', licence: licName, license_url: meta.license,
      coco_id: null, flickr_url: meta.landing || null,
      oi_image_id: imgId, author: meta.author || null, original_url: meta.url,
      served_via: 'cvdf_s3_mirror', mirror_url: mirrorUrl,
      ground_truth_basis: 'bbox_hand',
      annotation: {
        method: 'agent-estimated bounding boxes from visual inspection of the photo',
        annotator: ann.annotator, annotators: 1, kappa: null,
        boxes: sceneAnn.boxes, note: sceneAnn.note || null,
      },
      split: 'staging_oi', photo: true, width: dims.width, height: dims.height,
      annotators: 1, kappa: null,
      primary_class: null, sliver_engineered: false,
      axes: { occlusion: 'unknown', blur: 'unknown' },
      derived_tiles: tiles,
    });
  }
  stats.emitted = manifest.length;
  let posPairs = 0, bandPairs = 0; const sizeBands = {};
  for (const m of manifest) for (const t of m.derived_tiles) {
    if (t.positive_for.includes('bridge')) {
      posPairs++;
      if (t.band_for.includes('bridge')) bandPairs++;
      sizeBands[t.size_bands.bridge] = (sizeBands[t.size_bands.bridge] || 0) + 1;
    }
  }
  stats.positivePairs = posPairs; stats.bandPairs = bandPairs;
  stats.bandShare = posPairs ? Math.round((bandPairs / posPairs) * 1000) / 10 + '%' : null;
  stats.sizeBands = sizeBands;
  const licDist = {}; for (const m of manifest) licDist[m.licence] = (licDist[m.licence] || 0) + 1;
  stats.licenseDistribution = licDist;
  fs.writeFileSync(path.join(STAGE, 'typeB', 'manifest_photos_bridge_pilot.jsonl'), manifest.map(m => JSON.stringify(m)).join('\n') + '\n');
  fs.writeFileSync(path.join(STAGE, 'typeB', 'selection_stats_bridge.json'), JSON.stringify(stats, null, 2) + '\n');
  console.log(`emitted: ${manifest.length} bridge scenes · positive pairs ${posPairs} · band share ${stats.bandShare} · size bands`, sizeBands);
  console.log('rejected:', stats.rejected.length, '· targetability-dropped:', stats.targetabilityDropped.length, '· licenses:', licDist);
}
if (require.main === module) main();
