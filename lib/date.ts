import { DUE_SOON_DAYS } from "./config";

/**
 * "오늘"을 Asia/Seoul 기준으로 고정한다.
 *
 * 프로토타입은 브라우저 로컬 시간의 0시를 썼다. Next.js는 서버에서도 한 번
 * 렌더하는데 Vercel 런타임은 UTC라서, 같은 순간에도 서버와 브라우저의 날짜가
 * 하루 어긋나 D-day가 서로 다르게 찍히는 구간이 생긴다. 시간대를 서울로 고정하면
 * 양쪽 계산이 같아지고, 한국 사용자에게는 프로토타입과 결과가 동일하다.
 */
function todayInSeoul(): Date {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${iso}T00:00:00`);
}

/** 마감일까지 남은 일수. 마감일이 없거나 이상하면 null. */
function daysLeft(iso: string): number | null {
  if (!iso) return null;
  const due = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((due.getTime() - todayInSeoul().getTime()) / 86400000);
}

/** 날짜 표시. "2026-10-14" -> "2026.10.14" */
export function dueText(iso: string): string {
  if (!iso) return "마감일 미정";
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  return `${p[0]}.${p[1]}.${p[2]}`;
}

/** D-day 표시. */
export function dday(iso: string): string {
  if (!iso) return "날짜 없음";
  const n = daysLeft(iso);
  if (n === null) return "";
  if (n > 0) return `D-${n}`;
  if (n === 0) return "오늘 마감";
  return "마감 지남";
}

/** 0 이상이고 임박 기준일 이내면 빨간 배지. */
export function isSoon(iso: string, soonDays: number = DUE_SOON_DAYS): boolean {
  const n = daysLeft(iso);
  if (n === null) return false;
  return n >= 0 && n <= soonDays;
}

/**
 * 처음 로그인한 사용자에게 만들어 줄 기본 시기 이름. "2026 하반기"처럼
 * 상/하반기로 나눈다. 원본 디자인에는 없는 온보딩 로직이라 이 파일에 근거를 남겨둔다.
 */
export function currentPeriodLabel(): string {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const [year, month] = iso.split("-").map(Number);
  return `${year} ${month <= 6 ? "상반기" : "하반기"}`;
}

/** date 컬럼은 빈 문자열을 못 받는다. 마감일을 지우면 null로 보낸다. */
export function toDateOrNull(due: string): string | null {
  return due === "" ? null : due;
}
