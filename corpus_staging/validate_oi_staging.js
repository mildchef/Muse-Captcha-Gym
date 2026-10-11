#!/usr/bin/env node
/*
 * validate_oi_staging.js — validate the STAGED Open Images pilot corpus
 * (corpus_staging). Same consistency contract as validate_staging.js
 * (manifest <-> mask classification), applied to manifest_photos_oi_
 * pilot.jsonl:
 *   - every emitted file exists; JPEG SOI/EOI + dimensions match;
 *   - split is exactly "staging_oi" (unservable by the live play pools,
 *     which only take train|eval — the staged-set safety property);
 *   - licence is CC-BY* with a creativecommons.org license_url, and the
 *     per-image provenance fields (oi_image_id, original_url, author)
 *     are present; ground_truth_basis is "bbox";
 *   - re-derived tile classifications from the owner masks match the
 *     manifest's derived_tiles EXACTLY (classification-level; raw
 *     fractions re-derive with box rasterization — the mask records the
 *     final painted owner per pixel, so overlapping boxes contribute
 *     their painted area only. Numeric equality is therefore checked
 *     the same way the COCO builders' own verify() does: owner-based
 *     recomputation cannot reproduce multi-class paint counts, so —
 *     exactly as in build_corpus_typeb_photos.js — the check is
 *     classification + classes_present consistency, and the manifest
 *     fractions remain the build record);
 *   - classes_present == union of positive classes, non-empty, classes
 *     confined to the pilot set {stairs, palm_tree, taxi};
 *   - per-class targetability: >= 2 positive tiles AND >= 1 non-band
 *     positive tile for at least one class (the builder's bar).
 * Exit code 0 = all green.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const STAGE = __dirname;
const PILOT_CLASSES = { stairs: 11, palm_tree: 10, taxi: 12 };
const POS_FLOOR = 0.005, BAND_HI = 0.02;
const crcTable = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c; } return t; })();
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  let c = 0xFFFFFFFF; for (const b of td) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
  const crc = Buffer.alloc(4); crc.writeUInt32BE((c ^ 0xFFFFFFFF) >>> 0, 0);
  return Buffer.concat([len, td, crc]);
}
function paeth(a, b, c) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
function decodeGrayPNG(buf) {
  let pos = 8, w = 0, h = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
    if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(w * h); let prev = new Uint8Array(w);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (w + 1)], row = raw.subarray(y * (w + 1) + 1, (y + 1) * (w + 1)), cur = new Uint8Array(w);
    for (let x = 0; x < w; x++) {
      const a = x ? cur[x - 1] : 0, b = prev[x], c = x ? prev[x - 1] : 0, v = row[x];
      cur[x] = f === 0 ? v : f === 1 ? (v + a) & 255 : f === 2 ? (v + b) & 255 : f === 3 ? (v + ((a + b) >> 1)) & 255 : (v + paeth(a, b, c)) & 255;
    }
    out.set(cur, y * w); prev = cur;
  }
  return { w, h, px: out };
}
function tilesFromOwner(px, w, h) {
  const counts = Array.from({ length: 16 }, () => ({}));
  const tileArea = (w * h) / 16;
  for (let y = 0; y < h; y++) {
    const tr = Math.min(3, Math.floor(y / (h / 4))) * 4;
    for (let x = 0; x < w; x++) {
      const id = px[y * w + x]; if (!id) continue;
      const cls = Object.keys(PILOT_CLASSES).find(k => PILOT_CLASSES[k] === id);
      const t = tr + Math.min(3, Math.floor(x / (w / 4)));
      counts[t][cls] = (counts[t][cls] || 0) + 1;
    }
  }
  return counts.map(c => {
    const classes = {}, positive_for = [], band_for = [], size_bands = {};
    for (const [cls, n] of Object.entries(c)) {
      const ov = Math.round((n / tileArea) * 100000) / 100000;
      if (ov < POS_FLOOR) continue;
      classes[cls] = ov; positive_for.push(cls);
      if (ov < BAND_HI) band_for.push(cls);
      size_bands[cls] = ov >= 0.5 ? 'whole' : ov >= 0.05 ? 'partial' : 'sliver';
    }
    return { classes, positive_for: positive_for.sort(), band_for: band_for.sort(), size_bands };
  });
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

function main() {
  let failures = 0;
  const fail = (m) => { failures++; console.log('FAIL: ' + m); };
  const mfPath = path.join(STAGE, 'typeB', 'manifest_photos_oi_pilot.jsonl');
  const scenes = fs.readFileSync(mfPath, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  console.log(`OI pilot scenes: ${scenes.length}`);
  const byClass = {}; const sizeBandCount = {}; const bandShares = [];
  const seenIds = new Set();
  for (const sc of scenes) {
    if (sc.split !== 'staging_oi') fail(`${sc.scene_uid}: split is "${sc.split}", expected "staging_oi"`);
    if (!/^CC BY/.test(sc.licence || '') || !/creativecommons\.org\/licenses\/(by|by-sa)\//.test(sc.license_url || '')) fail(`${sc.scene_uid}: licence fields off (${sc.licence} / ${sc.license_url})`);
    if (sc.ground_truth_basis !== 'bbox') fail(`${sc.scene_uid}: ground_truth_basis "${sc.ground_truth_basis}" != bbox`);
    if (!sc.oi_image_id || !sc.original_url || !sc.author) fail(`${sc.scene_uid}: missing provenance (oi_image_id/original_url/author)`);
    if (seenIds.has(sc.oi_image_id)) fail(`${sc.scene_uid}: duplicate oi_image_id ${sc.oi_image_id}`);
    seenIds.add(sc.oi_image_id);
    if (!sc.classes_present.length) fail(`${sc.scene_uid}: empty classes_present`);
    for (const c of sc.classes_present) {
      if (!(c in PILOT_CLASSES)) fail(`${sc.scene_uid}: class "${c}" outside pilot set`);
      byClass[c] = (byClass[c] || 0) + 1;
    }
    const file = path.join(STAGE, sc.file), maskPath = path.join(STAGE, sc.mask);
    if (!fs.existsSync(file)) { fail(`${sc.scene_uid}: image missing`); continue; }
    if (!fs.existsSync(maskPath)) { fail(`${sc.scene_uid}: mask missing`); continue; }
    const jpg = fs.readFileSync(file);
    if (jpg[0] !== 0xFF || jpg[1] !== 0xD8 || jpg[jpg.length - 2] !== 0xFF || jpg[jpg.length - 1] !== 0xD9) fail(`${sc.scene_uid}: JPEG SOI/EOI markers bad`);
    const dims = jpegDims(jpg);
    if (!dims || dims.width !== sc.width || dims.height !== sc.height) fail(`${sc.scene_uid}: JPEG dims ${dims && dims.width}x${dims && dims.height} != manifest ${sc.width}x${sc.height}`);
    const mask = decodeGrayPNG(fs.readFileSync(maskPath));
    if (mask.w !== sc.width || mask.h !== sc.height) fail(`${sc.scene_uid}: mask dims ${mask.w}x${mask.h} != ${sc.width}x${sc.height}`);
    for (const v of mask.px) if (v !== 0 && !Object.values(PILOT_CLASSES).includes(v)) { fail(`${sc.scene_uid}: unknown mask class id ${v}`); break; }
    const retiles = tilesFromOwner(mask.px, mask.w, mask.h);
    const rePresent = [...new Set(retiles.flatMap(t => t.positive_for))].sort();
    if (JSON.stringify(rePresent) !== JSON.stringify(sc.classes_present.slice().sort())) {
      fail(`${sc.scene_uid}: classes_present ${JSON.stringify(sc.classes_present)} != mask-derived ${JSON.stringify(rePresent)}`);
    }
    let posPairs = 0, bandPairs = 0;
    for (let i = 0; i < 16; i++) {
      for (const cls of Object.keys(PILOT_CLASSES)) {
        const mIn = sc.derived_tiles[i].positive_for.includes(cls), rIn = retiles[i].positive_for.includes(cls);
        if (mIn) { posPairs++; if (sc.derived_tiles[i].band_for.includes(cls)) bandPairs++; }
        // Box-vs-mask divergence is legitimate ONLY in the known direction:
        // the manifest fractions count painted box pixels (background
        // inside the box included); the owner mask records the same boxes
        // — for a single class the two agree exactly. Multi-class overlap
        // can flip near-threshold classifications; report, don't fail,
        // beyond a tolerance of 0 occurrences mismatch > 2 per scene.
        if (mIn !== rIn) fail(`${sc.scene_uid} tile ${i} ${cls}: manifest positive=${mIn} mask-derived=${rIn}`);
      }
    }
    if (posPairs) bandShares.push(bandPairs / posPairs);
    for (const t of sc.derived_tiles) for (const [cls, band] of Object.entries(t.size_bands)) sizeBandCount[band] = (sizeBandCount[band] || 0) + 1;
    for (const c of sc.classes_present) {
      const posTiles = sc.derived_tiles.filter(t => t.positive_for.includes(c));
      if (posTiles.length < 2 || !posTiles.some(t => !t.band_for.includes(c))) fail(`${sc.scene_uid}: ${c} below targetability bar in manifest`);
    }
  }
  console.log('scenes containing per class:', byClass);
  console.log(`band share of positive pairs: ${bandShares.length ? (bandShares.reduce((a, b) => a + b, 0) / bandShares.length * 100).toFixed(1) + '%' : 'n/a'}`);
  console.log('size-band counts (positive pairs):', sizeBandCount);
  console.log(failures === 0 ? 'VALIDATION PASSED — OI pilot corpus is internally consistent.' : `VALIDATION FAILED — ${failures} problem(s).`);
  process.exit(failures ? 1 : 0);
}
main();
