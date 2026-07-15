import { describe, it, expect } from "vitest";
import { filterCandidates, type CandidateFilterFields } from "./search";

const list: CandidateFilterFields[] = [
  { full_name: "Иван Иванов", position: "Менеджер", email_normalized: "ivan@x.io", phone_normalized: "37411111111", stage: "test", source: "target", responsible_user_id: "u1" },
  { full_name: "Анна Петрова", position: "Маркетолог", email_normalized: "anna@x.io", phone_normalized: "37422222222", stage: "hired", source: "linkedin", responsible_user_id: "u2" },
  { full_name: "Пётр Сидоров", position: null, email_normalized: null, phone_normalized: null, stage: "rejected", source: "target", responsible_user_id: "u1" },
];

describe("candidate search and filters", () => {
  it("searches by name", () => {
    expect(filterCandidates(list, { q: "анна" })).toHaveLength(1);
  });
  it("searches by phone and email", () => {
    expect(filterCandidates(list, { q: "37411" })[0].full_name).toBe("Иван Иванов");
    expect(filterCandidates(list, { q: "anna@x" })[0].full_name).toBe("Анна Петрова");
  });
  it("filters by stage, source, responsible", () => {
    expect(filterCandidates(list, { stage: "test" })).toHaveLength(1);
    expect(filterCandidates(list, { source: "target" })).toHaveLength(2);
    expect(filterCandidates(list, { responsible: "u2" })).toHaveLength(1);
  });
  it("filters by outcome", () => {
    expect(filterCandidates(list, { outcome: "hired" })).toHaveLength(1);
    expect(filterCandidates(list, { outcome: "rejected" })).toHaveLength(1);
    expect(filterCandidates(list, { outcome: "open" })).toHaveLength(1);
  });
  it("combines filters", () => {
    expect(filterCandidates(list, { source: "target", outcome: "open" })).toHaveLength(1);
  });
});
