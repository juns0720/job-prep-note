"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as authActions from "./actions/auth";
import * as companyActions from "./actions/companies";
import * as companyEventActions from "./actions/company-events";
import * as dataActions from "./actions/data";
import { createSaveQueue } from "./save-queue";
import { mergeFresh } from "./refresh";
import * as coverQuestionActions from "./actions/cover-questions";
import * as interviewQuestionActions from "./actions/interview-questions";
import * as jobActions from "./actions/job-postings";
import * as jobRuleActions from "./actions/job-rules";
import * as materialActions from "./actions/materials";
import * as periodActions from "./actions/periods";
import * as projectActions from "./actions/projects";
import * as topicActions from "./actions/topics";
import { DEFAULT_CHAR_LIMIT, NARROW_WIDTH } from "./config";
import { toDateOrNull } from "./date";
import { isStage, isSubmitted } from "./status";
import { toTab, type Tab } from "./tab";
import { bottomOrder, newId, topOrder } from "./text";
import type { Company, CompanyEvent, CompanyStatus, EventKind, JobPosting, JobRules, MaterialGroup, Period, Project, Topic } from "./types";

/**
 * 각 액션은 화면을 먼저(낙관적으로) 바꾸고, 그 뒤에 Supabase 서버 액션(lib/actions/*)을 불러 같은 내용을 저장한다.
 * 저장이 실패해도 화면은 되돌리지 않는다 — 실패 표시는 아직 없고 콘솔에만 남는다.
 *
 * 타이핑마다 오는 값(회사 필드, 자소서 문항, 재료, 재료 순서, 프로젝트, 공고 메모)은 기다리지 않고
 * 바로 보낸다. 서버 액션 대신 lib/save-queue.ts의 큐로 `/api/save`에 보낸다. 큐는 실패하면
 * 다시 보내고, 요청이 뒤바뀌어 도착해도 옛 값이 새 값을 덮지 않는다 — save-queue.ts 참고.
 *
 * 오래 가려져 있던 화면이 다시 보이면 데이터를 새로 읽는다(lib/refresh.ts). 다른 탭이나
 * 기기에서 고친 것을 옛 화면에 이어 써서 덮어쓰지 않게 하려는 것이다.
 */

export type { Tab };
export type PeriodMode = null | "edit" | "add";
/** 공고 목록을 무엇으로 줄 세울지. 마감이 급한 순 / 새로 들어온 순. */
export type JobSort = "due" | "collected";

/**
 * 공고 목록에서 무엇을 볼지.
 * open  아직 손대지 않은 것 (기본)
 * moved 자기소개서로 옮긴 것
 * gone  목록에서 뺀 것
 */
export type JobView = "open" | "moved" | "gone";
/** 공고 목록을 어느 사이트 것만 볼지. "all"이면 거르지 않는다. 나머지는 JobPosting.source 값. */
export type JobSource = "all" | string;

/**
 * 자기소개서 목록에서 무엇을 볼지.
 * writing 아직 제출하지 않은 회사 (기본. 진행 상태가 미제출·작성 중)
 * applied 제출한 회사 (진행 상태가 지원 완료·전형·합격·탈락)
 */
export type CoverView = "writing" | "applied";
/** 자기소개서 목록을 무엇으로 줄 세울지. 마감이 급한 순 / 최근에 추가한 순. */
export type CoverSort = "due" | "created";
/** 재료 탭에서 컨셉 대신 고를 수 있는 "최종" 모아 보기. groupId에 이 값을 넣는다. */
export const FINAL_GROUP = "final";

/** 이만큼 가려져 있다가 다시 보이면 데이터를 새로 읽는다. 잠깐 다른 창을 보고 오는 것까지 매번 읽지는 않는다. */
const REFRESH_AFTER_HIDDEN_MS = 30_000;
/** 새로 읽는 사이 화면이 바뀌어 다 못 바꿨을 때 다시 읽는 간격과 횟수. */
const REFRESH_RETRY_MS = 2_000;
const REFRESH_ATTEMPTS = 5;

export type CompanyDraft = { name: string; role: string; due: string };
export type QuestionDraft = { t: string; k: string; a: string };

export type InitialData = {
  periodList: Period[];
  companies: Company[];
  topics: Topic[];
  materialGroups: MaterialGroup[];
  projects: Project[];
  jobs: JobPosting[];
  jobRules: JobRules | null;
};

export type InitialView = {
  tab?: Tab;
  period?: string;
  company?: string;
  topic?: string;
  group?: string;
  job?: string;
};

