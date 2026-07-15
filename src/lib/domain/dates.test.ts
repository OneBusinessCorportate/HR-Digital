import { describe, it, expect } from "vitest";
import {
  startOfDay,
  startOfWeek,
  resolvePeriod,
  inRange,
  daysBetween,
  yerevanInstant,
} from "./dates";

const TZ = "Asia/Yerevan"; // fixed UTC+4, no DST

describe("Asia/Yerevan date boundaries", () => {
  it("midnight local = 20:00 previous day UTC", () => {
    // 06:00 local on Jul 15 → day starts at 2026-07-14T20:00Z
    const d = new Date("2026-07-15T02:00:00Z");
    expect(startOfDay(d, TZ).toISOString()).toBe("2026-07-14T20:00:00.000Z");
  });

  it("late-UTC instant belongs to the next local day", () => {
    // 21:00Z Jul 15 = 01:00 local Jul 16 → day start 2026-07-15T20:00Z
    const d = new Date("2026-07-15T21:00:00Z");
    expect(startOfDay(d, TZ).toISOString()).toBe("2026-07-15T20:00:00.000Z");
  });

  it("week starts Monday", () => {
    // 2026-07-15 is a Wednesday → week start Monday 2026-07-13 local (20:00Z Jul 12)
    const d = new Date("2026-07-15T12:00:00Z");
    expect(startOfWeek(d, TZ).toISOString()).toBe("2026-07-12T20:00:00.000Z");
  });

  it("resolvePeriod('today') spans exactly 24h", () => {
    const now = new Date("2026-07-15T12:00:00Z");
    const r = resolvePeriod("today", now, TZ);
    expect(r.to.getTime() - r.from.getTime()).toBe(86400000);
    expect(inRange(now.toISOString(), r)).toBe(true);
    expect(inRange("2026-07-14T12:00:00Z", r)).toBe(false);
  });

  it("daysBetween counts whole days", () => {
    expect(daysBetween("2026-07-01", "2026-07-04")).toBe(3);
  });

  it("yerevanInstant encodes the +04:00 offset", () => {
    expect(new Date(yerevanInstant("2026-07-20", "12:00")).toISOString()).toBe("2026-07-20T08:00:00.000Z");
  });
});
