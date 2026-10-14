/**
 * 인디스워크(inthiswork.com)를 읽는다. 사람이 골라 올리는 큐레이션이라 대기업·스타트업·
 * 외국계·공공기관이 섞여 있고, 다른 곳에 안 걸리는 회사 채용 페이지 공고가 많다.
 *
 * 워드프레스라 글 목록을 REST API가 준다. 화면(/it)은 최근 40건만 보여주고 올린 시각도
 * 마감일도 없어서, 같은 글을 API로 받는다.
 *
 *   GET /wp-json/wp/v2/posts?tags=<직무 태그>&categories=<신입/인턴 …>&after=<지난 수집 시각>
 *
 * 직무는 태그("IT개발")고 대상은 카테고리("신입/인턴", "주니어경력")다. 마감된 글은
 * "▶마감/비공개" 카테고리로 옮겨지므로 그 카테고리만 빼면 지원할 수 있는 것만 남는다.
 */

import * as cheerio from "cheerio";
import { fetchJson } from "../fetch.mjs";
import { isAllowed } from "../robots.mjs";

export const site = "inthiswork";

const ORIGIN = "https://inthiswork.com";
const API = `${ORIGIN}/wp-json/wp/v2`;

const PER_PAGE = 50;

const DEFAULT_TAG = "IT개발";
const DEFAULT_CATEGORIES = ["신입/인턴"];

/** 마감된 글이 옮겨지는 카테고리. 앞의 기호는 사이트가 붙인 것이라 뒤쪽만 맞춰 본다. */
const CLOSED_CATEGORY = "마감/비공개";

/** 직무가 아니라 마감 방식과 회사 종류를 가리키는 태그들. sector에는 넣지 않는다. */
const HAS_DUE = "기한있음";
const DUE_TAGS = new Set([HAS_DUE, "채용시마감", "상시채용"]);
const COMPANY_TAGS = new Set(["대기업", "스타트업", "외국계", "공공기관"]);

/** 제목에 섞여 오는 HTML 엔티티(&amp; &#8211; 등)를 글자로 되돌린다. */
function plain(html) {
  return cheerio
    .load(html ?? "")
    .text()
    .replace(/\s+/g, " ")
    .trim();
}

/** "회사｜공고 제목"을 둘로 가른다. 가름표가 없으면 회사명은 비워 둔다. */
function splitTitle(text) {
  const at = text.indexOf("｜");
  if (at < 0) return { company: "", title: text };
  return { company: text.slice(0, at).trim(), title: text.slice(at + 1).trim() };
}

/** "2026-10-15 23:59:00" -> { due: "2026-10-15", label: "~ 2026.10.15 23:59" } */
function parseDue(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(text ?? "");
  if (!m) return null;
  return { due: `${m[1]}-${m[2]}-${m[3]}`, label: `~ ${m[1]}.${m[2]}.${m[3]} ${m[4]}:${m[5]}` };
}

/** 태그나 카테고리 전체를 받아 id -> 이름으로. 둘 다 100개가 안 돼서 한 번이면 된다. */
async function termNames(kind) {
  const res = await fetchJson(`${API}/${kind}?per_page=100&_fields=id,name`);
  if (!res.ok || !Array.isArray(res.data)) {
    throw new Error(`${kind} 목록을 못 읽었다 (status ${res.status})`);
  }
  return new Map(res.data.map((t) => [t.id, plain(t.name)]));
}

function idOf(names, wanted) {
  for (const [id, name] of names) if (name === wanted) return id;
  return null;
}

