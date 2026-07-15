import type { Tables } from "@/lib/types/database";
import { ACTIONS } from "./constants";
import { DateRange, inRange, daysBetween } from "./dates";
import { progressIndex, type Stage } from "./funnel";

export type Candidate = Tables<"candidates">;
export type StageHistory = Tables<"candidate_stage_history">;
export type Test = Tables<"candidate_tests">;
export type Interview = Tables<"interviews">;
export type Evaluation = Tables<"candidate_evaluations">;
export type Offer = Tables<"offers">;
export type Probation = Tables<"probation_periods">;
export type Contact = Tables<"candidate_contacts">;
export type ActivityEvent = Pick<
  Tables<"activity_log">,
  "actor_id" | "action" | "created_at" | "meta"
>;

// ─── Ratios ──────────────────────────────────────────────────────────────────

export interface Ratio {
  numerator: number;
  denominator: number;
  percent: number;
}

export function ratio(numerator: number, denominator: number): Ratio {
  const percent =
    denominator > 0
      ? Math.round((numerator / denominator) * 1000) / 10
      : 0;
  return { numerator, denominator, percent };
}

/** "25% — 5 из 20". Empty denominator → em dash. */
export function formatRatio(r: Ratio): string {
  if (r.denominator === 0) return "—";
  return `${r.percent}% — ${r.numerator} из ${r.denominator}`;
}

// ─── Date classification for business events ─────────────────────────────────
// A date-only value (YYYY-MM-DD) is anchored to local noon so it is classified
// into the correct local calendar day regardless of UTC offset.
function dayInRange(value: string | null | undefined, range: DateRange): boolean {
  if (!value) return false;
  const iso = value.length === 10 ? `${value}T12:00:00Z` : value;
  return inRange(iso, range);
}

// ─── Furthest stage reached (per candidate) ──────────────────────────────────

export function buildReachedIndex(
  candidates: Candidate[],
  history: StageHistory[],
): Map<string, number> {
  const byCandidate = new Map<string, number>();
  const historyByCand = new Map<string, StageHistory[]>();
  for (const h of history) {
    const arr = historyByCand.get(h.candidate_id) ?? [];
    arr.push(h);
    historyByCand.set(h.candidate_id, arr);
  }
  for (const c of candidates) {
    let max = 0;
    const base =
      c.stage === "rejected"
        ? c.rejection_stage
          ? progressIndex(c.rejection_stage as Stage)
          : 0
        : progressIndex(c.stage as Stage);
    max = base;
    for (const h of historyByCand.get(c.id) ?? []) {
      if (h.to_stage !== "rejected") max = Math.max(max, progressIndex(h.to_stage as Stage));
      if (h.from_stage && h.from_stage !== "rejected")
        max = Math.max(max, progressIndex(h.from_stage as Stage));
    }
    byCandidate.set(c.id, max);
  }
  return byCandidate;
}

function countReached(reached: Map<string, number>, atLeast: number): number {
  let n = 0;
  for (const v of reached.values()) if (v >= atLeast) n++;
  return n;
}

// ─── Conversion metrics (cumulative over a candidate set) ────────────────────

export interface Conversions {
  contactToTest: Ratio;
  testToSelection: Ratio;
  selectionToInterview: Ratio;
  interviewToOffer: Ratio;
  offerToHire: Ratio;
  hireToRetained: Ratio;
}

export function computeConversions(
  candidates: Candidate[],
  history: StageHistory[],
  probations: Probation[],
): Conversions {
  const reached = buildReachedIndex(candidates, history);
  const total = candidates.length;
  const reachedTest = countReached(reached, progressIndex("test"));
  const reachedSelection = countReached(reached, progressIndex("screening"));
  const reachedInterview = countReached(reached, progressIndex("interview"));
  const reachedOffer = countReached(reached, progressIndex("offer"));
  const hired = countReached(reached, progressIndex("hired"));

  const hiredIds = new Set(
    candidates.filter((c) => (reached.get(c.id) ?? 0) >= progressIndex("hired")).map((c) => c.id),
  );
  const retained = probations.filter(
    (p) => hiredIds.has(p.candidate_id) && p.first_month_retained === true,
  ).length;

  return {
    contactToTest: ratio(reachedTest, total),
    testToSelection: ratio(reachedSelection, reachedTest),
    selectionToInterview: ratio(reachedInterview, reachedSelection),
    interviewToOffer: ratio(reachedOffer, reachedInterview),
    offerToHire: ratio(hired, reachedOffer),
    hireToRetained: ratio(retained, hired),
  };
}

