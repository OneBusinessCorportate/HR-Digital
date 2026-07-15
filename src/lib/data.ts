import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";

export interface RecruitmentData {
  candidates: Tables<"candidates">[];
  history: Tables<"candidate_stage_history">[];
  tests: Tables<"candidate_tests">[];
  interviews: Tables<"interviews">[];
  evaluations: Tables<"candidate_evaluations">[];
  offers: Tables<"offers">[];
  probations: Tables<"probation_periods">[];
  activity: Tables<"activity_log">[];
}

export async function getProfiles(): Promise<Tables<"hr_profiles">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hr_profiles")
    .select("*")
    .eq("is_active", true)
    .order("full_name");
  return data ?? [];
}

/** Fetch the full recruitment dataset for aggregate pages (dashboard/reports/funnel). */
export async function getRecruitmentData(): Promise<RecruitmentData> {
  const supabase = await createClient();
  const [candidates, history, tests, interviews, evaluations, offers, probations, activity] =
    await Promise.all([
      supabase.from("candidates").select("*"),
      supabase.from("candidate_stage_history").select("*"),
      supabase.from("candidate_tests").select("*"),
      supabase.from("interviews").select("*"),
      supabase.from("candidate_evaluations").select("*"),
      supabase.from("offers").select("*"),
      supabase.from("probation_periods").select("*"),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(5000),
    ]);
  return {
    candidates: candidates.data ?? [],
    history: history.data ?? [],
    tests: tests.data ?? [],
    interviews: interviews.data ?? [],
    evaluations: evaluations.data ?? [],
    offers: offers.data ?? [],
    probations: probations.data ?? [],
    activity: activity.data ?? [],
  };
}

export interface CandidateBundle {
  candidate: Tables<"candidates">;
  history: Tables<"candidate_stage_history">[];
  contacts: Tables<"candidate_contacts">[];
  tests: Tables<"candidate_tests">[];
  interviews: Tables<"interviews">[];
  participants: Tables<"interview_participants">[];
  evaluations: Tables<"candidate_evaluations">[];
  offers: Tables<"offers">[];
  probations: Tables<"probation_periods">[];
  notes: Tables<"candidate_notes">[];
  activity: Tables<"activity_log">[];
}

export async function getCandidateBundle(id: string): Promise<CandidateBundle | null> {
  const supabase = await createClient();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!candidate) return null;

  const [history, contacts, tests, interviews, evaluations, offers, probations, notes, activity] =
    await Promise.all([
      supabase.from("candidate_stage_history").select("*").eq("candidate_id", id).order("created_at"),
      supabase.from("candidate_contacts").select("*").eq("candidate_id", id).order("contact_at", { ascending: false }),
      supabase.from("candidate_tests").select("*").eq("candidate_id", id).order("created_at", { ascending: false }),
      supabase.from("interviews").select("*").eq("candidate_id", id).order("scheduled_start", { ascending: false }),
      supabase.from("candidate_evaluations").select("*").eq("candidate_id", id).order("created_at", { ascending: false }),
      supabase.from("offers").select("*").eq("candidate_id", id).order("created_at", { ascending: false }),
      supabase.from("probation_periods").select("*").eq("candidate_id", id).order("created_at", { ascending: false }),
      supabase.from("candidate_notes").select("*").eq("candidate_id", id).order("created_at", { ascending: false }),
      supabase.from("activity_log").select("*").eq("candidate_id", id).order("created_at", { ascending: false }),
    ]);

  const interviewIds = (interviews.data ?? []).map((i) => i.id);
  let participants: Tables<"interview_participants">[] = [];
  if (interviewIds.length) {
    const { data } = await supabase
      .from("interview_participants")
      .select("*")
      .in("interview_id", interviewIds);
    participants = data ?? [];
  }

  return {
    candidate,
    history: history.data ?? [],
    contacts: contacts.data ?? [],
    tests: tests.data ?? [],
    interviews: interviews.data ?? [],
    participants,
    evaluations: evaluations.data ?? [],
    offers: offers.data ?? [],
    probations: probations.data ?? [],
    notes: notes.data ?? [],
    activity: activity.data ?? [],
  };
}

export function profileMap(profiles: Tables<"hr_profiles">[]): Map<string, string> {
  return new Map(profiles.map((p) => [p.id, p.full_name ?? p.email]));
}
