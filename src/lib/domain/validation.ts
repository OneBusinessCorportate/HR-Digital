import { z } from "zod";

// Reusable primitives
const optionalString = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .url("Некорректная ссылка")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalEmail = z
  .string()
  .trim()
  .max(320)
  .email("Некорректный email")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Некорректная дата")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const sourceEnum = z.enum([
  "application",
  "target",
  "recommendation",
  "linkedin",
  "telegram",
  "job_platform",
  "other",
]);

export const stageEnum = z.enum([
  "first_contact",
  "test",
  "screening",
  "interview",
  "experience_eval",
  "offer",
  "probation",
  "hired",
  "rejected",
]);

export const candidateSchema = z.object({
  full_name: z.string().trim().min(2, "Укажите ФИО").max(200),
  phone: optionalString,
  email: optionalEmail,
  telegram: optionalString,
  position: optionalString,
  source: sourceEnum,
  resume_url: optionalUrl,
  first_contact_date: optionalDate,
  first_contact_comment: optionalString,
  responsible_user_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  stage: stageEnum.default("first_contact"),
  next_action: optionalString,
  next_action_date: optionalDate,
});

export type CandidateInput = z.infer<typeof candidateSchema>;

export const contactSchema = z.object({
  candidate_id: z.string().uuid(),
  contact_at: z.string().min(1),
  channel: z.enum(["phone", "telegram", "whatsapp", "email", "other"]),
  result: z
    .enum(["contacted", "no_answer", "interested", "not_interested", "follow_up", "moved_to_test"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  note: optionalString,
  next_action: optionalString,
  next_action_date: optionalDate,
  replied: z.boolean().optional(),
  agreed_to_continue: z.boolean().optional(),
});

export const testSchema = z
  .object({
    candidate_id: z.string().uuid(),
    test_link: optionalUrl,
    sent_date: optionalDate,
    completed_date: optionalDate,
    score: z.coerce.number().min(0).optional().or(z.nan().transform(() => undefined)),
    max_score: z.coerce.number().positive().optional().or(z.nan().transform(() => undefined)),
    manual_passed: z.enum(["auto", "pass", "fail"]).default("auto"),
    comment: optionalString,
  })
  .refine((v) => v.score === undefined || v.max_score === undefined || v.score <= v.max_score, {
    message: "Балл не может превышать максимум",
    path: ["score"],
  });

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const interviewScheduleSchema = z.object({
  candidate_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату"),
  time: z.string().regex(TIME_RE, "Укажите время"),
  duration_minutes: z.coerce.number().int().positive().max(600).default(45),
  format: z.enum(["google_meet", "office", "phone", "other"]),
  meet_link: optionalUrl,
  interviewers: optionalString,
  notes_before: optionalString,
});

export const interviewRescheduleSchema = z.object({
  interview_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(TIME_RE),
  duration_minutes: z.coerce.number().int().positive().max(600).default(45),
  notes_before: optionalString,
});

export const interviewCompleteSchema = z.object({
  interview_id: z.string().uuid(),
  status: z.enum(["completed", "no_show", "cancelled", "rescheduled"]),
  actual_start: optionalString,
  recording_url: optionalUrl,
  transcript_url: optionalUrl,
  transcript_text: optionalString,
  summary: optionalString,
  strengths: optionalString,
  concerns: optionalString,
  expected_salary: optionalString,
  availability: optionalString,
  language_level: optionalString,
  recommendation: optionalString,
  notes_after: optionalString,
});

export const evaluationSchema = z.object({
  candidate_id: z.string().uuid(),
  interview_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  scale_max: z.coerce.number().int().min(2).max(100).default(5),
  professional_score: z.coerce.number(),
  communication_score: z.coerce.number(),
  motivation_score: z.coerce.number(),
  skills_score: z.coerce.number(),
  culture_fit_score: z.coerce.number(),
  overall_score: z.coerce.number(),
  recommendation: z.enum(["strong", "proceed", "needs_check", "reject"]),
  comment: optionalString,
});

export function validateEvaluationScores(v: z.infer<typeof evaluationSchema>): string | null {
  const fields = [
    v.professional_score,
    v.communication_score,
    v.motivation_score,
    v.skills_score,
    v.culture_fit_score,
    v.overall_score,
  ];
  for (const f of fields) {
    if (f < 1 || f > v.scale_max) {
      return `Оценки должны быть в диапазоне 1–${v.scale_max}`;
    }
  }
  return null;
}

export const offerSchema = z.object({
  candidate_id: z.string().uuid(),
  decision_date: optionalDate,
  decision: z.enum(["approved", "rejected"]).optional().or(z.literal("").transform(() => undefined)),
  position: optionalString,
  salary: optionalString,
  expected_start_date: optionalDate,
  status: z.enum(["not_prepared", "sent", "accepted", "declined", "withdrawn"]),
  comment: optionalString,
});

export const probationStartSchema = z.object({
  candidate_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату начала"),
  planned_end_date: optionalDate,
  manager_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  comment: optionalString,
});

export const probationCompleteSchema = z.object({
  probation_id: z.string().uuid(),
  status: z.enum(["passed", "failed", "resigned", "terminated"]),
  actual_end_date: optionalDate,
  first_month_retained: z.boolean().optional(),
  final_decision: optionalString,
  comment: optionalString,
});

export const rejectionSchema = z.object({
  candidate_id: z.string().uuid(),
  rejection_stage: stageEnum,
  rejection_reason: z.string().trim().min(2, "Укажите причину").max(500),
  rejection_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату"),
  rejection_comment: optionalString,
});

export const stageChangeSchema = z.object({
  candidate_id: z.string().uuid(),
  to_stage: stageEnum,
  note: optionalString,
});

export const noteSchema = z.object({
  candidate_id: z.string().uuid(),
  body: z.string().trim().min(1, "Пустая заметка").max(4000),
});

// Spreadsheet import row (loose — validated then normalized).
export const importRowSchema = z.object({
  full_name: z.string().trim().min(2),
  phone: optionalString,
  email: optionalEmail,
  telegram: optionalString,
  position: optionalString,
  source: z.string().trim().optional(),
  stage: z.string().trim().optional(),
  test_score: optionalString,
  interview_date: optionalString,
  notes: optionalString,
  outcome: optionalString,
  probation_result: optionalString,
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Ошибка валидации";
}
