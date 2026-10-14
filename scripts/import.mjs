/**
 * 수집(또는 선별)한 공고를 앱의 job_postings에 넣는다.
 *
 *   node scripts/import.mjs                       out/ 에서 가장 최근 파일
 *   node scripts/import.mjs scripts/out/picked-2026-09-23.json
 *   node scripts/import.mjs <파일> --update       이미 있는 공고도 덮어쓴다
 *
 * service_role 키를 쓰지 않는다. 앱과 똑같이 이메일·비밀번호로 로그인해서
 * 내 계정으로 넣는다 — RLS가 그대로 걸린 채로 들어간다는 뜻이다.
 *
 * .env.local 에 접속값 두 개가 필요하다(이 파일은 커밋하지 않는다).
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * 로그인 계정은 셋 중 아무거나로 준다.
 *   .env.local 의 STUDY_NOTE_EMAIL / STUDY_NOTE_PASSWORD
 *   환경 변수로 그때만        STUDY_NOTE_EMAIL=... STUDY_NOTE_PASSWORD=... node scripts/import.mjs
 *   아무것도 없으면 물어본다  (비밀번호는 입력해도 화면에 찍히지 않는다)
 */

import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/** .env.local 을 읽는다. 따옴표와 주석만 걷어내는 최소 파서다. */
async function loadEnv() {
  let text;
  try {
    text = await readFile(join(root, ".env.local"), "utf-8");
  } catch {
    throw new Error(".env.local 이 없다. README.md 5단계를 보고 만든다.");
  }

  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
  return env;
}

/**
 * 터미널에서 한 줄 받는다. silent면 입력한 글자가 화면에 찍히지 않는다.
 * 비밀번호를 파일에도 셸 기록에도 남기고 싶지 않을 때 쓴다.
 */
async function ask(question, { silent = false } = {}) {
  if (!stdin.isTTY) {
    throw new Error(
      "물어볼 수가 없다(터미널이 아니다). .env.local 에 STUDY_NOTE_EMAIL·STUDY_NOTE_PASSWORD 를 적거나 환경 변수로 준다.",
    );
  }
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (silent) {
    // 물음표까지는 보여주고 그 뒤에 치는 글자는 화면에 쓰지 않는다.
    rl._writeToOutput = (chunk) => {
      if (chunk.includes(question)) rl.output.write(chunk);
    };
  }
  const answer = await rl.question(question);
  if (silent) rl.output.write("\n");
  rl.close();
  return answer.trim();
}

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

  const env = await loadEnv();
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
    if (!env[key]) throw new Error(`.env.local 에 ${key} 가 없다.`);
  }

  // 계정은 .env.local -> 환경 변수 -> 물어보기 순으로 찾는다.
  const email = env.STUDY_NOTE_EMAIL || process.env.STUDY_NOTE_EMAIL || (await ask("이메일: "));
  const password =
    env.STUDY_NOTE_PASSWORD ||
    process.env.STUDY_NOTE_PASSWORD ||
    (await ask("비밀번호: ", { silent: true }));
  if (!email || !password) throw new Error("이메일과 비밀번호가 있어야 한다.");

  const inputPath = await resolveInput(inputArg);
  const parsed = JSON.parse(await readFile(inputPath, "utf-8"));
  const items = Array.isArray(parsed) ? parsed : (parsed.items ?? []);
  if (items.length === 0) {
    console.log("넣을 것이 없다.");
    return;
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { data: auth, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw new Error(`로그인 실패: ${signInError.message}`);

  const userId = auth.user.id;
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
