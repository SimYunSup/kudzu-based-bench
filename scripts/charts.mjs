#!/usr/bin/env node
/**
 * README charts — hand-written SVG, no chart library.
 *
 * Reads only the published, committed measurements (landing/*.json), so
 * anyone who clones the repo can regenerate byte-identical charts without
 * re-running a single benchmark. Re-run after any bench that rewrites one of
 * those files:
 *
 *   pnpm run build:stats   -> landing/benchmark.json
 *   pnpm run shop:report   -> landing/commerce.json
 *   pnpm run form:report   -> landing/form.json
 *   pnpm run lcp:bench     -> landing/lcp.json
 *   pnpm run charts        -> assets/charts/{ko,en}/*.svg
 *
 * Every card carries a provenance line built from those files: which fixture,
 * which command measured it, which file it was read from, and the dates the
 * browsers ran. Two charts titled "degradation resilience" measure different
 * fixtures with different capability counts, and without that line a reader
 * has no way to tell which one they are looking at.
 *
 * Design tokens are Linear's marketing system as captured in
 * home-butler/DESIGN.md: near-black canvas, surface ladder, hairline
 * borders, and a single chromatic accent (#5e6ad2) that is never
 * decorative — here it marks the leading bar in a single-series chart and
 * separates series in a grouped one.
 *
 * GitHub serves these through its image proxy, so everything is a
 * presentation attribute: no <style> block, no CSS classes, no web fonts.
 *
 * Usage:
 *   node scripts/charts.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outDir = path.join(repoRoot, "assets", "charts");

const T = {
  canvas: "#010102",
  surface1: "#0f1011",
  surface2: "#141516",
  hairline: "#23252a",
  hairlineStrong: "#34343a",
  bar: "#3e3e44",
  ink: "#f7f8f8",
  inkMuted: "#d0d6e0",
  inkSubtle: "#8a8f98",
  inkTertiary: "#62666d",
  accent: "#5e6ad2",
  accentSoft: "#7a7fad",
  success: "#27a644",
  sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Inter, Roboto, sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace"
};

const WIDTH = 880;
const PAD = 32;

// ---------------------------------------------------------------- primitives

const escapeText = value =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Rough advance width. Used only for right-aligning legends and sizing the
 * label column, so an estimate is enough — but CJK glyphs are full-width and
 * ASCII is roughly half, and ignoring that difference overlaps text.
 */
function estWidth(value, size) {
  let units = 0;
  for (const char of String(value)) units += /[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af]/.test(char) ? 1 : 0.56;
  return units * size;
}

