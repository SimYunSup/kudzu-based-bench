import { Suspense } from "react";
import ProgressList from "../../components/wizard/ProgressList";
import ReviewFormLive from "../../components/wizard/ReviewFormLive";
import ReviewFormView from "../../components/wizard/ReviewFormView";

export const metadata = { title: "확인 — 워크숍 신청" };

export default function ReviewPage() {
  return (
    <main className="wizard">
      <ProgressList current={3} />
      <Suspense fallback={<ReviewFormView carried={{}} />}>
        <ReviewFormLive />
      </Suspense>
    </main>
  );
}
