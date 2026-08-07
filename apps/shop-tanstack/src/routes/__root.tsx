/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { catalog } from "../lib/catalog";
import "../style.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "OTW Store — 커머스 벤치마크 픽스처" },
      {
        name: "description",
        content: "같은 상점을 프레임워크마다 정적으로 빌드해 비교하는 픽스처입니다.",
      },
    ],
  }),
  shellComponent: RootDocument,
});

// The router hands the matched child route tree's rendered output as
// `children` here — this shell is the single place `<html>`/`<head>`/
// `<body>` are declared, per Start's root-route contract.
function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header menu={catalog.menu} />
        {children}
        <Footer />
        <Scripts />
      </body>
    </html>
  );
}
