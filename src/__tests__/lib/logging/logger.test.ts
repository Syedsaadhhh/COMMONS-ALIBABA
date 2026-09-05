import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "@/lib/logging/logger";

describe("logger", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("emits structured JSON logs with level and message", () => {
    const logger = createLogger({ service: "test" });
    logger.info("hello world");

    expect(errorSpy).toHaveBeenCalledOnce();
    const payload = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(payload.level).toBe("info");
    expect(payload.message).toBe("hello world");
    expect(payload.service).toBe("test");
    expect(payload.timestamp).toBeDefined();
  });

  it("includes the request id when provided", () => {
    const logger = createLogger({ requestId: "req-123" });
    logger.info("tracked");

    const payload = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(payload.requestId).toBe("req-123");
  });

  it("redacts email addresses and tokens from messages", () => {
    const logger = createLogger();
    logger.info("Contact admin@example.com or use sk-12345678901234567890");

    const payload = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(payload.message).not.toContain("admin@example.com");
    expect(payload.message).not.toContain("sk-12345678901234567890");
    expect(payload.message).toContain("[REDACTED_EMAIL]");
    expect(payload.message).toContain("[REDACTED_TOKEN]");
  });

  it("redacts sensitive fields by key name", () => {
    const logger = createLogger();
    logger.info("received payload", {
      user: "alice",
      apiKey: "super-secret",
      password: "hunter2",
      nested: { authorization: "Bearer token" },
    });

    const payload = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(payload.apiKey).toBe("[REDACTED]");
    expect(payload.password).toBe("[REDACTED]");
    expect(payload.nested.authorization).toBe("[REDACTED]");
    expect(payload.user).toBe("alice");
  });

  it("respects the LOG_LEVEL environment variable", () => {
    vi.stubEnv("LOG_LEVEL", "warn");
    const logger = createLogger();

    logger.info("ignored");
    logger.warn("shown");

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
    const payload = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(payload.level).toBe("warn");
    expect(payload.message).toBe("shown");
  });
});
