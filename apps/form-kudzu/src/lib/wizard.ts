// Static wizard data plus pure/imperative helpers shared across the four
// step pages. A relative module: Kudzu rejects package imports outside a
// JSX event handler (see apps/shop-kudzu/scripts/gen-catalog.mjs), so
// build-time constants used at module scope, and the DOM helpers the effect
// modules call, live here instead of a package.

export interface SessionOption {
  value: string;
  label: string;
}

export const SESSIONS: SessionOption[] = [
  { value: "s-01", label: "s-01 — 시그널 아키텍처" },
  { value: "s-02", label: "s-02 — 빌드 파이프라인" },
  { value: "s-03", label: "s-03 — 하이드레이션 전략" },
  { value: "s-04", label: "s-04 — 라우팅 계약" },
  { value: "s-05", label: "s-05 — 캐시 무효화" },
  { value: "s-06", label: "s-06 — 배포 자동화" }
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

const REF_KEYS = ["name", "email", "type", "team", "session", "diet", "coupon"];

/**
 * Deterministic reference code for a completed submission (FNV-1a over the
 * canonical query shape). Every variant must reproduce this byte-for-byte —
 * it is the cross-framework equivalence check for the wizard fixture.
 */
export function refCode(params: URLSearchParams): string {
  const canonical = REF_KEYS.map(key => `${key}=${params.getAll(key).join(",")}`).join("|");
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return "REF-" + (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function sessionLabel(value: string): string {
  for (const option of SESSIONS) {
    if (option.value === value) return option.label;
  }
  return value;
}

export function dietLabel(value: string): string {
  for (const option of DIET_OPTIONS) {
    if (option.value === value) return option.label;
  }
  return value;
}

/**
 * Fills a carried hidden input from the incoming query string, disabling it
 * when the key is absent so a blank value never pollutes the next step's
 * GET query.
 */
export function applyHiddenField(id: string, params: URLSearchParams, key: string): void {
  const input = document.getElementById(id);
  if (!(input instanceof HTMLInputElement)) return;
  if (params.has(key)) {
    input.disabled = false;
    input.value = params.get(key) ?? "";
  } else {
    input.disabled = true;
    input.value = "";
  }
}

/**
 * `diet` is multi-valued, so it cannot reuse a single carried input: this
 * (re)builds one hidden `diet` input per value inside the given container.
 */
export function applyDietHiddenFields(containerId: string, params: URLSearchParams): void {
  const container = document.getElementById(containerId);
  if (!(container instanceof HTMLElement)) return;
  for (const node of Array.from(container.querySelectorAll('input[name="diet"]'))) {
    node.remove();
  }
  for (const value of params.getAll("diet")) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "diet";
    input.value = value;
    container.appendChild(input);
  }
}

export function setText(selector: string, text: string): void {
  const el = document.querySelector(selector);
  if (el instanceof HTMLElement) el.textContent = text;
}
