import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { saveItem } from "@/lib/data/save";
import { SAVE_KINDS, type SaveItem, type SaveRequest, type SaveResponse } from "@/lib/save-queue";
import { createClient } from "@/lib/supabase/server";

/**
 * lib/save-queue.ts가 보내는 필드 저장을 받는다. 항목마다 lib/data/save.ts가 반영하고,
 * 결과(ok·stale·missing·error)를 항목 순서대로 돌려준다. 한 항목이 실패해도 나머지는
 * 그대로 반영한다 — 큐가 실패한 항목만 다시 보낸다.
 *
 * 로그인 확인은 한 번만 하고, 쿼리마다 user_id 조건을 건다(RLS가 한 번 더 막는다).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isItem(v: unknown): v is SaveItem {
  if (!v || typeof v !== "object") return false;
  const item = v as Record<string, unknown>;
  return (
    SAVE_KINDS.includes(item.kind as SaveItem["kind"]) &&
    typeof item.id === "string" &&
    UUID.test(item.id) &&
    Number.isSafeInteger(item.seq) &&
    (item.seq as number) > 0 &&
    !!item.patch &&
    typeof item.patch === "object"
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<SaveRequest> | null;
  const tab = body?.tab;
  const items = body?.items;
  // 잘못 만든 요청은 다시 보내도 똑같이 실패한다. 400으로 돌려보내면 큐가 버린다.
  if (typeof tab !== "string" || !UUID.test(tab) || !Array.isArray(items) || !items.every(isItem)) {
    return NextResponse.json({ error: "잘못된 저장 요청" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요하다." }, { status: 401 });

  const results = await Promise.all(
    items.map((item) => saveItem(supabase as unknown as SupabaseClient, user.id, tab, item)),
  );
  return NextResponse.json({ results } satisfies SaveResponse);
}
