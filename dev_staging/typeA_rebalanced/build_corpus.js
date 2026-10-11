#!/usr/bin/env node
/*
 * build_corpus.js — STAGED REBALANCE VARIANT (dev_staging; do not run
 * against the live tree — OUT_DIR is redirected into this directory).
 * Copy of tools/build_corpus.js with exactly two calibration changes,
 * marked [REBALANCE] inline: sliver size quota 0.28 -> 0.20 and heavy-
 * occlusion quota 0.15 -> 0.09, targeting the SPEC §10 R2 ambiguity-
 * band share of ~15% (live corpus measures 23.1%). See REBALANCE.md in
 * this directory for before/after measurements. Everything else —
 * painters, seeds, counts, split policy — is byte-identical to the
 * live builder.
 *
 * --- original header follows ---
 * build_corpus.js — CAPTCHA Gym corpus builder (SPEC §5).
 *
 * SPEC §5.1 source priority is (1) openly licensed photos, (2) synthetic /
 * generated scenes, (3) self-shot. Downloading and annotating >=840 licensed
 * photos with defensible labels is impractical for v1, so v1 uses route (2)
 * for the whole Type A corpus: every tile is rendered programmatically, which
 * makes its label set EXACT BY CONSTRUCTION (the programmatic analogue of a
 * segmentation mask). No third-party imagery is used at all, so no external
 * licence applies; items are recorded in the manifest as source:"synthetic",
 * licence:"generated". See CREDITS.md and BUILD_NOTES.md.
 *
 * Each rendered tile is an independent synthetic "source photo" (its own
 * scene, seed and palette), so corpus splits (§8.1: split by source photo,
 * never by derived tile) are assigned per tile.
 *
 * Output: corpus/typeA/*.png + corpus/typeA/manifest.jsonl
 * Deterministic: re-running with the same code produces the same corpus.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(__dirname, 'corpus', 'typeA'); // STAGED copy: output stays in dev_staging/typeA_rebalanced/
let TILE = 240; // px, square tiles (settable: the Type B builder renders 480px scenes with the same painters)

/* ------------------------------------------------------------------ PRNG */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const rr = (rng, lo, hi) => lo + rng() * (hi - lo);

/* ------------------------------------------------------- PNG encode (RGB) */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(rgb, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter: none
    Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit, colour type 2 (RGB)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------- Rasteriser */
class Layer {
  // RGBA pixel layer; alpha used for the object layer so the visible
  // instance fraction can be measured exactly after occlusion punch-out.
  constructor(w, h) { this.w = w; this.h = h; this.px = new Uint8Array(w * h * 4); }
  set(x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2]; this.px[i + 3] = 255;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4;
    return [this.px[i], this.px[i + 1], this.px[i + 2], this.px[i + 3]];
  }
  fillRect(x0, y0, x1, y1, c) {
    for (let y = Math.max(0, y0 | 0); y < Math.min(this.h, y1); y++)
      for (let x = Math.max(0, x0 | 0); x < Math.min(this.w, x1); x++) this.set(x, y, c);
  }
  fillCircle(cx, cy, r, c) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r * r) this.set(x, y, c);
      }
  }
  ring(cx, cy, r, wdt, c) {
    for (let a = 0; a < Math.PI * 2; a += 0.5 / r)
      this.fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, wdt / 2, c);
  }
  fillPoly(pts, c) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(this.h - 1, maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2)
        for (let x = Math.floor(xs[i]); x <= xs[i + 1]; x++) this.set(x, y, c);
    }
  }
  line(x0, y0, x1, y1, wdt, c) {
    const d = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, Math.ceil(d / (wdt * 0.4)));
    for (let i = 0; i <= steps; i++)
      this.fillCircle(x0 + (x1 - x0) * (i / steps), y0 + (y1 - y0) * (i / steps), wdt / 2, c);
  }
  vgrad(y0, y1, c0, c1) {
    for (let y = y0; y < y1; y++) {
      const t = (y - y0) / Math.max(1, y1 - y0 - 1);
      const c = [0, 1, 2].map(k => Math.round(c0[k] + (c1[k] - c0[k]) * t));
      this.fillRect(0, y, this.w, y + 1, c);
    }
  }
  countAlpha() { let n = 0; for (let i = 3; i < this.px.length; i += 4) if (this.px[i]) n++; return n; }
  punch(x0, y0, x1, y1) { // erase alpha in rect (occlusion punch-out)
    for (let y = Math.max(0, y0 | 0); y < Math.min(this.h, y1); y++)
      for (let x = Math.max(0, x0 | 0); x < Math.min(this.w, x1); x++)
        this.px[(y * this.w + x) * 4 + 3] = 0;
  }
  punchCircle(cx, cy, r) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r * r && x >= 0 && y >= 0 && x < this.w && y < this.h)
          this.px[(y * this.w + x) * 4 + 3] = 0;
      }
  }
}
function composite(bg, obj) {
  const out = new Uint8Array(bg.w * bg.h * 3);
  for (let i = 0, j = 0; i < bg.px.length; i += 4, j += 3) {
    if (obj.px[i + 3]) { out[j] = obj.px[i]; out[j + 1] = obj.px[i + 1]; out[j + 2] = obj.px[i + 2]; }
    else { out[j] = bg.px[i]; out[j + 1] = bg.px[i + 1]; out[j + 2] = bg.px[i + 2]; }
  }
  return out;
}
function addNoise(rgb, w, h, amp, rng) {
  for (let i = 0; i < rgb.length; i++) {
    const v = rgb[i] + (rng() - 0.5) * 2 * amp;
    rgb[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
}
function boxBlur(rgb, w, h, radius) {
  if (!radius) return rgb;
  const tmp = new Uint8Array(rgb), out = new Uint8Array(rgb.length);
  const pass = (src, dst, horizontal) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let sr = 0, sg = 0, sb = 0, n = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = horizontal ? x + k : x, yy = horizontal ? y : y + k;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const i = (yy * w + xx) * 3; sr += src[i]; sg += src[i + 1]; sb += src[i + 2]; n++;
      }
      const o = (y * w + x) * 3; dst[o] = sr / n; dst[o + 1] = sg / n; dst[o + 2] = sb / n;
    }
  };
  pass(tmp, out, true); const out2 = new Uint8Array(out); pass(out, out2, false);
  return out2;
}

