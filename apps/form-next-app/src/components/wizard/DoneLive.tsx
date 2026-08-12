"use client";

import { useSearchParams } from "next/navigation";
import { refCode as computeRefCode } from "../../lib/wizard";
import DoneView from "./DoneView";

/** Computes the deterministic reference code + reads the email from the final query string. */
export default function DoneLive() {
  const params = useSearchParams();
  return <DoneView refCode={computeRefCode(params)} email={params.get("email") ?? ""} />;
}
