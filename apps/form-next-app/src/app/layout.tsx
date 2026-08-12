import type { Metadata } from "next";
import "../styles/style.css";

export const metadata: Metadata = {
  title: "워크숍 신청 — 폼 위저드 벤치마크 픽스처",
  description: "같은 신청 위저드를 프레임워크마다 정적으로 빌드해 비교하는 픽스처입니다."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