/* --------------------------------------------------------------- Palettes */
const SKIES = [[[135, 180, 225], [200, 225, 245]], [[150, 170, 200], [215, 220, 228]], [[120, 160, 210], [190, 215, 240]], [[165, 185, 205], [225, 228, 230]]];
const GROUNDS = [[[105, 105, 105], [80, 80, 80]], [[120, 115, 100], [95, 90, 78]], [[90, 130, 80], [65, 105, 60]], [[140, 125, 95], [110, 98, 75]]];
const BODY = [[200, 60, 55], [60, 110, 190], [240, 180, 40], [70, 160, 90], [230, 230, 235], [50, 55, 65], [240, 120, 40], [140, 80, 180], [20, 140, 150], [180, 100, 60]];
const DARK = [45, 48, 55], TYRE = [30, 30, 34], HUB = [170, 175, 180], GLASS = [165, 205, 225];

function skyGround(bg, rng, groundKind) {
  const sky = pick(rng, SKIES);
  bg.vgrad(0, TILE * 0.62, sky[0], sky[1]);
  const g = groundKind === 'grass' ? GROUNDS[2] : groundKind === 'sand' ? GROUNDS[3] : pick(rng, GROUNDS);
  bg.vgrad(TILE * 0.62, TILE, g[0], g[1]);
  if (groundKind === 'road') { // asphalt band + centre dashes
    bg.fillRect(0, TILE * 0.70, TILE, TILE, [88, 88, 92]);
    for (let x = 6; x < TILE; x += 44) bg.fillRect(x, TILE * 0.845, 24, 5, [225, 200, 80]);
  }
}
function cloud(bg, rng) {
  const cx = rr(rng, 20, 200), cy = rr(rng, 12, 60), s = rr(rng, 0.7, 1.3);
  for (let i = 0; i < 7; i++) bg.fillCircle(cx + rr(rng, -26, 26) * s, cy + rr(rng, -7, 7), rr(rng, 9, 17) * s, [245, 248, 250]);
}
function clutterBlobs(bg, rng, n) {
  for (let i = 0; i < n; i++) {
    const c = pick(rng, [[100, 120, 90], [110, 110, 115], [130, 120, 100], [90, 100, 120]]);
    if (rng() < 0.5) bg.fillRect(rr(rng, 0, 220), rr(rng, 120, 215), rr(rng, 14, 42), rr(rng, 10, 30), c);
    else bg.fillCircle(rr(rng, 0, 240), rr(rng, 110, 225), rr(rng, 7, 18), c);
  }
}

/* ------------------------------------------------------- Object painters */
/* Each paints the class object onto the obj (RGBA) layer around (cx, cy)
 * with unit size u (px). Context goes on bg inside the painter where the
 * class needs it (water, road, roof...). Shapes are deliberately simple
 * silhouettes with a few identifying details — enough for a human (or a
 * vision model) to name the class at tile size, per SPEC §4.1. */
function wheel(obj, x, y, r) { obj.fillCircle(x, y, r, TYRE); obj.fillCircle(x, y, r * 0.45, HUB); }
/* Nominal object area in unit^2 (bbox x fill) — used only to pick a scale
 * that lands near a target size band; the RECORDED fraction is measured
 * from actual pixels afterwards, so approximations here are harmless. */
