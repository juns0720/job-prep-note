/** 서울 기준 오늘 날짜. 내려받는 파일 이름에 붙인다. "2026-10-14" */
export function seoulToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

/** 브라우저에서 마크다운 문자열을 .md 파일로 내려받는다. */
export function downloadMarkdown(fileName: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // 회사 이름에 들어간 / 같은 글자는 파일 이름에 못 쓴다.
  a.download = fileName.replace(/[\\/:*?"<>|]/g, "_");
  a.click();
  URL.revokeObjectURL(url);
}
