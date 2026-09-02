import type { Metadata } from "next";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Project workspace",
  description: "A live COMMONS project workspace with work, measurement, and evidence records.",
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return <ProjectWorkspace projectId={id} />;
}
