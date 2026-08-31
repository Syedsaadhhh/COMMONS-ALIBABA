import { z } from "zod";

export const aiPlanTaskSchema = z.object({
  title: z.string().min(1),
  ownerRole: z.string().min(1),
  status: z.enum(["not_started", "in_progress", "completed"]),
});

export const aiPlanKpiSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  baseline: z.literal(null),
  current: z.literal(null),
  target: z.literal(null),
  measurementMethod: z.string().min(1),
});

export const aiPlanSchema = z
  .object({
    problemSummary: z.string().min(1),
    affectedGroups: z.array(z.string().min(1)).min(1),
    objective: z.string().min(1),
    tasks: z.array(aiPlanTaskSchema).min(1),
    kpis: z.array(aiPlanKpiSchema).min(1),
    evidenceRequirements: z.array(z.string().min(1)).min(1),
  })
  .strict();

export type AIPlanTask = z.infer<typeof aiPlanTaskSchema>;
export type AIPlanKpi = z.infer<typeof aiPlanKpiSchema>;
export type AIPlan = z.infer<typeof aiPlanSchema>;
