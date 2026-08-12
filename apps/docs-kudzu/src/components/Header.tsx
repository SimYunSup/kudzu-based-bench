import { siteUrl } from "../lib/site";

// Precomputed at module scope: Kudzu treats function calls inside JSX
// expressions as reactive-binding captures and rejects imported helpers, so
// no siteUrl(...) call may appear inside returned JSX.
const HOME_HREF = siteUrl("/");

export default function Header() {
  return (
    <header className="doc-header">
      <a className="doc-header-title" href={HOME_HREF}>
        Vine 문서
      </a>
      <div id="search"></div>
    </header>
  );
}