// ─── First-month retention (single shared definition) ─────────────────────────
// Of candidates who reached employment (hired / probation started), how many
// were retained at least the first month (probation.first_month_retained).
export function firstMonthRetention(
  candidates: Candidate[],
  probations: Probation[],
): Ratio {
  const hiredIds = new Set(
    candidates.filter((c) => c.stage === "hired" || c.stage === "probation").map((c) => c.id),
  );
  // Employment is evidenced by a probation record OR hired stage.
  const employedIds = new Set<string>(hiredIds);
  for (const p of probations) employedIds.add(p.candidate_id);

  const denominator = employedIds.size;
  const retained = probations.filter((p) => p.first_month_retained === true).length;
  return ratio(retained, denominator);
}

// ─── Dashboard metric cards (volume within a period) ─────────────────────────

export interface FunnelCounts {
  newContacts: number;
  testsSent: number;
  testsCompleted: number;
  testsPassed: number;
  interviewsScheduled: number;
  interviewsCompleted: number;
  evaluationsCompleted: number;
  offersSent: number;
  hires: number;
  probationStarts: number;
  retainedFirstMonth: number;
}

export function computeFunnelCounts(
  data: {
    candidates: Candidate[];
    tests: Test[];
    interviews: Interview[];
    evaluations: Evaluation[];
    offers: Offer[];
    probations: Probation[];
    history: StageHistory[];
  },
  range: DateRange,
): FunnelCounts {
  const { candidates, tests, interviews, evaluations, offers, probations, history } = data;
  return {
    newContacts: candidates.filter((c) => inRange(c.created_at, range)).length,
    testsSent: tests.filter((t) => dayInRange(t.sent_date, range)).length,
    testsCompleted: tests.filter((t) => dayInRange(t.completed_date, range)).length,
    testsPassed: tests.filter(
      (t) => dayInRange(t.completed_date, range) && t.passed === true,
    ).length,
    interviewsScheduled: interviews.filter((i) => inRange(i.created_at, range)).length,
    interviewsCompleted: interviews.filter(
      (i) => i.status === "completed" && inRange(i.actual_start ?? i.updated_at, range),
    ).length,
    evaluationsCompleted: evaluations.filter((e) => inRange(e.created_at, range)).length,
    offersSent: offers.filter(
      (o) => o.status !== "not_prepared" && inRange(o.created_at, range),
    ).length,
    hires: history.filter((h) => h.to_stage === "hired" && inRange(h.created_at, range)).length,
    probationStarts: probations.filter((p) => dayInRange(p.start_date, range)).length,
    retainedFirstMonth: probations.filter(
      (p) => dayInRange(p.start_date, range) && p.first_month_retained === true,
    ).length,
  };
}

// ─── Source performance ───────────────────────────────────────────────────────

export interface SourceRow {
  source: string;
  candidates: number;
  interviews: number;
  hires: number;
  retained: number;
  conversion: Ratio; // hires / candidates
}

export function computeSourcePerformance(
  candidates: Candidate[],
  history: StageHistory[],
  probations: Probation[],
): SourceRow[] {
  const reached = buildReachedIndex(candidates, history);
  const retainedByCand = new Set(
    probations.filter((p) => p.first_month_retained === true).map((p) => p.candidate_id),
  );
  const groups = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const arr = groups.get(c.source) ?? [];
    arr.push(c);
    groups.set(c.source, arr);
  }
  const rows: SourceRow[] = [];
  for (const [source, list] of groups) {
    const interviews = list.filter(
      (c) => (reached.get(c.id) ?? 0) >= progressIndex("interview"),
    ).length;
    const hires = list.filter(
      (c) => (reached.get(c.id) ?? 0) >= progressIndex("hired"),
    ).length;
    const retained = list.filter((c) => retainedByCand.has(c.id)).length;
    rows.push({
      source,
      candidates: list.length,
      interviews,
      hires,
      retained,
      conversion: ratio(hires, list.length),
    });
  }
  rows.sort((a, b) => b.candidates - a.candidates);
  return rows;
}

