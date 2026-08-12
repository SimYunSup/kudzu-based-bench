import { useEffect, useState } from "react";

// Shared wizard vocabulary. Values/labels must render identically across
// every fixture variant — the bench selects on these strings.
export const SESSIONS = [
  { value: "s-01", label: "s-01 — 시그널 아키텍처" },
  { value: "s-02", label: "s-02 — 빌드 파이프라인" },
  { value: "s-03", label: "s-03 — 하이드레이션 전략" },
  { value: "s-04", label: "s-04 — 라우팅 계약" },
  { value: "s-05", label: "s-05 — 캐시 무효화" },
  { value: "s-06", label: "s-06 — 배포 자동화" }
] as const;

export const DIET_OPTIONS = [
  { value: "vegan", label: "비건" },
  { value: "vegetarian", label: "채식" },
  { value: "glutenfree", label: "글루텐프리" }
] as const;

export const TYPE_LABELS: Record<string, string> = {
  individual: "개인",
  team: "팀"
};

const REF_KEYS = ["name", "email", "type", "team", "session", "diet", "coupon"] as const;

/**
 * Reference code for the confirmation page. Every variant must reproduce
 * this byte-for-byte from the same query params — it's the cross-variant
 * equivalence check for the whole wizard chain.
 */
export function refCode(params: URLSearchParams): string {
  const canonical = REF_KEYS.map(key => `${key}=${params.getAll(key).join(",")}`).join("|");
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `REF-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

/**
 * Reads the current page's own query string once mounted. Prerendered
 * routes carry no server-side query context (each is a static path with no
 * params baked in), so the wizard's forward chain of values is threaded
 * through client JS after hydration — same fallback every other variant
 * relies on for JS-off vs. JS-on parity.
 */
export function useIncomingParams(): URLSearchParams {
  const [params, setParams] = useState<URLSearchParams>(() => new URLSearchParams());
  useEffect(() => {
    setParams(new URLSearchParams(window.location.search));
  }, []);
  return params;
}
