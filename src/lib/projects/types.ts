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

export interface EvidenceRecord {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_hash: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "CLARIFICATION_REQUIRED";
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface ProjectBundle {
  project: ProjectRecord;
  tasks: TaskRecord[];
  kpis: KpiRecord[];
  measurements: MeasurementRecord[];
  evidence: EvidenceRecord[];
}
