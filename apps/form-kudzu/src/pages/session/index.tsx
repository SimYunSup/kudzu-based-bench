// Kudzu 0.8.53+ links a stylesheet only where a route's reachable source
// graph imports it; up to 0.8.39 every file under src/ was linked on every
// page. The wizard has no shared shell component, so each of the four step
// pages carries the edge to the one global sheet it renders with.
import "../../style.css";
import { useEffect } from "@kudzujs/core";
import { SESSIONS, DIET_OPTIONS, applyHiddenField } from "../../lib/wizard";

export const metadata = {
  title: "세션 선택 — 워크숍 신청",
  lang: "ko"
};

const CARRIED_KEYS: [string, string][] = [
  ["carry-name", "name"],
  ["carry-email", "email"],
  ["carry-type", "type"],
  ["carry-team", "team"]
];

export default function Step2Page() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    for (const [id, key] of CARRIED_KEYS) applyHiddenField(id, params, key);
  }, []);

  return (
    <main className="wizard">
      <ol className="wizard-progress">
        <li>참가자 정보</li>
        <li aria-current="step">세션 선택</li>
        <li>확인</li>
      </ol>
      <form className="wizard-step" data-step="2" method="get" action="../review/">
        <h1>세션 선택</h1>
        <p className="field">
          <label htmlFor="session">세션</label>
          <select id="session" name="session" required>
            <option value="">세션을 선택하세요</option>
            {SESSIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </p>
        <fieldset className="field">
          <legend>식단</legend>
          {DIET_OPTIONS.map(option => (
            <label key={option.value}>
              <input type="checkbox" name="diet" value={option.value} /> {option.label}
            </label>
          ))}
        </fieldset>
        <p className="field">
          <label htmlFor="coupon">쿠폰</label>
          <input id="coupon" name="coupon" type="text" pattern="[A-Z]{4}-[0-9]{4}" placeholder="ABCD-1234" />
        </p>
        <div className="carried" hidden>
          <input type="hidden" name="name" id="carry-name" />
          <input type="hidden" name="email" id="carry-email" />
          <input type="hidden" name="type" id="carry-type" />
          <input type="hidden" name="team" id="carry-team" />
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
