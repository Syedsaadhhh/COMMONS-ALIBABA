import { describe, it, expect } from "vitest";
import { problemSubmissionSchema } from "@/lib/validation/problem";

describe("problemSubmissionSchema", () => {
  const validSubmission = {
    title: "Street flooding beside school",
    description:
      "The street beside our school floods after heavy rain and blocks students and residents from accessing the building.",
    location: "Street beside City School, Sector 4",
  };

  it("accepts a valid submission without image", () => {
    const result = problemSubmissionSchema.safeParse(validSubmission);
    expect(result.success).toBe(true);
  });

  it("accepts a valid submission with image URL", () => {
    const withImage = {
      ...validSubmission,
      imageUrl: "https://example.com/flooding.jpg",
    };
    const result = problemSubmissionSchema.safeParse(withImage);
    expect(result.success).toBe(true);
  });

  it("accepts empty string for imageUrl", () => {
    const withEmptyImage = { ...validSubmission, imageUrl: "" };
    const result = problemSubmissionSchema.safeParse(withEmptyImage);
    expect(result.success).toBe(true);
  });

  it("rejects title shorter than 5 characters", () => {
    const invalid = { ...validSubmission, title: "Hi" };
    const result = problemSubmissionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects description shorter than 20 characters", () => {
    const invalid = { ...validSubmission, description: "Too short." };
    const result = problemSubmissionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects location shorter than 3 characters", () => {
    const invalid = { ...validSubmission, location: "AB" };
    const result = problemSubmissionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid image URL", () => {
    const invalid = { ...validSubmission, imageUrl: "not-a-url" };
    const result = problemSubmissionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { title: _title, ...withoutTitle } = validSubmission;
    const result = problemSubmissionSchema.safeParse(withoutTitle);
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { description: _description, ...withoutDesc } = validSubmission;
    const result = problemSubmissionSchema.safeParse(withoutDesc);
    expect(result.success).toBe(false);
  });

  it("rejects missing location", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { location: _location, ...withoutLoc } = validSubmission;
    const result = problemSubmissionSchema.safeParse(withoutLoc);
    expect(result.success).toBe(false);
  });
});