type Store = {
  // 화면
  tab: Tab;
  narrow: boolean;
  detail: boolean;
  goCover: () => void;
  goMaterial: () => void;
  goProject: () => void;
  goInterview: () => void;
  goJobs: () => void;
  goCalendar: () => void;
  backToSide: () => void;
  signOut: () => void;

  // 지원 시기
  period: Period;
  periodList: Period[];
  pMode: PeriodMode;
  pDraft: string;
  setPeriod: (p: Period) => void;
  setPDraft: (v: string) => void;
  startEditPeriod: () => void;
  startAddPeriod: () => void;
  cancelPeriod: () => void;
  savePeriod: () => void;
  removePeriod: () => void;

  // 회사
  companies: Company[];
  coverId: string;
  editCo: string | null;
  coDraft: CompanyDraft;
  setCoDraft: (patch: Partial<CompanyDraft>) => void;
  selectCompany: (id: string) => void;
  startEditCompany: (c: Company) => void;
  cancelEditCompany: () => void;
  saveCompany: (id: string) => void;
  removeCompany: (c: Company) => void;
  addCompany: () => void;
  coverView: CoverView;
  setCoverView: (view: CoverView) => void;
  coverSort: CoverSort;
  setCoverSort: (sort: CoverSort) => void;
  setCompanyField: <K extends keyof Company>(id: string, key: K, value: Company[K]) => void;
  /** 캘린더에서 회사를 눌렀을 때. 그 회사의 시기·목록으로 옮겨 자기소개서 상세를 연다. */
  openCompany: (id: string) => void;

  // 전형 일정 — 회사마다 여러 개. 캘린더 탭에 뜬다
  addCompanyEvent: (companyId: string) => void;
  setCompanyEvent: (companyId: string, eventId: string, patch: Partial<Omit<CompanyEvent, "id">>) => void;
  removeCompanyEvent: (companyId: string, eventId: string) => void;

  // 자소서 문항
  addCoverQuestion: (companyId: string) => void;
  setCoverQuestion: (companyId: string, questionId: string, patch: { t?: string; limit?: number; a?: string }) => void;
  removeCoverQuestion: (companyId: string, questionId: string) => void;

  // 주제
  topics: Topic[];
  topicId: string;
  editTopic: string | null;
  topicDraft: string;
  setTopicDraft: (v: string) => void;
  selectTopic: (id: string) => void;
  startEditTopic: (t: Topic) => void;
  cancelEditTopic: () => void;
  saveTopic: (id: string) => void;
  removeTopic: (t: Topic) => void;
  addTopic: () => void;

  // 면접 질문
  editQ: string | null;
  newQ: string | null;
  qDraft: QuestionDraft;
  setQDraft: (patch: Partial<QuestionDraft>) => void;
  startEditQuestion: (id: string, draft: QuestionDraft) => void;
  cancelQuestion: (topicId: string, questionId: string) => void;
  saveQuestion: (topicId: string, questionId: string) => void;
  removeQuestion: (topicId: string, questionId: string) => void;
  addInterviewQuestion: (topicId: string) => void;

  // 재료 — 컨셉(갈등 상황, 기술 답변 ...) 아래에 문항을 모은다
  materialGroups: MaterialGroup[];
  groupId: string;
  editGroup: string | null;
  groupDraft: string;
  setGroupDraft: (v: string) => void;
  selectGroup: (id: string) => void;
  startEditGroup: (g: MaterialGroup) => void;
  cancelEditGroup: () => void;
  saveGroup: (id: string) => void;
  removeGroup: (g: MaterialGroup) => void;
  addGroup: () => void;
  addMaterial: (groupId: string) => void;
  setMaterial: (groupId: string, id: string, patch: { title?: string; t?: string; final?: boolean }) => void;
  removeMaterial: (groupId: string, id: string) => void;
  moveMaterial: (groupId: string, id: string, step: -1 | 1) => void;

  // 프로젝트 — 이름 · 설명 · 키워드. 목록 없이 한 화면에 세로로 쌓고, 바로 고치고 바로 저장한다
  projects: Project[];
  addProject: () => void;
  removeProject: (p: Project) => void;
  setProject: (id: string, patch: { name?: string; description?: string; keywords?: string }) => void;

  // 공고
  jobs: JobPosting[];
  jobId: string;
  jobView: JobView;
  setJobView: (view: JobView) => void;
  jobSort: JobSort;
  setJobSort: (sort: JobSort) => void;
  jobSource: JobSource;
  setJobSource: (source: JobSource) => void;
  selectJob: (id: string) => void;
  removeJob: (job: JobPosting) => void;
  restoreJob: (id: string) => void;
  setJobNote: (id: string, note: string) => void;
  addJobToCover: (job: JobPosting) => void;
  /** 공고 필터링 규칙. 수집기가 읽어 간다. 저장한 적이 없으면 null */
  jobRules: JobRules | null;
  saveJobRules: (rules: JobRules) => void;

  // 답변 접기
  closed: Record<string, boolean>;
  toggleAnswer: (questionId: string, open: boolean) => void;
  toggleAll: (questions: { id: string }[], anyOpen: boolean) => void;
};

const StudyNoteContext = createContext<Store | null>(null);

