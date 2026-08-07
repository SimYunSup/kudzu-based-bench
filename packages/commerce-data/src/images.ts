/**
 * Deterministic product images.
 *
 * The benchmark cannot fetch real product photos: they would make LCP depend
 * on a CDN and make every variant's byte totals unreproducible. Each variant
 * therefore writes the same 12 PNGs into its own public directory, so image
 * bytes are a constant offset that cancels out when frameworks are compared.
 *
 * They are posterized gradients rather than photo-like noise on purpose.
 * PNG is lossless, so continuous-tone content costs 300 KB–1.7 MB per tile
 * here, which would dominate every measurement with a property that has
 * nothing to do with the framework. Quantizing to a 16-step ramp keeps a
 * real 800x800 decode and layout cost at ~20 KB transfer. Image weight is
 * held constant, not modelled — the same rule `scripts/build-stats.mjs`
 * already applies when it excludes images from output size.
 *
 * Encoder is `pngjs`, already a workspace dependency for visual-diff.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { IMAGE_COUNT } from "./index.js";

const SIZE = 800;
/** Colour quantization step. Larger = flatter = smaller file. */
const STEP = 16;

const HUES: ReadonlyArray<readonly [number, number, number]> = [
  [214, 198, 176],
  [126, 138, 122],
  [62, 74, 92],
  [188, 172, 190]
];

function render(slot: number): Buffer {
  const png = new PNG({ width: SIZE, height: SIZE });
  const hue = HUES[slot % HUES.length]!;
  // Three band phases per hue give 12 visually distinct tiles from 4 colours.
  const phase = Math.floor(slot / HUES.length) * 30;
  const quantize = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value / STEP) * STEP));

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const index = (y * SIZE + x) << 2;
      const ramp = (x + y) / (SIZE * 2);
      const wave = Math.sin((x + phase) / 90) * 14 + Math.cos((y + phase) / 70) * 10;
      png.data[index] = quantize(hue[0] * (0.72 + ramp * 0.5) + wave);
      png.data[index + 1] = quantize(hue[1] * (0.72 + ramp * 0.5) + wave);
      png.data[index + 2] = quantize(hue[2] * (0.72 + ramp * 0.5) + wave);
      png.data[index + 3] = 255;
    }
  }

  return PNG.sync.write(png, { deflateLevel: 9 });
}

/**
 * Write `p-00.png` … `p-11.png` into `dir`, creating it if needed.
 * Returns total bytes written so a build can report them.
 */
export function writeCatalogImages(dir: string): number {
  mkdirSync(dir, { recursive: true });
  let total = 0;

  for (let slot = 0; slot < IMAGE_COUNT; slot++) {
    const bytes = render(slot);
    writeFileSync(join(dir, `p-${String(slot).padStart(2, "0")}.png`), bytes);
    total += bytes.length;
  }

  return total;
}
