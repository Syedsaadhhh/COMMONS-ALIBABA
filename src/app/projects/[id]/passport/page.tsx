import type { Metadata } from "next";
import { ProjectPassport } from "@/components/ProjectPassport";

interface PassportPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Evidence / Impact Passport",
  description: "A reviewable record of project evidence, measurements, and outcomes.",
};

export default async function PassportPage({ params }: PassportPageProps) {
  const { id } = await params;
  return <ProjectPassport projectId={id} />;
}
