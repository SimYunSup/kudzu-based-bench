import { DIET_OPTIONS, SESSIONS } from "../../lib/wizard";

export interface CarriedStep1 {
  name?: string;
  email?: string;
  type?: string;
  team?: string;
}

/**
 * Step 2 — session selection. Pure presentational component shared by the
 * Suspense fallback (no known query, i.e. the JS-off / pre-hydration
 * baseline) and the live client component (query values read via
 * useSearchParams). Keeping one source of markup guarantees both paths stay
 * DOM-identical.
 */
export default function SessionFormView({ carried }: { carried: CarriedStep1 }) {
  return (
    <form className="wizard-step" data-step="2" method="get" action="../review/">
      <h1>세션 선택</h1>
      <p className="field">
        <label htmlFor="session">세션</label>
        <select id="session" name="session" required defaultValue="">
          <option value="">세션을 선택하세요</option>
          {SESSIONS.map(session => (
            <option key={session.value} value={session.value}>
              {session.value} — {session.title}
            </option>
          ))}
        </select>
      </p>
      <fieldset className="field">
        <legend>식단 옵션</legend>
        {DIET_OPTIONS.map(diet => (
          <label key={diet.value}>
            <input type="checkbox" name="diet" value={diet.value} /> {diet.label}
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
        <input type="hidden" name="type" value={carried.type ?? ""} disabled={!carried.type} />
        <input type="hidden" name="team" value={carried.team ?? ""} disabled={!carried.team} />
      </div>
      <button className="wizard-next" type="submit">
        다음
      </button>
      <a className="wizard-back" href="../">
        이전
      </a>
    </form>
  );
}
