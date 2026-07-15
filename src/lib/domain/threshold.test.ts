import { describe, it, expect } from "vitest";
import {
  computePercent,
  evaluateTest,
  suggestStageAfterTest,
  resolveManualPass,
} from "./threshold";

describe("test scoring", () => {
  it("computes percent from score/max", () => {
    expect(computePercent({ score: 70, maxScore: 100 })).toBe(70);
    expect(computePercent({ score: 35, maxScore: 50 })).toBe(70);
    expect(computePercent({ score: 8, maxScore: 12 })).toBeCloseTo(66.67, 1);
  });

  it("treats a bare score as a percentage when no max is given", () => {
    expect(computePercent({ score: 82, maxScore: null })).toBe(82);
  });

  it("returns null when not computable", () => {
    expect(computePercent({ score: null, maxScore: 100 })).toBeNull();
  });

  // Threshold boundary: 69 fails, 70 passes, 71 passes (>= 70).
  it("applies the >=70 threshold at the boundary", () => {
    expect(evaluateTest({ score: 69, maxScore: 100 }, 70).passed).toBe(false);
    expect(evaluateTest({ score: 70, maxScore: 100 }, 70).passed).toBe(true);
    expect(evaluateTest({ score: 71, maxScore: 100 }, 70).passed).toBe(true);
  });

  it("returns null pass when no score entered", () => {
    expect(evaluateTest({ score: null, maxScore: 100 }, 70).passed).toBeNull();
  });

  it("suggests screening on pass, rejected on fail", () => {
    expect(suggestStageAfterTest(true)).toBe("screening");
    expect(suggestStageAfterTest(false)).toBe("rejected");
    expect(suggestStageAfterTest(null)).toBeNull();
  });

  describe("manual override history", () => {
    it("keeps auto result and no override when choice is auto", () => {
      expect(resolveManualPass(false, "auto")).toEqual({ passed: false, isOverride: false });
      expect(resolveManualPass(true, "auto")).toEqual({ passed: true, isOverride: false });
    });
    it("flags an override when the manual decision differs from auto", () => {
      // Auto = fail (69%), HR manually passes → override recorded.
      expect(resolveManualPass(false, "pass")).toEqual({ passed: true, isOverride: true });
      // Auto = pass, HR manually fails → override recorded.
      expect(resolveManualPass(true, "fail")).toEqual({ passed: false, isOverride: true });
    });
    it("does not flag an override when the manual decision matches auto", () => {
      expect(resolveManualPass(true, "pass")).toEqual({ passed: true, isOverride: false });
      expect(resolveManualPass(false, "fail")).toEqual({ passed: false, isOverride: false });
    });
  });
});
