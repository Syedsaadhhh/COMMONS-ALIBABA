import type { NextRequest } from "next/server";
import { problemSubmissionSchema } from "@/lib/validation/problem";
import { generatePlanWithFallback } from "@/lib/ai/service.fallback";
import { AIError } from "@/lib/ai/errors";
import { createLogger } from "@/lib/logging/logger";
import {
  checkRateLimit,
  getClientIdentifier,
} from "@/lib/rate-limit/ip-rate-limit";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function correlationId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: NextRequest) {
  const requestId = correlationId();
  const log = createLogger({ service: "api/ai/plan", requestId });

  const identifier = getClientIdentifier(request);
  const rateLimit = checkRateLimit(identifier, {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
  });

  if (!rateLimit.allowed) {
    log.warn("Rate limit exceeded", {
      identifier,
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
    });
    return Response.json(
      { error: "Too many requests. Please try again later.", requestId },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    log.warn("Invalid JSON body received");
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const submission = problemSubmissionSchema.safeParse(body);

  if (!submission.success) {
    log.info("Submission validation failed", {
      issues: submission.error.issues,
    });
    return Response.json(
      {
        error: "Invalid submission",
        details: submission.error.issues,
      },
      { status: 422 },
    );
  }

  log.info("Generating plan", { sourceIp: identifier });

  try {
    const { plan, source, fallbackReason } = await generatePlanWithFallback(submission.data);
    if (fallbackReason) {
      log.warn("Served fallback plan", { source, fallbackReason });
    } else {
      log.info("Plan generated", { source });
    }
    return Response.json({
      plan,
      status: "draft",
      source,
      ...(fallbackReason ? { fallbackReason } : {}),
    });
  } catch (error) {
    if (error instanceof AIError) {
      log.error("AI service error", { code: error.code });

      switch (error.code) {
        case "configuration_error":
          return Response.json(
            { error: "AI service is not configured.", requestId },
            { status: 500 },
          );
        case "ai_unavailable":
          return Response.json(
            { error: "AI service is temporarily unavailable.", requestId },
            { status: 503 },
          );
        case "ai_rejected_request":
          return Response.json(
            { error: "AI service rejected the request.", requestId },
            { status: 502 },
          );
        case "ai_invalid_response":
          return Response.json(
            { error: "AI returned an invalid response.", requestId },
            { status: 502 },
          );
      }
    }

    log.error("Unexpected error generating plan", { error: String(error) });
    return Response.json(
      { error: "Failed to generate plan.", requestId },
      { status: 500 },
    );
  }
}
