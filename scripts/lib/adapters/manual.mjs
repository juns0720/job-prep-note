/**
 * 내가 직접 모은 공고 주소를 읽는다. 사이트를 가리지 않는다.
 *
 * 목록을 긁지 않고 준 주소만 하나씩 열어 제목 정도만 뽑는다. 사이트마다 구조가
 * 다르니 og: 메타태그와 <title>에 기대고, 회사명은 대개 못 읽는다 —
 * 그건 내가 훑어볼 때 채우면 된다.
 *
 * 봇을 막아둔 곳(원티드 등)도 여기서는 열릴 때가 있다. 안 열리면 제목 없이
 * 주소만 남긴다. 주소가 남으면 나중에 직접 열어볼 수 있다.
 */

import * as cheerio from "cheerio";
import { fetchText } from "../fetch.mjs";

export const site = "manual";

function meta($, name) {
  return (
    $(`meta[property="${name}"]`).attr("content") ??
    $(`meta[name="${name}"]`).attr("content") ??
    ""
  ).trim();
}

export async function collect(target, log) {
  const urls = target.urls ?? [];
  const found = [];

  for (const url of urls) {
    const res = await fetchText(url);

    if (!res.ok) {
      log(`  못 읽었다 (status ${res.status}) — 주소만 남긴다: ${url}`);
      found.push({
        source: site,
        external_id: null,
        url,
        company: "",
        title: "",
        location: "",
        career: "",
        employment: "",
        sector: "",
        due_text: "",
        due: null,
        raw: { label: target.label ?? "", fetch_failed: true, status: res.status },
      });
      continue;
    }

    const $ = cheerio.load(res.text);
    const title = meta($, "og:title") || $("title").text().trim();

    found.push({
      source: site,
      external_id: null,
      url: res.url || url,
      company: meta($, "og:site_name"),
      title: title.replace(/\s+/g, " ").slice(0, 300),
      location: "",
      career: "",
      employment: "",
      sector: "",
      due_text: "",
      due: null,
      raw: { label: target.label ?? "", description: meta($, "og:description").slice(0, 500) },
    });
    log(`  ${title ? title.slice(0, 40) : "(제목 없음)"}`);
  }

  return found;
}