const text = (x, y, value, { size = 13, fill = T.ink, weight = 400, family = T.sans, anchor = null, tracking = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}"` +
  `${anchor ? ` text-anchor="${anchor}"` : ""}${tracking ? ` letter-spacing="${tracking}"` : ""}>${escapeText(value)}</text>`;

const rect = (x, y, width, height, { fill = T.bar, rx = 4, stroke = null } = {}) =>
  `<rect x="${round(x)}" y="${round(y)}" width="${round(Math.max(0, width))}" height="${round(height)}" rx="${rx}" fill="${fill}"` +
  `${stroke ? ` stroke="${stroke}" stroke-width="1"` : ""}/>`;

const line = (x1, y1, x2, y2, stroke = T.hairline) =>
  `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" stroke="${stroke}" stroke-width="1"/>`;

/** Two decimals is plenty and keeps the output byte-stable across runs. */
const round = value => Math.round(Number(value) * 100) / 100;

// Two lavender steps plus grey. DESIGN.md sanctions primary-hover (#828fff)
// as the lighter step of the same hue, which stays legible next to the accent
// at bar scale — brand-secure (#7a7fad) did not.
const SERIES_FILLS = [T.accent, "#828fff", T.bar];

/** Greedy wrap on spaces, falling back to hard slicing for unbroken CJK runs. */
function wrapText(value, size, maxWidth) {
  const words = String(value).split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && estWidth(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    // A single CJK "word" can already exceed the width; slice it.
    while (estWidth(current, size) > maxWidth) {
      let cut = current.length;
      while (cut > 1 && estWidth(current.slice(0, cut), size) > maxWidth) cut--;
      lines.push(current.slice(0, cut));
      current = current.slice(cut);
    }
  }
  if (current) lines.push(current);
  return lines;
}

const TITLE_SIZE = 22;
const TITLE_LEADING = 28;
const FOOTNOTE_LEADING = 17;
const SOURCE_SIZE = 11;
const SOURCE_LEADING = 15;

/**
 * Footer geometry. Every chart carries a provenance line — which fixture, which
 * command measured it, which committed file it was read from, when — because a
 * chart title alone cannot tell the commerce fixture's six capabilities from
 * the form wizard's five, and the two disagree about who wins.
 *
 * Returns the height the footer needs above its last baseline, so callers keep
 * computing their own canvas height.
 */
function footerLayout({ footnote, source }) {
  const footnoteLines = footnote ? wrapText(footnote, 12, WIDTH - PAD * 2) : [];
  const sourceLines = source ? wrapText(source, SOURCE_SIZE, WIDTH - PAD * 2) : [];
  const height =
    footnoteLines.length * FOOTNOTE_LEADING +
    (sourceLines.length ? (sourceLines.length - 1) * SOURCE_LEADING + FOOTNOTE_LEADING : 0);
  return { footnoteLines, sourceLines, height };
}

/**
 * Header geometry, computed before anything is drawn so a two-line title or a
 * legend row pushes the plot down instead of colliding with it. Korean and
 * English copy differ enough in width that fixed offsets clip one or the
 * other; both are laid out from measured text.
 */
function headerLayout({ title, legend }) {
  const titleLines = wrapText(title, TITLE_SIZE, WIDTH - PAD * 2);
  let bottom = 52 + titleLines.length * TITLE_LEADING;
  if (legend.length) bottom += 26;
  return { titleLines, bodyTop: bottom + 20 };
}

/**
 * Card chrome shared by every chart: canvas, surface-1 panel with a hairline
 * border, eyebrow, wrapped title, optional legend row, wrapped footnote, and
 * the provenance line.
 */
function frame({ height, title, eyebrow, legend = [], footer, layout, body }) {
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${escapeText(title)}">`,
    `<title>${escapeText(title)}</title>`,
    rect(0, 0, WIDTH, height, { fill: T.canvas, rx: 12 }),
    rect(0.5, 0.5, WIDTH - 1, height - 1, { fill: T.surface1, rx: 12, stroke: T.hairline }),
    text(PAD, 40, eyebrow, { size: 12, fill: T.inkSubtle, weight: 500, tracking: 0.4 })
  ];
  layout.titleLines.forEach((entry, index) =>
    parts.push(text(PAD, 72 + index * TITLE_LEADING, entry, { size: TITLE_SIZE, fill: T.ink, weight: 600 }))
  );

  // Legend on its own row under the title: a long title and a three-item
  // legend cannot share a line at this width in either language.
  if (legend.length) {
    const legendY = 52 + layout.titleLines.length * TITLE_LEADING + 14;
    let cursor = PAD;
    for (const item of legend) {
      parts.push(rect(cursor, legendY - 9, 10, 10, { fill: item.fill, rx: 2 }));
      cursor += 16;
      parts.push(text(cursor, legendY, item.label, { size: 13, fill: T.inkMuted }));
      cursor += estWidth(item.label, 13) + 20;
    }
  }

  parts.push(body);

  // Footer stacks upward from the bottom padding: provenance last (mono, so it
  // never reads as prose), footnote above it.
  let baseline = height - 20;
  footer.sourceLines.forEach((entry, index) =>
    parts.push(
      text(PAD, baseline - (footer.sourceLines.length - 1 - index) * SOURCE_LEADING, entry, {
        size: SOURCE_SIZE,
        family: T.mono,
        fill: T.inkTertiary
      })
    )
  );
  if (footer.sourceLines.length) baseline -= (footer.sourceLines.length - 1) * SOURCE_LEADING + FOOTNOTE_LEADING;
  footer.footnoteLines.forEach((entry, index) =>
    parts.push(
      text(PAD, baseline - (footer.footnoteLines.length - 1 - index) * FOOTNOTE_LEADING, entry, {
        size: 12,
        fill: T.inkTertiary
      })
    )
  );
  parts.push("</svg>");
  return parts.join("\n");
}

/**
 * Horizontal bars, one row per variant, one bar per series.
 *
 * The accent colour carries meaning, never decoration: in a single-series
 * chart exactly the leading bar gets it; in a grouped chart it separates
 * series (accent, soft lavender, grey).
 *
 * @param {{ label: string, values: number[] }[]} rows
 */
