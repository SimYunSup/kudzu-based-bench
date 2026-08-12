"use client";

import { useEffect, useState } from "react";

/**
 * Step 1 — participant info. A native `<form method="get">` so the wizard
 * chain works with JavaScript disabled; the team-name row is always visible
 * and optional in that baseline. Once mounted, the client enhancement hides
 * the team row for the default "individual" type and requires it for "team".
 *
 * The `enhanced` flag is only flipped inside an effect (after the first
 * commit), so the very first client render still matches the server-rendered
 * HTML — no hydration mismatch, no flash of hidden content before paint.
 */
export default function Step1Form() {
  const [type, setType] = useState<"individual" | "team">("individual");
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    setEnhanced(true);
  }, []);

  const hideTeam = enhanced && type === "individual";

  return (
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
      <p className="field team-row" hidden={hideTeam}>
        <label htmlFor="team-name">팀 이름</label>
        <input id="team-name" name="team" type="text" disabled={hideTeam} required={enhanced && type === "team"} />
      </p>
      <button className="wizard-next" type="submit">
        다음
      </button>
    </form>
  );
}
