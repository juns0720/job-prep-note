"use client";

import { useEffect, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * 줄 수에 맞춰 높이가 늘어나는 textarea.
 * rows=1 / overflow:hidden / resize:none 으로 두고, 값이 바뀔 때마다
 * height='auto' 뒤에 scrollHeight를 넣는다. 첫 렌더에서도 한 번 호출한다.
 */
export function AutoGrowTextarea({
  value,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // height='auto'로 잠깐 줄어드는 순간 문서(또는 스크롤 칸)가 짧아져 브라우저가 스크롤을
  // 위로 당긴다. 긴 글 아래쪽을 쓰면 매 입력마다 화면이 튀므로 스크롤 위치를 적어뒀다 되돌린다.
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    const saved: [Element, number][] = [];
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p.scrollTop > 0) saved.push([p, p.scrollTop]);
    }
    const winY = window.scrollY;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    for (const [p, top] of saved) p.scrollTop = top;
    if (window.scrollY !== winY) window.scrollTo({ top: winY });
  };

  useIsomorphicLayoutEffect(fit, [value]);

  // 창 폭이 바뀌면 줄이 다시 접히므로 높이도 다시 잰다. 안 그러면 넘친 줄이 잘려 보인다.
  useEffect(() => {
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
    // fit은 ref만 읽어서 처음 것을 계속 써도 된다.
  }, []);

  return <textarea ref={ref} rows={1} value={value} {...rest} />;
}
