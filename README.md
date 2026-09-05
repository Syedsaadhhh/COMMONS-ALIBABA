# COMMONS

**Turn a local civic issue into an accountable project.**

COMMONS is a civic coordination platform built for the Alibaba Cloud AI Hackathon Pakistan 2026. It helps communities move from an observed problem to a structured brief, a confirmed project, measurable work, and evidence people can inspect.

**Live app:** https://commons-alibaba.vercel.app

## How it works

1. A person reports a local problem with location and context.
2. Qwen structures it into an objective, suggested tasks, KPIs, and evidence needs.
3. A person reviews the draft and confirms the project.
4. The project workspace tracks task status, sourced measurements, evidence references, task-linked proof, and optional consented location data.
5. Duplicate or near-duplicate reports are surfaced for human choice so a person can corroborate an existing project instead of silently creating a duplicate.
6. Reviewer checks, corroboration history, before/after evidence, and the Evidence / Impact Passport keep trust signals inspectable without turning them into manufactured scores.

Qwen assists with structure. It does not verify claims, approve evidence, or invent progress.

## What is working now

- Validated civic problem submission and structured Qwen planning
- Human confirmation before a project is created
- Supabase-backed project, task, KPI, measurement, evidence, trust, and audit records
- Anonymous project sessions with row-level security
- Task status updates and KPI readings with a required source
- Evidence-link check-ins with a SHA-256 reference fingerprint
- Task-linked evidence claims and before/after evidence phases
- Duplicate and near-duplicate detection with a human corroboration prompt
- Corroboration count and trust timeline data
- Independent reviewer checklist with submitter/reviewer separation
- Evidence / Impact Passport view for an inspectable project proof record
- Consent-only project and evidence location capture
- Template fallback for Qwen outages, with source metadata returned by the API
- Automated tests, TypeScript checks, production builds, and deployment security headers

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
7. `007_final_security_integrity.sql`
8. `008_proof_loop.sql`
9. `009_security_cleanup.sql`

Then enable **Anonymous Sign-Ins** in Supabase Authentication.

The final cleanup migration moves the membership helper out of the exposed `public` API schema, keeps service-only timeline writes restricted, makes trust-table Data API grants explicit, and adds covering indexes for foreign keys used by authorization and audit queries.

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
