import { describe, it, expect } from "vitest";
import {
  canReviewerApprove,
  assertSubmitterNotReviewer,
  assertReviewerCanReview,
  RBACError,
} from "@/lib/auth/rbac";

describe("canReviewerApprove", () => {
  it("returns false when reviewer is missing", () => {
    expect(canReviewerApprove("u1", null)).toBe(false);
    expect(canReviewerApprove("u1", undefined)).toBe(false);
  });

  it("returns false when submitter is missing", () => {
    expect(canReviewerApprove(null, "u2")).toBe(false);
    expect(canReviewerApprove(undefined, "u2")).toBe(false);
  });

  it("returns false when reviewer is the submitter", () => {
    expect(canReviewerApprove("u1", "u1")).toBe(false);
  });

  it("returns true when reviewer and submitter are distinct", () => {
    expect(canReviewerApprove("u1", "u2")).toBe(true);
  });
});

describe("assertSubmitterNotReviewer", () => {
  it("throws when reviewer is missing", () => {
    expect(() => assertSubmitterNotReviewer("u1", null)).toThrow(RBACError);
  });

  it("throws when submitter is missing", () => {
    expect(() => assertSubmitterNotReviewer(null, "u2")).toThrow(RBACError);
  });

  it("throws when reviewer and submitter are the same", () => {
    expect(() => assertSubmitterNotReviewer("u1", "u1")).toThrow(RBACError);
  });

  it("does not throw when identities are distinct", () => {
    expect(() => assertSubmitterNotReviewer("u1", "u2")).not.toThrow();
  });
});

describe("assertReviewerCanReview", () => {
  it("throws when reviewer is missing", () => {
    expect(() =>
      assertReviewerCanReview(null, { submitterUserId: "u1" }),
    ).toThrow(RBACError);
  });

  it("throws when reviewer is the submitter", () => {
    expect(() =>
      assertReviewerCanReview("u1", { submitterUserId: "u1" }),
    ).toThrow(RBACError);
  });

  it("throws when reviewer contributed the evidence", () => {
    expect(() =>
      assertReviewerCanReview("u1", {
        submitterUserId: "u2",
        evidenceContributorUserId: "u1",
      }),
    ).toThrow(RBACError);
  });

  it("passes when reviewer is independent", () => {
    expect(() =>
      assertReviewerCanReview("u3", {
        submitterUserId: "u1",
        evidenceContributorUserId: "u2",
      }),
    ).not.toThrow();
  });
});
