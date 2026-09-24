import { Client, isFullPage, iteratePaginatedAPI } from "@notionhq/client";
import type { Loader } from "astro/loaders";
import { recordingFetch } from "./http-cache";
import { buildProcessor, NotionPageRenderer } from "./render";
import { htmlToText, writeSearchIndex, type SearchDoc } from "./search/index-writer";

/**
 * Notion loader for the Astro Content Layer API.
 *
 * Forked from `notion-astro-loader` and adapted to `@notionhq/client` v5, which
 * replaced `databases.query` with the data-source API. Pages are loaded from the
 * first data source of the given database, then rendered as collection entries.
 *
 * @param options Takes the same options as `dataSources.query` plus the `Client`
 *   constructor options (`auth`, `fetch`, ...).
 */
export function notionLoader({
  database_id,
  filter_properties,
  sorts,
  filter,
  archived,
  rehypePlugins = [],
  ...clientOptions
}: {
  database_id: string;
  filter_properties?: string[];
  sorts?: any;
  filter?: any;
  archived?: boolean;
  rehypePlugins?: any[];
  [key: string]: any;
}): Loader {
  // Default maxRetries above the SDK's 2 so transient 429s back off and retry
  // (the SDK honors retry-after) instead of failing the build. Spread
  // clientOptions last so an explicit caller-supplied `retry` still wins.
  // NOTION_HTTP_CACHE is set by scripts/build-stats.mjs only (see http-cache).
  const httpCache = process.env.NOTION_HTTP_CACHE;
  const notionClient = new Client({
    retry: { maxRetries: 5 },
    ...(httpCache ? { fetch: recordingFetch(httpCache) } : {}),
    ...clientOptions,
  });

  // A Notion database can contain multiple data sources; query the first one.
  // Resolved lazily and memoized so both schema() and load() share one lookup.
  let dataSourceIdPromise: Promise<string> | undefined;
  const resolveDataSourceId = () => {
    dataSourceIdPromise ??= (async () => {
      const database: any = await notionClient.databases.retrieve({
        database_id,
      });
      const dataSources =
        "data_sources" in database ? database.data_sources : [];
      if (!dataSources || dataSources.length === 0) {
        throw new Error(
          `Notion database ${database_id} has no data sources to load.`
        );
      }
      return dataSources[0].id as string;
    })();
    return dataSourceIdPromise;
  };

  const resolvedRehypePlugins = Promise.all(
    rehypePlugins.map(async (config) => {
      let plugin;
      let options;
      if (Array.isArray(config)) {
        [plugin, options] = config;
      } else {
        plugin = config;
      }
      if (typeof plugin === "string") {
        plugin = (await import(/* @vite-ignore */ plugin)).default;
      }
      return [plugin, options] as const;
    })
  );
  const processor = buildProcessor(resolvedRehypePlugins);

  return {
    name: "notion-loader",
    // No `schema` here: Astro 7 ignores function schemas, and the collection in
    // content.config.ts already supplies the schema (which always took priority).
    async load({ store, logger, parseData }) {
      logger.info("Loading notion pages");
      // Static builds (e.g. CI without repo secrets) must still succeed with
      // an empty collection rather than fail on a missing Notion token or
      // database id. Either one absent → skip the load and emit an empty index.
      if (!clientOptions.auth || !database_id) {
        logger.warn('notion-loader: NOTION_TOKEN or NOTION_DATABASE_ID not set; skipping load (empty collection).');
        try { writeSearchIndex([]); } catch (e) { logger.warn(`munja: ${String(e)}`); }
        return;
      }
      const dataSourceId = await resolveDataSourceId();

      const existingPageIds = new Set(store.keys());
      const renderPromises: Promise<void>[] = [];

      const pages = iteratePaginatedAPI(notionClient.dataSources.query, {
        data_source_id: dataSourceId,
        filter_properties,
        sorts,
        filter,
        archived,
      });

      for await (const page of pages) {
        if (!isFullPage(page)) {
          continue;
        }
        existingPageIds.delete(page.id);
        const existingPage = store.get(page.id);
        // If the page has been updated, re-render it
        if (existingPage?.digest !== page.last_edited_time) {
          const renderer = new NotionPageRenderer(notionClient, page, logger);
          const data = await parseData(await renderer.getPageData());
          const renderPromise = renderer.render(processor).then((rendered) => {
            store.set({
              id: page.id,
              digest: page.last_edited_time,
              data,
              rendered,
            });
          });
          renderPromises.push(renderPromise);
        }
      }

      // Remove any pages that have been deleted
      for (const deletedPageId of existingPageIds) {
        store.delete(deletedPageId);
      }

      // Wait for rendering to complete
      await Promise.all(renderPromises);

      // Build the munja full-text search index from every loaded entry (both
      // freshly rendered and cache-hit) and ship it as a static asset that the
      // browser search island fetches. Done here — the one point that sees the
      // full, rendered Notion corpus — so build-time and query-time
      // tokenization stay identical. Never fail the content load over search.
      try {
        const docs: SearchDoc[] = [];
        for (const [id, entry] of store.entries()) {
          const html = (entry.rendered as { html?: string } | undefined)?.html;
          if (!html) continue;
          const title = (entry.data as any)?.properties?.이름;
          docs.push({
            title: typeof title === "string" && title ? title : id,
            category: "news",
            href: `/news/post/${id}`,
            body: htmlToText(html),
            keywords: null,
          });
        }
        const size = writeSearchIndex(docs);
        logger.info(
          `munja: indexed ${docs.length} entries → public/index.bin (${size} bytes)`
        );
      } catch (error) {
        logger.warn(`munja: failed to build search index: ${String(error)}`);
      }
    },
  };
}
