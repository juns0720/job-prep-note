import { newId } from "./text";

/**
 * 행을 만들고, 타이핑마다 바뀌는 필드를 기다리지 않고 바로 저장하는 큐. 저장은 서버 액션이
 * 아니라 `/api/save`로 보낸다. 서버 액션은 앱 전체에서 한 줄로 서서 하나씩 나가고, 페이지를
 * 떠날 때 keepalive로 보낼 수도 없다. 무엇보다 서버 액션의 id는 배포할 때마다 바뀌어서,
 * 배포 전에 열어 둔 화면에서 부르면 실패한다. `/api/save`는 배포가 바뀌어도 그대로 받는다.
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
 * - 새 행(create)도 같은 길로 만들고, 실패하면 다시 보낸다. 서버는 이미 있는 id면 건너뛰므로
 *   두 번 가도 괜찮다. 그 행의 update는 만들기가 끝난 뒤에 보낸다 — 먼저 가면 고칠 행이 없다.
 * - 페이지를 떠나거나 가려지면 만들 행과 확인 못 받은 값을 keepalive 요청 하나로 한 번 더
 *   보낸다. 서버는 만들기를 먼저 끝내고 update를 반영한다.
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

/** 화면에서 새로 만드는 행. row의 칸 이름은 DB 칸 그대로다(서버가 kind마다 허용한 칸만 넣는다). */
export type CreateKind = Exclude<SaveKind, "materialOrder" | "job">;
export const CREATE_KINDS: CreateKind[] = [
  "company",
  "coverQuestion",
  "companyEvent",
  "topic",
  "interviewQuestion",
  "materialGroup",
  "material",
  "project",
];

export type SaveItem = { kind: SaveKind; id: string; seq: number; patch: Record<string, unknown> };
export type CreateItem = { kind: CreateKind; id: string; row: Record<string, unknown> };
/**
 * ok      반영했다(만들기는 이미 있던 행이어도 ok)
 * stale   같은 탭이 더 나중에 보낸 요청이 이미 반영돼 있어 건너뛰었다
 * missing 고칠 행이 없다(아직 안 만들어졌거나 지워졌다). 만들기는 딸린 부모 행이 없다
 * error   DB가 실패했다. 다시 보낸다
 */
export type SaveStatus = "ok" | "stale" | "missing" | "error";
/** creates는 이 순서대로 하나씩 만든다(회사 다음에 그 회사의 문항). 그다음 items를 반영한다. */
export type SaveRequest = { tab: string; creates?: CreateItem[]; items: SaveItem[] };
export type SaveResponse = { created: SaveStatus[]; results: SaveStatus[] };

/** 브라우저는 keepalive 요청의 본문을 합쳐 64KB까지만 보낸다. 넘으면 보통 요청으로 보낸다. */
const KEEPALIVE_LIMIT = 60_000;
const RETRY_MAX = 30_000;

type Field = { value: unknown; seq: number };
type Entry = { kind: SaveKind; id: string; fields: Map<string, Field>; sentSeq: number };
type Pending = { item: CreateItem; done: Promise<void>; resolve: () => void };
type Result = SaveStatus | "invalid";

/** 400은 다시 보내도 똑같이 실패하므로 전부 "invalid"로 받아 버린다. 그 밖의 실패는 던진다. */
async function post(req: SaveRequest, keepalive: boolean): Promise<{ created: Result[]; results: Result[] }> {
  const body = JSON.stringify(req);
  const res = await fetch("/api/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: keepalive && new Blob([body]).size <= KEEPALIVE_LIMIT,
    // 로그인이 풀리면 middleware가 /login으로 돌려보낸다. 따라가면 200 HTML을 받아
    // 성공으로 보이므로 리다이렉트 자체를 실패로 본다.
    redirect: "error",
  });
  if (res.status === 400) {
    return { created: (req.creates ?? []).map(() => "invalid"), results: req.items.map(() => "invalid") };
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as SaveResponse;
}

