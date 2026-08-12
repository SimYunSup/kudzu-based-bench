import type { FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  dietLabel,
  formString,
  formStringArray,
  sessionLabel,
  typeLabel,
  type Step2Fields,
} from "../lib/wizard";

export const Route = createFileRoute("/review")({
  head: () => ({ meta: [{ title: "확인 — 워크숍 신청" }] }),
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
  component: Step3Page,
});

function Step3Page() {
  const carried = Route.useSearch();
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    event.preventDefault();
    navigate({
      to: "/done",
      search: {
        name: formString(data, "name"),
        email: formString(data, "email"),
        type: data.get("type") === "team" ? "team" : "individual",
        team: formString(data, "team"),
        session: formString(data, "session"),
        diet: formStringArray(data, "diet"),
        coupon: formString(data, "coupon"),
      },
    });
  }

  const dietDisplay = carried.diet.length > 0 ? carried.diet.map(dietLabel).join(", ") : "—";

  return (
    <main className="wizard">
      <ol className="wizard-progress">
        <li>참가자 정보</li>
        <li>세션 선택</li>
        <li aria-current="step">확인</li>
      </ol>
      <form className="wizard-step" data-step="3" method="get" action="../done/" onSubmit={handleSubmit}>
        <h1>확인</h1>
        <dl className="summary">
          <dt>이름</dt>
          <dd className="summary-name">{carried.name ?? "—"}</dd>
          <dt>이메일</dt>
          <dd className="summary-email">{carried.email ?? "—"}</dd>
          <dt>참가 유형</dt>
          <dd className="summary-type">{typeLabel(carried.type)}</dd>
          <dt>팀 이름</dt>
          <dd className="summary-team">{carried.team ?? "—"}</dd>
          <dt>세션</dt>
          <dd className="summary-session">{sessionLabel(carried.session) ?? "—"}</dd>
          <dt>식이 제한</dt>
          <dd className="summary-diet">{dietDisplay}</dd>
          <dt>쿠폰</dt>
          <dd className="summary-coupon">{carried.coupon ?? "—"}</dd>
        </dl>
        <p className="field confirm-row">
          <label>
            <input id="confirm" name="confirm" type="checkbox" required /> 위 내용이 맞습니다
          </label>
        </p>
        <div className="carried" hidden>
          <input type="hidden" name="name" value={carried.name ?? ""} disabled={!carried.name} />
          <input type="hidden" name="email" value={carried.email ?? ""} disabled={!carried.email} />
          <input type="hidden" name="type" value={carried.type ?? "individual"} />
          <input type="hidden" name="team" value={carried.team ?? ""} disabled={!carried.team} />
          <input type="hidden" name="session" value={carried.session ?? ""} disabled={!carried.session} />
          {carried.diet.map((value) => (
            <input key={value} type="hidden" name="diet" value={value} />
          ))}
          <input type="hidden" name="coupon" value={carried.coupon ?? ""} disabled={!carried.coupon} />
        </div>
        <button className="wizard-next" type="submit">
          신청하기
        </button>
        <a className="wizard-back" href="../session/">
          이전
        </a>
      </form>
    </main>
  );
}
