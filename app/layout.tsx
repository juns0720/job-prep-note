import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "study·note",
  description: "자기소개서, 인적사항, 면접 답변과 채용 일정을 정리하는 개인용 웹앱",
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
