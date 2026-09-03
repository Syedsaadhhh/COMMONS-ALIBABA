import type { Metadata } from "next";
import { ProjectRegistry } from "@/components/ProjectRegistry";

export const metadata: Metadata = {
  title: "Project registry",
  description: "Confirmed civic projects, execution records, and evidence check-ins.",
};

export default function ProjectsPage() {
  return <ProjectRegistry />;
}
