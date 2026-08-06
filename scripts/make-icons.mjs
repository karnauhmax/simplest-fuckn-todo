// Regenerates the PWA icons from one SVG. Run with `node scripts/make-icons.mjs`.
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const PAPER = '#f4f2ec';
const INK = '#14130f';
const ACCENT = '#c33a15';

/** Three kanban columns, the last one struck through in the accent. */
function icon({ padding }) {
  const size = 512;
  const inner = size - padding * 2;
  const gap = inner * 0.08;
  const column = (inner - gap * 2) / 3;
  const columns = [0, 1, 2]
    .map((i) => {
      const x = padding + i * (column + gap);
      const height = [0.78, 0.54, 0.3][i] * inner;
      const y = padding + (inner - height);
      const fill = i === 2 ? ACCENT : INK;
      return `<rect x="${x}" y="${y}" width="${column}" height="${height}" rx="${column * 0.08}" fill="${fill}"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${PAPER}"/>
  ${columns}
</svg>`;
}

const tight = Buffer.from(icon({ padding: 72 }));
const safe = Buffer.from(icon({ padding: 128 })); // maskable: art inside the safe zone

await mkdir('public', { recursive: true });
await writeFile('public/icon.svg', tight);

const targets = [
  ['public/icon-192.png', tight, 192],
  ['public/icon-512.png', tight, 512],
  ['public/icon-maskable-512.png', safe, 512],
  ['public/apple-touch-icon.png', safe, 180],
];

for (const [path, source, size] of targets) {
  await sharp(source).resize(size, size).png().toFile(path);
  console.log(`wrote ${path} (${size}px)`);
}