const AREA = { car: 2.8, bus: 4.6, taxi: 2.8, motorcycle: 1.6, bicycle: 1.5, traffic_light: 1.1, bridge: 3.4, mountain: 4.4, palm_tree: 2.6, stairs: 3.4, chimney: 0.9, crosswalk: 4.2, fire_hydrant: 1.1, tractor: 2.9, train: 5.2, boat: 3.2 };
const SECONDARY = { car: ['traffic_light', 'car'], bus: ['traffic_light'], taxi: ['traffic_light'], motorcycle: ['traffic_light'], bicycle: ['traffic_light'], traffic_light: ['car', 'bus'], tractor: ['car'], train: ['traffic_light'], boat: [], bridge: [], mountain: ['palm_tree'], palm_tree: [], stairs: [], chimney: [], crosswalk: ['car', 'traffic_light'], fire_hydrant: ['car'] };
const PAINTERS = {
  car(bg, obj, rng, P) {
    const { cx, cy, u } = P, body = P.forceBody || pick(rng, BODY);
    obj.fillRect(cx - 1.7 * u, cy - 0.35 * u, cx + 1.7 * u, cy + 0.45 * u, body);
    obj.fillPoly([[cx - 1.05 * u, cy - 0.35 * u], [cx - 0.72 * u, cy - 0.95 * u], [cx + 0.78 * u, cy - 0.95 * u], [cx + 1.1 * u, cy - 0.35 * u]], body);
    obj.fillRect(cx - 0.9 * u, cy - 0.88 * u, cx + 0.68 * u, cy - 0.42 * u, GLASS);
    obj.fillRect(cx - 0.06 * u, cy - 0.88 * u, cx + 0.02 * u, cy - 0.42 * u, body);
    wheel(obj, cx - 1.05 * u, cy + 0.48 * u, 0.34 * u); wheel(obj, cx + 1.05 * u, cy + 0.48 * u, 0.34 * u);
  },
  bus(bg, obj, rng, P) {
    const { cx, cy, u } = P, body = pick(rng, BODY);
    obj.fillRect(cx - 1.6 * u, cy - 1.05 * u, cx + 1.6 * u, cy + 0.55 * u, body);
    obj.fillRect(cx - 1.5 * u, cy - 0.95 * u, cx - 0.95 * u, cy - 0.35 * u, GLASS);
    for (let i = 0; i < 4; i++) obj.fillRect(cx - 0.75 * u + i * 0.55 * u, cy - 0.95 * u, cx - 0.3 * u + i * 0.55 * u, cy - 0.35 * u, GLASS);
    obj.fillRect(cx - 1.6 * u, cy + 0.05 * u, cx + 1.6 * u, cy + 0.16 * u, [240, 240, 240]);
    wheel(obj, cx - 1.0 * u, cy + 0.58 * u, 0.33 * u); wheel(obj, cx + 1.0 * u, cy + 0.58 * u, 0.33 * u);
  },
  taxi(bg, obj, rng, P) {
    PAINTERS.car(bg, obj, rng, { ...P, forceBody: [245, 195, 45] });
    const { cx, cy, u } = P;
    for (let i = 0; i < 6; i++) if (i % 2 === 0) obj.fillRect(cx - 1.5 * u + i * 0.5 * u, cy + 0.12 * u, cx - 1.25 * u + i * 0.5 * u, cy + 0.3 * u, DARK);
    obj.fillRect(cx - 0.32 * u, cy - 1.22 * u, cx + 0.32 * u, cy - 0.98 * u, [250, 250, 250]);
    obj.fillRect(cx - 0.32 * u, cy - 1.22 * u, cx + 0.32 * u, cy - 1.14 * u, DARK);
  },
  motorcycle(bg, obj, rng, P) {
    const { cx, cy, u } = P, body = pick(rng, BODY);
    wheel(obj, cx - 0.95 * u, cy + 0.45 * u, 0.46 * u); wheel(obj, cx + 0.95 * u, cy + 0.45 * u, 0.46 * u);
    obj.line(cx - 0.95 * u, cy + 0.45 * u, cx - 0.1 * u, cy - 0.15 * u, 0.14 * u, body);
    obj.line(cx + 0.95 * u, cy + 0.45 * u, cx + 0.55 * u, cy - 0.35 * u, 0.14 * u, body);
    obj.line(cx - 0.1 * u, cy - 0.15 * u, cx + 0.55 * u, cy - 0.35 * u, 0.16 * u, body);
    obj.fillPoly([[cx - 0.55 * u, cy - 0.28 * u], [cx + 0.25 * u, cy - 0.42 * u], [cx + 0.35 * u, cy - 0.12 * u], [cx - 0.35 * u, cy - 0.02 * u]], body);
    obj.line(cx + 0.55 * u, cy - 0.35 * u, cx + 0.8 * u, cy - 0.62 * u, 0.1 * u, DARK);
    obj.line(cx - 0.6 * u, cy - 0.25 * u, cx - 0.95 * u, cy - 0.4 * u, 0.12 * u, DARK);
  },
  bicycle(bg, obj, rng, P) {
    const { cx, cy, u } = P, frame = pick(rng, BODY);
    obj.ring(cx - 0.85 * u, cy + 0.45 * u, 0.5 * u, 0.09 * u, TYRE);
    obj.ring(cx + 0.85 * u, cy + 0.45 * u, 0.5 * u, 0.09 * u, TYRE);
    obj.line(cx - 0.85 * u, cy + 0.45 * u, cx - 0.15 * u, cy - 0.3 * u, 0.09 * u, frame);
    obj.line(cx - 0.15 * u, cy - 0.3 * u, cx + 0.55 * u, cy + 0.45 * u, 0.09 * u, frame);
    obj.line(cx + 0.55 * u, cy + 0.45 * u, cx - 0.85 * u, cy + 0.45 * u, 0.09 * u, frame);
    obj.line(cx + 0.55 * u, cy + 0.45 * u, cx + 0.8 * u, cy - 0.38 * u, 0.09 * u, frame);
    obj.line(cx + 0.8 * u, cy - 0.38 * u, cx + 0.85 * u, cy + 0.45 * u, 0.09 * u, frame);
    obj.line(cx - 0.38 * u, cy - 0.42 * u, cx + 0.02 * u, cy - 0.42 * u, 0.1 * u, DARK);
    obj.line(cx + 0.68 * u, cy - 0.5 * u, cx + 0.95 * u, cy - 0.5 * u, 0.09 * u, DARK);
  },
  traffic_light(bg, obj, rng, P) {
    const { cx, cy, u } = P;
    obj.fillRect(cx - 0.09 * u, cy - 0.5 * u, cx + 0.09 * u, cy + 1.6 * u, DARK);
    obj.fillRect(cx - 0.34 * u, cy - 1.6 * u, cx + 0.34 * u, cy + 0.1 * u, [35, 35, 40]);
    const lit = Math.floor(rng() * 3);
    [[235, 60, 50], [245, 180, 40], [50, 200, 90]].forEach((c, i) => {
      const dim = lit === i ? c : [c[0] * 0.35, c[1] * 0.35, c[2] * 0.35];
      obj.fillCircle(cx, cy - 1.28 * u + i * 0.52 * u, 0.19 * u, dim.map(Math.round));
    });
  },
  bridge(bg, obj, rng, P) {
    const { cx, cy, u } = P;
    bg.vgrad(TILE * 0.66, TILE, [70, 120, 175], [50, 95, 150]); // water
    obj.fillRect(cx - 2.3 * u, cy + 0.15 * u, cx + 2.3 * u, cy + 0.38 * u, [120, 125, 130]);
    obj.fillRect(cx - 1.55 * u, cy - 1.25 * u, cx - 1.35 * u, cy + 0.15 * u, [105, 110, 118]);
    obj.fillRect(cx + 1.35 * u, cy - 1.25 * u, cx + 1.55 * u, cy + 0.15 * u, [105, 110, 118]);
    for (let i = 0; i <= 4; i++) {
      obj.line(cx - 1.45 * u, cy - 1.25 * u, cx - 1.45 * u + i * 0.36 * u, cy + 0.15 * u, 0.045 * u, [200, 205, 210]);
      obj.line(cx + 1.45 * u, cy - 1.25 * u, cx + 1.45 * u - i * 0.36 * u, cy + 0.15 * u, 0.045 * u, [200, 205, 210]);
    }
  },
  mountain(bg, obj, rng, P) {
    const { cx, cy, u } = P;
    const rock = [118, 122, 132], rock2 = [96, 100, 112];
    obj.fillPoly([[cx - 2.2 * u, cy + 1.1 * u], [cx - 0.7 * u, cy - 1.35 * u], [cx + 0.6 * u, cy + 1.1 * u]], rock2);
    obj.fillPoly([[cx - 1.1 * u, cy + 1.1 * u], [cx + 0.55 * u, cy - 1.7 * u], [cx + 2.2 * u, cy + 1.1 * u]], rock);
    obj.fillPoly([[cx + 0.55 * u, cy - 1.7 * u], [cx + 0.22 * u, cy - 1.18 * u], [cx + 0.55 * u, cy - 1.3 * u], [cx + 0.88 * u, cy - 1.18 * u]], [245, 248, 252]);
  },
  palm_tree(bg, obj, rng, P) {
    const { cx, cy, u } = P, bend = rr(rng, -0.35, 0.35) * u;
    let x = cx, y = cy + 1.55 * u;
    const topX = cx + bend, topY = cy - 0.75 * u;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      obj.fillCircle(x + (topX - x) * t + Math.sin(t * 2.2) * 0.1 * u, y + (topY - y) * t, 0.13 * u, [120, 88, 58]);
    }
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.08 + i * 0.14), len = rr(rng, 0.95, 1.3) * u;
      let px = topX, py = topY;
      for (let s = 1; s <= 6; s++) {
        const t = s / 6;
        obj.line(px, py, topX + Math.cos(a) * len * t, topY - Math.sin(a) * len * t * 0.55 + t * t * 0.55 * u, 0.09 * u, [52, 140, 62]);
        px = topX + Math.cos(a) * len * t; py = topY - Math.sin(a) * len * t * 0.55 + t * t * 0.55 * u;
      }
    }
    obj.fillCircle(topX - 0.12 * u, topY + 0.1 * u, 0.11 * u, [105, 78, 45]);
    obj.fillCircle(topX + 0.13 * u, topY + 0.12 * u, 0.1 * u, [105, 78, 45]);
  },
  stairs(bg, obj, rng, P) {
    const { cx, cy, u } = P, c = [150, 152, 158], edge = [110, 112, 120];
    const n = 6, sw = 0.62 * u, sh = 0.34 * u;
    for (let i = 0; i < n; i++) {
      const x0 = cx - 1.85 * u + i * sw, yTop = cy + 0.95 * u - (i + 1) * sh;
      obj.fillRect(x0, yTop, x0 + sw * 2.6, yTop + sh, c);
      obj.fillRect(x0, yTop, x0 + sw * 2.6, yTop + 0.07 * u, edge);
    }
    obj.fillPoly([[cx - 1.85 * u, cy + 0.95 * u], [cx - 1.85 * u, cy + 1.25 * u], [cx + 1.85 * u, cy + 1.25 * u], [cx + 1.85 * u, cy - 0.75 * u]], [128, 130, 138]);
    for (let i = 0; i < n; i++) {
      const x0 = cx - 1.85 * u + i * sw, yTop = cy + 0.95 * u - (i + 1) * sh;
      obj.fillRect(x0, yTop, x0 + sw * 2.6, yTop + sh, c);
      obj.fillRect(x0, yTop, x0 + sw * 2.6, yTop + 0.07 * u, edge);
    }
  },
  chimney(bg, obj, rng, P) {
    const { cx, cy, u } = P;
    bg.fillPoly([[cx - 2.2 * u, cy + 1.2 * u], [cx, cy - 0.7 * u], [cx + 2.2 * u, cy + 1.2 * u]], [150, 85, 70]); // roof (context)
    bg.fillRect(cx - 2.2 * u, cy + 1.2 * u, cx + 2.2 * u, cy + 1.7 * u, [205, 195, 180]); // wall
    obj.fillRect(cx + 0.55 * u, cy - 1.55 * u, cx + 1.15 * u, cy - 0.28 * u, [168, 84, 66]);
    obj.fillRect(cx + 0.47 * u, cy - 1.68 * u, cx + 1.23 * u, cy - 1.5 * u, [120, 60, 50]);
    for (let i = 0; i < 3; i++) obj.fillRect(cx + 0.55 * u, cy - 1.3 * u + i * 0.34 * u, cx + 1.15 * u, cy - 1.26 * u + i * 0.34 * u, [140, 70, 56]);
  },
  crosswalk(bg, obj, rng, P) {
    const { cx, cy, u } = P;
    bg.fillRect(0, TILE * 0.3, TILE, TILE, [85, 85, 90]); // asphalt context
    for (let i = 0; i < 5; i++) {
      const y0 = cy - 1.15 * u + i * 0.52 * u, wTop = 0.34 * u + i * 0.1 * u;
      obj.fillPoly([[cx - 2.0 * u, y0], [cx - 1.35 * u, y0], [cx - 1.35 * u + wTop * 0.4, y0 + 0.3 * u], [cx - 2.0 * u + wTop * 0.4, y0 + 0.3 * u]], [232, 232, 232]);
      obj.fillPoly([[cx + 1.35 * u, y0], [cx + 2.0 * u, y0], [cx + 2.0 * u - wTop * 0.4, y0 + 0.3 * u], [cx + 1.35 * u - wTop * 0.4, y0 + 0.3 * u]], [232, 232, 232]);
      obj.fillRect(cx - 0.5 * u, y0, cx + 0.5 * u, y0 + 0.3 * u, [232, 232, 232]);
    }
  },
  fire_hydrant(bg, obj, rng, P) {
    const { cx, cy, u } = P, body = pick(rng, [[215, 55, 45], [240, 180, 40], [200, 200, 205]]);
    obj.fillRect(cx - 0.52 * u, cy + 0.78 * u, cx + 0.52 * u, cy + 0.98 * u, DARK);
    obj.fillRect(cx - 0.4 * u, cy - 0.55 * u, cx + 0.4 * u, cy + 0.82 * u, body);
    obj.fillCircle(cx, cy - 0.6 * u, 0.4 * u, body);
    obj.fillRect(cx - 0.09 * u, cy - 1.08 * u, cx + 0.09 * u, cy - 0.9 * u, DARK);
    obj.fillCircle(cx - 0.52 * u, cy + 0.18 * u, 0.17 * u, DARK);
    obj.fillCircle(cx + 0.52 * u, cy + 0.18 * u, 0.17 * u, DARK);
    obj.fillCircle(cx, cy + 0.15 * u, 0.15 * u, HUB);
  },
  tractor(bg, obj, rng, P) {
    const { cx, cy, u } = P, body = pick(rng, [[60, 150, 70], [200, 60, 50], [50, 110, 190], [240, 140, 40]]);
    wheel(obj, cx - 0.95 * u, cy + 0.42 * u, 0.62 * u); wheel(obj, cx + 1.15 * u, cy + 0.68 * u, 0.34 * u);
    obj.fillRect(cx - 0.6 * u, cy - 0.15 * u, cx + 1.35 * u, cy + 0.28 * u, body);
    obj.fillRect(cx - 0.95 * u, cy - 1.05 * u, cx - 0.05 * u, cy - 0.15 * u, body);
    obj.fillRect(cx - 0.85 * u, cy - 0.95 * u, cx - 0.15 * u, cy - 0.5 * u, GLASS);
    obj.fillRect(cx + 0.55 * u, cy - 0.62 * u, cx + 0.66 * u, cy - 0.15 * u, DARK);
  },
  train(bg, obj, rng, P) {
    const { cx, cy, u } = P, body = pick(rng, BODY);
    obj.fillRect(cx - 2.2 * u, cy - 0.85 * u, cx + 2.2 * u, cy + 0.45 * u, body);
    obj.fillRect(cx + 1.55 * u, cy - 0.7 * u, cx + 2.1 * u, cy - 0.15 * u, GLASS);
    for (let i = 0; i < 5; i++) obj.fillRect(cx - 2.0 * u + i * 0.68 * u, cy - 0.68 * u, cx - 1.55 * u + i * 0.68 * u, cy - 0.28 * u, GLASS);
    obj.fillRect(cx - 2.2 * u, cy + 0.12 * u, cx + 2.2 * u, cy + 0.24 * u, [240, 240, 240]);
    for (let i = 0; i < 3; i++) wheel(obj, cx - 1.5 * u + i * 1.4 * u, cy + 0.52 * u, 0.24 * u);
    obj.line(cx - 0.4 * u, cy - 0.85 * u, cx, cy - 1.2 * u, 0.07 * u, DARK);
    obj.line(cx + 0.4 * u, cy - 0.85 * u, cx, cy - 1.2 * u, 0.07 * u, DARK);
  },
  boat(bg, obj, rng, P) {
    const { cx, cy, u } = P, hull = pick(rng, BODY);
    bg.vgrad(TILE * 0.6, TILE, [70, 125, 180], [45, 90, 145]); // water context
    obj.fillPoly([[cx - 1.7 * u, cy + 0.25 * u], [cx + 1.7 * u, cy + 0.25 * u], [cx + 1.25 * u, cy + 0.85 * u], [cx - 1.25 * u, cy + 0.85 * u]], hull);
    obj.fillRect(cx - 0.05 * u, cy - 1.7 * u, cx + 0.05 * u, cy + 0.25 * u, [110, 85, 60]);
    obj.fillPoly([[cx + 0.08 * u, cy - 1.65 * u], [cx + 0.08 * u, cy + 0.15 * u], [cx + 1.25 * u, cy + 0.15 * u]], [245, 246, 248]);
    obj.fillPoly([[cx - 0.08 * u, cy - 1.45 * u], [cx - 0.08 * u, cy + 0.15 * u], [cx - 0.95 * u, cy + 0.15 * u]], [225, 228, 232]);
  },
};

