import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Project registry",
  description:
    "Confirmed civic projects will appear here when project saving is available.",
};

const registryFields = [
  "Project objective and location",
  "Contributors, roles, and task ownership",
  "Sourced KPI measurements",
  "Evidence status and reviewer decisions",
];

export default function ProjectsPage() {
  return (
    <main className="app-page">
      <div className="shell registry-intro">
        <div>
          <p className="eyebrow">Project registry</p>
          <h1 className="section-heading">A home for confirmed civic work.</h1>
          <p className="section-copy">
            This registry is empty because project saving is not available yet.
            COMMONS does not fill the page with invented projects or placeholder
            progress.
          </p>
        </div>
        <ButtonLink href="/submit" size="lg">
          Create a civic brief
        </ButtonLink>
      </div>

      <div className="shell registry-empty">
        <section className="registry-empty__main">
          <span className="registry-empty__mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <p className="form-kicker">No saved projects</p>
          <h2>The registry is ready for real records.</h2>
          <p>
            The submission and Qwen planning flow is working. Saving a confirmed
            brief is planned for the next version.
          </p>
          <ButtonLink href="/submit" variant="outline">
            Generate the first brief
          </ButtonLink>
        </section>

        <aside className="registry-empty__aside">
          <div>
            <span className="foundation-badge">Current version</span>
            <h3>What each project record will carry</h3>
          </div>
          <ul>
            {registryFields.map((field, index) => (
              <li key={field}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {field}
              </li>
            ))}
          </ul>
          <p>
            Every measurement will require a source. Every evidence item will
            retain a review state.
          </p>
        </aside>
      </div>
    </main>
  );
}
