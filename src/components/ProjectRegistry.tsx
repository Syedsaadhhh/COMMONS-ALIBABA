"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { getSavedProjects } from "@/lib/projects/client";
import type { ProjectRecord } from "@/lib/projects/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ProjectRegistry() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSavedProjects()
      .then(setProjects)
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Projects could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="app-page">
      <div className="shell registry-intro">
        <div>
          <p className="eyebrow">Project registry</p>
          <h1 className="section-heading">Confirmed civic work, kept accountable.</h1>
          <p className="section-copy">
            Each record carries the confirmed brief, work status, measurements,
            evidence references, and an optional consented location pin.
          </p>
        </div>
        <ButtonLink href="/submit" size="lg">Create a civic brief</ButtonLink>
      </div>

      <div className="shell registry-list" aria-live="polite">
        {loading && <p className="registry-loading">Loading your project records…</p>}

        {!loading && error && (
          <section className="form-message form-message--error">
            <span aria-hidden="true">!</span>
            <div>
              <h2>Projects could not be loaded.</h2>
              <p>{error}</p>
            </div>
          </section>
        )}

        {!loading && !error && projects.length === 0 && (
          <section className="registry-empty__main registry-empty__main--compact">
            <span className="registry-empty__mark" aria-hidden="true"><i /><i /><i /></span>
            <p className="form-kicker">No confirmed projects</p>
            <h2>Start with an observed local problem.</h2>
            <p>
              The registry only displays records you confirm. It never uses sample
              projects, made-up status, or manufactured impact.
            </p>
            <ButtonLink href="/submit" variant="outline">Create the first brief</ButtonLink>
          </section>
        )}

        {!loading && !error && projects.length > 0 && (
          <section className="project-card-grid" aria-label="Saved projects">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <div className="project-card__meta">
                  <span className="draft-state draft-state--active">{project.status}</span>
                  <span>Created {formatDate(project.created_at)}</span>
                </div>
                <h2>{project.title}</h2>
                <p>{project.problem_summary}</p>
                <dl>
                  <div><dt>Location</dt><dd>{project.location}</dd></div>
                  <div><dt>Map signal</dt><dd>{project.latitude !== null ? "Captured with consent" : "Not captured"}</dd></div>
                </dl>
                <ButtonLink href={`/projects/${project.id}`} variant="outline">Open workspace</ButtonLink>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