function barChart({
  rows,
  title,
  eyebrow,
  footnote,
  source,
  format,
  series = [],
  scale = "linear",
  tickFormat = null,
  lowerIsBetter = true,
  groups = null
}) {
  const seriesCount = Math.max(1, series.length);
  const barHeight = seriesCount > 1 ? 16 : 22;
  const seriesGap = 4;
  const rowGap = 18;
  const legend = series.map((label, index) => ({ label, fill: SERIES_FILLS[index % SERIES_FILLS.length] }));
  const layout = headerLayout({ title, legend });
  const footer = footerLayout({ footnote, source });
  // Log ticks live above the first row and need their own strip.
  const top = layout.bodyTop + (scale === "log" ? 22 : 0);
  // Gutters are measured, not guessed: a value label plus its optional note
  // must fit inside the card, and the longest variant name decides the label
  // column. Hardcoded widths clip Korean labels.
  const valueGutter =
    16 +
    Math.max(
      ...rows.flatMap(row =>
        row.values.map(value => estWidth(format(value), 13) + (row.note ? 8 + estWidth(row.note, 12) : 0))
      )
    );
  const labelWidth = 16 + Math.max(...rows.map(row => estWidth(row.label, 14)));
  const plotX = PAD + labelWidth;
  const plotWidth = WIDTH - plotX - PAD - valueGutter;
  const rowHeight = seriesCount * barHeight + (seriesCount - 1) * seriesGap + rowGap;
  const groupHeaderHeight = groups ? 30 : 0;
  const groupCount = groups ? new Set(rows.map(row => row.group)).size : 0;
  const height = top + rows.length * rowHeight + groupCount * groupHeaderHeight + 24 + footer.height + 16;

  const values = rows.flatMap(row => row.values);
  const max = Math.max(...values);
  const min = Math.min(...values.filter(value => value > 0));
  const logLo = Math.pow(10, Math.floor(Math.log10(min)) - 1);
  const logHi = Math.pow(10, Math.ceil(Math.log10(max)));
  const project = value =>
    scale === "log"
      ? (Math.log10(Math.max(value, logLo) / logLo) / Math.log10(logHi / logLo)) * plotWidth
      : (value / max) * plotWidth;

  // The accent marks the leader. In a grouped chart each group is a separate
  // fixture, so the leader is per group — a global winner would paint one bar
  // accent and imply the other groups were competing against it.
  const leaderOf = new Map();
  for (const row of rows) {
    const value = lowerIsBetter ? Math.min(...row.values) : Math.max(...row.values);
    const current = leaderOf.get(row.group);
    const better = lowerIsBetter ? value < (current ?? Infinity) : value > (current ?? -Infinity);
    if (better) leaderOf.set(row.group, value);
  }
  const parts = [];

  // Log scale needs visible ticks: without them a reader cannot tell that a
  // bar twice as long is ten times the value.
  if (scale === "log") {
    for (let tick = logLo; tick <= logHi; tick *= 10) {
      const x = plotX + project(tick);
      parts.push(line(x, top - 12, x, top + rows.length * rowHeight + groupCount * groupHeaderHeight - rowGap));
      if (tickFormat) parts.push(text(x, top - 18, tickFormat(tick), { size: 11, fill: T.inkTertiary, anchor: "middle" }));
    }
  }

  let y = top;
  let lastGroup = null;
  rows.forEach((row, index) => {
    if (groups && row.group !== lastGroup) {
      parts.push(text(PAD, y + 12, groups[row.group], { size: 12, fill: T.inkSubtle, weight: 500, tracking: 0.4 }));
      y += groupHeaderHeight;
      lastGroup = row.group;
    }
    const barsHeight = seriesCount * barHeight + (seriesCount - 1) * seriesGap;
    parts.push(text(PAD, y + barsHeight / 2 + 5, row.label, { size: 14, fill: T.inkMuted }));

    row.values.forEach((value, seriesIndex) => {
      const barY = y + seriesIndex * (barHeight + seriesGap);
      const length = project(value);
      const isBest = seriesCount === 1 && value === leaderOf.get(row.group);
      const fill = seriesCount > 1 ? SERIES_FILLS[seriesIndex % SERIES_FILLS.length] : isBest ? T.accent : T.bar;
      const label = format(value);
      parts.push(rect(plotX, barY, length, barHeight, { fill, rx: 4 }));
      parts.push(
        text(plotX + length + 8, barY + barHeight / 2 + 4.5, label, {
          size: 13,
          family: T.mono,
          fill: isBest || seriesCount > 1 ? T.ink : T.inkMuted
        })
      );
      // A note (what the browser actually picked as the LCP element, say)
      // rides after the value so the chart never asserts in its title
      // something the data does not support row by row.
      if (row.note && seriesIndex === 0) {
        parts.push(
          text(plotX + length + 16 + estWidth(label, 13), barY + barHeight / 2 + 4.5, row.note, {
            size: 12,
            fill: T.inkTertiary
          })
        );
      }
    });

    y += rowHeight;
    if (index < rows.length - 1) parts.push(line(PAD, y - rowGap / 2, WIDTH - PAD, y - rowGap / 2));
  });

  return frame({ height, title, eyebrow, legend, footer, layout, body: parts.join("\n") });
}

