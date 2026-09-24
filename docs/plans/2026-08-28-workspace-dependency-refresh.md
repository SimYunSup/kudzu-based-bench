# Workspace Dependency Refresh Implementation Plan

> **For agentic workers:** Implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every direct registry dependency declared by this pnpm workspace to its current `latest` release and retain a reproducible lockfile.

**Architecture:** Use pnpm's recursive workspace update so each package manifest remains the source of truth and all importer resolutions are regenerated together in `pnpm-lock.yaml`. Keep the existing workspace topology, Node floor, pnpm major, and build allow-list unchanged; compatibility is demonstrated by the repository's aggregate build rather than by manual lockfile edits.

**Tech Stack:** Node.js 24.17.0, pnpm 10.20.0, pnpm workspace, Astro, Next.js, React Router, TanStack Start, Vite, Cloudflare Workers, Vue, Kudzu.

**Spec:** User request in the current conversation: update all packages.

## Global Constraints

- Update direct dependency and devDependency ranges in the root and every workspace package to npm's `latest` tags.
- Regenerate `pnpm-lock.yaml` through pnpm; do not edit lockfile resolutions manually.
- Preserve `packageManager: pnpm@10.20.0`, `.nvmrc` (`v24.17.0`), `pnpm-workspace.yaml`, and existing `allowBuilds`/`onlyBuiltDependencies` policy.
- Preserve workspace protocol links and package names; only external registry dependencies may change.
- Completion requires no entries from `pnpm outdated --recursive --format json`, an immutable install, and a successful aggregate build.

---

### Task 1: Refresh all external workspace dependencies

**Files:**
- Modify: `package.json`
- Modify: `apps/crawler/package.json`
- Modify: `apps/docs-astro/package.json`
- Modify: `apps/docs-kudzu/package.json`
- Modify: `apps/docs-vitepress/package.json`
- Modify: `apps/form-astro/package.json`
- Modify: `apps/form-kudzu/package.json`
- Modify: `apps/form-next-app/package.json`
- Modify: `apps/form-react-router/package.json`
- Modify: `apps/form-tanstack/package.json`
- Modify: `apps/hugo/package.json`
- Modify: `apps/kudzu/package.json`
- Modify: `apps/next-app/package.json`
- Modify: `apps/next-pages/package.json`
- Modify: `apps/react-router/package.json`
- Modify: `apps/shop-astro/package.json`
- Modify: `apps/shop-kudzu/package.json`
- Modify: `apps/shop-next-app/package.json`
- Modify: `apps/shop-react-router/package.json`
- Modify: `apps/shop-tanstack/package.json`
- Modify: `apps/tanstack-router/package.json`
- Modify: `apps/vitepress/package.json`
- Modify: `apps/web/package.json`
- Modify: `packages/commerce-data/package.json`
- Modify: `packages/docs-data/package.json`
- Modify: `packages/notion-content/package.json`
- Modify: `packages/notion-loader/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: the root pnpm workspace declaration and every workspace `package.json` direct dependency range.
- Produces: manifests pointing to current latest external package releases and a lockfile whose importers resolve those ranges.

- [ ] **Step 1: Record the direct dependency baseline**

Run:

```bash
pnpm outdated --recursive --format json
```

Expected: report the stale direct dependencies, including the major updates `vite` 7.3.6 → 8.2.2, `@types/node` 24.13.3 → 26.4.0, and `@kudzujs/core` 0.9.0 → 0.16.4.

- [ ] **Step 2: Refresh every workspace manifest through pnpm**

Run:

```bash
pnpm update --recursive --latest
```

Expected: pnpm rewrites only external direct dependency ranges to their latest stable releases and regenerates `pnpm-lock.yaml` across all importers.

- [ ] **Step 3: Inspect the changed manifests and lockfile**

Check that no workspace protocol dependency, package name, pnpm version pin, or build allow-list changed. The expected direct update set includes Astro, Next.js, Vite, Vue, TanStack, React Router, Cloudflare, Notion, Kudzu, Hugo, ESLint, and TypeScript typings where those packages are declared.

### Task 2: Verify the refreshed dependency graph

**Files:**
- Verify: all files changed by Task 1

**Interfaces:**
- Consumes: the refreshed manifests and lockfile from Task 1.
- Produces: proof that the lockfile is immutable, all declared direct registry dependencies are current, and every benchmark variant still builds.

- [ ] **Step 1: Verify the lockfile is reproducible**

Run:

```bash
pnpm install --frozen-lockfile
```

Expected: exit 0 without changing manifests or `pnpm-lock.yaml`.

- [ ] **Step 2: Verify direct dependency freshness**

Run:

```bash
pnpm outdated --recursive --format json
```

Expected: exit 0 with no stale direct dependency report.

- [ ] **Step 3: Build every maintained variant**

Run:

```bash
pnpm run build:all
```

Expected: exit 0 after building the root web app and all declared framework variants. If a package migration error occurs, update only the source file named by that build error using the dependency's documented replacement API, then rerun the smallest failing build before rerunning `build:all`.

- [ ] **Step 4: Recheck the workspace after the aggregate build**

Run:

```bash
pnpm install --frozen-lockfile && pnpm outdated --recursive --format json
```

Expected: both commands exit 0; the build has not altered the resolved graph or introduced a stale direct dependency.
