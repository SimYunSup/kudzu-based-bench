import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Record-and-replay `fetch` for the Notion client, enabled by
 * `NOTION_HTTP_CACHE=<dir>`: a request whose response is already on disk is
 * answered from disk, anything else goes to the network and a successful
 * response is written down for next time.
 *
 * It exists for `scripts/build-stats.mjs`. The other nine newsletter variants
 * build from a prefetched content file, so their measured build time contains
 * no network. This variant queries Notion from inside the build, and three
 * cold builds in a row each re-fetch every page: that trips Notion's rate
 * limit, and the "build time" becomes retry-after backoff (58 s against a 5 s
 * build, measured). Replaying the warm-up build's responses puts the measured
 * builds on the same no-network footing as the rest of the table.
 */
export function recordingFetch(dir: string): typeof fetch {
  mkdirSync(dir, { recursive: true });
  return async (input, init) => {
    const request = new Request(input, init);
    const body = request.method === "GET" || request.method === "HEAD" ? "" : await request.clone().text();
    const key = createHash("sha256").update(`${request.method} ${request.url}\n${body}`).digest("hex");
    const file = path.join(dir, `${key}.json`);
    if (existsSync(file)) {
      const recorded = JSON.parse(readFileSync(file, "utf8"));
      return new Response(recorded.body, { status: recorded.status, headers: { "content-type": recorded.contentType } });
    }
    const response = await fetch(request);
    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "application/json";
    if (response.ok) {
      writeFileSync(file, JSON.stringify({ status: response.status, contentType, body: text }));
    }
    // The body was consumed above, so hand the client a fresh Response. Only
    // the content type survives: the text is already decoded, and a copied
    // content-encoding or content-length header would describe other bytes.
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: { "content-type": contentType, ...(response.headers.has("retry-after") ? { "retry-after": response.headers.get("retry-after")! } : {}) }
    });
  };
}