/**
 * Degradation resilience: one strip per condition, filled cells being
 * capabilities that survived. The published data carries counts, not
 * identities, so the cells are a count meter — the footnote says so.
 *
 * Cells per strip come from the data, not a constant: the commerce fixture
 * probes six capabilities and the form wizard five, and hardcoding six drew
 * the wizard's five-cell strips on a six-cell grid.
 */
function resilienceChart({ rows, title, eyebrow, footnote, source, conditionLabels, totalLabel }) {
  const labelWidth = 16 + Math.max(...rows.map(row => estWidth(row.label, 14)));
  const cell = 14;
  const cellGap = 3;
  const groupGap = 28;
  const layout = headerLayout({ title, legend: [] });
  const footer = footerLayout({ footnote, source });
  // Condition labels sit above the first row of cells.
  const top = layout.bodyTop + 22;
  const rowHeight = 34;
  const height = top + rows.length * rowHeight + 16 + footer.height + 16;
  const cellsPerStrip = Math.max(...rows.flatMap(row => row.conditions.map(condition => condition.total)));
  const stripWidth = cellsPerStrip * cell + (cellsPerStrip - 1) * cellGap;
  const parts = [];

  const conditionX = index => PAD + labelWidth + index * (stripWidth + groupGap);
  conditionLabels.forEach((label, index) =>
    parts.push(text(conditionX(index), top - 14, label, { size: 12, fill: T.inkSubtle, weight: 500 }))
  );

  const bestTotal = Math.max(...rows.map(row => row.total));
  rows.forEach((row, rowIndex) => {
    const y = top + rowIndex * rowHeight;
    parts.push(text(PAD, y + cell - 1, row.label, { size: 14, fill: T.inkMuted }));
    row.conditions.forEach((condition, index) => {
      for (let slot = 0; slot < condition.total; slot++) {
        parts.push(
          rect(conditionX(index) + slot * (cell + cellGap), y, cell, cell, {
            fill: slot < condition.survived ? T.success : T.hairline,
            rx: 2
          })
        );
      }
    });
    const total = `${row.total}/${row.max}`;
    parts.push(
      text(WIDTH - PAD - estWidth(total, 14), y + cell - 1, total, {
        size: 14,
        family: T.mono,
        fill: row.total === bestTotal ? T.accent : T.inkMuted
      })
    );
    if (rowIndex < rows.length - 1) parts.push(line(PAD, y + rowHeight - 10, WIDTH - PAD, y + rowHeight - 10));
  });

  parts.push(text(WIDTH - PAD - estWidth(totalLabel, 12), top - 14, totalLabel, { size: 12, fill: T.inkSubtle, weight: 500 }));
  return frame({ height, title, eyebrow, footer, layout, body: parts.join("\n") });
}

// ---------------------------------------------------------------------- data

function readJson(relativePath) {
  const absPath = path.join(repoRoot, relativePath);
  if (!existsSync(absPath)) throw new Error(`${relativePath} is missing — run the bench that publishes it first`);
  return JSON.parse(readFileSync(absPath, "utf8"));
}

const benchmark = readJson("landing/benchmark.json");
const commerce = readJson("landing/commerce.json");
const form = readJson("landing/form.json");
const lcp = readJson("landing/lcp.json");

const ms = value => `${Math.round(value).toLocaleString("en-US")} ms`;
const kb = value => `${value.toFixed(1)} KB`;
const sizeLabel = value => (value >= 1024 ? `${(value / 1024).toFixed(1)} MB` : `${Math.round(value)} KB`);

const lcpRow = (fixture, route, variant, weight = null) =>
  lcp.rows.find(
    row =>
      row.fixture === fixture &&
      row.route === route &&
      row.variant === variant &&
      (weight === null || row.imageWeight === weight)
  );

/** Was the heavy-photograph condition measured, or only the light default? */
const hasHeavy = lcp.rows.some(row => row.imageWeight === "heavy");

/** Commerce rows, ordered by the axis the fixture exists to measure. */
const commerceByActReady = [...commerce.rows].sort((left, right) => left.listingActReadyMs - right.listingActReadyMs);
const newsletterByCold = [...benchmark.rows].filter(row => row.ok).sort((left, right) => left.cold - right.cold);

/**
 * Provenance. Every chart says which fixture it measured, which command wrote
 * the numbers, which committed file they were read from, and when the browsers
 * actually ran — dates come from the bench's own clock, never from this
 * script's, so regenerating charts cannot age a measurement forward.
 */
