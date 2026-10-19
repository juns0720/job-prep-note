import "server-only";
import { currentPeriodLabel } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import type { Company, JobPosting, JobRules, MaterialGroup, ProfileFile, ProfileLinks, ProfileSection, Project, Topic } from "@/lib/types";
import {
  groupBy,
  mapCompanyRow,
  mapJobPostingRow,
  mapJobRulesRow,
  mapMaterialGroupRow,
  mapProfileFileRow,
  mapProfileLinksRow,
  mapProfileSectionRow,
  mapProjectRow,
  mapTopicRow,
} from "./mappers";

export type UserData = {
  periodList: string[];
  companies: Company[];
  topics: Topic[];
  materialGroups: MaterialGroup[];
  projects: Project[];
  jobs: JobPosting[];
  /** 아직 저장한 적이 없으면 null */
  jobRules: JobRules | null;
  /** 아직 저장한 적이 없으면 빈 링크 */
  profileLinks: ProfileLinks;
  /** 인적사항. 0018 마이그레이션 전이면 빈 목록 */
  profileSections: ProfileSection[];
  profileFiles: ProfileFile[];
};

/**
 * 로그인 사용자의 데이터 전부를 한 번에 읽는다. 아직 시기가 하나도 없으면
 * (첫 로그인) 상/하반기로 계산한 기본 시기 하나를 만들어 둔다 — 회사나 질문은
 * 넣지 않는다. 번들의 자리 채움 데이터(lib/seed.ts)를 실제 계정에 섞으면
 * 진짜 지원 기록과 헷갈리기 때문이다.
 *
 * PostgREST의 중첩 select 대신 테이블마다 따로 조회해서 자바스크립트에서 묶는다.
 * (lib/supabase/types.ts 상단 주석 참고 — 타입을 단순하게 유지하려는 선택이다.)
 */
