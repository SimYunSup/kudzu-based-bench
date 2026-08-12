import { createFileRoute } from "@tanstack/react-router";
import { computeRefCode, type Step2Fields } from "../lib/wizard";

export const Route = createFileRoute("/done")({
  head: () => ({ meta: [{ title: "신청 완료 — 워크숍 신청" }] }),
  validateSearch: (search: Record<string, unknown>): Step2Fields => ({
    name: typeof search.name === "string" ? search.name : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
    type: search.type === "team" ? "team" : "individual",
    team: typeof search.team === "string" ? search.team : undefined,
    session: typeof search.session === "string" ? search.session : undefined,
    diet: Array.isArray(search.diet)
      ? search.diet.filter((value): value is string => typeof value === "string")
      : typeof search.diet === "string"
        ? [search.diet]
        : [],
    coupon: typeof search.coupon === "string" ? search.coupon : undefined,
  }),
  component: DonePage,
});

function DonePage() {
  const search = Route.useSearch();

  return (
    <main className="wizard">
      <h1 className="done-title">신청 완료</h1>
      <p className="done-ref">{computeRefCode(search)}</p>
      <p className="done-summary">
        확인 메일을 <span className="done-email">{search.email ?? ""}</span>로 보냈습니다.
      </p>
      <a className="done-home" href="../">
        처음으로
      </a>
    </main>
  );
}