const dayOf = value => String(value ?? "").slice(0, 10);

/** `2026-08-12`, or `2026-08-12~08-19` when variants were measured apart. */
function measuredRange(from, to, lang) {
  const first = dayOf(from);
  const last = dayOf(to);
  if (!first || first === last) return last || first || null;
  if (!last) return first;
  const tail = first.slice(0, 4) === last.slice(0, 4) ? last.slice(5) : last;
  return `${first}${lang === "ko" ? "~" : "–"}${tail}`;
}

/** One published dataset: the command that measured it, the file, the dates. */
function dataset(lang, { command, file, from, to, machine = null }) {
  const range = measuredRange(from, to, lang);
  return [`pnpm run ${command} → ${file}`, range && COPY[lang].source.measured(range), machine]
    .filter(Boolean)
    .join(" · ");
}

/**
 * When a card mixes two datasets, each one is bracketed: the machine spec is
 * itself dot-separated, so an unbracketed join reads as if the machine belonged
 * to both benches.
 */
function sourceLine(lang, what, datasets) {
  const rendered = datasets.map(entry => dataset(lang, entry));
  const body = rendered.length > 1 ? rendered.map(entry => `[${entry}]`).join(" + ") : rendered[0];
  return `${COPY[lang].source.lead}: ${what} · ${body}`;
}

/** Dataset descriptors, per chart, in the language-independent part. */
const DATA = lang => ({
  commerceBench: {
    command: "shop:bench",
    file: "landing/commerce.json",
    from: commerce.benchMeasuredFrom,
    to: commerce.benchMeasuredAt
  },
  // Route weight comes from the browser-measured assets pass, not the session
  // replay, and that pass has its own clock.
  commerceAssets: {
    command: "shop:assets",
    file: "landing/commerce.json",
    from: commerce.sources?.assets,
    to: commerce.sources?.assets
  },
  formBench: {
    command: "form:bench",
    file: "landing/form.json",
    from: form.benchMeasuredFrom,
    to: form.benchMeasuredAt
  },
  newsletter: {
    command: "build:stats",
    file: "landing/benchmark.json",
    from: benchmark.measuredAt,
    to: benchmark.measuredAt,
    machine: benchmark.machine?.[lang] ?? null
  },
  lcp: {
    command: "lcp:bench",
    file: "landing/lcp.json",
    from: lcp.rows.reduce((first, row) => (!first || row.measuredAt < first ? row.measuredAt : first), ""),
    to: lcp.measuredAt,
    machine: lcp.machine?.[lang] ?? null
  }
});

/** How the LCP element is described in a row note. */
const ELEMENT_KIND = { ko: { image: "이미지", text: "텍스트" }, en: { image: "image", text: "text" } };

