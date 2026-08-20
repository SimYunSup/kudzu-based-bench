// Kudzu 0.8.53+ links a stylesheet only where a route's reachable source
// graph imports it; up to 0.8.39 every file under src/ was linked on every
// page. The wizard has no shared shell component, so each of the four step
// pages carries the edge to the one global sheet it renders with.
import "../../style.css";
import { useEffect } from "@kudzujs/core";
import { applyHiddenField, applyDietHiddenFields, sessionLabel, dietLabel, setText } from "../../lib/wizard";

export const metadata = {
  title: "확인 — 워크숍 신청",
  lang: "ko"
};

const EMPTY = "—";

const CARRIED_KEYS: [string, string][] = [
  ["carry-name", "name"],
  ["carry-email", "email"],
  ["carry-type", "type"],
  ["carry-team", "team"],
  ["carry-session", "session"],
  ["carry-coupon", "coupon"]
];

export default function Step3Page() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const name = params.get("name");
    const email = params.get("email");
    const type = params.get("type");
    const team = params.get("team");
    const session = params.get("session");
    const diets = params.getAll("diet");
    const coupon = params.get("coupon");

    setText(".summary-name", name || EMPTY);
    setText(".summary-email", email || EMPTY);
    setText(".summary-type", type === "team" ? "팀" : type === "individual" ? "개인" : EMPTY);
    setText(".summary-team", team || EMPTY);
    setText(".summary-session", session ? sessionLabel(session) : EMPTY);
    setText(".summary-diet", diets.length > 0 ? diets.map(dietLabel).join(", ") : EMPTY);
    setText(".summary-coupon", coupon || EMPTY);

    for (const [id, key] of CARRIED_KEYS) applyHiddenField(id, params, key);
    applyDietHiddenFields("carried-diet", params);
  }, []);

  return (
    <main className="wizard">
      <ol className="wizard-progress">
        <li>참가자 정보</li>
        <li>세션 선택</li>
        <li aria-current="step">확인</li>
      </ol>
      <form className="wizard-step" data-step="3" method="get" action="../done/">
        <h1>확인</h1>
        <dl className="summary">
          <dt>이름</dt>
          <dd className="summary-name" />
          <dt>이메일</dt>
          <dd className="summary-email" />
          <dt>유형</dt>
          <dd className="summary-type" />
          <dt>팀</dt>
          <dd className="summary-team" />
          <dt>세션</dt>
          <dd className="summary-session" />
          <dt>식단</dt>
          <dd className="summary-diet" />
          <dt>쿠폰</dt>
          <dd className="summary-coupon" />
        </dl>
        <label className="confirm-row">
          <input id="confirm" name="confirm" type="checkbox" required /> 위 내용이 맞습니다
        </label>
        <div className="carried" id="carried-diet" hidden>
          <input type="hidden" name="name" id="carry-name" />
          <input type="hidden" name="email" id="carry-email" />
          <input type="hidden" name="type" id="carry-type" />
          <input type="hidden" name="team" id="carry-team" />
          <input type="hidden" name="session" id="carry-session" />
          <input type="hidden" name="coupon" id="carry-coupon" />
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
