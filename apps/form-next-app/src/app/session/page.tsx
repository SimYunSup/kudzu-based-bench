import { Suspense } from "react";
import ProgressList from "../../components/wizard/ProgressList";
import SessionFormLive from "../../components/wizard/SessionFormLive";
import SessionFormView from "../../components/wizard/SessionFormView";

export const metadata = { title: "세션 선택 — 워크숍 신청" };

// useSearchParams() forces a client-only render for static export, hence the
// explicit Suspense boundary here (build fails without it). The fallback
// renders the same form with no carried values — identical DOM, degrades
// gracefully when JavaScript never runs.
export default function SessionPage() {
  return (
    <main className="wizard">
      <ProgressList current={2} />
      <Suspense fallback={<SessionFormView carried={{}} />}>
        <SessionFormLive />
      </Suspense>
    </main>
  );
}
