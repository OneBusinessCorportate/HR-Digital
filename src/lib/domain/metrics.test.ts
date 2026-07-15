import { describe, it, expect } from "vitest";
import {
  ratio,
  formatRatio,
  computeConversions,
  computeSourcePerformance,
  computeWorkVolume,
  computeFunnelCounts,
  computeTimeMetrics,
  firstMonthRetention,
  type Candidate,
  type StageHistory,
  type Probation,
  type ActivityEvent,
} from "./metrics";
import { ACTIONS } from "./constants";
import { resolvePeriod } from "./dates";

let seq = 0;
function cand(p: Partial<Candidate>): Candidate {
  seq += 1;
  return {
    id: p.id ?? `c${seq}`,
    full_name: "Test",
    phone: null,
    phone_normalized: null,
    email: null,
    email_normalized: null,
    telegram: null,
    telegram_normalized: null,
    position: null,
    source: "application",
    resume_url: null,
    resume_file_path: null,
    first_contact_date: null,
    first_contact_comment: null,
    responsible_user_id: null,
    stage: "first_contact",
    next_action: null,
    next_action_date: null,
    rejection_stage: null,
    rejection_reason: null,
    rejection_date: null,
    rejection_comment: null,
    last_activity_at: "2026-07-15T00:00:00Z",
    created_by: null,
    created_at: "2026-07-15T00:00:00Z",
    updated_at: "2026-07-15T00:00:00Z",
    ...p,
  } as Candidate;
}

function prob(p: Partial<Probation>): Probation {
  return {
    id: `p${seq++}`,
    candidate_id: "c",
    start_date: "2026-07-01",
    planned_end_date: null,
    actual_end_date: null,
    manager_id: null,
    status: "in_progress",
    first_month_retained: null,
    comment: null,
    final_decision: null,
    created_by: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...p,
  } as Probation;
}

describe("ratio formatting", () => {
  it('formats as "percent — n из d"', () => {
    expect(formatRatio(ratio(5, 20))).toBe("25% — 5 из 20");
  });
  it("avoids division by zero", () => {
    expect(ratio(0, 0).percent).toBe(0);
    expect(formatRatio(ratio(0, 0))).toBe("—");
  });
});

describe("conversions", () => {
  const candidates = [
    cand({ id: "A", stage: "first_contact" }),
    cand({ id: "B", stage: "test" }),
    cand({ id: "C", stage: "screening" }),
    cand({ id: "D", stage: "interview" }),
    cand({ id: "E", stage: "hired" }),
    cand({ id: "F", stage: "rejected", rejection_stage: "offer" }),
  ];
  const probations = [prob({ candidate_id: "E", first_month_retained: true })];

  it("computes each funnel conversion with explicit denominators", () => {
    const c = computeConversions(candidates, [], probations);
    expect(c.contactToTest).toMatchObject({ numerator: 5, denominator: 6 });
    expect(c.testToSelection).toMatchObject({ numerator: 4, denominator: 5 });
    expect(c.selectionToInterview).toMatchObject({ numerator: 3, denominator: 4 });
    expect(c.interviewToOffer).toMatchObject({ numerator: 2, denominator: 3 });
    expect(c.offerToHire).toMatchObject({ numerator: 1, denominator: 2 });
    expect(c.hireToRetained).toMatchObject({ numerator: 1, denominator: 1 });
  });
});

describe("first-month retention", () => {
  it("is retained / employed", () => {
    const candidates = [
      cand({ id: "E", stage: "hired" }),
      cand({ id: "P", stage: "probation" }),
    ];
    const probations = [
      prob({ candidate_id: "E", first_month_retained: true }),
      prob({ candidate_id: "P", first_month_retained: false }),
    ];
    const r = firstMonthRetention(candidates, probations);
    expect(r).toMatchObject({ numerator: 1, denominator: 2 });
  });
});

describe("source performance", () => {
  it("groups by source with hires and conversion", () => {
    const candidates = [
      cand({ id: "1", source: "target", stage: "hired" }),
      cand({ id: "2", source: "target", stage: "interview" }),
      cand({ id: "3", source: "linkedin", stage: "first_contact" }),
    ];
    const rows = computeSourcePerformance(candidates, [], [prob({ candidate_id: "1", first_month_retained: true })]);
    const target = rows.find((r) => r.source === "target")!;
    expect(target.candidates).toBe(2);
    expect(target.interviews).toBe(2);
    expect(target.hires).toBe(1);
    expect(target.retained).toBe(1);
    expect(target.conversion.percent).toBe(50);
  });
});

describe("work volume", () => {
  const range = resolvePeriod("all");
  const ev = (action: string, actor: string): ActivityEvent => ({
    action,
    actor_id: actor,
    created_at: "2026-07-15T10:00:00Z",
    meta: {},
  });
  it("counts recorded actions per actor", () => {
    const events: ActivityEvent[] = [
      ev(ACTIONS.CANDIDATE_CREATED, "inga"),
      ev(ACTIONS.CANDIDATE_CREATED, "inga"),
      ev(ACTIONS.INTERVIEW_COMPLETED, "inga"),
      ev(ACTIONS.CANDIDATE_CREATED, "other"),
    ];
    const inga = computeWorkVolume(events, range, "inga");
    expect(inga.candidatesAdded).toBe(2);
    expect(inga.interviewsConducted).toBe(1);
    const team = computeWorkVolume(events, range);
    expect(team.candidatesAdded).toBe(3);
  });
  it("counts follow-ups from contact meta", () => {
    const events: ActivityEvent[] = [
      { action: ACTIONS.CONTACT_RECORDED, actor_id: "inga", created_at: "2026-07-15T10:00:00Z", meta: { result: "follow_up" } },
      { action: ACTIONS.CONTACT_RECORDED, actor_id: "inga", created_at: "2026-07-15T10:00:00Z", meta: { result: "contacted" } },
    ];
    const wv = computeWorkVolume(events, range);
    expect(wv.contactsRecorded).toBe(2);
    expect(wv.followUps).toBe(1);
  });
});

describe("empty-period metrics", () => {
  it("returns zeros for empty data", () => {
    const range = resolvePeriod("today");
    const counts = computeFunnelCounts(
      { candidates: [], tests: [], interviews: [], evaluations: [], offers: [], probations: [], history: [] },
      range,
    );
    expect(counts.newContacts).toBe(0);
    expect(counts.hires).toBe(0);
    expect(computeWorkVolume([], range).total).toBe(0);
    const c = computeConversions([], [], []);
    expect(formatRatio(c.contactToTest)).toBe("—");
  });
});

describe("average stage duration", () => {
  it("averages days spent in a stage from history", () => {
    const history: StageHistory[] = [
      { id: "h1", candidate_id: "c", from_stage: null, to_stage: "test", note: null, is_manual_override: false, changed_by: null, created_at: "2026-07-01T00:00:00Z" },
      { id: "h2", candidate_id: "c", from_stage: "test", to_stage: "screening", note: null, is_manual_override: false, changed_by: null, created_at: "2026-07-04T00:00:00Z" },
    ];
    const t = computeTimeMetrics([cand({ id: "c", stage: "screening" })], history, []);
    const testStage = t.avgStageDurations.find((d) => d.stage === "test")!;
    expect(testStage.avgDays).toBe(3);
    expect(testStage.samples).toBe(1);
  });
});
