/**
 * 자소설닷컴 채용 캘린더를 읽는다. 대기업·공기업 공채가 많아서 사람인과 겹치지 않는다.
 *
 * 화면은 달력이고 목록은 이 API가 준다.
 *
 *   POST /employment/calendar_list.json
 *   { "start_time": "2026-10-01", "end_time": "2026-10-31" }
 *
 * 한 번에 한 달치를 주므로 months만큼 달을 넘겨가며 부른다. 직무로 거르는 파라미터는
 * 서버에 없다(보내도 무시한다) — 받아온 다음 duty_groups로 우리가 거른다.
 */

import { fetchJson } from "../fetch.mjs";
import { isAllowed } from "../robots.mjs";

export const site = "jasoseol";

const ORIGIN = "https://jasoseol.com";
const LIST_URL = `${ORIGIN}/employment/calendar_list.json`;

/** IT·인터넷(대분류 94) 아래의 직무 코드. 사이트의 직무 트리에서 그대로 가져왔다. */
export const DUTY_NAMES = {
  160: "QA",
  161: "앱개발",
  162: "웹개발",
  163: "데이터엔지니어·분석·DBA",
  164: "시스템프로그래머",
  165: "응용프로그래머",
  166: "네트워크·보안·운영",
  167: "빅데이터·AI(인공지능)",
  168: "게임개발",
  169: "HW·임베디드",
  170: "SW·솔루션·ERP",
  171: "서비스기획·PM",
};

/** 백엔드·인프라에 해당하는 것들. sources.json에서 dutyGroups로 덮어쓸 수 있다. */
const DEFAULT_DUTIES = [162, 163, 164, 165, 166, 170];

