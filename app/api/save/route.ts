import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createItem, saveItem } from "@/lib/data/save";
import {
  CREATE_KINDS,
  SAVE_KINDS,
  type CreateItem,
  type SaveItem,
  type SaveRequest,
  type SaveResponse,
  type SaveStatus,
} from "@/lib/save-queue";
import { createClient } from "@/lib/supabase/server";

/**
 * lib/save-queue.ts가 보내는 새 행 만들기와 필드 저장을 받는다. 만들기(creates)를 보낸 순서대로
 * 하나씩 끝낸 뒤 필드 저장(items)을 반영한다 — 같은 요청에 새 행과 그 행의 update가 함께 올 수
 * 있다. 결과(ok·stale·missing·error)를 항목 순서대로 돌려준다. 한 항목이 실패해도 나머지는
 * 그대로 반영한다 — 큐가 실패한 항목만 다시 보낸다.
 *
 * 서버 액션과 달리 배포가 바뀌어도 주소가 그대로다. 배포 전에 열어 둔 화면도 여기로는 저장된다.
 * 그래서 요청 모양을 바꿀 때는 옛 화면이 보내는 모양(creates 없음)도 받는다.
 *
 * 로그인 확인은 한 번만 하고, 쿼리마다 user_id 조건을 건다(RLS가 한 번 더 막는다).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCreate(v: unknown): v is CreateItem {
  if (!v || typeof v !== "object") return false;
  const item = v as Record<string, unknown>;
  return (
    CREATE_KINDS.includes(item.kind as CreateItem["kind"]) &&
    typeof item.id === "string" &&
    UUID.test(item.id) &&
    !!item.row &&
    typeof item.row === "object"
  );
}

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
  const creates = body?.creates ?? [];
  // 잘못 만든 요청은 다시 보내도 똑같이 실패한다. 400으로 돌려보내면 큐가 버린다.
  if (
    typeof tab !== "string" ||
    !UUID.test(tab) ||
    !Array.isArray(items) ||
    !items.every(isItem) ||
    !Array.isArray(creates) ||
    !creates.every(isCreate)
  ) {
    return NextResponse.json({ error: "잘못된 저장 요청" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요하다." }, { status: 401 });

  const db = supabase as unknown as SupabaseClient;
  // 회사가 실패하면 그 회사의 문항도 만들 수 없다. 첫 실패 뒤로는 손대지 않고 error로 돌려
  // 큐가 순서 그대로 다시 보내게 한다.
  const created: SaveStatus[] = [];
  for (const item of creates) {
    created.push(created.includes("error") ? "error" : await createItem(db, user.id, item));
  }
  const results = await Promise.all(items.map((item) => saveItem(db, user.id, tab, item)));
  return NextResponse.json({ created, results } satisfies SaveResponse);
}
