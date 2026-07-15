import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  normalizeEmail,
  normalizeTelegram,
  findDuplicates,
  type ExistingCandidate,
} from "./duplicates";

const existing: ExistingCandidate[] = [
  {
    id: "1",
    full_name: "Иван Иванов",
    phone_normalized: "37411111111",
    email_normalized: "ivan@example.com",
    telegram_normalized: "ivan",
    resume_url: "https://hh.ru/resume/abc",
    first_contact_date: "2026-07-01",
    created_at: "2026-07-01T10:00:00Z",
    stage: "test",
  },
];

describe("normalization", () => {
  it("normalizes phones to digits", () => {
    expect(normalizePhone("+374 (11) 111-11-11")).toBe("374111111111");
    expect(normalizePhone("")).toBeNull();
  });
  it("normalizes email and telegram", () => {
    expect(normalizeEmail("  IVAN@Example.com ")).toBe("ivan@example.com");
    expect(normalizeTelegram("@Ivan")).toBe("ivan");
  });
});

describe("duplicate detection", () => {
  it("matches by phone", () => {
    const m = findDuplicates({ full_name: "Другой", phone: "+374 1111-1111" }, existing);
    expect(m).toHaveLength(1);
    expect(m[0].reasons).toContain("phone");
  });
  it("matches by email and telegram and resume url", () => {
    expect(findDuplicates({ email: "ivan@example.com" }, existing)[0].reasons).toContain("email");
    expect(findDuplicates({ telegram: "@ivan" }, existing)[0].reasons).toContain("telegram");
    expect(findDuplicates({ resume_url: "https://hh.ru/resume/abc/" }, existing)[0].reasons).toContain("resume_url");
  });
  it("matches by name only within the recent window", () => {
    const recent = findDuplicates(
      { full_name: "иван иванов", first_contact_date: "2026-07-10" },
      existing,
    );
    expect(recent[0]?.reasons).toContain("name_recent");

    const old = findDuplicates(
      { full_name: "иван иванов", first_contact_date: "2027-01-01" },
      existing,
    );
    expect(old.some((m) => m.reasons.includes("name_recent"))).toBe(false);
  });
  it("returns nothing for a genuinely new candidate", () => {
    expect(findDuplicates({ full_name: "Пётр", phone: "37499999999", email: "p@x.io" }, existing)).toHaveLength(0);
  });
});
