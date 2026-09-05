"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProjectTrustSignals } from "@/components/ProjectCard";
import { BeforeAfterComparison } from "@/components/BeforeAfterComparison";
import { getProjectBundle } from "@/lib/projects/client";
import { deriveProjectTimeline } from "@/lib/projects/timeline";
import type { ProjectBundle } from "@/lib/projects/types";

interface ProjectPassportProps {
  projectId: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ProjectPassport({ projectId }: ProjectPassportProps) {
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getProjectBundle(projectId)
      .then((nextBundle) => {
        if (!active) return;
        setBundle(nextBundle);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "The passport could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [projectId]);

  const latestMeasurements = useMemo(() => {
    const byKpi = new Map<string, ProjectBundle["measurements"][number]>();
    bundle?.measurements.forEach((measurement) => {
      if (!byKpi.has(measurement.kpi_id)) byKpi.set(measurement.kpi_id, measurement);
    });
    return byKpi;
  }, [bundle]);

  const timeline = useMemo(() => (bundle ? deriveProjectTimeline(bundle) : []), [bundle]);

  if (loading) {
    return <main className="app-page"><div className="shell workspace-loading">Loading the passport…</div></main>;
  }

  if (error || !bundle) {
    return (
      <main className="app-page">
        <div className="shell workspace-loading">
          <p className="eyebrow">Evidence / Impact Passport</p>
          <h1 className="section-heading">This passport is not available.</h1>
          <p className="section-copy">{error || "The project record could not be found."}</p>
          <ButtonLink href="/projects">Back to registry</ButtonLink>
        </div>
      </main>
    );
  }

  const { project, tasks, kpis, evidence } = bundle;

  return (
    <main className="app-page">
      <div className="shell passport">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/projects">Project registry</Link>
          <span>/</span>
          <Link href={`/projects/${project.id}`}>{project.title}</Link>
          <span>/</span>
          <span>Passport</span>
        </nav>

        <header className="passport__header">
          <p className="eyebrow">Evidence / Impact Passport</p>
          <h1 className="section-heading">{project.title}</h1>
          <p className="section-copy">{project.problem_summary}</p>
          <ProjectTrustSignals
            corroborationCount={project.corroboration_count}
            communityVerified={project.community_verified}
            timeline={timeline}
            reviewerDisplayName={null}
            submitterDisplayName={null}
          />
        </header>

        <section className="passport__section">
          <BeforeAfterComparison evidence={evidence} />
        </section>

        <section className="passport__section">
          <h2>Project summary</h2>
          <dl className="passport__grid">
            <div className="passport__field"><dt>Status</dt><dd>{project.status}</dd></div>
            <div className="passport__field"><dt>Location</dt><dd>{project.location}</dd></div>
            <div className="passport__field"><dt>Objective</dt><dd>{project.objective || "Not recorded"}</dd></div>
            <div className="passport__field"><dt>Created</dt><dd>{formatDate(project.created_at)}</dd></div>
            <div className="passport__field"><dt>Tasks</dt><dd>{tasks.length}</dd></div>
            <div className="passport__field"><dt>Evidence items</dt><dd>{evidence.length}</dd></div>
            <div className="passport__field"><dt>Corroborations</dt><dd>{project.corroboration_count}</dd></div>
            <div className="passport__field"><dt>Verified</dt><dd>{project.community_verified ? "Yes" : "Awaiting review"}</dd></div>
          </dl>
        </section>

        <section className="passport__section">
          <h2>Tasks and progress</h2>
          {tasks.length === 0 ? (
            <p className="passport__muted">No tasks were created from this brief.</p>
          ) : (
            <ul className="passport__muted">
              {tasks.map((task) => (
                <li key={task.id}>
                  <strong>{task.title}</strong> — {task.status.replaceAll("_", " ")}
                  {task.owner_role ? ` · ${task.owner_role}` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="passport__section">
          <h2>Measurements</h2>
          {kpis.length === 0 ? (
            <p className="passport__muted">No KPIs were defined for this project.</p>
          ) : (
            <dl className="passport__grid">
              {kpis.map((kpi) => {
                const latest = latestMeasurements.get(kpi.id);
                return (
                  <div key={kpi.id} className="passport__field">
                    <dt>{kpi.name} ({kpi.unit})</dt>
                    <dd>
                      {latest ? `${latest.value} ${kpi.unit} · ${latest.source}` : "No reading recorded"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </section>

        <section className="passport__section">
          <h2>Evidence trail</h2>
          {evidence.length === 0 ? (
            <p className="passport__muted">No evidence has been submitted.</p>
          ) : (
            <ul className="passport__muted">
              {evidence.map((item) => (
                <li key={item.id}>
                  <a className="plain-link" href={item.file_url} target="_blank" rel="noopener noreferrer">
                    {item.title}
                  </a>
                  {" "}· {item.phase} · {item.status.replaceAll("_", " ")} · {formatDate(item.created_at)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="passport__actions">
          <ButtonLink href={`/projects/${project.id}`} variant="outline">Back to workspace</ButtonLink>
        </div>
      </div>
    </main>
  );
}
