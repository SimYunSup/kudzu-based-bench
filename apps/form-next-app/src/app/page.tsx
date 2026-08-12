import ProgressList from "../components/wizard/ProgressList";
import Step1Form from "../components/wizard/Step1Form";

export const metadata = { title: "참가자 정보 — 워크숍 신청" };

export default function Step1Page() {
  return (
    <main className="wizard">
      <ProgressList current={1} />
      <Step1Form />
    </main>
  );
}
