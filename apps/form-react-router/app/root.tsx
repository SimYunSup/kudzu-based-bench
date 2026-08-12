import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, type MetaFunction } from "react-router";
import "../src/style.css";

export const meta: MetaFunction = () => [
  { title: "워크숍 신청 — OTW 폼 위저드 벤치마크 픽스처" },
  { name: "description", content: "같은 다단계 신청 폼을 프레임워크마다 정적으로 빌드해 비교하는 픽스처입니다." }
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
