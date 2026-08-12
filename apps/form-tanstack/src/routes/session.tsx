import type { FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DIET_OPTIONS, SESSIONS, formString, formStringArray, type Step1Fields } from "../lib/wizard";

export const Route = createFileRoute("/session")({
  head: () => ({ meta: [{ title: "세션 선택 — 워크숍 신청" }] }),
  validateSearch: (search: Record<string, unknown>): Step1Fields => ({
    name: typeof search.name === "string" ? search.name : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
    type: search.type === "team" ? "team" : "individual",
    team: typeof search.team === "string" ? search.team : undefined,
  }),
  component: Step2Page,
});

function Step2Page() {
  const carried = Route.useSearch();
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    event.preventDefault();
    navigate({
      to: "/review",
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

  return (
    <main className="wizard">
      <ol className="wizard-progress">
        <li>참가자 정보</li>
        <li aria-current="step">세션 선택</li>
        <li>확인</li>
      </ol>
      <form className="wizard-step" data-step="2" method="get" action="../review/" onSubmit={handleSubmit}>
        <h1>세션 선택</h1>
        <p className="field">
          <label htmlFor="session">세션</label>
          <select id="session" name="session" required defaultValue="">
            <option value="">세션을 선택하세요</option>
            {SESSIONS.map((session) => (
              <option key={session.value} value={session.value}>
                {session.value} — {session.title}
              </option>
            ))}
          </select>
        </p>
        <fieldset className="field">
          <legend>식이 제한</legend>
          {DIET_OPTIONS.map((option) => (
            <label key={option.value}>
              <input type="checkbox" name="diet" value={option.value} /> {option.label}
            </label>
          ))}
        </fieldset>
        <p className="field">
          <label htmlFor="coupon">쿠폰 코드</label>
          <input id="coupon" name="coupon" type="text" pattern="[A-Z]{4}-[0-9]{4}" placeholder="ABCD-1234" />
        </p>
        <div className="carried" hidden>
          <input type="hidden" name="name" value={carried.name ?? ""} disabled={!carried.name} />
          <input type="hidden" name="email" value={carried.email ?? ""} disabled={!carried.email} />
          <input type="hidden" name="type" value={carried.type ?? "individual"} />
          <input type="hidden" name="team" value={carried.team ?? ""} disabled={!carried.team} />
        </div>
        <button className="wizard-next" type="submit">
          다음
        </button>
        <a className="wizard-back" href="../">
          이전
        </a>
      </form>
    </main>
  );
}