/* Context-only scenes: labels [] — SPEC §5.4 hard negatives (a road with
 * no vehicle, etc.). ~15% of the pool. */
const CONTEXT = [
  (bg, rng) => { skyGround(bg, rng, 'road'); },
  (bg, rng) => { const s = pick(rng, SKIES); bg.vgrad(0, TILE, s[0], s[1]); for (let i = 0; i < 3; i++) cloud(bg, rng); },
  (bg, rng) => { bg.vgrad(0, TILE, [105, 155, 85], [70, 115, 60]); for (let i = 0; i < 90; i++) bg.line(rr(rng, 0, 240), 240, rr(rng, 0, 240), rr(rng, 190, 235), 2, [60, 100, 52]); },
  (bg, rng) => { bg.fillRect(0, 0, TILE, TILE, pick(rng, [[178, 168, 155], [150, 155, 165], [190, 178, 160]])); for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) bg.fillRect(18 + x * 44, 18 + y * 44, 42 + x * 44, 40 + y * 44, rng() < 0.3 ? [250, 225, 150] : [105, 118, 130]); },
  (bg, rng) => { const s = pick(rng, SKIES); bg.vgrad(0, TILE * 0.5, s[0], s[1]); bg.vgrad(TILE * 0.5, TILE, [70, 105, 62], [52, 85, 48]); for (let i = 0; i < 12; i++) { const x = rr(rng, 0, 240); bg.fillRect(x, rr(rng, 110, 150), x + 6, 200, [95, 72, 50]); bg.fillCircle(x + 3, rr(rng, 80, 125), rr(rng, 18, 32), [55, 95, 50]); } },
  (bg, rng) => { bg.fillRect(0, 0, TILE, TILE, [92, 92, 96]); bg.vgrad(0, 40, [150, 150, 155], [120, 120, 125]); for (let i = 0; i < 4; i++) { bg.line(20 + i * 58, 230, 45 + i * 58, 70, 4, [235, 235, 235]); } },
  (bg, rng) => { bg.vgrad(0, TILE, [168, 160, 148], [140, 132, 120]); for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if ((x + y) % 2) bg.fillRect(x * 40, y * 40, x * 40 + 40, y * 40 + 40, [158, 150, 138]); bg.fillRect(30, 150, 90, 168, [100, 85, 70]); bg.fillRect(150, 90, 210, 108, [100, 85, 70]); },
  (bg, rng) => { bg.vgrad(0, TILE * 0.55, ...pick(rng, SKIES)); bg.vgrad(TILE * 0.55, TILE, [205, 180, 130], [185, 158, 108]); bg.fillPoly([[0, 190], [120, 150], [240, 195], [240, 240], [0, 240]], [190, 163, 112]); },
];

