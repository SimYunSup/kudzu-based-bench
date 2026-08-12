import { Suspense } from "react";
import DoneLive from "../../components/wizard/DoneLive";
import DoneView from "../../components/wizard/DoneView";

export const metadata = { title: "신청 완료 — 워크숍 신청" };

export default function DonePage() {
  return (
    <Suspense fallback={<DoneView refCode="" email="" />}>
      <DoneLive />
    </Suspense>
  );
}
