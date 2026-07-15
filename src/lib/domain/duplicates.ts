/**
 * Candidate duplicate detection. Normalization mirrors the DB trigger
 * (normalize_candidate) so client-side checks and stored values agree.
 *
 * Duplicate detection never silently blocks creation — it surfaces possible
 * matches so an authorized user can confirm whether this is a new application.
 */

export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length ? digits : null;
}

export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  const v = email.trim().toLowerCase();
  return v.length ? v : null;
}

export function normalizeTelegram(telegram?: string | null): string | null {
  if (!telegram) return null;
  const v = telegram.trim().toLowerCase().replace(/^@+/, "");
  return v.length ? v : null;
}

export function normalizeUrl(url?: string | null): string | null {
  if (!url) return null;
  const v = url.trim().toLowerCase().replace(/\/+$/, "");
  return v.length ? v : null;
}

export function normalizeName(name?: string | null): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export type DuplicateReason =
  | "phone"
  | "email"
  | "telegram"
  | "resume_url"
  | "name_recent";

export const DUPLICATE_REASON_LABELS: Record<DuplicateReason, string> = {
  phone: "Совпадает телефон",
  email: "Совпадает email",
  telegram: "Совпадает Telegram",
  resume_url: "Совпадает ссылка на резюме",
  name_recent: "Совпадает ФИО и недавняя заявка",
};

export interface DuplicateCandidateInput {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
  resume_url?: string | null;
  first_contact_date?: string | null;
}

export interface ExistingCandidate {
  id: string;
  full_name: string;
  phone_normalized: string | null;
  email_normalized: string | null;
  telegram_normalized: string | null;
  resume_url: string | null;
  first_contact_date: string | null;
  created_at: string;
  stage: string;
}

export interface DuplicateMatch {
  candidate: ExistingCandidate;
  reasons: DuplicateReason[];
}

/** Number of days within which a same-name application counts as a possible dup. */
export const NAME_RECENT_WINDOW_DAYS = 30;

function daysApart(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.abs(Math.round((da - db) / 86400000));
}

/**
 * Find possible duplicates among existing candidates. Strong signals (phone,
 * email, telegram, resume URL) always match; a name match only counts when the
 * application dates are within NAME_RECENT_WINDOW_DAYS.
 */
export function findDuplicates(
  input: DuplicateCandidateInput,
  existing: ExistingCandidate[],
  windowDays: number = NAME_RECENT_WINDOW_DAYS,
): DuplicateMatch[] {
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const telegram = normalizeTelegram(input.telegram);
  const resume = normalizeUrl(input.resume_url);
  const name = normalizeName(input.full_name);
  const refDate = input.first_contact_date ?? new Date().toISOString();

  const matches: DuplicateMatch[] = [];
  for (const c of existing) {
    const reasons: DuplicateReason[] = [];
    if (phone && c.phone_normalized && phone === c.phone_normalized)
      reasons.push("phone");
    if (email && c.email_normalized && email === c.email_normalized)
      reasons.push("email");
    if (telegram && c.telegram_normalized && telegram === c.telegram_normalized)
      reasons.push("telegram");
    if (resume && normalizeUrl(c.resume_url) === resume)
      reasons.push("resume_url");
    if (name && normalizeName(c.full_name) === name) {
      const gap = daysApart(refDate, c.first_contact_date ?? c.created_at);
      if (gap != null && gap <= windowDays) reasons.push("name_recent");
    }
    if (reasons.length) matches.push({ candidate: c, reasons });
  }

  // Strongest matches first.
  matches.sort((a, b) => b.reasons.length - a.reasons.length);
  return matches;
}
