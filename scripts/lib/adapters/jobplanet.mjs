/**
 * 잡플래닛에서 회사 평판을 가져온다. 공고를 모으는 곳이 아니라, 이미 모은 공고에
 * "이 회사 어떤 곳인가"를 붙이는 용도다.
 *
 *   GET /search?query=<회사명>            검색 결과에서 회사 id를 찾고
 *   GET /api/v1/companies/{id}/summary    평점과 연봉을 받는다
 *
 * robots.txt는 이 두 경로를 막지 않는다. 다만 잡플래닛은 스크립트에서 오는 요청을
 * 403으로 돌려보낸다(브라우저 지문을 본다). 그래서 브라우저에서 쓰던 쿠키가 있어야
 * 한다 — .env.local 의 JOBPLANET_COOKIE 에 넣는다. 없으면 이 단계는 건너뛰고,
 * 앱에서는 회사명으로 검색하는 링크만 보여준다.
 *
 * 직무별·연차별 연봉은 가져오지 않는다. robots.txt가 /companies/*\/salaries_of_job_rank/
 * 를 막고 있고, 화면에서도 멤버십이나 본인 연봉 등록을 요구하는 자리다.
 * 여기서 받는 연봉은 회사 전체 기준의 평균과 범위다.
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { fetchJson, fetchText } from "../fetch.mjs";
import { isAllowed } from "../robots.mjs";

export const site = "jobplanet";

const ORIGIN = "https://www.jobplanet.co.kr";

const here = dirname(fileURLToPath(import.meta.url));

let cookieCache;

/** .env.local 의 JOBPLANET_COOKIE. 없으면 빈 문자열. */
async function cookie() {
  if (cookieCache !== undefined) return cookieCache;
  try {
    const text = await readFile(join(here, "..", "..", "..", ".env.local"), "utf-8");
    const m = /^\s*JOBPLANET_COOKIE\s*=\s*(.*)$/m.exec(text);
    cookieCache = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    cookieCache = "";
  }
  return cookieCache;
}

/** 브라우저에서 온 것처럼 보이게 하는 헤더. 쿠키가 없으면 어차피 403이다. */
async function browserHeaders(extra = {}) {
  const c = await cookie();
  return {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
    "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Upgrade-Insecure-Requests": "1",
    ...(c ? { Cookie: c } : {}),
    ...extra,
  };
}

/** 이 단계를 돌릴 수 있는지. 쿠키가 없으면 아예 시도하지 않는다. */
export async function ready() {
  return (await cookie()).length > 0;
}

/** 앱에서 회사명으로 바로 찾아볼 수 있는 검색 주소. 데이터가 없어도 이건 쓸 수 있다. */
export function searchUrl(name) {
  return `${ORIGIN}/search?query=${encodeURIComponent(cleanName(name))}`;
}

