// Thin WRAP (not an eject) around the top-level Navbar — one of the most
// commonly wrapped theme-classic components, since it only needs an extra
// ancestor element rather than any change to its internals.
//
// The docs fixture's DOM contract wants the header search UI inside a
// `<header class="doc-header">`. Stock Navbar renders a top-level `<nav
// class="navbar ...">` with no `<header>` ancestor, so this adds the
// wrapping element instead of trying to rewrite the navbar's internals to
// change its own tag. @easyops-cn/docusaurus-search-local replaces the
// `@theme/SearchBar` alias that the stock Navbar already renders
// automatically (no extra `themeConfig.navbar.items` entry needed — see
// docusaurus.config.js), so the search box ends up nested inside this
// `<header>` too.
import React from "react";
import OriginalNavbar from "@theme-original/Navbar";

export default function NavbarWrapper(props) {
  return (
    <header className="doc-header">
      <OriginalNavbar {...props} />
    </header>
  );
}
