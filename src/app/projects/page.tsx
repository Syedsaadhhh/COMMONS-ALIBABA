import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-gray-600">
            Confirmed civic projects tracked in COMMONS.
          </p>
        </div>
        <ButtonLink href="/submit">New Project</ButtonLink>
      </div>

      <Card>
        <div className="py-8 text-center">
          <p className="text-gray-500">
            No projects yet. Submit a problem to create your first project.
          </p>
          <div className="mt-4">
            <ButtonLink href="/submit" variant="outline">
              Report a Problem
            </ButtonLink>
          </div>
        </div>
      </Card>
    </main>
  );
}
