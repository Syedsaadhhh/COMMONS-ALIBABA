import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import type {
  ProjectTrustTimelineEvent,
  TimelineEventKind,
} from "@/lib/projects/timeline";

export type { ProjectTrustTimelineEvent };

export interface ProjectTrustSignalsProps {
  corroborationCount: number;
  communityVerified: boolean;
  timeline: ProjectTrustTimelineEvent[];
  reviewerDisplayName?: string | null;
  submitterDisplayName?: string | null;
}

function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const TIMELINE_KIND_STYLES: Record<TimelineEventKind, string> = {
  submitted: "bg-sky-500",
  corroborated: "bg-indigo-500",
  reviewed: "bg-emerald-600",
  completed: "bg-emerald-800",
  default: "bg-gray-400",
};

function CorroborationBadge({ count }: { count: number }): ReactNode {
  return (
    <span
      title={`${count} independent corroborating report${count === 1 ? "" : "s"}`}
      className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M7 8a3 3 0 100-6 3 3 0 000 6zm7.5 1a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.6 15.6A8 8 0 017 13a8 8 0 015.4 2.6A10 10 0 002 17a10 10 0 00-.4-1.4zM13 13a6 6 0 014.4 2.6A10 10 0 0018 17a10 10 0 00-.4-1.4A8 8 0 0113 13z" />
      </svg>
      {count} corroboration{count === 1 ? "" : "s"}
    </span>
  );
}

function VerifiedBadge(): ReactNode {
  return (
    <span
      title="The reviewer checklist has been signed off by an independent reviewer."
      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.7a1 1 0 00-1.4-1.4L9 10.2 7.7 8.9a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      Verified by Community
    </span>
  );
}

function PendingBadge(): ReactNode {
  return (
    <span
      title="Independent review is still required before this project can be marked Completed."
      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800"
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.6L7.7 11.7a1 1 0 101.4 1.4l2-2A1 1 0 0011 10V7z"
          clipRule="evenodd"
        />
      </svg>
      Awaiting independent review
    </span>
  );
}

/**
 * COMMONS — Project Card Trust Signals (Weakness 5).
 *
 * Drop-in visual trust layer for the `/projects` listing and the
 * project detail page. Pure presentational — pass in the counts and
 * timeline that your server component reads from Supabase.
 *
 * Renders:
 *  - Integer "Corroborating Reports" counter badge (always visible).
 *  - Conditional "Verified by Community" badge when the reviewer
 *    checklist has been signed off.
 *  - Submission → Review timeline showing when key trust events happened.
 *  - Reviewer + submitter identity disclosure (display names only).
 */
export function ProjectTrustSignals({
  corroborationCount,
  communityVerified,
  timeline,
  reviewerDisplayName,
  submitterDisplayName,
}: ProjectTrustSignalsProps): ReactNode {
  const sortedTimeline = [...timeline].sort(
    (a, b) =>
      new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CorroborationBadge count={corroborationCount} />
        {communityVerified ? <VerifiedBadge /> : <PendingBadge />}
      </div>

      {(submitterDisplayName || reviewerDisplayName) && (
        <div className="grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
          {submitterDisplayName && (
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <span className="font-medium text-gray-700">Submitted by:</span>{" "}
              {submitterDisplayName}
            </div>
          )}
          {reviewerDisplayName && (
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <span className="font-medium text-gray-700">Reviewed by:</span>{" "}
              {reviewerDisplayName}
            </div>
          )}
        </div>
      )}

      {sortedTimeline.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Project timeline
          </h4>
          <ol className="relative space-y-3 border-l-2 border-gray-200 pl-4">
            {sortedTimeline.map((event, idx) => {
              const kind = event.kind ?? "default";
              const dot = TIMELINE_KIND_STYLES[kind] ?? TIMELINE_KIND_STYLES.default;
              return (
                <li key={`${event.label}-${idx}`} className="relative">
                  <span
                    className={`absolute -left-[22px] top-1.5 h-3 w-3 rounded-full ${dot} ring-2 ring-white`}
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">
                      {event.label}
                    </p>
                    <time className="text-xs text-gray-500">
                      {formatDate(event.at)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

export interface ProjectCardProps {
  title: string;
  problemSummary: string;
  location: string;
  status: "draft" | "active" | "completed" | "archived";
  imageUrl?: string | null;
  objective?: string | null;
  tasks?: { title: string; ownerRole?: string | null; status?: string }[];
  kpis?: { name: string; unit: string; baseline?: number | null }[];
  evidenceCount?: number;
  trust?: ProjectTrustSignalsProps;
  href?: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  archived: "bg-amber-100 text-amber-800",
};

/**
 * COMMONS — Project Card with embedded trust signals.
 *
 * Used by the `/projects` listing page. The `trust` prop is optional so
 * legacy projects without trust metadata still render cleanly.
 */
export function ProjectCard({
  title,
  problemSummary,
  location,
  status,
  imageUrl,
  objective,
  tasks = [],
  kpis = [],
  evidenceCount = 0,
  trust,
  href,
}: ProjectCardProps): ReactNode {
  const wrapperProps = href
    ? {
        role: "link" as const,
        tabIndex: 0,
        onClick: () => {
          if (typeof window !== "undefined") window.location.href = href;
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" && href && typeof window !== "undefined") {
            window.location.href = href;
          }
        },
        className: "cursor-pointer",
      }
    : {};

  return (
    <Card {...wrapperProps}>
      <div className="flex flex-col gap-4 sm:flex-row">
        {imageUrl && (
          <div className="w-full shrink-0 overflow-hidden rounded-lg sm:w-40">
            <img
              src={imageUrl}
              alt=""
              className="h-28 w-full object-cover sm:h-full"
            />
          </div>
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}
            >
              {status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{problemSummary}</p>
          <p className="mt-1 text-xs text-gray-500">📍 {location}</p>
          {objective && (
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-medium">Objective:</span> {objective}
            </p>
          )}

          {tasks.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tasks ({tasks.length})
              </p>
              <ul className="mt-1 space-y-0.5 text-sm text-gray-600">
                {tasks.slice(0, 3).map((t, i) => (
                  <li key={i}>
                    • <span className="font-medium">{t.title}</span>
                    {t.ownerRole ? ` — ${t.ownerRole}` : ""}
                  </li>
                ))}
                {tasks.length > 3 && (
                  <li className="text-xs text-gray-400">
                    +{tasks.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {kpis.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                KPIs ({kpis.length})
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {kpis.slice(0, 4).map((k, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700"
                  >
                    {k.name}{" "}
                    <span className="text-gray-400">({k.unit})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {evidenceCount > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              {evidenceCount} evidence item{evidenceCount === 1 ? "" : "s"} on
              file
            </p>
          )}

          {trust && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <ProjectTrustSignals {...trust} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
