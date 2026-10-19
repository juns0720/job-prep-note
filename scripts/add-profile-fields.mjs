/**
 * 지원서를 채우다 인적사항에 없어서 못 넣은 칸을 빈 칸으로 더한다. 다음 지원서부터는 값만
 * 채우면 자동으로 들어간다. 이미 있는 칸은 건너뛴다.
 *
 *   node scripts/add-profile-fields.mjs <파일.json>
 *   node scripts/add-profile-fields.mjs '[{"section":"기본 인적사항","label":"혈액형","note":"OO기업 2026-10-20"}]'
 *
 * 항목 하나 = { section, label, note? }
 *   section이 항목형이면 값이 빈 항목을 더한다(note는 비고에)
 *   section이 여러 건이면 칸(column)을 더한다
 *   section이 없으면 항목형 섹션을 새로 만든다
 *
 * 값을 받았으면 값까지 넣어도 된다: { section, label, value }. 항목형에만 쓴다.
 * 이메일·비밀번호로 로그인해서 내 계정으로 쓴다(RLS 그대로).
 */

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { signIn } from "./lib/session.mjs";

async function readItems(arg) {
  if (!arg) throw new Error("더할 칸을 JSON 파일 경로나 JSON 문자열로 준다.");
  const text = arg.trim().startsWith("[") ? arg : await readFile(arg, "utf-8");
  const items = JSON.parse(text);
  if (!Array.isArray(items)) throw new Error("배열로 준다.");
  return items;
}

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what} 실패: ${error.message}`);
  return data;
}

async function main() {
  const items = await readItems(process.argv[2]);
  const { supabase, user } = await signIn();
  try {
    const sections = await must(supabase.from("profile_sections").select("*").order("sort_order"), "섹션 읽기");
    const fields = await must(supabase.from("profile_fields").select("section_id, label, sort_order"), "항목 읽기");
    const norm = (s) => s.replace(/\s/g, "");

    for (const item of items) {
      if (!item.section || !item.label) throw new Error(`section과 label이 있어야 한다: ${JSON.stringify(item)}`);
      let sec = sections.find((x) => norm(x.name) === norm(item.section));
      if (!sec) {
        sec = { id: randomUUID(), user_id: user.id, name: item.section, kind: "fields", columns: [], sort_order: Date.now() };
        await must(supabase.from("profile_sections").insert(sec), "섹션 만들기");
        sections.push(sec);
        console.log(`섹션을 새로 만들었다: ${item.section}`);
      }

      if (sec.kind === "list") {
        const columns = Array.isArray(sec.columns) ? sec.columns : [];
        if (columns.some((c) => norm(c.name) === norm(item.label))) {
          console.log(`이미 있다: ${sec.name} > ${item.label}`);
          continue;
        }
        sec.columns = [...columns, { id: randomUUID(), name: item.label, wide: !!item.wide }];
        await must(supabase.from("profile_sections").update({ columns: sec.columns }).eq("id", sec.id), "칸 더하기");
        console.log(`칸을 더했다: ${sec.name} > ${item.label}`);
        continue;
      }

      if (sec.kind === "text") {
        console.log(`긴 글 섹션에는 칸을 더할 수 없다: ${sec.name} > ${item.label} (건너뜀)`);
        continue;
      }

      const mine = fields.filter((f) => f.section_id === sec.id);
      if (mine.some((f) => norm(f.label) === norm(item.label))) {
        console.log(`이미 있다: ${sec.name} > ${item.label}`);
        continue;
      }
      const row = {
        user_id: user.id,
        section_id: sec.id,
        label: item.label,
        value: item.value ?? "",
        note: item.note ?? "",
        sort_order: Math.max(-1, ...mine.map((f) => Number(f.sort_order))) + 1,
      };
      await must(supabase.from("profile_fields").insert(row), "항목 더하기");
      fields.push(row);
      console.log(`항목을 더했다: ${sec.name} > ${item.label}${row.value ? ` = ${row.value}` : " (빈 칸)"}`);
    }
  } finally {
    await supabase.auth.signOut();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
