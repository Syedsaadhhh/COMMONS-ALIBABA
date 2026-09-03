import type { NextRequest } from "next/server";
import { problemSubmissionSchema } from "@/lib/validation/problem";
import { generatePlanWithFallback } from "@/lib/ai/service.fallback";
import { AIError } from "@/lib/ai/errors";

function correlationId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: NextRequest) {
  const requestId = correlationId();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const submission = problemSubmissionSchema.safeParse(body);

  if (!submission.success) {
    return Response.json(
      {
        error: "Invalid submission",
        details: submission.error.issues,
      },
      { status: 422 },
    );
  }

  try {
    const { plan, source, fallbackReason } = await generatePlanWithFallback(submission.data);
    return Response.json({
      plan,
      status: "draft",
      source,
      ...(fallbackReason ? { fallbackReason } : {}),
    });
  } catch (error) {
    if (error instanceof AIError) {
      console.error(`[api/ai/plan][${requestId}] ${error.code}: ${error.message}`);

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

    console.error(`[api/ai/plan][${requestId}] unexpected error`, error);
    return Response.json(
      { error: "Failed to generate plan.", requestId },
      { status: 500 },
    );
  }
}
