import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SetupNotice } from "@/components/SetupNotice";
import { loadUserData } from "@/lib/data/queries";
import { DEPLOYMENT } from "@/lib/deployment";
import { StudyNoteProvider, type InitialView } from "@/lib/store";
import { toTab } from "@/lib/tab";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Supabase가 주는 에러는 Error가 아니라 message를 가진 객체다. */
function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  // 접속값이 없으면 Supabase를 부르는 대신 무엇을 넣어야 하는지 보여준다.
  if (!supabaseConfigured) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;

  // 스키마를 아직 안 올렸거나 정책이 빠지면 여기서 던진다. 그대로 두면 화면에
  // 사유가 안 보이는 500만 남아서, 무엇을 고쳐야 하는지 알 수 없다.
  let data;
  try {
    data = await loadUserData(user.id);
  } catch (e) {
    return <SetupNotice error={errorMessage(e)} />;
  }

  const initialView: InitialView = {
    tab: toTab(params.tab),
    period: typeof params.period === "string" ? params.period : undefined,
    company: typeof params.company === "string" ? params.company : undefined,
    topic: typeof params.topic === "string" ? params.topic : undefined,
    group: typeof params.group === "string" ? params.group : undefined,
    job: typeof params.job === "string" ? params.job : undefined,
    section: typeof params.section === "string" ? params.section : undefined,
  };

  return (
    <StudyNoteProvider initial={data} initialView={initialView} deployment={DEPLOYMENT}>
      <AppShell userEmail={user.email ?? ""} />
    </StudyNoteProvider>
  );
}
