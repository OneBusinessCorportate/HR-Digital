import { APP_TIMEZONE } from "./constants";

/**
 * Date/time helpers anchored to the business timezone (Asia/Yerevan by default).
 *
 * Armenia observes a fixed UTC+4 offset (no DST), but these helpers derive the
 * offset dynamically from the timezone so date-boundary metrics are computed in
 * local wall-clock time regardless of the server's timezone.
 */

export type PeriodPreset = "today" | "week" | "month" | "all" | "custom";

export interface DateRange {
  /** inclusive lower bound (UTC instant) */
  from: Date;
  /** exclusive upper bound (UTC instant) */
  to: Date;
}

interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(date: Date, tz: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Offset in ms: (wall-clock interpreted as UTC) - actual instant. UTC+4 → +4h. */
function tzOffsetMs(date: Date, tz: string): number {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // strip sub-second so the delta is a clean offset
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** UTC instant for local midnight of the given date, in the given timezone. */
export function startOfDay(date: Date, tz: string = APP_TIMEZONE): Date {
  const p = zonedParts(date, tz);
  const off = tzOffsetMs(date, tz);
  const midnightAsUtc = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0);
  return new Date(midnightAsUtc - off);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

/** Local day-of-week (1 = Monday .. 7 = Sunday) in the given timezone. */
export function isoWeekday(date: Date, tz: string = APP_TIMEZONE): number {
  const p = zonedParts(date, tz);
  const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); // 0=Sun
  return dow === 0 ? 7 : dow;
}

export function startOfWeek(date: Date, tz: string = APP_TIMEZONE): Date {
  const sod = startOfDay(date, tz);
  const wd = isoWeekday(date, tz);
  return addDays(sod, -(wd - 1));
}

export function startOfMonth(date: Date, tz: string = APP_TIMEZONE): Date {
  const p = zonedParts(date, tz);
  const off = tzOffsetMs(date, tz);
  const firstAsUtc = Date.UTC(p.year, p.month - 1, 1, 0, 0, 0);
  return new Date(firstAsUtc - off);
}

export function startOfNextMonth(date: Date, tz: string = APP_TIMEZONE): Date {
  const p = zonedParts(date, tz);
  const off = tzOffsetMs(date, tz);
  const y = p.month === 12 ? p.year + 1 : p.year;
  const m = p.month === 12 ? 0 : p.month; // month index for the *next* month
  const firstAsUtc = Date.UTC(y, m, 1, 0, 0, 0);
  return new Date(firstAsUtc - off);
}

/**
 * Resolve a period preset (relative to `now`) into an absolute UTC range.
 * `to` is exclusive. For "all" a very wide range is returned.
 */
export function resolvePeriod(
  preset: PeriodPreset,
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
  custom?: { from?: string; to?: string },
): DateRange {
  switch (preset) {
    case "today": {
      const from = startOfDay(now, tz);
      return { from, to: addDays(from, 1) };
    }
    case "week": {
      const from = startOfWeek(now, tz);
      return { from, to: addDays(from, 7) };
    }
    case "month": {
      return { from: startOfMonth(now, tz), to: startOfNextMonth(now, tz) };
    }
    case "custom": {
      const from = custom?.from
        ? startOfDay(new Date(custom.from + "T12:00:00Z"), tz)
        : new Date(0);
      const to = custom?.to
        ? addDays(startOfDay(new Date(custom.to + "T12:00:00Z"), tz), 1)
        : new Date(8640000000000000);
      return { from, to };
    }
    case "all":
    default:
      return { from: new Date(0), to: new Date(8640000000000000) };
  }
}

export function inRange(iso: string | null | undefined, range: DateRange): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= range.from.getTime() && t < range.to.getTime();
}

/** Whole days between two dates (b - a), rounded down. Negative if b < a. */
export function daysBetween(a: string | Date, b: string | Date): number {
  const at = typeof a === "string" ? new Date(a).getTime() : a.getTime();
  const bt = typeof b === "string" ? new Date(b).getTime() : b.getTime();
  return Math.floor((bt - at) / 86400000);
}

// ─── Formatting (Russian locale, business timezone) ──────────────────────────

export function formatDate(
  value: string | Date | null | undefined,
  tz: string = APP_TIMEZONE,
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(
  value: string | Date | null | undefined,
  tz: string = APP_TIMEZONE,
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** value for <input type="date"> in the business timezone. */
export function toDateInputValue(
  value: string | Date | null | undefined,
  tz: string = APP_TIMEZONE,
): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return p; // en-CA yields YYYY-MM-DD
}

export function todayInputValue(tz: string = APP_TIMEZONE): string {
  return toDateInputValue(new Date(), tz);
}

/**
 * Compose a Yerevan wall-clock date + time into an absolute ISO instant. Armenia
 * uses a fixed UTC+4 offset (no DST), so the offset is constant.
 */
export function yerevanInstant(date: string, time: string): string {
  return `${date}T${time}:00+04:00`;
}
