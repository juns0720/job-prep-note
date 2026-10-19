/**
 * 지원서를 채울 때 읽을 인적사항을 한 파일로 모으고, 첨부 파일을 내려받는다. DB는 건드리지 않는다.
 *
 *   node scripts/export-profile.mjs          scripts/out/profile.md 와 scripts/out/profile-files/ 에 쓴다
 *   node scripts/export-profile.mjs -        화면에 찍는다 (파일은 내려받지 않는다)
 *
 * 담는 것
 *   섹션마다 입력 규칙, 항목·값·비고(항목형), 건마다 칸·값(여러 건), 본문(긴 글)
 *   빈 값은 `미기록`으로 적는다. 지원서에서 요구하면 추측하지 말고 묻거나 빈 칸으로 보고한다
 *   첨부 파일·링크 — 내 링크(포트폴리오·이력서)와 내려받은 파일의 로컬 경로
 *
 * 첨부 파일은 AI의 브라우저 도구가 파일 칸에 올릴 수 있게 로컬 경로로 내려받는다.
 * 이메일·비밀번호로 로그인해서 내 계정으로 읽는다(RLS 그대로). 결과는 scripts/out/ 이라 커밋되지 않는다.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { signIn } from "./lib/session.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(here, "out");
const filesDir = join(outDir, "profile-files");

const MISSING = "미기록";
const len = (s) => [...s].length;
/** 표 칸 안에서 줄바꿈과 | 가 표를 깨지 않게. */
const cell = (s) => (s.trim() ? s.trim().replace(/\|/g, "\\|").replace(/\n/g, "<br>") : MISSING);

async function select(supabase, table, order = "sort_order") {
  const { data, error } = await supabase.from(table).select("*").order(order, { ascending: true });
  if (error) throw new Error(`${table} 읽기 실패: ${error.message}`);
  return data;
}

function renderSection(sec, fields, entries) {
  const out = [`## ${sec.name || "(이름 없음)"}`, ""];
  if (sec.note.trim()) out.push("입력 규칙:", "", ...sec.note.trim().split("\n").map((l) => `> ${l}`), "");

  if (sec.kind === "fields") {
    if (fields.length === 0) return [...out, "(항목 없음)", ""];
    out.push("| 항목 | 값 | 비고 |", "|---|---|---|");
    for (const f of fields) out.push(`| ${f.label || "(이름 없음)"} | ${cell(f.value)} | ${f.note.trim() ? cell(f.note) : ""} |`);
    return [...out, ""];
  }

  if (sec.kind === "text") {
    const body = sec.body.trim();
    return [...out, body ? `${len(body)}자` : MISSING, "", ...(body ? ["```text", body, "```", ""] : [])];
  }

  const columns = Array.isArray(sec.columns) ? sec.columns : [];
  out.push(`칸: ${columns.map((c) => c.name).join(", ") || "(없음)"}`, "");
  if (entries.length === 0) return [...out, "(적은 건 없음)", ""];
  entries.forEach((e, i) => {
    out.push(`### ${i + 1}`, "");
    const cells = e.cells ?? {};
    for (const c of columns) {
      const v = (cells[c.id] ?? "").trim();
      if (c.wide && v) out.push(`- ${c.name} (${len(v)}자):`, "", "```text", v, "```", "");
      else out.push(`- ${c.name}: ${v ? v.replace(/\n/g, " / ") : MISSING}`);
    }
    out.push("");
  });
  return out;
}

/** 파일 이름에 못 쓰는 글자만 바꾼다. 한글은 그대로 둔다. */
const safeName = (s) => s.replace(/[\\/:*?"<>|]/g, "_").trim() || "파일";

async function main() {
  const toStdout = process.argv[2] === "-";
  const { supabase } = await signIn();
  try {
    const [sections, fields, entries, files] = await Promise.all([
      select(supabase, "profile_sections"),
      select(supabase, "profile_fields"),
      select(supabase, "profile_entries"),
      select(supabase, "profile_files"),
    ]);
    const { data: links } = await supabase.from("profile_links").select("*").maybeSingle();

    const out = [
      "# 인적사항",
      "",
      `인적사항 탭에서 ${new Date().toISOString().slice(0, 10)}에 뽑았다. 값이 \`${MISSING}\`이면 아직 받지 않은 것이다.`,
      "",
    ];
    for (const sec of sections) {
      out.push(
        ...renderSection(
          sec,
          fields.filter((f) => f.section_id === sec.id),
          entries.filter((e) => e.section_id === sec.id),
        ),
      );
    }

    out.push("## 첨부 파일·링크", "", "포트폴리오·이력서는 링크를 먼저 쓰고, 파일로만 받는 곳에는 Word를 낸다.", "");
    out.push(`- 포트폴리오 링크: ${links?.portfolio || MISSING}`, `- 이력서 링크: ${links?.resume || MISSING}`, "");

    if (!toStdout) {
      await rm(filesDir, { recursive: true, force: true });
      await mkdir(filesDir, { recursive: true });
    }
    out.push("| 종류 | 이름 | 원래 파일 | 로컬 경로 |", "|---|---|---|---|");
    const used = new Set();
    for (const f of files) {
      let local = "(내려받지 않음)";
      if (!toStdout) {
        const { data, error } = await supabase.storage.from("profile-files").download(f.path);
        if (error) throw new Error(`${f.label} 내려받기 실패: ${error.message}`);
        let name = `${safeName(f.label || f.file_name)}${extname(f.file_name || f.path)}`;
        // 이름이 같은 파일이 있으면 뒤에 번호를 붙인다.
        for (let n = 2; used.has(name); n++) name = `${safeName(f.label)} ${n}${extname(f.file_name || f.path)}`;
        used.add(name);
        local = join(filesDir, name);
        await writeFile(local, Buffer.from(await data.arrayBuffer()));
      }
      out.push(`| ${f.kind === "photo" ? "증명사진" : "서류"} | ${f.label} | ${f.file_name} | ${local} |`);
    }
    if (files.length === 0) out.push("| | (파일 없음) | | |");
    out.push("");

    const text = out.join("\n");
    if (toStdout) {
      process.stdout.write(text);
      return;
    }
    await mkdir(outDir, { recursive: true });
    const target = join(outDir, "profile.md");
    await writeFile(target, text);
    console.log(`${relative(root, target)} 에 썼다. 섹션 ${sections.length}개, 첨부 파일 ${files.length}개.`);
  } finally {
    await supabase.auth.signOut();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
