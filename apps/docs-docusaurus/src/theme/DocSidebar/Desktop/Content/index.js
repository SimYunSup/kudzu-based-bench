// Thin WRAP (not an eject) around theme-classic's desktop sidebar content —
// per https://docusaurus.io/docs/swizzling ("Do I need to swizzle?"),
// wrapping is the safer option whenever it's sufficient, and it is here:
// the stock component already renders `<nav className={clsx('menu
// thin-scrollbar', styles.menu, className)}>` and forwards its
// `className` prop straight into that class list, so this only needs to
// append one class through the existing prop rather than reimplement the
// component. Everything else — item rendering, collapsing, and the
// current-page `aria-current="page"` the docs fixture's DOM contract also
// wants (already set by the stock DocSidebarItem/Link's
// `aria-current={isActive ? 'page' : undefined}`, unmodified here) — is
// untouched.
//
// Scope: only the desktop sidebar is covered by this wrapper. The mobile
// drawer (`DocSidebar/Mobile`) keeps its stock classes/structure — the
// docs fixture's DOM contract is exercised at desktop viewport widths.
import React from "react";
import OriginalContent from "@theme-original/DocSidebar/Desktop/Content";

export default function DocSidebarDesktopContent(props) {
  const className = [props.className, "sidebar"].filter(Boolean).join(" ");
  return <OriginalContent {...props} className={className} />;
}