export function createSaveQueue() {
  const tab = newId();
  let seq = 0;
  const entries = new Map<string, Entry>();
  const inFlight = new Set<string>();
  /** 아직 서버가 만들었다고 답하지 않은 행. 넣은 순서대로 보낸다. */
  const creates = new Map<string, Pending>();
  let creatingNow = false;
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
  const settle = (key: string, item: SaveItem, status: Result | "failed") => {
    const e = entries.get(key);
    if (!e) return "done";
    if (status === "ok" || status === "stale") {
      // 이 요청을 만든 뒤에 바뀐 필드(seq가 더 큰 것)는 남겨 둔다.
      e.fields.forEach((f, k) => f.seq < item.seq && e.fields.delete(k));
      if (e.fields.size === 0) entries.delete(key);
      return "done";
    }
    if (status === "invalid" || (status === "missing" && !creates.has(e.id))) {
      // 지운 행이다. 다시 보내도 고칠 곳이 없다.
      console.error(`저장 못 함(${status}): ${key}`);
      entries.delete(key);
      return "done";
    }
    e.sentSeq = 0;
    return status === "missing" ? "resend" : "retry";
  };

  /** 만들기 응답을 정리한다. error만 남겨 다시 보내고, 나머지는 끝낸다. 다시 보낼 것이 있으면 true. */
  const settleCreates = (items: CreateItem[], statuses: Result[]) => {
    let retry = false;
    items.forEach((item, i) => {
      const status = statuses[i];
      if (status === "error") {
        retry = true;
        return;
      }
      // missing은 부모 행(회사·주제·컨셉)이 그사이 지워진 것이다. 만들 곳이 없다.
      if (status !== "ok") console.error(`만들지 못함(${status}): ${item.kind}:${item.id}`);
      const p = creates.get(item.id);
      if (p?.item !== item) return; // 그사이 같은 id로 다시 넣었다
      creates.delete(item.id);
      p.resolve();
    });
    return retry;
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

  /** 만들 행을 넣은 순서대로 한 요청에 담아 보낸다. 실패한 것은 조금 뒤 다시 보낸다. */
  const sendCreates = async () => {
    if (creatingNow) return;
    creatingNow = true;
    try {
      while (creates.size > 0) {
        const items = [...creates.values()].map((p) => p.item);
        let statuses: Result[];
        try {
          ({ created: statuses } = await post({ tab, creates: items, items: [] }, false));
        } catch (err) {
          console.error("만들기 실패", err);
          scheduleRetry();
          return;
        }
        if (settleCreates(items, statuses)) {
          scheduleRetry();
          return;
        }
        onSuccess();
      }
    } finally {
      creatingNow = false;
    }
  };

  const drain = async (key: string) => {
    if (inFlight.has(key)) return;
    inFlight.add(key);
    try {
      for (;;) {
        const waiting = entries.get(key);
        if (!waiting || !unsent(waiting)) return;
        await creates.get(waiting.id)?.done;
        const e = entries.get(key);
        if (!e || !unsent(e)) return;
        const item = build(e);
        let status: Result | "failed";
        try {
          [status] = (await post({ tab, items: [item] }, false)).results;
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
    void sendCreates();
    for (const key of entries.keys()) void drain(key);
  }

  return {
    /** 새 행을 만든다. 만들기가 끝날 때까지 그 id의 update와 삭제(afterCreate)는 기다린다. */
    create(kind: CreateKind, id: string, row: Record<string, unknown>) {
      let resolve = () => {};
      const done = new Promise<void>((r) => (resolve = r));
      creates.set(id, { item: { kind, id, row }, done, resolve });
      void sendCreates();
    },

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

    /**
     * 만드는 중인 행이면 만들기가 끝난 뒤에 fn을 부른다. 지우기(서버 액션)가 만들기보다 먼저
     * 도착하면 지울 행이 없고, 뒤늦게 만들어진 행이 되살아난다.
     */
    afterCreate<T>(id: string, fn: () => Promise<T>): Promise<T> {
      const pending = creates.get(id)?.done ?? Promise.resolve();
      return pending.then(fn);
    },

    /** 실패해서 기다리는 것을 지금 다시 보낸다. 네트워크가 돌아오거나 화면이 다시 보일 때 부른다. */
    retry: retryNow,

    /**
     * 만들 행과 확인 못 받은 값을 한 번에 다시 보낸다. 페이지가 닫혀도 끝까지 가도록 keepalive를
     * 쓴다. 보내는 중인 것도 담는다 — 페이지가 닫히면 보통 요청은 끊길 수 있고, 같은 값이 두 번
     * 가도 서버가 id와 번호로 걸러낸다.
     */
    flush() {
      const createItems = [...creates.values()].map((p) => p.item);
      const sent = [...entries].map(([key, e]) => ({ key, item: build(e) }));
      if (createItems.length === 0 && sent.length === 0) return;
      // 탭만 옮긴 경우에는 페이지가 살아 있으니 응답을 받아 정리한다.
      post({ tab, creates: createItems, items: sent.map((s) => s.item) }, true).then(
        ({ created, results }) => {
          let retry = settleCreates(createItems, created);
          sent.forEach(({ key, item }, i) => {
            const next = settle(key, item, results[i]);
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
    hasFailed: () => failures > 0 && (entries.size > 0 || creates.size > 0),

    /** 서버가 아직 받았다고 답하지 않은 것이 하나라도 있는지. 없을 때만 페이지를 새로 불러도 된다. */
    idle: () => entries.size === 0 && creates.size === 0,

    /** 서버가 아직 받았다고 답하지 않은 대상. 새로 읽어 온 데이터로 화면을 바꿀 때 이것은 화면 값을 둔다. */
    pendingKeys: () => new Set(entries.keys()),

    /** 아직 만들고 있는 행이 있는지. */
    creating: () => creates.size > 0,
  };
}

export type SaveQueue = ReturnType<typeof createSaveQueue>;
