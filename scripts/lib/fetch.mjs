/**
 * 수집기가 쓰는 HTTP 도구. 상대 서버에 부담을 주지 않는 것이 목적이다.
 *
 * - 같은 호스트로는 한 번에 하나씩, 요청 사이에 간격을 둔다.
 * - 응답 헤더의 charset을 보고 디코딩한다. 한국 채용 사이트는 EUC-KR도 흔하다.
 * - 5xx와 네트워크 오류만 재시도한다. 404나 403은 다시 눌러도 같으니 바로 포기한다.
 */

const DEFAULT_DELAY = 1500;
const MAX_RETRY = 2;

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const lastHit = new Map(); // host -> timestamp

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 같은 호스트에 연달아 때리지 않도록 간격을 둔다. */
async function waitTurn(host, delay) {
  const prev = lastHit.get(host) ?? 0;
  const wait = prev + delay - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
}

/** Content-Type의 charset으로 디코딩한다. 없으면 utf-8. */
function decode(buffer, contentType) {
  const m = /charset=([\w-]+)/i.exec(contentType ?? "");
  const charset = (m?.[1] ?? "utf-8").toLowerCase();
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    // 모르는 charset이면 utf-8로 읽는다. 깨지더라도 멈추지는 않는다.
    return new TextDecoder("utf-8").decode(buffer);
  }
}

export async function fetchText(url, { delay = DEFAULT_DELAY, headers = {}, method = "GET", body } = {}) {
  const host = new URL(url).host;

  for (let attempt = 0; ; attempt++) {
    await waitTurn(host, delay);
    try {
      const res = await fetch(url, {
        method,
        body,
        headers: {
          "User-Agent": USER_AGENT,
          "Accept-Language": "ko-KR,ko;q=0.9",
          Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
          ...headers,
        },
        redirect: "follow",
      });

      if (res.status >= 500 && attempt < MAX_RETRY) {
        await sleep(delay * (attempt + 2));
        continue;
      }
      if (!res.ok) {
        return { ok: false, status: res.status, text: "", url: res.url };
      }

      const buffer = await res.arrayBuffer();
      return {
        ok: true,
        status: res.status,
        text: decode(buffer, res.headers.get("content-type")),
        url: res.url,
      };
    } catch (e) {
      if (attempt < MAX_RETRY) {
        await sleep(delay * (attempt + 2));
        continue;
      }
      return { ok: false, status: 0, text: "", url, error: String(e?.message ?? e) };
    }
  }
}

/** JSON을 주는 곳에 쓴다. 파싱까지 해서 돌려준다. */
export async function fetchJson(url, options = {}) {
  const res = await fetchText(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  if (!res.ok) return { ok: false, status: res.status, data: null };
  try {
    return { ok: true, status: res.status, data: JSON.parse(res.text) };
  } catch {
    return { ok: false, status: res.status, data: null };
  }
}
