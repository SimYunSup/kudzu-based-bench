// Vendored from @tanstack/start-static-server-functions@1.167.x with one fix:
// the upstream middleware fetches the prerendered cache from the origin root
// (`/__tsr/staticServerFnCache/...`), which 404s on a GitHub Pages project
// site where the app lives under `/kudzu-based-bench/tanstack/`.
// The client fetch below prefixes Vite's BASE_URL so the cache resolves to
// the same subdirectory the build actually publishes it to. The server-side
// write path is unchanged (paths there are joined against
// TSS_CLIENT_OUTPUT_DIR, which is already the deployed subtree root).
import fs from "node:fs/promises";
import path from "node:path";
import { createMiddleware, getDefaultSerovalPlugins } from "@tanstack/react-start";
import type { FunctionClientResultWithContext } from "@tanstack/start-client-core";
import { fromJSON, toJSONAsync } from "seroval";

interface StaticCachedItem {
  result: unknown;
  context: Record<string, unknown> | undefined;
}

/** SHA-1 of `message` as hex — only used to shorten cache filenames. */
async function sha1Hash(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const getStaticCacheUrl = async (opts: { functionId: string; hash: string }) => {
  const filename = await sha1Hash(`${opts.functionId}__${opts.hash}`);
  return `/__tsr/staticServerFnCache/${filename}.json`;
};

const jsonToFilenameSafeString = (json: unknown) => {
  const sortedKeysReplacer = (key: string, value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.keys(value)
          .sort()
          .reduce<Record<string, unknown>>((acc, curr) => {
            acc[curr] = (value as Record<string, unknown>)[curr];
            return acc;
          }, {})
      : value;

  const jsonString = JSON.stringify(json ?? "", sortedKeysReplacer);

  return jsonString
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "_");
};

async function writeItemToCache(opts: {
  functionId: string;
  data: unknown;
  item: StaticCachedItem;
}): Promise<void> {
  const hash = jsonToFilenameSafeString(opts.data);
  const url = await getStaticCacheUrl({ functionId: opts.functionId, hash });
  const clientOutputDir = process.env.TSS_CLIENT_OUTPUT_DIR;
  if (!clientOutputDir) return;
  const filePath = path.join(clientOutputDir, url);

  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const stringifiedResult = JSON.stringify(
    await toJSONAsync(opts.item, { plugins: getDefaultSerovalPlugins() }),
  );
  await fs.writeFile(filePath, stringifiedResult, "utf-8");
}

const fetchItem = async (opts: {
  data: unknown;
  functionId: string;
}): Promise<StaticCachedItem> => {
  const hash = jsonToFilenameSafeString(opts.data);
  const url = await getStaticCacheUrl({ functionId: opts.functionId, hash });

  // Upstream fix: resolve against the app's base path instead of the origin
  // root, so project-page deployments (GitHub Pages subdirectory) find the
  // cache file emitted under their own subtree.
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const serialized: unknown = await fetch(`${base}${url}`, { method: "GET" }).then(
    (r) => r.json(),
  );
  // seroval's fromJSON deserializes the exact shape toJSONAsync serialized
  // above; the cast restates that round-trip contract.
  return fromJSON(
    serialized as Parameters<typeof fromJSON>[0],
    { plugins: getDefaultSerovalPlugins() },
  ) as StaticCachedItem;
};

export const staticFunctionMiddleware = createMiddleware({ type: "function" })
  .client(async (ctx) => {
    if (
      process.env.NODE_ENV === "production" &&
      // do not run this during SSR on the server
      typeof document !== "undefined"
    ) {
      const item = await fetchItem({
        functionId: ctx.serverFnMeta.id,
        data: ctx.data,
      });

      if (item) {
        // The middleware contract expects `next()`'s result shape; we replay
        // the prerendered result instead of calling the (nonexistent on a
        // static host) server function. Mirrors the upstream cast.
        return {
          result: item.result,
          context: { ...ctx.context, ...item.context },
        } as unknown as FunctionClientResultWithContext<undefined, undefined, undefined>;
      }
    }
    return ctx.next();
  })
  .server(async (ctx) => {
    const response = await ctx.next();
    if (
      process.env.NODE_ENV === "production" &&
      process.env.TSS_CLIENT_OUTPUT_DIR
    ) {
      // `next()`'s opaque result carries the serialized fn result; sendContext
      // is what the upstream middleware persists alongside it.
      const { result } = response as unknown as { result: unknown };
      const { sendContext } = ctx as unknown as {
        sendContext: Record<string, unknown> | undefined;
      };
      await writeItemToCache({
        functionId: ctx.serverFnMeta.id,
        item: { result, context: sendContext },
        data: ctx.data,
      });
    }

    return response;
  });
