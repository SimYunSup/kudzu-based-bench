#!/usr/bin/env node
// Write the shared catalog images into public/ so `next build` copies them
// into out/. Byte-identical to every other variant's copy — image weight is
// held constant so it cancels out of the comparison.
//
// Unlike the Kudzu variant there is no catalog codegen step here: Next
// compiles ordinary package imports, so src/lib/catalog.ts can call
// buildCatalog() directly at build time.
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeCatalogImages } from "@otw/commerce-data/images";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const bytes = writeCatalogImages(join(appDir, "public", "commerce"));

console.log(`gen-assets: wrote ${(bytes / 1024).toFixed(0)} KB of catalog images`);
