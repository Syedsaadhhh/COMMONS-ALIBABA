import { generatePlan, type GeneratePlanResult } from "@/lib/ai/service";
import { AIError } from "@/lib/ai/errors";
import { createLogger } from "@/lib/logging/logger";
import type { AIPlan } from "@/lib/ai/schema";
import type { ProblemSubmission } from "@/lib/validation/problem";

const logger = createLogger({ service: "ai/fallback" });

/**
 * COMMONS — AI fallback wrapper (Weakness 6) with multimodal vision support.
 *
 * Wraps the Qwen/DashScope call in `generatePlan` with a try/catch so that
 * a demo flow survives vendor outages without swallowing real bugs. Vision
 * calls are retried as text-only before falling back to the template plan.
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
 * The returned object always carries a `source` discriminator so the UI
 * can disclose whether the plan was produced by Qwen or by the fallback
 * generator. `visionUsed` reports whether images reached the model, and
 * `visionFallbackReason` discloses any silent downgrade.
 */

export type PlanSource = "qwen" | "fallback_template";

export interface PlanWithSource {
  plan: AIPlan;
  source: PlanSource;
  fallbackReason?: string;
  visionUsed: boolean;
  visionFallbackReason?: string;
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

function isOutageError(error: unknown): boolean {
  const isNetworkOrAbort =
    error instanceof Error &&
    (error.name === "AbortError" ||
      /timeout|fetch|network|ECONNR/i.test(error.message));
  const isOutageAiError =
    error instanceof AIError &&
    (error.code === "ai_unavailable" || error.code === "configuration_error");
  return isNetworkOrAbort || isOutageAiError;
}

function stripImagesForTextRetry(
  submission: ProblemSubmission,
): ProblemSubmission {
  const { images: _images, ...rest } = submission;
  return rest;
}

export async function generatePlanWithFallback(
  submission: ProblemSubmission,
): Promise<PlanWithSource> {
  try {
    const { plan, visionUsed } = await generatePlan(submission);
    return { plan, source: "qwen", visionUsed };
  } catch (error) {
    if (!isOutageError(error)) {
      throw error;
    }

    const reason =
      error instanceof AIError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? `${error.name}: ${error.message}`
          : "Unknown AI failure";

    const hadImages = (submission.images?.length ?? 0) > 0;
    if (hadImages) {
      logger.warn("Qwen vision call failed; retrying as text-only.", { reason });
      try {
        const { plan } = await generatePlan(stripImagesForTextRetry(submission));
        return {
          plan,
          source: "qwen",
          visionUsed: false,
          visionFallbackReason:
            "Images could not be analysed — the brief was structured from text only.",
        };
      } catch (retryError) {
        if (!isOutageError(retryError)) {
          throw retryError;
        }
        const retryReason =
          retryError instanceof AIError
            ? `${retryError.code}: ${retryError.message}`
            : retryError instanceof Error
              ? `${retryError.name}: ${retryError.message}`
              : "Unknown AI failure";
        logger.warn("Qwen text-only retry also unavailable; serving template.", {
          reason: retryReason,
        });
        return {
          plan: fallbackPlan(submission),
          source: "fallback_template",
          fallbackReason: retryReason,
          visionUsed: false,
          visionFallbackReason:
            "Images could not be analysed — the brief was built from text only.",
        };
      }
    }

    logger.warn("Qwen unavailable; serving template fallback plan.", { reason });
    return {
      plan: fallbackPlan(submission),
      source: "fallback_template",
      fallbackReason: reason,
      visionUsed: false,
    };
  }
}