export async function collect(target, log) {
  const pages = Math.max(1, Math.min(target.pages ?? 2, 10));
  const found = [];

  if (!(await isAllowed(`${API}/posts`))) {
    log("  robots.txt가 막은 주소다. 건너뛴다.");
    return found;
  }

  const tagNames = await termNames("tags");
  const categoryNames = await termNames("categories");

  const tagName = target.tag ?? DEFAULT_TAG;
  const tagId = idOf(tagNames, tagName);
  if (tagId === null) throw new Error(`모르는 태그: ${tagName}`);

  const categoryIds = [];
  for (const name of target.categories ?? DEFAULT_CATEGORIES) {
    const id = idOf(categoryNames, name);
    if (id === null) throw new Error(`모르는 카테고리: ${name}`);
    categoryIds.push(id);
  }

  const closedId = [...categoryNames].find(([, name]) => name.endsWith(CLOSED_CATEGORY))?.[0];

  for (let page = 1; page <= pages; page++) {
    const u = new URL(`${API}/posts`);
    u.searchParams.set("tags", String(tagId));
    u.searchParams.set("categories", categoryIds.join(","));
    if (closedId) u.searchParams.set("categories_exclude", String(closedId));
    // 올린 시각으로 걸러 주므로 지난번 이후 것만 온다.
    if (target.since) u.searchParams.set("after", target.since);
    u.searchParams.set("per_page", String(PER_PAGE));
    u.searchParams.set("page", String(page));
    // 본문은 받지 않는다. 고른 공고만 enrich에서 연다.
    u.searchParams.set(
      "_fields",
      "id,date,link,title,categories,tags,publishpress_future_action",
    );

    const res = await fetchJson(u.toString());
    if (!res.ok || !Array.isArray(res.data)) {
      // 마지막 쪽이 꽉 차 있었으면 그다음 쪽은 400으로 온다. 끝난 것이다.
      if (res.status !== 400) log(`  ${page}쪽 실패 (status ${res.status})`);
      break;
    }

    for (const post of res.data) {
      const tags = (post.tags ?? []).map((id) => tagNames.get(id)).filter(Boolean);
      const { company, title } = splitTitle(plain(post.title?.rendered));

      // 마감일이 없는 글에도 넉 달쯤 뒤로 만료가 걸려 있다. 기한있음일 때만 마감으로 읽는다.
      const due = tags.includes(HAS_DUE) ? parseDue(post.publishpress_future_action?.date) : null;

      found.push({
        source: site,
        external_id: String(post.id),
        url: post.link ?? `${ORIGIN}/archives/${post.id}`,
        company,
        title,
        location: "",
        career: (post.categories ?? [])
          .filter((id) => id !== closedId)
          .map((id) => categoryNames.get(id))
          .filter(Boolean)
          .join(", "),
        employment: tags.filter((t) => COMPANY_TAGS.has(t)).join(", "),
        sector: tags.filter((t) => !DUE_TAGS.has(t) && !COMPANY_TAGS.has(t)).join(", "),
        due_text: due?.label ?? tags.find((t) => DUE_TAGS.has(t) && t !== HAS_DUE) ?? "",
        due: due?.due ?? null,
        raw: { label: target.label ?? "", tags, posted_at: post.date ?? null },
      });
    }

    log(`  ${page}쪽에서 ${res.data.length}건`);
    if (res.data.length < PER_PAGE) break;
  }

  return found;
}

/**
 * 공고 하나를 열어 실제로 지원하는 곳 주소를 찾는다.
 *
 * 글 본문은 포스터 한 장일 때가 많고 맨 아래에 "지원하러 가기" 버튼이 있다.
 * 자소서 문항과 전형 조건은 여기에 없다 — 회사 채용 페이지에서 직접 본다.
 */
export async function enrich(item, log) {
  const id = item.external_id;
  if (!id) return item;

  const res = await fetchJson(`${API}/posts/${id}?_fields=content`);
  if (!res.ok) {
    log(`  상세 실패 (${res.status}) ${item.company}`);
    return item;
  }

  const $ = cheerio.load(res.data?.content?.rendered ?? "");
  const href = $("a")
    .filter((_, a) => $(a).text().includes("지원하러 가기"))
    .last()
    .attr("href");

  log(`  ${item.company || item.title} — ${href ? "지원 주소 찾음" : "지원 주소 없음"}`);

  return href ? { ...item, apply_url: href } : item;
}
