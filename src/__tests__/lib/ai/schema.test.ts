import { describe, it, expect } from "vitest";
import { aiPlanSchema } from "@/lib/ai/schema";

describe("aiPlanSchema", () => {
  const validPlan = {
    problemSummary: "Flooding blocks access beside a school.",
    affectedGroups: ["students", "residents", "nearby businesses"],
    objective: "Create and measure a local response plan.",
    tasks: [
      {
        title: "Document the affected locations",
        ownerRole: "community contributor",
        status: "not_started",
      },
      {
        title: "Inspect drainage infrastructure",
        ownerRole: "municipal engineer",
        status: "not_started",
      },
    ],
    kpis: [
      {
        name: "Flooding incidents affecting access",
        unit: "incidents per month",
        baseline: null,
        current: null,
        target: null,
        measurementMethod: "time stamped incident log",
      },
    ],
    evidenceRequirements: [
      "Location photographs",
      "Drainage inspection record",
    ],
  };

  it("accepts a valid plan with null measurements", () => {
    const result = aiPlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kpis[0].baseline).toBeNull();
      expect(result.data.kpis[0].current).toBeNull();
      expect(result.data.kpis[0].target).toBeNull();
    }
  });

  it("rejects numeric baseline values", () => {
    const invalid = {
      ...validPlan,
      kpis: [
        {
          ...validPlan.kpis[0],
          baseline: 5,
        },
      ],
    };
    const result = aiPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects numeric current values", () => {
    const invalid = {
      ...validPlan,
      kpis: [
        {
          ...validPlan.kpis[0],
          current: 3,
        },
      ],
    };
    const result = aiPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects numeric target values", () => {
    const invalid = {
      ...validPlan,
      kpis: [
        {
          ...validPlan.kpis[0],
          target: 1,
        },
      ],
    };
    const result = aiPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects string baseline values", () => {
    const invalid = {
      ...validPlan,
      kpis: [
        {
          ...validPlan.kpis[0],
          baseline: "zero",
        },
      ],
    };
    const result = aiPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects empty problemSummary", () => {
    const invalid = { ...validPlan, problemSummary: "" };
    const result = aiPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects empty affectedGroups array", () => {
    const invalid = { ...validPlan, affectedGroups: [] };
    const result = aiPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects empty tasks array", () => {
    const invalid = { ...validPlan, tasks: [] };
    const result = aiPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects empty kpis array", () => {
    const invalid = { ...validPlan, kpis: [] };
    const result = aiPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid task status", () => {
    const invalid = {
      ...validPlan,
      tasks: [{ title: "Test", ownerRole: "tester", status: "invalid_status" }],
    };
    const result = aiPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const incomplete = { problemSummary: "Test" };
    const result = aiPlanSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("rejects unexpected properties", () => {
    const invalid = { ...validPlan, unexpectedField: "value" };
    const result = aiPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
