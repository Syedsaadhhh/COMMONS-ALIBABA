import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generatePlan, buildUserMessage } from "@/lib/ai/service";
import { AIError } from "@/lib/ai/errors";
import type { ImagePayload } from "@/lib/validation/problem";

const validPlanResponse = {
  problemSummary: "Flooding blocks access beside a school.",
  affectedGroups: ["students", "residents"],
  objective: "Create and measure a local response plan.",
  tasks: [
    {
      title: "Document the affected locations",
      ownerRole: "community contributor",
      status: "not_started",
    },
  ],
  kpis: [
    {
      name: "Flooding incidents affecting access",
      unit: "incidents per month",
      baseline: null,
      current: null,
      target: null,
      measurementMethod: "time stamped incident log",
    },
  ],
  evidenceRequirements: ["Location photographs"],
};

const submission = {
  title: "Street flooding beside school",
  description:
    "The street beside our school floods after heavy rain and blocks students and residents.",
  location: "Street beside City School, Sector 4",
};

const fakeImage: ImagePayload = {
  dataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
  mimeType: "image/jpeg",
  byteSize: 1024,
  sha256: "a".repeat(64),
};

describe("generatePlan", () => {
  beforeEach(() => {
    vi.stubEnv("DASHSCOPE_API_KEY", "test-key");
    vi.stubEnv("DASHSCOPE_BASE_URL", "");
    vi.stubEnv("DASHSCOPE_MODEL", "");
    vi.stubEnv("DASHSCOPE_VISION_MODEL", "");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function mockFetchResponse(response: unknown, status = 200, headers?: HeadersInit) {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers(headers),
      json: async () => response,
      text: async () => JSON.stringify(response),
    });
  }

  it("returns a valid plan on the first attempt", async () => {
    mockFetchResponse({
      choices: [{ message: { content: JSON.stringify(validPlanResponse) } }],
    });

    const result = await generatePlan(submission);
    expect(result.plan.problemSummary).toBe(validPlanResponse.problemSummary);
    expect(result.plan.kpis[0].baseline).toBeNull();
    expect(result.visionUsed).toBe(false);

    const requestOptions = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as {
      body: string;
    };
    expect(JSON.parse(requestOptions.body)).toMatchObject({
      enable_thinking: false,
      max_tokens: 1600,
    });
  });

  it("normalizes a trailing slash in the provider base URL", async () => {
    vi.stubEnv(
      "DASHSCOPE_BASE_URL",
      "https://workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/",
    );
    vi.stubEnv("DASHSCOPE_MODEL", "qwen3.7-plus");
    mockFetchResponse({
      choices: [{ message: { content: JSON.stringify(validPlanResponse) } }],
    });

    await generatePlan(submission);

    expect(fetch).toHaveBeenCalledWith(
      "https://workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions",
      expect.any(Object),
    );
  });

  it("retries on 500 and succeeds on the second attempt", async () => {
    mockFetchResponse({ error: "server error" }, 500);
    mockFetchResponse({
      choices: [{ message: { content: JSON.stringify(validPlanResponse) } }],
    });

    const result = await generatePlan(submission);
    expect(result.plan.problemSummary).toBe(validPlanResponse.problemSummary);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries on timeout and succeeds on the second attempt", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new DOMException("Timeout", "AbortError"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(validPlanResponse) } }],
        }),
        text: async () => "",
      });

    const result = await generatePlan(submission);
    expect(result.plan.problemSummary).toBe(validPlanResponse.problemSummary);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws ai_unavailable after exhausting 500 retries", async () => {
    mockFetchResponse({ error: "server error" }, 500);
    mockFetchResponse({ error: "server error" }, 500);

    const error = await generatePlan(submission).catch((e) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.code).toBe("ai_unavailable");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws ai_unavailable after exhausting timeouts", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new DOMException("Timeout", "AbortError"),
    );

    const error = await generatePlan(submission).catch((e) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.code).toBe("ai_unavailable");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("respects Retry-After header", async () => {
    mockFetchResponse({ error: "rate limited" }, 429, { "retry-after": "1" });
    mockFetchResponse({
      choices: [{ message: { content: JSON.stringify(validPlanResponse) } }],
    });

    const start = Date.now();
    await generatePlan(submission);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(900);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry 400 errors", async () => {
    mockFetchResponse({ error: "bad request" }, 400);

    const error = await generatePlan(submission).catch((e) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.code).toBe("ai_rejected_request");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry 401 errors", async () => {
    mockFetchResponse({ error: "unauthorized" }, 401);

    const error = await generatePlan(submission).catch((e) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.code).toBe("ai_rejected_request");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry 403 errors", async () => {
    mockFetchResponse({ error: "forbidden" }, 403);

    const error = await generatePlan(submission).catch((e) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.code).toBe("ai_rejected_request");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("includes safe provider error details for rejected requests", async () => {
    mockFetchResponse(
      {
        error: {
          code: "model_not_found",
          message: "The requested model is not available in this workspace.",
        },
      },
      404,
    );

    const error = await generatePlan(submission).catch((e) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.message).toContain("model_not_found");
    expect(error.message).toContain("not available in this workspace");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("includes a safe non-JSON provider error detail", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: async () => {
        throw new Error("Not JSON");
      },
      text: async () => "Not Found",
    });

    const error = await generatePlan(submission).catch((e) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.message).toContain("Provider: Not Found");
  });

  it("throws ai_invalid_response on malformed JSON", async () => {
    mockFetchResponse({
      choices: [{ message: { content: "not-json" } }],
    });

    const error = await generatePlan(submission).catch((e) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.code).toBe("ai_invalid_response");
  });

  it("throws ai_invalid_response on schema-invalid JSON", async () => {
    mockFetchResponse({
      choices: [{ message: { content: JSON.stringify({ problemSummary: "Test" }) } }],
    });

    const error = await generatePlan(submission).catch((e) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.code).toBe("ai_invalid_response");
  });

  it("throws ai_invalid_response when AI returns numeric KPI measurements", async () => {
    const invalidResponse = {
      ...validPlanResponse,
      kpis: [{ ...validPlanResponse.kpis[0], baseline: 5 }],
    };
    mockFetchResponse({
      choices: [{ message: { content: JSON.stringify(invalidResponse) } }],
    });

    const error = await generatePlan(submission).catch((e) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.code).toBe("ai_invalid_response");
  });

  it("throws configuration_error when DASHSCOPE_API_KEY is missing", async () => {
    vi.stubEnv("DASHSCOPE_API_KEY", "");

    const error = await generatePlan(submission).catch((e) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.code).toBe("configuration_error");
    expect(fetch).not.toHaveBeenCalled();
  });

  describe("multimodal vision", () => {
    const submissionWithImages = {
      ...submission,
      images: [fakeImage],
    };

    it("uses the vision model when images are present and DASHSCOPE_VISION_MODEL is set", async () => {
      vi.stubEnv("DASHSCOPE_VISION_MODEL", "qwen-vl-plus");
      mockFetchResponse({
        choices: [{ message: { content: JSON.stringify(validPlanResponse) } }],
      });

      const result = await generatePlan(submissionWithImages);
      expect(result.visionUsed).toBe(true);

      const requestOptions = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as {
        body: string;
      };
      const body = JSON.parse(requestOptions.body);
      expect(body.model).toBe("qwen-vl-plus");
    });

    it("falls back to text model when DASHSCOPE_VISION_MODEL is not set", async () => {
      mockFetchResponse({
        choices: [{ message: { content: JSON.stringify(validPlanResponse) } }],
      });

      const result = await generatePlan(submissionWithImages);
      expect(result.visionUsed).toBe(false);

      const requestOptions = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as {
        body: string;
      };
      const body = JSON.parse(requestOptions.body);
      const userMessage = body.messages.find((m: { role: string }) => m.role === "user");
      expect(typeof userMessage.content).toBe("string");
    });

    it("sends multimodal content parts when images are present", async () => {
      vi.stubEnv("DASHSCOPE_VISION_MODEL", "qwen-vl-plus");
      mockFetchResponse({
        choices: [{ message: { content: JSON.stringify(validPlanResponse) } }],
      });

      await generatePlan(submissionWithImages);

      const requestOptions = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as {
        body: string;
      };
      const body = JSON.parse(requestOptions.body);
      const userMessage = body.messages.find((m: { role: string }) => m.role === "user");
      expect(Array.isArray(userMessage.content)).toBe(true);
      expect(userMessage.content[0]).toMatchObject({ type: "text" });
      expect(userMessage.content[1]).toMatchObject({
        type: "image_url",
        image_url: { url: fakeImage.dataUrl },
      });
    });

    it("sends plain text content when no images are present", async () => {
      mockFetchResponse({
        choices: [{ message: { content: JSON.stringify(validPlanResponse) } }],
      });

      await generatePlan(submission);

      const requestOptions = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as {
        body: string;
      };
      const body = JSON.parse(requestOptions.body);
      const userMessage = body.messages.find((m: { role: string }) => m.role === "user");
      expect(typeof userMessage.content).toBe("string");
    });
  });
});

