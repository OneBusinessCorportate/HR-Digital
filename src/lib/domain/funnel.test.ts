import { describe, it, expect } from "vitest";
import {
  STAGES,
  PIPELINE_STAGES,
  stageIndex,
  progressIndex,
  nextStage,
  isForwardStep,
  isTerminal,
} from "./funnel";

describe("funnel model", () => {
  it("has the 9 approved stages in order", () => {
    expect(STAGES).toEqual([
      "first_contact",
      "test",
      "screening",
      "interview",
      "experience_eval",
      "offer",
      "probation",
      "hired",
      "rejected",
    ]);
  });

  it("pipeline excludes terminal outcomes", () => {
    expect(PIPELINE_STAGES).not.toContain("hired");
    expect(PIPELINE_STAGES).not.toContain("rejected");
  });

  it("orders stages by index", () => {
    expect(stageIndex("first_contact")).toBeLessThan(stageIndex("test"));
    expect(progressIndex("hired")).toBe(7);
  });

  it("computes the next forward stage", () => {
    expect(nextStage("first_contact")).toBe("test");
    expect(nextStage("test")).toBe("screening");
    expect(nextStage("probation")).toBe("hired");
    expect(nextStage("hired")).toBeNull();
  });

  it("detects forward steps vs jumps/rejections", () => {
    expect(isForwardStep("first_contact", "test")).toBe(true);
    expect(isForwardStep("first_contact", "interview")).toBe(false); // jump = manual override
    expect(isForwardStep("test", "rejected")).toBe(false);
  });

  it("identifies terminal stages", () => {
    expect(isTerminal("hired")).toBe(true);
    expect(isTerminal("rejected")).toBe(true);
    expect(isTerminal("offer")).toBe(false);
  });
});
