/**
 * 자소서를 쓸 때 참고할 내 글을 한 파일로 모은다. 읽기만 하고 DB는 건드리지 않는다.
 *
 *   node scripts/export-materials.mjs          scripts/out/materials.md 에 쓴다
 *   node scripts/export-materials.mjs -        화면에 찍는다
 *   node scripts/export-materials.mjs --final  재료는 "최종"으로 체크한 문항만 담는다
 *
 * 담는 것
 *   재료        컨셉 → 문항(주제·내용)
 *   자기소개서  회사 → 문항·답변 (답변을 쓴 것만)
 *   면접 준비   주제 → 질문·키워드·답변 (답변이나 키워드가 있는 것만)
 *
 * import.mjs 와 같이 이메일·비밀번호로 로그인해서 내 계정으로 읽는다(RLS 그대로).
 * 결과 파일은 scripts/out/ 이라 커밋되지 않는다.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
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

/** 터미널에서 한 줄 받는다. silent면 입력한 글자가 화면에 찍히지 않는다. */
async function ask(question, { silent = false } = {}) {
  if (!stdin.isTTY) {
    throw new Error(
      "물어볼 수가 없다(터미널이 아니다). .env.local 에 STUDY_NOTE_EMAIL·STUDY_NOTE_PASSWORD 를 적거나 환경 변수로 준다.",
    );
  }
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (silent) {
    rl._writeToOutput = (chunk) => {
      if (chunk.includes(question)) rl.output.write(chunk);
    };
  }
  const answer = await rl.question(question);
  if (silent) rl.output.write("\n");
  rl.close();
  return answer.trim();
}

async function select(supabase, table, columns, order) {
  let query = supabase.from(table).select(columns);
  for (const [col, ascending] of order) query = query.order(col, { ascending });
  const { data, error } = await query;
  if (error) throw new Error(`${table} 읽기 실패: ${error.message}`);
  return data;
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row[key])) map.set(row[key], []);
    map.get(row[key]).push(row);
  }
  return map;
}

/** 공백 포함 글자 수. 자소서 제한은 대부분 공백 포함이다. */
const len = (s) => [...s].length;

function renderMaterials(groups, materials, onlyFinal) {
  const byGroup = groupBy(materials, "group_id");
  const out = [onlyFinal ? "# 재료 (최종)" : "# 재료", ""];
  for (const g of groups) {
    const items = byGroup.get(g.id) ?? [];
    // 최종만 볼 때는 체크한 문항이 없는 컨셉을 통째로 뺀다.
    if (onlyFinal && items.length === 0) continue;
    out.push(`## ${g.name || "(이름 없음)"}`, "");
    if (items.length === 0) out.push("(비어 있음)", "");
    for (const m of items) {
      const title = m.title.trim() || m.body.trim().split("\n")[0] || "(비어 있음)";
      out.push(`### ${title}`, "");
      if (m.body.trim()) out.push(m.body.trim(), "");
    }
  }
  return out;
}

function renderCovers(companies, questions) {
  const byCompany = groupBy(
    questions.filter((q) => q.answer.trim()),
    "company_id",
  );
  const out = ["# 작성한 자기소개서", ""];
  for (const c of companies) {
    const items = byCompany.get(c.id);
    if (!items) continue;
    const head = [c.name || "(회사명 없음)", c.role].filter(Boolean).join(" · ");
    out.push(`## ${head}`, "", `시기 ${c.period} · 상태 ${c.status}`, "");
    for (const q of items) {
      out.push(
        `### ${q.body.trim() || "(문항 없음)"}`,
        "",
        `${len(q.answer)} / ${q.char_limit}자`,
        "",
        q.answer.trim(),
        "",
      );
    }
  }
  return out;
}

function renderInterview(topics, questions) {
  const byTopic = groupBy(
    questions.filter((q) => q.answer.trim() || q.keywords.length > 0),
    "topic_id",
  );
  const out = ["# 면접 준비", ""];
  for (const t of topics) {
    const items = byTopic.get(t.id);
    if (!items) continue;
    out.push(`## ${t.name || "(이름 없음)"}`, "");
    for (const q of items) {
      out.push(`### ${q.body.trim() || "(질문 없음)"}`, "");
      if (q.keywords.length > 0) out.push(`키워드: ${q.keywords.join(", ")}`, "");
      if (q.answer.trim()) out.push(q.answer.trim(), "");
    }
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const toStdout = args.includes("-");
  const onlyFinal = args.includes("--final");

  const env = await loadEnv();
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
    if (!env[key]) throw new Error(`.env.local 에 ${key} 가 없다.`);
  }

  const email = env.STUDY_NOTE_EMAIL || process.env.STUDY_NOTE_EMAIL || (await ask("이메일: "));
  const password =
    env.STUDY_NOTE_PASSWORD ||
    process.env.STUDY_NOTE_PASSWORD ||
    (await ask("비밀번호: ", { silent: true }));
  if (!email || !password) throw new Error("이메일과 비밀번호가 있어야 한다.");

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`로그인 실패: ${signInError.message}`);

  const [groups, allMaterials, companies, coverQuestions, topics, interviewQuestions] =
    await Promise.all([
      select(supabase, "material_groups", "id, name", [["sort_order", true], ["created_at", true]]),
      select(supabase, "materials", `id, group_id, title, body${onlyFinal ? ", final" : ""}`, [["sort_order", true], ["created_at", true]]),
      select(supabase, "companies", "id, period, name, role, status", [["period", false], ["created_at", true]]),
      select(supabase, "cover_questions", "company_id, body, char_limit, answer", [["sort_order", true], ["created_at", true]]),
      select(supabase, "topics", "id, name", [["sort_order", true], ["created_at", true]]),
      select(supabase, "interview_questions", "topic_id, body, keywords, answer", [["sort_order", true], ["created_at", true]]),
    ]);

  const materials = onlyFinal ? allMaterials.filter((m) => m.final) : allMaterials;
  const text = [
    ...renderMaterials(groups, materials, onlyFinal),
    ...renderCovers(companies, coverQuestions),
    ...renderInterview(topics, interviewQuestions),
  ].join("\n");

  if (toStdout) {
    stdout.write(text);
    return;
  }

  const outPath = join(here, "out", "materials.md");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, text);
  console.log(
    `${relative(root, outPath)} — 재료 ${materials.length}개, 자소서 답변 ${
      coverQuestions.filter((q) => q.answer.trim()).length
    }개, 면접 질문 ${interviewQuestions.length}개`,
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
