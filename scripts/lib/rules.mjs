/**
 * 공고 필터링 규칙. 앱의 공고 화면에서 고르고 job_rules 테이블에 한 줄로 남는다
 * (supabase/schema.sql).
 *
 * 고를 수 있는 항목과 그걸 알아보는 낱말은 lib/job-filter.json 에 있다. 앱과 같이 쓴다.
 *
 * 세 갈래(직무·경력·스택)를 따로 본다. 갈래마다
 *   - 아무것도 안 골랐으면 거르지 않는다.
 *   - 공고에 그 갈래의 말이 하나도 없으면 남긴다. 직무·스택이 안 적힌 공채는 열어 봐야 안다.
 *   - 말이 있는데 고른 것이 하나도 없으면 뺀다. "프론트/백엔드", "Java/Python"처럼
 *     고른 것과 안 고른 것이 섞여 있으면 남긴다.
 */

import catalog from "../../lib/job-filter.json" with { type: "json" };

/** 로그인한 클라이언트로 내 규칙을 읽는다. 아직 없으면 null. */
export async function loadRules(supabase) {
  const { data, error } = await supabase.from("job_rules").select("roles, careers, stacks").maybeSingle();
  if (error) throw new Error(`규칙을 못 읽었다: ${error.message}`);
  if (!data) return null;
  return { roles: data.roles ?? [], careers: data.careers ?? [], stacks: data.stacks ?? [] };
}

/** 이 항목의 말이 text에 있는지. text는 소문자로 받는다. */
function mentions(text, option) {
  let t = text;
  for (const w of option.ignore ?? []) t = t.split(w).join(" ");
  if ((option.words ?? []).some((w) => t.includes(w.toLowerCase()))) return true;
  // "go"처럼 다른 낱말 속에 흔히 끼는 짧은 말은 따로 떨어져 있을 때만 본다.
  return (option.whole ?? []).some((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(t));
}

/** 갈래 하나를 본다. 빼야 하면 걸린 항목 이름을, 아니면 null. */
function check(text, options, selected) {
  return judge(options.filter((o) => mentions(text, o)), selected);
}

function judge(hit, selected) {
  if (selected.length === 0) return null;
  if (hit.length === 0) return null;
  if (hit.some((o) => selected.includes(o.id))) return null;
  return hit.map((o) => o.label ?? o.id).join("·");
}

/** 이 공고를 빼는 이유. 남기면 null. */
export function excludedBy(item, rules) {
  const title = (item.title ?? "").toLowerCase();

  const role = check(title, catalog.roles, rules.roles);
  if (role) return `직무 ${role}`;

  const career = check(`${item.career ?? ""} ${title}`.toLowerCase(), catalog.careers, rules.careers);
  if (career) return `${career}만 뽑는다`;

  // 스택은 고른 직무의 것만 고를 수 있다(화면도 그 줄만 보여준다).
  const known = Object.values(catalog.stacks).flat();
  const mine = rules.roles.length ? rules.roles.flatMap((r) => catalog.stacks[r] ?? []) : known;
  const chosen = rules.stacks.filter((id) => mine.some((o) => o.id === id));
  // 제목은 모든 스택을 본다. 사람인은 분야(sector)에도 스택을 늘어놓는데, 백엔드 공고에
  // React가 끼는 일이 흔해서 분야에서는 고른 직무의 스택만 본다.
  const sector = (item.sector ?? "").toLowerCase();
  const hit = known.filter((o) => mentions(title, o) || (mine.includes(o) && mentions(sector, o)));
  const stack = judge(hit, chosen);
  if (stack) return `스택 ${stack}`;

  return null;
}

/** 남길 것과 뺄 것으로 가른다. 뺀 것에는 excluded_by로 이유를 붙인다. */
export function applyRules(items, rules) {
  const kept = [];
  const excluded = [];
  for (const item of items) {
    const reason = excludedBy(item, rules);
    if (reason) excluded.push({ ...item, excluded_by: reason });
    else kept.push(item);
  }
  return { kept, excluded };
}
