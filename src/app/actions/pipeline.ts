"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEditor } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getSettings } from "@/lib/settings";
import { ACTIONS } from "@/lib/domain/constants";
import { evaluateTest, suggestStageAfterTest, resolveManualPass } from "@/lib/domain/threshold";
import { yerevanInstant } from "@/lib/domain/dates";
import {
  contactSchema,
  testSchema,
  interviewScheduleSchema,
  interviewRescheduleSchema,
  interviewCompleteSchema,
  evaluationSchema,
  validateEvaluationScores,
  offerSchema,
  probationStartSchema,
  probationCompleteSchema,
  firstError,
} from "@/lib/domain/validation";
import { type ActionState } from "@/lib/forms";

function fail(e: unknown): ActionState {
  return { ok: false, error: e instanceof Error ? e.message : String(e) };
}

// ─── First contact ────────────────────────────────────────────────────────────
export async function recordContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return fail(e);
  }
  const parsed = contactSchema.safeParse({
    candidate_id: formData.get("candidate_id"),
    contact_at: formData.get("contact_at"),
    channel: formData.get("channel"),
    result: formData.get("result"),
    note: formData.get("note"),
    next_action: formData.get("next_action"),
    next_action_date: formData.get("next_action_date"),
    replied: formData.get("replied") === "on",
    agreed_to_continue: formData.get("agreed_to_continue") === "on",
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const contactAtIso = v.contact_at.includes("T")
    ? new Date(v.contact_at).toISOString()
    : new Date(`${v.contact_at}:00`).toISOString();

  const { error } = await supabase.from("candidate_contacts").insert({
    candidate_id: v.candidate_id,
    contact_at: contactAtIso,
    channel: v.channel,
    result: v.result ?? null,
    note: v.note ?? null,
    next_action: v.next_action ?? null,
    next_action_date: v.next_action_date ?? null,
    replied: v.replied ?? null,
    agreed_to_continue: v.agreed_to_continue ?? null,
    created_by: profile.id,
  });
  if (error) return { ok: false, error: error.message };

  // Keep the candidate's denormalized next action in sync for overdue tracking.
  if (v.next_action || v.next_action_date) {
    await supabase
      .from("candidates")
      .update({ next_action: v.next_action ?? null, next_action_date: v.next_action_date ?? null })
      .eq("id", v.candidate_id);
  }

  await logActivity(supabase, {
    candidate_id: v.candidate_id,
    actor_id: profile.id,
    action: ACTIONS.CONTACT_RECORDED,
    entity: "candidate_contacts",
    summary: `Контакт (${v.channel})${v.result ? `, результат: ${v.result}` : ""}`,
    meta: { result: v.result ?? null, channel: v.channel },
  });

  revalidatePath(`/candidates/${v.candidate_id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Контакт зафиксирован" };
}

// ─── Test ───────────────────────────────────────────────────────────────────
export async function recordTest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return fail(e);
  }
  const parsed = testSchema.safeParse({
    candidate_id: formData.get("candidate_id"),
    test_link: formData.get("test_link"),
    sent_date: formData.get("sent_date"),
    completed_date: formData.get("completed_date"),
    score: formData.get("score"),
    max_score: formData.get("max_score"),
    manual_passed: formData.get("manual_passed") ?? "auto",
    comment: formData.get("comment"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;

  const settings = await getSettings();
  const auto = evaluateTest({ score: v.score, maxScore: v.max_score }, settings.testPassThreshold);
  const { passed, isOverride } = resolveManualPass(auto.passed, v.manual_passed);

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("candidate_tests")
    .insert({
      candidate_id: v.candidate_id,
      test_link: v.test_link ?? null,
      sent_date: v.sent_date ?? null,
      completed_date: v.completed_date ?? null,
      score: v.score ?? null,
      max_score: v.max_score ?? null,
      score_percent: auto.percent,
      passed,
      threshold_used: settings.testPassThreshold,
      is_manual_override: isOverride,
      comment: v.comment ?? null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Log "sent" and/or "recorded" as recorded work.
  if (v.sent_date) {
    await logActivity(supabase, {
      candidate_id: v.candidate_id,
      actor_id: profile.id,
      action: ACTIONS.TEST_SENT,
      entity: "candidate_tests",
      entity_id: row?.id,
      summary: "Тест отправлен",
    });
  }
  if (v.score != null) {
    await logActivity(supabase, {
      candidate_id: v.candidate_id,
      actor_id: profile.id,
      action: ACTIONS.TEST_RECORDED,
      entity: "candidate_tests",
      entity_id: row?.id,
      summary: `Результат теста: ${auto.percent ?? "?"}% — ${passed ? "пройден" : "не пройден"}${
        isOverride ? " (ручное решение)" : ""
      }`,
      meta: { percent: auto.percent, passed, manual_override: isOverride, threshold: settings.testPassThreshold },
    });
  }

  revalidatePath(`/candidates/${v.candidate_id}`);
  revalidatePath("/dashboard");
  const suggestion = suggestStageAfterTest(passed);
  return {
    ok: true,
    message:
      v.score != null
        ? `Результат сохранён (${auto.percent ?? "?"}%). Рекомендуемый этап: ${
            suggestion === "screening" ? "Отбор" : suggestion === "rejected" ? "Отклонён" : "—"
          }.`
        : "Тест сохранён",
  };
}

// ─── Interview scheduling ─────────────────────────────────────────────────────
export async function scheduleInterview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return fail(e);
  }
  const parsed = interviewScheduleSchema.safeParse({
    candidate_id: formData.get("candidate_id"),
    date: formData.get("date"),
    time: formData.get("time"),
    duration_minutes: formData.get("duration_minutes") ?? 45,
    format: formData.get("format"),
    meet_link: formData.get("meet_link"),
    interviewers: formData.get("interviewers"),
    notes_before: formData.get("notes_before"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("interviews")
    .insert({
      candidate_id: v.candidate_id,
      scheduled_start: yerevanInstant(v.date, v.time),
      duration_minutes: v.duration_minutes,
      timezone: "Asia/Yerevan",
      format: v.format,
      meet_link: v.meet_link ?? null,
      notes_before: v.notes_before ?? null,
      status: "scheduled",
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? "Не удалось создать" };

  if (v.interviewers) {
    const names = v.interviewers
      .split(/[,\n;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length) {
      await supabase
        .from("interview_participants")
        .insert(names.map((name) => ({ interview_id: row.id, name })));
    }
  }

  await logActivity(supabase, {
    candidate_id: v.candidate_id,
    actor_id: profile.id,
    action: ACTIONS.INTERVIEW_SCHEDULED,
    entity: "interviews",
    entity_id: row.id,
    summary: `Собеседование запланировано на ${v.date} ${v.time}`,
    meta: { format: v.format },
  });

  revalidatePath(`/candidates/${v.candidate_id}`);
  revalidatePath("/interviews");
  revalidatePath("/dashboard");
  return { ok: true, message: "Собеседование запланировано" };
}

export async function rescheduleInterview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return fail(e);
  }
  const parsed = interviewRescheduleSchema.safeParse({
    interview_id: formData.get("interview_id"),
    date: formData.get("date"),
    time: formData.get("time"),
    duration_minutes: formData.get("duration_minutes") ?? 45,
    notes_before: formData.get("notes_before"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: iv } = await supabase
    .from("interviews")
    .select("candidate_id, scheduled_start")
    .eq("id", v.interview_id)
    .single();
  if (!iv) return { ok: false, error: "Собеседование не найдено" };

  const { error } = await supabase
    .from("interviews")
    .update({
      scheduled_start: yerevanInstant(v.date, v.time),
      duration_minutes: v.duration_minutes,
      notes_before: v.notes_before ?? null,
      status: "scheduled",
      reminder_sent: false,
    })
    .eq("id", v.interview_id);
  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    candidate_id: iv.candidate_id,
    actor_id: profile.id,
    action: ACTIONS.INTERVIEW_RESCHEDULED,
    entity: "interviews",
    entity_id: v.interview_id,
    summary: `Собеседование перенесено на ${v.date} ${v.time}`,
  });

  revalidatePath(`/candidates/${iv.candidate_id}`);
  revalidatePath("/interviews");
  return { ok: true, message: "Собеседование перенесено" };
}

export async function completeInterview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return fail(e);
  }
  const parsed = interviewCompleteSchema.safeParse({
    interview_id: formData.get("interview_id"),
    status: formData.get("status"),
    actual_start: formData.get("actual_start"),
    recording_url: formData.get("recording_url"),
    transcript_url: formData.get("transcript_url"),
    transcript_text: formData.get("transcript_text"),
    summary: formData.get("summary"),
    strengths: formData.get("strengths"),
    concerns: formData.get("concerns"),
    expected_salary: formData.get("expected_salary"),
    availability: formData.get("availability"),
    language_level: formData.get("language_level"),
    recommendation: formData.get("recommendation"),
    notes_after: formData.get("notes_after"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: iv } = await supabase
    .from("interviews")
    .select("candidate_id")
    .eq("id", v.interview_id)
    .single();
  if (!iv) return { ok: false, error: "Собеседование не найдено" };

  const { error } = await supabase
    .from("interviews")
    .update({
      status: v.status,
      actual_start: v.actual_start ? new Date(v.actual_start).toISOString() : null,
      recording_url: v.recording_url ?? null,
      transcript_url: v.transcript_url ?? null,
      transcript_text: v.transcript_text ?? null,
      summary: v.summary ?? null,
      strengths: v.strengths ?? null,
      concerns: v.concerns ?? null,
      expected_salary: v.expected_salary ?? null,
      availability: v.availability ?? null,
      language_level: v.language_level ?? null,
      recommendation: v.recommendation ?? null,
      notes_after: v.notes_after ?? null,
    })
    .eq("id", v.interview_id);
  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    candidate_id: iv.candidate_id,
    actor_id: profile.id,
    action: ACTIONS.INTERVIEW_COMPLETED,
    entity: "interviews",
    entity_id: v.interview_id,
    summary: `Собеседование: ${v.status}`,
    meta: { status: v.status },
  });

  revalidatePath(`/candidates/${iv.candidate_id}`);
  revalidatePath("/interviews");
  revalidatePath("/dashboard");
  return { ok: true, message: "Результат собеседования сохранён" };
}

// ─── Evaluation ───────────────────────────────────────────────────────────────
export async function createEvaluation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return fail(e);
  }
  const parsed = evaluationSchema.safeParse({
    candidate_id: formData.get("candidate_id"),
    interview_id: formData.get("interview_id"),
    scale_max: formData.get("scale_max") ?? 5,
    professional_score: formData.get("professional_score"),
    communication_score: formData.get("communication_score"),
    motivation_score: formData.get("motivation_score"),
    skills_score: formData.get("skills_score"),
    culture_fit_score: formData.get("culture_fit_score"),
    overall_score: formData.get("overall_score"),
    recommendation: formData.get("recommendation"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;
  const scoreError = validateEvaluationScores(v);
  if (scoreError) return { ok: false, error: scoreError };

  const supabase = await createClient();
  const { error } = await supabase.from("candidate_evaluations").insert({
    candidate_id: v.candidate_id,
    interview_id: v.interview_id ?? null,
    scale_max: v.scale_max,
    professional_score: v.professional_score,
    communication_score: v.communication_score,
    motivation_score: v.motivation_score,
    skills_score: v.skills_score,
    culture_fit_score: v.culture_fit_score,
    overall_score: v.overall_score,
    recommendation: v.recommendation,
    comment: v.comment ?? null,
    evaluated_by: profile.id,
  });
  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    candidate_id: v.candidate_id,
    actor_id: profile.id,
    action: ACTIONS.EVALUATION_CREATED,
    entity: "candidate_evaluations",
    summary: `Оценка: ${v.overall_score}/${v.scale_max}, ${v.recommendation}`,
    meta: { overall: v.overall_score, scale: v.scale_max, recommendation: v.recommendation },
  });

  revalidatePath(`/candidates/${v.candidate_id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Оценка сохранена" };
}

// ─── Offer / decision ─────────────────────────────────────────────────────────
export async function saveOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return fail(e);
  }
  const parsed = offerSchema.safeParse({
    candidate_id: formData.get("candidate_id"),
    decision_date: formData.get("decision_date"),
    decision: formData.get("decision"),
    position: formData.get("position"),
    salary: formData.get("salary"),
    expected_start_date: formData.get("expected_start_date"),
    status: formData.get("status"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("offers")
    .insert({
      candidate_id: v.candidate_id,
      decision_date: v.decision_date ?? null,
      decision: v.decision ?? null,
      decision_by: v.decision ? profile.id : null,
      position: v.position ?? null,
      salary: v.salary ?? null,
      expected_start_date: v.expected_start_date ?? null,
      status: v.status,
      comment: v.comment ?? null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    candidate_id: v.candidate_id,
    actor_id: profile.id,
    action: v.decision ? ACTIONS.DECISION_RECORDED : ACTIONS.OFFER_RECORDED,
    entity: "offers",
    entity_id: row?.id,
    summary: v.decision
      ? `Финальное решение: ${v.decision === "approved" ? "одобрен" : "отклонён"}`
      : `Оффер: ${v.status}`,
    meta: { status: v.status, decision: v.decision ?? null },
  });
  // Offers always represent recorded offer work too.
  if (v.decision) {
    await logActivity(supabase, {
      candidate_id: v.candidate_id,
      actor_id: profile.id,
      action: ACTIONS.OFFER_RECORDED,
      entity: "offers",
      entity_id: row?.id,
      summary: `Оффер: ${v.status}`,
      meta: { status: v.status },
    });
  }

  revalidatePath(`/candidates/${v.candidate_id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Оффер сохранён" };
}

// ─── Probation ────────────────────────────────────────────────────────────────
export async function startProbation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return fail(e);
  }
  const parsed = probationStartSchema.safeParse({
    candidate_id: formData.get("candidate_id"),
    start_date: formData.get("start_date"),
    planned_end_date: formData.get("planned_end_date"),
    manager_id: formData.get("manager_id"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("probation_periods")
    .insert({
      candidate_id: v.candidate_id,
      start_date: v.start_date,
      planned_end_date: v.planned_end_date ?? null,
      manager_id: v.manager_id ?? null,
      status: "in_progress",
      comment: v.comment ?? null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Advance the candidate to the probation stage (with history).
  const { data: current } = await supabase
    .from("candidates")
    .select("stage")
    .eq("id", v.candidate_id)
    .single();
  if (current && current.stage !== "probation") {
    await supabase.from("candidates").update({ stage: "probation" }).eq("id", v.candidate_id);
    await supabase.from("candidate_stage_history").insert({
      candidate_id: v.candidate_id,
      from_stage: current.stage,
      to_stage: "probation",
      note: "Начало испытательного срока",
      changed_by: profile.id,
    });
  }

  await logActivity(supabase, {
    candidate_id: v.candidate_id,
    actor_id: profile.id,
    action: ACTIONS.PROBATION_STARTED,
    entity: "probation_periods",
    entity_id: row?.id,
    summary: `Испытательный срок начат (${v.start_date})`,
  });

  revalidatePath(`/candidates/${v.candidate_id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Испытательный срок начат" };
}

export async function completeProbation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return fail(e);
  }
  const parsed = probationCompleteSchema.safeParse({
    probation_id: formData.get("probation_id"),
    status: formData.get("status"),
    actual_end_date: formData.get("actual_end_date"),
    first_month_retained: formData.get("first_month_retained") === "on",
    final_decision: formData.get("final_decision"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: pp } = await supabase
    .from("probation_periods")
    .select("candidate_id")
    .eq("id", v.probation_id)
    .single();
  if (!pp) return { ok: false, error: "Испытательный срок не найден" };

  const { error } = await supabase
    .from("probation_periods")
    .update({
      status: v.status,
      actual_end_date: v.actual_end_date ?? null,
      first_month_retained: v.first_month_retained ?? null,
      final_decision: v.final_decision ?? null,
      comment: v.comment ?? null,
    })
    .eq("id", v.probation_id);
  if (error) return { ok: false, error: error.message };

  // A successful probation moves the candidate to hired.
  if (v.status === "passed") {
    const { data: current } = await supabase
      .from("candidates")
      .select("stage")
      .eq("id", pp.candidate_id)
      .single();
    if (current && current.stage !== "hired") {
      await supabase.from("candidates").update({ stage: "hired" }).eq("id", pp.candidate_id);
      await supabase.from("candidate_stage_history").insert({
        candidate_id: pp.candidate_id,
        from_stage: current.stage,
        to_stage: "hired",
        note: "Испытательный срок пройден",
        changed_by: profile.id,
      });
    }
  }

  await logActivity(supabase, {
    candidate_id: pp.candidate_id,
    actor_id: profile.id,
    action: ACTIONS.PROBATION_COMPLETED,
    entity: "probation_periods",
    entity_id: v.probation_id,
    summary: `Испытательный срок завершён: ${v.status}`,
    meta: { status: v.status, retained: v.first_month_retained ?? null },
  });

  revalidatePath(`/candidates/${pp.candidate_id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Испытательный срок обновлён" };
}
