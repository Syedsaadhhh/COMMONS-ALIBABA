# COMMONS

**From a local problem to work people can follow.**

COMMONS is a civic coordination platform built for the Alibaba Cloud AI Hackathon Pakistan 2026. It gives a community report a clear next step: a reviewable project, practical tasks, measurable progress, and evidence that stays attached to the work.

**Live app:** [commons-alibaba.vercel.app](https://commons-alibaba.vercel.app)

## What COMMONS does

- Lets people report a local problem with a precise location, direct observations, and up to three supporting photos.
- Uses Qwen to turn the report into a concise project draft with an objective, tasks, KPIs, and evidence requirements.
- Requires human review and confirmation before a draft becomes a project.
- Keeps work visible through task updates, sourced KPI readings, evidence check-ins, before/after views, and an Evidence / Impact Passport.
- Surfaces possible duplicate reports so people can corroborate existing work instead of creating silent duplicates.

Qwen helps organise a report. It does not verify a claim, approve evidence, or decide that a project is complete.

## How the flow works

1. **Report** — describe the problem, add its location, and optionally attach photos.
2. **Draft** — Qwen creates a structured, reviewable plan. A configured vision model can use the photos as extra scene context.
3. **Confirm** — a person checks the draft and creates the project.
4. **Work** — the workspace tracks tasks, measurements, evidence, corroboration, and review activity.
5. **Inspect** — the project passport brings the record together without pretending uncertainty has disappeared.

## Privacy and trust boundaries

- Report photos accept JPEG, PNG, and WebP. A user can select up to three photos, up to 5 MB each; they are optimised before the planning request.
- Project photos are uploaded only after human confirmation and are kept in private Supabase Storage. The application uses short-lived signed URLs for display.
- Evidence can be an external source link or an uploaded file. Uploaded evidence is hashed from the file bytes.
- Device location is opt-in. COMMONS does not infer location from image metadata.
- Anonymous Supabase sessions are used for low-friction participation, while row-level security limits project and media access to the relevant user and project members.
- If visual analysis is unavailable, the API falls back to text-only planning and marks that visual analysis was not used. It never manufactures an image verdict.

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

Set the values in `.env.local`; never commit it.

| Variable | Purpose |
| --- | --- |
| `DASHSCOPE_API_KEY` | Server-side Alibaba Cloud Model Studio API key |
| `DASHSCOPE_MODEL` | Text planning model; `qwen-plus` is the default |
| `DASHSCOPE_VISION_MODEL` | Optional visual model for attached photos; use `qwen3-vl-flash` for the current balanced default |
| `DASHSCOPE_BASE_URL` | Optional Model Studio OpenAI-compatible endpoint override |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service key |

## Database setup

Apply the migrations in order, then enable **Anonymous Sign-Ins** in Supabase Authentication.

```text
001_initial_schema.sql
002_security_hardening.sql
003_execution_mvp.sql
004_function_execution_guard.sql
005_fix_project_policy_recursion.sql
006_civic_trust.sql
007_final_security_integrity.sql
008_proof_loop.sql
009_security_cleanup.sql
010_project_images.sql
011_evidence_media.sql
```

The final two migrations add private media buckets, project-image records, evidence storage keys, storage policies, and supporting indexes.

## Verify changes

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Team

| Team member | Role |
| --- | --- |
| Syed Saad | Technical Lead and Project Strategy |
| Areeba Muhammad | Product and Operations Lead |
| Mustafa Ahmed | Presentation and Pitch Lead |
| Urwa Rashid | Research and Project Support |

## License

Released under the [MIT License](LICENSE).
