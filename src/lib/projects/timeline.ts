import type { ProjectBundle } from "@/lib/projects/types";

export type TimelineEventKind =
  | "submitted"
  | "reviewed"
  | "corroborated"
  | "completed"
  | "default";

export interface ProjectTrustTimelineEvent {
  label: string;
  at: string | Date;
  kind?: TimelineEventKind;
}

interface TimelineSourceEvent {
  at: string;
  label: string;
  kind: TimelineEventKind;
}

function toEvent(
  at: string | null | undefined,
  label: string,
  kind: TimelineEventKind,
): TimelineSourceEvent | null {
  if (!at) return null;
  const time = new Date(at).getTime();
  if (Number.isNaN(time)) return null;
  return { at, label, kind };
}

/**
 * Derive a trust timeline from data already readable in the bundle.
 * No service-role writes are required; the timeline reflects observable
 * records (project creation, corroboration, accepted evidence, sourced
 * measurements, and completed reviews).
 */
export function deriveProjectTimeline(
  bundle: ProjectBundle,
): ProjectTrustTimelineEvent[] {
  const { project, evidence, measurements, corroboration, verificationReviews } = bundle;
  const events: TimelineSourceEvent[] = [];

  const submitted = toEvent(project.created_at, "Project submitted", "submitted");
  if (submitted) events.push(submitted);

  for (const c of corroboration) {
    const event = toEvent(
      c.created_at,
      `Corroborating report added`,
      "corroborated",
    );
    if (event) events.push(event);
  }

  const acceptedEvidence = evidence
    .filter((e) => e.status === "ACCEPTED")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  if (acceptedEvidence[0]) {
    const event = toEvent(
      acceptedEvidence[0].created_at,
      "First evidence accepted",
      "default",
    );
    if (event) events.push(event);
  }

  const sourcedMeasurements = [...measurements].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime(),
  );
  if (sourcedMeasurements[0]) {
    const event = toEvent(
      sourcedMeasurements[0].measured_at,
      "First sourced measurement recorded",
      "default",
    );
    if (event) events.push(event);
  }

  for (const review of verificationReviews.filter((r) => r.all_approved)) {
    const event = toEvent(review.reviewed_at, "Independent review completed", "reviewed");
    if (event) events.push(event);
  }

  if (project.status === "completed") {
    const event = toEvent(project.updated_at, "Project marked completed", "completed");
    if (event) events.push(event);
  }

  return events
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .map((e) => ({ label: e.label, at: e.at, kind: e.kind }));
}