// ─── Work volume (recorded actions, per actor or whole team) ─────────────────

export interface WorkVolume {
  candidatesAdded: number;
  contactsRecorded: number;
  followUps: number;
  stageChanges: number;
  testsSent: number;
  testResultsRecorded: number;
  interviewsScheduled: number;
  interviewsRescheduled: number;
  interviewsConducted: number;
  evaluationsCompleted: number;
  offersRecorded: number;
  finalDecisions: number;
  probationStarts: number;
  notesAdded: number;
  total: number;
}

export function computeWorkVolume(
  events: ActivityEvent[],
  range: DateRange,
  actorId?: string | null,
): WorkVolume {
  const relevant = events.filter(
    (e) => inRange(e.created_at, range) && (!actorId || e.actor_id === actorId),
  );
  const count = (action: string) => relevant.filter((e) => e.action === action).length;
  const followUps = relevant.filter(
    (e) =>
      e.action === ACTIONS.CONTACT_RECORDED &&
      typeof e.meta === "object" &&
      e.meta !== null &&
      (e.meta as Record<string, unknown>).result === "follow_up",
  ).length;

  const wv: WorkVolume = {
    candidatesAdded: count(ACTIONS.CANDIDATE_CREATED),
    contactsRecorded: count(ACTIONS.CONTACT_RECORDED),
    followUps,
    stageChanges: count(ACTIONS.STAGE_CHANGED),
    testsSent: count(ACTIONS.TEST_SENT),
    testResultsRecorded: count(ACTIONS.TEST_RECORDED),
    interviewsScheduled: count(ACTIONS.INTERVIEW_SCHEDULED),
    interviewsRescheduled: count(ACTIONS.INTERVIEW_RESCHEDULED),
    interviewsConducted: count(ACTIONS.INTERVIEW_COMPLETED),
    evaluationsCompleted: count(ACTIONS.EVALUATION_CREATED),
    offersRecorded: count(ACTIONS.OFFER_RECORDED),
    finalDecisions: count(ACTIONS.DECISION_RECORDED),
    probationStarts: count(ACTIONS.PROBATION_STARTED),
    notesAdded: count(ACTIONS.NOTE_ADDED),
    total: 0,
  };
  wv.total =
    wv.candidatesAdded +
    wv.contactsRecorded +
    wv.stageChanges +
    wv.testsSent +
    wv.testResultsRecorded +
    wv.interviewsScheduled +
    wv.interviewsRescheduled +
    wv.interviewsConducted +
    wv.evaluationsCompleted +
    wv.offersRecorded +
    wv.finalDecisions +
    wv.probationStarts +
    wv.notesAdded;
  return wv;
}

// ─── Time-based effectiveness ─────────────────────────────────────────────────

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export interface TimeMetrics {
  avgContactToInterviewDays: number | null;
  avgContactToHireDays: number | null;
  avgStageDurations: { stage: Stage; avgDays: number | null; samples: number }[];
}

