// This logger is intended for server-side use only. API routes and server
// libraries import it; no browser code should depend on this module.

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const TOKEN_PATTERN = /(sk-[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]*\.{1,2}[a-zA-Z0-9._-]*)/g;

function configuredLevel(): LogLevel {
  const value = process.env.LOG_LEVEL?.toLowerCase();
  if (value && value in LEVEL_RANK) return value as LogLevel;
  return "info";
}

function redactString(value: string): string {
  return value
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(TOKEN_PATTERN, "[REDACTED_TOKEN]");
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("password") ||
        lower.includes("secret") ||
        lower.includes("token") ||
        lower.includes("key") ||
        lower.includes("authorization")
      ) {
        redacted[key] = "[REDACTED]";
      } else {
        redacted[key] = redactValue(nested);
      }
    }
    return redacted;
  }

  return value;
}

function shouldEmit(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[configuredLevel()];
}

function emit(level: LogLevel, message: string, fields: Record<string, unknown>) {
  if (!shouldEmit(level)) return;

  const payload = {
    level,
    message: redactString(message),
    timestamp: new Date().toISOString(),
    ...(redactValue(fields) as Record<string, unknown>),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    // Use stderr for structured logs so stdout stays clean for CLIs / containers.
    console.error(line);
  }
}

export interface LoggerContext {
  requestId?: string;
  service?: string;
}

export function createLogger(context: LoggerContext = {}) {
  const base = context.requestId ? { requestId: context.requestId } : {};
  const service = context.service ? { service: context.service } : {};

  return {
    debug: (message: string, fields: Record<string, unknown> = {}) =>
      emit("debug", message, { ...service, ...base, ...fields }),
    info: (message: string, fields: Record<string, unknown> = {}) =>
      emit("info", message, { ...service, ...base, ...fields }),
    warn: (message: string, fields: Record<string, unknown> = {}) =>
      emit("warn", message, { ...service, ...base, ...fields }),
    error: (message: string, fields: Record<string, unknown> = {}) =>
      emit("error", message, { ...service, ...base, ...fields }),
  };
}

export const logger = createLogger({ service: "commons" });
