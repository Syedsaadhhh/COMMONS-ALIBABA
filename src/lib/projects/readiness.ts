import type { ProjectBundle } from "@/lib/projects/types";
import { canReviewerApprove } from "@/lib/auth/rbac";

export interface ReadinessResult {
  ready: boolean;
  blockers: string[];
}

/**
 * Derive whether a project is ready for independent review / completion.
 * All checks use data already in the bundle; no scores or synthetic
 * confidence values are manufactured.
 */
export function deriveReviewReadiness(
  bundle: ProjectBundle,
  reviewerUserId: string | null | undefined,
): ReadinessResult {
  const blockers: string[] = [];
  const { project, tasks, kpis, measurements, evidence, verificationReviews } = bundle;

  if (project.status === "draft") {
    blockers.push("Project is still a draft and must be activated first.");
  }
  if (project.status === "completed" || project.status === "archived") {
    blockers.push("Project is already closed.");
  }

  const incompleteTasks = tasks.filter((t) => t.status !== "completed");
  if (incompleteTasks.length > 0) {
    blockers.push(`${incompleteTasks.length} task${incompleteTasks.length === 1 ? "" : "s"} still open.`);
  }

  if (evidence.length === 0) {
    blockers.push("At least one evidence reference is required.");
  }

  const acceptedEvidence = evidence.filter((e) => e.status === "ACCEPTED");
  if (evidence.length > 0 && acceptedEvidence.length === 0) {
    blockers.push("At least one evidence item must be accepted.");
  }

  if (kpis.length > 0 && measurements.length === 0) {
    blockers.push("At least one KPI measurement with a source is required.");
  }

  const hasApprovedReview = verificationReviews.some((r) => r.all_approved);
  if (hasApprovedReview) {
    blockers.push("An independent review has already been recorded.");
  }

  if (!canReviewerApprove(project.created_by, reviewerUserId)) {
    if (!reviewerUserId) {
      blockers.push("A reviewer identity is required.");
    } else if (project.created_by === reviewerUserId) {
      blockers.push("The reviewer cannot be the same person as the submitter.");
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
}
