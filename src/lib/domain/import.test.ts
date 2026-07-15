import { describe, it, expect } from "vitest";
import { parseCsv, buildImportPreview, mapSource, mapStage } from "./import";
import type { ExistingCandidate } from "./duplicates";

const existing: ExistingCandidate[] = [
  {
    id: "1",
    full_name: "Иван Иванов",
    phone_normalized: "37411111111",
    email_normalized: "ivan@example.com",
    telegram_normalized: null,
    resume_url: null,
    first_contact_date: null,
    created_at: "2026-07-01T00:00:00Z",
    stage: "test",
  },
];

describe("csv parser", () => {
  it("parses quoted fields with commas", () => {
    const rows = parseCsv('a,b\n"1,1",2\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["1,1", "2"],
    ]);
  });
});

describe("source / stage mapping", () => {
  it("maps Russian labels", () => {
    expect(mapSource("Таргет")).toBe("target");
    expect(mapStage("Собеседование")).toBe("interview");
    expect(mapSource("нечто")).toBe("other");
    expect(mapStage("")).toBe("first_contact");
  });
});

describe("import preview validation", () => {
  it("flags invalid rows (missing name)", () => {
    const csv = "ФИО,Email\n,noname@x.io\nПётр Петров,petr@x.io\n";
    const p = buildImportPreview(csv, []);
    expect(p.total).toBe(2);
    expect(p.invalidCount).toBe(1);
    expect(p.validCount).toBe(1);
    expect(p.importable).toBe(1);
  });

  it("flags duplicates against existing candidates", () => {
    const csv = "ФИО,Email\nКто-то,ivan@example.com\n";
    const p = buildImportPreview(csv, existing);
    expect(p.rows[0].isDuplicate).toBe(true);
    expect(p.rows[0].duplicateReasons).toContain("email");
    expect(p.importable).toBe(0);
  });

  it("flags within-file duplicates", () => {
    const csv = "ФИО,Телефон\nИван Первый,37400000000\nИван Второй,37400000000\n";
    const p = buildImportPreview(csv, []);
    expect(p.duplicateCount).toBe(1); // second row duplicates the first
    expect(p.importable).toBe(1);
  });
});
