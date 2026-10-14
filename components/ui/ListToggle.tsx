/**
 * 목록 위의 토글 버튼. 공고와 자기소개서 목록이 같이 쓴다.
 * ViewButton은 목록을 나누는 것(대기·옮김·지움 / 작성 중·지원 완료),
 * SortButton은 줄 세우는 순서(마감순·최신순)다. 공고의 사이트 필터도 이 모양을 빌려 쓰고,
 * 그때는 count로 건수를 붙인다.
 */

export function ViewButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-mini bg-accent-bg px-10 py-7 text-12 font-semibold text-picked-title"
          : "rounded-mini px-10 py-7 text-12 font-medium text-muted hover:text-ink"
      }
    >
      {label} <span className="tabular-nums">{count}</span>
    </button>
  );
}

export function SortButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-mini bg-divider px-10 py-7 text-12 font-semibold text-ink"
          : "rounded-mini px-10 py-7 text-12 font-medium text-muted hover:text-ink"
      }
    >
      {label}
      {count !== undefined && <> <span className="tabular-nums">{count}</span></>}
    </button>
  );
}
