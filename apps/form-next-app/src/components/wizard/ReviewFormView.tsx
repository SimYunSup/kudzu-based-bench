import { dietLabels, sessionLabel } from "../../lib/wizard";

export interface CarriedStep2 {
  name?: string;
  email?: string;
  type?: string;
  team?: string;
  session?: string;
  diet?: string[];
  coupon?: string;
}

const DASH = "—";

function typeLabel(type?: string): string {
  if (type === "individual") return "개인";
  if (type === "team") return "팀";
  return DASH;
}

/**
 * Step 3 — review + confirm. Same fallback/live split as the session step:
 * this pure view renders the confirmation summary and carries every prior
 * value forward as hidden inputs (diet expands to one hidden input per
 * selected value since it can carry zero, one, or many).
 */
export default function ReviewFormView({ carried }: { carried: CarriedStep2 }) {
  const diet = carried.diet ?? [];
  const session = sessionLabel(carried.session);
  const dietText = dietLabels(diet);

  return (
    <form className="wizard-step" data-step="3" method="get" action="../done/">
      <h1>확인</h1>
      <dl className="summary">
        <dt>이름</dt>
        <dd className="summary-name">{carried.name || DASH}</dd>
        <dt>이메일</dt>
        <dd className="summary-email">{carried.email || DASH}</dd>
        <dt>참가 유형</dt>
        <dd className="summary-type">{typeLabel(carried.type)}</dd>
        <dt>팀 이름</dt>
        <dd className="summary-team">{carried.team || DASH}</dd>
        <dt>세션</dt>
        <dd className="summary-session">{session || DASH}</dd>
        <dt>식단</dt>
        <dd className="summary-diet">{dietText || DASH}</dd>
        <dt>쿠폰</dt>
        <dd className="summary-coupon">{carried.coupon || DASH}</dd>
      </dl>
      <label className="confirm-row">
        <input id="confirm" name="confirm" type="checkbox" required /> 위 내용이 맞습니다
      </label>
      <div className="carried" hidden>
        <input type="hidden" name="name" value={carried.name ?? ""} disabled={!carried.name} />
        <input type="hidden" name="email" value={carried.email ?? ""} disabled={!carried.email} />
        <input type="hidden" name="type" value={carried.type ?? ""} disabled={!carried.type} />
        <input type="hidden" name="team" value={carried.team ?? ""} disabled={!carried.team} />
        <input type="hidden" name="session" value={carried.session ?? ""} disabled={!carried.session} />
        {diet.map(value => (
          <input key={value} type="hidden" name="diet" value={value} />
        ))}
        <input type="hidden" name="coupon" value={carried.coupon ?? ""} disabled={!carried.coupon} />
      </div>
      <button className="wizard-next" type="submit">
        신청하기
      </button>
      <a className="wizard-back" href="../session/">
        이전
      </a>
    </form>
  );
}
