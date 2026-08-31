export type AIErrorCode =
  | "configuration_error"
  | "ai_unavailable"
  | "ai_rejected_request"
  | "ai_invalid_response";

export class AIError extends Error {
  code: AIErrorCode;
  cause?: unknown;

  constructor(code: AIErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.cause = cause;
  }
}
