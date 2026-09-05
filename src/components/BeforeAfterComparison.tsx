import type { ReactNode } from "react";
import type { EvidenceRecord } from "@/lib/projects/types";

export interface BeforeAfterComparisonProps {
  evidence: EvidenceRecord[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function EvidenceCard({
  phase,
  evidence,
}: {
  phase: "before" | "after";
  evidence: EvidenceRecord;
}): ReactNode {
  return (
    <figure className="comparison-card">
      <div className="comparison-card__media">
        {evidence.file_url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
          <img
            src={evidence.file_url}
            alt={evidence.title}
            loading="lazy"
          />
        ) : (
          <div className="comparison-card__placeholder">
            <span>Reference link</span>
          </div>
        )}
        <span className={`comparison-card__phase comparison-card__phase--${phase}`}>
          {phase}
        </span>
      </div>
      <figcaption>
        <h4>{evidence.title}</h4>
        <p>{evidence.description || "No additional context"}</p>
        <dl>
          <div>
            <dt>Submitted</dt>
            <dd>{formatDate(evidence.created_at)}</dd>
          </div>
          <div>
            <dt>Fingerprint</dt>
            <dd title={evidence.file_hash}>
              {evidence.file_hash.slice(0, 12)}…
            </dd>
          </div>
          {evidence.latitude !== null && evidence.longitude !== null && (
            <div>
              <dt>Location</dt>
              <dd>Captured with consent</dd>
            </div>
          )}
        </dl>
        <a
          className="plain-link"
          href={evidence.file_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open source
        </a>
      </figcaption>
    </figure>
  );
}

/**
 * COMMONS — Before / After Evidence Comparison.
 *
 * Renders side-by-side evidence cards labelled by phase. Only evidence
 * explicitly tagged as `before` or `after` is shown; other evidence is
 * ignored here and belongs in the general evidence trail.
 */
export function BeforeAfterComparison({ evidence }: BeforeAfterComparisonProps): ReactNode {
  const beforeItems = evidence.filter((e) => e.phase === "before");
  const afterItems = evidence.filter((e) => e.phase === "after");

  if (beforeItems.length === 0 && afterItems.length === 0) {
    return (
      <div className="comparison-empty">
        <p className="form-kicker">Before / after comparison</p>
        <p>
          Tag evidence as “before” or “after” when submitting it to build a
          visual proof comparison.
        </p>
      </div>
    );
  }

  return (
    <section className="comparison" aria-label="Before and after evidence comparison">
      <div className="comparison__header">
        <p className="form-kicker">Proof comparison</p>
        <h2>Before and after the work.</h2>
      </div>

      <div className="comparison__grid">
        <div className="comparison__column">
          <h3>Before</h3>
          {beforeItems.length === 0 ? (
            <p className="empty-copy">No before evidence has been tagged.</p>
          ) : (
            beforeItems.map((item) => (
              <EvidenceCard key={item.id} phase="before" evidence={item} />
            ))
          )}
        </div>
        <div className="comparison__column">
          <h3>After</h3>
          {afterItems.length === 0 ? (
            <p className="empty-copy">No after evidence has been tagged.</p>
          ) : (
            afterItems.map((item) => (
              <EvidenceCard key={item.id} phase="after" evidence={item} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