/* ------------------------------------------------------------ Tile build */
function buildTile(seed, primaryClass) {
  const rng = mulberry32(seed);
  const bg = new Layer(TILE, TILE), obj = new Layer(TILE, TILE);
  const groundKind = !primaryClass ? 'plain'
    : ['car', 'bus', 'taxi', 'motorcycle', 'bicycle', 'tractor', 'train', 'crosswalk'].includes(primaryClass) ? (rng() < 0.65 ? 'road' : 'plain')
    : primaryClass === 'palm_tree' || primaryClass === 'mountain' ? (rng() < 0.5 ? 'grass' : 'plain') : 'plain';
  skyGround(bg, rng, groundKind);
  if (rng() < 0.5) cloud(bg, rng);
  const clutterN = Math.floor(rr(rng, 0, 9));
  if (primaryClass) clutterBlobs(bg, rng, clutterN);

  const labels = [];
  let frac = 0, occlusion = 'none';
  if (!primaryClass) {
    pick(rng, CONTEXT)(bg, rng);
  } else {
    // Target size band first, then measure what we actually got.
    const r = rng();
    const target = r < 0.30 ? rr(rng, 0.26, 0.55)      // whole-ish   [REBALANCE: was r < 0.28]
      : r < 0.80 ? rr(rng, 0.06, 0.26)                 // partial     [REBALANCE: was r < 0.72]
      : rr(rng, 0.006, 0.045);                         // sliver (engineered) [REBALANCE: quota 0.28 -> 0.20]
    const u = Math.sqrt((target * TILE * TILE) / AREA[primaryClass]);
    const clipped = rng() < (target < 0.05 ? 0.45 : 0.08);
    let cx = TILE / 2 + rr(rng, -30, 30), cy = TILE * rr(rng, 0.48, 0.6);
    if (clipped) { const side = rng() < 0.5 ? -1 : 1; cx = side < 0 ? rr(rng, -0.25, 0.1) * TILE : rr(rng, 0.9, 1.25) * TILE; }
    if (primaryClass === 'traffic_light' || primaryClass === 'palm_tree') cy = TILE * 0.52;
    PAINTERS[primaryClass](bg, obj, rng, { cx, cy, u });
    const totalPx = obj.countAlpha();
    // Secondary object (multi-label realism) on ~20% of class tiles.
    let secondary = null;
    const secs = SECONDARY[primaryClass] || [];
    if (secs.length && rng() < 0.2) {
      secondary = pick(rng, secs);
      const sx = cx + (rng() < 0.5 ? -1 : 1) * rr(rng, 55, 85), sy = cy + rr(rng, -25, 30);
      PAINTERS[secondary](bg, obj, rng, { cx: Math.max(20, Math.min(220, sx)), cy: sy, u: u * rr(rng, 0.4, 0.6) });
    }
    // Occlusion: punch shapes out of the object layer, draw them on top.
    const oroll = rng();
    occlusion = oroll < 0.62 ? 'none' : oroll < 0.91 ? 'partial' : 'heavy'; // [REBALANCE: heavy quota 0.15 -> 0.09]
    if (occlusion !== 'none') {
      const occ = new Layer(TILE, TILE);
      const n = occlusion === 'heavy' ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const ow = rr(rng, 30, occlusion === 'heavy' ? 130 : 80), oh = rr(rng, 25, 90);
        const ox = cx + rr(rng, -60, 40), oy = cy + rr(rng, -55, 35);
        if (rng() < 0.5) occ.fillRect(ox, oy, ox + ow, oy + oh, [105, 108, 112]);
        else occ.fillCircle(ox + ow / 2, oy + oh / 2, ow / 2, [80, 105, 70]);
      }
      for (let i = 3; i < obj.px.length; i += 4) if (occ.px[i]) obj.px[i] = 0;
      var occLayer = occ;
    }
    frac = obj.countAlpha() / (TILE * TILE);
    if (frac >= 0.002) {
      labels.push(primaryClass);
      if (secondary && obj.countAlpha() > 0) labels.push(secondary);
    }
    var occVis = occLayer || null;
  }
  let rgb = composite(bg, obj);
  if (typeof occVis !== 'undefined' && occVis) { // draw occluders over the object
    for (let i = 0, j = 0; i < occVis.px.length; i += 4, j += 3)
      if (occVis.px[i + 3]) { rgb[j] = occVis.px[i]; rgb[j + 1] = occVis.px[i + 1]; rgb[j + 2] = occVis.px[i + 2]; }
  }
  const blur = primaryClass ? (rng() < 0.7 ? 'none' : rng() < 0.66 ? 'mild' : 'strong') : (rng() < 0.8 ? 'none' : 'mild');
  if (blur !== 'none') rgb = boxBlur(rgb, TILE, TILE, blur === 'mild' ? 1 : 2);
  addNoise(rgb, TILE, TILE, 9, rng);
  const size_band = !primaryClass ? 'none' : frac >= 0.5 ? 'whole' : frac >= 0.05 ? 'partial' : 'sliver';
  return {
    png: encodePNG(rgb, TILE, TILE), labels: [...new Set(labels)],
    axes: {
      instance_size: Math.round(frac * 10000) / 10000, occlusion,
      blur, clutter: clutterN < 3 ? 'low' : clutterN < 7 ? 'med' : 'high',
      distance: frac >= 0.25 ? 'near' : frac >= 0.06 ? 'mid' : 'far',
    },
    size_band,
    band: frac > 0 && (frac < 0.02 || occlusion === 'heavy'),
  };
}

