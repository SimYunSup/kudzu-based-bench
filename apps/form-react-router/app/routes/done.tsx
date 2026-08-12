import { useEffect, useState } from "react";
import { refCode } from "../lib/wizard";

/** Terminal step — computes the cross-variant reference code from the wizard's query chain. */
export default function Done() {
  const [ref, setRef] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRef(refCode(params));
    setEmail(params.get("email") ?? "");
  }, []);

  return (
    <main className="wizard">
      <h1 className="done-title">신청 완료</h1>
      <p className="done-ref">{ref}</p>
      <p className="done-summary">
        확인 메일을 <span className="done-email">{email}</span>로 보냈습니다.
      </p>
      <a className="done-home" href="../">
        처음으로
      </a>
    </main>
  );
}
