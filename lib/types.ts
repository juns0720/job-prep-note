/** 클라이언트 데이터 모델. DB 행과의 변환은 lib/data/mappers.ts가 한다. */

export type Period = string; // "2026 하반기"

/** 지원 완료와 합격 사이의 전형 단계. 화면에서는 버튼 하나("전형")로 묶어 고른다. */
export type ProcessStage = "docs_passed" | "coding_test" | "assignment" | "aptitude" | "interview";

export type CompanyStatus = "draft" | "writing" | "applied" | ProcessStage | "passed" | "rejected";

/** 전형 일정의 종류. 서류는 합격이 아니라 발표일을 적으므로 docs_result로 따로 둔다. */
export type EventKind = "docs_result" | "coding_test" | "assignment" | "aptitude" | "interview" | "other";

/** 회사에 적어 둔 전형 일정 하나. 캘린더 탭에 뜬다. */
export type CompanyEvent = {
  id: string;
  kind: EventKind;
  date: string; // "2026-10-25", 빈 문자열이면 미정(캘린더에 안 뜬다)
  memo: string; // "1차", "14:00 판교" 같은 것
};

export type CoverQuestion = {
  id: string;
  t: string; // 문항
  limit: number; // 제한 글자 수
  a: string; // 답변
};

export type Company = {
  id: string;
  period: Period;
  name: string;
  role: string;
  due: string; // "2026-10-14", 빈 문자열이면 미정
  status: CompanyStatus;
  url: string;
  memo: string; // 이 직무를 고른 이유
  createdAt: string; // 최신순 정렬에 쓴다
  questions: CoverQuestion[];
  events: CompanyEvent[]; // 날짜순
};

export type InterviewQuestion = {
  id: string;
  t: string; // 질문
  k: string[]; // 핵심 키워드
  a: string; // 답변
};

export type Topic = {
  id: string;
  name: string;
  questions: InterviewQuestion[];
};

/** 재료 탭의 문항 하나. 컨셉 아래에 한 줄씩 모아 둔다. */
export type Material = {
  id: string;
  title: string; // 한 줄 주제. 접어 두었을 때 이것만 보인다
  t: string; // 내용
  final: boolean; // 실제로 쓸 것으로 체크했는지. 재료 탭의 "최종"에 모인다
};

/** 재료 탭의 큰 컨셉. 갈등 상황, 기술 답변 같은 것. */
export type MaterialGroup = {
  id: string;
  name: string;
  items: Material[];
};

/** 프로젝트 탭. 자소서에 쓸 주제를 고를 때 본다. */
export type Project = {
  id: string;
  name: string;
  description: string;
  keywords: string; // 쉼표로 이어 쓴 글 그대로
};

/** 수집기가 모아 온 채용 공고. DB의 job_postings와 짝이다. */
export type JobPosting = {
  id: string;
  source: string; // saramin | manual ...
  url: string;
  company: string;
  title: string;
  location: string;
  career: string;
  employment: string;
  sector: string;
  dueText: string; // "~ 10/19(월)", "채용시" 같은 원문
  due: string; // "2026-10-19", 못 읽었으면 빈 문자열
  /** 자기소개서로 옮겼다. 옮긴 뒤에는 대기 목록에서 빠진다. */
  picked: boolean;
  dismissed: boolean;
  /** 목록에서 뺐다. 행은 남아서 다시 수집해도 올라오지 않는다. */
  deleted: boolean;
  note: string;
  collectedAt: string;

  /** 회사 채용 페이지. 자소설 같은 중개 사이트가 아니라 실제로 지원하는 곳이다. */
  applyUrl: string;
  /** 전형 조건. 사이트가 주는 항목이 제각각이라 있는 것만 담는다. */
  process: JobProcess | null;
  /** 자소서 문항. 자기소개서로 옮길 때 그대로 문항이 된다. */
  questions: JobQuestion[];
  /** 잡플래닛에서 본 회사 평판. 못 찾았거나 안 가져왔으면 null. */
  companyInfo: CompanyInfo | null;
};

/**
 * 공고 필터링 규칙. DB의 job_rules와 짝이고 사용자마다 하나다.
 * 값은 lib/job-filter.json의 id들이다. 수집기(scripts/collect.mjs)가 읽어 거르고,
 * 맞추는 방식은 scripts/lib/rules.mjs에 있다. 갈래마다 비어 있으면 거르지 않는다.
 */
export type JobRules = {
  roles: string[];
  careers: string[];
  stacks: string[];
};

/** 지원서에 붙여 넣을 내 링크. DB의 profile_links와 짝이고 사용자마다 하나다. 비어 있으면 빈 문자열. */
export type ProfileLinks = {
  portfolio: string;
  resume: string;
};

export type CompanyInfo = {
  source: string;
  company_id?: number;
  /** 어떤 회사로 매칭됐는지. 회사명으로 찾은 것이라 엉뚱한 곳이 걸릴 수 있다. */
  matched_name?: string;
  url?: string;
  rating?: number | null;
  ratings?: {
    compensation?: number | null;
    worklife?: number | null;
    culture?: number | null;
    advancement?: number | null;
    management?: number | null;
  };
  recommend_rate?: number | null;
  ceo_support_rate?: number | null;
  growth_rate?: number | null;
  /** 만원 단위. 회사 전체 기준이고 직무별이 아니다. */
  salary?: { avg?: number | null; min?: number | null; max?: number | null };
  /** 직무별 연봉. entry가 1년차(신입) 기준이다. */
  duty?: { web?: DutySalary; infra?: DutySalary };
  /** 회사 규모. 사원수와 매출로 중소·중견·대기업을 가늠한다. */
  scale?: {
    employees?: number | null;
    /** 백만원 단위 */
    revenue?: number | null;
    founded?: string | null;
    industry?: string | null;
  };
  counts?: { review?: number | null; salary?: number | null; interview?: number | null };
};

export type JobProcess = {
  field?: string | null;
  work_type?: string | null;
  written_test?: string | null;
  graduate_condition?: string | null;
  linkage_recruitment?: boolean | null;
  self_introduction_type?: string | null;
  english_score_requirement?: boolean | null;
  certificate_requirement?: boolean | null;
};

export type DutySalary = {
  mean?: number | null;
  min?: number | null;
  max?: number | null;
  /** 업계 내 순위 */
  rank?: number | null;
  /** 같은 직무의 업계 평균 */
  total_mean?: number | null;
  /** 1년차 평균. 신입 기준으로 본다. */
  entry?: number | null;
};

export type JobQuestion = {
  number: number | null;
  question: string;
  /** 제한 글자 수. 제한이 없으면 null. */
  limit: number | null;
  include_space: boolean | null;
};
