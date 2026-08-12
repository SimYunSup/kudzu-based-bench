import { useEffect } from "@kudzujs/core";

export const metadata = {
  title: "참가자 정보 — 워크숍 신청",
  lang: "ko"
};

// Kudzu bakes a reactive JSX attribute (e.g. `hidden={signal}`) into the
// static document from the signal's *initial* value, so it would render
// identically whether or not the client ever runs JS. The team-row field
// must stay visible and optional without JS per the wizard's GET-form
// contract, and only collapse once a script actually runs — so visibility
// is driven imperatively from a mount effect and the radio handlers.
//
// The sync logic is duplicated inline in the effect and both handlers, as
// attribute operations on plain Element references: Kudzu serializes each
// handler into its own native module, rejects captured functions ("Native
// capture is not serializable"), and evaluates free identifiers such as
// `HTMLElement` at build time where no DOM globals exist — so neither a
// shared helper nor an instanceof guard can appear in handler code.
export default function Step1Page() {
  useEffect(() => {
    document.querySelector(".team-row")?.setAttribute("hidden", "");
    document.getElementById("team-name")?.setAttribute("disabled", "");
    document.getElementById("team-name")?.removeAttribute("required");
  }, []);

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
              checked
              onChange={() => {
                document.querySelector(".team-row")?.setAttribute("hidden", "");
                document.getElementById("team-name")?.setAttribute("disabled", "");
                document.getElementById("team-name")?.removeAttribute("required");
              }}
            />{" "}
            개인
          </label>
          <label>
            <input
              type="radio"
              name="type"
              value="team"
              onChange={() => {
                document.querySelector(".team-row")?.removeAttribute("hidden");
                document.getElementById("team-name")?.removeAttribute("disabled");
                document.getElementById("team-name")?.setAttribute("required", "");
              }}
            />{" "}
            팀
          </label>
        </fieldset>
        <p className="field team-row">
          <label htmlFor="team-name">팀 이름</label>
          <input id="team-name" name="team" type="text" />
        </p>
        <button className="wizard-next" type="submit">
          다음
        </button>
      </form>
    </main>
  );
}
