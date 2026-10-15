import { newId } from "./text";

/**
 * 타이핑마다 바뀌는 필드를 기다리지 않고 바로 저장하는 큐. 저장은 서버 액션이 아니라
 * `/api/save`로 보낸다. 서버 액션은 앱 전체에서 한 줄로 서서 하나씩 나가고, 페이지를
 * 떠날 때 keepalive로 보낼 수도 없어서다.
 *
 * - 변경이 생기면 곧바로 보낸다. 같은 대상(kind + id)에 보내는 중인 요청이 있으면 그것이
 *   끝나자마자 이어서 보낸다.
 * - 요청마다 탭 id와 번호(seq)를 붙인다. 서버는 같은 탭의 더 큰 번호가 이미 들어간 행은
 *   고치지 않는다(lib/data/save.ts). 그래서 요청이 어떤 순서로 도착해도 옛 값이 새 값을
 *   덮지 않는다.
 * - 서버가 받았다고 답할 때까지 필드를 지우지 않고, 요청마다 아직 확인 못 받은 필드를
 *   전부 담는다. 옛 요청이 버려져도 그 값은 새 요청에 들어 있다.
 * - 실패하면 버리지 않고 다시 보낸다(1초부터 두 배씩, 최대 30초). 네트워크가 돌아오거나
 *   화면이 다시 보이면 기다리지 않고 바로 다시 보낸다.
 * - 방금 만든 행은 insert가 끝난 뒤에 update를 보낸다(trackCreate). 먼저 가면 고칠
 *   행이 없어 update가 아무것도 안 한다.
 * - 페이지를 떠나거나 가려지면 확인 못 받은 값을 keepalive 요청 하나로 한 번 더 보낸다
 *   (만드는 중인 행은 빼고).
 */

export type SaveKind =
  | "company"
  | "coverQuestion"
  | "companyEvent"
  | "topic"
  | "interviewQuestion"
  | "materialGroup"
  | "material"
  | "materialOrder"
  | "project"
  | "job";
export const SAVE_KINDS: SaveKind[] = [
  "company",
  "coverQuestion",
  "companyEvent",
  "topic",
  "interviewQuestion",
  "materialGroup",
  "material",
  "materialOrder",
  "project",
  "job",
];

export type SaveItem = { kind: SaveKind; id: string; seq: number; patch: Record<string, unknown> };
/**
 * ok      반영했다
 * stale   같은 탭이 더 나중에 보낸 요청이 이미 반영돼 있어 건너뛰었다
 * missing 고칠 행이 없다(아직 안 만들어졌거나 지워졌다)
 * error   DB가 실패했다. 다시 보낸다
 */
export type SaveStatus = "ok" | "stale" | "missing" | "error";
export type SaveRequest = { tab: string; items: SaveItem[] };
export type SaveResponse = { results: SaveStatus[] };

/** 브라우저는 keepalive 요청의 본문을 합쳐 64KB까지만 보낸다. 넘으면 보통 요청으로 보낸다. */
const KEEPALIVE_LIMIT = 60_000;
const RETRY_MAX = 30_000;

type Field = { value: unknown; seq: number };
type Entry = { kind: SaveKind; id: string; fields: Map<string, Field>; sentSeq: number };

/** 400은 다시 보내도 똑같이 실패하므로 "invalid"로 받아 버린다. 그 밖의 실패는 던진다. */
async function post(body: string, count: number, keepalive: boolean): Promise<(SaveStatus | "invalid")[]> {
  const res = await fetch("/api/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive,
    // 로그인이 풀리면 middleware가 /login으로 돌려보낸다. 따라가면 200 HTML을 받아
    // 성공으로 보이므로 리다이렉트 자체를 실패로 본다.
    redirect: "error",
  });
  if (res.status === 400) return Array(count).fill("invalid");
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const data = (await res.json()) as SaveResponse;
  return data.results;
}

