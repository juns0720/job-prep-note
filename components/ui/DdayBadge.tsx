import type { CSSProperties } from "react";

type Variant = "row" | "rowPicked" | "name" | "namePicked" | "card";

/**
 * D-day 배지.
 * 임박(기준일 이내)이면 빨강, 아니면 회색. 선택된 목록 행 위에서는 배경을 #fff로
 * 바꿔 파란 면과 겹쳐 탁해지는 것을 막는다.
 * name은 자소서 목록에서 회사명 옆에 붙는 배지다. 카드와 같은 크기로 키운다.
 */
export function DdayBadge({
  text,
  soon,
  variant,
}: {
  text: string;
  soon: boolean;
  variant: Variant;
}) {
  const size =
    variant === "card" || variant === "name" || variant === "namePicked"
      ? "text-12 rounded-chip px-8 py-5 whitespace-nowrap"
      : "text-11 rounded-badge px-6 py-3";

  let tone: string;
  if (variant === "rowPicked" || variant === "namePicked") {
    tone = soon ? "font-bold text-rejected bg-white" : "font-semibold text-picked-sub bg-white";
  } else {
    tone = soon
      ? "font-bold text-rejected bg-rejected-bg"
      : "font-semibold text-muted bg-chip";
  }

  return <span className={`${size} ${tone} tabular-nums`}>{text}</span>;
}

export const NO_STYLE: CSSProperties = {};