export function StudyNoteProvider({
  initial,
  initialView,
  children,
}: {
  initial: InitialData;
  initialView?: InitialView;
  children: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>(toTab(initialView?.tab));
  const [narrow, setNarrow] = useState(false);

  const initialPeriod = useMemo(() => {
    if (initialView?.period && initial.periodList.includes(initialView.period)) return initialView.period;
    return initial.periodList[0] ?? "";
  }, [initial.periodList, initialView?.period]);

  const initialCoverId = useMemo(() => {
    const inPeriod = initial.companies.filter((c) => c.period === initialPeriod);
    if (initialView?.company && inPeriod.some((c) => c.id === initialView.company)) return initialView.company;
    return inPeriod[0]?.id ?? "";
  }, [initial.companies, initialPeriod, initialView?.company]);

  const initialTopicId = useMemo(() => {
    if (initialView?.topic && initial.topics.some((t) => t.id === initialView.topic)) return initialView.topic;
    return initial.topics[0]?.id ?? "";
  }, [initial.topics, initialView?.topic]);

  // 새로고침 전에 상세를 보고 있었다면(URL에 회사·주제가 있었다면) 그 화면으로 바로 연다.
  const [detail, setDetail] = useState(() => {
    if (tab === "cover") return !!initialCoverId && !!initialView?.company;
    if (tab === "interview") return !!initialTopicId && !!initialView?.topic;
    if (tab === "material")
      return (
        initialView?.group === FINAL_GROUP ||
        (!!initialView?.group && initial.materialGroups.some((g) => g.id === initialView.group))
      );
    return !!initialView?.job;
  });

  const [period, setPeriodState] = useState<Period>(initialPeriod);
  const [periodList, setPeriodList] = useState<Period[]>(initial.periodList);
  const [pMode, setPMode] = useState<PeriodMode>(null);
  const [pDraft, setPDraftState] = useState("");

  const [companies, setCompanies] = useState<Company[]>(initial.companies);
  const [coverId, setCoverId] = useState(initialCoverId);
  const [editCo, setEditCo] = useState<string | null>(null);
  const [coverView, setCoverView] = useState<CoverView>("writing");
  const [coverSort, setCoverSort] = useState<CoverSort>("due");
  const [coDraft, setCoDraftState] = useState<CompanyDraft>({ name: "", role: "", due: "" });

  const [topics, setTopics] = useState<Topic[]>(initial.topics);
  const [topicId, setTopicId] = useState(initialTopicId);
  const [editTopic, setEditTopic] = useState<string | null>(null);
  const [topicDraft, setTopicDraftState] = useState("");

  const [editQ, setEditQ] = useState<string | null>(null);
  const [newQ, setNewQ] = useState<string | null>(null);
  const [qDraft, setQDraftState] = useState<QuestionDraft>({ t: "", k: "", a: "" });

  const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>(initial.materialGroups);
  const [groupId, setGroupId] = useState(() => {
    if (initialView?.group === FINAL_GROUP) return FINAL_GROUP;
    if (initialView?.group && initial.materialGroups.some((g) => g.id === initialView.group)) return initialView.group;
    return initial.materialGroups[0]?.id ?? "";
  });
  const [editGroup, setEditGroup] = useState<string | null>(null);
  const [groupDraft, setGroupDraftState] = useState("");

  const [projects, setProjects] = useState<Project[]>(initial.projects);

  const [jobs, setJobs] = useState<JobPosting[]>(initial.jobs);
  const [jobId, setJobId] = useState(() => {
    if (initialView?.job && initial.jobs.some((j) => j.id === initialView.job)) return initialView.job;
    return initial.jobs.find((j) => !j.picked && !j.deleted)?.id ?? "";
  });
  const [jobView, setJobView] = useState<JobView>("open");
  // 마감이 급한 것부터 보는 편이 쓸모 있어서 이쪽을 기본으로 둔다.
  const [jobSort, setJobSort] = useState<JobSort>("due");
  const [jobSource, setJobSource] = useState<JobSource>("all");
  const [jobRules, setJobRules] = useState<JobRules | null>(initial.jobRules);

  const [closed, setClosed] = useState<Record<string, boolean>>({});

  // 가로 760px 미만이면 목록과 상세 중 하나만 보여준다.
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < NARROW_WIDTH);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 보고 있던 화면을 새로고침 후에도 열 수 있게 주소창에 반영한다. 서버를 다시
  // 부르지 않으려고 Next.js 라우터 대신 history API를 직접 쓴다.
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "cover") params.set("tab", tab);
    if (period) params.set("period", period);
    if (tab === "cover" && coverId) params.set("company", coverId);
    if (tab === "interview" && topicId) params.set("topic", topicId);
    if (tab === "material" && groupId) params.set("group", groupId);
    if (tab === "job" && jobId) params.set("job", jobId);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [tab, period, coverId, topicId, groupId, jobId]);

  // 타이핑 중인 필드를 바로 보내는 저장 큐. 렌더마다 새로 만들지 않도록 ref에 한 번만 둔다.
  const saveQueueRef = useRef<ReturnType<typeof createSaveQueue> | null>(null);
  if (!saveQueueRef.current) saveQueueRef.current = createSaveQueue();
  const saveQueue = saveQueueRef.current;

  // 새로 읽기(아래 effect)가 시작할 때의 화면 데이터. 비동기로 읽는 동안 바뀌었는지 비교한다.
  const latest = useRef({ periodList, companies, topics, materialGroups, projects, jobs, jobRules, newQ });
  latest.current = { periodList, companies, topics, materialGroups, projects, jobs, jobRules, newQ };

  useEffect(() => {
    let hiddenAt = document.visibilityState === "hidden" ? Date.now() : 0;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // 읽는 동안 화면에서 바뀐 목록은 건드리지 않고, 조금 뒤 다시 읽는다.
    const later = (attempt: number) => {
      if (attempt >= REFRESH_ATTEMPTS) return;
      timer = setTimeout(() => void refresh(attempt + 1), REFRESH_RETRY_MS);
    };

    const refresh = async (attempt: number) => {
      if (running) return;
      // 만드는 중인 행은 새로 읽은 데이터에 아직 없을 수 있다.
      if (saveQueue.creating()) return later(attempt);
      running = true;
      const start = latest.current;
      const pendingAtStart = saveQueue.pendingKeys();
      try {
        const fresh = await dataActions.reloadUserData();
        if (saveQueue.creating()) return later(attempt);
        // 읽는 사이 서버가 받은 값도 fresh에는 빠져 있을 수 있어 시작할 때 것까지 합친다.
        const pending = new Set([...pendingAtStart, ...saveQueue.pendingKeys()]);
        const merged = mergeFresh(fresh, start, pending, start.newQ);
        // 읽는 사이 화면에서 바뀐 목록은 그대로 둔다.
        setPeriodList((prev) => (prev === start.periodList ? merged.periodList : prev));
        // 보고 있던 시기가 다른 곳에서 지워졌거나 이름이 바뀌었으면 첫 시기로 옮긴다.
        if (latest.current.periodList === start.periodList) {
          setPeriodState((prev) => (merged.periodList.includes(prev) ? prev : (merged.periodList[0] ?? "")));
        }
        setCompanies((prev) => (prev === start.companies ? merged.companies : prev));
        setTopics((prev) => (prev === start.topics ? merged.topics : prev));
        setMaterialGroups((prev) => (prev === start.materialGroups ? merged.materialGroups : prev));
        setProjects((prev) => (prev === start.projects ? merged.projects : prev));
        setJobs((prev) => (prev === start.jobs ? merged.jobs : prev));
        setJobRules((prev) => (prev === start.jobRules ? merged.jobRules : prev));
        const now = latest.current;
        const skipped = (["periodList", "companies", "topics", "materialGroups", "projects", "jobs", "jobRules"] as const).some(
          (k) => now[k] !== start[k],
        );
        if (skipped) later(attempt);
      } catch (e) {
        console.error("데이터 새로 읽기 실패", e);
      } finally {
        running = false;
      }
    };

    // 페이지를 떠나거나(새로고침·탭 닫기) 가려질 때(모바일에서 앱 전환) 확인 못 받은 값을
    // keepalive로 보낸다. 모바일은 beforeunload가 안 올 수 있어 pagehide와 visibilitychange를 쓴다.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        saveQueue.flush();
        return;
      }
      saveQueue.retry();
      if (hiddenAt && Date.now() - hiddenAt >= REFRESH_AFTER_HIDDEN_MS) void refresh(0);
      hiddenAt = 0;
    };
    const onHide = () => saveQueue.flush();
    // 뒤로 가기로 bfcache에서 되살아난 페이지는 언제 것인지 알 수 없다.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) void refresh(0);
    };
    const onOnline = () => saveQueue.retry();
    // 저장이 실패해 다시 보내려고 기다리는 값이 있으면 닫기 전에 브라우저가 한 번 묻게 한다.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveQueue.hasFailed()) e.preventDefault();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [saveQueue]);

  const mapCompany = useCallback(
    (id: string, fn: (c: Company) => Company) =>
      setCompanies((prev) => prev.map((c) => (c.id === id ? fn(c) : c))),
    [],
  );

  const mapJob = useCallback(
    (id: string, fn: (j: JobPosting) => JobPosting) =>
      setJobs((prev) => prev.map((j) => (j.id === id ? fn(j) : j))),
    [],
  );

  const mapGroup = useCallback(
    (id: string, fn: (g: MaterialGroup) => MaterialGroup) =>
      setMaterialGroups((prev) => prev.map((g) => (g.id === id ? fn(g) : g))),
    [],
  );

  const mapTopic = useCallback(
    (id: string, fn: (t: Topic) => Topic) =>
      setTopics((prev) => prev.map((t) => (t.id === id ? fn(t) : t))),
    [],
  );

  const value = useMemo<Store>(() => {
    return {
      tab,
      narrow,
      detail,
      goCover: () => {
        setTab("cover");
        setDetail(false);
      },
      goMaterial: () => {
        setTab("material");
        setDetail(false);
      },
      goProject: () => {
        setTab("project");
        setDetail(false);
      },
      goInterview: () => {
        setTab("interview");
        setDetail(false);
      },
      goJobs: () => {
        setTab("job");
        setDetail(false);
      },
      goCalendar: () => {
        setTab("calendar");
        setDetail(false);
      },
      backToSide: () => {
        setDetail(false);
        setEditQ(null);
      },
      signOut: () => {
        void authActions.signOut();
      },

      period,
      periodList,
      pMode,
      pDraft,
      setPeriod: (p) => {
        setPeriodState(p);
        setEditCo(null);
      },
      setPDraft: setPDraftState,
      startEditPeriod: () => {
        setPMode("edit");
        setPDraftState(period);
      },
      startAddPeriod: () => {
        setPMode("add");
        setPDraftState("");
      },
      cancelPeriod: () => setPMode(null),
      savePeriod: () => {
        const name = pDraft.trim();
        if (!name) {
          setPMode(null);
          return;
        }
        if (pMode === "add") {
          // 이름이 이미 있으면 새로 만들지 않고 그 시기를 선택한다.
          if (periodList.indexOf(name) >= 0) {
            setPMode(null);
            setPeriodState(name);
            return;
          }
          setPeriodList([name, ...periodList]);
          setPeriodState(name);
          setPMode(null);
          periodActions.createPeriod(name, topOrder()).catch((e) => console.error("시기 추가 실패", e));
        } else {
          const oldName = period;
          if (name === oldName) {
            setPMode(null);
            return;
          }
          // 다른 시기가 이미 쓰는 이름이면 바꾸지 않는다. periods의 unique(user_id, name)에
          // 걸려 서버만 실패하고 화면에는 같은 이름이 둘 남는다. 패널은 열어둔 채로 두어
          // 다른 이름으로 고칠 수 있게 하고, 안내는 CoverAside가 보여준다.
          if (periodList.includes(name)) return;
          // 이름을 고치면 그 시기에 속한 회사의 period도 같이 바꾼다.
          setPeriodList(periodList.map((p) => (p === oldName ? name : p)));
          setCompanies((prev) => prev.map((c) => (c.period === oldName ? { ...c, period: name } : c)));
          setPeriodState(name);
          setPMode(null);
          periodActions.renamePeriod(oldName, name).catch((e) => console.error("시기 이름 변경 실패", e));
        }
      },
      removePeriod: () => {
        if (!window.confirm(`${period} 시기를 지울까?`)) return;
        const left = periodList.filter((p) => p !== period);
        setPeriodList(left);
        setPeriodState(left[0] || "");
        setPMode(null);
        periodActions.removePeriod(period).catch((e) => console.error("시기 삭제 실패", e));
      },

      companies,
      coverId,
      editCo,
      coDraft,
      setCoDraft: (patch) => setCoDraftState((prev) => ({ ...prev, ...patch })),
      selectCompany: (id) => {
        setCoverId(id);
        setDetail(true);
      },
      startEditCompany: (c) => {
        setEditCo(c.id);
        setCoDraftState({ name: c.name, role: c.role, due: c.due });
      },
      cancelEditCompany: () => setEditCo(null),
      saveCompany: (id) => {
        setEditCo(null);
        mapCompany(id, (c) => ({ ...c, name: coDraft.name, role: coDraft.role, due: coDraft.due }));
        // 마감일은 상세 화면에서도 고친다. 같은 큐로 보내야 순서가 엇갈리지 않는다.
        saveQueue.save("company", id, { name: coDraft.name, role: coDraft.role, due: toDateOrNull(coDraft.due) });
      },
      removeCompany: (c) => {
        if (!window.confirm(`${c.name} 지원 기록을 지울까?`)) return;
        setCompanies((prev) => prev.filter((x) => x.id !== c.id));
        setEditCo(null);
        companyActions.removeCompany(c.id).catch((e) => console.error("회사 삭제 실패", e));
      },
      addCompany: () => {
        const id = newId();
        setCompanies((prev) => [
          ...prev,
          {
            id,
            period,
            name: "새 회사",
            role: "직무",
            due: "",
            status: "draft",
            url: "",
            memo: "",
            createdAt: new Date().toISOString(),
            questions: [],
            events: [],
          },
        ]);
        setCoverId(id);
        setEditCo(id);
        setCoverView("writing"); // 새 회사는 미제출이라 작성 중 쪽에 놓인다.
        setDetail(false); // 이름을 먼저 고치게 되므로 목록 화면에 머문다.
        setCoDraftState({ name: "새 회사", role: "직무", due: "" });
        const created = companyActions.createCompany({ id, period, name: "새 회사", role: "직무" });
        saveQueue.trackCreate([id], created);
        created.catch((e) => console.error("회사 추가 실패", e));
      },
      setCompanyField: (id, key, v) => {
        mapCompany(id, (c) => ({ ...c, [key]: v }));
        const k = key as string;
        saveQueue.save("company", id, k === "due" ? { due: toDateOrNull(v as string) } : { [k]: v });
      },
      openCompany: (id) => {
        const c = companies.find((x) => x.id === id);
        if (!c) return;
        setTab("cover");
        setPeriodState(c.period);
        setPMode(null);
        setEditCo(null);
        setCoverView(isSubmitted(c) ? "applied" : "writing");
        setCoverId(id);
        setDetail(true);
      },

      addCompanyEvent: (companyId) => {
        const id = newId();
        // 지금 전형 단계를 고른 회사면 그 단계로 시작한다. 서류 합격이면 다음은 대개 코딩테스트다.
        const status = companies.find((c) => c.id === companyId)?.status;
        const kind: EventKind = status && isStage(status) && status !== "docs_passed" ? status : "coding_test";
        // 날짜를 고르기 전이라 목록 맨 뒤(날짜 미정 자리)에 붙는다.
        mapCompany(companyId, (c) => ({ ...c, events: [...c.events, { id, kind, date: "", memo: "" }] }));
        const created = companyEventActions.createCompanyEvent({ id, companyId, kind });
        saveQueue.trackCreate([id], created);
        created.catch((e) => console.error("일정 추가 실패", e));
      },
      setCompanyEvent: (companyId, eventId, patch) => {
        // 날짜를 바꿔도 줄 순서는 그대로 둔다. 고치는 도중에 줄이 움직이면 엉뚱한 칸을 누르게 된다.
        // 날짜순 정렬은 다음에 읽을 때(새로고침) 한다.
        mapCompany(companyId, (c) => ({
          ...c,
          events: c.events.map((ev) => (ev.id === eventId ? { ...ev, ...patch } : ev)),
        }));
        saveQueue.save("companyEvent", eventId, "date" in patch ? { ...patch, date: toDateOrNull(patch.date ?? "") } : patch);
      },
      removeCompanyEvent: (companyId, eventId) => {
        if (!window.confirm("이 일정을 지울까?")) return;
        mapCompany(companyId, (c) => ({ ...c, events: c.events.filter((ev) => ev.id !== eventId) }));
        companyEventActions.removeCompanyEvent(eventId).catch((e) => console.error("일정 삭제 실패", e));
      },

      coverView,
      setCoverView,
      coverSort,
      setCoverSort,

      addCoverQuestion: (companyId) => {
        const id = newId();
        mapCompany(companyId, (c) => ({
          ...c,
          questions: [...c.questions, { id, t: "", limit: DEFAULT_CHAR_LIMIT, a: "" }],
        }));
        const created = coverQuestionActions.createCoverQuestion({
          id,
          companyId,
          charLimit: DEFAULT_CHAR_LIMIT,
          sortOrder: bottomOrder(),
        });
        saveQueue.trackCreate([id], created);
        created.catch((e) => console.error("문항 추가 실패", e));
      },
      setCoverQuestion: (companyId, questionId, patch) => {
        mapCompany(companyId, (c) => ({
          ...c,
          questions: c.questions.map((q) => (q.id === questionId ? { ...q, ...patch } : q)),
        }));
        saveQueue.save("coverQuestion", questionId, patch);
      },
      removeCoverQuestion: (companyId, questionId) => {
        if (!window.confirm("이 문항을 지울까?")) return;
        mapCompany(companyId, (c) => ({ ...c, questions: c.questions.filter((q) => q.id !== questionId) }));
        coverQuestionActions.removeCoverQuestion(questionId).catch((e) => console.error("문항 삭제 실패", e));
      },

      topics,
      topicId,
      editTopic,
      topicDraft,
      setTopicDraft: setTopicDraftState,
      selectTopic: (id) => {
        setTopicId(id);
        setEditQ(null);
        setDetail(true);
      },
      startEditTopic: (t) => {
        setEditTopic(t.id);
        setTopicDraftState(t.name);
      },
      cancelEditTopic: () => setEditTopic(null),
      saveTopic: (id) => {
        setEditTopic(null);
        mapTopic(id, (t) => ({ ...t, name: topicDraft }));
        topicActions.renameTopic(id, topicDraft).catch((e) => console.error("주제 저장 실패", e));
      },
      removeTopic: (t) => {
        if (!window.confirm(`${t.name} 주제와 질문 ${t.questions.length}개를 지울까?`)) return;
        const left = topics.filter((x) => x.id !== t.id);
        setTopics(left);
        setEditTopic(null);
        if (topicId === t.id) setTopicId(left[0] ? left[0].id : "");
        topicActions.removeTopic(t.id).catch((e) => console.error("주제 삭제 실패", e));
      },
      addTopic: () => {
        const id = newId();
        setTopics((prev) => [...prev, { id, name: "새 주제", questions: [] }]);
        setTopicId(id);
        setEditTopic(id);
        setTopicDraftState("새 주제");
        setDetail(false);
        topicActions
          .createTopic({ id, name: "새 주제", sortOrder: bottomOrder() })
          .catch((e) => console.error("주제 추가 실패", e));
      },

      editQ,
      newQ,
      qDraft,
      setQDraft: (patch) => setQDraftState((prev) => ({ ...prev, ...patch })),
      startEditQuestion: (id, draft) => {
        setEditQ(id);
        setQDraftState(draft);
      },
      cancelQuestion: (tId, qId) => {
        // 새로 추가한 질문은 아직 서버에 없다(저장할 때 비로소 생긴다).
        // 비운 채 취소하면 그 항목을 목록에서 없애기만 하면 된다.
        if (newQ === qId) {
          setEditQ(null);
          setNewQ(null);
          mapTopic(tId, (t) => ({ ...t, questions: t.questions.filter((x) => x.id !== qId) }));
        } else {
          setEditQ(null);
        }
      },
      saveQuestion: (tId, qId) => {
        const next = {
          t: qDraft.t,
          // 저장할 때 , 와 줄바꿈으로 끊고 앞뒤 공백을 지우고 빈 항목을 버린다.
          // 같은 키워드가 두 번 들어오면 칩의 React key가 겹치므로 한 번 걸러낸다.
          k: [...new Set(qDraft.k.split(/[,\n]/).map((v) => v.trim()).filter((v) => v))],
          a: qDraft.a,
        };
        const isNew = newQ === qId;
        setEditQ(null);
        setNewQ(null);
        mapTopic(tId, (t) => {
          const target = t.questions.find((x) => x.id === qId);
          if (!target) return t;
          const updated = { ...target, ...next };
          return {
            ...t,
            // 새 질문은 저장할 때 목록 맨 아래로 옮긴다.
            questions: isNew
              ? [...t.questions.filter((x) => x.id !== qId), updated]
              : t.questions.map((x) => (x.id !== qId ? x : updated)),
          };
        });
        if (isNew) {
          interviewQuestionActions
            .createInterviewQuestion({ id: qId, topicId: tId, ...next, sortOrder: bottomOrder() })
            .catch((e) => console.error("질문 추가 실패", e));
        } else {
          interviewQuestionActions.updateInterviewQuestion(qId, next).catch((e) => console.error("질문 저장 실패", e));
        }
      },
      removeQuestion: (tId, qId) => {
        if (!window.confirm("이 질문을 지울까?")) return;
        const wasNew = newQ === qId;
        setEditQ(null);
        if (wasNew) setNewQ(null);
        mapTopic(tId, (t) => ({ ...t, questions: t.questions.filter((x) => x.id !== qId) }));
        // 아직 저장 전(새 질문)이면 서버에는 애초에 없으니 지울 것도 없다.
        if (!wasNew) {
          interviewQuestionActions.removeInterviewQuestion(qId).catch((e) => console.error("질문 삭제 실패", e));
        }
      },
      addInterviewQuestion: (tId) => {
        if (!tId) return;
        const id = newId();
        setEditQ(id);
        setNewQ(id);
        setQDraftState({ t: "", k: "", a: "" });
        // 빈 편집 칸이 목록 맨 위에 열린다. 저장 전까지는 로컬에만 있다.
        mapTopic(tId, (t) => ({ ...t, questions: [{ id, t: "", k: [], a: "" }, ...t.questions] }));
      },

      materialGroups,
      groupId,
      editGroup,
      groupDraft,
      setGroupDraft: setGroupDraftState,
      selectGroup: (id) => {
        setGroupId(id);
        setDetail(true);
      },
      startEditGroup: (g) => {
        setEditGroup(g.id);
        setGroupDraftState(g.name);
      },
      cancelEditGroup: () => setEditGroup(null),
      saveGroup: (id) => {
        setEditGroup(null);
        mapGroup(id, (g) => ({ ...g, name: groupDraft }));
        materialActions.renameMaterialGroup(id, groupDraft).catch((e) => console.error("컨셉 저장 실패", e));
      },
      removeGroup: (g) => {
        if (!window.confirm(`${g.name} 컨셉과 문항 ${g.items.length}개를 지울까?`)) return;
        const left = materialGroups.filter((x) => x.id !== g.id);
        setMaterialGroups(left);
        setEditGroup(null);
        if (groupId === g.id) setGroupId(left[0] ? left[0].id : "");
        materialActions.removeMaterialGroup(g.id).catch((e) => console.error("컨셉 삭제 실패", e));
      },
      addGroup: () => {
        // 면접 준비의 주제 추가와 같다. 이름을 먼저 고치게 되므로 목록 화면에 머문다.
        const id = newId();
        setMaterialGroups((prev) => [...prev, { id, name: "새 컨셉", items: [] }]);
        setGroupId(id);
        setEditGroup(id);
        setGroupDraftState("새 컨셉");
        setDetail(false);
        const created = materialActions.createMaterialGroup({ id, name: "새 컨셉", sortOrder: bottomOrder() });
        saveQueue.trackCreate([id], created);
        created.catch((e) => console.error("컨셉 추가 실패", e));
      },

      addMaterial: (gId) => {
        if (!gId) return;
        const id = newId();
        mapGroup(gId, (g) => ({ ...g, items: [...g.items, { id, title: "", t: "", final: false }] }));
        const created = materialActions.createMaterial({ id, groupId: gId, sortOrder: bottomOrder() });
        saveQueue.trackCreate([id], created);
        created.catch((e) => console.error("재료 추가 실패", e));
      },
      setMaterial: (gId, id, patch) => {
        mapGroup(gId, (g) => ({ ...g, items: g.items.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
        saveQueue.save("material", id, patch);
      },
      removeMaterial: (gId, id) => {
        if (!window.confirm("이 문항을 지울까?")) return;
        mapGroup(gId, (g) => ({ ...g, items: g.items.filter((m) => m.id !== id) }));
        materialActions.removeMaterial(id).catch((e) => console.error("재료 삭제 실패", e));
      },
      moveMaterial: (gId, id, step) => {
        const items = materialGroups.find((g) => g.id === gId)?.items ?? [];
        const from = items.findIndex((m) => m.id === id);
        const to = from + step;
        if (from < 0 || to < 0 || to >= items.length) return;
        const next = [...items];
        [next[from], next[to]] = [next[to], next[from]];
        mapGroup(gId, (g) => ({ ...g, items: next }));
        // 보내는 중에 또 누르면 마지막 순서만 뒤이어 보낸다.
        saveQueue.save("materialOrder", gId, { ids: next.map((m) => m.id) });
      },

      projects,
      addProject: () => {
        // 맨 아래에 빈 카드를 붙인다. 이름도 그 카드에서 바로 고친다.
        const id = newId();
        setProjects((prev) => [...prev, { id, name: "새 프로젝트", description: "", keywords: "" }]);
        const created = projectActions.createProject({ id, name: "새 프로젝트", sortOrder: bottomOrder() });
        saveQueue.trackCreate([id], created);
        created.catch((e) => console.error("프로젝트 추가 실패", e));
      },
      removeProject: (p) => {
        if (!window.confirm(`${p.name || "이름 없는"} 프로젝트를 지울까?`)) return;
        setProjects((prev) => prev.filter((x) => x.id !== p.id));
        projectActions.removeProject(p.id).catch((e) => console.error("프로젝트 삭제 실패", e));
      },
      setProject: (id, patch) => {
        setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
        saveQueue.save("project", id, patch);
      },

      jobs,
      jobId,
      jobView,
      setJobView: (view) => {
        setJobView(view);
        setJobId("");
      },
      jobSort,
      setJobSort,
      jobSource,
      setJobSource: (source) => {
        setJobSource(source);
        setJobId("");
      },
      selectJob: (id) => {
        setJobId(id);
        setDetail(true);
      },

      removeJob: (job) => {
        if (!window.confirm(`${job.company || job.title} 공고를 목록에서 뺄까? 다시 수집해도 올라오지 않는다.`))
          return;
        mapJob(job.id, (j) => ({ ...j, deleted: true }));
        if (jobId === job.id) setJobId("");
        jobActions.removeJobPosting(job.id).catch((e) => console.error("공고 삭제 실패", e));
      },
      restoreJob: (id) => {
        // 지운 것이든 옮긴 것이든 다시 대기 목록으로 돌린다.
        mapJob(id, (j) => ({ ...j, deleted: false, picked: false }));
        jobActions
          .updateJobPosting(id, { deleted: false, picked: false })
          .catch((e) => console.error("공고 되돌리기 실패", e));
      },
      setJobNote: (id, note) => {
        mapJob(id, (j) => ({ ...j, note }));
        saveQueue.save("job", id, { note });
      },
      addJobToCover: (job) => {
        // 공고를 지원 기록으로 옮긴다. 고른 이유(note)가 회사 카드의 메모로 가고,
        // 수집해 둔 자소서 문항이 있으면 문항까지 그대로 만들어 둔다.
        const id = newId();
        const role = job.sector.split(",")[0]?.trim() || "직무";
        const base = bottomOrder();
        const questions = job.questions.map((q, i) => ({
          id: newId(),
          t: q.question,
          limit: q.limit ?? DEFAULT_CHAR_LIMIT,
          a: "",
          sortOrder: base + i,
        }));
        setCompanies((prev) => [
          ...prev,
          {
            id,
            period,
            name: job.company || job.title,
            role,
            due: job.due,
            status: "draft",
            // 지원은 회사 채용 페이지에서 한다. 없으면 공고 주소를 둔다.
            url: job.applyUrl || job.url,
            memo: job.note,
            createdAt: new Date().toISOString(),
            questions: questions.map(({ sortOrder: _drop, ...q }) => q),
            events: [],
          },
        ]);
        // 옮긴 공고는 대기 목록에서 빠진다. "옮김"으로 넘겨 두면 언제 무엇을
        // 넘겼는지 나중에 확인할 수 있고, 다시 수집해도 되살아나지 않는다.
        mapJob(job.id, (j) => ({ ...j, picked: true }));
        if (jobId === job.id) setJobId("");
        const created = companyActions
          .createCompany({
            id,
            period,
            name: job.company || job.title,
            role,
            url: job.applyUrl || job.url,
            due: job.due || null,
            memo: job.note,
          })
          .then(() =>
            coverQuestionActions.createCoverQuestions(
              id,
              questions.map((q) => ({ id: q.id, body: q.t, charLimit: q.limit, sortOrder: q.sortOrder })),
            ),
          );
        saveQueue.trackCreate([id, ...questions.map((q) => q.id)], created);
        created.catch((e) => console.error("회사 추가 실패", e));
        jobActions.updateJobPosting(job.id, { picked: true }).catch((e) => console.error("공고 저장 실패", e));
      },
      jobRules,
      saveJobRules: (rules) => {
        setJobRules(rules);
        jobRuleActions.saveJobRules(rules).catch((e) => console.error("필터링 규칙 저장 실패", e));
      },

      closed,
      toggleAnswer: (qId, open) => setClosed((prev) => ({ ...prev, [qId]: open })),
      toggleAll: (questions, anyOpen) => {
        const next: Record<string, boolean> = {};
        if (anyOpen) questions.forEach((q) => (next[q.id] = true));
        setClosed(next);
      },
    };
  }, [
    tab, narrow, detail,
    period, periodList, pMode, pDraft,
    companies, coverId, editCo, coDraft, coverView, coverSort,
    topics, topicId, editTopic, topicDraft,
    editQ, newQ, qDraft, closed,
    materialGroups, groupId, editGroup, groupDraft,
    projects,
    jobs, jobId, jobView, jobSort, jobSource, jobRules,
    mapCompany, mapTopic, mapJob, mapGroup, saveQueue,
  ]);

  return <StudyNoteContext.Provider value={value}>{children}</StudyNoteContext.Provider>;
}

export function useStudyNote(): Store {
  const ctx = useContext(StudyNoteContext);
  if (!ctx) throw new Error("useStudyNote는 StudyNoteProvider 안에서만 쓴다.");
  return ctx;
}

export type { CompanyStatus };
