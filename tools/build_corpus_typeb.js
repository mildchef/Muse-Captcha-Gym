#!/usr/bin/env node
/*
 * build_corpus_typeb.js — CAPTCHA Gym Type B corpus builder (SPEC §3.5, §5).
 *
 * Scenes are 480×480 synthetic renders built with the SAME class painters as
 * the Type A corpus (tools/build_corpus.js), so ground truth is exact by
 * construction: every object is painted onto its own per-class layer, the
 * visible-owner map is computed pixel-by-pixel after occlusion punch-out,
 * and the shipped mask PNG (single channel, pixel = class id) is derived
 * from that owner map. Per-tile ground truth follows SPEC §4 mechanically:
 *   overlap(tile, C) = mask_pixels(C ∩ tile) / tile_pixel_area
 *   positive  ⇔ overlap ≥ 0.005              (§4.2 noise floor)
 *   band      ⇔ 0.005 ≤ overlap < 0.02       (§4.4 ambiguity band)
 *   size band ⇔ whole ≥50% · partial 5–50% · sliver 0.5–5%   (§4.2)
 * Stipulated negatives (§4.3) hold by construction: shadows are painted on
 * the background layer only, so a tile containing only a shadow is never
 * positive; traffic-light poles are part of the traffic_light painter (the
 * class IS the assembly as rendered — same convention as Type A).
 *
 * Sliver scenes (SPEC §5.4: ≥40) are engineered by placing the primary
 * object so a measured fragment of 0.5–5% of a tile lands across a grid
 * line, with the object's main body (≥5% in some tile) on the other side —
 * acceptance is by MEASURED overlap, never by intended placement.
 *
 * Output: corpus/typeB/b_NNNNNN.png + b_NNNNNN_mask.png + manifest.jsonl
 * (per-tile derivations cached in each record's `derived_tiles`, §5.2).
 * Deterministic: re-running produces the same corpus.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const B = require('./build_corpus.js');
const { Layer, PAINTERS, AREA } = B;

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'corpus', 'typeB');
const S = 480;                 // scene px (4×4 grid of 120px tiles)
const TILE_PX = S / 4;
const CLASSES16 = ['bicycle', 'bridge', 'bus', 'car', 'chimney', 'crosswalk', 'fire_hydrant', 'motorcycle', 'mountain', 'palm_tree', 'stairs', 'taxi', 'traffic_light', 'tractor', 'train', 'boat'];
const TRAIN_CLASSES = CLASSES16.slice(0, 14); // train/boat stay holdout-only (§4.6) and are not painted here
const CLASS_ID = {}; CLASSES16.forEach((c, i) => CLASS_ID[c] = i + 1);
const POS_FLOOR = 0.005, BAND_HI = 0.02;

B.setTileSize(S); // painters' context bands (water/asphalt) become scene-relative

/* ------------------------------------------------------- gray PNG (mask) */
function encodePNGgray(gray, w, h) {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0;
    Buffer.from(gray.buffer, y * w, w).copy(raw, y * (w + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 0; // 8-bit grayscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    B.pngChunk('IHDR', ihdr),
    B.pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    B.pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------- rendering */
const pick = B.pick, rr = B.rr;
function groundKindFor(cls, rng) {
  if (['car', 'bus', 'taxi', 'motorcycle', 'bicycle', 'tractor', 'train', 'crosswalk'].includes(cls)) return rng() < 0.65 ? 'road' : 'plain';
  if (cls === 'palm_tree' || cls === 'mountain') return rng() < 0.5 ? 'grass' : 'plain';
  return 'plain';
}
function sceneClutter(bg, rng, n) {
  for (let i = 0; i < n; i++) {
    const c = pick(rng, [[100, 120, 90], [110, 110, 115], [130, 120, 100], [90, 100, 120]]);
    if (rng() < 0.5) bg.fillRect(rr(rng, 0, S - 40), rr(rng, S * 0.5, S - 30), rr(rng, 20, 70), rr(rng, 14, 44), c);
    else bg.fillCircle(rr(rng, 0, S), rr(rng, S * 0.45, S - 10), rr(rng, 10, 26), c);
  }
}
function shadowBlob(bg, cx, cy, rx, ry) {
  // §4.3 stipulated negative: shadow lives on the background only.
  const pts = [];
  for (let a = 0; a < Math.PI * 2; a += 0.35) pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  bg.fillPoly(pts, [58, 58, 62]);
}

/* Render one scene. Returns { rgb, owner } where owner is a Uint8Array of
 * class ids (0 = background) giving the VISIBLE class at each pixel. */
function renderScene(seed, placements) {
  const rng = B.mulberry32(seed);
  const bg = new Layer(S, S);
  B.skyGround(bg, rng, groundKindFor(placements[0].cls, rng));
  if (rng() < 0.5) B.cloud(bg, rng);
  sceneClutter(bg, rng, Math.floor(rr(rng, 0, 7)));
  const layers = [];
  for (const p of placements) {
    if (['car', 'bus', 'taxi', 'tractor', 'train', 'boat', 'motorcycle'].includes(p.cls))
      shadowBlob(bg, p.cx + 0.15 * p.u, p.cy + 0.62 * p.u, 1.5 * p.u, 0.2 * p.u);
    const layer = new Layer(S, S);
    PAINTERS[p.cls](bg, layer, rng, { cx: p.cx, cy: p.cy, u: p.u });
    layers.push({ cls: p.cls, layer });
  }
  // Occlusion punch-out, identical shapes erased from every class layer.
  const oroll = rng();
  const occlusion = oroll < 0.5 ? 'none' : oroll < 0.87 ? 'partial' : 'heavy';
  if (occlusion !== 'none') {
    const shapes = [];
    const n = occlusion === 'heavy' ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const ow = rr(rng, 30, occlusion === 'heavy' ? 90 : 110), oh = rr(rng, 25, 90);
      const ox = placements[0].cx + rr(rng, -90, 50), oy = placements[0].cy + rr(rng, -70, 45);
      shapes.push({ ox, oy, ow, oh, circ: rng() < 0.5 });
    }
    for (const { layer } of layers)
      for (const s of shapes) {
        if (s.circ) layer.punchCircle(s.ox + s.ow / 2, s.oy + s.oh / 2, s.ow / 2);
        else layer.punch(s.ox, s.oy, s.ox + s.ow, s.oy + s.oh);
      }
    var occShapes = shapes;
  }
  // Composite in paint order; owner = topmost class at each pixel.
  const owner = new Uint8Array(S * S);
  const rgb = new Uint8Array(S * S * 3);
  for (let i = 0, j = 0; i < bg.px.length; i += 4, j += 3) { rgb[j] = bg.px[i]; rgb[j + 1] = bg.px[i + 1]; rgb[j + 2] = bg.px[i + 2]; }
  for (const { cls, layer } of layers) {
    const id = CLASS_ID[cls];
    for (let i = 0, j = 0, p = 0; i < layer.px.length; i += 4, j += 3, p++) {
      if (layer.px[i + 3]) { rgb[j] = layer.px[i]; rgb[j + 1] = layer.px[i + 1]; rgb[j + 2] = layer.px[i + 2]; owner[p] = id; }
    }
  }
  if (typeof occShapes !== 'undefined' && occShapes) {
    const occ = new Layer(S, S);
    for (const s of occShapes) {
      if (s.circ) occ.fillCircle(s.ox + s.ow / 2, s.oy + s.oh / 2, s.ow / 2, [105, 108, 112]);
      else occ.fillRect(s.ox, s.oy, s.ox + s.ow, s.oy + s.oh, [105, 108, 112]);
    }
    for (let i = 0, j = 0; i < occ.px.length; i += 4, j += 3)
      if (occ.px[i + 3]) { rgb[j] = occ.px[i]; rgb[j + 1] = occ.px[i + 1]; rgb[j + 2] = occ.px[i + 2]; }
  }
  const blur = rng() < 0.72 ? 'none' : rng() < 0.66 ? 'mild' : 'strong';
  let out = blur === 'none' ? rgb : B.boxBlur(rgb, S, S, blur === 'mild' ? 1 : 2);
  B.addNoise(out, S, S, 9, rng);
  return { rgb: out, owner, occlusion, blur };
}

/* Per-tile derivation from the owner map (SPEC §4, mechanically applied). */
function deriveTiles(owner) {
  const tileArea = TILE_PX * TILE_PX;
  const counts = Array.from({ length: 16 }, () => ({}));
  for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
    const c = counts[ty * 4 + tx];
    for (let y = ty * TILE_PX; y < (ty + 1) * TILE_PX; y++)
      for (let x = tx * TILE_PX; x < (tx + 1) * TILE_PX; x++) {
        const id = owner[y * S + x];
        if (id) { const cls = CLASSES16[id - 1]; c[cls] = (c[cls] || 0) + 1; }
      }
  }
  return counts.map(c => {
    const classes = {}, positive_for = [], band_for = [], size_bands = {};
    for (const [cls, n] of Object.entries(c)) {
      const ov = Math.round((n / tileArea) * 100000) / 100000;
      if (ov < POS_FLOOR) continue;
      classes[cls] = ov;
      positive_for.push(cls);
      if (ov < BAND_HI) band_for.push(cls);
      size_bands[cls] = ov >= 0.5 ? 'whole' : ov >= 0.05 ? 'partial' : 'sliver';
    }
    return { classes, positive_for, band_for, size_bands };
  });
}

/* ------------------------------------------------------- scene attempts */
function tryScene(seed, cls, mode) {
  const rng = B.mulberry32(seed ^ 0x9E3779B9);
  let placements;
  if (mode === 'sliver') {
    // Straddle a grid line: main body on one side, a measured sliver across.
    const vertical = rng() < 0.62;
    const line = pick(rng, [TILE_PX, 2 * TILE_PX, 3 * TILE_PX]);
    const f = rr(rng, 0.07, 0.13); // object area as a fraction of the scene
    const u = Math.sqrt((f * S * S) / AREA[cls]);
    const reach = Math.sqrt(AREA[cls]) * u; // order-of-magnitude half-extent proxy
    const side = rng() < 0.5 ? -1 : 1;
    const inset = rr(rng, 0.25, 0.75) * reach; // centre sits this far inside the body side
    const along = rr(rng, S * 0.3, S * 0.7);
    const across = line + side * inset;
    placements = [vertical ? { cls, cx: across, cy: along, u } : { cls, cx: along, cy: across, u }];
  } else {
    const f = rr(rng, 0.055, 0.16);
    const u = Math.sqrt((f * S * S) / AREA[cls]);
    placements = [{ cls, cx: rr(rng, S * 0.3, S * 0.7), cy: rr(rng, S * 0.42, S * 0.62), u }];
    // Optional secondary object of another class (~45% of scenes).
    if (rng() < 0.45) {
      const others = TRAIN_CLASSES.filter(c => c !== cls);
      const sec = pick(rng, others);
      const su = Math.sqrt((rr(rng, 0.02, 0.06) * S * S) / AREA[sec]);
      placements.push({ cls: sec, cx: rr(rng, S * 0.15, S * 0.85), cy: rr(rng, S * 0.35, S * 0.7), u: su });
    }
  }
  const { rgb, owner, occlusion, blur } = renderScene(seed, placements);
  const tiles = deriveTiles(owner);
  const posTiles = tiles.filter(t => t.positive_for.includes(cls)).length;
  const sliverTiles = tiles.filter(t => t.size_bands[cls] === 'sliver').length;
  const bodyTiles = tiles.filter(t => (t.classes[cls] || 0) >= 0.05).length;
  const ok = mode === 'sliver' ? (sliverTiles >= 1 && bodyTiles >= 1 && posTiles >= 2) : (posTiles >= 2 && posTiles <= 9);
  return { ok, rgb, owner, tiles, occlusion, blur, placements };
}

/* ----------------------------------------------------------------- main */
function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = [];
  let n = 0, seed = 777000111;
  const emit = (scene, split, cls, mode) => {
    n++;
    const uid = 'b_' + String(n).padStart(6, '0');
    const file = `typeB/${uid}.png`, mask = `typeB/${uid}_mask.png`;
    fs.writeFileSync(path.join(ROOT, 'corpus', file), B.encodePNG(scene.rgb, S, S));
    fs.writeFileSync(path.join(ROOT, 'corpus', mask), encodePNGgray(scene.owner, S, S));
    const present = new Set();
    for (const t of scene.tiles) for (const c of t.positive_for) present.add(c);
    manifest.push({
      scene_uid: uid, file, mask, classes_present: [...present].sort(),
      source: 'synthetic', licence: 'generated', split,
      annotators: 0, kappa: null, // exact by construction — no human pass (§4.5 n/a, as Type A)
      primary_class: cls, sliver_engineered: mode === 'sliver',
      axes: { occlusion: scene.occlusion, blur: scene.blur },
      derived_tiles: scene.tiles,
    });
  };
  const build = (cls, mode, split, maxTries) => {
    for (let t = 0; t < maxTries; t++) {
      const sc = tryScene(seed++, cls, mode);
      if (sc.ok) { emit(sc, split, cls, mode); return true; }
    }
    return false;
  };
  // Normal scenes: 22 per train class (15 train / 4 eval / 3 holdout_final).
  for (const cls of TRAIN_CLASSES)
    for (let i = 0; i < 22; i++) {
      const split = i < 15 ? 'train' : i < 19 ? 'eval' : 'holdout_final';
      if (!build(cls, 'normal', split, 30)) console.log(`WARNING: could not build normal ${cls} #${i}`);
    }
  // Sliver scenes: 44, classes cycled (≥3 per class), 31 train / 9 eval / 4 holdout.
  for (let i = 0; i < 44; i++) {
    const cls = TRAIN_CLASSES[i % TRAIN_CLASSES.length];
    const split = i < 31 ? 'train' : i < 40 ? 'eval' : 'holdout_final';
    if (!build(cls, 'sliver', split, 300)) console.log(`WARNING: could not build sliver ${cls} #${i}`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.jsonl'), manifest.map(m => JSON.stringify(m)).join('\n') + '\n');
  // Report against SPEC §5.4 v1.1 floors.
  const splits = {}, perClass = {};
  let slivers = 0;
  for (const m of manifest) {
    splits[m.split] = (splits[m.split] || 0) + 1;
    if (m.sliver_engineered) slivers++;
    for (const c of m.classes_present) perClass[c] = (perClass[c] || 0) + 1;
  }
  console.log(`scenes: ${manifest.length}  sliver-engineered: ${slivers}`);
  console.log('splits:', splits);
  console.log('scenes containing each class:', perClass);
  const under = TRAIN_CLASSES.filter(c => (perClass[c] || 0) < 25);
  if (under.length) console.log('WARNING under 25 scenes/class (SPEC §5.4):', under);
  if (manifest.length < 300) console.log('WARNING under 300 scenes (SPEC §5.4)');
  if (slivers < 40) console.log('WARNING under 40 sliver scenes (SPEC §5.4)');
}
if (require.main === module) main();
