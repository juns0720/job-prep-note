/**
 * 수집(또는 선별)한 공고를 앱의 job_postings에 넣는다.
 *
 *   node scripts/import.mjs                       out/ 에서 가장 최근 파일
 *   node scripts/import.mjs scripts/out/picked-2026-09-23.json
 *   node scripts/import.mjs <파일> --update       이미 있는 공고도 덮어쓴다
 *
 * 앱과 똑같이 이메일·비밀번호로 로그인해서 내 계정으로 넣는다 — RLS가 그대로 걸린 채로
 * 들어간다는 뜻이다. 계정을 주는 방법은 lib/session.mjs 에 있다.
 */

import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { signIn } from "./lib/session.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/** 인자로 준 파일, 없으면 out/ 에서 가장 최근 것. */
async function resolveInput(argPath) {
  if (argPath) return argPath;

  const outDir = join(here, "out");
  const files = (await readdir(outDir))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) throw new Error("scripts/out 에 json이 없다. 먼저 collect를 돌린다.");
  return join(outDir, files[0]);
}

function toRow(item, userId) {
  return {
    user_id: userId,
    source: item.source ?? "manual",
    external_id: item.external_id ?? null,
    url: item.url,
    company: item.company ?? "",
    title: item.title ?? "",
    location: item.location ?? "",
    career: item.career ?? "",
    employment: item.employment ?? "",
    sector: item.sector ?? "",
    due_text: item.due_text ?? "",
    due: item.due ?? null,
    picked: item.picked ?? false,
    dismissed: item.dismissed ?? false,
    note: item.note ?? "",
    raw: item.raw ?? null,
    // enrich 단계에서 채워지는 것들. 안 돌렸으면 비어 있다.
    apply_url: item.apply_url ?? "",
    process: item.process ?? null,
    questions: item.questions ?? null,
    company_info: item.company_info ?? null,
  };
  // deleted는 건드리지 않는다. 내가 목록에서 뺀 공고를 다시 넣으면서
  // 되살리면 뺀 의미가 없어진다.
}

async function main() {
  const args = process.argv.slice(2);
  const update = args.includes("--update");
  const inputArg = args.find((a) => !a.startsWith("--"));

  const inputPath = await resolveInput(inputArg);
  const parsed = JSON.parse(await readFile(inputPath, "utf-8"));
  const items = Array.isArray(parsed) ? parsed : (parsed.items ?? []);
  if (items.length === 0) {
    console.log("넣을 것이 없다.");
    return;
  }

  const { supabase, user } = await signIn();
  const userId = user.id;
  const rows = items.filter((i) => i?.url).map((i) => toRow(i, userId));

  console.log(`${inputPath}`);
  console.log(`${rows.length}건을 넣는다 (${update ? "이미 있는 것도 덮어쓴다" : "이미 있는 것은 그대로 둔다"})`);

  // 한 번에 다 보내지 않고 끊어 보낸다.
  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("job_postings")
      .upsert(chunk, {
        onConflict: "user_id,url",
        // 기본은 건너뛴다. 다시 수집했다고 해서 내가 매겨둔 picked·note를 지우면 안 된다.
        ignoreDuplicates: !update,
      })
      .select("id");
    if (error) throw new Error(`넣다가 실패: ${error.message}`);
    inserted += data?.length ?? 0;
  }

  console.log(`새로 들어간 것 ${inserted}건, 이미 있던 것 ${rows.length - inserted}건.`);
  await supabase.auth.signOut();
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
