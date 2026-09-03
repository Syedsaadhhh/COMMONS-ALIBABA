# COMMONS

**Turn a local civic issue into an accountable project.**

COMMONS is a civic coordination platform built for the Alibaba Cloud AI Hackathon Pakistan 2026. It helps communities move from an observed problem to a structured brief, a confirmed project, measurable work, and evidence people can inspect.

**Live app:** https://commons-alibaba.vercel.app

## How it works

1. A person reports a local problem with location and context.
2. Qwen structures it into an objective, suggested tasks, KPIs, and evidence needs.
3. A person reviews the draft and confirms the project.
4. The project workspace tracks task status, sourced measurements, evidence references, and optional consented location data.

Qwen assists with structure. It does not verify claims, approve evidence, or invent progress.

## What is working now

- Validated civic problem submission and structured Qwen planning
- Human confirmation before a project is created
- Supabase-backed project, task, KPI, measurement, evidence, and audit records
- Anonymous project sessions with row-level security
- Task status updates and KPI readings with a required source
- Evidence-link check-ins with a SHA-256 reference fingerprint
- Consent-only project and evidence location capture
- Template fallback for Qwen outages, with source metadata returned by the API
- Automated tests, TypeScript checks, and production builds

The repository also contains the next civic-trust layer: submitter/reviewer separation, duplicate and corroboration scoring, reviewer checklist components, trust timeline data, and supporting database rules. These controls are kept separate from the live execution flow until they are fully connected end to end.

## Stack

Next.js 16 · React 19 · TypeScript · Alibaba Cloud Model Studio / Qwen · Supabase · Vercel

## Run locally

```bash
git clone https://github.com/Syedsaadhhh/COMMONS-ALIBABA.git
cd COMMONS-ALIBABA
npm ci
cp .env.example .env.local
npm run dev
```

Use `.env.example` as the environment-variable reference. Keep real API keys and credentials out of Git.

## Database setup

Apply the migrations in this order:

1. `001_initial_schema.sql`
2. `002_security_hardening.sql`
3. `003_execution_mvp.sql`
4. `004_function_execution_guard.sql`
5. `005_fix_project_policy_recursion.sql`
6. `006_civic_trust.sql`

Then enable **Anonymous Sign-Ins** in Supabase Authentication.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Team

| Team member | Role |
|---|---|
| Syed Saad | Technical Lead and Project Strategy |
| Areeba Muhammad | Product and Operations Lead |
| Mustafa Ahmed | Presentation and Pitch Lead |
| Urwa Rashid | Research and Project Support |

## License

MIT. See `LICENSE`.
