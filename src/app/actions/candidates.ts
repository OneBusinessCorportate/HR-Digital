"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireEditor } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ACTIONS } from "@/lib/domain/constants";
import { STAGE_LABELS } from "@/lib/domain/funnel";
import {
  candidateSchema,
  rejectionSchema,
  stageChangeSchema,
  noteSchema,
  firstError,
} from "@/lib/domain/validation";
import {
  findDuplicates,
  type ExistingCandidate,
} from "@/lib/domain/duplicates";
import {
  type ActionState,
  toSerializableDuplicates,
  str,
} from "@/lib/forms";

async function fetchExistingForDuplicates(): Promise<ExistingCandidate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidates")
    .select(
      "id, full_name, phone_normalized, email_normalized, telegram_normalized, resume_url, first_contact_date, created_at, stage",
    )
    .order("created_at", { ascending: false })
    .limit(2000);
  return (data ?? []) as ExistingCandidate[];
}

export async function checkDuplicatesAction(input: {
  full_name?: string;
  phone?: string;
  email?: string;
  telegram?: string;
  resume_url?: string;
  first_contact_date?: string;
}): Promise<ActionState> {
  await requireEditor();
  const existing = await fetchExistingForDuplicates();
  const matches = findDuplicates(input, existing);
  return { duplicates: toSerializableDuplicates(matches) };
}

