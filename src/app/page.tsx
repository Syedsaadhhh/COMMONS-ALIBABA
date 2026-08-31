import { ButtonLink } from "@/components/ui/ButtonLink";

const steps = [
  { label: "Report", description: "Describe the civic problem" },
  { label: "Plan", description: "AI generates a structured draft" },
  { label: "Confirm", description: "Review and edit before creating the project" },
  { label: "Act", description: "Assign tasks and coordinate work" },
  { label: "Measure", description: "Record KPI measurements with sources" },
  { label: "Prove", description: "Upload evidence and create an Impact Passport" },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Problem to Project to Proof
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          From civic problems to measurable outcomes
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
          Report a local problem. Get a structured plan. Track the work. Measure
          the change. Show the evidence.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <ButtonLink href="/submit" size="lg">
            Report a Problem
          </ButtonLink>
          <ButtonLink href="/projects" variant="outline" size="lg">
            View Projects
          </ButtonLink>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            How COMMONS works
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.label}
                className="rounded-lg border border-gray-200 bg-gray-50 p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold text-gray-900">{step.label}</h3>
                </div>
                <p className="mt-2 text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-6 text-center text-sm text-gray-500">
          COMMONS — Built for the Alibaba Cloud AI Hackathon Pakistan 2026
        </div>
      </footer>
    </main>
  );
}