export async function loadUserData(userId: string): Promise<UserData> {
  const supabase = await createClient();

  let { data: periodRows, error: periodError } = await supabase
    .from("periods")
    .select("name")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  // 여기서 에러를 삼키면 "테이블이 없다"가 아래 insert 실패로 뒤늦게 드러나
  // 원인을 읽기 어려워진다.
  if (periodError) throw periodError;

  if (!periodRows || periodRows.length === 0) {
    const name = currentPeriodLabel();
    // insert가 아니라 upsert다. 첫 로그인 직후에는 같은 사용자의 요청이 겹칠 수 있고
    // (새로고침, 서버 컴포넌트 재실행) 그러면 둘 다 "시기 없음"을 보고 각자 넣으려다
    // 뒤쪽이 unique (user_id, name)에 걸린다. 먼저 넣은 쪽이 이기면 그만이다.
    const { error } = await supabase
      .from("periods")
      .upsert({ user_id: userId, name, sort_order: 0 }, { onConflict: "user_id,name", ignoreDuplicates: true });
    if (error) throw error;
    periodRows = [{ name }];
  }

  const [
    { data: companyRows, error: companyError },
    { data: coverQuestionRows, error: coverQuestionError },
    { data: topicRows, error: topicError },
    { data: interviewQuestionRows, error: interviewQuestionError },
    { data: jobRows, error: jobError },
    { data: materialGroupRows, error: materialGroupError },
    { data: materialRows, error: materialError },
    { data: projectRows, error: projectError },
    { data: eventRows, error: eventError },
    { data: jobRulesRow, error: jobRulesError },
    { data: profileLinksRow, error: profileLinksError },
    { data: profileSectionRows, error: profileSectionError },
    { data: profileFieldRows, error: profileFieldError },
    { data: profileEntryRows, error: profileEntryError },
    { data: profileFileRows, error: profileFileError },
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("user_id", userId).order("due", { ascending: true, nullsFirst: false }),
    supabase.from("cover_questions").select("*").eq("user_id", userId),
    supabase.from("topics").select("*").eq("user_id", userId).order("sort_order", { ascending: true }),
    supabase.from("interview_questions").select("*").eq("user_id", userId),
    // 옮긴 것과 뺀 것까지 다 읽는다. 화면에서 대기·옮김·지움으로 나눠 보여주고,
    // 되돌릴 수도 있어야 하기 때문이다.
    supabase
      .from("job_postings")
      .select("*")
      .eq("user_id", userId)
      .order("collected_at", { ascending: false }),
    supabase.from("material_groups").select("*").eq("user_id", userId).order("sort_order", { ascending: true }),
    supabase.from("materials").select("*").eq("user_id", userId),
    supabase.from("projects").select("*").eq("user_id", userId).order("sort_order", { ascending: true }),
    supabase.from("company_events").select("*").eq("user_id", userId),
    supabase.from("job_rules").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profile_links").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profile_sections").select("*").eq("user_id", userId).order("sort_order", { ascending: true }),
    supabase.from("profile_fields").select("*").eq("user_id", userId),
    supabase.from("profile_entries").select("*").eq("user_id", userId),
    supabase.from("profile_files").select("*").eq("user_id", userId).order("sort_order", { ascending: true }),
  ]);

  if (companyError) throw companyError;
  if (coverQuestionError) throw coverQuestionError;
  if (topicError) throw topicError;
  if (interviewQuestionError) throw interviewQuestionError;
  // 공고는 없어도 앱이 돌아야 한다. 0002 마이그레이션을 아직 안 올린 사이에
  // 여기서 던지면 자기소개서·면접 준비까지 같이 막힌다.
  if (jobError) console.error("공고를 읽지 못했다. supabase/schema.sql을 올렸는지 본다.", jobError);
  // 재료도 같은 이유로 다른 화면을 막지 않는다.
  const materialFailed = materialGroupError ?? materialError;
  if (materialFailed) console.error("재료를 읽지 못했다. supabase/schema.sql을 올렸는지 본다.", materialFailed);
  if (projectError) console.error("프로젝트를 읽지 못했다. supabase/schema.sql을 올렸는지 본다.", projectError);
  // 전형 일정이 없어도 회사는 보여야 한다.
  if (eventError) console.error("전형 일정을 읽지 못했다. supabase/schema.sql을 올렸는지 본다.", eventError);
  // 규칙이 없어도 공고는 보여야 한다.
  if (jobRulesError) console.error("필터링 규칙을 읽지 못했다. supabase/schema.sql을 올렸는지 본다.", jobRulesError);
  // 내 링크가 없어도 자기소개서는 보여야 한다.
  if (profileLinksError) console.error("내 링크를 읽지 못했다. supabase/schema.sql을 올렸는지 본다.", profileLinksError);
  // 인적사항이 없어도 다른 화면은 보여야 한다.
  const profileFailed = profileSectionError ?? profileFieldError ?? profileEntryError;
  if (profileFailed) console.error("인적사항을 읽지 못했다. supabase/schema.sql을 올렸는지 본다.", profileFailed);
  if (profileFileError) console.error("첨부 파일을 읽지 못했다. supabase/schema.sql을 올렸는지 본다.", profileFileError);
  const fieldsBySection = groupBy(profileFieldRows ?? [], (f) => f.section_id);
  const entriesBySection = groupBy(profileEntryRows ?? [], (e) => e.section_id);
  const eventsByCompany = groupBy(eventError ? [] : (eventRows ?? []), (e) => e.company_id);
  const materialsByGroup = groupBy(materialRows ?? [], (m) => m.group_id);

  const questionsByCompany = groupBy(coverQuestionRows ?? [], (q) => q.company_id);
  const questionsByTopic = groupBy(interviewQuestionRows ?? [], (q) => q.topic_id);

  return {
    periodList: periodRows.map((p) => p.name),
    companies: (companyRows ?? []).map((row) => mapCompanyRow(row, questionsByCompany.get(row.id) ?? [], eventsByCompany.get(row.id) ?? [])),
    topics: (topicRows ?? []).map((row) => mapTopicRow(row, questionsByTopic.get(row.id) ?? [])),
    materialGroups: materialFailed
      ? []
      : (materialGroupRows ?? []).map((row) => mapMaterialGroupRow(row, materialsByGroup.get(row.id) ?? [])),
    projects: projectError ? [] : (projectRows ?? []).map(mapProjectRow),
    jobs: jobError ? [] : (jobRows ?? []).map(mapJobPostingRow),
    jobRules: !jobRulesError && jobRulesRow ? mapJobRulesRow(jobRulesRow) : null,
    profileLinks: !profileLinksError && profileLinksRow ? mapProfileLinksRow(profileLinksRow) : { portfolio: "", resume: "" },
    profileSections: profileFailed
      ? []
      : (profileSectionRows ?? []).map((row) =>
          mapProfileSectionRow(row, fieldsBySection.get(row.id) ?? [], entriesBySection.get(row.id) ?? []),
        ),
    profileFiles: profileFileError ? [] : (profileFileRows ?? []).map(mapProfileFileRow),
  };
}
