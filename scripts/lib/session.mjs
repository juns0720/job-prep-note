/**
 * 스크립트가 앱과 똑같이 이메일·비밀번호로 로그인한다. service_role 키를 쓰지 않으므로
 * RLS가 그대로 걸린 채로 내 데이터만 읽고 쓴다.
 *
 * .env.local 에 접속값 두 개가 필요하다(이 파일은 커밋하지 않는다).
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * 로그인 계정은 셋 중 아무거나로 준다.
 *   .env.local 의 STUDY_NOTE_EMAIL / STUDY_NOTE_PASSWORD
 *   환경 변수로 그때만        STUDY_NOTE_EMAIL=... STUDY_NOTE_PASSWORD=... node scripts/...
 *   아무것도 없으면 물어본다  (비밀번호는 입력해도 화면에 찍히지 않는다)
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

/** .env.local 을 읽는다. 따옴표와 주석만 걷어내는 최소 파서다. */
export async function loadEnv() {
  let text;
  try {
    text = await readFile(join(root, ".env.local"), "utf-8");
  } catch {
    throw new Error(".env.local 이 없다. docs/job-collector.md의 '처음 사용하기'를 참고한다.");
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

/** 로그인한 Supabase 클라이언트와 사용자. 다 쓰면 supabase.auth.signOut()을 부른다. */
export async function signIn() {
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

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`로그인 실패: ${error.message}`);

  return { supabase, user: data.user };
}