/** 그 달의 1일과 말일. */
function monthRange(base, offset) {
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const year = d.getFullYear();
  const month = d.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, "0");
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(last).padStart(2, "0")}`,
    label: `${year}-${mm}`,
  };
}

/** "2026-10-02T23:59:00.000+09:00" -> "2026-10-02" */
function dateOnly(iso) {
  if (typeof iso !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return m ? m[1] : null;
}

/** "2026-10-02T23:59:00.000+09:00" -> "~ 2026.10.02 23:59" */
function dueLabel(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso ?? "");
  if (!m) return "";
  return `~ ${m[1]}.${m[2]}.${m[3]} ${m[4]}:${m[5]}`;
}

/** 이 공고가 걸린 직무 코드를 모은다. 한 공고에 여러 직무가 붙는다. */
function dutyIdsOf(entry) {
  const ids = new Set();
  for (const em of entry.employments ?? []) {
    for (const g of em.duty_groups ?? []) {
      if (typeof g?.group_id === "number") ids.add(g.group_id);
    }
  }
  return [...ids];
}

export async function collect(target, log) {
  const months = Math.max(1, Math.min(target.months ?? 3, 12));
  const duties = new Set(target.dutyGroups ?? DEFAULT_DUTIES);
  const today = new Date();
  const found = [];

  // 이번 달 목록에는 이미 마감된 공고가 섞여 들어온다. 지원할 수 없는 것을 쌓아봐야
  // 새로 뜬 공고만 묻히므로 기본으로 뺀다. includeClosed를 켜면 그대로 가져온다.
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
  const includeClosed = target.includeClosed === true;
  let skippedClosed = 0;

  // 지난번 수집 이후에 올라온 공고만 본다. 목록은 마감일 기준으로 오므로
  // 지난달에 뜬 공고가 이번 달 목록에도 계속 나온다 — start_time으로 거른다.
  const since = target.since ?? null;
  let skippedOld = 0;

  if (!(await isAllowed(LIST_URL))) {
    log("  robots.txt가 막은 주소다. 건너뛴다.");
    return found;
  }

  for (let i = 0; i < months; i++) {
    const { start, end, label } = monthRange(today, i);

    const res = await fetchJson(LIST_URL, {
      method: "POST",
      body: JSON.stringify({ start_time: start, end_time: end }),
    });

    if (!res.ok) {
      log(`  ${label} 실패 (status ${res.status})`);
      continue;
    }

    const list = res.data?.employment ?? [];
    let kept = 0;

    for (const entry of list) {
      const ids = dutyIdsOf(entry);
      const matched = ids.filter((id) => duties.has(id));
      if (matched.length === 0) continue;

      const due = dateOnly(entry.end_time);
      if (!includeClosed && due && due < todayStr) {
        skippedClosed++;
        continue;
      }

      if (since && typeof entry.start_time === "string" && entry.start_time < since) {
        skippedOld++;
        continue;
      }

      found.push({
        source: site,
        external_id: String(entry.id),
        url: `${ORIGIN}/recruit/${entry.id}`,
        company: entry.name ?? "",
        title: entry.title ?? "",
        location: "",
        // 자소설은 경력 조건을 따로 주지 않는다. 제목에 드러나는 경우가 많다.
        career: "",
        employment: entry.business_size === "big_business" ? "대기업" : "",
        sector: matched.map((id) => DUTY_NAMES[id] ?? id).join(", "),
        due_text: dueLabel(entry.end_time),
        due,
        raw: {
          label: target.label ?? "",
          duty_group_ids: ids,
          start_time: entry.start_time ?? null,
          business_size: entry.business_size ?? null,
        },
      });
      kept++;
    }

    log(`  ${label}: ${list.length}건 중 ${kept}건`);
  }

  if (skippedClosed > 0) log(`  (마감 지난 ${skippedClosed}건은 뺐다)`);
  if (skippedOld > 0) log(`  (지난번 수집 전에 올라온 ${skippedOld}건은 뺐다)`);

  return found;
}

/**
 * 공고 하나를 더 깊이 들여다본다. 목록에는 없는 것들이 여기 있다.
 *
 *   GET  /api/v1/employment_companies/{id}   전형 조건과 회사 채용 페이지 주소
 *   POST /employment/employment_question.json { employment_id }   자소서 문항
 *
 * 문항의 employment_id는 공고 id가 아니라 그 안의 모집 직무 id다.
 * 목록 API가 주는 employments[].id를 써야 한다.
 */
export async function enrich(item, log) {
  const id = item.external_id;
  if (!id) return item;

  const detail = await fetchJson(`${ORIGIN}/api/v1/employment_companies/${id}?skip_read_log=true`);
  if (!detail.ok) {
    log(`  상세 실패 (${detail.status}) ${item.company}`);
    return item;
  }

  const data = detail.data ?? {};
  const employments = Array.isArray(data.employments) ? data.employments : [];

  // 모집 직무가 여럿이면 우리가 고른 직무 코드에 걸리는 것을 먼저 본다.
  const wanted = new Set(item.raw?.duty_group_ids ?? []);
  const primary =
    employments.find((e) => (e.duty_group_ids ?? []).some((g) => wanted.has(g))) ?? employments[0];

  const process = primary
    ? {
        field: primary.field ?? null,
        work_type: primary.work_type ?? null,
        written_test: primary.written_test ?? null,
        graduate_condition: primary.graduate_condition ?? null,
        linkage_recruitment: primary.linkage_recruitment ?? null,
        self_introduction_type: primary.self_introduction_type ?? null,
        english_score_requirement: primary.english_score_requirement ?? null,
        certificate_requirement: primary.certificate_requirement ?? null,
        division: primary.division ?? null,
      }
    : null;

  let questions = null;
  if (primary?.has_resume && primary?.id) {
    const res = await fetchJson(`${ORIGIN}/employment/employment_question.json`, {
      method: "POST",
      body: JSON.stringify({ employment_id: primary.id }),
    });
    const list = res.ok ? (res.data?.employment_question ?? []) : [];
    if (list.length > 0) {
      questions = list
        .map((q) => ({
          number: q.number ?? null,
          question: (q.question ?? "").replace(/\r\n/g, "\n").trim(),
          // total_count가 0이면 제한이 없다는 뜻이다. 그럴 때는 비워 둔다.
          limit: q.total_count > 0 ? q.total_count : null,
          include_space: q.include_space ?? null,
        }))
        .filter((q) => q.question)
        .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    }
  }

  log(
    `  ${item.company} — 문항 ${questions ? questions.length : 0}개` +
      (process?.written_test ? ` · 필기 ${process.written_test}` : ""),
  );

  return {
    ...item,
    apply_url: data.employment_page_url ?? "",
    process,
    questions,
  };
}
