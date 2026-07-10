import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// TUDU mark: a rounded "T" with the wordmark's accent underline, ink-cream on
// near-black. Echoes the logo instead of a bare letter.
const BG = [0x10, 0x0f, 0x0e], FG = [0xed, 0xed, 0xea];

function crc32(buf) {
  let crc = ~0;
  for (const b of buf) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
const be32 = (n) => Buffer.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const td = Buffer.concat([t, data]);
  return Buffer.concat([be32(data.length), td, be32(crc32(td))]);
}

// distance from point to a segment
function distSeg(px, py, [ax, ay, bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function png(size, pad) {
  const inset = size * pad;
  const content = size - 2 * inset;
  const xL = inset, xR = size - inset, yT = inset, yB = size - inset, cx = size / 2;
  const w = content * 0.155, half = w / 2;           // T stroke
  const wu = content * 0.11, halfU = wu / 2;          // underline stroke
  const barY = yT + half;
  const tBottom = yB - content * 0.24;                // leave room for underline
  const uHalf = content * 0.26;
  const underlineY = yB - halfU;

  // [segment, halfWidth]
  const strokes = [
    [[xL + half, barY, xR - half, barY], half],       // T bar
    [[cx, barY, cx, tBottom], half],                  // T stem
    [[cx - uHalf, underlineY, cx + uHalf, underlineY], halfU] // accent underline
  ];

  const ihdr = Buffer.concat([be32(size), be32(size), Buffer.from([8, 6, 0, 0, 0])]);
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5;
      let cov = 0;
      for (const [seg, hw] of strokes) {
        cov = Math.max(cov, Math.min(1, hw - distSeg(px, py, seg) + 0.5));
      }
      cov = Math.max(0, cov);
      row.set([
        Math.round(BG[0] + (FG[0] - BG[0]) * cov),
        Math.round(BG[1] + (FG[1] - BG[1]) * cov),
        Math.round(BG[2] + (FG[2] - BG[2]) * cov),
        255
      ], 1 + x * 4);
    }
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, 0.24));
writeFileSync('public/icons/icon-512.png', png(512, 0.24));
writeFileSync('public/icons/icon-maskable-512.png', png(512, 0.34)); // extra safe-zone padding
writeFileSync('public/icons/apple-touch-icon.png', png(180, 0.2));
console.log('icons written to public/icons/');
