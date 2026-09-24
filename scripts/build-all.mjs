#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

try {
  process.loadEnvFile(path.join(repoRoot, ".env"));
} catch {
  // Builds without local secrets intentionally produce empty content.
}

const contentCache = path.join(repoRoot, "notion-cache", "news-entries.json");
if (!process.env.NOTION_CONTENT_CACHE && existsSync(contentCache)) {
  process.env.NOTION_CONTENT_CACHE = contentCache;
}

for (const script of ["build", "build:variants"]) {
  const result = spawnSync("pnpm", ["run", script], {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
