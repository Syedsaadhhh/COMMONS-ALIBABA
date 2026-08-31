import { ProblemForm } from "@/components/ProblemForm";

export default function SubmitPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Report a Problem</h1>
        <p className="mt-2 text-gray-600">
          Describe the civic problem. AI will generate a structured plan for
          your review before creating a project.
        </p>
      </div>
      <ProblemForm />
    </main>
  );
}