/* ----------------------------------------------------------------- Main */
function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const TRAIN_CLASSES = ['bicycle', 'bridge', 'bus', 'car', 'chimney', 'crosswalk', 'fire_hydrant', 'motorcycle', 'mountain', 'palm_tree', 'stairs', 'taxi', 'traffic_light', 'tractor'];
  const HOLDOUT_CLASSES = ['train', 'boat']; // SPEC §4.6 — final-holdout only
  const manifest = [];
  let n = 0;
  const emit = (tile, split) => {
    n++;
    const uid = 'a_' + String(n).padStart(6, '0');
    const file = `typeA/${uid}.png`;
    fs.writeFileSync(path.join(OUT_DIR, `${uid}.png`), tile.png);
    manifest.push({
      tile_uid: uid, file, labels: tile.labels, source: 'synthetic', licence: 'generated',
      split, size_band: tile.size_band, instance_fraction: tile.axes.instance_size,
      band: tile.band, axes: tile.axes, annotators: 0, kappa: null,
    });
  };
  const splitFor = rng => { const r = rng(); return r < 0.7 ? 'train' : r < 0.9 ? 'eval' : 'holdout_final'; };
  let seed = 20261010;
  const gen = (cls, count, holdoutOnly) => {
    for (let i = 0; i < count; i++) {
      let tile, tries = 0;
      do { tile = buildTile(seed++, cls); tries++; }
      while (cls && tile.labels.length === 0 && tries < 6); // object occluded/clipped to nothing — retry
      const srng = mulberry32(seed * 31 + 7);
      emit(tile, holdoutOnly ? 'holdout_final' : splitFor(srng));
    }
  };
  for (const cls of TRAIN_CLASSES) gen(cls, 66, false);
  for (const cls of HOLDOUT_CLASSES) gen(cls, 36, true);
  gen(null, 180, false); // context-only hard negatives (~15% of pool)

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.jsonl'), manifest.map(m => JSON.stringify(m)).join('\n') + '\n');
  const perClass = {}, splits = {}, bands = { whole: 0, partial: 0, sliver: 0 };
  let bandTiles = 0, ctx = 0;
  for (const m of manifest) {
    splits[m.split] = (splits[m.split] || 0) + 1;
    bands[m.size_band]++; if (m.band) bandTiles++;
    if (!m.labels.length) ctx++;
    for (const l of m.labels) perClass[l] = (perClass[l] || 0) + 1;
  }
  const labeled = manifest.filter(m => m.labels.length);
  const bandHeavy = labeled.filter(m => m.band && m.axes.occlusion === 'heavy').length;
  const bandFracOnly = labeled.filter(m => m.band && m.axes.occlusion !== 'heavy').length;
  console.log(`tiles: ${manifest.length}  context(empty-label): ${ctx}  band tiles: ${bandTiles}`);
  console.log(`band share: ${(100 * bandTiles / manifest.length).toFixed(1)}% of all tiles · ${(100 * bandTiles / labeled.length).toFixed(1)}% of labeled tiles`);
  console.log(`band decomposition: heavy-occlusion ${bandHeavy} · sub-2%-fraction only ${bandFracOnly}`);
  console.log('splits:', splits); console.log('size bands:', bands);
  console.log('per-class label counts:', perClass);
  const under = Object.entries(perClass).filter(([, c]) => c < 60);
  if (under.length) console.log('WARNING under 60/class:', under);
}
if (require.main === module) main();
module.exports = {
  encodePNG, mulberry32, pngChunk, crc32,
  Layer, PAINTERS, AREA, SECONDARY, composite, addNoise, boxBlur,
  skyGround, cloud, clutterBlobs, pick, rr,
  setTileSize: (n) => { TILE = n; }, getTileSize: () => TILE,
};
