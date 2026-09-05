"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { createClient } from "@/lib/db/client";
import { ProjectTrustSignals } from "@/components/ProjectCard";
import { ReviewerChecklist } from "@/components/ReviewerChecklist";
import type { ReviewerChecklistDecision } from "@/components/ReviewerChecklist";
import { BeforeAfterComparison } from "@/components/BeforeAfterComparison";
import { deriveProjectTimeline } from "@/lib/projects/timeline";
import { deriveReviewReadiness } from "@/lib/projects/readiness";
import {
  addEvidenceCheckIn,
  addMeasurement,
  addTaskEvidenceClaim,
  getProjectBundle,
  submitVerificationReview,
  updateProjectCoordinates,
  updateProjectStatus,
  updateTaskStatus,
} from "@/lib/projects/client";
import type {
  Coordinates,
  EvidencePhase,
  ProjectBundle,
  TaskEvidenceClaimRecord,
  TaskRecord,
} from "@/lib/projects/types";

interface ProjectWorkspaceProps {
  projectId: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function captureCoordinates(): Promise<Coordinates> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Location capture is not supported by this browser."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error("Location was not shared. Nothing was saved.")),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 },
    );
  });
}

function mapEmbedUrl(latitude: number, longitude: number) {
  return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${latitude}%2C${longitude}`;
}

function mapLinkUrl(latitude: number, longitude: number) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

const CLAIM_KIND_LABELS: Record<TaskEvidenceClaimRecord["claim_kind"], string> = {
  addresses: "Addresses",
  proves: "Proves",
  relates_to: "Relates to",
};

export function ProjectWorkspace({ projectId }: ProjectWorkspaceProps) {
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [measurementKpiId, setMeasurementKpiId] = useState("");
  const [measurementValue, setMeasurementValue] = useState("");
  const [measurementSource, setMeasurementSource] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidencePhase, setEvidencePhase] = useState<EvidencePhase>("other");
  const [evidenceCoordinates, setEvidenceCoordinates] = useState<Coordinates | null>(null);
  const [claimSelections, setClaimSelections] = useState<
    Record<string, { evidenceId: string; claimKind: TaskEvidenceClaimRecord["claim_kind"] }>
  >({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextBundle = await getProjectBundle(projectId);
      setBundle(nextBundle);
      if (nextBundle?.kpis[0]) {
        setMeasurementKpiId((currentId) => currentId || nextBundle.kpis[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The project could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;

    void getProjectBundle(projectId)
      .then((nextBundle) => {
        if (!active) return;
        setBundle(nextBundle);
        if (nextBundle?.kpis[0]) {
          setMeasurementKpiId((currentId) => currentId || nextBundle.kpis[0].id);
        }
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "The project could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id ?? null);
    });
  }, []);

  const latestMeasurements = useMemo(() => {
    const byKpi = new Map<string, ProjectBundle["measurements"][number]>();
    bundle?.measurements.forEach((measurement) => {
      if (!byKpi.has(measurement.kpi_id)) byKpi.set(measurement.kpi_id, measurement);
    });
    return byKpi;
  }, [bundle]);

  const timeline = useMemo(() => (bundle ? deriveProjectTimeline(bundle) : []), [bundle]);
  const readiness = useMemo(
    () => (bundle ? deriveReviewReadiness(bundle, currentUserId) : { ready: false, blockers: [] }),
    [bundle, currentUserId],
  );

  async function saveTask(taskId: string, status: TaskRecord["status"]) {
    setBusy(`task-${taskId}`);
    setError(null);
    try {
      await updateTaskStatus(taskId, status);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The task could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  async function saveProjectLocation() {
    setBusy("project-location");
    setError(null);
    try {
      const coordinates = await captureCoordinates();
      await updateProjectCoordinates(projectId, coordinates);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The location signal could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function submitMeasurement(event: FormEvent) {
    event.preventDefault();
    const value = Number(measurementValue);
    if (!measurementKpiId || !Number.isFinite(value) || !measurementSource.trim()) {
      setError("Choose a KPI, enter a numeric reading, and name the source.");
      return;
    }
    setBusy("measurement");
    setError(null);
    try {
      await addMeasurement({ kpiId: measurementKpiId, value, source: measurementSource.trim() });
      setMeasurementValue("");
      setMeasurementSource("");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The measurement could not be recorded.");
    } finally {
      setBusy(null);
    }
  }

  async function captureEvidenceLocation() {
    setBusy("evidence-location");
    setError(null);
    try {
      setEvidenceCoordinates(await captureCoordinates());
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Location was not shared.");
    } finally {
      setBusy(null);
    }
  }

  async function submitEvidence(event: FormEvent) {
    event.preventDefault();
    if (!evidenceTitle.trim() || !evidenceUrl.trim()) {
      setError("Give the evidence a title and a source link.");
      return;
    }
    setBusy("evidence");
    setError(null);
    try {
      await addEvidenceCheckIn({
        projectId,
        title: evidenceTitle.trim(),
        description: evidenceDescription.trim(),
        sourceUrl: evidenceUrl.trim(),
        phase: evidencePhase,
        coordinates: evidenceCoordinates,
      });
      setEvidenceTitle("");
      setEvidenceDescription("");
      setEvidenceUrl("");
      setEvidencePhase("other");
      setEvidenceCoordinates(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The evidence check-in could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  function updateClaimSelection(
    taskId: string,
    field: "evidenceId" | "claimKind",
    value: string,
  ) {
    setClaimSelections((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] ?? { evidenceId: "", claimKind: "addresses" }),
        [field]: value,
      },
    }));
  }

  async function saveClaim(taskId: string) {
    const selection = claimSelections[taskId];
    if (!selection?.evidenceId || !selection?.claimKind) return;

    setBusy(`claim-${taskId}`);
    setError(null);
    try {
      await addTaskEvidenceClaim({
        taskId,
        evidenceId: selection.evidenceId,
        claimKind: selection.claimKind,
      });
      setClaimSelections((prev) => ({
        ...prev,
        [taskId]: { evidenceId: "", claimKind: "addresses" },
      }));
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The task evidence claim could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function handleReviewSubmit(decision: ReviewerChecklistDecision) {
    setBusy("review");
    setError(null);
    try {
      await submitVerificationReview({
        projectId,
        submitterUserId: decision.submitterUserId,
        items: decision.items,
        notes: decision.notes,
      });
      await updateProjectStatus(projectId, "completed");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The review could not be recorded.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <main className="app-page"><div className="shell workspace-loading">Loading the project record…</div></main>;
  }

  if (error && !bundle) {
    return (
      <main className="app-page"><div className="shell workspace-loading">
        <p className="eyebrow">Project workspace</p>
        <h1 className="section-heading">This project is not available in this session.</h1>
        <p className="section-copy">{error}</p>
        <ButtonLink href="/submit">Create a civic brief</ButtonLink>
      </div></main>
    );
  }

  if (!bundle) return null;

  const { project, tasks, kpis, evidence } = bundle;
  const hasMap = project.latitude !== null && project.longitude !== null;

  return (
    <main className="app-page">
      <div className="shell project-workspace">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/projects">Project registry</Link><span>/</span><span>{project.title}</span>
        </nav>

        <header className="project-workspace__header workspace-header-live">
          <div>
            <p className="eyebrow">Active civic project</p>
            <h1 className="section-heading">{project.title}</h1>
            <p className="section-copy">{project.problem_summary}</p>
          </div>
          <div className="project-id"><span>Record status</span><strong>{project.status}</strong></div>
        </header>

        {error && <p className="form-message-inline" role="alert">{error}</p>}

        <section className="workspace-overview">
          <article><span>Objective</span><p>{project.objective || "Not recorded"}</p></article>
          <article><span>Area</span><p>{project.location}</p></article>
          <article><span>Evidence</span><p>{evidence.length} submitted reference{evidence.length === 1 ? "" : "s"}</p></article>
        </section>

        <BeforeAfterComparison evidence={evidence} />

        <div className="workspace-grid">
          <section className="workspace-panel workspace-panel--wide">
            <div className="workspace-panel__heading"><div><p className="form-kicker">Work register</p><h2>Tasks move from suggestion to accountable action.</h2></div><span>{tasks.length} tasks</span></div>
            {tasks.length ? <div className="execution-list">{tasks.map((task) => {
              const claims = bundle.taskEvidenceClaims.filter((claim) => claim.task_id === task.id);
              const selection = claimSelections[task.id] ?? { evidenceId: "", claimKind: "addresses" };
              return (
                <article key={task.id} className="task-row">
                  <div className="task-row__main">
                    <div><h3>{task.title}</h3><p>{task.owner_role || "Owner not set"}</p></div>
                    <label><span className="sr-only">Status for {task.title}</span><select className="form-control task-select" value={task.status} disabled={busy === `task-${task.id}`} onChange={(event) => void saveTask(task.id, event.target.value as TaskRecord["status"])}><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label>
                  </div>
                  {claims.length > 0 && (
                    <ul className="task-claims">
                      {claims.map((claim) => {
                        const linkedEvidence = evidence.find((e) => e.id === claim.evidence_id);
                        return (
                          <li key={claim.id}>
                            <span>{CLAIM_KIND_LABELS[claim.claim_kind]}</span>
                            {linkedEvidence ? linkedEvidence.title : "Unknown evidence"}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="task-row__claim">
                    <select
                      className="form-control"
                      value={selection.evidenceId}
                      onChange={(event) => updateClaimSelection(task.id, "evidenceId", event.target.value)}
                    >
                      <option value="">Link evidence…</option>
                      {evidence.map((item) => (
                        <option key={item.id} value={item.id}>{item.title} ({item.phase})</option>
                      ))}
                    </select>
                    <select
                      className="form-control"
                      value={selection.claimKind}
                      onChange={(event) => updateClaimSelection(task.id, "claimKind", event.target.value)}
                    >
                      {Object.entries(CLAIM_KIND_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy === `claim-${task.id}` || !selection.evidenceId}
                      onClick={() => void saveClaim(task.id)}
                    >
                      {busy === `claim-${task.id}` ? "Linking…" : "Link evidence"}
                    </Button>
                  </div>
                </article>
              );
            })}</div> : <p className="empty-copy">No tasks were created from this brief.</p>}
          </section>

          <section className="workspace-panel">
            <div className="workspace-panel__heading"><div><p className="form-kicker">Location</p><h2>Project map</h2></div></div>
            {hasMap ? <><iframe className="workspace-map" title={`Map for ${project.title}`} src={mapEmbedUrl(project.latitude!, project.longitude!)} loading="lazy" /><a className="plain-link" href={mapLinkUrl(project.latitude!, project.longitude!)} target="_blank" rel="noreferrer">Open map in OpenStreetMap</a></> : <div className="map-empty"><p>No map pin has been captured.</p><Button variant="outline" size="sm" disabled={busy === "project-location"} onClick={() => void saveProjectLocation()}>{busy === "project-location" ? "Capturing…" : "Capture my project location"}</Button><small>Location is saved only after your browser asks and you agree.</small></div>}
          </section>

          <section className="workspace-panel workspace-panel--wide">
            <div className="workspace-panel__heading"><div><p className="form-kicker">Measurement loop</p><h2>Record readings with their source.</h2></div><span>{kpis.length} KPIs</span></div>
            <div className="kpi-grid">{kpis.map((kpi) => { const latest = latestMeasurements.get(kpi.id); return <article key={kpi.id}><h3>{kpi.name}</h3><p>{kpi.measurement_method}</p><dl><div><dt>Baseline</dt><dd>{kpi.baseline ?? "—"} {kpi.unit}</dd></div><div><dt>Target</dt><dd>{kpi.target ?? "—"} {kpi.unit}</dd></div><div><dt>Latest</dt><dd>{latest ? `${latest.value} ${kpi.unit}` : "No reading"}</dd></div></dl></article>; })}</div>
            {kpis.length > 0 && <form className="checkin-form" onSubmit={submitMeasurement}><label>Indicator<select className="form-control" value={measurementKpiId} onChange={(event) => setMeasurementKpiId(event.target.value)}>{kpis.map((kpi) => <option key={kpi.id} value={kpi.id}>{kpi.name}</option>)}</select></label><label>Reading<input className="form-control" type="number" step="any" value={measurementValue} onChange={(event) => setMeasurementValue(event.target.value)} required /></label><label>Source / method<input className="form-control" value={measurementSource} onChange={(event) => setMeasurementSource(event.target.value)} placeholder="Manual count, survey, agency log…" required /></label><Button type="submit" disabled={busy === "measurement"}>{busy === "measurement" ? "Saving…" : "Record reading"}</Button></form>}
          </section>

          <section className="workspace-panel workspace-panel--wide">
            <div className="workspace-panel__heading"><div><p className="form-kicker">Evidence trail</p><h2>Submit references people can review.</h2></div><span>{evidence.length} check-ins</span></div>
            <form className="evidence-form" onSubmit={submitEvidence}>
              <label>Evidence title<input className="form-control" value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} placeholder="Morning traffic observation" required /></label>
              <label>Evidence phase<select className="form-control" value={evidencePhase} onChange={(event) => setEvidencePhase(event.target.value as EvidencePhase)}><option value="before">Before work</option><option value="after">After work</option><option value="other">Other</option></select></label>
              <label>Source link<input className="form-control" type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://…" required /></label>
              <label className="evidence-form__full">Context (optional)<textarea className="form-control" value={evidenceDescription} onChange={(event) => setEvidenceDescription(event.target.value)} placeholder="What does this source show, and when was it observed?" rows={3} /></label>
              <div className="evidence-form__actions"><Button type="button" variant="outline" size="sm" disabled={busy === "evidence-location"} onClick={() => void captureEvidenceLocation()}>{evidenceCoordinates ? "Evidence location captured" : busy === "evidence-location" ? "Capturing…" : "Add my evidence location"}</Button><Button type="submit" disabled={busy === "evidence"}>{busy === "evidence" ? "Saving…" : "Submit evidence"}</Button></div>
              <p className="input-note evidence-form__full">COMMONS stores the source URL and a fingerprint of that URL for reference. It does not claim to verify the source content.</p>
            </form>
            <div className="evidence-records">{evidence.length ? evidence.map((item) => <article key={item.id}><div><h3>{item.title}</h3><p>{item.description || "No additional context"}</p><small>Submitted {formatDate(item.created_at)} · {item.latitude !== null ? "Location captured" : "No location pin"}</small></div><div><span className="draft-state">{item.phase}</span><span className="draft-state">{item.status.replaceAll("_", " ")}</span><a className="plain-link" href={item.file_url} target="_blank" rel="noreferrer">Open source</a></div></article>) : <p className="empty-copy">No evidence has been submitted. Add a link that a reviewer can open.</p>}</div>
          </section>

          <section className="workspace-panel workspace-panel--wide">
            <div className="workspace-panel__heading"><div><p className="form-kicker">Civic trust</p><h2>Independent review and proof status.</h2></div></div>
            <ProjectTrustSignals
              corroborationCount={project.corroboration_count}
              communityVerified={project.community_verified}
              timeline={timeline}
              reviewerDisplayName={null}
              submitterDisplayName={null}
            />
            {!readiness.ready && (
              <div className="readiness-blockers">
                <strong>Not ready for review</strong>
                <ul>{readiness.blockers.map((blocker, index) => <li key={index}>{blocker}</li>)}</ul>
              </div>
            )}
            <div className="reviewer-checklist-wrap">
              <ReviewerChecklist
                reviewerUserId={currentUserId}
                submitterUserId={project.created_by}
                projectId={project.id}
                disabled={!readiness.ready || project.status !== "active" || busy === "review"}
                onSubmit={handleReviewSubmit}
              />
            </div>
            <div className="passport-link">
              <ButtonLink href={`/projects/${project.id}/passport`} variant="outline">View Evidence/Impact Passport</ButtonLink>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
