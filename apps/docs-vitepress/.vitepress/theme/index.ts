// Extends (does not replace) the default theme — purely additive CSS for
// the docs fixture's own elements (site-title/section-cards on the home
// page). No Layout override, no enhanceApp: every other DOM-contract patch
// lives in .vitepress/config.ts's `markdown.config` / `transformHtml` hooks
// instead, since those run at build time against real HTML rather than
// needing a client-side theme component.
import DefaultTheme from "vitepress/theme";
import "./style.css";

export default DefaultTheme;