const COPY = {
  ko: {
    source: {
      lead: "측정",
      measured: range => `${range} 측정`,
      fixtures: {
        commerce: "커머스 픽스처 5변형(apps/shop-*)",
        form: "폼 위저드 픽스처 5변형(apps/form-*)",
        newsletter: "뉴스레터 픽스처 10변형(apps/)",
        lcpEntry: "커머스·문서·폼 진입 라우트",
        lcpProduct: "커머스 상품 상세(apps/shop-*)"
      }
    },
    commerceSession: {
      eyebrow: "커머스 · 5세션 중앙값 · 4x CPU · SLOW 4G",
      title: "보이기까지 vs 조작 가능해지기까지",
      series: ["진입 contentReady", "리스팅 actReady"],
      footnote: "전 변형이 완성된 HTML을 내보내므로 '보이기까지'는 사실상 동률. 차이는 전부 '조작 가능해지기까지'에 몰린다."
    },
    lcpVsAct: {
      eyebrow: "커머스 상품 상세 · 이미지 무게 두 조건 · 4x CPU · SLOW 4G(서버 페이싱)",
      title: "LCP가 갈리는 이유는 렌더링이 아니라 대역폭 경쟁이다",
      series: ["LCP · 21 KB 타일", "LCP · 1.4 MB 사진", "리스팅 actReady"],
      footnote: ({ light, heavy, act }) =>
        `LCP 스프레드: 가벼운 타일 ${light}배` +
        `${heavy ? `, 1.4 MB 사진 ${heavy}배` : ""}. 사진 바이트는 다섯 변형이 동일하다 — 순서를 만드는 건 같은 파이프를 먼저 쓰는 스크립트 무게다. actReady 스프레드는 ${act}배.`
    },
    lcpByFixture: {
      eyebrow: "픽스처별 진입 라우트 LCP · 기본(가벼운 타일) 조건 · 4x CPU · SLOW 4G(서버 페이싱)",
      title: "브라우저가 무엇을 LCP로 골랐는가",
      groups: { shop: "커머스 — 홈", docs: "문서 — 딥링크", form: "폼 위저드 — 1단계" },
      footnote: "요소 이름은 브라우저가 실제로 고른 것이다. 커머스는 상품 사진, 문서·폼은 텍스트."
    },
    routeJs: {
      eyebrow: "커머스 · 브라우저가 실제로 내려받은 바이트 (GZIP)",
      title: "라우트별 초기 JavaScript",
      series: ["홈", "검색", "결제"],
      footnote: "import 그래프 정적 분석이 아니라 실측. Astro는 아일랜드 런타임을 인라인 부트스트랩의 동적 import로 가져와 정적 크롤러가 60 KB를 1.8 KB로 잘못 센다."
    },
    buildTime: {
      eyebrow: "뉴스레터 · 워밍업 1회 제외 3회 중앙값",
      title: "같은 콘텐츠, 10가지 빌드",
      series: ["cold (캐시 미스)", "warm (캐시 히트)"],
      footnote: "cold는 출력과 프레임워크 빌드 캐시를 모두 지운 상태, warm은 출력만 지운 상태. 둘의 차이가 그 도구의 캐시가 벌어주는 시간이다."
    },
    outputJs: {
      eyebrow: "뉴스레터 · 출력 JS 총량 · 로그 스케일",
      title: "정적 사이트가 내보내는 JavaScript",
      footnote: "가로축은 로그 스케일 — 눈금 한 칸이 10배다. 15 KB와 4.6 MB는 300배 차이다."
    },
    // Both fixtures are probed under the same three conditions, so the strip
    // headers are shared; what differs is which capabilities are counted.
    degradation: {
      conditions: ["JS 전면 차단", "스크립트 2s 지연", "스크립트 1개 유실"],
      total: "합계"
    },
    resilienceCommerce: {
      eyebrow: "커머스 · 여섯 기능 × 세 조건",
      title: "커머스 열화 내성 — 스크립트가 죽으면 무엇이 남는가",
      footnote: "칸은 생존 기능 개수(정보 읽기·카테고리 이동·상세 진입·필터·옵션 선택·담기). 어느 기능인지는 bench/shop-<변형>.json에 있다."
    },
    resilienceForm: {
      eyebrow: "폼 위저드 · 다섯 기능 × 세 조건",
      title: "폼 위저드 열화 내성 — 스크립트가 죽으면 무엇이 남는가",
      footnote:
        "칸은 생존 기능 개수(스텝 이동·상태 운반·조건부 토글·요약 렌더·레퍼런스 렌더). 어느 기능인지는 bench/form-<변형>.json에 있다. " +
        "'JS 전면 차단'은 커머스와 동일하게 *.js 요청 차단이라, 페이지 로직을 외부 번들이 아니라 인라인 스크립트로 싣는 Astro에는 닿지 않는다 — 전 조건 생존은 그 아키텍처 결과다."
    }
  },
  en: {
    source: {
      lead: "Measured",
      measured: range => `measured ${range}`,
      fixtures: {
        commerce: "commerce fixture, 5 variants (apps/shop-*)",
        form: "form wizard fixture, 5 variants (apps/form-*)",
        newsletter: "newsletter fixture, 10 variants (apps/)",
        lcpEntry: "commerce, docs and form entry routes",
        lcpProduct: "commerce product detail (apps/shop-*)"
      }
    },
    commerceSession: {
      eyebrow: "COMMERCE · MEDIAN OF 5 SESSIONS · 4X CPU · SLOW 4G",
      title: "Time to visible vs time to usable",
      series: ["Entry contentReady", "Listing actReady"],
      footnote: "Every variant ships complete HTML, so \"visible\" is effectively a tie. The whole spread sits in \"usable\"."
    },
    lcpVsAct: {
      eyebrow: "COMMERCE PRODUCT DETAIL · TWO IMAGE WEIGHTS · 4X CPU · SLOW 4G (SERVER-PACED)",
      title: "What separates LCP here is bandwidth contention, not rendering",
      series: ["LCP · 21 KB tile", "LCP · 1.4 MB photo", "Listing actReady"],
      footnote: ({ light, heavy, act }) =>
        `LCP spread: ${light}x on light tiles` +
        `${heavy ? `, ${heavy}x on the 1.4 MB photo` : ""}. The photo is byte-identical across all five — the ordering comes from script weight taking the same pipe first. actReady spread is ${act}x.`
    },
    lcpByFixture: {
      eyebrow: "LCP AT EACH FIXTURE'S ENTRY ROUTE · DEFAULT (LIGHT TILE) CONDITION · 4X CPU · SLOW 4G (SERVER-PACED)",
      title: "What the browser actually picked as LCP",
      groups: { shop: "Commerce — home", docs: "Docs — deep link", form: "Form wizard — step 1" },
      footnote: "Element names are what the browser really chose: a product photo in commerce, text in docs and the form wizard."
    },
    routeJs: {
      eyebrow: "COMMERCE · BYTES THE BROWSER ACTUALLY DOWNLOADED (GZIP)",
      title: "Initial JavaScript per route",
      series: ["Home", "Search", "Checkout"],
      footnote: "Measured, not statically analysed. Astro pulls its island runtime through a dynamic import in an inline bootstrap, so a static crawler miscounts 60 KB as 1.8 KB."
    },
    buildTime: {
      eyebrow: "NEWSLETTER · MEDIAN OF 3 RUNS AFTER ONE DISCARDED WARM-UP",
      title: "Same content, ten builds",
      series: ["Cold (cache miss)", "Warm (cache hit)"],
      footnote: "Cold clears the output and every framework build cache; warm clears only the output. The gap is what that tool's cache buys."
    },
    outputJs: {
      eyebrow: "NEWSLETTER · TOTAL JS EMITTED · LOG SCALE",
      title: "JavaScript a static site ships",
      footnote: "The x axis is logarithmic — one gridline is 10x. 15 KB to 4.6 MB is a 300x spread."
    },
    // Both fixtures are probed under the same three conditions, so the strip
    // headers are shared; what differs is which capabilities are counted.
    degradation: {
      conditions: ["JS blocked", "Scripts 2s late", "1 script lost"],
      total: "Total"
    },
    resilienceCommerce: {
      eyebrow: "COMMERCE · SIX CAPABILITIES × THREE CONDITIONS",
      title: "Commerce degradation resilience — what survives when scripts die",
      footnote: "Cells count surviving capabilities (read info, browse category, open detail, filter, select option, add to cart). Which ones is in bench/shop-<variant>.json."
    },
    resilienceForm: {
      eyebrow: "FORM WIZARD · FIVE CAPABILITIES × THREE CONDITIONS",
      title: "Form wizard degradation resilience — what survives when scripts die",
      footnote:
        "Cells count surviving capabilities (advance step, carry state, conditional toggle, render summary, render reference). Which ones is in bench/form-<variant>.json. " +
        "\"JS blocked\" blocks *.js requests, exactly as in commerce, so it never reaches Astro, which ships its page logic in an inline script instead of an external bundle — surviving every condition is that architecture, not a gap in the harness."
    }
  }
};

