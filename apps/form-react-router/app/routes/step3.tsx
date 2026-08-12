import { SESSIONS, TYPE_LABELS, DIET_OPTIONS, useIncomingParams } from "../lib/wizard";

const SINGLE_CARRIED_KEYS = ["name", "email", "type", "team", "session", "coupon"] as const;

/** Step 3 — review, carrying every prior field forward as hidden inputs. */
export default function Step3() {
  const params = useIncomingParams();

  const name = params.get("name") ?? "";
  const email = params.get("email") ?? "";
  const type = params.get("type") ?? "";
  const team = params.get("team") ?? "";
  const session = params.get("session") ?? "";
  const dietValues = params.getAll("diet");
  const coupon = params.get("coupon") ?? "";

  const typeText = type ? (TYPE_LABELS[type] ?? type) : "—";
  const sessionText = session ? (SESSIONS.find(entry => entry.value === session)?.label ?? session) : "—";
  const dietText =
    dietValues.length > 0
      ? dietValues.map(value => DIET_OPTIONS.find(entry => entry.value === value)?.label ?? value).join(", ")
      : "—";

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
          <dd className="summary-name">{name || "—"}</dd>
          <dt>이메일</dt>
          <dd className="summary-email">{email || "—"}</dd>
          <dt>참가 유형</dt>
          <dd className="summary-type">{typeText}</dd>
          <dt>팀 이름</dt>
          <dd className="summary-team">{team || "—"}</dd>
          <dt>세션</dt>
          <dd className="summary-session">{sessionText}</dd>
          <dt>식단</dt>
          <dd className="summary-diet">{dietText}</dd>
          <dt>쿠폰</dt>
          <dd className="summary-coupon">{coupon || "—"}</dd>
        </dl>
        <p className="confirm-row">
          <label>
            <input id="confirm" name="confirm" type="checkbox" required /> 위 내용이 맞습니다
          </label>
        </p>
        <div className="carried" hidden>
          {SINGLE_CARRIED_KEYS.map(key => {
            const value = params.get(key) ?? "";
            return <input key={key} type="hidden" name={key} value={value} disabled={value === ""} readOnly />;
          })}
          {dietValues.map((value, index) => (
            <input key={`diet-${index}`} type="hidden" name="diet" value={value} readOnly />
          ))}
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
