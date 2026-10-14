/**
 * 수집한 공고를 키워드로 거른다. AI 없이 끝까지 돌리고 싶을 때 쓴다.
 *
 *   node scripts/pick.mjs                          out/ 에서 가장 최근 postings 파일
 *   node scripts/pick.mjs scripts/out/postings-2026-10-14.json
 *   node scripts/pick.mjs <파일> --out <저장할 파일>
 *   node scripts/pick.mjs <파일> --show-dropped    뺀 공고와 이유도 찍는다
 *
 * 기준은 scripts/sources.json 의 pick 에 적는다.
 *
 *   "pick": {
 *     "include": ["백엔드", "서버", "개발자"],  제목·직무에 하나라도 있어야 남긴다. 비우면 전부 통과
 *     "exclude": ["프론트", "iOS", "QA"],        제목에 하나라도 있으면 뺀다
 *     "newcomerOnly": true                       경력만 뽑는 공고를 뺀다
 *   }
 *
 * 키워드는 대소문자 없이 찾는다. include는 제목(title)과 직무(sector)에서, exclude는
 * 제목에서만 찾는다 — 사람인은 직무 칸에 "백엔드, 프론트엔드, 풀스택"처럼 여러 직무를
 * 한꺼번에 적어서, 직무 칸까지 보면 백엔드 공고도 프론트 키워드에 걸려 빠진다.
 * 사이트마다 sector에 담기는 것이 다르다 — 사람인은 직무·스택, 자소설닷컴은
 * 직무 이름(웹개발, 응용프로그래머 …), 인디스워크는 태그(IT개발 …)다.
 *
 * 결과는 scripts/out/picked-<날짜>.json 이다. 남긴 이유(걸린 키워드)를 각 항목의
 * note 에 적는다. 그다음 enrich.mjs → import.mjs 로 이어진다.
 * 이 파일을 손으로 고치거나 AI와 같이 더 줄여도 된다 — 모양만 같으면 된다.
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** 인자로 준 파일, 없으면 out/ 에서 가장 최근 postings 파일. */
async function resolveInput(argPath) {
  if (argPath) return argPath;

  const outDir = join(here, "out");
  let files = [];
  try {
    files = await readdir(outDir);
  } catch {
    // 아래에서 한꺼번에 안내한다.
  }
  const postings = files.filter((f) => /^postings-.*\.json$/.test(f)).sort().reverse();
  if (postings.length === 0) {
    throw new Error("scripts/out 에 postings 파일이 없다. 먼저 node scripts/collect.mjs 를 돌린다.");
  }
  return join(outDir, postings[0]);
}

async function loadRules() {
  let sources;
  try {
    sources = JSON.parse(await readFile(join(here, "sources.json"), "utf-8"));
  } catch {
    throw new Error(
      "scripts/sources.json 이 없다. cp scripts/sources.example.json scripts/sources.json 으로 만든다.",
    );
  }
  const pick = sources.pick ?? {};
  const words = (list) =>
    (Array.isArray(list) ? list : []).map((w) => String(w).trim()).filter(Boolean);
  return {
    include: words(pick.include),
    exclude: words(pick.exclude),
    newcomerOnly: pick.newcomerOnly === true,
  };
}

/** include를 찾을 글. 제목과 직무를 한 줄로 이어 소문자로 바꾼다. */
function haystack(item) {
  return [item.title, item.sector].filter(Boolean).join(" ").toLowerCase();
}

/** 이 글에 들어 있는 키워드들. */
function hits(text, words) {
  return words.filter((w) => text.includes(w.toLowerCase()));
}

const NEWCOMER_WORDS = ["신입", "무관", "인턴"];

/**
 * 경력만 뽑는 공고인가.
 * 경력 칸이 있으면 그걸로 본다("경력 3년↑"은 빼고 "신입·경력"은 남긴다).
 * 경력 칸이 빈 사이트(자소설닷컴 등)는 제목에 "경력"만 있고 "신입"이 없을 때만 뺀다.
 * 그 밖에는 남긴다 — 열어 봐야 알 수 있다.
 */
function careerOnly(item) {
  const career = (item.career ?? "").trim();
  if (career) return !NEWCOMER_WORDS.some((w) => career.includes(w));
  const title = item.title ?? "";
  return title.includes("경력") && !NEWCOMER_WORDS.some((w) => title.includes(w));
}

/** 남기면 { keep: true, note }, 빼면 { keep: false, reason }. */
function judge(item, rules) {
  const excluded = hits((item.title ?? "").toLowerCase(), rules.exclude);
  if (excluded.length) return { keep: false, reason: `제외 키워드: ${excluded.join(", ")}` };

  if (rules.newcomerOnly && careerOnly(item)) {
    return { keep: false, reason: `경력만: ${item.career || item.title}` };
  }

  if (rules.include.length === 0) return { keep: true, note: "" };
  const included = hits(haystack(item), rules.include);
  if (included.length === 0) return { keep: false, reason: "포함 키워드 없음" };
  return { keep: true, note: `키워드: ${included.join(", ")}` };
}

function todayStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function main() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const outArg = outIndex >= 0 ? args[outIndex + 1] : null;
  const showDropped = args.includes("--show-dropped");
  const inputArg = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");

  const rules = await loadRules();
  const inputPath = await resolveInput(inputArg);
  const parsed = JSON.parse(await readFile(inputPath, "utf-8"));
  const items = Array.isArray(parsed) ? parsed : (parsed.items ?? []);

  console.log(inputPath);
  console.log(
    `포함 ${rules.include.length ? rules.include.join(", ") : "(없음 — 전부 통과)"}` +
      ` · 제외 ${rules.exclude.length ? rules.exclude.join(", ") : "(없음)"}` +
      ` · 신입만 ${rules.newcomerOnly ? "예" : "아니오"}\n`,
  );

  const kept = [];
  const dropped = [];
  for (const item of items) {
    const result = judge(item, rules);
    if (result.keep) {
      // picked는 false로 둔다. 앱에서 picked는 "자기소개서로 옮김"이라는 뜻이다.
      const note = [item.note, result.note].filter(Boolean).join(" / ");
      kept.push({ ...item, picked: false, note });
    } else {
      dropped.push({ item, reason: result.reason });
    }
  }

  for (const item of kept) {
    console.log(`  + [${item.source}] ${item.company || "(회사 없음)"} — ${item.title}`);
  }
  if (showDropped) {
    console.log("");
    for (const { item, reason } of dropped) {
      console.log(`  - [${item.source}] ${item.company || "(회사 없음)"} — ${item.title}  (${reason})`);
    }
  }

  const stamp = /postings-(.+)\.json$/.exec(basename(inputPath))?.[1] ?? todayStamp();
  const outPath = outArg ?? join(here, "out", `picked-${stamp}.json`);
  await writeFile(
    outPath,
    JSON.stringify(
      { picked_at: new Date().toISOString(), from: inputPath, count: kept.length, items: kept },
      null,
      2,
    ),
    "utf-8",
  );

  console.log(`\n${items.length}건 중 ${kept.length}건을 남겼다. ${outPath}`);
  if (!showDropped && dropped.length) console.log("뺀 것과 이유를 보려면 --show-dropped 를 붙인다.");
  console.log("이제 node scripts/enrich.mjs <파일> 로 상세를 채우거나, 바로 import.mjs 로 넣는다.");
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
