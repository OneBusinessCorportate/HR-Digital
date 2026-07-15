import { describe, it, expect } from "vitest";
import {
  candidateSchema,
  contactSchema,
  testSchema,
  interviewScheduleSchema,
  interviewRescheduleSchema,
  interviewCompleteSchema,
  evaluationSchema,
  validateEvaluationScores,
  offerSchema,
  probationStartSchema,
  probationCompleteSchema,
  rejectionSchema,
} from "./validation";

describe("candidate validation", () => {
  it("accepts a valid candidate", () => {
    const r = candidateSchema.safeParse({ full_name: "Иван Иванов", source: "application", stage: "first_contact" });
    expect(r.success).toBe(true);
  });
  it("rejects a too-short name", () => {
    expect(candidateSchema.safeParse({ full_name: "A", source: "application" }).success).toBe(false);
  });
  it("rejects an invalid email", () => {
    const r = candidateSchema.safeParse({ full_name: "Иван", source: "application", email: "not-an-email" });
    expect(r.success).toBe(false);
  });
  it("treats empty optional strings as undefined", () => {
    const r = candidateSchema.safeParse({ full_name: "Иван", source: "application", email: "", phone: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBeUndefined();
  });
});

describe("api input validation", () => {
  it("contact requires a candidate uuid", () => {
    expect(contactSchema.safeParse({ candidate_id: "x", contact_at: "2026-07-15T10:00", channel: "phone" }).success).toBe(false);
  });
  it("test rejects score greater than max", () => {
    const r = testSchema.safeParse({ candidate_id: "11111111-1111-1111-1111-111111111111", score: "120", max_score: "100" });
    expect(r.success).toBe(false);
  });
});

describe("interview validation", () => {
  const cid = "11111111-1111-1111-1111-111111111111";
  it("schedules with date+time", () => {
    const r = interviewScheduleSchema.safeParse({ candidate_id: cid, date: "2026-07-20", time: "12:30", format: "google_meet" });
    expect(r.success).toBe(true);
  });
  it("rejects a bad time", () => {
    expect(interviewScheduleSchema.safeParse({ candidate_id: cid, date: "2026-07-20", time: "25:99", format: "office" }).success).toBe(false);
  });
  it("reschedules", () => {
    const r = interviewRescheduleSchema.safeParse({ interview_id: cid, date: "2026-07-21", time: "09:00" });
    expect(r.success).toBe(true);
  });
  it("completes with a valid status", () => {
    expect(interviewCompleteSchema.safeParse({ interview_id: cid, status: "completed" }).success).toBe(true);
    expect(interviewCompleteSchema.safeParse({ interview_id: cid, status: "unknown" }).success).toBe(false);
  });
});

describe("evaluation validation", () => {
  const base = {
    candidate_id: "11111111-1111-1111-1111-111111111111",
    scale_max: 5,
    professional_score: 4,
    communication_score: 4,
    motivation_score: 4,
    skills_score: 4,
    culture_fit_score: 4,
    overall_score: 4,
    recommendation: "proceed",
  };
  it("accepts scores within the scale", () => {
    const r = evaluationSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(validateEvaluationScores(r.data)).toBeNull();
  });
  it("rejects a score above the scale", () => {
    const r = evaluationSchema.safeParse({ ...base, overall_score: 9 });
    expect(r.success).toBe(true);
    if (r.success) expect(validateEvaluationScores(r.data)).not.toBeNull();
  });
});

describe("offer / probation / rejection validation", () => {
  const cid = "11111111-1111-1111-1111-111111111111";
  it("validates offer statuses", () => {
    expect(offerSchema.safeParse({ candidate_id: cid, status: "sent" }).success).toBe(true);
    expect(offerSchema.safeParse({ candidate_id: cid, status: "bogus" }).success).toBe(false);
  });
  it("starts and completes probation", () => {
    expect(probationStartSchema.safeParse({ candidate_id: cid, start_date: "2026-07-15" }).success).toBe(true);
    expect(probationCompleteSchema.safeParse({ probation_id: cid, status: "passed" }).success).toBe(true);
    expect(probationCompleteSchema.safeParse({ probation_id: cid, status: "in_progress" }).success).toBe(false);
  });
  it("requires a reason and stage to reject", () => {
    expect(rejectionSchema.safeParse({ candidate_id: cid, rejection_stage: "test", rejection_reason: "нет опыта", rejection_date: "2026-07-15" }).success).toBe(true);
    expect(rejectionSchema.safeParse({ candidate_id: cid, rejection_stage: "test", rejection_reason: "", rejection_date: "2026-07-15" }).success).toBe(false);
  });
});
