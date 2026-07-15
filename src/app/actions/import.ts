"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEditor } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ACTIONS } from "@/lib/domain/constants";
import { buildImportPreview, type ImportPreview } from "@/lib/domain/import";
import type { ExistingCandidate } from "@/lib/domain/duplicates";

async function fetchExisting(): Promise<ExistingCandidate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidates")
    .select(
      "id, full_name, phone_normalized, email_normalized, telegram_normalized, resume_url, first_contact_date, created_at, stage",
    )
    .limit(5000);
  return (data ?? []) as ExistingCandidate[];
}

export async function previewImport(csvText: string): Promise<ImportPreview> {
  await requireEditor();
  const existing = await fetchExisting();
  return buildImportPreview(csvText, existing);
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  imported: number;
  skippedDuplicates: number;
  invalid: number;
}

export async function commitImport(csvText: string): Promise<ImportResult> {
  let profile;
  try {
    profile = await requireEditor();
  } catch (e) {
    return { ok: false, error: (e as Error).message, imported: 0, skippedDuplicates: 0, invalid: 0 };
  }

  const existing = await fetchExisting();
  const preview = buildImportPreview(csvText, existing);
  const supabase = await createClient();

  let imported = 0;
  for (const row of preview.rows) {
    if (!row.valid || row.isDuplicate || !row.data) continue;
    const d = row.data;
    const { data: candidate, error } = await supabase
      .from("candidates")
      .insert({
        full_name: d.full_name,
        phone: d.phone,
        email: d.email,
        telegram: d.telegram,
        position: d.position,
        source: d.source,
        stage: d.stage,
        first_contact_comment: d.notes,
        responsible_user_id: profile.id,
        created_by: profile.id,
      })
      .select("id")
      .single();
    if (error || !candidate) continue;

    await supabase.from("candidate_stage_history").insert({
      candidate_id: candidate.id,
      from_stage: null,
      to_stage: d.stage,
      note: `Импорт из таблицы (строка ${d.source_row})`,
      changed_by: profile.id,
    });
    await logActivity(supabase, {
      candidate_id: candidate.id,
      actor_id: profile.id,
      action: ACTIONS.CANDIDATE_CREATED,
      entity: "candidates",
      entity_id: candidate.id,
      summary: `Импортирован из таблицы: ${d.full_name}`,
      meta: { imported: true, source_row: d.source_row },
    });
    imported++;
  }

  revalidatePath("/candidates");
  revalidatePath("/dashboard");
  revalidatePath("/funnel");

  return {
    ok: true,
    imported,
    skippedDuplicates: preview.duplicateCount,
    invalid: preview.invalidCount,
  };
}