describe("buildUserMessage", () => {
  it("returns a plain string when no images are provided", () => {
    const result = buildUserMessage("Describe the problem", undefined);
    expect(result).toBe("Describe the problem");
  });

  it("returns a plain string when images array is empty", () => {
    const result = buildUserMessage("Describe the problem", []);
    expect(result).toBe("Describe the problem");
  });

  it("returns multimodal parts when images are provided", () => {
    const result = buildUserMessage("Describe the problem", [fakeImage]);
    expect(Array.isArray(result)).toBe(true);
    const parts = result as Array<{ type: string }>;
    expect(parts).toHaveLength(2);
    expect(parts[0]).toEqual({ type: "text", text: "Describe the problem" });
    expect(parts[1]).toEqual({
      type: "image_url",
      image_url: { url: fakeImage.dataUrl },
    });
  });

  it("includes all images in the parts array", () => {
    const images: ImagePayload[] = [
      fakeImage,
      { ...fakeImage, sha256: "b".repeat(64), dataUrl: "data:image/png;base64,iVBOR" },
    ];
    const result = buildUserMessage("Civic report", images);
    expect(Array.isArray(result)).toBe(true);
    const parts = result as Array<{ type: string }>;
    expect(parts).toHaveLength(3);
    expect(parts.filter((p) => p.type === "image_url")).toHaveLength(2);
  });
});
