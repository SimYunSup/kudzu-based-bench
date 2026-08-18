/**
 * Deterministic product images, in two weight conditions.
 *
 * The benchmark cannot fetch real product photos: they would make LCP depend
 * on a CDN and make every variant's byte totals unreproducible. Each variant
 * therefore writes the same PNGs into its own public directory, so image
 * bytes are a constant offset that cancels out when frameworks are compared.
 *
 * `OTW_IMAGE_WEIGHT` selects the condition:
 *
 *   light (default)  Posterized 800px gradient, ~21 KB. Image weight is held
 *                    constant and negligible so the session-replay tracks
 *                    (contentReady, actReady, session transfer) measure the
 *                    framework and nothing else. Every published number in
 *                    the commerce tables is measured in this condition.
 *   heavy            Photographic 1000px detail (two octaves of seeded value
 *                    noise plus sensor grain, no quantization): ~1.4 MB per
 *                    tile, the weight an unoptimised store photograph
 *                    actually has. This is the condition that makes LCP a
 *                    real measurement: a storefront's LCP element is its
 *                    product photograph, and with the light tiles that
 *                    photograph costs 21 KB, so LCP collapses to roughly FCP
 *                    plus a decode and the metric says nothing a store owner
 *                    would recognise. `pnpm run lcp:bench` publishes both
 *                    conditions so the difference is visible instead of
 *                    asserted.
 *
 * Both conditions are byte-identical across variants and across runs: the
 * noise is seeded per slot, never `Math.random()`.
 *
 * Encoder is `pngjs`, already a workspace dependency for visual-diff.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { IMAGE_COUNT } from "./index.js";

export type ImageWeight = "light" | "heavy";

export const IMAGE_WEIGHT: ImageWeight = process.env.OTW_IMAGE_WEIGHT === "heavy" ? "heavy" : "light";

/** Displayed edge, in CSS pixels of source data. */
const SIZE = IMAGE_WEIGHT === "heavy" ? 1000 : 800;
/** Colour quantization step for the light condition. Larger = flatter = smaller file. */
const STEP = 16;

const HUES: ReadonlyArray<readonly [number, number, number]> = [
  [214, 198, 176],
  [126, 138, 122],
  [62, 74, 92],
  [188, 172, 190]
];

/** Seeded PRNG (mulberry32): identical noise for a given slot on every run. */
function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Smooth value noise from a coarse random lattice, bilinearly interpolated.
 * Two octaves of this plus per-pixel grain is what makes the heavy tiles
 * photographic: deflate cannot find repeats, so the file lands in the MB
 * range the way an unoptimised camera JPEG re-encoded to PNG does.
 */
function valueNoise(seed: number, cells: number): (x: number, y: number) => number {
  const random = prng(seed);
  const lattice = new Float32Array((cells + 1) * (cells + 1));
  for (let index = 0; index < lattice.length; index++) lattice[index] = random();
  const at = (cx: number, cy: number) => lattice[cy * (cells + 1) + cx]!;

  return (x: number, y: number) => {
    const fx = (x / SIZE) * cells;
    const fy = (y / SIZE) * cells;
    const x0 = Math.min(cells, Math.floor(fx));
    const y0 = Math.min(cells, Math.floor(fy));
    const x1 = Math.min(cells, x0 + 1);
    const y1 = Math.min(cells, y0 + 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const top = at(x0, y0) * (1 - tx) + at(x1, y0) * tx;
    const bottom = at(x0, y1) * (1 - tx) + at(x1, y1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
}

function renderLight(slot: number): Buffer {
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

/** Per-pixel grain amplitude. The single knob that sets heavy-tile weight. */
const GRAIN = 6;

function renderHeavy(slot: number): Buffer {
  const png = new PNG({ width: SIZE, height: SIZE });
  const hue = HUES[slot % HUES.length]!;
  const coarse = valueNoise(slot * 7919 + 13, 6);
  const fine = valueNoise(slot * 104729 + 71, 48);
  const grain = prng(slot * 2654435761 + 17);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const index = (y * SIZE + x) << 2;
      // Subject shading (coarse) + surface texture (fine) + sensor grain.
      const shade = 0.55 + coarse(x, y) * 0.5 + fine(x, y) * 0.22;
      for (let channel = 0; channel < 3; channel++) {
        const noise = (grain() - 0.5) * GRAIN;
        png.data[index + channel] = Math.max(0, Math.min(255, Math.round(hue[channel]! * shade + noise)));
      }
      png.data[index + 3] = 255;
    }
  }

  return PNG.sync.write(png, { deflateLevel: 9 });
}

const render = IMAGE_WEIGHT === "heavy" ? renderHeavy : renderLight;

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
