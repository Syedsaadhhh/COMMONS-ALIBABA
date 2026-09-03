import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProjectCard } from "@/components/ProjectCard";

// Demo data used to showcase the new trust-signal UI. The current
// /projects page has no persistence yet (the "Confirm & Create Project"
// button on ProblemForm is still disabled), so a real projects list
// cannot be rendered. This static sample lets the trust badges,
// corroboration counter, and timeline be exercised in the UI now and
// removed in a single edit once the DB-backed listing lands.
const DEMO_PROJECT = {
  title: "Street flooding beside City School, Sector 4",
  problemSummary:
    "Monsoon runoff pools in front of the school gate every rainy day, blocking pedestrian access and damaging the perimeter wall.",
  location: "Street beside City School, Sector 4",
  status: "active" as const,
  objective:
    "Divert runoff away from the school gate and restore the perimeter wall before the next monsoon season.",
  tasks: [
    { title: "Validate flooding extent on-site", ownerRole: "Field Coordinator", status: "completed" },
    { title: "Engage municipal drainage dept.", ownerRole: "Community Liaison", status: "in_progress" },
    { title: "Mobilise volunteer cleanup day", ownerRole: "Project Lead", status: "not_started" },
    { title: "Record baseline water-depth KPI", ownerRole: "Data Steward", status: "not_started" },
  ],
  kpis: [
    { name: "Peak water depth", unit: "cm", baseline: null },
    { name: "Blocked-access hours per week", unit: "hours", baseline: null },
    { name: "Resident satisfaction", unit: "score (1-5)", baseline: null },
  ],
  evidenceCount: 3,
  trust: {
    corroborationCount: 2,
    communityVerified: true,
    submitterDisplayName: "A. Resident",
    reviewerDisplayName: "M. Auditor",
    timeline: [
      { label: "Problem submitted", at: "2026-07-14", kind: "submitted" as const },
      { label: "1st corroboration received", at: "2026-07-18", kind: "corroborated" as const },
      { label: "2nd corroboration received", at: "2026-07-22", kind: "corroborated" as const },
      { label: "Reviewer checklist signed off", at: "2026-08-02", kind: "reviewed" as const },
    ],
  },
};

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-gray-600">
            Confirmed civic projects tracked in COMMONS. Corroboration counts
            and community verification are surfaced on every card.
          </p>
        </div>
        <ButtonLink href="/submit">New Project</ButtonLink>
      </div>

      <div className="space-y-5">
        <ProjectCard {...DEMO_PROJECT} href={`/projects/demo`} />

        <Card>
          <div className="py-8 text-center">
            <p className="text-gray-500">
              No additional projects yet. Submit a problem to create your own
              project — the card above is a preview of how trust signals will
              appear once the persistence layer is wired up.
            </p>
            <div className="mt-4">
              <ButtonLink href="/submit" variant="outline">
                Report a Problem
              </ButtonLink>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
