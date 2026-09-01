import Link from "next/link";
import { CommonsMark } from "@/components/SiteHeader";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__grid">
        <div className="site-footer__brand">
          <Link href="/" className="brand-link" aria-label="COMMONS home">
            <CommonsMark className="brand-mark" />
            <span>
              <strong>COMMONS</strong>
              <small>Problem to project to proof</small>
            </span>
          </Link>
          <p>
            A civic execution platform for turning public problems into
            coordinated work, sourced measurements, and reviewable evidence.
          </p>
        </div>

        <div className="site-footer__links">
          <div>
            <p className="site-footer__eyebrow">Product</p>
            <Link href="/submit">Create a civic brief</Link>
            <Link href="/projects">Project registry</Link>
          </div>
          <div>
            <p className="site-footer__eyebrow">Principles</p>
            <span>Human confirmation</span>
            <span>Source-linked measurement</span>
            <span>Visible uncertainty</span>
          </div>
        </div>
      </div>

      <div className="shell site-footer__bottom">
        <span>Built for the Alibaba Cloud AI Hackathon Pakistan 2026</span>
        <span>AI structures the work. People verify the truth.</span>
      </div>
    </footer>
  );
}
