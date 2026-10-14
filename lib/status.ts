import type { Company, CompanyStatus, EventKind, ProcessStage } from "./types";

/** 전형 단계. 진행 상태에서 "전형" 버튼 하나로 묶여 이 순서대로 고른다. */
export const PROCESS_STAGES: ProcessStage[] = ["docs_passed", "coding_test", "assignment", "aptitude", "interview"];

/** 전형 일정의 종류. 일정 줄의 고르기 칸에 이 순서로 나온다. */
export const EVENT_KINDS: EventKind[] = ["docs_result", "coding_test", "assignment", "aptitude", "interview", "other"];

export function isStage(status: CompanyStatus): status is ProcessStage {
  return (PROCESS_STAGES as CompanyStatus[]).includes(status);
}

/** 진행 상태가 미제출·작성 중이 아니면(지원 완료·전형·합격·탈락) 이미 낸 회사다. */
export function isSubmitted(c: Pick<Company, "status">): boolean {
  return c.status !== "draft" && c.status !== "writing";
}
