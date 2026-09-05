"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { problemSubmissionSchema } from "@/lib/validation/problem";
import type { ProblemSubmission } from "@/lib/validation/problem";
import type { AIPlan } from "@/lib/ai/schema";
import {
  addCorroboration,
  createProjectFromDraft,
  findCandidateProjectsForDedup,
} from "@/lib/projects/client";
import {
  decideDuplicateOrCorroboration,
  type DedupeDecision,
} from "@/lib/projects/dedup";
import type { Coordinates, ProjectRecord } from "@/lib/projects/types";

type FormErrors = Record<string, string>;

const stages = ["Describe", "Review", "Create"];

export function ProblemForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AIPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [dedupDecision, setDedupDecision] = useState<DedupeDecision | null>(
    null,
  );
  const [matchedProject, setMatchedProject] = useState<ProjectRecord | null>(
    null,
  );
  const [corroborating, setCorroborating] = useState(false);

  async function captureLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location capture is not supported by this browser.");
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12_000,
          maximumAge: 300_000,
        });
      });
      setCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setLocationError("Location was not shared. You can continue without a map pin.");
    } finally {
      setLocationLoading(false);
    }
  }

  function validate(): boolean {
    const result = problemSubmissionSchema.safeParse({
      title,
      description,
      location,
      imageUrl,
    });

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0]?.toString();
        if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  }

  async function generatePlan() {
    setLoading(true);
    setPlanError(null);
    setPlan(null);

    try {
      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, location, imageUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Failed to generate plan");
      }

      setPlan(data.plan);
    } catch (error) {
      setPlanError(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setDedupDecision(null);
    setMatchedProject(null);
    setLoading(true);
    setPlanError(null);
    setPlan(null);

    try {
      const submission: ProblemSubmission = {
        title,
        description,
        location,
        imageUrl,
      };
      const candidates = await findCandidateProjectsForDedup(submission);
      const decision = decideDuplicateOrCorroboration({
        submission,
        coordinates: coordinates
          ? { lat: coordinates.latitude, lng: coordinates.longitude }
          : null,
        candidates: candidates.map((candidate) => ({
          id: candidate.id,
          title: candidate.title,
          description: candidate.description,
          location: candidate.location,
          coordinates:
            candidate.latitude !== null && candidate.longitude !== null
              ? { lat: candidate.latitude, lng: candidate.longitude }
              : null,
          createdAt: candidate.created_at,
        })),
      });

      if (decision.action === "create_new") {
        await generatePlan();
        return;
      }

      setDedupDecision(decision);
      setMatchedProject(
        candidates.find((candidate) => candidate.id === decision.matchedProjectId) ??
          null,
      );
    } catch (error) {
      setPlanError(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCorroborate() {
    if (!dedupDecision || dedupDecision.action !== "append_corroboration")
      return;

    setCorroborating(true);
    setCreateError(null);
    try {
      await addCorroboration({
        projectId: dedupDecision.matchedProjectId,
        submission: { title, description, location, imageUrl },
        matchedBy: dedupDecision.matchedBy,
        similarityScore: dedupDecision.score,
      });
      router.push(`/projects/${dedupDecision.matchedProjectId}`);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "The corroboration could not be added.",
      );
    } finally {
      setCorroborating(false);
    }
  }

  async function handleCreateProject() {
    if (!plan) return;

    setCreating(true);
    setCreateError(null);
    try {
      const project = await createProjectFromDraft({
        title,
        description,
        location,
        imageUrl,
        coordinates,
        plan,
      });
      router.push(`/projects/${project.id}`);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "The project could not be created.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="problem-flow">
      <ol className="flow-stages" aria-label="Civic brief stages">
        {stages.map((stage, index) => {
          const isCurrent = plan ? index === 1 : index === 0;
          const isComplete = plan && index === 0;

          return (
            <li
              key={stage}
              className={isCurrent ? "is-current" : isComplete ? "is-complete" : ""}
            >
              <span>{index + 1}</span>
              <p>{stage}</p>
            </li>
          );
        })}
      </ol>

      <form onSubmit={handleSubmit} className="problem-form" noValidate>
        <div className="problem-form__heading">
          <div>
            <p className="form-kicker">Civic brief · Step one</p>
            <h2>Describe the problem as it exists today.</h2>
          </div>
          <span className="draft-state">Private draft</span>
        </div>

        <div className="problem-form__fields">
          <div>
            <Input
              label="Brief title"
              placeholder="Street flooding beside the school"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              error={errors.title}
              maxLength={200}
              autoComplete="off"
            />
            <div className="field-hint">
              <span>Use a clear, specific description.</span>
              <span>{title.length}/200</span>
            </div>
          </div>

          <div>
            <Textarea
              label="What is happening?"
              placeholder="Explain what happens, who is affected, how often it occurs, and what the community has already observed."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              error={errors.description}
              maxLength={5000}
            />
            <div className="field-hint">
              <span>Facts and direct observations make the brief stronger.</span>
              <span>{description.length}/5000</span>
            </div>
          </div>

          <div className="problem-form__split">
            <Input
              label="Location"
              placeholder="Area, street, landmark or district"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              error={errors.location}
              maxLength={500}
              autoComplete="street-address"
            />

            <Input
              label="Supporting image link (optional)"
              placeholder="https://..."
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              error={errors.imageUrl}
              inputMode="url"
              autoComplete="url"
            />
          </div>

          <div className="location-consent">
            <div>
              <strong>Optional project map</strong>
              <p>
                Share your device location only if you want a map pin on the
                confirmed project. It is never inferred from the text above.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={captureLocation} disabled={locationLoading}>
              {locationLoading ? "Capturing…" : coordinates ? "Location captured" : "Use my location"}
            </Button>
          </div>
          {coordinates && (
            <p className="location-signal" role="status">
              Location captured with your permission. The project map will use this pin.
            </p>
          )}
          {locationError && <p className="field-error">{locationError}</p>}
        </div>

        <div className="problem-form__submit">
          <div>
            <strong>What Qwen will do</strong>
            <p>Structure this report into a reviewable project brief. It will not verify the claim.</p>
          </div>
          <Button type="submit" size="lg" disabled={loading}>
            {loading && <span className="button-spinner" aria-hidden="true" />}
            {loading ? "Structuring brief..." : "Generate civic brief"}
          </Button>
        </div>
      </form>

      <div aria-live="polite">
        {dedupDecision?.action === "append_corroboration" && matchedProject && (
          <section className="corroboration-prompt">
            <header className="corroboration-prompt__header">
              <div>
                <p className="form-kicker">Possible match · Human decision required</p>
                <h2>This report looks similar to an existing project.</h2>
              </div>
              <span className="draft-state draft-state--active">
                {Math.round(dedupDecision.score * 100)}% match
              </span>
            </header>

            <p className="corroboration-prompt__copy">
              Civic trust works best when related reports are linked instead of
              scattered. If this is the same issue, add your report as
              corroboration. Otherwise, start a new brief.
            </p>

            <article className="corroboration-prompt__candidate">
              <h3>{matchedProject.title}</h3>
              <p>
                {matchedProject.problem_summary || matchedProject.description}
              </p>
              <div className="corroboration-prompt__meta">
                <span>{matchedProject.location}</span>
                <span className="draft-state">{matchedProject.status}</span>
              </div>
            </article>

            <div className="corroboration-prompt__actions">
              <Button
                type="button"
                variant="outline"
                onClick={generatePlan}
                disabled={loading || corroborating}
              >
                Start a new brief anyway
              </Button>
              <Button
                type="button"
                onClick={handleCorroborate}
                disabled={loading || corroborating}
              >
                {corroborating && (
                  <span className="button-spinner" aria-hidden="true" />
                )}
                {corroborating
                  ? "Adding corroboration…"
                  : "Add my report to this project"}
              </Button>
            </div>
            {createError && (
              <p className="form-message-inline" role="alert">
                {createError}
              </p>
            )}
          </section>
        )}

        {planError && (
          <section className="form-message form-message--error">
            <span aria-hidden="true">!</span>
            <div>
              <h3>The brief could not be generated.</h3>
              <p>{planError}</p>
            </div>
          </section>
        )}

        {plan && (
          <section className="plan-review">
            <header className="plan-review__header">
              <div>
                <p className="form-kicker">AI-generated draft · Human review required</p>
                <h2>A structured starting point for the project.</h2>
              </div>
              <span className="draft-state draft-state--active">Ready to review</span>
            </header>

            <div className="plan-review__summary">
              <div>
                <span>Problem summary</span>
                <p>{plan.problemSummary}</p>
              </div>
              <div>
                <span>Objective</span>
                <p>{plan.objective}</p>
              </div>
            </div>

            <div className="plan-review__section">
              <div className="plan-review__section-heading">
                <h3>Affected groups</h3>
                <span>{plan.affectedGroups.length} identified</span>
              </div>
              <div className="token-list">
                {plan.affectedGroups.map((group) => (
                  <span key={group}>{group}</span>
                ))}
              </div>
            </div>

            <div className="plan-review__columns">
              <div className="plan-review__section">
                <div className="plan-review__section-heading">
                  <h3>Suggested tasks</h3>
                  <span>{plan.tasks.length} tasks</span>
                </div>
                <div className="review-list">
                  {plan.tasks.map((task, index) => (
                    <article key={`${task.title}-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h4>{task.title}</h4>
                        <p>{task.ownerRole}</p>
                      </div>
                      <small>Suggested</small>
                    </article>
                  ))}
                </div>
              </div>

              <div className="plan-review__section">
                <div className="plan-review__section-heading">
                  <h3>Measurement plan</h3>
                  <span>{plan.kpis.length} KPIs</span>
                </div>
                <div className="review-list review-list--kpi">
                  {plan.kpis.map((kpi, index) => (
                    <article key={`${kpi.name}-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h4>{kpi.name}</h4>
                        <p>{kpi.unit}</p>
                      </div>
                      <small>Unmeasured</small>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="plan-review__section">
              <div className="plan-review__section-heading">
                <h3>Evidence the project should collect</h3>
                <span>Review before use</span>
              </div>
              <ul className="evidence-list">
                {plan.evidenceRequirements.map((requirement, index) => (
                  <li key={requirement}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {requirement}
                  </li>
                ))}
              </ul>
            </div>

            <footer className="plan-review__footer">
              <div className="persistence-notice">
                <span aria-hidden="true">i</span>
                <p>
                  Confirming creates a private project record with its tasks and
                  measurement plan. Qwen’s draft remains reviewable, not verified.
                </p>
              </div>
              <div className="plan-review__actions">
                <Button variant="outline" onClick={() => setPlan(null)}>
                  Discard draft
                </Button>
                <Button onClick={handleCreateProject} disabled={creating}>
                  {creating && <span className="button-spinner" aria-hidden="true" />}
                  {creating ? "Creating project…" : "Confirm and create project"}
                </Button>
              </div>
              {createError && (
                <p className="form-message-inline" role="alert">{createError}</p>
              )}
            </footer>
          </section>
        )}
      </div>
    </div>
  );
}
