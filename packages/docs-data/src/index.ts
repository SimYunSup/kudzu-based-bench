/**
 * Deterministic documentation corpus generator.
 *
 * Same contract as @otw/commerce-data: every variant imports this and gets
 * byte-identical content — seeded PRNG, fixed word lists, no clock, no
 * network, no filesystem. The only thing a cross-framework comparison may
 * vary is the framework.
 *
 * The corpus is a fictional framework manual ("Vine") so the text reads like
 * real documentation and gives the client-side search index realistic Korean
 * token distribution. TERMS below are the searchable vocabulary; each term is
 * guaranteed to appear in a deterministic subset of pages, so benchmarks can
 * assert result counts, not just "something matched".
 */
import type { DocHeading, DocPage, DocsCorpus, DocSection } from "./types.js";

export * from "./types.js";

export const DEFAULT_DOCS_SIZE = 120;

export const SECTIONS: ReadonlyArray<DocSection> = [
  { handle: "start", title: "시작하기", description: "설치부터 첫 페이지까지." },
  { handle: "routing", title: "라우팅", description: "파일 기반 라우트와 내비게이션." },
  { handle: "data", title: "데이터", description: "로더, 캐시, 무효화." },
  { handle: "rendering", title: "렌더링", description: "정적 출력과 하이드레이션." },
  { handle: "deploy", title: "배포", description: "정적 호스트에 올리기." },
  { handle: "reference", title: "레퍼런스", description: "설정과 API 전체 목록." }
];

/**
 * Searchable vocabulary. The benchmark types these into each variant's search
 * box; keep them distinctive enough that a match is unambiguous.
 */
export const TERMS = [
  "시그널",
  "하이드레이션",
  "프리렌더",
  "라우트",
  "로더",
  "캐시",
  "미들웨어",
  "어댑터",
  "번들",
  "매니페스트"
] as const;

const TOPICS = ["설정", "규칙", "제약", "패턴", "마이그레이션", "디버깅", "최적화", "트러블슈팅"];
const VERBS = ["선언합니다", "등록합니다", "무효화합니다", "직렬화합니다", "병합합니다", "검증합니다"];
const OBJECTS = ["라우트 트리", "빌드 그래프", "출력 디렉터리", "런타임 경계", "환경 변수", "정적 자산"];
const CLAUSES = [
  "빌드 타임에 결정되며 런타임에는 바뀌지 않습니다",
  "개발 서버에서는 요청마다 다시 계산됩니다",
  "프로덕션 빌드에서만 적용됩니다",
  "기본값을 그대로 두는 쪽을 권장합니다",
  "잘못 지정하면 빌드가 즉시 실패합니다"
];

/** mulberry32 — 32-bit, no dependencies, identical output on every runtime. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(next: () => number, list: readonly T[]): T => list[Math.floor(next() * list.length)]!;

function sentence(next: () => number, term: string): string {
  return `${term}은(는) ${pick(next, OBJECTS)}를 ${pick(next, VERBS).replace("합니다", "하는")} 단위이며, ${pick(next, CLAUSES)}.`;
}

function paragraph(next: () => number, term: string): string {
  const lines = [sentence(next, term)];
  const extra = 2 + Math.floor(next() * 3);
  for (let i = 0; i < extra; i += 1) {
    lines.push(`${pick(next, OBJECTS)}는 ${pick(next, TOPICS)} 관점에서 ${pick(next, VERBS).slice(0, -3)}해야 하고, ${pick(next, CLAUSES)}.`);
  }
  return lines.join(" ");
}

function pageFor(section: DocSection, indexInSection: number, order: number): DocPage {
  const slug = `${section.handle}-${String(indexInSection).padStart(2, "0")}`;
  // Seed from the slug so a page's content is independent of corpus size:
  // page routing-03 is byte-identical whether the corpus has 60 or 600 pages.
  let hash = 2166136261;
  for (const ch of slug) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  const next = rng(hash >>> 0);

  // Every page owns one primary term (deterministic round-robin) and mentions
  // one secondary term, so search result counts are predictable per term.
  const primary = TERMS[order % TERMS.length]!;
  const secondary = TERMS[(order * 3 + 1) % TERMS.length]!;
  const topic = pick(next, TOPICS);
  const title = `${section.title} ${topic} ${String(indexInSection).padStart(2, "0")} — ${primary}`;

  const headingCount = 2 + Math.floor(next() * 3);
  const headings: DocHeading[] = [];
  const blocks: string[] = [paragraph(next, primary)];
  for (let h = 0; h < headingCount; h += 1) {
    const term = h === 0 ? secondary : pick(next, TERMS);
    const heading: DocHeading = { id: `${slug}-h${h}`, text: `${term} ${pick(next, TOPICS)}` };
    headings.push(heading);
    blocks.push(`## ${heading.text}`);
    blocks.push(paragraph(next, term));
    if (next() < 0.4) {
      blocks.push(`\`\`\`ts\nexport default defineConfig({\n  ${section.handle}: { ${term.length % 2 === 0 ? "strict" : "trace"}: true }\n});\n\`\`\``);
    }
  }

  return {
    slug,
    section: section.handle,
    title,
    description: `${section.title}의 ${topic}: ${primary} 중심으로 정리.`,
    headings,
    body: blocks.join("\n\n"),
    order
  };
}

/**
 * Build the corpus. `count` is total pages, distributed evenly across the six
 * sections (remainder goes to the earlier sections). Same count → same bytes.
 */
export function getDocs(count: number = DEFAULT_DOCS_SIZE): DocsCorpus {
  const total = Number.isFinite(count) && count > 0 ? Math.floor(count) : DEFAULT_DOCS_SIZE;
  const base = Math.floor(total / SECTIONS.length);
  const remainder = total % SECTIONS.length;
  const pages: DocPage[] = [];
  let order = 0;
  SECTIONS.forEach((section, sectionIndex) => {
    const pageCount = base + (sectionIndex < remainder ? 1 : 0);
    for (let i = 0; i < pageCount; i += 1) {
      pages.push(pageFor(section, i, order));
      order += 1;
    }
  });
  return { sections: [...SECTIONS], pages };
}

/** Resolve the corpus size the way every variant should: OTW_DOCS_SIZE env. */
export function resolveDocsSize(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_DOCS_SIZE;
}
