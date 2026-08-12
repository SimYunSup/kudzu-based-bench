import { DIET_OPTIONS, SESSIONS, useIncomingParams } from "../lib/wizard";

const CARRIED_KEYS = ["name", "email", "type", "team"] as const;

/** Step 2 — session selection, carrying step 1's values forward as hidden inputs. */
export default function Step2() {
  const params = useIncomingParams();

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
          <select id="session" name="session" required defaultValue="">
            <option value="">세션을 선택하세요</option>
            {SESSIONS.map(session => (
              <option key={session.value} value={session.value}>
                {session.label}
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
          <label htmlFor="coupon">쿠폰 코드</label>
          <input id="coupon" name="coupon" type="text" pattern="[A-Z]{4}-[0-9]{4}" placeholder="ABCD-1234" />
        </p>
        <div className="carried" hidden>
          {CARRIED_KEYS.map(key => {
            const value = params.get(key) ?? "";
            return <input key={key} type="hidden" name={key} value={value} disabled={value === ""} readOnly />;
          })}
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
