import { Card } from "@/components/ui/Card";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Card>
        <h1 className="text-xl font-bold text-gray-900">Project</h1>
        <p className="mt-2 text-sm text-gray-500">Project ID: {id}</p>
        <p className="mt-4 text-gray-600">
          Project workspace will be available once the project creation flow is
          implemented. This page will show tasks, KPIs, evidence, and the
          Impact Passport.
        </p>
      </Card>
    </main>
  );
}
