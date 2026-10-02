import "server-only";

import { createServiceClient } from "@/lib/db/server";
import type {
  KpiRecord,
  ProjectBundle,
  ProjectRecord,
  TaskRecord,
} from "@/lib/projects/types";

// Keep the regional-round showcase aligned with the submitted hackathon data.
// Projects created after the submission snapshot remain private to their owners.
const SUBMISSION_SNAPSHOT_END = "2026-09-07T00:00:00.000Z";

type ShowcaseProjectRow = Pick<
  ProjectRecord,
  | "id"
  | "title"
  | "problem_summary"
  | "location"
  | "objective"
  | "status"
  | "corroboration_count"
  | "community_verified"
  | "created_at"
  | "updated_at"
>;

export async function getShowcaseProjectBundles(): Promise<ProjectBundle[]> {
  const supabase = createServiceClient();
  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select(
      "id,title,problem_summary,location,objective,status,corroboration_count,community_verified,created_at,updated_at",
    )
    .in("status", ["active", "completed"])
    .lte("created_at", SUBMISSION_SNAPSHOT_END)
    .order("updated_at", { ascending: false })
    .limit(12);

  if (projectError) {
    throw new Error(`Showcase projects could not be loaded: ${projectError.message}`);
  }

  const projects = (projectData ?? []) as ShowcaseProjectRow[];
  if (projects.length === 0) return [];

  const projectIds = projects.map((project) => project.id);
  const [taskResult, kpiResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,project_id,title,owner_role,status,created_at")
      .in("project_id", projectIds)
      .order("created_at"),
    supabase
      .from("kpis")
      .select("id,project_id,name,unit,baseline,target,measurement_method")
      .in("project_id", projectIds),
  ]);

  if (taskResult.error) {
    throw new Error(`Showcase tasks could not be loaded: ${taskResult.error.message}`);
  }
  if (kpiResult.error) {
    throw new Error(`Showcase KPIs could not be loaded: ${kpiResult.error.message}`);
  }

  const tasks = (taskResult.data ?? []) as TaskRecord[];
  const kpis = (kpiResult.data ?? []) as KpiRecord[];

  return projects.map((project) => ({
    project: {
      ...project,
      description: null,
      image_url: null,
      latitude: null,
      longitude: null,
      created_by: "",
    },
    tasks: tasks.filter((task) => task.project_id === project.id),
    kpis: kpis.filter((kpi) => kpi.project_id === project.id),
    measurements: [],
    evidence: [],
    taskEvidenceClaims: [],
    corroboration: [],
    verificationReviews: [],
    statusHistory: [],
    projectImages: [],
  }));
}
