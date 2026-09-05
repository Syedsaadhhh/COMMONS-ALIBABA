"use client";

import { useEffect, useMemo, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { getSavedProjectBundles } from "@/lib/projects/client";
import { deriveProjectTimeline } from "@/lib/projects/timeline";
import type { ProjectBundle } from "@/lib/projects/types";

type SortBy = "updated" | "created" | "corroboration" | "verified";

export function ProjectRegistry() {
  const [bundles, setBundles] = useState<ProjectBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectBundle["project"]["status"]>("all");
  const [sortBy, setSortBy] = useState<SortBy>("updated");

  useEffect(() => {
    getSavedProjectBundles()
      .then(setBundles)
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Projects could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = bundles.filter((bundle) => {
      if (statusFilter !== "all" && bundle.project.status !== statusFilter) return false;
      if (!query) return true;
      const project = bundle.project;
      return (
        project.title.toLowerCase().includes(query) ||
        (project.problem_summary ?? "").toLowerCase().includes(query) ||
        project.location.toLowerCase().includes(query)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "updated") {
        return new Date(b.project.updated_at).getTime() - new Date(a.project.updated_at).getTime();
      }
      if (sortBy === "created") {
        return new Date(b.project.created_at).getTime() - new Date(a.project.created_at).getTime();
      }
      if (sortBy === "corroboration") {
        return b.project.corroboration_count - a.project.corroboration_count;
      }
      if (sortBy === "verified") {
        return Number(b.project.community_verified) - Number(a.project.community_verified);
      }
      return 0;
    });

    return list;
  }, [bundles, search, statusFilter, sortBy]);

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

        {!loading && !error && bundles.length === 0 && (
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

        {!loading && !error && bundles.length > 0 && (
          <>
            <div className="registry-controls">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search projects…"
                aria-label="Search projects"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
                <option value="draft">Draft</option>
              </select>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortBy)}
                aria-label="Sort projects"
              >
                <option value="updated">Last updated</option>
                <option value="created">Recently created</option>
                <option value="corroboration">Most corroborated</option>
                <option value="verified">Verified first</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <p className="empty-copy">No projects match your filters.</p>
            ) : (
              <section className="project-card-grid" aria-label="Saved projects">
                {filtered.map((bundle) => {
                  const { project, tasks, kpis, evidence } = bundle;
                  return (
                    <ProjectCard
                      key={project.id}
                      title={project.title}
                      problemSummary={project.problem_summary}
                      location={project.location}
                      status={project.status}
                      imageUrl={project.image_url}
                      objective={project.objective}
                      tasks={tasks.map((task) => ({
                        title: task.title,
                        ownerRole: task.owner_role,
                        status: task.status,
                      }))}
                      kpis={kpis.map((kpi) => ({
                        name: kpi.name,
                        unit: kpi.unit,
                        baseline: kpi.baseline,
                      }))}
                      evidenceCount={evidence.length}
                      trust={{
                        corroborationCount: project.corroboration_count,
                        communityVerified: project.community_verified,
                        timeline: deriveProjectTimeline(bundle),
                        reviewerDisplayName: null,
                        submitterDisplayName: null,
                      }}
                      href={`/projects/${project.id}`}
                    />
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
