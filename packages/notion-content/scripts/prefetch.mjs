#!/usr/bin/env node
// Prefetches every news entry from Notion once and writes it to a cache file
// that the parallel CI matrix builds read via NOTION_CONTENT_CACHE, instead of
// each build (and each build's search-index prebuild) re-querying Notion. One
// fetch per deploy instead of six or seven keeps CI under Notion's ~3 req/s
// rate limit. Runs in plain Node against the compiled @otw/notion-content dist.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fetchNewsEntries } from "../dist/index.js";

// The README documents Notion credentials as living in a root `.env`, but
// nothing was loading it. This runs as plain Node rather than through Vite,
// so `process.env` started empty and every prefetch silently produced an
// empty cache — the same outcome as having no credentials at all, which is
// why it went unnoticed. Loading it here also covers the variant builds:
// they inherit this process's environment through pnpm.
try {
  process.loadEnvFile(new URL("../../../.env", import.meta.url));
} catch {
  // No .env: fetchNewsEntries() resolves to [] and the build still succeeds.
}

// This script *produces* the cache, so it must always fetch live. If the
// environment already points NOTION_CONTENT_CACHE at our own output file,
// fetchNewsEntries() would read that (stale or absent) file and echo it back
// instead of querying Notion — a self-referential loop. Unset it first.
delete process.env.NOTION_CONTENT_CACHE;

const outPath = resolve(process.cwd(), process.argv[2] ?? "notion-cache/news-entries.json");

// fetchNewsEntries() resolves to [] when Notion secrets are unset, so an empty
// entries cache is a valid, expected outcome — the build must still succeed.
const entries = await fetchNewsEntries();
const payload = { version: 1, generatedAt: new Date().toISOString(), entries };
const json = JSON.stringify(payload);

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, json);

console.log(
  `@otw/notion-content: prefetched ${entries.length} entries -> ${outPath} (${Buffer.byteLength(json)} bytes)`
);
