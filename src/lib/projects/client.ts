"use client";

import { createClient } from "@/lib/db/client";
import type {
  Coordinates,
  EvidencePhase,
  EvidenceRecord,
  KpiRecord,
  MeasurementRecord,
  ProjectBundle,
  ProjectDraftInput,
  ProjectRecord,
  TaskEvidenceClaimRecord,
  TaskRecord,
} from "@/lib/projects/types";
import type { ProblemSubmission } from "@/lib/validation/problem";

async function ensureUser() {
  const supabase = createClient();
  const { data: currentSession, error: currentSessionError } = await supabase.auth.getSession();

  if (currentSessionError) throw currentSessionError;
  if (currentSession.session?.user) return { supabase, user: currentSession.session.user };

  const { data: anonymousUser, error: anonymousError } = await supabase.auth.signInAnonymously();
  if (anonymousError || !anonymousUser.user) {
    const detail = anonymousError?.message || "No anonymous user was returned.";
    throw new Error(`A secure project session could not be created: ${detail}`);
  }

  return { supabase, user: anonymousUser.user };
}

function errorMessage(error: { message?: string } | null, fallback: string): string {
  return error?.message || fallback;
}

export async function createProjectFromDraft(input: ProjectDraftInput): Promise<ProjectRecord> {
  const { supabase, user } = await ensureUser();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      title: input.title,
      problem_summary: input.plan.problemSummary,
      description: input.description,
      location: input.location,
      objective: input.plan.objective,
      status: "active",
      image_url: input.imageUrl || null,
      latitude: input.coordinates?.latitude ?? null,
      longitude: input.coordinates?.longitude ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (projectError || !project) {
    throw new Error(errorMessage(projectError, "The project could not be created."));
  }

  const rollback = async () => {
    await supabase.from("projects").delete().eq("id", project.id);
  };

  const { error: memberError } = await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    await rollback();
    throw new Error(errorMessage(memberError, "The project owner could not be recorded."));
  }

  const { error: taskError } = await supabase.from("tasks").insert(
    input.plan.tasks.map((task) => ({
      project_id: project.id,
      title: task.title,
      owner_role: task.ownerRole,
      status: task.status,
    })),
  );

  if (taskError) {
    await rollback();
    throw new Error(errorMessage(taskError, "The project tasks could not be saved."));
  }

  const { error: kpiError } = await supabase.from("kpis").insert(
    input.plan.kpis.map((kpi) => ({
      project_id: project.id,
      name: kpi.name,
      unit: kpi.unit,
      baseline: kpi.baseline,
      target: kpi.target,
      measurement_method: kpi.measurementMethod,
    })),
  );

  if (kpiError) {
    await rollback();
    throw new Error(errorMessage(kpiError, "The measurement plan could not be saved."));
  }

  const { error: auditError } = await supabase.from("audit_events").insert({
    project_id: project.id,
    actor_id: user.id,
    event_type: "PROJECT_CONFIRMED_FROM_AI_DRAFT",
    payload: {
      taskCount: input.plan.tasks.length,
      kpiCount: input.plan.kpis.length,
      evidenceRequirementCount: input.plan.evidenceRequirements.length,
    },
  });

  if (auditError) {
    await rollback();
    throw new Error(errorMessage(auditError, "The project confirmation could not be recorded."));
  }

  return project as ProjectRecord;
}

export async function getSavedProjects(): Promise<ProjectRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(errorMessage(error, "Projects could not be loaded."));
  return (data ?? []) as ProjectRecord[];
}

export async function getSavedProjectBundles(): Promise<ProjectBundle[]> {
  const projects = await getSavedProjects();
  const bundles = await Promise.all(projects.map((project) => getProjectBundle(project.id)));
  return bundles.filter((bundle): bundle is ProjectBundle => bundle !== null);
}

export async function getProjectBundle(projectId: string): Promise<ProjectBundle | null> {
  const supabase = createClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) throw new Error(errorMessage(projectError, "The project could not be loaded."));
  if (!project) return null;

  const [tasks, kpis, evidence, corroboration, verificationReviews, statusHistory] = await Promise.all([
    supabase.from("tasks").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("kpis").select("*").eq("project_id", projectId),
    supabase.from("evidence").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("project_corroboration").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("project_verification_review").select("*").eq("project_id", projectId).order("reviewed_at"),
    supabase.from("project_status_history").select("*").eq("project_id", projectId).order("created_at"),
  ]);

  if (tasks.error) throw new Error(errorMessage(tasks.error, "Tasks could not be loaded."));
  if (kpis.error) throw new Error(errorMessage(kpis.error, "Measurements could not be loaded."));
  if (evidence.error) throw new Error(errorMessage(evidence.error, "Evidence could not be loaded."));
  if (corroboration.error) throw new Error(errorMessage(corroboration.error, "Corroboration reports could not be loaded."));
  if (verificationReviews.error) throw new Error(errorMessage(verificationReviews.error, "Verification reviews could not be loaded."));
  if (statusHistory.error) throw new Error(errorMessage(statusHistory.error, "Status history could not be loaded."));

  const taskIds = (tasks.data ?? []).map((task) => task.id);
  const kpiIds = (kpis.data ?? []).map((kpi) => kpi.id);

  const [taskEvidenceClaims, measurements] = await Promise.all([
    taskIds.length
      ? supabase.from("task_evidence_claims").select("*").in("task_id", taskIds)
      : { data: [], error: null },
    kpiIds.length
      ? await supabase
          .from("kpi_measurements")
          .select("*")
          .in("kpi_id", kpiIds)
          .order("measured_at", { ascending: false })
      : { data: [], error: null },
  ]);

  if (taskEvidenceClaims.error) {
    throw new Error(errorMessage(taskEvidenceClaims.error, "Task evidence claims could not be loaded."));
  }
  if (measurements.error) {
    throw new Error(errorMessage(measurements.error, "Measurement history could not be loaded."));
  }

  return {
    project: project as ProjectRecord,
    tasks: (tasks.data ?? []) as TaskRecord[],
    kpis: (kpis.data ?? []) as KpiRecord[],
    measurements: (measurements.data ?? []) as MeasurementRecord[],
    evidence: (evidence.data ?? []) as EvidenceRecord[],
    taskEvidenceClaims: (taskEvidenceClaims.data ?? []) as TaskEvidenceClaimRecord[],
    corroboration: (corroboration.data ?? []) as ProjectBundle["corroboration"],
    verificationReviews: (verificationReviews.data ?? []) as ProjectBundle["verificationReviews"],
    statusHistory: (statusHistory.data ?? []) as ProjectBundle["statusHistory"],
  };
}

