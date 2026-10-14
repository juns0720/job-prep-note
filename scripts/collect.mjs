/**
 * 공고 수집기. 직접 돌린다.
 *
 *   node scripts/collect.mjs                 지난번 수집 이후에 올라온 것만
 *   node scripts/collect.mjs --all           처음부터 다시 (마감 안 지난 것 전부)
 *   node scripts/collect.mjs --only saramin  한 사이트만
 *
 * 언제까지 수집했는지는 scripts/state.json 에 사이트별로 남는다. 그래서 그냥
 * 돌리면 지난번 이후에 새로 뜬 공고만 모인다. 이미 넣어둔 공고는 임포터가
 * 또 걸러내므로 --all 로 전부 긁어도 중복으로 쌓이지는 않는다.
 *
 * 무엇을 모을지는 scripts/sources.json 에 적는다(sources.example.json 을 복사해서 만든다).
 * 결과는 scripts/out/postings-<날짜>.json 에 쌓인다(커밋하지 않는다).
 * 그다음 scripts/pick.mjs 로 고르고, scripts/import.mjs 로 앱에 넣는다.
 *
 * 상대 서버를 배려하는 부분은 lib/fetch.mjs(요청 간격)와 lib/robots.mjs에 있다.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { lastRunOf, loadState, saveState } from "./lib/state.mjs";
import * as saramin from "./lib/adapters/saramin.mjs";
import * as jasoseol from "./lib/adapters/jasoseol.mjs";
import * as inthiswork from "./lib/adapters/inthiswork.mjs";
import * as manual from "./lib/adapters/manual.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const ADAPTERS = {
  [saramin.site]: saramin,
  [jasoseol.site]: jasoseol,
  [inthiswork.site]: inthiswork,
  [manual.site]: manual,
};

const log = (msg) => console.log(msg);

function todayStamp() {
  const now = new Date();
  const seoul = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return seoul;
}

/** 같은 주소가 여러 번 나오면 한 번만 남긴다. */
function dedupe(items) {
  const seen = new Map();
  for (const item of items) {
    const key = item.url;
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()];
}

/**
 * 근무지가 regions(예: 서울·경기)로 시작하지 않는 공고를 뺀다.
 * 사람인은 검색 주소의 loc_mcd로 이미 좁혀 오지만, 주소를 갈아끼우다 조건이
 * 빠져도 여기서 한 번 더 걸러진다. 지역을 주지 않는 사이트(자소설·인디스워크)는
 * 근무지가 비어 있으니 남긴다 — 열어 봐야 알 수 있다.
 */
function inRegions(item, regions) {
  if (!regions?.length) return true;
  const location = (item.location ?? "").trim();
  if (!location) return true;
  return regions.some((r) => location.startsWith(r));
}

async function main() {
  const onlyIndex = process.argv.indexOf("--only");
  const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;
  const fromScratch = process.argv.includes("--all");

  const state = await loadState();

  const sourcesPath = join(here, "sources.json");
  let sources;
  try {
    sources = JSON.parse(await readFile(sourcesPath, "utf-8"));
  } catch (e) {
    if (e?.code !== "ENOENT") throw e;
    console.log("scripts/sources.json 이 없다. 예시를 복사해서 자기 조건으로 고친다.");
    console.log("  cp scripts/sources.example.json scripts/sources.json");
    return;
  }
  const targets = (sources.targets ?? []).filter(
    (t) => t.enabled !== false && (!only || t.site === only),
  );

  if (targets.length === 0) {
    console.log("수집할 대상이 없다. scripts/sources.json 을 확인한다.");
    return;
  }

  const collected = [];
  const done = new Set();
  for (const target of targets) {
    const adapter = ADAPTERS[target.site];
    if (!adapter) {
      log(`! 모르는 site: ${target.site} — 건너뛴다`);
      continue;
    }
    log(`\n[${target.site}] ${target.label ?? target.url ?? ""}`);
    const since = fromScratch ? null : lastRunOf(state, target.site);
    if (since) log(`  ${since.slice(0, 10)} 이후에 올라온 것만`);

    try {
      const found = await adapter.collect({ ...target, since }, log);
      log(`  -> ${found.length}건`);
      collected.push(...found);
      done.add(target.site);
    } catch (e) {
      log(`  ! 실패: ${e?.message ?? e}`);
    }
  }

  const unique = dedupe(collected);
  const items = unique.filter((item) => inRegions(item, sources.regions));
  if (items.length < unique.length) {
    log(`\n근무지가 ${sources.regions.join("·")} 밖인 ${unique.length - items.length}건은 뺐다.`);
  }

  const outDir = join(here, "out");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `postings-${todayStamp()}.json`);

  if (done.size > 0) await saveState(state, done);

  await writeFile(
    outPath,
    JSON.stringify({ collected_at: new Date().toISOString(), count: items.length, items }, null, 2),
    "utf-8",
  );

  log(`\n모두 ${items.length}건. ${outPath}`);
  log("다음 순서로 이어 간다.");
  log("  node scripts/pick.mjs            키워드로 고르고 (picked-<날짜>.json)");
  log("  node scripts/enrich.mjs <파일>   자소서 문항·전형 조건을 채우고");
  log("  node scripts/import.mjs <파일>   앱에 넣는다.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
