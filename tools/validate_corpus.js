#!/usr/bin/env node
/* validate_corpus.js — full structural validation of every corpus PNG.
 * For each file: PNG signature, chunk walk (lengths + CRC32), IDAT inflate
 * must consume the whole stream, decompressed size must match IHDR geometry
 * (filter byte per scanline), scanline filter bytes must be 0..4, IEND must
 * be the last chunk with no trailing bytes. Anything less is "looks fine in
 * ls, broken in a browser".
 * Usage: node tools/validate_corpus.js [dir ...]  (default: typeA + typeB)
 * Exit 0 = all valid. Prints one line per bad file + a summary.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

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
const SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const BPP = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function validatePNG(buf) {
  const problems = [];
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIG)) { problems.push('bad signature'); return problems; }
  let off = 8, ihdr = null, sawIEND = false;
  const idatParts = [];
  while (off < buf.length) {
    if (off + 12 > buf.length) { problems.push(`truncated chunk header at ${off}`); break; }
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString('ascii');
    if (off + 12 + len > buf.length) { problems.push(`chunk ${type} at ${off} overruns file (len ${len})`); break; }
    const data = buf.subarray(off + 8, off + 8 + len);
    const crcStored = buf.readUInt32BE(off + 8 + len);
    const crcCalc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
    if (crcStored !== crcCalc) problems.push(`CRC mismatch in ${type} chunk`);
    if (type === 'IHDR') {
      ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], colour: data[9], interlace: data[12] };
      if (ihdr.depth !== 8) problems.push(`bit depth ${ihdr.depth} (expected 8)`);
      if (BPP[ihdr.colour] === undefined) problems.push(`unknown colour type ${ihdr.colour}`);
      if (ihdr.interlace !== 0) problems.push('interlaced (validator expects non-interlaced)');
    }
    if (type === 'IDAT') idatParts.push(data);
    if (type === 'IEND') { sawIEND = true; off += 12 + len; break; }
    off += 12 + len;
  }
  if (!sawIEND) problems.push('no IEND chunk');
  else if (off !== buf.length) problems.push(`${buf.length - off} trailing byte(s) after IEND`);
  if (!ihdr) { problems.push('no IHDR'); return problems; }
  if (!idatParts.length) { problems.push('no IDAT'); return problems; }
  let raw;
  try {
    raw = zlib.inflateSync(Buffer.concat(idatParts));
  } catch (e) {
    problems.push('IDAT inflate failed: ' + e.message);
    return problems;
  }
  const bpp = BPP[ihdr.colour] || 3;
  const stride = ihdr.w * bpp + 1;
  if (raw.length !== stride * ihdr.h) {
    problems.push(`inflated size ${raw.length} != expected ${stride * ihdr.h} (IHDR ${ihdr.w}x${ihdr.h} colour ${ihdr.colour})`);
  } else {
    for (let y = 0; y < ihdr.h; y++) {
      const f = raw[y * stride];
      if (f > 4) { problems.push(`bad filter byte ${f} on scanline ${y}`); break; }
    }
  }
  return problems;
}

function main() {
  const dirs = process.argv.slice(2);
  const targets = dirs.length ? dirs : [
    path.join(__dirname, '..', 'corpus', 'typeA'),
    path.join(__dirname, '..', 'corpus', 'typeB'),
  ];
  let files = [];
  for (const d of targets) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(f => f.endsWith('.png')).sort())
      files.push(path.join(d, f));
  }
  let bad = 0;
  for (const f of files) {
    const problems = validatePNG(fs.readFileSync(f));
    if (problems.length) { bad++; console.log(`BAD ${path.basename(f)}: ${problems.join('; ')}`); }
  }
  console.log(`validated ${files.length} PNG(s), ${bad} bad`);
  process.exit(bad ? 1 : 0);
}
if (require.main === module) main();
module.exports = { validatePNG };