export async function createCandidate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const parsed = candidateSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    telegram: formData.get("telegram"),
    position: formData.get("position"),
    source: formData.get("source") ?? "application",
    resume_url: formData.get("resume_url"),
    first_contact_date: formData.get("first_contact_date"),
    first_contact_comment: formData.get("first_contact_comment"),
    responsible_user_id: formData.get("responsible_user_id"),
    stage: formData.get("stage") ?? "first_contact",
    next_action: formData.get("next_action"),
    next_action_date: formData.get("next_action_date"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const input = parsed.data;

  const confirmed = str(formData, "confirm_duplicate") === "true";
  if (!confirmed) {
    const existing = await fetchExistingForDuplicates();
    const matches = findDuplicates(input, existing);
    if (matches.length) {
      return {
        ok: false,
        duplicates: toSerializableDuplicates(matches),
        error: "Найдены возможные дубликаты. Подтвердите создание нового кандидата.",
      };
    }
  }

  const supabase = await createClient();
  const { data: candidate, error } = await supabase
    .from("candidates")
    .insert({
      full_name: input.full_name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      telegram: input.telegram ?? null,
      position: input.position ?? null,
      source: input.source,
      resume_url: input.resume_url ?? null,
      first_contact_date: input.first_contact_date ?? null,
      first_contact_comment: input.first_contact_comment ?? null,
      responsible_user_id: input.responsible_user_id ?? profile.id,
      stage: input.stage,
      next_action: input.next_action ?? null,
      next_action_date: input.next_action_date ?? null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !candidate) {
    return { ok: false, error: error?.message ?? "Не удалось создать кандидата" };
  }

  await supabase.from("candidate_stage_history").insert({
    candidate_id: candidate.id,
    from_stage: null,
    to_stage: input.stage,
    note: "Кандидат создан",
    changed_by: profile.id,
  });

  await logActivity(supabase, {
    candidate_id: candidate.id,
    actor_id: profile.id,
    action: ACTIONS.CANDIDATE_CREATED,
    entity: "candidates",
    entity_id: candidate.id,
    summary: `Создан кандидат: ${input.full_name}`,
  });

  revalidatePath("/candidates");
  revalidatePath("/funnel");
  revalidatePath("/dashboard");
  redirect(`/candidates/${candidate.id}`);
}

export async function updateCandidate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const id = str(formData, "candidate_id");
  if (!id) return { ok: false, error: "Не указан кандидат" };

  const parsed = candidateSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    telegram: formData.get("telegram"),
    position: formData.get("position"),
    source: formData.get("source") ?? "application",
    resume_url: formData.get("resume_url"),
    first_contact_date: formData.get("first_contact_date"),
    first_contact_comment: formData.get("first_contact_comment"),
    responsible_user_id: formData.get("responsible_user_id"),
    stage: formData.get("stage") ?? "first_contact",
    next_action: formData.get("next_action"),
    next_action_date: formData.get("next_action_date"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("candidates")
    .update({
      full_name: input.full_name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      telegram: input.telegram ?? null,
      position: input.position ?? null,
      source: input.source,
      resume_url: input.resume_url ?? null,
      first_contact_date: input.first_contact_date ?? null,
      first_contact_comment: input.first_contact_comment ?? null,
      responsible_user_id: input.responsible_user_id ?? null,
      next_action: input.next_action ?? null,
      next_action_date: input.next_action_date ?? null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    candidate_id: id,
    actor_id: profile.id,
    action: ACTIONS.CANDIDATE_UPDATED,
    entity: "candidates",
    entity_id: id,
    summary: "Профиль кандидата обновлён",
  });

  revalidatePath(`/candidates/${id}`);
  return { ok: true, message: "Изменения сохранены" };
}

export async function changeStage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const parsed = stageChangeSchema.safeParse({
    candidate_id: formData.get("candidate_id"),
    to_stage: formData.get("to_stage"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { candidate_id, to_stage, note } = parsed.data;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("candidates")
    .select("stage")
    .eq("id", candidate_id)
    .single();
  if (!current) return { ok: false, error: "Кандидат не найден" };
  if (current.stage === to_stage) return { ok: true, message: "Этап не изменился" };
  if (to_stage === "rejected") {
    return { ok: false, error: "Отклонение выполняется через отдельную форму с указанием причины." };
  }

  const { error } = await supabase
    .from("candidates")
    .update({ stage: to_stage })
    .eq("id", candidate_id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("candidate_stage_history").insert({
    candidate_id,
    from_stage: current.stage,
    to_stage,
    note: note ?? null,
    is_manual_override: true,
    changed_by: profile.id,
  });

  await logActivity(supabase, {
    candidate_id,
    actor_id: profile.id,
    action: ACTIONS.STAGE_CHANGED,
    entity: "candidates",
    entity_id: candidate_id,
    summary: `Этап: ${STAGE_LABELS[current.stage]} → ${STAGE_LABELS[to_stage]}`,
    meta: { from: current.stage, to: to_stage },
  });

  revalidatePath(`/candidates/${candidate_id}`);
  revalidatePath("/funnel");
  revalidatePath("/dashboard");
  return { ok: true, message: "Этап обновлён" };
}

export async function rejectCandidate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const parsed = rejectionSchema.safeParse({
    candidate_id: formData.get("candidate_id"),
    rejection_stage: formData.get("rejection_stage"),
    rejection_reason: formData.get("rejection_reason"),
    rejection_date: formData.get("rejection_date"),
    rejection_comment: formData.get("rejection_comment"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("candidates")
    .select("stage")
    .eq("id", v.candidate_id)
    .single();
  if (!current) return { ok: false, error: "Кандидат не найден" };

  const { error } = await supabase
    .from("candidates")
    .update({
      stage: "rejected",
      rejection_stage: v.rejection_stage,
      rejection_reason: v.rejection_reason,
      rejection_date: v.rejection_date,
      rejection_comment: v.rejection_comment ?? null,
    })
    .eq("id", v.candidate_id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("candidate_stage_history").insert({
    candidate_id: v.candidate_id,
    from_stage: current.stage,
    to_stage: "rejected",
    note: v.rejection_reason,
    changed_by: profile.id,
  });

  await logActivity(supabase, {
    candidate_id: v.candidate_id,
    actor_id: profile.id,
    action: ACTIONS.CANDIDATE_REJECTED,
    entity: "candidates",
    entity_id: v.candidate_id,
    summary: `Отклонён на этапе «${STAGE_LABELS[v.rejection_stage]}»: ${v.rejection_reason}`,
    meta: { stage: v.rejection_stage, reason: v.rejection_reason },
  });

  revalidatePath(`/candidates/${v.candidate_id}`);
  revalidatePath("/funnel");
  revalidatePath("/dashboard");
  return { ok: true, message: "Кандидат отклонён" };
}

export async function addNote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const parsed = noteSchema.safeParse({
    candidate_id: formData.get("candidate_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("candidate_notes").insert({
    candidate_id: parsed.data.candidate_id,
    body: parsed.data.body,
    created_by: profile.id,
  });
  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    candidate_id: parsed.data.candidate_id,
    actor_id: profile.id,
    action: ACTIONS.NOTE_ADDED,
    entity: "candidate_notes",
    summary: "Добавлена заметка",
  });

  revalidatePath(`/candidates/${parsed.data.candidate_id}`);
  return { ok: true, message: "Заметка добавлена" };
}
