/**
 * robots.txt를 실행할 때마다 확인한다. 사이트가 규칙을 바꾸면 다음 수집부터 바로 따른다.
 *
 * `User-agent: *` 그룹만 본다. 우리는 검색엔진 봇을 사칭하지 않는다.
 * 매칭은 표준대로 "가장 긴 규칙이 이긴다"로 처리하고, 같은 길이면 Allow를 우선한다.
 */

import { fetchText } from "./fetch.mjs";

const cache = new Map(); // origin -> rules

/** 정규식에서 뜻을 갖는 문자들. robots.txt의 * 와 $ 는 따로 다룬다. */
const RE_SPECIAL = new Set([".", "+", "?", "^", "{", "}", "(", ")", "|", "[", "]", "\\"]);

function parse(text) {
  const rules = [];
  let inStar = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;

    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();

    if (field === "user-agent") {
      // 여러 User-agent가 연달아 오면 같은 그룹이다. * 가 끼어 있으면 그 그룹을 본다.
      inStar = value === "*";
      continue;
    }
    if (!inStar) continue;
    if (field === "disallow" || field === "allow") {
      if (field === "disallow" && value === "") continue; // 빈 Disallow는 "전부 허용"
      rules.push({ allow: field === "allow", path: value });
    }
  }
  return rules;
}

/** robots.txt의 경로 패턴(* 는 아무 문자열, $ 는 끝)을 정규식으로 옮긴다. */
function toRegExp(pattern) {
  let out = "^";
  for (const ch of pattern) {
    if (ch === "*") out += ".*";
    else if (ch === "$") out += "$";
    else if (RE_SPECIAL.has(ch)) out += "\\" + ch;
    else out += ch;
  }
  return new RegExp(out);
}

async function load(origin) {
  if (cache.has(origin)) return cache.get(origin);

  const res = await fetchText(`${origin}/robots.txt`, { delay: 500 });
  // 못 읽으면(403·404·네트워크) 규칙 없음으로 본다. 원티드처럼 robots.txt 자체를
  // 막아둔 곳은 어차피 본문도 막히므로 수집 단계에서 실패로 드러난다.
  const rules = res.ok ? parse(res.text) : [];
  cache.set(origin, rules);
  return rules;
}

/** 이 주소를 가져가도 되는지. robots.txt가 막았으면 false. */
export async function isAllowed(url) {
  const u = new URL(url);
  const rules = await load(u.origin);
  const path = u.pathname + u.search;

  let best = null;
  for (const rule of rules) {
    if (!toRegExp(rule.path).test(path)) continue;
    if (!best || rule.path.length > best.path.length) best = rule;
    else if (rule.path.length === best.path.length && rule.allow) best = rule;
  }
  return best ? best.allow : true;
}
