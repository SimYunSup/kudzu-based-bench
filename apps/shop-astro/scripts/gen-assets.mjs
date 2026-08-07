#!/usr/bin/env node
// Write the shared catalog images into public so the build copies them into
// the static output. Byte-identical across every variant — image weight is
// held constant so it cancels out of the comparison.
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeCatalogImages } from "@otw/commerce-data/images";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const bytes = writeCatalogImages(join(appDir, "public", "commerce"));

console.log(`gen-assets: wrote ${(bytes / 1024).toFixed(0)} KB of catalog images`);
