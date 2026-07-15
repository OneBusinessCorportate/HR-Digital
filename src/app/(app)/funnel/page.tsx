import Link from "next/link";
import { requireProfile, canEdit } from "@/lib/auth";
import { getRecruitmentData, getProfiles, profileMap } from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/ui/primitives";
import { StageSelect } from "@/components/kanban/StageSelect";
import {
  PIPELINE_STAGES,
  STAGE_SHORT_LABELS,
  STAGE_COLORS,
  type Stage,
} from "@/lib/domain/funnel";
import { SOURCE_LABELS } from "@/lib/domain/constants";
import { daysBetween, formatDate } from "@/lib/domain/dates";
import type { Tables } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function FunnelPage() {
  const profile = await requireProfile();
  const editable = canEdit(profile);
  const [data, profiles] = await Promise.all([getRecruitmentData(), getProfiles()]);
  const names = profileMap(profiles);

  // Latest stage-entry time per candidate (for "days in stage").
  const lastStageChange = new Map<string, string>();
  for (const h of data.history) {
    const cur = lastStageChange.get(h.candidate_id);
    if (!cur || new Date(h.created_at) > new Date(cur)) lastStageChange.set(h.candidate_id, h.created_at);
  }

  const columns: { stage: Stage; label: string }[] = [
    ...PIPELINE_STAGES.map((s) => ({ stage: s, label: STAGE_SHORT_LABELS[s] })),
    { stage: "hired" as Stage, label: STAGE_SHORT_LABELS.hired },
  ];

  const grouped = new Map<Stage, Tables<"candidates">[]>();
  for (const col of columns) grouped.set(col.stage, []);
  for (const c of data.candidates) {
    if (c.stage === "rejected") continue;
    const arr = grouped.get(c.stage as Stage);
    if (arr) arr.push(c);
  }

  const total = data.candidates.filter((c) => c.stage !== "rejected" && c.stage !== "hired").length;

  return (
    <>
      <PageHeader
        title="Воронка найма"
        subtitle={`${total} активных кандидатов · перетаскивание заменено надёжным выбором этапа`}
        actions={<Link href="/candidates/new" className="btn-primary">+ Кандидат</Link>}
      />

      {data.candidates.length === 0 ? (
        <EmptyState
          title="Пока нет кандидатов"
          hint="Добавьте первого кандидата, чтобы увидеть воронку"
          action={<Link href="/candidates/new" className="btn-primary">Добавить кандидата</Link>}
        />
      ) : (
        <div className="scroll-x -mx-4 px-4 pb-4">
          <div className="flex gap-4" style={{ minWidth: `${columns.length * 260}px` }}>
            {columns.map((col) => {
              const list = grouped.get(col.stage) ?? [];
              return (
                <div key={col.stage} className="w-64 shrink-0">
                  <div className={`mb-2 flex items-center justify-between rounded-lg border px-3 py-2 ${STAGE_COLORS[col.stage]}`}>
                    <span className="text-sm font-semibold">{col.label}</span>
                    <span className="rounded-full bg-white/70 px-2 text-xs font-medium">{list.length}</span>
                  </div>
                  <div className="space-y-2">
                    {list.map((c) => {
                      const enteredAt = lastStageChange.get(c.id) ?? c.created_at;
                      const days = daysBetween(enteredAt, new Date());
                      const overdue = c.next_action_date
                        ? new Date(`${c.next_action_date}T23:59:59Z`) < new Date()
                        : false;
                      return (
                        <div key={c.id} className="card p-3">
                          <Link
                            href={`/candidates/${c.id}`}
                            className="block truncate text-sm font-medium text-slate-800 hover:text-brand-600"
                          >
                            {c.full_name}
                          </Link>
                          <div className="mt-0.5 truncate text-xs text-slate-500">{c.position ?? "Должность не указана"}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5">{SOURCE_LABELS[c.source]}</span>
                            <span>· {days} дн. на этапе</span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {c.responsible_user_id ? names.get(c.responsible_user_id) ?? "—" : "Без ответственного"}
                          </div>
                          {c.next_action_date ? (
                            <div className={`mt-1 text-[11px] ${overdue ? "font-medium text-rose-600" : "text-slate-400"}`}>
                              {overdue ? "⚠ " : "◷ "}
                              {formatDate(c.next_action_date)}
                            </div>
                          ) : (
                            <div className="mt-1 text-[11px] text-amber-600">⚠ нет следующего шага</div>
                          )}
                          {col.stage !== "hired" ? (
                            <div className="mt-2">
                              <StageSelect candidateId={c.id} current={c.stage as Stage} disabled={!editable} />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    {list.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-300">
                        Пусто
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
