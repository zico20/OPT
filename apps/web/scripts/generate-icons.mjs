/**
 * Rasterize the V3 brand SVGs into the PNG sizes browsers + PWA still expect.
 *
 *   app/icon.svg         (transparent bg, classic radar)  → favicon-16/32 PNG
 *   app/apple-icon.svg   (dark bg, vertically centered)   → apple-touch + PWA
 *
 * Wired up via the `prebuild` script in package.json so every `next build`
 * produces fresh icons from the current SVGs — no separate manual step.
 *
 * Sharp ships as a dep of Next 15 (image optimization) and is installed in
 * node_modules; we declare it explicitly in devDependencies for clarity.
 */
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = resolve(ROOT, "public");

const iconSvg = readFileSync(resolve(ROOT, "app/icon.svg"));
const appleSvg = readFileSync(resolve(ROOT, "app/apple-icon.svg"));

// Increase density on the SVG raster so small targets stay crisp.
const DENSITY = 512;

const targets = [
  { src: iconSvg,  out: "favicon-16x16.png",   size: 16 },
  { src: iconSvg,  out: "favicon-32x32.png",   size: 32 },
  { src: appleSvg, out: "apple-touch-icon.png", size: 180 },
  { src: appleSvg, out: "icon-192.png",         size: 192 },
  { src: appleSvg, out: "icon-512.png",         size: 512 }
];

mkdirSync(PUBLIC_DIR, { recursive: true });

for (const { src, out, size } of targets) {
  const outPath = resolve(PUBLIC_DIR, out);
  await sharp(src, { density: DENSITY })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
  console.log(`  ✓ ${out} (${size}×${size})`);
}

console.log("Icons regenerated from V3 brand SVGs.");
