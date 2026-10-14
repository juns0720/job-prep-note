import type { CompanyStatus, EventKind } from "@/lib/types";

export const STATUS_LABEL: Record<CompanyStatus, string> = {
  draft: "미제출",
  writing: "작성 중",
  applied: "지원 완료",
  docs_passed: "서류 합격",
  coding_test: "코딩테스트",
  assignment: "과제",
  aptitude: "인적성",
  interview: "면접",
  passed: "합격",
  rejected: "탈락",
};

export const EVENT_LABEL: Record<EventKind, string> = {
  docs_result: "서류 발표",
  coding_test: "코딩테스트",
  assignment: "과제",
  aptitude: "인적성",
  interview: "면접",
  other: "기타",
};
