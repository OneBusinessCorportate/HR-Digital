import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database";

export interface ActivityInput {
  candidate_id?: string | null;
  actor_id?: string | null;
  action: string;
  entity?: string;
  entity_id?: string | null;
  summary?: string;
  meta?: Json;
}

/**
 * Append an audit/timeline record. Best-effort: a logging failure must never
 * roll back the primary write, so errors are swallowed (and the trigger keeps
 * candidate.last_activity_at fresh).
 */
export async function logActivity(
  supabase: SupabaseClient<Database>,
  input: ActivityInput,
): Promise<void> {
  await supabase.from("activity_log").insert({
    candidate_id: input.candidate_id ?? null,
    actor_id: input.actor_id ?? null,
    action: input.action,
    entity: input.entity ?? null,
    entity_id: input.entity_id ?? null,
    summary: input.summary ?? null,
    meta: input.meta ?? {},
  });
}
