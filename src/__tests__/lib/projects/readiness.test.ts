import { describe, it, expect } from "vitest";
import { deriveReviewReadiness } from "@/lib/projects/readiness";
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

describe("deriveReviewReadiness", () => {
  it("is ready when all conditions are met", () => {
    const bundle = makeBundle({
      tasks: [
        {
          id: "t1",
          project_id: "p1",
          title: "Document location",
          owner_role: null,
          status: "completed",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      evidence: [
        {
          id: "e1",
          project_id: "p1",
          title: "Photo",
          description: null,
          file_url: "https://example.com/photo.jpg",
          file_hash: "abc",
          phase: "other",
          status: "ACCEPTED",
          latitude: null,
          longitude: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      measurements: [
        {
          id: "m1",
          kpi_id: "k1",
          value: 3,
          measured_at: "2026-01-02T00:00:00Z",
          source: "Municipal log",
        },
      ],
    });
    const result = deriveReviewReadiness(bundle, "reviewer-1");
    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("blocks when project is still a draft", () => {
    const bundle = makeBundle({
      project: { ...makeBundle().project, status: "draft" },
    });
    const result = deriveReviewReadiness(bundle, "reviewer-1");
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.includes("draft"))).toBe(true);
  });

  it("blocks when project is already completed", () => {
    const bundle = makeBundle({
      project: { ...makeBundle().project, status: "completed" },
    });
    const result = deriveReviewReadiness(bundle, "reviewer-1");
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.includes("closed"))).toBe(true);
  });

  it("blocks when tasks are open", () => {
    const bundle = makeBundle({
      tasks: [
        {
          id: "t1",
          project_id: "p1",
          title: "Open task",
          owner_role: null,
          status: "in_progress",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    const result = deriveReviewReadiness(bundle, "reviewer-1");
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.includes("task"))).toBe(true);
  });

  it("blocks when there is no accepted evidence", () => {
    const bundle = makeBundle({
      tasks: [
        {
          id: "t1",
          project_id: "p1",
          title: "Done",
          owner_role: null,
          status: "completed",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      evidence: [
        {
          id: "e1",
          project_id: "p1",
          title: "Photo",
          description: null,
          file_url: "https://example.com/photo.jpg",
          file_hash: "abc",
          phase: "other",
          status: "SUBMITTED",
          latitude: null,
          longitude: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    const result = deriveReviewReadiness(bundle, "reviewer-1");
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.includes("accepted"))).toBe(true);
  });

  it("blocks when reviewer is the submitter", () => {
    const bundle = makeBundle({
      tasks: [
        {
          id: "t1",
          project_id: "p1",
          title: "Done",
          owner_role: null,
          status: "completed",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      evidence: [
        {
          id: "e1",
          project_id: "p1",
          title: "Photo",
          description: null,
          file_url: "https://example.com/photo.jpg",
          file_hash: "abc",
          phase: "other",
          status: "ACCEPTED",
          latitude: null,
          longitude: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    const result = deriveReviewReadiness(bundle, "submitter-1");
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.includes("same person"))).toBe(true);
  });

  it("blocks when a verification review already exists", () => {
    const bundle = makeBundle({
      tasks: [
        {
          id: "t1",
          project_id: "p1",
          title: "Done",
          owner_role: null,
          status: "completed",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      evidence: [
        {
          id: "e1",
          project_id: "p1",
          title: "Photo",
          description: null,
          file_url: "https://example.com/photo.jpg",
          file_hash: "abc",
          phase: "other",
          status: "ACCEPTED",
          latitude: null,
          longitude: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      verificationReviews: [
        {
          id: "r1",
          project_id: "p1",
          reviewer_id: "reviewer-1",
          submitter_id: "submitter-1",
          evidence_matches_location: true,
          evidence_matches_problem_type: true,
          kpi_source_independent: true,
          kpi_source_verifiable: true,
          all_approved: true,
          notes: null,
          reviewed_at: "2026-01-03T00:00:00Z",
        },
      ],
    });
    const result = deriveReviewReadiness(bundle, "reviewer-2");
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.includes("already"))).toBe(true);
  });
});
