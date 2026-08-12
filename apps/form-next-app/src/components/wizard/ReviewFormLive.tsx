"use client";

import { useSearchParams } from "next/navigation";
import ReviewFormView from "./ReviewFormView";

/** Reads step-1 + step-2 values carried in the query string and hands them to the shared view. */
export default function ReviewFormLive() {
  const params = useSearchParams();
  return (
    <ReviewFormView
      carried={{
        name: params.get("name") ?? undefined,
        email: params.get("email") ?? undefined,
        type: params.get("type") ?? undefined,
        team: params.get("team") ?? undefined,
        session: params.get("session") ?? undefined,
        diet: params.getAll("diet"),
        coupon: params.get("coupon") ?? undefined
      }}
    />
  );
}
