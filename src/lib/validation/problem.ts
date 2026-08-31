import { z } from "zod";

export const problemSubmissionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  location: z.string().min(3, "Location must be at least 3 characters").max(500),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export type ProblemSubmission = z.infer<typeof problemSubmissionSchema>;
