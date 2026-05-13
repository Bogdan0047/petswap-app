/**
 * One-shot image compression for src/assets/{users,pets}/*.jpg.
 * Re-encodes with mozjpeg @ q78, progressive scan, mozjpeg trellis quant.
 * Run with: bun run scripts/compress-images.ts
 */
import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOTS = ['src/assets/users', 'src/assets/pets'];

async function compressDir(dir: string) {
  const files = await readdir(dir);
  for (const f of files) {
    if (!/\.(jpe?g)$/i.test(f)) continue;
    const path = join(dir, f);
    const before = (await stat(path)).size;
    const out = await sharp(path)
      .resize({ width: 256, height: 256, fit: 'cover', withoutEnlargement: true })
      .jpeg({ quality: 78, progressive: true, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toBuffer();
    await writeFile(path, out);
    const after = out.length;
    console.log(`${f.padEnd(20)} ${before.toString().padStart(6)} → ${after.toString().padStart(6)} (-${Math.round((1 - after / before) * 100)}%)`);
  }
}

for (const root of ROOTS) {
  console.log(`\n${root}`);
  await compressDir(root);
}
