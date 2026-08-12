#!/usr/bin/env node
// react-router.config.ts sets `basename` to the full deploy path so the
// client router matches the URL it's actually served at once hydrated (the
// prerender request path and the runtime path must agree). React Router's
// prerender plugin writes each page's HTML under that same basename inside
// build/client, which nests the real output one directory below where
// scripts/form-bench.mjs looks (it serves build/client itself as the
// variant's document root, same as every other variant's flat dist/out).
// This hoists the nested tree back up to build/client/<route>/index.html.
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = join(appDir, "build", "client");
const nestedDir = join(clientDir, "kudzu-based-bench", "form-react-router");

if (!existsSync(nestedDir)) {
  throw new Error(`flatten-build: expected prerendered output at ${nestedDir}`);
}

// react-router also writes a generic SPA-fallback shell at the client root;
// it shadows the real prerendered "/" page that lives under nestedDir.
rmSync(join(clientDir, "index.html"), { force: true });

for (const entry of readdirSync(nestedDir)) {
  cpSync(join(nestedDir, entry), join(clientDir, entry), { recursive: true });
}
rmSync(join(clientDir, "kudzu-based-bench"), { recursive: true, force: true });

console.log("flatten-build: hoisted prerendered routes to build/client/");
