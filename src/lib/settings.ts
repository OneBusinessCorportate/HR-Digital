import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEST_PASS_THRESHOLD } from "@/lib/domain/threshold";

export interface RecruitmentSettings {
  testPassThreshold: number;
  evaluationScaleMax: number;
  probationDays: number;
  retentionDays: number;
}

const DEFAULTS: RecruitmentSettings = {
  testPassThreshold: DEFAULT_TEST_PASS_THRESHOLD,
  evaluationScaleMax: 5,
  probationDays: 30,
  retentionDays: 30,
};

/**
 * Load recruitment settings. The DB value wins; env/defaults are the fallback so
 * the threshold is configured in exactly one place per environment.
 */
export async function getSettings(): Promise<RecruitmentSettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("recruitment_settings").select("key, value");
    if (!data) return DEFAULTS;
    const map = new Map(data.map((r) => [r.key, r.value]));
    const num = (k: string, fallback: number) => {
      const v = map.get(k);
      const n = v == null ? NaN : Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    return {
      testPassThreshold: num("test_pass_threshold", DEFAULTS.testPassThreshold),
      evaluationScaleMax: num("evaluation_scale_max", DEFAULTS.evaluationScaleMax),
      probationDays: num("probation_days", DEFAULTS.probationDays),
      retentionDays: num("retention_days", DEFAULTS.retentionDays),
    };
  } catch {
    return DEFAULTS;
  }
}
