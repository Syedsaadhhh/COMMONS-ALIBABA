"use client";

import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface ReviewerChecklistItem {
  id: string;
  label: string;
  description: string;
}

export interface ReviewerChecklistProps {
  /** Reviewer identity — required. Enforces "reviewer ≠ submitter" visually. */
  reviewerUserId: string | null | undefined;
  /** Submitter identity — required. Displayed so the reviewer can confirm separation. */
  submitterUserId: string | null | undefined;
  /** Optional project identifier for labelling the audit trail. */
  projectId?: string;
  /** Customise the checklist items. Defaults to the evidence + KPI verifications. */
  items?: ReviewerChecklistItem[];
  /**
   * Called with the signed review decision. The parent component is
   * responsible for persisting it (server action / API route). This
   * component deliberately does not import fetch/supabase so it stays
   * reusable on any project detail page.
   */
  onSubmit?: (decision: ReviewerChecklistDecision) => void | Promise<void>;
  /** Disable the entire checklist (e.g. when the project is already completed). */
  disabled?: boolean;
}

export interface ReviewerChecklistDecision {
  reviewerUserId: string;
  submitterUserId: string;
  projectId?: string;
  items: Record<string, boolean>;
  allApproved: boolean;
  notes: string;
}

const DEFAULT_ITEMS: ReviewerChecklistItem[] = [
  {
    id: "evidence_matches_location",
    label: "Evidence image matches location",
    description:
      "I have visually confirmed the evidence image shows the reported location.",
  },
  {
    id: "evidence_matches_problem_type",
    label: "Evidence image matches problem type",
    description:
      "The evidence image clearly depicts the reported civic problem (e.g. flooding, broken streetlight).",
  },
  {
    id: "kpi_source_independent",
    label: "KPI source is independent / credible",
    description:
      "Each KPI reading cites a source that is not the submitter themselves (e.g. municipal record, sensor feed, third-party report).",
  },
  {
    id: "kpi_source_verifiable",
    label: "KPI source URL or reference is reachable",
    description:
      "The cited source exists and can be independently inspected by a future auditor.",
  },
];

interface ToggleRowProps {
  item: ReviewerChecklistItem;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}

function ToggleRow({ item, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
        checked
          ? "border-emerald-300 bg-emerald-50"
          : "border-gray-200 bg-white hover:bg-gray-50"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{item.label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          checked
            ? "bg-emerald-100 text-emerald-800"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {checked ? "Verified" : "Pending"}
      </span>
    </label>
  );
}

/**
 * COMMONS — Reviewer Checklist (Weaknesses 3 & 4).
 *
 * A modular, non-destructive UI component. It does NOT modify the existing
 * ProblemForm or project creation flow. Drop it into a project detail
 * page (e.g. `src/app/projects/[id]/page.tsx`) inside the reviewer panel.
 *
 * Behaviour:
 *  - Blocks submission when reviewer === submitter.
 *  - Requires every toggle to be flipped before "Approve & Complete" is
 *    enabled. This ensures evidence + KPI sources are explicitly vetted
 *    before the project status transitions to "Completed".
 */
export function ReviewerChecklist({
  reviewerUserId,
  submitterUserId,
  projectId,
  items = DEFAULT_ITEMS,
  onSubmit,
  disabled = false,
}: ReviewerChecklistProps): ReactNode {
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.id, false])),
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReviewerMissing = !reviewerUserId;
  const isSubmitterMissing = !submitterUserId;
  const isSameActor =
    !!reviewerUserId && !!submitterUserId && reviewerUserId === submitterUserId;
  const isBlocked = isReviewerMissing || isSubmitterMissing || isSameActor;
  const allApproved = items.every((i) => state[i.id]);
  const canSubmit = !disabled && !isBlocked && allApproved && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !onSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        reviewerUserId: reviewerUserId!,
        submitterUserId: submitterUserId!,
        projectId,
        items: { ...state },
        allApproved: true,
        notes,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-indigo-200">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Reviewer Checklist
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Independent verification of evidence and KPI sources. Required
            before the project can be marked as &ldquo;Completed&rdquo;.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            allApproved && !isBlocked
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {allApproved && !isBlocked ? "Ready to approve" : "Awaiting review"}
        </span>
      </div>

      <div className="mb-4 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
        <div className="rounded-md bg-gray-50 px-3 py-2">
          <span className="font-medium text-gray-700">Submitter:</span>{" "}
          <span className="font-mono">
            {submitterUserId || "— unknown —"}
          </span>
        </div>
        <div className="rounded-md bg-gray-50 px-3 py-2">
          <span className="font-medium text-gray-700">Reviewer:</span>{" "}
          <span className="font-mono">
            {reviewerUserId || "— not signed in —"}
          </span>
        </div>
      </div>

      {isSameActor && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          You cannot review a project you submitted. Sign in with a
          different account to complete the reviewer checklist.
        </div>
      )}
      {isReviewerMissing && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Sign in to perform the review.
        </div>
      )}
      {isSubmitterMissing && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Project submitter identity is missing; cannot enforce reviewer
          separation.
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <ToggleRow
            key={item.id}
            item={item}
            checked={!!state[item.id]}
            disabled={disabled || isBlocked}
            onChange={(next) =>
              setState((prev) => ({ ...prev, [item.id]: next }))
            }
          />
        ))}
      </div>

      <div className="mt-4">
        <label
          htmlFor="reviewer-notes"
          className="block text-sm font-medium text-gray-700"
        >
          Reviewer notes (optional)
        </label>
        <textarea
          id="reviewer-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={disabled || isBlocked}
          rows={3}
          placeholder="Describe anything the next auditor should know — e.g. why a source was accepted, or which photo detail confirmed the location."
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50"
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">
          {items.filter((i) => state[i.id]).length} of {items.length} checks
          confirmed
        </p>
        <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? "Submitting review..." : "Approve & Complete Project"}
        </Button>
      </div>
    </Card>
  );
}
