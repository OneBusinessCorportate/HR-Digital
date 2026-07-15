"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeStage } from "@/app/actions/candidates";
import { PIPELINE_STAGES, STAGE_SHORT_LABELS, type Stage } from "@/lib/domain/funnel";

/**
 * Reliable stage-change control (a select), used on the Kanban board. Preferred
 * over drag-and-drop for reliability; every change writes a history record.
 */
export function StageSelect({
  candidateId,
  current,
  disabled = false,
}: {
  candidateId: string;
  current: Stage;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (disabled) {
    return <span className="text-xs text-slate-400">{STAGE_SHORT_LABELS[current]}</span>;
  }

  return (
    <select
      aria-label="Изменить этап"
      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 disabled:opacity-50"
      value={current}
      disabled={pending}
      onChange={(e) => {
        const to = e.target.value as Stage;
        if (to === current) return;
        const fd = new FormData();
        fd.set("candidate_id", candidateId);
        fd.set("to_stage", to);
        startTransition(async () => {
          await changeStage({}, fd);
          router.refresh();
        });
      }}
    >
      {PIPELINE_STAGES.map((s) => (
        <option key={s} value={s}>
          → {STAGE_SHORT_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
