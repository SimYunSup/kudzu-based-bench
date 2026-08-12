export interface SidebarRow {
  href: string;
  title: string;
  current: boolean;
}

export interface SidebarGroup {
  handle: string;
  title: string;
  rows: SidebarRow[];
}

interface SidebarProps {
  groups: SidebarGroup[];
}

/**
 * Guide page navigation: one group per doc-data section, one row per page
 * in that section. `groups` arrives fully pre-shaped (including the
 * per-route `current` flag) from [slug].tsx's getStaticPaths() — the
 * nested `group.rows.map()` below only ever reads a direct-child field of
 * its own item (`group`), the shape Kudzu's nested-list analysis supports,
 * and `row.current` is an item-only field so its `aria-current` ternary
 * needs no parent-scope capture either.
 */
export default function Sidebar({ groups }: SidebarProps) {
  return (
    <nav className="sidebar">
      {groups.map(group => (
        <div className="sidebar-group" key={group.handle}>
          <p className="sidebar-section-title">{group.title}</p>
          <ul>
            {group.rows.map(row => (
              <li key={row.href}>
                <a className="sidebar-link" href={row.href} aria-current={row.current ? "page" : undefined}>
                  {row.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