export async function updateProjectCoordinates(projectId: string, coordinates: Coordinates): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update(coordinates)
    .eq("id", projectId);
  if (error) throw new Error(errorMessage(error, "The location signal could not be saved."));
}

export async function updateTaskStatus(taskId: string, status: TaskRecord["status"]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) throw new Error(errorMessage(error, "The task status could not be updated."));
}

export async function addMeasurement(input: {
  kpiId: string;
  value: number;
  source: string;
}): Promise<void> {
  const { supabase, user } = await ensureUser();
  const { error } = await supabase.from("kpi_measurements").insert({
    kpi_id: input.kpiId,
    value: input.value,
    source: input.source,
    recorded_by: user.id,
  });
  if (error) throw new Error(errorMessage(error, "The measurement could not be recorded."));
}

async function fingerprint(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function addEvidenceCheckIn(input: {
  projectId: string;
  title: string;
  description: string;
  sourceUrl: string;
  phase?: EvidencePhase;
  coordinates?: Coordinates | null;
}): Promise<EvidenceRecord> {
  const { supabase, user } = await ensureUser();
  const fileHash = await fingerprint(input.sourceUrl);
  const { data, error } = await supabase
    .from("evidence")
    .insert({
      project_id: input.projectId,
      title: input.title,
      description: input.description || null,
      file_url: input.sourceUrl,
      file_hash: fileHash,
      phase: input.phase ?? "other",
      contributed_by: user.id,
      latitude: input.coordinates?.latitude ?? null,
      longitude: input.coordinates?.longitude ?? null,
    })
    .select()
    .single();
  if (error || !data) {
    throw new Error(errorMessage(error, "The evidence check-in could not be saved."));
  }
  return data as EvidenceRecord;
}

export async function addTaskEvidenceClaim(input: {
  taskId: string;
  evidenceId: string;
  claimKind: TaskEvidenceClaimRecord["claim_kind"];
}): Promise<void> {
  const { supabase, user } = await ensureUser();
  const { error } = await supabase.from("task_evidence_claims").insert({
    task_id: input.taskId,
    evidence_id: input.evidenceId,
    claimed_by: user.id,
    claim_kind: input.claimKind,
  });
  if (error) throw new Error(errorMessage(error, "The task evidence claim could not be saved."));
}

export async function submitVerificationReview(input: {
  projectId: string;
  submitterUserId: string;
  items: Record<string, boolean>;
  notes: string;
}): Promise<void> {
  const { supabase, user } = await ensureUser();
  const allApproved = Object.values(input.items).every(Boolean);
  const { error } = await supabase.from("project_verification_review").insert({
    project_id: input.projectId,
    reviewer_id: user.id,
    submitter_id: input.submitterUserId,
    evidence_matches_location: !!input.items.evidence_matches_location,
    evidence_matches_problem_type: !!input.items.evidence_matches_problem_type,
    kpi_source_independent: !!input.items.kpi_source_independent,
    kpi_source_verifiable: !!input.items.kpi_source_verifiable,
    all_approved: allApproved,
    notes: input.notes || null,
  });
  if (error) {
    if (error.message?.includes("idx_project_verification_one_approval")) {
      throw new Error("This project has already received an independent review.");
    }
    throw new Error(errorMessage(error, "The verification review could not be saved."));
  }
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectRecord["status"],
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").update({ status }).eq("id", projectId);
  if (error) throw new Error(errorMessage(error, "The project status could not be updated."));
}

export async function findCandidateProjectsForDedup(
  _submission: ProblemSubmission,
): Promise<ProjectRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(errorMessage(error, "Existing projects could not be loaded."));
  return (data ?? []) as ProjectRecord[];
}

export async function addCorroboration(input: {
  projectId: string;
  submission: ProblemSubmission;
  matchedBy: "geo" | "text" | "mixed";
  similarityScore: number;
}): Promise<void> {
  const { supabase, user } = await ensureUser();
  const { error } = await supabase.from("project_corroboration").insert({
    project_id: input.projectId,
    contributed_by: user.id,
    title: input.submission.title,
    description: input.submission.description,
    location: input.submission.location,
    image_url: input.submission.imageUrl || null,
    matched_by: input.matchedBy,
    similarity_score: input.similarityScore,
  });
  if (error) throw new Error(errorMessage(error, "The corroboration could not be saved."));
}
