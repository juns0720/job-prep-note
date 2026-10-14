/**
 * 글자 수는 코드 포인트로 센다. String.length는 이모지가 섞이면
 * 실제로 보이는 글자 수와 어긋난다.
 */
export function charLength(s: string): number {
  return s ? Array.from(s).length : 0;
}

/** 목록 순번. 1 -> "01" */
export function ordinal(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/**
 * 새 회사·주제·문항의 id. DB의 uuid 기본키와 같은 값을 클라이언트가 미리 만들어
 * 낙관적 업데이트에 바로 쓴다 — 서버가 id를 새로 발급해 돌려줄 때까지 기다리지 않는다.
 */
export function newId(): string {
  return crypto.randomUUID();
}

/**
 * 목록 맨 위/맨 아래에 넣을 때 쓰는 정렬값. 현재 목록을 다시 조회하지 않고도
 * "새로 추가한 것이 항상 가장 위(또는 아래)"가 되도록 시간을 그대로 쓴다.
 * bottomOrder는 증가하기만 하고, topOrder는 감소하기만 해서 서로 절대 겹치지 않는다.
 */
export function bottomOrder(): number {
  return Date.now();
}

export function topOrder(): number {
  return -Date.now();
}
