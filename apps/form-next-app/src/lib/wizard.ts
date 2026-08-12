// Shared static data + pure helpers for the workshop application wizard.
// Kept framework-agnostic (no React imports) so both server and client
// components can import it without pulling extra weight into either bundle.

export interface SessionOption {
  value: string;
  title: string;
}

export const SESSIONS: SessionOption[] = [
  { value: "s-01", title: "시그널 아키텍처" },
  { value: "s-02", title: "빌드 파이프라인" },
  { value: "s-03", title: "하이드레이션 전략" },
  { value: "s-04", title: "라우팅 계약" },
  { value: "s-05", title: "캐시 무효화" },
  { value: "s-06", title: "배포 자동화" }
];

export interface DietOption {
  value: string;
  label: string;
}

export const DIET_OPTIONS: DietOption[] = [
  { value: "vegan", label: "비건" },
  { value: "vegetarian", label: "채식" },
  { value: "glutenfree", label: "글루텐프리" }
];

/** "s-01 — 시그널 아키텍처" style label; empty string when the value is unknown. */
export function sessionLabel(value?: string): string {
  const found = SESSIONS.find(session => session.value === value);
  return found ? `${found.value} — ${found.title}` : "";
}

/** Korean labels for the given diet values, joined with ", "; empty string when none match. */
export function dietLabels(values: string[]): string {
  const labels = values
    .map(value => DIET_OPTIONS.find(option => option.value === value)?.label)
    .filter((label): label is string => Boolean(label));
  return labels.join(", ");
}

/** Minimal shape refCode needs — matches both URLSearchParams and Next's ReadonlyURLSearchParams. */
interface ParamsLike {
  getAll(key: string): string[];
}

/**
 * Deterministic FNV-1a based reference code. Every form-* variant must
 * produce byte-identical output for the same query string — this is the
 * cross-variant equivalence check the benchmark relies on.
 */
export function refCode(params: ParamsLike): string {
  const keys = ["name", "email", "type", "team", "session", "diet", "coupon"];
  const canonical = keys.map(key => `${key}=${params.getAll(key).join(",")}`).join("|");
  let h = 2166136261;
  for (let i = 0; i < canonical.length; i += 1) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return "REF-" + (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
}
