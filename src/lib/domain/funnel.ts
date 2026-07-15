import type { Enums } from "@/lib/types/database";

export type Stage = Enums<"recruitment_stage">;

/**
 * The approved recruitment funnel, in order. `hired` and `rejected` are terminal
 * outcomes. Stage identity is an enum — never arbitrary status text.
 */
export const STAGES: Stage[] = [
  "first_contact",
  "test",
  "screening",
  "interview",
  "experience_eval",
  "offer",
  "probation",
  "hired",
  "rejected",
];

/** Active pipeline stages shown as Kanban columns (excludes terminal outcomes). */
export const PIPELINE_STAGES: Stage[] = [
  "first_contact",
  "test",
  "screening",
  "interview",
  "experience_eval",
  "offer",
  "probation",
];

export const STAGE_LABELS: Record<Stage, string> = {
  first_contact: "Первый контакт / Заявка",
  test: "Тест",
  screening: "Отбор",
  interview: "Собеседование",
  experience_eval: "Оценка опыта",
  offer: "Оффер / Решение",
  probation: "Испытательный срок",
  hired: "Принят",
  rejected: "Отклонён",
};

/** Short labels for compact UI (Kanban columns, chips). */
export const STAGE_SHORT_LABELS: Record<Stage, string> = {
  first_contact: "Первый контакт",
  test: "Тест",
  screening: "Отбор",
  interview: "Собеседование",
  experience_eval: "Оценка опыта",
  offer: "Оффер",
  probation: "Исп. срок",
  hired: "Принят",
  rejected: "Отклонён",
};

/** Ordered position of a stage in the linear funnel (0-based). */
export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}

/** Progress order used to measure "furthest stage reached" (rejected excluded). */
const PROGRESS_ORDER: Stage[] = [
  "first_contact",
  "test",
  "screening",
  "interview",
  "experience_eval",
  "offer",
  "probation",
  "hired",
];

export function progressIndex(stage: Stage): number {
  const i = PROGRESS_ORDER.indexOf(stage);
  return i === -1 ? 0 : i;
}

export function isTerminal(stage: Stage): boolean {
  return stage === "hired" || stage === "rejected";
}

/** The next forward stage in the pipeline, or null if none. */
export function nextStage(stage: Stage): Stage | null {
  const idx = PIPELINE_STAGES.indexOf(stage);
  if (idx === -1 || idx === PIPELINE_STAGES.length - 1) {
    // From probation the natural next step is hired.
    if (stage === "probation") return "hired";
    return null;
  }
  return PIPELINE_STAGES[idx + 1];
}

/**
 * A stage change is always allowed for an authorized HR user (candidates can be
 * rejected from any stage, and manual overrides are permitted). This helper only
 * reports whether the move is a normal forward step, so the UI can flag manual
 * overrides for the history record.
 */
export function isForwardStep(from: Stage, to: Stage): boolean {
  if (to === "rejected") return false;
  return progressIndex(to) === progressIndex(from) + 1;
}

/** Tailwind color token per stage for consistent visuals. */
export const STAGE_COLORS: Record<Stage, string> = {
  first_contact: "bg-slate-100 text-slate-700 border-slate-200",
  test: "bg-sky-100 text-sky-700 border-sky-200",
  screening: "bg-indigo-100 text-indigo-700 border-indigo-200",
  interview: "bg-violet-100 text-violet-700 border-violet-200",
  experience_eval: "bg-amber-100 text-amber-700 border-amber-200",
  offer: "bg-teal-100 text-teal-700 border-teal-200",
  probation: "bg-brand-100 text-brand-700 border-brand-200",
  hired: "bg-brand-600 text-white border-brand-700",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
};
