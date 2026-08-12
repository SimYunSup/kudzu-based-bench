/**
 * Terminal confirmation view. Pure presentational component shared by the
 * Suspense fallback (empty ref/email, matching the JS-off baseline) and the
 * live client component (ref code + email computed from the query string).
 */
export default function DoneView({ refCode, email }: { refCode: string; email: string }) {
  return (
    <main className="wizard">
      <h1 className="done-title">신청 완료</h1>
      <p className="done-ref">{refCode}</p>
      <p className="done-summary">
        확인 메일을 <span className="done-email">{email}</span>로 보냈습니다.
      </p>
      <a className="done-home" href="../">
        처음으로
      </a>
    </main>
  );
}
