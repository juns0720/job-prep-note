import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "study·note",
  description: "취업 준비 기록 — 자기소개서와 면접 준비",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-screen bg-white font-sans">{children}</body>
    </html>
  );
}
