import type { AIPlan } from "@/lib/ai/schema";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ProjectDraftInput {
  title: string;
  description: string;
  location: string;
  imageUrl?: string;
  coordinates?: Coordinates | null;
  plan: AIPlan;
}

export interface ProjectRecord {
  id: string;
  title: string;
  problem_summary: string;
  description: string | null;
  location: string;
  objective: string | null;
  status: "draft" | "active" | "completed" | "archived";
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  created_by: string;
  corroboration_count: number;
  community_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskRecord {
  id: string;
  project_id: string;
  title: string;
  owner_role: string | null;
  status: "not_started" | "in_progress" | "completed";
  created_at: string;
}

export interface KpiRecord {
  id: string;
  project_id: string;
  name: string;
  unit: string;
  baseline: number | null;
  target: number | null;
  measurement_method: string;
}

export interface MeasurementRecord {
  id: string;
  kpi_id: string;
  value: number;
  measured_at: string;
  source: string;
}

export type EvidencePhase = "before" | "after" | "other";

export interface EvidenceRecord {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_hash: string;
  phase: EvidencePhase;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "CLARIFICATION_REQUIRED";
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface TaskEvidenceClaimRecord {
  id: string;
  task_id: string;
  evidence_id: string;
  claimed_by: string;
  claim_kind: "addresses" | "proves" | "relates_to";
  created_at: string;
}

export interface ProjectCorroborationRecord {
  id: string;
  project_id: string;
  contributed_by: string;
  title: string;
  description: string | null;
  location: string;
  image_url: string | null;
  matched_by: "geo" | "text" | "mixed";
  similarity_score: number;
  created_at: string;
}

export interface ProjectVerificationReviewRecord {
  id: string;
  project_id: string;
  reviewer_id: string;
  submitter_id: string;
  evidence_matches_location: boolean;
  evidence_matches_problem_type: boolean;
  kpi_source_independent: boolean;
  kpi_source_verifiable: boolean;
  all_approved: boolean;
  notes: string | null;
  reviewed_at: string;
}

export interface ProjectStatusHistoryRecord {
  id: string;
  project_id: string;
  actor_id: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ProjectBundle {
  project: ProjectRecord;
  tasks: TaskRecord[];
  kpis: KpiRecord[];
  measurements: MeasurementRecord[];
  evidence: EvidenceRecord[];
  taskEvidenceClaims: TaskEvidenceClaimRecord[];
  corroboration: ProjectCorroborationRecord[];
  verificationReviews: ProjectVerificationReviewRecord[];
  statusHistory: ProjectStatusHistoryRecord[];
}
