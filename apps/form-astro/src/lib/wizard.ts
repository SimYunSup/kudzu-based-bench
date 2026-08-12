// Shared reference data for the workshop signup wizard. Both the step-2
// select markup (rendered at build time) and the step-3 client script
// (via `define:vars`) read from these lists so labels never drift apart.
export interface WizardSession {
  id: string;
  title: string;
}

export interface WizardDietOption {
  id: string;
  label: string;
}

export const SESSIONS: WizardSession[] = [
  { id: "s-01", title: "시그널 아키텍처" },
  { id: "s-02", title: "빌드 파이프라인" },
  { id: "s-03", title: "하이드레이션 전략" },
  { id: "s-04", title: "라우팅 계약" },
  { id: "s-05", title: "캐시 무효화" },
  { id: "s-06", title: "배포 자동화" },
];

export const DIET_OPTIONS: WizardDietOption[] = [
  { id: "vegan", label: "비건" },
  { id: "vegetarian", label: "채식" },
  { id: "glutenfree", label: "글루텐프리" },
];
