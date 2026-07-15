import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProfiles, profileMap } from "@/lib/data";
import { PageHeader, SectionCard, EmptyState, Badge } from "@/components/ui/primitives";
import { INTERVIEW_FORMAT_LABELS, INTERVIEW_STATUS_LABELS } from "@/lib/domain/constants";
import { formatDateTime } from "@/lib/domain/dates";
import type { Tables } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  await requireProfile();
  const supabase = await createClient();
  const [{ data: interviews }, { data: candidates }, { data: participants }, profiles] = await Promise.all([
    supabase.from("interviews").select("*").order("scheduled_start", { ascending: true }),
    supabase.from("candidates").select("id, full_name, position"),
    supabase.from("interview_participants").select("*"),
    getProfiles(),
  ]);
  void profileMap(profiles);
  const list = interviews ?? [];
  const candMap = new Map((candidates ?? []).map((c) => [c.id, c]));
  const now = new Date();

  const upcoming = list.filter((i) => i.status === "scheduled" && new Date(i.scheduled_start) >= now);
  const missingResult = list.filter((i) => i.status === "scheduled" && new Date(i.scheduled_start) < now);
  const completed = list.filter((i) => i.status === "completed").reverse();
  const cancelled = list.filter((i) => i.status === "cancelled" || i.status === "no_show");

  function Item({ i }: { i: Tables<"interviews"> }) {
    const cand = candMap.get(i.candidate_id);
    const parts = (participants ?? []).filter((p) => p.interview_id === i.id);
    const noMeet = i.format === "google_meet" && !i.meet_link;
    return (
      <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={`/candidates/${i.candidate_id}`} className="font-medium text-slate-800 hover:text-brand-600">
            {cand?.full_name ?? "—"}
          </Link>
          <span className="ml-2 text-xs text-slate-400">{cand?.position ?? ""}</span>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{formatDateTime(i.scheduled_start)}</span>
            <span>· {INTERVIEW_FORMAT_LABELS[i.format]}</span>
            <span>· {i.duration_minutes} мин</span>
            {noMeet ? <Badge className="bg-amber-100 text-amber-700 border-amber-200">нет ссылки</Badge> : null}
            {parts.length === 0 ? <Badge className="bg-amber-100 text-amber-700 border-amber-200">нет интервьюера</Badge> : null}
          </div>
        </div>
        <Badge>{INTERVIEW_STATUS_LABELS[i.status]}</Badge>
      </li>
    );
  }

  return (
    <>
      <PageHeader title="Собеседования" subtitle={`Всего: ${list.length} · часовой пояс Asia/Yerevan`} />

      {missingResult.length ? (
        <SectionCard title={`⚠ Ожидают результата (${missingResult.length})`} className="mb-5 border-amber-200">
          <ul className="divide-y divide-slate-100">{missingResult.map((i) => <Item key={i.id} i={i} />)}</ul>
        </SectionCard>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title={`Предстоящие (${upcoming.length})`}>
          {upcoming.length ? (
            <ul className="divide-y divide-slate-100">{upcoming.map((i) => <Item key={i.id} i={i} />)}</ul>
          ) : (
            <EmptyState title="Нет предстоящих собеседований" />
          )}
        </SectionCard>

        <SectionCard title={`Проведённые (${completed.length})`}>
          {completed.length ? (
            <ul className="divide-y divide-slate-100">{completed.map((i) => <Item key={i.id} i={i} />)}</ul>
          ) : (
            <EmptyState title="Пока нет проведённых собеседований" />
          )}
        </SectionCard>
      </div>

      {cancelled.length ? (
        <SectionCard title={`Отменённые / не пришли (${cancelled.length})`} className="mt-5">
          <ul className="divide-y divide-slate-100">{cancelled.map((i) => <Item key={i.id} i={i} />)}</ul>
        </SectionCard>
      ) : null}
    </>
  );
}
