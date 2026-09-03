/**
 * COMMONS — Role-Based Access Control (RBAC) for civic trust.
 *
 * Weakness 1 fix: lightweight, non-breaking identity helpers that prevent the
 * same user from acting as both Submitter and Reviewer on the same project.
 *
 * This module is additive. It does not modify the existing `getUser`,
 * `signIn`, `signUp`, or `signOut` flows in `src/lib/auth/index.ts`.
 *
 * Integration points:
 *  - Call `assertSubmitterNotReviewer` before persisting a new project
 *    (or inside a server action that confirms the plan).
 *  - Call `assertReviewerCanReview` when a reviewer attempts to flip a
 *    checklist toggle, submit an evidence review, or move a project to
 *    "Completed".
 *  - Use `canReviewerApprove` for purely boolean decisions in UI code.
 */

export type ProjectActorRole =
  | "submitter"
  | "reviewer"
  | "contributor"
  | "owner"
  | "viewer";

export class RBACError extends Error {
  code: "rbac_violation";
  constructor(message: string) {
    super(message);
    this.name = "RBACError";
    this.code = "rbac_violation";
  }
}

export interface ProjectActor {
  userId: string;
  role?: ProjectActorRole;
}

/**
 * Returns true when the reviewer is a distinct user from the submitter.
 * A null/undefined reviewer is treated as "no reviewer assigned yet"
 * and does NOT pass — callers should require an explicit reviewer
 * before allowing a status transition to 'completed'.
 */
export function canReviewerApprove(
  submitterUserId: string | null | undefined,
  reviewerUserId: string | null | undefined,
): boolean {
  if (!submitterUserId || !reviewerUserId) return false;
  return submitterUserId !== reviewerUserId;
}

/**
 * Throws an `RBACError` if the reviewer is the same user as the submitter
 * or if the reviewer is missing. Safe to call inside API routes — catch
 * `RBACError` and return HTTP 403.
 */
export function assertSubmitterNotReviewer(
  submitterUserId: string | null | undefined,
  reviewerUserId: string | null | undefined,
): void {
  if (!reviewerUserId) {
    throw new RBACError(
      "A reviewer identity must be provided before approving this project.",
    );
  }
  if (!submitterUserId) {
    throw new RBACError(
      "The original submitter identity is missing; cannot validate reviewer separation.",
    );
  }
  if (submitterUserId === reviewerUserId) {
    throw new RBACError(
      "The reviewer cannot be the same person who submitted this project. Civic trust requires independent review.",
    );
  }
}

/**
 * Guard for evidence reviews and KPI-source verification: the reviewer
 * acting on a piece of evidence must not be the evidence contributor
 * AND must not be the project submitter.
 */
export function assertReviewerCanReview(
  reviewerUserId: string | null | undefined,
  context: {
    submitterUserId?: string | null;
    evidenceContributorUserId?: string | null;
  },
): void {
  if (!reviewerUserId) {
    throw new RBACError("Reviewer identity is required to perform a review.");
  }
  if (context.submitterUserId && context.submitterUserId === reviewerUserId) {
    throw new RBACError(
      "The project submitter cannot act as the reviewer on their own project.",
    );
  }
  if (
    context.evidenceContributorUserId &&
    context.evidenceContributorUserId === reviewerUserId
  ) {
    throw new RBACError(
      "You cannot review evidence or KPI sources that you contributed yourself.",
    );
  }
}

/**
 * Convenience type for downstream services that persist a review decision.
 */
export interface ReviewDecision {
  reviewerUserId: string;
  submitterUserId: string;
  decision: "approved" | "rejected" | "clarification_required";
  notes?: string;
}

/**
 * Validate a full ReviewDecision object before persisting. Wraps the two
 * guards above so callers can use a single entry point.
 */
export function assertReviewDecisionAllowed(decision: ReviewDecision): void {
  assertSubmitterNotReviewer(decision.submitterUserId, decision.reviewerUserId);
}
