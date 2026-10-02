import type { Metadata } from "next";
import { ProjectRegistry } from "@/components/ProjectRegistry";
import { getShowcaseProjectBundles } from "@/lib/projects/showcase";
import type { ProjectBundle } from "@/lib/projects/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Project registry",
  description: "Confirmed civic projects, execution records, and evidence check-ins.",
};

export default async function ProjectsPage() {
  let bundles: ProjectBundle[] = [];
  let loadError: string | null = null;

  try {
    bundles = await getShowcaseProjectBundles();
  } catch (error) {
    console.error("[projects/showcase] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    loadError = "The project showcase is temporarily unavailable. Please try again shortly.";
  }

  return <ProjectRegistry bundles={bundles} loadError={loadError} />;
}
