import type { ProfileSection } from "./types";

/**
 * 섹션에서 비어 있는(미기록) 칸 수. 지원서를 채우다 못 넣은 칸은 빈 항목으로 더해 두므로,
 * 이 수가 아직 받아야 할 정보의 수다. text 섹션은 본문이 비었으면 1이다.
 */
export function emptyCount(sec: ProfileSection): number {
  if (sec.kind === "fields") return sec.fields.filter((f) => !f.value.trim()).length;
  if (sec.kind === "text") return sec.body.trim() ? 0 : 1;
  let n = 0;
  for (const e of sec.entries) for (const c of sec.columns) if (!(e.cells[c.id] ?? "").trim()) n++;
  return n;
}

/** 목록 행 오른쪽에 붙는 크기. 항목형은 줄 수, 목록형은 건수, 글은 글자 수. */
export function sizeLabel(sec: ProfileSection): string {
  if (sec.kind === "fields") return `${sec.fields.length}개`;
  if (sec.kind === "list") return `${sec.entries.length}건`;
  return `${Array.from(sec.body).length.toLocaleString()}자`;
}
