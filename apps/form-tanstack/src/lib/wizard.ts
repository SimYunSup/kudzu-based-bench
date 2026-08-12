// Shared wizard vocabulary and the ref-code algorithm, ported verbatim from
// the cross-variant contract so every framework produces byte-identical
// /done/ output for the same query string.

export type ParticipantType = "individual" | "team";

/** Fields carried by the /session/ step (mirrors step1's own inputs). */
export interface Step1Fields {
  name?: string;
  email?: string;
  type?: ParticipantType;
  team?: string;
}

/** Fields carried by /review/ and /done/ (step1 + step2's own inputs). */
export interface Step2Fields extends Step1Fields {
  session?: string;
  diet: string[];
  coupon?: string;
}

export const SESSIONS = [
  { value: "s-01", title: "시그널 아키텍처" },
  { value: "s-02", title: "빌드 파이프라인" },
  { value: "s-03", title: "하이드레이션 전략" },
  { value: "s-04", title: "라우팅 계약" },
  { value: "s-05", title: "캐시 무효화" },
  { value: "s-06", title: "배포 자동화" },
] as const;

export function sessionLabel(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const found = SESSIONS.find((session) => session.value === value);
  return found ? `${found.value} — ${found.title}` : undefined;
}

export const DIET_OPTIONS = [
  { value: "vegan", label: "비건" },
  { value: "vegetarian", label: "채식" },
  { value: "glutenfree", label: "글루텐프리" },
] as const;

export function dietLabel(value: string): string {
  return DIET_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function typeLabel(type: ParticipantType | undefined): string {
  return type === "team" ? "팀" : "개인";
}

/** Read a non-empty string field out of a submitted <form>'s FormData. */
export function formString(data: FormData, key: string): string | undefined {
  const value = data.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Read all values of a repeatable field (e.g. `diet`) out of FormData. */
export function formStringArray(data: FormData, key: string): string[] {
  return data.getAll(key).filter((value): value is string => typeof value === "string" && value.length > 0);
}

const REF_KEYS = ["name", "email", "type", "team", "session", "diet", "coupon"] as const;

/**
 * Byte-identical across every variant: canonicalizes the carried fields the
 * same way `new URLSearchParams(search).getAll(key)` would, then hashes with
 * FNV-1a. Kept independent of the router's search codec on purpose so a
 * parsing quirk here can never desync the ref code from the other variants.
 */
export function computeRefCode(search: Step2Fields): string {
  const getAll = (key: (typeof REF_KEYS)[number]): string[] => {
    if (key === "diet") return search.diet;
    const value = (search as Record<string, string | undefined>)[key];
    return value ? [value] : [];
  };

  const canonical = REF_KEYS.map((key) => `${key}=${getAll(key).join(",")}`).join("|");
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `REF-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}
