import { importRowSchema } from "./validation";
import {
  findDuplicates,
  type ExistingCandidate,
} from "./duplicates";
import type { Enums } from "@/lib/types/database";

/**
 * Spreadsheet import parsing/validation. Pure and side-effect free so it can be
 * unit tested and reused by the server action. Import is preview-first: rows are
 * parsed, validated and duplicate-checked before anything is written.
 */

export interface ParsedRow {
  rowNumber: number; // 1-based, referencing the original spreadsheet line
  raw: Record<string, string>;
}

/** Minimal CSV parser supporting quoted fields, commas and newlines in quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\n") {
      pushRow();
    } else {
      field += ch;
    }
  }
  // trailing field/row
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

// Column header aliases (Russian + English) → canonical keys.
const HEADER_ALIASES: Record<string, string> = {
  "фио": "full_name",
  "имя": "full_name",
  "name": "full_name",
  "full name": "full_name",
  "кандидат": "full_name",
  "телефон": "phone",
  "phone": "phone",
  "email": "email",
  "почта": "email",
  "telegram": "telegram",
  "телеграм": "telegram",
  "должность": "position",
  "позиция": "position",
  "position": "position",
  "вакансия": "position",
  "источник": "source",
  "source": "source",
  "статус": "stage",
  "этап": "stage",
  "stage": "stage",
  "status": "stage",
  "тест": "test_score",
  "результат теста": "test_score",
  "test": "test_score",
  "test_score": "test_score",
  "собеседование": "interview_date",
  "дата собеседования": "interview_date",
  "interview": "interview_date",
  "заметки": "notes",
  "комментарий": "notes",
  "notes": "notes",
  "итог": "outcome",
  "результат": "outcome",
  "outcome": "outcome",
  "испытательный срок": "probation_result",
  "probation": "probation_result",
};

export function canonicalHeader(header: string): string {
  const key = header.trim().toLowerCase();
  return HEADER_ALIASES[key] ?? key;
}

const SOURCE_ALIASES: Record<string, Enums<"candidate_source">> = {
  "заявка": "application",
  application: "application",
  "таргет": "target",
  target: "target",
  "рекомендация": "recommendation",
  recommendation: "recommendation",
  linkedin: "linkedin",
  telegram: "telegram",
  "job platform": "job_platform",
  job_platform: "job_platform",
};

const STAGE_ALIASES: Record<string, Enums<"recruitment_stage">> = {
  "первый контакт": "first_contact",
  "заявка": "first_contact",
  first_contact: "first_contact",
  "тест": "test",
  test: "test",
  "отбор": "screening",
  screening: "screening",
  "собеседование": "interview",
  interview: "interview",
  "оценка опыта": "experience_eval",
  "оффер": "offer",
  offer: "offer",
  "испытательный срок": "probation",
  probation: "probation",
  "принят": "hired",
  hired: "hired",
  "отклонён": "rejected",
  "отклонен": "rejected",
  rejected: "rejected",
};

export function mapSource(value?: string): Enums<"candidate_source"> {
  if (!value) return "other";
  return SOURCE_ALIASES[value.trim().toLowerCase()] ?? "other";
}

export function mapStage(value?: string): Enums<"recruitment_stage"> {
  if (!value) return "first_contact";
  return STAGE_ALIASES[value.trim().toLowerCase()] ?? "first_contact";
}

export interface ImportRowResult {
  rowNumber: number;
  valid: boolean;
  error?: string;
  isDuplicate: boolean;
  duplicateReasons: string[];
  data?: {
    full_name: string;
    phone: string | null;
    email: string | null;
    telegram: string | null;
    position: string | null;
    source: Enums<"candidate_source">;
    stage: Enums<"recruitment_stage">;
    notes: string | null;
    source_row: number;
  };
}

export interface ImportPreview {
  total: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  importable: number;
  rows: ImportRowResult[];
}

export const IMPORT_TEMPLATE_HEADERS = [
  "ФИО",
  "Телефон",
  "Email",
  "Telegram",
  "Должность",
  "Источник",
  "Статус",
  "Результат теста",
  "Дата собеседования",
  "Заметки",
  "Итог",
  "Испытательный срок",
];

/**
 * Parse a CSV text into a validated, duplicate-checked preview. Existing
 * candidates are used for dedup; within-file duplicates are also flagged.
 */
export function buildImportPreview(
  csvText: string,
  existing: ExistingCandidate[],
): ImportPreview {
  const grid = parseCsv(csvText);
  if (grid.length < 1) {
    return { total: 0, validCount: 0, invalidCount: 0, duplicateCount: 0, importable: 0, rows: [] };
  }
  const headers = grid[0].map(canonicalHeader);
  const rows: ImportRowResult[] = [];
  const seenInFile: ExistingCandidate[] = [];

  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    const rowNumber = i + 1; // 1-based incl. header line
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = (cells[idx] ?? "").trim();
    });

    const parsed = importRowSchema.safeParse({
      full_name: record.full_name,
      phone: record.phone,
      email: record.email,
      telegram: record.telegram,
      position: record.position,
      source: record.source,
      stage: record.stage,
      test_score: record.test_score,
      interview_date: record.interview_date,
      notes: record.notes,
      outcome: record.outcome,
      probation_result: record.probation_result,
    });

    if (!parsed.success) {
      rows.push({
        rowNumber,
        valid: false,
        error: parsed.error.issues[0]?.message ?? "Некорректная строка",
        isDuplicate: false,
        duplicateReasons: [],
      });
      continue;
    }

    const p = parsed.data;
    const dupInput = {
      full_name: p.full_name,
      phone: p.phone,
      email: p.email,
      telegram: p.telegram,
    };
    const againstExisting = findDuplicates(dupInput, existing);
    const againstFile = findDuplicates(dupInput, seenInFile);
    const matches = [...againstExisting, ...againstFile];
    const reasons = Array.from(new Set(matches.flatMap((m) => m.reasons)));

    const notes = [record.notes, record.outcome ? `Итог: ${record.outcome}` : "", record.probation_result ? `Исп. срок: ${record.probation_result}` : "", record.test_score ? `Тест: ${record.test_score}` : ""]
      .filter(Boolean)
      .join("\n");

    rows.push({
      rowNumber,
      valid: true,
      isDuplicate: matches.length > 0,
      duplicateReasons: reasons,
      data: {
        full_name: p.full_name,
        phone: p.phone ?? null,
        email: p.email ?? null,
        telegram: p.telegram ?? null,
        position: p.position ?? null,
        source: mapSource(p.source),
        stage: mapStage(p.stage),
        notes: notes || null,
        source_row: rowNumber,
      },
    });

    // Track this row for within-file dedup.
    seenInFile.push({
      id: `file-${rowNumber}`,
      full_name: p.full_name,
      phone_normalized: p.phone ? p.phone.replace(/[^0-9]/g, "") : null,
      email_normalized: p.email ? p.email.toLowerCase() : null,
      telegram_normalized: p.telegram ? p.telegram.toLowerCase().replace(/^@+/, "") : null,
      resume_url: null,
      first_contact_date: null,
      created_at: new Date().toISOString(),
      stage: "first_contact",
    });
  }

  const validCount = rows.filter((r) => r.valid).length;
  const duplicateCount = rows.filter((r) => r.isDuplicate).length;
  return {
    total: rows.length,
    validCount,
    invalidCount: rows.length - validCount,
    duplicateCount,
    importable: rows.filter((r) => r.valid && !r.isDuplicate).length,
    rows,
  };
}
