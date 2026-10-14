/**
 * 사람인 검색 결과를 읽는다.
 *
 * 검색 조건을 코드에 박지 않는다. 사람인에서 원하는 조건으로 검색한 뒤 그 주소를
 * 그대로 sources.json에 넣으면, 여기서는 페이지 번호만 바꿔가며 읽는다.
 * 조건을 바꾸고 싶으면 사이트에서 다시 검색해 주소만 갈아끼우면 된다.
 *
 * 페이지는 UTF-8이고 공고 하나가 .item_recruit 한 덩어리다.
 */

import * as cheerio from "cheerio";
import { fetchText } from "../fetch.mjs";
import { isAllowed } from "../robots.mjs";

export const site = "saramin";

const ORIGIN = "https://www.saramin.co.kr";

function pageUrl(baseUrl, page) {
  const u = new URL(baseUrl);
  u.searchParams.set("recruitPage", String(page));
  return u.toString();
}

/**
 * 공고 주소에서 rec_idx만 남긴다.
 *
 * 목록에서 뽑은 주소에는 어떤 검색어로 찾았는지(searchword)와 한 번 쓰고 버리는
 * search_uuid가 붙어 있다. 그대로 두면 "백엔드"로 찾은 공고와 "서버 개발"로 찾은
 * 같은 공고가 서로 다른 주소가 되어 두 줄로 쌓인다.
 */
function canonicalUrl(href) {
  const u = new URL(href, ORIGIN);
  const recIdx = u.searchParams.get("rec_idx");
  if (!recIdx) return u.toString();
  return `${ORIGIN}/zf_user/jobs/relay/view?rec_idx=${recIdx}`;
}

/** "~ 10/25(일)" 처럼 연도가 없는 표기를 날짜로. 이미 지난 달이면 내년으로 본다. */
function parseDue(text) {
  const m = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(text ?? "");
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (!month || !day) return null;

  const today = new Date();
  let year = today.getFullYear();
  const candidate = new Date(year, month - 1, day);
  // 마감일이 오늘보다 두 달 이상 지났으면 내년 공고로 읽는다.
  if (candidate.getTime() < today.getTime() - 60 * 86400000) year += 1;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function textOf($el) {
  return $el.text().replace(/\s+/g, " ").trim();
}

/** .job_sector 끝에는 "수정일 26/09/23" 같은 꼬리가 붙는다. 분야만 남긴다. */
function cleanSector(text) {
  return text.replace(/\s*(수정일|등록일)\s*\d{2}\/\d{2}\/\d{2}\s*$/, "").trim();
}

export async function collect(target, log) {
  const pages = Math.max(1, Math.min(target.pages ?? 1, 10));
  const found = [];

  for (let page = 1; page <= pages; page++) {
    const url = pageUrl(target.url, page);

    if (!(await isAllowed(url))) {
      log(`  robots.txt가 막은 주소라 건너뛴다: ${url}`);
      break;
    }

    const res = await fetchText(url);
    if (!res.ok) {
      log(`  ${page}쪽 실패 (status ${res.status})`);
      break;
    }

    const $ = cheerio.load(res.text);
    const items = $(".item_recruit");
    if (items.length === 0) {
      log(`  ${page}쪽에 공고가 없다. 여기서 멈춘다.`);
      break;
    }

    items.each((_, el) => {
      const $item = $(el);
      const $link = $item.find(".job_tit a").first();
      const href = $link.attr("href");
      if (!href) return;

      const conditions = $item
        .find(".job_condition span")
        .map((__, s) => textOf($(s)))
        .get()
        .filter(Boolean);

      const dueText = textOf($item.find(".job_date .date").first());

      found.push({
        source: site,
        external_id: $item.attr("value") ?? null,
        url: canonicalUrl(href),
        company: textOf($item.find(".corp_name a").first()),
        // title 속성이 말줄임 없는 원문이다.
        title: ($link.attr("title") ?? textOf($link)).trim(),
        location: conditions[0] ?? "",
        career: conditions[1] ?? "",
        employment: conditions[3] ?? "",
        sector: cleanSector(textOf($item.find(".job_sector").first())),
        due_text: dueText,
        due: parseDue(dueText),
        raw: { conditions, label: target.label ?? "" },
      });
    });

    log(`  ${page}쪽에서 ${items.length}건`);
  }

  return found;
}
