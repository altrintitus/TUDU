import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// TUDU mark: the app's own checkbox — a rounded ink-cream box with an ember
// checkmark — on near-black. Echoes the in-app checkbox; the one ember accent
// makes it read among a colourful home screen.
const BG = [0x10, 0x0f, 0x0e], CREAM = [0xed, 0xed, 0xea], EMBER = [0xff, 0x6a, 0x1a];

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

// distance from point to a segment (rounded caps)
function distSeg(px, py, [ax, ay, bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// signed distance to a rounded rectangle (negative inside)
function sdfRoundRect(px, py, cx, cy, hx, hy, r) {
  const qx = Math.abs(px - cx) - hx + r;
  const qy = Math.abs(py - cy) - hy + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function png(size, pad) {
  const inset = size * pad;
  const content = size - 2 * inset;
  const cx = size / 2, cy = size / 2;
  const boxHalf = content * 0.42;      // checkbox half-side
  const cornerR = content * 0.17;      // rounded corners
  const sHalf = content * 0.05;         // stroke half-width (box + tick match)

  // checkmark, sized to sit inside the box with margin
  const tickSegs = [
    [cx - content * 0.145, cy + content * 0.012, cx - content * 0.05, cy + content * 0.095],
    [cx - content * 0.05, cy + content * 0.095, cx + content * 0.155, cy - content * 0.10]
  ];

  const ihdr = Buffer.concat([be32(size), be32(size), Buffer.from([8, 6, 0, 0, 0])]);
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5;
      const covBox = clamp01(sHalf - Math.abs(sdfRoundRect(px, py, cx, cy, boxHalf, boxHalf, cornerR)) + 0.5);
      let dTick = Infinity;
      for (const seg of tickSegs) dTick = Math.min(dTick, distSeg(px, py, seg));
      const covTick = clamp01(sHalf - dTick + 0.5);

      // composite: near-black ground → cream box → ember tick on top
      let r = BG[0], g = BG[1], b = BG[2];
      r += (CREAM[0] - r) * covBox; g += (CREAM[1] - g) * covBox; b += (CREAM[2] - b) * covBox;
      r += (EMBER[0] - r) * covTick; g += (EMBER[1] - g) * covTick; b += (EMBER[2] - b) * covTick;
      row.set([Math.round(r), Math.round(g), Math.round(b), 255], 1 + x * 4);
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
writeFileSync('public/icons/icon-192.png', png(192, 0.22));
writeFileSync('public/icons/icon-512.png', png(512, 0.22));
writeFileSync('public/icons/icon-maskable-512.png', png(512, 0.32)); // extra safe-zone padding
writeFileSync('public/icons/apple-touch-icon.png', png(180, 0.18));
console.log('icons written to public/icons/');
