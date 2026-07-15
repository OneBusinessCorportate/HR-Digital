import { ACTION_LABELS } from "@/lib/domain/constants";
import { formatDateTime } from "@/lib/domain/dates";
import type { Tables } from "@/lib/types/database";

const DOT_COLORS: Record<string, string> = {
  "candidate.created": "bg-brand-500",
  "candidate.rejected": "bg-rose-500",
  "stage.changed": "bg-indigo-500",
  "contact.recorded": "bg-sky-500",
  "test.sent": "bg-cyan-500",
  "test.recorded": "bg-cyan-600",
  "interview.scheduled": "bg-violet-500",
  "interview.rescheduled": "bg-violet-400",
  "interview.completed": "bg-violet-600",
  "evaluation.created": "bg-amber-500",
  "offer.recorded": "bg-teal-500",
  "decision.recorded": "bg-teal-600",
  "probation.started": "bg-brand-400",
  "probation.completed": "bg-brand-600",
  "note.added": "bg-slate-400",
};

export function Timeline({
  events,
  names,
}: {
  events: Tables<"activity_log">[];
  names: Map<string, string>;
}) {
  if (!events.length) {
    return <p className="text-sm text-slate-400">История пока пуста.</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span
            className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-2 ring-white ${
              DOT_COLORS[e.action] ?? "bg-slate-400"
            }`}
          />
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-slate-800">
                {ACTION_LABELS[e.action] ?? e.action}
              </span>
              <time className="text-xs text-slate-400">{formatDateTime(e.created_at)}</time>
            </div>
            {e.summary ? <p className="text-sm text-slate-600">{e.summary}</p> : null}
            {e.actor_id ? (
              <p className="text-xs text-slate-400">{names.get(e.actor_id) ?? "—"}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
