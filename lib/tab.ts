/**
 * 화면 위쪽 탭. material은 재료 — 자소서에 쓸 만한 문항을 한 줄씩 모아 둔다.
 * project는 해온 프로젝트 — 이름 · 설명 · 키워드를 적어 두고 자소서 주제를 고를 때 본다.
 * calendar는 채용 캘린더 — 아직 안 낸 회사의 마감일과 적어 둔 전형 일정을 한 달 달력에 모아 본다.
 * 서버 컴포넌트(app/page.tsx)도 URL을 읽을 때 써야 해서 "use client"인 store 밖에 둔다.
 */
export type Tab = "cover" | "material" | "project" | "interview" | "job" | "calendar";

const TABS: Tab[] = ["cover", "material", "project", "interview", "job", "calendar"];

export function toTab(v: unknown): Tab {
  return TABS.includes(v as Tab) ? (v as Tab) : "cover";
}
