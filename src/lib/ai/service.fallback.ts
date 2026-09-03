import { generatePlan } from "@/lib/ai/service";
import { AIError } from "@/lib/ai/errors";
import type { AIPlan } from "@/lib/ai/schema";
import type { ProblemSubmission } from "@/lib/validation/problem";

/**
 * COMMONS — AI fallback wrapper (Weakness 6).
 *
 * Wraps the existing Qwen/DashScope call in `generatePlan` with a
 * try/catch so that a demo flow survives vendor outages without
 * swallowing real bugs.
 *
 * Fallback triggers (returns a template plan):
 *   - AIError with code `ai_unavailable` (5xx / timeout / rate-limit).
 *   - AIError with code `configuration_error` (no API key / bad env).
 *   - Native `AbortError` or any network-style Error from `fetch`.
 *
 * Errors that propagate unchanged (route returns 4xx/5xx):
 *   - AIError `ai_rejected_request` (4xx from the upstream vendor).
 *   - AIError `ai_invalid_response` (response failed schema parse).
 *
 * The original `generatePlan` in `src/lib/ai/service.ts` is untouched.
 * API routes opt into the fallback by importing
 * `generatePlanWithFallback` from this module instead of `generatePlan`.
 *
 * The returned object always carries a `source` discriminator so the
 * UI can disclose whether the plan was produced by Qwen or by the
 * fallback generator (transparency matters for civic trust).
 */

export type PlanSource = "qwen" | "fallback_template";

export interface PlanWithSource {
  plan: AIPlan;
  source: PlanSource;
  fallbackReason?: string;
}

function fallbackPlan(submission: ProblemSubmission): AIPlan {
  const title = submission.title.trim();
  const location = submission.location.trim();
  const snippet =
    submission.description.length > 140
      ? `${submission.description.slice(0, 137)}…`
      : submission.description;

  return {
    problemSummary: `${title} — reported in ${location}. ${snippet}`,
    affectedGroups: [
      `Residents in and around ${location}`,
      "Local businesses and daily commuters",
      "Children, elderly, and people with reduced mobility",
    ],
    objective: `Address "${title}" through coordinated civic action with measurable outcomes.`,
    tasks: [
      {
        title: "Validate the reported problem on-site",
        ownerRole: "Field Coordinator",
        status: "not_started",
      },
      {
        title: "Engage the responsible local authority",
        ownerRole: "Community Liaison",
        status: "not_started",
      },
      {
        title: "Mobilise volunteers and schedule the first action",
        ownerRole: "Project Lead",
        status: "not_started",
      },
      {
        title: "Record baseline KPI measurements",
        ownerRole: "Data Steward",
        status: "not_started",
      },
    ],
    kpis: [
      {
        name: "Incidents reported per week",
        unit: "count / week",
        baseline: null,
        current: null,
        target: null,
        measurementMethod:
          "Weekly tally of citizen reports filed against this project.",
      },
      {
        name: "Response time to first action",
        unit: "days",
        baseline: null,
        current: null,
        target: null,
        measurementMethod:
          "Calendar days from project creation to the first logged on-site action.",
      },
      {
        name: "Resident satisfaction",
        unit: "score (1-5)",
        baseline: null,
        current: null,
        target: null,
        measurementMethod:
          "Anonymous post-action survey of affected residents (min. 10 responses).",
      },
    ],
    evidenceRequirements: [
      "Geotagged before/after photograph of the reported location",
      "Signed attendance log from the first on-site action",
      "Reference letter or acknowledgement from the engaged local authority",
    ],
  };
}

/**
 * Call this from API routes instead `generatePlan` directly.
 *
 * On upstream failure the function returns a fallback plan and exposes
 * the reason in `fallbackReason` so the route can surface a banner to
 * the user.
 */
export async function generatePlanWithFallback(
  submission: ProblemSubmission,
): Promise<PlanWithSource> {
  try {
    const plan = await generatePlan(submission);
    return { plan, source: "qwen" };
  } catch (error) {
    const isNetworkOrAbort =
      error instanceof Error &&
      (error.name === "AbortError" ||
        /timeout|fetch|network|ECONNR/i.test(error.message));

    const isOutageAiError =
      error instanceof AIError &&
      (error.code === "ai_unavailable" || error.code === "configuration_error");

    if (!isNetworkOrAbort && !isOutageAiError) {
      // Programmer errors, rejected requests (4xx), and invalid AI
      // responses (schema mismatch) are NOT outage scenarios. Let the
      // caller handle them with the normal error path.
      throw error;
    }

    const reason =
      error instanceof AIError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? `${error.name}: ${error.message}`
          : "Unknown AI failure";

    console.warn(
      `[ai/fallback] Qwen unavailable (${reason}); serving template fallback plan.`,
    );

    return {
      plan: fallbackPlan(submission),
      source: "fallback_template",
      fallbackReason: reason,
    };
  }
}
