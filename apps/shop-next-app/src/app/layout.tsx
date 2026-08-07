import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { catalog } from "../lib/catalog";
import "../styles/style.css";

export const metadata: Metadata = {
  title: "OTW Store — 커머스 벤치마크 픽스처",
  description: "같은 상점을 프레임워크마다 정적으로 빌드해 비교하는 픽스처입니다."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Header menu={catalog.menu} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
