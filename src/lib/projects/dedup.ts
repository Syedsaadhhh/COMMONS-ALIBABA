/**
 * COMMONS — Non-destructive duplicate / near-duplicate detection.
 *
 * Weakness 2 fix: before a new project is saved, this utility scores
 * similarity between an incoming submission and existing projects using
 * a combination of:
 *   1. Geospatial radius (when lat/lng coordinates are present).
 *   2. Text similarity on title and description (Jaccard over token bigrams).
 *   3. Location-string similarity (fallback when coordinates are absent).
 *
 * If the combined score exceeds a threshold, the submission is returned
 * as a "Corroborating Report" that should be appended to the existing
 * project, never as a brand-new row. This preserves the existing
 * insert-into-projects flow for genuinely new reports.
 *
 * The module is a pure function — it does not touch the database. The
 * caller (server action / API route) is responsible for reading the
 * candidate list and for writing the resulting corroboration row via the
 * `project_corroboration` table defined in migration 003.
 */

import type { ProblemSubmission } from "@/lib/validation/problem";

export interface ProjectCoordinates {
  lat: number;
  lng: number;
}

export interface CandidateProject {
  id: string;
  title: string;
  description?: string | null;
  location: string;
  coordinates?: ProjectCoordinates | null;
  createdAt?: string | Date | null;
}

export interface DedupeInput {
  submission: ProblemSubmission;
  coordinates?: ProjectCoordinates | null;
  candidates: CandidateProject[];
  /** Search radius in metres. Defaults to 250m. */
  radiusMetres?: number;
  /** 0–1. Minimum combined similarity to treat as corroboration. Default 0.55. */
  similarityThreshold?: number;
}

export type MatchKind = "geo" | "text" | "mixed";

export type DedupeDecision =
  | {
      action: "create_new";
      reason: string;
    }
  | {
      action: "append_corroboration";
      matchedProjectId: string;
      score: number;
      reason: string;
      matchedBy: MatchKind;
    };

const EARTH_RADIUS_METRES = 6_371_000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance in metres between two lat/lng pairs. Returns
 * `Infinity` if either coordinate is invalid so the caller can safely
 * fall through to the text branch.
 */
export function haversineMetres(a: ProjectCoordinates, b: ProjectCoordinates): number {
  if (
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(b.lat) ||
    !Number.isFinite(b.lng)
  ) {
    return Infinity;
  }
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(h)));
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "for",
  "is", "are", "was", "were", "be", "been", "being", "with", "by", "from",
  "it", "its", "this", "that", "as", "but", "not", "no", "so", "if",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function bigrams(tokens: string[]): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) {
    set.add(`${tokens[i]}_${tokens[i + 1]}`);
  }
  // Include unigrams for short texts so the Jaccard score is non-zero.
  for (const t of tokens) set.add(t);
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const v of a) if (b.has(v)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function titleSimilarity(a: string, b: string): number {
  return jaccard(bigrams(tokenize(a)), bigrams(tokenize(b)));
}

function descriptionSimilarity(a: string, b: string): number {
  return jaccard(bigrams(tokenize(a)), bigrams(tokenize(b)));
}

function locationSimilarity(a: string, b: string): number {
  const A = a.trim().toLowerCase();
  const B = b.trim().toLowerCase();
  if (!A || !B) return 0;
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.75;
  return jaccard(new Set(tokenize(A)), new Set(tokenize(B)));
}

/**
 * Decide whether the incoming submission should create a new project or
 * be appended to an existing one as a corroborating report.
 */
export function decideDuplicateOrCorroboration(input: DedupeInput): DedupeDecision {
  const {
    submission,
    coordinates,
    candidates,
    radiusMetres = 250,
    similarityThreshold = 0.55,
  } = input;

  if (candidates.length === 0) {
    return { action: "create_new", reason: "No existing candidates to compare against." };
  }

  let best: {
    candidate: CandidateProject;
    score: number;
    reason: string;
    matchedBy: MatchKind;
  } | null = null;

  for (const candidate of candidates) {
    const reasons: string[] = [];
    let matchedBy: MatchKind = "text";

    // Spatial component (when coordinates are available on both sides).
    let spatial = 0;
    if (coordinates && candidate.coordinates) {
      const distance = haversineMetres(coordinates, candidate.coordinates);
      if (distance <= radiusMetres) {
        spatial = 1 - distance / radiusMetres;
        reasons.push(`within ${Math.round(distance)}m`);
        matchedBy = "geo";
      } else if (distance === Infinity) {
        spatial = 0;
      } else {
        spatial = Math.max(0, 0.2 - (distance - radiusMetres) / (radiusMetres * 10));
      }
    }

    // Text components.
    const titleScore = titleSimilarity(submission.title, candidate.title);
    const descScore = descriptionSimilarity(
      submission.description,
      candidate.description || "",
    );
    const locScore = locationSimilarity(submission.location, candidate.location);

    let hasTextSignal = false;
    if (titleScore > 0.4) {
      reasons.push(`title≈${titleScore.toFixed(2)}`);
      hasTextSignal = true;
    }
    if (descScore > 0.3) {
      reasons.push(`desc≈${descScore.toFixed(2)}`);
      hasTextSignal = true;
    }
    if (locScore > 0.5) {
      reasons.push(`loc≈${locScore.toFixed(2)}`);
      hasTextSignal = true;
    }

    if (matchedBy === "geo" && hasTextSignal) {
      matchedBy = "mixed";
    }

    // Weighted combination. Spatial proximity is the strongest signal when
    // available; text similarity carries the decision otherwise.
    const combined =
      spatial * 0.45 +
      titleScore * 0.25 +
      descScore * 0.15 +
      locScore * 0.15;

    if (combined >= similarityThreshold && (!best || combined > best.score)) {
      best = {
        candidate,
        score: combined,
        reason: reasons.length ? reasons.join(", ") : "overall similarity",
        matchedBy,
      };
    }
  }

  if (best) {
    return {
      action: "append_corroboration",
      matchedProjectId: best.candidate.id,
      score: best.score,
      reason: `Matched existing project "${best.candidate.title}" (${best.reason}).`,
      matchedBy: best.matchedBy,
    };
  }

  return {
    action: "create_new",
    reason: "No candidate exceeded the corroboration similarity threshold.",
  };
}

/**
 * Helper: format a corroboration row payload that the caller can insert
 * into the `project_corroboration` table.
 */
export function buildCorroborationRow(params: {
  projectId: string;
  submission: ProblemSubmission;
  contributorUserId: string;
  matchedBy: "geo" | "text" | "mixed";
  similarityScore: number;
}): Record<string, unknown> {
  return {
    project_id: params.projectId,
    contributed_by: params.contributorUserId,
    title: params.submission.title,
    description: params.submission.description,
    location: params.submission.location,
    image_url: params.submission.imageUrl || null,
    matched_by: params.matchedBy,
    similarity_score: params.similarityScore,
  };
}
