import { downloadMarkdown, seoulToday } from "./download";
import type { MaterialGroup } from "./types";

/**
 * 재료 전체를 마크다운 한 파일로 만든다. 컨셉은 ##, 문항은 제목(###) 아래에 내용을 둔다.
 * 제목과 내용이 모두 빈 문항은 뺀다.
 */
export function materialsToMarkdown(groups: MaterialGroup[]): string {
  const blocks: string[] = ["# 재료"];
  for (const g of groups) {
    const items = g.items.filter((m) => m.title.trim() || m.t.trim());
    if (items.length === 0) continue;
    blocks.push(`## ${g.name.trim() || "제목 없음"}`);
    for (const m of items) {
      blocks.push(`### ${m.title.trim() || "제목 없음"}`);
      if (m.t.trim()) blocks.push(m.t.trim());
    }
  }
  return blocks.join("\n\n") + "\n";
}

/**
 * 브라우저에서 .md 파일로 내려받는다. 파일 이름에 서울 기준 오늘 날짜를 붙인다.
 * label을 주면 이름에 끼운다(재료-최종-2026-10-07.md).
 */
export function downloadMaterials(groups: MaterialGroup[], label?: string) {
  downloadMarkdown(`재료-${label ? `${label}-` : ""}${seoulToday()}.md`, materialsToMarkdown(groups));
}
