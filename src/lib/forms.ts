import type { DuplicateMatch } from "@/lib/domain/duplicates";

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  duplicates?: SerializableDuplicate[];
}

export interface SerializableDuplicate {
  id: string;
  full_name: string;
  stage: string;
  reasons: string[];
}

export const initialActionState: ActionState = {};

export function toSerializableDuplicates(matches: DuplicateMatch[]): SerializableDuplicate[] {
  return matches.map((m) => ({
    id: m.candidate.id,
    full_name: m.candidate.full_name,
    stage: m.candidate.stage,
    reasons: m.reasons,
  }));
}

export function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export function bool(formData: FormData, key: string): boolean | undefined {
  const v = formData.get(key);
  if (v == null) return undefined;
  return v === "on" || v === "true" || v === "1";
}
