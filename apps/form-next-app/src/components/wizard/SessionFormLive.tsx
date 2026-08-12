"use client";

import { useSearchParams } from "next/navigation";
import SessionFormView from "./SessionFormView";

/** Reads step-1 values carried in the query string and hands them to the shared view. */
export default function SessionFormLive() {
  const params = useSearchParams();
  return (
    <SessionFormView
      carried={{
        name: params.get("name") ?? undefined,
        email: params.get("email") ?? undefined,
        type: params.get("type") ?? undefined,
        team: params.get("team") ?? undefined
      }}
    />
  );
}
