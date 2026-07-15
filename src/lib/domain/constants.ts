import type { Enums } from "@/lib/types/database";

export const APP_TIMEZONE =
  process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Yerevan";

// ─── Sources ──────────────────────────────────────────────────────────────
export const SOURCE_LABELS: Record<Enums<"candidate_source">, string> = {
  application: "Заявка",
  target: "Таргет",
  recommendation: "Рекомендация",
  linkedin: "LinkedIn",
  telegram: "Telegram",
  job_platform: "Job platform",
  other: "Другое",
};

// ─── First-contact channels ─────────────────────────────────────────────────
export const CHANNEL_LABELS: Record<Enums<"contact_channel">, string> = {
  phone: "Телефон",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  email: "Email",
  other: "Другое",
};

// ─── Contact results ──────────────────────────────────────────────────────
export const CONTACT_RESULT_LABELS: Record<Enums<"contact_result">, string> = {
  contacted: "Связались",
  no_answer: "Не ответил",
  interested: "Заинтересован",
  not_interested: "Не заинтересован",
  follow_up: "Повторный контакт",
  moved_to_test: "Перешёл к тесту",
};

// ─── Interview format & status ──────────────────────────────────────────────
export const INTERVIEW_FORMAT_LABELS: Record<
  Enums<"interview_format">,
  string
> = {
  google_meet: "Google Meet",
  office: "Офис",
  phone: "Телефон",
  other: "Другое",
};

export const INTERVIEW_STATUS_LABELS: Record<
  Enums<"interview_status">,
  string
> = {
  scheduled: "Запланировано",
  completed: "Проведено",
  no_show: "Не пришёл",
  cancelled: "Отменено",
  rescheduled: "Перенесено",
};

// ─── Evaluation recommendation ──────────────────────────────────────────────
export const EVAL_RECOMMENDATION_LABELS: Record<
  Enums<"evaluation_recommendation">,
  string
> = {
  strong: "Сильный кандидат",
  proceed: "Можно продолжить",
  needs_check: "Нужна дополнительная проверка",
  reject: "Не подходит",
};

// ─── Offer ─────────────────────────────────────────────────────────────────
export const OFFER_STATUS_LABELS: Record<Enums<"offer_status">, string> = {
  not_prepared: "Не подготовлен",
  sent: "Отправлен",
  accepted: "Принят",
  declined: "Отклонён",
  withdrawn: "Отозван",
};

export const OFFER_DECISION_LABELS: Record<Enums<"offer_decision">, string> = {
  approved: "Одобрен",
  rejected: "Отклонён",
};

// ─── Probation ───────────────────────────────────────────────────────────────
export const PROBATION_STATUS_LABELS: Record<
  Enums<"probation_status">,
  string
> = {
  not_started: "Не начат",
  in_progress: "В процессе",
  passed: "Прошёл",
  failed: "Не прошёл",
  resigned: "Уволился",
  terminated: "Прекращён компанией",
};

// ─── Roles ─────────────────────────────────────────────────────────────────
export const ROLE_LABELS: Record<Enums<"hr_role">, string> = {
  admin: "Администратор",
  hr: "HR",
  manager: "Менеджмент",
};

// ─── Activity actions (audit / work-volume) ──────────────────────────────────
export const ACTIONS = {
  CANDIDATE_CREATED: "candidate.created",
  CANDIDATE_UPDATED: "candidate.updated",
  CANDIDATE_REJECTED: "candidate.rejected",
  STAGE_CHANGED: "stage.changed",
  CONTACT_RECORDED: "contact.recorded",
  TEST_SENT: "test.sent",
  TEST_RECORDED: "test.recorded",
  INTERVIEW_SCHEDULED: "interview.scheduled",
  INTERVIEW_RESCHEDULED: "interview.rescheduled",
  INTERVIEW_COMPLETED: "interview.completed",
  EVALUATION_CREATED: "evaluation.created",
  OFFER_RECORDED: "offer.recorded",
  DECISION_RECORDED: "decision.recorded",
  PROBATION_STARTED: "probation.started",
  PROBATION_COMPLETED: "probation.completed",
  NOTE_ADDED: "note.added",
  FILE_ADDED: "file.added",
} as const;

export type ActivityAction = (typeof ACTIONS)[keyof typeof ACTIONS];

export const ACTION_LABELS: Record<string, string> = {
  "candidate.created": "Кандидат создан",
  "candidate.updated": "Профиль обновлён",
  "candidate.rejected": "Кандидат отклонён",
  "stage.changed": "Смена этапа",
  "contact.recorded": "Контакт зафиксирован",
  "test.sent": "Тест отправлен",
  "test.recorded": "Результат теста внесён",
  "interview.scheduled": "Собеседование запланировано",
  "interview.rescheduled": "Собеседование перенесено",
  "interview.completed": "Собеседование проведено",
  "evaluation.created": "Оценка проведена",
  "offer.recorded": "Оффер внесён",
  "decision.recorded": "Финальное решение",
  "probation.started": "Испытательный срок начат",
  "probation.completed": "Испытательный срок завершён",
  "note.added": "Заметка добавлена",
  "file.added": "Файл добавлен",
};

export function labelForSelect<T extends string>(
  map: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}
