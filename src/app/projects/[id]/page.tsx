import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Project workspace",
  description:
    "A reserved COMMONS project workspace awaiting the persistence layer.",
};

const workspaceAreas = [
  {
    title: "Tasks and ownership",
    description: "Work items, assigned contributors, deadlines, and status.",
  },
  {
    title: "Measurements",
    description: "Baseline, current value, target, unit, method, and source.",
  },
  {
    title: "Evidence review",
    description: "Submitted files, integrity hashes, and reviewer decisions.",
  },
  {
    title: "Impact Passport",
    description: "A derived record of what changed and what supports the claim.",
  },
];

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return (
    <main className="app-page">
      <div className="shell project-workspace">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/projects">Project registry</Link>
          <span>/</span>
          <span>Reserved workspace</span>
        </nav>

        <header className="project-workspace__header">
          <div>
            <p className="eyebrow">Project workspace</p>
            <h1 className="section-heading">This record is not available yet.</h1>
            <p className="section-copy">
              The URL is valid, but project persistence is not connected. No
              title, progress, task, KPI, or evidence data is being invented for
              this workspace.
            </p>
          </div>
          <div className="project-id">
            <span>Requested ID</span>
            <code>{id}</code>
          </div>
        </header>

        <section className="workspace-status">
          <div className="workspace-status__heading">
            <div>
              <span className="foundation-badge">Awaiting persistence</span>
              <h2>The workspace structure is prepared for verified project data.</h2>
            </div>
            <ButtonLink href="/submit">Create a civic brief</ButtonLink>
          </div>

          <div className="workspace-areas">
            {workspaceAreas.map((area, index) => (
              <article key={area.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{area.title}</h3>
                  <p>{area.description}</p>
                </div>
                <small>Not connected</small>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
