import { NextResponse } from "next/server";
import { DEPLOYMENT } from "@/lib/deployment";

/** 지금 배포의 값을 돌려준다. 열어 둔 화면이 옛 배포의 코드로 돌고 있는지 store가 확인한다. */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ deployment: DEPLOYMENT }, { headers: { "cache-control": "no-store" } });
}
