import { useEffect, useState } from "react";

type ParticipantType = "individual" | "team";

/**
 * Step 1 — participant info. The team-name field is visible and optional
 * in the prerendered HTML (JS-off contract); once mounted, JS hides and
 * disables it for the default "individual" selection, matching every other
 * variant's progressive-enhancement behavior.
 */
export default function Step1() {
  const [type, setType] = useState<ParticipantType>("individual");
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    setEnhanced(true);
  }, []);

  const hideTeamRow = enhanced && type === "individual";

  return (
    <main className="wizard">
      <ol className="wizard-progress">
        <li aria-current="step">참가자 정보</li>
        <li>세션 선택</li>
        <li>확인</li>
      </ol>
      <form className="wizard-step" data-step="1" method="get" action="session/">
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
            <input type="radio" name="type" value="team" checked={type === "team"} onChange={() => setType("team")} />{" "}
            팀
          </label>
        </fieldset>
        <p className="field team-row" hidden={hideTeamRow}>
          <label htmlFor="team-name">팀 이름</label>
          <input
            id="team-name"
            name="team"
            type="text"
            disabled={hideTeamRow}
            required={enhanced && type === "team"}
          />
        </p>
        <button className="wizard-next" type="submit">
          다음
        </button>
      </form>
    </main>
  );
}
