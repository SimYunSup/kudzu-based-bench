import { useEffect } from "@kudzujs/core";
import { refCode, setText } from "../../lib/wizard";

export const metadata = {
  title: "신청 완료 — 워크숍 신청",
  lang: "ko"
};

export default function DonePage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setText(".done-ref", refCode(params));
    setText(".done-email", params.get("email") ?? "");
  }, []);

  return (
    <main className="wizard">
      <h1 className="done-title">신청 완료</h1>
      <p className="done-ref" />
      <p className="done-summary">
        확인 메일을 <span className="done-email" />로 보냈습니다.
      </p>
      <a className="done-home" href="../">
        처음으로
      </a>
    </main>
  );
}
