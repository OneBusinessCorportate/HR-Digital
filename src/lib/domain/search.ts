import { normalizePhone, normalizeEmail } from "./duplicates";

export interface CandidateFilterFields {
  full_name: string;
  position: string | null;
  email_normalized: string | null;
  phone_normalized: string | null;
  stage: string;
  source: string;
  responsible_user_id: string | null;
}

export interface CandidateFilters {
  q?: string;
  stage?: string;
  source?: string;
  responsible?: string;
  outcome?: string; // open | hired | rejected
}

/**
 * Pure candidate list filter used by the candidates page (and tested directly).
 * Search matches name, position, normalized email and normalized phone.
 */
export function filterCandidates<T extends CandidateFilterFields>(
  list: T[],
  f: CandidateFilters,
): T[] {
  let out = list;
  const q = (f.q ?? "").trim().toLowerCase();
  if (q) {
    const qPhone = normalizePhone(q);
    const qEmail = normalizeEmail(q);
    out = out.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.position ?? "").toLowerCase().includes(q) ||
        (!!qEmail && !!c.email_normalized && c.email_normalized.includes(qEmail)) ||
        (!!qPhone && !!c.phone_normalized && c.phone_normalized.includes(qPhone)),
    );
  }
  if (f.stage) out = out.filter((c) => c.stage === f.stage);
  if (f.source) out = out.filter((c) => c.source === f.source);
  if (f.responsible) out = out.filter((c) => c.responsible_user_id === f.responsible);
  if (f.outcome === "hired") out = out.filter((c) => c.stage === "hired");
  else if (f.outcome === "rejected") out = out.filter((c) => c.stage === "rejected");
  else if (f.outcome === "open") out = out.filter((c) => c.stage !== "hired" && c.stage !== "rejected");
  return out;
}
