import type { InitialData } from "./store";

/**
 * 새로 읽어 온 데이터(fresh)로 화면을 바꿀 때, 아직 서버가 받았다고 답하지 않은 값은
 * 화면에 있는 것을 둔다. 저장 큐가 보내는 중인 값을 옛 값으로 되돌리면, 다음 입력이
 * 그 옛 값에 이어 붙어 저장되기 때문이다.
 *
 * pending  저장 큐에서 아직 확인 못 받은 대상(`${kind}:${id}`)
 * newQ     면접 준비에서 방금 추가해 편집 중인 질문. 맨 위 편집 칸 자리에 그대로 둔다
 *
 * 삭제처럼 서버 액션으로 저장하는 것은 fresh를 그대로 따른다. 서버 액션은 순서대로 나가므로
 * 새로 읽기 전에 부른 것은 이미 fresh에 들어 있다. 새 행은 저장 큐가 만드는데, 만드는 중이면
 * store가 새로 읽기를 미룬다.
 */
export function mergeFresh(fresh: InitialData, local: InitialData, pending: Set<string>, newQ: string | null): InitialData {
  const keep = (kind: string, id: string) => pending.has(`${kind}:${id}`);

  const localCompanies = byId(local.companies);
  const companies = fresh.companies.map((c) => {
    const l = localCompanies.get(c.id);
    const localQuestions = byId(l?.questions ?? []);
    const questions = c.questions.map((q) => {
      const lq = localQuestions.get(q.id);
      return lq && keep("coverQuestion", q.id) ? lq : q;
    });
    const events = pickLocal(c.events, l?.events ?? [], (id) => keep("companyEvent", id));
    return { ...(l && keep("company", c.id) ? l : c), questions, events };
  });

  const localTopics = byId(local.topics);
  const topics = fresh.topics.map((t) => {
    const l = localTopics.get(t.id);
    const localQuestions = byId(l?.questions ?? []);
    // 새 질문은 쓰다가 이미 DB에 만들어졌을 수 있다. 맨 아래 것은 빼고 편집 칸 자리(맨 위)에 둔다.
    const questions = t.questions
      .filter((q) => q.id !== newQ)
      .map((q) => {
        const lq = localQuestions.get(q.id);
        return lq && keep("interviewQuestion", q.id) ? lq : q;
      });
    const draft = l?.questions.find((q) => q.id === newQ);
    return {
      ...t,
      name: l && keep("topic", t.id) ? l.name : t.name,
      questions: draft ? [draft, ...questions] : questions,
    };
  });

  const localGroups = byId(local.materialGroups);
  const materialGroups = fresh.materialGroups.map((g) => {
    const l = localGroups.get(g.id);
    const localItems = byId(l?.items ?? []);
    let items = g.items.map((m) => {
      const lm = localItems.get(m.id);
      return lm && keep("material", m.id) ? lm : m;
    });
    if (l && keep("materialOrder", g.id)) {
      const pos = new Map(l.items.map((m, i) => [m.id, i]));
      items = [...items].sort((a, b) => (pos.get(a.id) ?? pos.size) - (pos.get(b.id) ?? pos.size));
    }
    return { ...g, name: l && keep("materialGroup", g.id) ? l.name : g.name, items };
  });

  return {
    periodList: fresh.periodList,
    companies,
    topics,
    materialGroups,
    projects: pickLocal(fresh.projects, local.projects, (id) => keep("project", id)),
    jobs: pickLocal(fresh.jobs, local.jobs, (id) => keep("job", id)),
    // 누를 때마다 서버 액션으로 보내는 값이라 서버 것을 그대로 따른다.
    jobRules: fresh.jobRules,
  };
}

function byId<T extends { id: string }>(list: T[]): Map<string, T> {
  return new Map(list.map((x) => [x.id, x]));
}

function pickLocal<T extends { id: string }>(fresh: T[], local: T[], keep: (id: string) => boolean): T[] {
  const localById = byId(local);
  return fresh.map((x) => {
    const l = localById.get(x.id);
    return l && keep(x.id) ? l : x;
  });
}
