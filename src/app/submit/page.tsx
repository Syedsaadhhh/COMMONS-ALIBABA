import type { Metadata } from "next";
import { ProblemForm } from "@/components/ProblemForm";

export const metadata: Metadata = {
  title: "Create a civic brief",
  description:
    "Describe a local problem and use Qwen to structure it into a reviewable civic project brief.",
};

const guidance = [
  "State what is happening, not what you assume caused it.",
  "Name the people or services affected when you can.",
  "Use a precise location and add direct observations.",
];

export default function SubmitPage() {
  return (
    <main className="app-page">
      <div className="shell submit-page__intro">
        <div>
          <p className="eyebrow">Create a civic brief</p>
          <h1 className="section-heading">
            Begin with a clear account of the problem.
          </h1>
        </div>
        <p className="section-copy">
          Qwen will organize your report into a draft objective, tasks,
          measurements, and evidence needs. The result remains a proposal until
          a person reviews and confirms it.
        </p>
      </div>

      <div className="shell submit-page__layout">
        <aside className="submission-guide">
          <div>
            <p className="form-kicker">Before you submit</p>
            <h2>A strong report gives the work a reliable starting point.</h2>
          </div>

          <ol>
            {guidance.map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </li>
            ))}
          </ol>

          <div className="submission-guide__note">
            <strong>Your report is not published by this step.</strong>
            <p>
              It is sent to the protected planning route to create a draft for
              review.
            </p>
          </div>
        </aside>

        <ProblemForm />
      </div>
    </main>
  );
}
