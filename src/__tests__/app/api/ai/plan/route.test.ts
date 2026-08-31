import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "@/app/api/ai/plan/route";
import { AIError } from "@/lib/ai/errors";

vi.mock("@/lib/ai/service", () => ({
  generatePlan: vi.fn(),
}));

const { generatePlan } = await import("@/lib/ai/service");

const validPlan = {
  problemSummary: "Flooding blocks access beside a school.",
  affectedGroups: ["students", "residents"],
  objective: "Create and measure a local response plan.",
  tasks: [
    {
      title: "Document the affected locations",
      ownerRole: "community contributor",
      status: "not_started" as const,
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
  evidenceRequirements: ["Location photographs"],
};

const validSubmission = {
  title: "Street flooding beside school",
  description:
    "The street beside our school floods after heavy rain and blocks students and residents.",
  location: "Street beside City School, Sector 4",
};

describe("/api/ai/plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  async function makeRequest(body: unknown) {
    const request = new Request("http://localhost/api/ai/plan", {
      method: "POST",
      body: JSON.stringify(body),
    }) as NextRequest;
    return POST(request);
  }

  it("returns 200 with a draft plan on success", async () => {
    vi.mocked(generatePlan).mockResolvedValueOnce(validPlan);

    const response = await makeRequest(validSubmission);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("draft");
    expect(json.plan).toEqual(validPlan);
  });

  it("returns 422 for invalid submission", async () => {
    const response = await makeRequest({ title: "Hi" });
    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json.error).toBe("Invalid submission");
    expect(json.details).toBeDefined();
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost/api/ai/plan", {
      method: "POST",
      body: "not-json",
    }) as NextRequest;
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 500 without upstream details on configuration_error", async () => {
    vi.mocked(generatePlan).mockRejectedValueOnce(
      new AIError("configuration_error", "Missing key"),
    );

    const response = await makeRequest(validSubmission);
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("AI service is not configured.");
    expect(json.requestId).toBeDefined();
    expect(json.detail).toBeUndefined();
    expect(json.message).toBeUndefined();
  });

  it("returns 503 on ai_unavailable", async () => {
    vi.mocked(generatePlan).mockRejectedValueOnce(
      new AIError("ai_unavailable", "Qwen timed out."),
    );

    const response = await makeRequest(validSubmission);
    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json.error).toBe("AI service is temporarily unavailable.");
    expect(json.requestId).toBeDefined();
  });

  it("returns 502 on ai_rejected_request", async () => {
    vi.mocked(generatePlan).mockRejectedValueOnce(
      new AIError("ai_rejected_request", "Bad request."),
    );

    const response = await makeRequest(validSubmission);
    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error).toBe("AI service rejected the request.");
    expect(json.requestId).toBeDefined();
  });

  it("returns 502 on ai_invalid_response", async () => {
    vi.mocked(generatePlan).mockRejectedValueOnce(
      new AIError("ai_invalid_response", "Schema failed."),
    );

    const response = await makeRequest(validSubmission);
    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error).toBe("AI returned an invalid response.");
    expect(json.requestId).toBeDefined();
  });

  it("does not expose the upstream error message", async () => {
    vi.mocked(generatePlan).mockRejectedValueOnce(
      new AIError("ai_invalid_response", "Upstream secret detail"),
    );

    const response = await makeRequest(validSubmission);
    const json = await response.json();
    expect(json.error).not.toContain("Upstream secret detail");
  });
});
