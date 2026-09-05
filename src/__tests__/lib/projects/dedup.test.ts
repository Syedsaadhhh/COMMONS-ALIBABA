import { describe, it, expect } from "vitest";
import {
  haversineMetres,
  decideDuplicateOrCorroboration,
  buildCorroborationRow,
} from "@/lib/projects/dedup";
import type { ProblemSubmission } from "@/lib/validation/problem";

const submission: ProblemSubmission = {
  title: "Street flooding beside school",
  description:
    "The street beside our school floods after heavy rain and blocks students and residents.",
  location: "Street beside City School, Sector 4",
  imageUrl: "",
};

const baseCandidate = {
  id: "c1",
  title: "Flooding near City School",
  description: "Heavy rain causes flooding outside the school in sector four.",
  location: "City School, Sector 4",
  coordinates: { lat: 24.86, lng: 67.0 },
  createdAt: "2026-01-01T00:00:00Z",
};

describe("haversineMetres", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineMetres({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
  });

  it("returns Infinity for non-finite coordinates", () => {
    expect(haversineMetres({ lat: NaN, lng: 0 }, { lat: 0, lng: 0 })).toBe(
      Infinity,
    );
  });

  it("approximates a known short distance", () => {
    // ~111 km per degree of latitude at the equator.
    const distance = haversineMetres(
      { lat: 0, lng: 0 },
      { lat: 1, lng: 0 },
    );
    expect(distance).toBeGreaterThan(110_000);
    expect(distance).toBeLessThan(112_000);
  });
});

describe("decideDuplicateOrCorroboration", () => {
  it("creates new when there are no candidates", () => {
    const decision = decideDuplicateOrCorroboration({
      submission,
      candidates: [],
    });
    expect(decision.action).toBe("create_new");
  });

  it("creates new when no candidate exceeds the threshold", () => {
    const decision = decideDuplicateOrCorroboration({
      submission,
      coordinates: { lat: 1, lng: 1 },
      candidates: [{ ...baseCandidate, coordinates: { lat: 80, lng: 80 } }],
      radiusMetres: 250,
      similarityThreshold: 0.55,
    });
    expect(decision.action).toBe("create_new");
  });

  it("appends corroboration when coordinates are very close and text matches", () => {
    const decision = decideDuplicateOrCorroboration({
      submission,
      coordinates: baseCandidate.coordinates,
      candidates: [baseCandidate],
      radiusMetres: 250,
      similarityThreshold: 0.55,
    });
    expect(decision.action).toBe("append_corroboration");
    expect("matchedProjectId" in decision && decision.matchedProjectId).toBe(
      baseCandidate.id,
    );
    expect("score" in decision && decision.score).toBeGreaterThan(0.55);
    expect("matchedBy" in decision && decision.matchedBy).toBe("mixed");
  });

  it("picks the best candidate when multiple match", () => {
    const weakCandidate = {
      ...baseCandidate,
      id: "c2",
      title: "Something unrelated",
      description: "Totally different issue in another neighbourhood.",
      coordinates: { lat: 24.8601, lng: 67.0001 },
    };
    const decision = decideDuplicateOrCorroboration({
      submission,
      coordinates: baseCandidate.coordinates,
      candidates: [weakCandidate, baseCandidate],
      radiusMetres: 250,
      similarityThreshold: 0.55,
    });
    expect(decision.action).toBe("append_corroboration");
    expect("matchedProjectId" in decision && decision.matchedProjectId).toBe(
      baseCandidate.id,
    );
  });

  it("respects a custom similarity threshold", () => {
    const decision = decideDuplicateOrCorroboration({
      submission,
      coordinates: baseCandidate.coordinates,
      candidates: [baseCandidate],
      radiusMetres: 250,
      similarityThreshold: 0.95,
    });
    expect(decision.action).toBe("create_new");
  });
});

describe("buildCorroborationRow", () => {
  it("produces keys matching the project_corroboration table", () => {
    const row = buildCorroborationRow({
      projectId: "p1",
      submission,
      contributorUserId: "u1",
      matchedBy: "mixed",
      similarityScore: 0.75,
    });

    expect(row).toMatchObject({
      project_id: "p1",
      contributed_by: "u1",
      title: submission.title,
      description: submission.description,
      location: submission.location,
      image_url: null,
      matched_by: "mixed",
      similarity_score: 0.75,
    });
  });

  it("passes through an image url when present", () => {
    const withImage = { ...submission, imageUrl: "https://example.com/img.jpg" };
    const row = buildCorroborationRow({
      projectId: "p1",
      submission: withImage,
      contributorUserId: "u1",
      matchedBy: "geo",
      similarityScore: 0.6,
    });
    expect(row.image_url).toBe(withImage.imageUrl);
  });
});