export function createSaveQueue() {
  const tab = newId();
  let seq = 0;
  const entries = new Map<string, Entry>();
  const inFlight = new Set<string>();
  const creating = new Map<string, Promise<unknown>>();
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const unsent = (e: Entry) => [...e.fields.values()].some((f) => f.seq > e.sentSeq);

  /** 확인 못 받은 필드를 전부 담아 요청 하나를 만든다. */
  const build = (e: Entry): SaveItem => {
    const patch: Record<string, unknown> = {};
    e.fields.forEach((f, k) => (patch[k] = f.value));
    e.sentSeq = ++seq;
    return { kind: e.kind, id: e.id, seq: e.sentSeq, patch };
  };

  /**
   * 응답을 받은 항목을 정리한다.
   * done   끝났다(반영됐거나, 버려도 되는 항목이다)
   * resend 행이 만들어지는 중이었다. 다 만들어진 뒤 바로 다시 보낸다
   * retry  실패했다. 조금 기다렸다 다시 보낸다
   */
  const settle = (key: string, item: SaveItem, status: SaveStatus | "invalid" | "failed") => {
    const e = entries.get(key);
    if (!e) return "done";
    if (status === "ok" || status === "stale") {
      // 이 요청을 만든 뒤에 바뀐 필드(seq가 더 큰 것)는 남겨 둔다.
      e.fields.forEach((f, k) => f.seq < item.seq && e.fields.delete(k));
      if (e.fields.size === 0) entries.delete(key);
      return "done";
    }
    if (status === "invalid" || (status === "missing" && !creating.has(e.id))) {
      // 지운 행이거나 만들기가 실패한 행이다. 다시 보내도 고칠 곳이 없다.
      console.error(`저장 못 함(${status}): ${key}`);
      entries.delete(key);
      return "done";
    }
    e.sentSeq = 0;
    return status === "missing" ? "resend" : "retry";
  };

  const onSuccess = () => {
    failures = 0;
  };

  const scheduleRetry = () => {
    failures += 1;
    if (retryTimer) return;
    const delay = Math.min(RETRY_MAX, 1000 * 2 ** (failures - 1));
    retryTimer = setTimeout(retryNow, delay);
  };

  const drain = async (key: string) => {
    if (inFlight.has(key)) return;
    inFlight.add(key);
    try {
      for (;;) {
        const waiting = entries.get(key);
        if (!waiting || !unsent(waiting)) return;
        await creating.get(waiting.id)?.catch(() => {});
        const e = entries.get(key);
        if (!e || !unsent(e)) return;
        const item = build(e);
        let status: SaveStatus | "invalid" | "failed";
        try {
          [status] = await post(JSON.stringify({ tab, items: [item] } satisfies SaveRequest), 1, false);
        } catch (err) {
          console.error(`저장 실패: ${key}`, err);
          status = "failed";
        }
        const next = settle(key, item, status);
        if (next === "retry") {
          scheduleRetry();
          return;
        }
        onSuccess();
      }
    } finally {
      inFlight.delete(key);
    }
  };

  function retryNow() {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    for (const key of entries.keys()) void drain(key);
  }

  return {
    save(kind: SaveKind, id: string, patch: Record<string, unknown>) {
      const key = `${kind}:${id}`;
      let e = entries.get(key);
      if (!e) {
        e = { kind, id, fields: new Map(), sentSeq: 0 };
        entries.set(key, e);
      }
      for (const [k, value] of Object.entries(patch)) e.fields.set(k, { value, seq: ++seq });
      void drain(key);
    },

    /** 행을 만드는 요청이 끝날 때까지 그 id의 update를 붙잡아 둔다. */
    trackCreate(ids: string[], promise: Promise<unknown>) {
      ids.forEach((id) => creating.set(id, promise));
      promise
        .catch(() => {})
        .finally(() => ids.forEach((id) => creating.get(id) === promise && creating.delete(id)));
    },

    /** 실패해서 기다리는 것을 지금 다시 보낸다. 네트워크가 돌아오거나 화면이 다시 보일 때 부른다. */
    retry: retryNow,

    /**
     * 확인 못 받은 값을 한 번에 다시 보낸다. 페이지가 닫혀도 끝까지 가도록 keepalive를 쓴다.
     * 보내는 중인 것도 담는다 — 페이지가 닫히면 보통 요청은 끊길 수 있고, 같은 값이 두 번
     * 가도 서버가 번호로 걸러낸다.
     */
    flush() {
      // 아직 만드는 중인 행은 빼 둔다. 먼저 보내면 고칠 행이 없어 헛걸음이고, 그 답이
      // 만들기가 끝난 뒤에 오면 지워진 행으로 보고 값을 버리게 된다. 이것은 drain이
      // 만들기가 끝나자마자 보낸다.
      const sent = [...entries]
        .filter(([, e]) => !creating.has(e.id))
        .map(([key, e]) => ({ key, item: build(e) }));
      if (sent.length === 0) return;
      const body = JSON.stringify({ tab, items: sent.map((s) => s.item) } satisfies SaveRequest);
      const keepalive = new Blob([body]).size <= KEEPALIVE_LIMIT;
      // 탭만 옮긴 경우에는 페이지가 살아 있으니 응답을 받아 정리한다.
      post(body, sent.length, keepalive).then(
        (statuses) => {
          let retry = false;
          sent.forEach(({ key, item }, i) => {
            const next = settle(key, item, statuses[i]);
            if (next === "resend") void drain(key);
            if (next === "retry") retry = true;
          });
          if (retry) scheduleRetry();
          else onSuccess();
        },
        (err) => {
          console.error("저장 실패: 페이지를 가리며 보낸 값", err);
          sent.forEach(({ key, item }) => settle(key, item, "failed"));
          scheduleRetry();
        },
      );
    },

    /** 저장이 실패해 다시 보내려고 기다리는 값이 있는지. 이때 페이지를 닫으면 값을 잃는다. */
    hasFailed: () => failures > 0 && entries.size > 0,

    /** 서버가 아직 받았다고 답하지 않은 대상. 새로 읽어 온 데이터로 화면을 바꿀 때 이것은 화면 값을 둔다. */
    pendingKeys: () => new Set(entries.keys()),

    /** 아직 만들고 있는 행이 있는지. */
    creating: () => creating.size > 0,
  };
}

export type SaveQueue = ReturnType<typeof createSaveQueue>;
