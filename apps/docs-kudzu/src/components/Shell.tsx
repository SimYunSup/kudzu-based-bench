// Kudzu 0.8.53+ emits a stylesheet only when a route's reachable source graph
// imports it; up to 0.8.39 every file under src/ was linked on every page.
// Both routes render through this shell, so one edge here covers the site.
import "../style.css";
import Header from "./Header";
import { siteUrl } from "../lib/site";

// Precomputed at module scope, same reasoning as HOME_HREF in Header.tsx.
const SEARCH_SCRIPT_URL = siteUrl("search.js");

/**
 * Shared page shell: header (with the search container) plus the vanilla
 * search.js loader (public/search.js — not compiled by Kudzu, see its own
 * header comment). Not a Kudzu `navigation` layout — every route here is a
 * complete standalone document (see kudzu.config.mjs), so this is just
 * ordinary composition, reused per page like apps/shop-kudzu's Shell.
 */
export default function Shell({ children }: { children?: unknown }) {
  return (
    <>
      <Header />
      {children}
      <script type="module" src={SEARCH_SCRIPT_URL}></script>
    </>
  );
}