/** 회사명에서 검색에 방해되는 법인 표기를 걷어낸다. */
function cleanName(name) {
  return name
    .replace(/\((주|재|사|유|합)\)/g, " ")
    .replace(/주식회사|㈜/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 검색 결과에서 회사 id를 찾는다.
 *
 * 페이지 위쪽에는 검색어와 무관한 추천·광고 기업이 먼저 나온다. "기업 16" 같은
 * 헤더를 앵커로 삼아 그 아래 묶음만 본다. 잡플래닛 검색이 영문과 한글 법인명을
 * 이어주므로("NHN" -> "엔에이치엔(주)") 이름을 우리가 맞춰볼 필요는 없다.
 */
async function findCompanyId(name, log) {
  const url = `${ORIGIN}/search/companies?query=${encodeURIComponent(cleanName(name))}`;
  if (!(await isAllowed(url))) return null;

  const res = await fetchText(url, { headers: await browserHeaders() });
  if (!res.ok) {
    if (res.status === 403) log("  잡플래닛이 막았다(403). JOBPLANET_COOKIE를 확인한다.");
    return null;
  }

  const $ = cheerio.load(res.text);

  // 결과 맨 위에는 검색어와 무관한 광고가 섞인다. 첫 번째를 집지 않고
  // 후보를 전부 모은 다음 이름이 맞는 것을 고른다.
  const candidates = [];
  $('a[href*="/companies/"]').each((_, el) => {
    const $a = $(el);
    const m = /\/companies\/(\d+)/.exec($a.attr("href") ?? "");
    if (!m) return;
    // 링크 글에는 회사명 뒤로 업종·지역·평점이 붙는다. 앞부분만 쓴다.
    const text = $a.text().replace(/\s+/g, " ").trim();
    const head = text.split(/IT\/|제조\/|유통\/|미디어\/|서비스업|교육업|의료\/|기관\/|금융|건설|∙/)[0].trim();
    if (head) candidates.push({ id: m[1], label: head });
  });

  const hit = candidates.find((c) => looksSame(name, c.label));
  return hit ?? null;
}

/**
 * 두 회사명이 같은 곳을 가리키는지. 법인 표기와 공백을 걷어내고 견준다.
 * 한쪽이 영문 약자면("NHN" vs "엔에이치엔(주)") 이어지지 않으니 버려진다 —
 * 놓치는 편이 엉뚱한 회사를 붙이는 것보다 낫다.
 */
function looksSame(a, b) {
  const norm = (x) =>
    x.replace(/\((주|재|사|유|합)\)/g, "").replace(/주식회사|㈜/g, "").replace(/\s+/g, "").toLowerCase();
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // 한쪽이 다른 쪽을 품되 길이 차이가 크지 않을 때만 같다고 본다.
  const shorter = x.length <= y.length ? x : y;
  const longer = x.length <= y.length ? y : x;
  return longer.includes(shorter) && longer.length - shorter.length <= 2;
}

/** 소수 비율(0.61)을 퍼센트(61)로. 값이 없으면 null. */
function pct(v) {
  return typeof v === "number" ? Math.round(v * 100) : null;
}

function round1(v) {
  return typeof v === "number" ? Math.round(v * 10) / 10 : null;
}

/**
 * 회사 하나의 평판. 못 찾으면 null을 준다 — 이름이 너무 흔하거나 잡플래닛에
 * 없는 회사도 많아서, 없다고 실패로 다루지 않는다.
 */
export async function lookup(companyName, log = () => {}) {
  if (!companyName) return null;

  const found = await findCompanyId(companyName, log);
  if (!found) {
    log(`  ${companyName} — 잡플래닛에서 못 찾음`);
    return null;
  }

  const res = await fetchJson(`${ORIGIN}/api/v1/companies/${found.id}/summary`, {
    headers: await browserHeaders({
      Accept: "application/json",
      Referer: `${ORIGIN}/companies/${found.id}`,
    }),
  });
  const company = res.ok ? res.data?.company : null;
  if (!company) {
    log(`  ${companyName} — 요약을 못 받음`);
    return null;
  }

  // 검색 결과 맨 위가 광고일 때가 있어서 엉뚱한 회사가 걸린다. 이름이 서로
  // 이어지지 않으면 버린다 — 틀린 회사 정보는 없느니만 못하다.
  if (!looksSame(companyName, company.name ?? "")) {
    log(`  ${companyName} — 엉뚱한 회사(${company.name})가 걸려 버린다`);
    return null;
  }

  // 사원수·매출·설립연도. 중소·중견·대기업을 가늠하는 숫자다.
  const infoRes = await fetchJson(`${ORIGIN}/api/v1/companies/${found.id}/info`, {
    headers: await browserHeaders({ Accept: "application/json" }),
  });
  const ci = infoRes.ok ? (infoRes.data?.company ?? {}) : {};

  const r = company.review_info ?? {};
  const s = company.salary_info ?? {};

  const info = {
    source: site,
    company_id: Number(found.id),
    // 어떤 회사로 매칭됐는지 남긴다. 엉뚱한 곳이 걸렸는지 눈으로 볼 수 있어야 한다.
    matched_name: company.name ?? found.label,
    url: `${ORIGIN}/companies/${found.id}`,
    rating: round1(company.rate_total_avg),
    ratings: {
      compensation: round1(r.compensation_avg),
      worklife: round1(r.worklife_balance_avg),
      culture: round1(r.culture_avg),
      advancement: round1(r.advancement_avg),
      management: round1(r.management_avg),
    },
    recommend_rate: pct(r.recommended_rate),
    ceo_support_rate: pct(r.ceo_support_rate),
    growth_rate: pct(r.next_year_rate),
    // 만원 단위. 회사 전체 기준이고 직무별이 아니다.
    salary: { avg: s.avg ?? null, min: s.min ?? null, max: s.max ?? null },
    scale: {
      employees: ci.employee_count || null,
      revenue: ci.revenue || null,
      founded: ci.founded_at ? String(ci.founded_at).slice(0, 4) : null,
      industry: ci.business_type_korean ?? null,
    },
    counts: {
      review: company.review_count ?? null,
      salary: company.salary_count ?? null,
      interview: company.interview_count ?? null,
    },
  };

  log(
    `  ${companyName} → ${info.matched_name} · 평점 ${info.rating ?? "-"}` +
      (info.salary.avg ? ` · 평균 ${info.salary.avg}만원` : ""),
  );
  return info;
}
