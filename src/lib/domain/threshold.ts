/**
 * Test-scoring business rule. The pass threshold is configurable (env
 * TEST_PASS_THRESHOLD or the recruitment_settings DB row); it is never
 * hardcoded across the app. The default is 70 (>= 70% passes).
 */

export const DEFAULT_TEST_PASS_THRESHOLD = Number(
  process.env.TEST_PASS_THRESHOLD ?? 70,
);

export interface TestScoreInput {
  score: number | null | undefined;
  maxScore: number | null | undefined;
}

export interface TestEvaluation {
  percent: number | null;
  passed: boolean | null;
  threshold: number;
}

/** Compute percentage from raw score/max. Returns null if not computable. */
export function computePercent(input: TestScoreInput): number | null {
  const { score, maxScore } = input;
  if (score == null) return null;
  if (maxScore == null || maxScore <= 0) {
    // Score is already interpreted as a percentage.
    if (score < 0) return null;
    return Math.min(100, Math.round(score * 100) / 100);
  }
  return Math.round((score / maxScore) * 10000) / 100;
}

/**
 * Evaluate a test against the threshold. The rule is `percent >= threshold`
 * (the approved brief: result greater than or equal to 70%).
 */
export function evaluateTest(
  input: TestScoreInput,
  threshold: number = DEFAULT_TEST_PASS_THRESHOLD,
): TestEvaluation {
  const percent = computePercent(input);
  if (percent == null) return { percent: null, passed: null, threshold };
  return { percent, passed: percent >= threshold, threshold };
}

/** The stage the system suggests after a test result (HR may override). */
export function suggestStageAfterTest(
  passed: boolean | null,
): "screening" | "rejected" | null {
  if (passed == null) return null;
  return passed ? "screening" : "rejected";
}

export type ManualPassChoice = "auto" | "pass" | "fail";

/**
 * Resolve the final pass/fail decision given the automatic (threshold-based)
 * result and an optional manual choice. Flags a manual override when the
 * human decision differs from the automatic one, so it can be recorded in history.
 */
export function resolveManualPass(
  autoPassed: boolean | null,
  choice: ManualPassChoice,
): { passed: boolean | null; isOverride: boolean } {
  if (choice === "pass") return { passed: true, isOverride: autoPassed !== true };
  if (choice === "fail") return { passed: false, isOverride: autoPassed !== false };
  return { passed: autoPassed, isOverride: false };
}
