import { ButtonLink } from "@/components/ui/ButtonLink";

const process = [
  {
    number: "01",
    title: "Report what is happening",
    description:
      "Start with the place, the people affected, and the problem as it exists today.",
    label: "Human input",
  },
  {
    number: "02",
    title: "Turn it into a workable brief",
    description:
      "Qwen structures the report into an objective, suggested tasks, KPIs, and evidence needs.",
    label: "AI-assisted",
  },
  {
    number: "03",
    title: "Coordinate the response",
    description:
      "A confirmed project can bring owners, contributors, reviewers, and deadlines into one record.",
    label: "Human-owned",
  },
  {
    number: "04",
    title: "Measure and show the proof",
    description:
      "Record sourced measurements, review evidence, and publish the outcome without hiding uncertainty.",
    label: "Evidence-led",
  },
];

const audiences = [
  {
    title: "Communities",
    description:
      "Move beyond a complaint. Frame the problem clearly and keep the response visible.",
    detail: "Report · participate · follow progress",
  },
  {
    title: "Institutions",
    description:
      "See what needs action, who owns it, and whether the reported outcome has a source.",
    detail: "Coordinate · review · account",
  },
  {
    title: "Partners",
    description:
      "Contribute time, expertise, or resources to a defined project rather than an open-ended request.",
    detail: "Support · deliver · evidence",
  },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="arrow-icon">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main>
      <section className="home-hero">
        <div className="home-hero__glow" aria-hidden="true" />
        <div className="shell home-hero__grid">
          <div className="home-hero__copy">
            <p className="eyebrow rise-in">From issue to action</p>
            <h1 className="font-editorial rise-in rise-in--delay-1">
              Turn public problems into work people can trust.
            </h1>
            <p className="home-hero__lede rise-in rise-in--delay-2">
              COMMONS helps a community move from a real local issue to a
              structured plan, coordinated action, sourced measurement, and
              evidence that can be reviewed.
            </p>
            <div className="home-hero__actions rise-in rise-in--delay-3">
              <ButtonLink href="/submit" size="lg">
                Report a problem
                <ArrowIcon />
              </ButtonLink>
              <ButtonLink href="/#process" variant="outline" size="lg">
                See the process
              </ButtonLink>
            </div>
            <div className="home-hero__assurances rise-in rise-in--delay-3">
              <span>Human confirmation required</span>
              <span>Measurements need sources</span>
              <span>Uncertainty stays visible</span>
            </div>
          </div>

          <div className="brief-stage rise-in rise-in--delay-2">
            <div className="brief-stage__orbit" aria-hidden="true" />
            <article className="civic-brief" aria-label="Illustrative civic brief">
              <header className="civic-brief__header">
                <div>
                  <span className="status-dot" />
                  Illustrative preview
                </div>
                <span className="brief-tag">AI-assisted draft</span>
              </header>

              <div className="civic-brief__location">Gulshan-e-Iqbal, Karachi</div>
              <h2>Street flooding blocks access beside a school</h2>
              <p className="civic-brief__summary">
                Turn a repeated access problem into a response that the school,
                residents, and local partners can coordinate and measure.
              </p>

              <div className="brief-rule" />

              <div className="brief-objective">
                <span>Proposed objective</span>
                <p>Restore safe access and document whether flooding incidents decrease.</p>
              </div>

              <div className="brief-list">
                <div>
                  <span className="brief-list__number">01</span>
                  <p>Document affected access points</p>
                  <span className="brief-list__state">Suggested</span>
                </div>
                <div>
                  <span className="brief-list__number">02</span>
                  <p>Coordinate drainage inspection</p>
                  <span className="brief-list__state">Suggested</span>
                </div>
              </div>

              <footer className="civic-brief__footer">
                <span>Flooding incidents per month</span>
                <strong>Unmeasured</strong>
              </footer>
            </article>
          </div>
        </div>
      </section>

      <section className="trust-rail" aria-label="COMMONS trust principles">
        <div className="shell trust-rail__inner">
          <p>Designed for accountable civic work</p>
          <div>
            <span>Supported by Qwen</span>
            <span>Confirmed by people</span>
            <span>Measured from sources</span>
            <span>Reviewed with evidence</span>
          </div>
        </div>
      </section>

      <section id="process" className="process-section">
        <div className="shell">
          <div className="section-intro process-section__intro">
            <div>
              <p className="eyebrow">One continuous record</p>
              <h2 className="section-heading">
                A clear path from report to result.
              </h2>
            </div>
            <p className="section-copy">
              The system is designed around a civic project, not a feed of
              complaints. Every phase adds context without pretending that an
              AI suggestion is already a verified fact.
            </p>
          </div>

          <div className="process-grid">
            {process.map((step) => (
              <article key={step.number} className="process-card">
                <div className="process-card__top">
                  <span className="process-card__number">{step.number}</span>
                  <span className="process-card__label">{step.label}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="integrity-section">
        <div className="shell integrity-section__grid">
          <div className="integrity-section__statement">
            <p className="eyebrow">Truth before presentation</p>
            <h2 className="section-heading">
              Progress is useful only when people can understand what supports it.
            </h2>
            <p className="section-copy">
              COMMONS separates suggestions, measurements, and reviewed evidence.
              That makes a strong outcome credible and an uncertain outcome honest.
            </p>
          </div>

          <div className="integrity-ledger">
            <article>
              <span>01</span>
              <div>
                <h3>AI proposes. People confirm.</h3>
                <p>A generated brief remains a draft until someone reviews it.</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Missing data stays missing.</h3>
                <p>An unmeasured KPI is never turned into a zero or a success claim.</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>An upload is not automatically proof.</h3>
                <p>Evidence remains submitted until an authorized reviewer decides.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="audience-section">
        <div className="shell">
          <div className="audience-section__heading">
            <p className="eyebrow">A shared project record</p>
            <h2 className="section-heading">Different roles. One accountable project.</h2>
          </div>

          <div className="audience-grid">
            {audiences.map((audience, index) => (
              <article key={audience.title} className="audience-card">
                <span className="audience-card__index">0{index + 1}</span>
                <h3>{audience.title}</h3>
                <p>{audience.description}</p>
                <small>{audience.detail}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="shell home-cta__panel">
          <div>
            <p className="eyebrow">Start with the problem as it is</p>
            <h2 className="font-editorial">
              Give the issue a clear record, a practical plan, and evidence people can review.
            </h2>
          </div>
          <ButtonLink href="/submit" size="lg">
            Create a civic brief
            <ArrowIcon />
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