function chartsFor(lang) {
  const copy = COPY[lang];
  const data = DATA(lang);
  const where = copy.source.fixtures;
  // Both image-weight conditions are measured on the product detail route:
  // same markup, same layout, only the photograph's bytes differ, so the two
  // series are a controlled pair. (The heavy condition is not measured on the
  // listing grid — a store would never ship twelve full-size photographs into
  // a grid, and it costs a minute per load.)
  const productLcp = (variant, weight) => lcpRow("shop", "product", variant, weight);

  /** Resilience rows: counts per condition, ordered best total first. */
  const resilienceRows = report =>
    [...report.rows]
      .sort((left, right) => right.resilienceTotal - left.resilienceTotal)
      .map(row => ({
        label: row.label,
        conditions: ["js-blocked", "js-slow", "chunk-404"].map(key => ({
          survived: row.resilience[key],
          total: row.resilienceMax / 3
        })),
        total: row.resilienceTotal,
        max: row.resilienceMax
      }));

  return {
    "commerce-session.svg": barChart({
      rows: commerceByActReady.map(row => ({
        label: row.label,
        values: [row.entryContentReadyMs, row.listingActReadyMs]
      })),
      ...copy.commerceSession,
      source: sourceLine(lang, where.commerce, [data.commerceBench]),
      format: ms
    }),

    "lcp-vs-actready.svg": barChart({
      rows: commerceByActReady
        .filter(row => productLcp(row.key, "light"))
        .map(row => ({
          label: row.label,
          values: hasHeavy
            ? [productLcp(row.key, "light").lcpMs, productLcp(row.key, "heavy").lcpMs, row.listingActReadyMs]
            : [productLcp(row.key, "light").lcpMs, row.listingActReadyMs]
        })),
      eyebrow: copy.lcpVsAct.eyebrow,
      title: copy.lcpVsAct.title,
      series: hasHeavy ? copy.lcpVsAct.series : [copy.lcpVsAct.series[0], copy.lcpVsAct.series[2]],
      format: ms,
      footnote: copy.lcpVsAct.footnote({
        light: spread("lcp", "light"),
        heavy: hasHeavy ? spread("lcp", "heavy") : null,
        act: spread("act")
      }),
      // Two datasets on one canvas: the LCP series and the actReady series come
      // from different benches, and the label says which is which.
      source: sourceLine(lang, where.lcpProduct, [data.lcp, data.commerceBench])
    }),

    "lcp-by-fixture.svg": barChart({
      rows: entryLcpRows().map(row => ({
        label: row.label,
        values: [row.lcpMs],
        group: row.fixture,
        // What the browser picked, per row — the chart never claims an
        // element its own data does not show.
        note: `${ELEMENT_KIND[lang][row.lcpKind]} ${row.lcpElement}`
      })),
      ...copy.lcpByFixture,
      source: sourceLine(lang, where.lcpEntry, [data.lcp]),
      series: [],
      format: ms
    }),

    "route-js.svg": barChart({
      rows: [...commerce.rows]
        .sort((left, right) => left.homeJsGzip - right.homeJsGzip)
        .map(row => ({
          label: row.label,
          values: [row.homeJsGzip / 1024, row.searchJsGzip / 1024, row.checkoutJsGzip / 1024]
        })),
      ...copy.routeJs,
      source: sourceLine(lang, where.commerce, [data.commerceAssets]),
      format: kb
    }),

    "build-time.svg": barChart({
      rows: newsletterByCold.map(row => ({ label: row.label, values: [row.cold, row.warm] })),
      ...copy.buildTime,
      source: sourceLine(lang, where.newsletter, [data.newsletter]),
      format: ms
    }),

    "output-js.svg": barChart({
      rows: [...benchmark.rows]
        .filter(row => row.ok)
        .sort((left, right) => left.jsBytes - right.jsBytes)
        .map(row => ({ label: row.label, values: [row.jsBytes / 1024] })),
      ...copy.outputJs,
      source: sourceLine(lang, where.newsletter, [data.newsletter]),
      format: sizeLabel,
      scale: "log",
      // Ticks are exact powers of ten in KB; converting them to MB would print
      // "9.8 MB" for the 10,000 KB gridline and read like a rounding bug.
      tickFormat: tick => `${tick.toLocaleString("en-US")} KB`
    }),

    // One chart per fixture. The two disagree about who wins — commerce counts
    // six capabilities, the wizard five — so neither may stand in for "the"
    // resilience number.
    "resilience-commerce.svg": resilienceChart({
      rows: resilienceRows(commerce),
      ...copy.resilienceCommerce,
      conditionLabels: copy.degradation.conditions,
      totalLabel: copy.degradation.total,
      source: sourceLine(lang, where.commerce, [data.commerceBench])
    }),

    "resilience-form.svg": resilienceChart({
      rows: resilienceRows(form),
      ...copy.resilienceForm,
      conditionLabels: copy.degradation.conditions,
      totalLabel: copy.degradation.total,
      source: sourceLine(lang, where.form, [data.formBench])
    })
  };
}

