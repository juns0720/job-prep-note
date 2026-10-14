import { downloadMarkdown, seoulToday } from "./download";
import { charLength } from "./text";
import type { Company } from "./types";

/**
 * 회사 하나의 자소서를 마크다운 한 파일로 만든다. 회사는 #, 문항은 ## 아래에 답변을 두고
 * 답변 끝에 글자 수를 적는다. 문항과 답변이 모두 빈 것은 뺀다.
 */
export function coverToMarkdown(co: Company): string {
  const blocks: string[] = [`# ${co.name.trim() || "회사 이름 없음"}`];
  const sub = [co.role.trim(), co.period].filter(Boolean).join(" · ");
  if (sub) blocks.push(sub);

  const questions = co.questions.filter((q) => q.t.trim() || q.a.trim());
  questions.forEach((q, i) => {
    blocks.push(`## ${i + 1}. ${q.t.trim() || "문항 없음"}`);
    if (q.a.trim()) blocks.push(q.a.trim());
    const count = charLength(q.a);
    blocks.push(q.limit ? `(${count} / ${q.limit}자)` : `(${count}자)`);
  });
  return blocks.join("\n\n") + "\n";
}

/** 자소서-회사명-2026-10-14.md 로 내려받는다. */
export function downloadCover(co: Company) {
  downloadMarkdown(`자소서-${co.name.trim() || "회사"}-${seoulToday()}.md`, coverToMarkdown(co));
}
