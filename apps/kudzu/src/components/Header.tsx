// Kudzu 0.8.53+ emits a stylesheet only when a route's reachable source graph
// imports it; up to 0.8.39 every file under src/ was linked on every page.
// All three routes render this header, so the global sheet hangs here and the
// post-body sheet hangs off the post route that actually uses it.
import "../style.css";
import { siteUrl } from "../lib/site";

// Precomputed at module scope: Kudzu treats function calls inside JSX
// expressions as reactive-binding captures and rejects imported helpers.
const HOME_URL = siteUrl("/");
const ARCHIVE_URL = siteUrl("news/list/1");

export default function Header() {
  return (
    <header className="header">
      <div className="container">
        <a className="logo" href={HOME_URL}>
          OTW <span className="logo-sub">for</span> FE
        </a>
        <a className="link" href={ARCHIVE_URL}>
          Archive
        </a>
      </div>
    </header>
  );
}
