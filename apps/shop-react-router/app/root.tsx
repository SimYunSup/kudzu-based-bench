import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, type MetaFunction } from "react-router";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { catalog } from "./lib/catalog";
import "../src/style.css";

export const meta: MetaFunction = () => [
  { title: "OTW Store — 커머스 벤치마크 픽스처" },
  { name: "description", content: "같은 상점을 프레임워크마다 정적으로 빌드해 비교하는 픽스처입니다." }
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
        <Header menu={catalog.menu} />
        {children}
        <Footer />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