export function computeTimeMetrics(
  candidates: Candidate[],
  history: StageHistory[],
  interviews: Interview[],
): TimeMetrics {
  const candById = new Map(candidates.map((c) => [c.id, c]));

  // Contact -> first interview
  const firstInterviewByCand = new Map<string, string>();
  for (const i of interviews) {
    const cur = firstInterviewByCand.get(i.candidate_id);
    if (!cur || new Date(i.scheduled_start) < new Date(cur))
      firstInterviewByCand.set(i.candidate_id, i.scheduled_start);
  }
  const toInterview: number[] = [];
  for (const [candId, when] of firstInterviewByCand) {
    const c = candById.get(candId);
    const start = c?.first_contact_date ?? c?.created_at;
    if (start) {
      const d = daysBetween(start, when);
      if (d >= 0) toInterview.push(d);
    }
  }

  // Contact -> hire (from stage history entry to hired)
  const hireDateByCand = new Map<string, string>();
  for (const h of history) {
    if (h.to_stage === "hired") {
      const cur = hireDateByCand.get(h.candidate_id);
      if (!cur || new Date(h.created_at) < new Date(cur))
        hireDateByCand.set(h.candidate_id, h.created_at);
    }
  }
  const toHire: number[] = [];
  for (const [candId, when] of hireDateByCand) {
    const c = candById.get(candId);
    const start = c?.first_contact_date ?? c?.created_at;
    if (start) {
      const d = daysBetween(start, when);
      if (d >= 0) toHire.push(d);
    }
  }

  // Average duration spent in each stage (entered -> next change)
  const historyByCand = new Map<string, StageHistory[]>();
  for (const h of history) {
    const arr = historyByCand.get(h.candidate_id) ?? [];
    arr.push(h);
    historyByCand.set(h.candidate_id, arr);
  }
  const stageDurations = new Map<Stage, number[]>();
  for (const arr of historyByCand.values()) {
    const sorted = [...arr].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const next = sorted[i + 1];
      if (!next) continue; // still in this stage
      const stage = entry.to_stage as Stage;
      const d = daysBetween(entry.created_at, next.created_at);
      if (d >= 0) {
        const list = stageDurations.get(stage) ?? [];
        list.push(d);
        stageDurations.set(stage, list);
      }
    }
  }
  const avgStageDurations = (
    ["first_contact", "test", "screening", "interview", "experience_eval", "offer", "probation"] as Stage[]
  ).map((stage) => ({
    stage,
    avgDays: avg(stageDurations.get(stage) ?? []),
    samples: (stageDurations.get(stage) ?? []).length,
  }));

  return {
    avgContactToInterviewDays: avg(toInterview),
    avgContactToHireDays: avg(toHire),
    avgStageDurations,
  };
}

// ─── Overdue / attention items ───────────────────────────────────────────────

export interface OverdueBuckets {
  noNextAction: Candidate[];
  overdueFollowUps: Candidate[];
  interviewsAwaitingResult: Interview[];
  awaitingEvaluation: Candidate[];
  probationNeedsDecision: Probation[];
}

export function computeOverdue(
  data: {
    candidates: Candidate[];
    interviews: Interview[];
    evaluations: Evaluation[];
    probations: Probation[];
  },
  now: Date = new Date(),
): OverdueBuckets {
  const { candidates, interviews, evaluations, probations } = data;
  const active = candidates.filter((c) => c.stage !== "hired" && c.stage !== "rejected");
  const today = now.getTime();

  const noNextAction = active.filter((c) => !c.next_action && !c.next_action_date);
  const overdueFollowUps = active.filter(
    (c) => c.next_action_date && new Date(`${c.next_action_date}T23:59:59Z`).getTime() < today,
  );

  const interviewsAwaitingResult = interviews.filter(
    (i) => i.status === "scheduled" && new Date(i.scheduled_start).getTime() < today,
  );

  const evaluatedCandidateIds = new Set(evaluations.map((e) => e.candidate_id));
  const awaitingEvaluation = candidates.filter(
    (c) =>
      (c.stage === "interview" || c.stage === "experience_eval") &&
      interviews.some((i) => i.candidate_id === c.id && i.status === "completed") &&
      !evaluatedCandidateIds.has(c.id),
  );

  const probationNeedsDecision = probations.filter(
    (p) =>
      p.status === "in_progress" &&
      p.planned_end_date &&
      new Date(`${p.planned_end_date}T23:59:59Z`).getTime() < today,
  );

  return {
    noNextAction,
    overdueFollowUps,
    interviewsAwaitingResult,
    awaitingEvaluation,
    probationNeedsDecision,
  };
}
