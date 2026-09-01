import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ThemeToggle } from "@/components/ThemeToggle";

export function CommonsMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={className}
      fill="none"
    >
      <rect x="2" y="2" width="36" height="36" rx="12" fill="currentColor" />
      <path
        d="M12 15.2 20 10l8 5.2v9.6L20 30l-8-5.2v-9.6Z"
        stroke="var(--mark-ink)"
        strokeWidth="2"
      />
      <path
        d="M12 15.2 20 20l8-4.8M20 20v10"
        stroke="var(--mark-ink)"
        strokeWidth="2"
      />
      <circle cx="20" cy="20" r="2.4" fill="var(--mark-ink)" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link href="/" className="brand-link" aria-label="COMMONS home">
          <CommonsMark className="brand-mark" />
          <span>
            <strong>COMMONS</strong>
            <small>Problem to proof</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Primary navigation">
          <Link href="/#process">How it works</Link>
          <Link href="/projects">Projects</Link>
          <Link href="/submit">Report a problem</Link>
        </nav>

        <div className="site-header__actions">
          <ThemeToggle />
          <ButtonLink href="/submit" size="sm" className="header-cta">
            Start a civic brief
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
