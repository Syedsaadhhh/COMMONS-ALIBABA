import { describe, it, expect } from "vitest";
import { deriveProjectTimeline } from "@/lib/projects/timeline";
import type { ProjectBundle } from "@/lib/projects/types";

function makeBundle(overrides: Partial<ProjectBundle> = {}): ProjectBundle {
  return {
    project: {
      id: "p1",
      title: "Flooding",
      problem_summary: "Flooding near school",
      description: null,
      location: "Sector 4",
      objective: "Fix drainage",
      status: "active",
      image_url: null,
      latitude: null,
      longitude: null,
      created_by: "submitter-1",
      corroboration_count: 0,
      community_verified: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    tasks: [],
    kpis: [],
    measurements: [],
    evidence: [],
    taskEvidenceClaims: [],
    corroboration: [],
    verificationReviews: [],
    statusHistory: [],
    ...overrides,
  } as ProjectBundle;
}

describe("deriveProjectTimeline", () => {
  it("includes the project submission event", () => {
    const timeline = deriveProjectTimeline(makeBundle());
    expect(timeline[0]).toMatchObject({
      label: "Project submitted",
      kind: "submitted",
    });
  });

  it("includes corroboration events", () => {
    const timeline = deriveProjectTimeline(
      makeBundle({
        corroboration: [
          {
            id: "c1",
            project_id: "p1",
            contributed_by: "u2",
            title: "Also flooded",
            description: null,
            location: "Sector 4",
            image_url: null,
            matched_by: "mixed",
            similarity_score: 0.8,
            created_at: "2026-01-02T00:00:00Z",
          },
        ],
      }),
    );
    expect(timeline.some((e) => e.kind === "corroborated")).toBe(true);
  });

  it("includes accepted evidence and sourced measurements", () => {
    const timeline = deriveProjectTimeline(
      makeBundle({
        evidence: [
          {
            id: "e1",
            project_id: "p1",
            title: "Before photo",
            description: null,
            file_url: "https://example.com/before.jpg",
            file_hash: "abc",
            phase: "before",
            status: "ACCEPTED",
            latitude: null,
            longitude: null,
            created_at: "2026-01-03T00:00:00Z",
          },
        ],
        measurements: [
          {
            id: "m1",
            kpi_id: "k1",
            value: 2,
            measured_at: "2026-01-04T00:00:00Z",
            source: "Agency log",
          },
        ],
      }),
    );
    expect(timeline.some((e) => e.label.includes("evidence accepted"))).toBe(true);
    expect(timeline.some((e) => e.label.includes("measurement recorded"))).toBe(true);
  });

  it("includes a completed event when the project is completed", () => {
    const timeline = deriveProjectTimeline(
      makeBundle({
        project: {
          ...makeBundle().project,
          status: "completed",
          updated_at: "2026-01-05T00:00:00Z",
        },
      }),
    );
    expect(timeline.some((e) => e.kind === "completed")).toBe(true);
  });

  it("sorts events chronologically", () => {
    const timeline = deriveProjectTimeline(
      makeBundle({
        project: {
          ...makeBundle().project,
          created_at: "2026-01-05T00:00:00Z",
        },
        corroboration: [
          {
            id: "c1",
            project_id: "p1",
            contributed_by: "u2",
            title: "Earlier report",
            description: null,
            location: "Sector 4",
            image_url: null,
            matched_by: "mixed",
            similarity_score: 0.8,
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    );
    const labels = timeline.map((e) => e.label);
    expect(labels.indexOf("Corroborating report added")).toBeLessThan(
      labels.indexOf("Project submitted"),
    );
  });
});
