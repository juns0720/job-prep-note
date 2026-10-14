/**
 * 언제까지 수집했는지 기억한다. scripts/state.json 에 남고 커밋하지 않는다.
 *
 * 이게 있어야 "지난번 이후로 새로 올라온 것만" 가져올 수 있다. 파일이 없으면
 * 처음 도는 것으로 보고 전부 가져온다.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(here, "..", "state.json");

export async function loadState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf-8"));
  } catch {
    return { sites: {} };
  }
}

/** 이 사이트를 마지막으로 수집한 시각. 없으면 null. */
export function lastRunOf(state, site) {
  const value = state.sites?.[site]?.lastRunAt;
  return typeof value === "string" ? value : null;
}

/** 수집이 끝난 사이트의 시각을 적어 둔다. 실패한 사이트는 건드리지 않는다. */
export async function saveState(state, doneSites, when = new Date()) {
  const next = { ...state, sites: { ...(state.sites ?? {}) } };
  for (const site of doneSites) {
    next.sites[site] = { lastRunAt: when.toISOString() };
  }
  next.lastRunAt = when.toISOString();
  await writeFile(STATE_PATH, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export { STATE_PATH };