/**
 * Entry-route LCP for all three fixtures, fixture-grouped, LCP ascending.
 * Commerce is shown in the default light condition so all three fixtures are
 * on one footing; the heavy condition gets its own series in lcp-vs-actready.
 */
function entryLcpRows() {
  const entries = { shop: "home", docs: "doc", form: "step1" };
  return Object.entries(entries).flatMap(([fixture, route]) =>
    lcp.rows
      .filter(row => row.fixture === fixture && row.route === route && row.imageWeight !== "heavy")
      .sort((left, right) => left.lcpMs - right.lcpMs)
  );
}

/** Max/min ratio of commerce product LCP in one condition, or of listing actReady. */
function spread(kind, weight = null) {
  const values =
    kind === "lcp"
      ? lcp.rows
          .filter(row => row.fixture === "shop" && row.route === "product" && row.imageWeight === weight)
          .map(row => row.lcpMs)
      : commerce.rows.map(row => row.listingActReadyMs);
  return (Math.max(...values) / Math.min(...values)).toFixed(1);
}

mkdirSync(outDir, { recursive: true });
for (const lang of ["ko", "en"]) {
  const dir = path.join(outDir, lang);
  mkdirSync(dir, { recursive: true });
  for (const [name, svg] of Object.entries(chartsFor(lang))) {
    writeFileSync(path.join(dir, name), `${svg}\n`);
    console.log(`charts: assets/charts/${lang}/${name} (${svg.length} B)`);
  }
}
