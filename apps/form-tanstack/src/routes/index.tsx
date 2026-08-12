import { type FormEvent, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formString, type ParticipantType } from "../lib/wizard";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "참가자 정보 — 워크숍 신청" }] }),
  component: Step1Page,
});

function Step1Page() {
  const navigate = useNavigate();
  // The static markup must default to "team row visible, optional" — that's
  // what a JS-off visitor and the prerendered HTML both see. Only after
  // mount does the individual/team toggle take over, so `hydrated` gates
  // every dynamic attribute below instead of driving them from first paint.
  const [hydrated, setHydrated] = useState(false);
  const [type, setType] = useState<ParticipantType>("individual");
  useEffect(() => setHydrated(true), []);
  const teamRowHidden = hydrated && type !== "team";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    event.preventDefault();
    navigate({
      to: "/session",
      search: {
        name: formString(data, "name"),
        email: formString(data, "email"),
        type: data.get("type") === "team" ? "team" : "individual",
        team: formString(data, "team"),
      },
    });
  }

  return (
    <main className="wizard">
      <ol className="wizard-progress">
        <li aria-current="step">참가자 정보</li>
        <li>세션 선택</li>
        <li>확인</li>
      </ol>
      <form className="wizard-step" data-step="1" method="get" action="session/" onSubmit={handleSubmit}>
        <h1>참가자 정보</h1>
        <p className="field">
          <label htmlFor="name">이름</label>
          <input id="name" name="name" type="text" required minLength={2} autoComplete="name" />
        </p>
        <p className="field">
          <label htmlFor="email">이메일</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </p>
        <fieldset className="field">
          <legend>참가 유형</legend>
          <label>
            <input
              type="radio"
              name="type"
              value="individual"
              checked={type === "individual"}
              onChange={() => setType("individual")}
            />{" "}
            개인
          </label>
          <label>
            <input
              type="radio"
              name="type"
              value="team"
              checked={type === "team"}
              onChange={() => setType("team")}
            />{" "}
            팀
          </label>
        </fieldset>
        <p className="field team-row" hidden={teamRowHidden}>
          <label htmlFor="team-name">팀 이름</label>
          <input
            id="team-name"
            name="team"
            type="text"
            disabled={teamRowHidden}
            required={hydrated && type === "team"}
          />
        </p>
        <button className="wizard-next" type="submit">
          다음
        </button>
      </form>
    </main>
  );
}
