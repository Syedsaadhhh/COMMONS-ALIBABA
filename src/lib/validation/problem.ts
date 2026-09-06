import { z } from "zod";

const DATA_URL_PATTERN =
  /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const imagePayloadSchema = z
  .object({
    dataUrl: z
      .string()
      .regex(DATA_URL_PATTERN, "Image payload must be a valid base64 data URL."),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    byteSize: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/, "SHA-256 must be 64 hex characters."),
  })
  .strict();

export const imagesArraySchema = z
  .array(imagePayloadSchema)
  .min(1)
  .max(3)
  .optional();

export type ImagePayload = z.infer<typeof imagePayloadSchema>;

export const problemSubmissionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  location: z.string().min(3, "Location must be at least 3 characters").max(500),
  imageUrl: z.string().url().optional().or(z.literal("")),
  images: imagesArraySchema,
});

export type ProblemSubmission = z.infer<typeof problemSubmissionSchema>;
