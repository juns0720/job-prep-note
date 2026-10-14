/**
 * 고른 공고에만 상세를 채운다.
 *
 *   node scripts/enrich.mjs scripts/out/picked-2026-09-23.json
 *   node scripts/enrich.mjs <파일> --out <저장할 파일>
 *
 * 수집(collect)은 목록만 훑어 가볍게 끝내고, 지원할 만하다고 고른 것에만
 * 공고를 하나씩 더 열어 본다. 전형 조건과 자소서 문항이 거기 있다.
 * 58건이면 요청이 100번쯤 나가고 몇 분 걸린다 — 목록 수집 때마다 할 일은 아니다.
 *
 * 공고 상세를 줄 수 있는 곳만 그 단계를 한다(자소설닷컴, 그리고 지원 주소만 주는
 * 인디스워크). 나머지는 건너뛴다.
 * 회사 평판(잡플래닛)은 어디서 모은 공고든 회사명만 있으면 붙인다.
 *
 *   node scripts/enrich.mjs <파일> --no-company   회사 평판은 건너뛴다
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as jasoseol from "./lib/adapters/jasoseol.mjs";
import * as inthiswork from "./lib/adapters/inthiswork.mjs";
import * as jobplanet from "./lib/adapters/jobplanet.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const ENRICHERS = {
  [jasoseol.site]: jasoseol.enrich,
  [inthiswork.site]: inthiswork.enrich,
};

const log = (msg) => console.log(msg);

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args.find((a) => !a.startsWith("--")) ?? join(here, "out", "picked.json");
  const outIndex = args.indexOf("--out");
  const outPath = outIndex >= 0 ? args[outIndex + 1] : inputPath;
  const withCompany = !args.includes("--no-company");

  const parsed = JSON.parse(await readFile(inputPath, "utf-8"));
  const items = Array.isArray(parsed) ? parsed : (parsed.items ?? []);

  const canEnrich = items.filter((i) => ENRICHERS[i.source]).length;
  log(`${inputPath}`);
  log(`${items.length}건 중 ${canEnrich}건에 상세를 채운다.\n`);

  const out = [];
  let withQuestions = 0;
  let withCompanyInfo = 0;

  // 같은 회사가 여러 공고를 내면 한 번만 찾아본다.
  const companyCache = new Map();

  for (const item of items) {
    let filled = item;

    const enrich = ENRICHERS[item.source];
    if (enrich) {
      try {
        filled = await enrich(filled, log);
        if (filled.questions?.length) withQuestions++;
      } catch (e) {
        log(`  ! ${item.company} 상세 실패: ${e?.message ?? e}`);
      }
    }

    if (withCompany && filled.company) {
      try {
        if (!companyCache.has(filled.company)) {
          companyCache.set(filled.company, await jobplanet.lookup(filled.company, log));
        }
        const info = companyCache.get(filled.company);
        if (info) {
          filled = { ...filled, company_info: info };
          withCompanyInfo++;
        }
      } catch (e) {
        log(`  ! ${item.company} 평판 실패: ${e?.message ?? e}`);
      }
    }

    out.push(filled);
  }

  const body = Array.isArray(parsed)
    ? out
    : { ...parsed, count: out.length, items: out };

  await writeFile(outPath, JSON.stringify(body, null, 2), "utf-8");
  log(`\n자소서 문항 ${withQuestions}건 · 회사 평판 ${withCompanyInfo}건. ${outPath}`);
  log("이제 node scripts/import.mjs <파일> 로 넣는다.");
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
