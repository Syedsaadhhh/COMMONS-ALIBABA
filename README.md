# COMMONS

COMMONS turns a local civic problem into a project people can review, act on, and support with evidence.

Built for the Alibaba Cloud AI Hackathon Pakistan 2026.

## What it does

1. Describe a local issue with its location and supporting context.
2. Qwen turns the report into a draft objective, tasks, measurements, and evidence needs.
3. A person reviews the draft and confirms a real project record.
4. The workspace records task status, sourced KPI readings, evidence links, and an optional consented map pin.

Qwen helps structure the work. It does not verify claims, invent progress, or approve evidence.

## Current scope

- Responsive public website with light and dark themes
- Validated civic problem submission
- Protected Qwen planning route with structured output validation
- Confirmed private project records
- Task status updates
- KPI check-ins with a required source
- Evidence link check-ins with a reference fingerprint
- Consent-only location capture with OpenStreetMap
- Supabase row-level security migrations
- Automated tests for the planning flow

Projects created with anonymous sign-in belong to that browser session. Account-based collaboration, evidence file uploads, reviewer decisions, and the Impact Passport are the next product layers.

## Supabase setup

Before creating a project, apply the SQL files in order from the Supabase SQL Editor:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_security_hardening.sql`
3. `supabase/migrations/003_execution_mvp.sql`
4. `supabase/migrations/004_function_execution_guard.sql`

Then open **Authentication → Providers** and enable **Anonymous Sign-Ins**.

## Local setup

```bash
git clone https://github.com/Syedsaadhhh/COMMONS-ALIBABA.git
cd COMMONS-ALIBABA
npm ci
cp .env.example .env.local
npm run dev
```

## Environment variables

```bash
NEXT_PUBLIC_SITE_URL=
DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen3.7-plus
DASHSCOPE_BASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use the OpenAI-compatible Model Studio endpoint for your own Alibaba workspace in `DASHSCOPE_BASE_URL`. Keep credentials in `.env.local` or Vercel environment variables. Never commit keys.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
```

## Team

| Team member | Role |
|---|---|
| Syed Saad | Technical Lead and Project Strategy |
| Areeba Muhammad | Product and Operations Lead |
| Mustafa Ahmed | Presentation and Pitch Lead |
| Urwa Rashid | Research and Project Support |
