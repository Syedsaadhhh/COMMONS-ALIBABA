import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseBrowserEnv } from "@/lib/env";
import type {
  KpiRecord,
  ProjectBundle,
  ProjectRecord,
  TaskRecord,
} from "@/lib/projects/types";

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
> & {
  tasks: TaskRecord[];
  kpis: KpiRecord[];
};

export async function getShowcaseProjectBundles(): Promise<ProjectBundle[]> {
  const { url, anonKey } = getSupabaseBrowserEnv();
  const supabase = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data: projectData, error: projectError } = await supabase.rpc(
    "get_project_showcase",
  );

  if (projectError) {
    throw new Error(
      `Showcase projects could not be loaded: ${projectError.message}`,
    );
  }

  const projects = (projectData ?? []) as ShowcaseProjectRow[];

  return projects.map(({ tasks, kpis, ...project }) => ({
    project: {
      ...project,
      description: null,
      image_url: null,
      latitude: null,
      longitude: null,
      created_by: "",
    },
    tasks,
    kpis,
    measurements: [],
    evidence: [],
    taskEvidenceClaims: [],
    corroboration: [],
    verificationReviews: [],
    statusHistory: [],
    projectImages: [],
  }));
}
