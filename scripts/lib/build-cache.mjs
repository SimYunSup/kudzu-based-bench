// Shared definition of "what a clean build has to delete".
//
// Both benchmark scripts (scripts/build-stats.mjs, scripts/shop-scale.mjs)
// claim to measure clean builds, and both originally deleted only the output
// directory. Every framework here also keeps a build cache somewhere else,
// and how much it caches differs wildly — so the numbers were really
// incremental builds, biased by a different amount per variant.
//
// Astro was the visible symptom: one run at 2,496 ms against two at ~3,900 ms
// from a surviving `node_modules/.astro` image cache. Docusaurus was the
// expensive one: deleting `.docusaurus` moved it from 1,676 ms to 5,056 ms,
// three times its reported cost, and from fourth place to ninth.
//
// The list lives here rather than in either script because a benchmark that
// silently forgets one entry does not fail — it just reports a flattering
// number for whichever variant owns that directory.
import { rmSync } from "node:fs";
import path from "node:path";

/**
 * Static output locations, in the order they should be probed.
 *
 * Deliberately excludes Hugo's `public`: it is an output directory for Hugo
 * and a *source* directory for everyone else, and the shop variants keep
 * their generated catalog images there. A cleaner that matched on name would
 * delete them.
 */
export const OUTPUT_DIRS = ["dist", "out", "build/client", "_site"];

/** Build caches kept outside the output directory. */
export const CACHE_DIRS = [
  ".astro",
  ".docusaurus",
  ".kudzu",
  ".next",
  ".nitro",
  ".output",
  ".react-router",
  ".tanstack",
  ".vitepress/cache",
  "resources",
  "node_modules/.astro",
  "node_modules/.cache",
  "node_modules/.vite"
];

/**
 * Delete a variant's build caches, plus any extra directories the caller
 * knows about (an explicit `outDir`, for instance). Missing paths are free.
 */
export function cleanBuildArtifacts(appDir, extraDirs = []) {
  for (const dir of extraDirs) rmSync(dir, { recursive: true, force: true });
  for (const name of CACHE_DIRS) rmSync(path.join(appDir, name), { recursive: true, force: true });
}
