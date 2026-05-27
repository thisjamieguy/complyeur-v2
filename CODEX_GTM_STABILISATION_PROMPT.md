# Title: ComplyEur Private Beta GTM Stabilisation Pass

## Best Model
Use GPT-5.5 High / highest reasoning mode.

## Required First Step
Read and follow `PROMPT_WRITING_RULES.md` before making any changes. If the file exists, treat it as authoritative. If it does not exist, continue using this prompt and state that the rules file was not found.

## Context
ComplyEur is a Next.js + Supabase + TypeScript B2B SaaS for Schengen 90/180-day employee travel compliance.

A recent GTM readiness audit rated the app:
- Verdict: Private Beta Only
- Score: 5.2/10

The goal of this task is to fix the highest-impact private-beta readiness blockers without redesigning the whole app.

## Branch
Create or use this branch:

`codex/private-beta-gtm-stabilisation`

## Scope
Carry out these fixes only:

1. Fix `/landing` SEO/indexability
   - Ensure the production landing route is indexable.
   - Resolve conflict where `/landing` is in sitemap but inherits `noindex,nofollow`.
   - Keep preview-only pages noindexed if appropriate.
   - Verify sitemap and metadata are consistent.

2. Fix failing middleware/auth redirect unit tests
   - Investigate `__tests__/unit/middleware-security-headers.test.ts`.
   - Investigate `proxy.ts`.
   - Decide whether middleware behavior or tests are wrong.
   - Apply the smallest correct fix.
   - Do not weaken auth/security behavior.

3. Add a credible `/security` page
   - Create a professional B2B SaaS security/trust page.
   - Include only claims supported by current app/repo evidence.
   - Cover:
     - Supabase/Postgres hosting
     - authentication/session controls
     - Row Level Security / tenant isolation, if implemented
     - encryption in transit
     - backups/disaster recovery status if documented
     - GDPR/privacy posture
     - subprocessors
     - incident/security contact
     - current certification status honestly stated
   - Do not claim SOC 2, ISO 27001, Cyber Essentials, penetration testing, or formal certification unless directly evidenced.

4. Add or improve structured demo/contact intake
   - Do not rely only on `mailto:`.
   - Add a simple B2B enquiry/demo route or form if missing.
   - Capture:
     - name
     - work email
     - company
     - role
     - approximate employee count
     - number of employees travelling to Schengen/EU
     - current tracking method
     - urgency/timeline
     - message
   - If backend email/storage is not safely available, implement a safe non-destructive first pass and clearly document what remains.

5. Add/update documentation
   - Add or update docs with:
     - required production/build env vars
     - private beta readiness notes
     - remaining GTM blockers after this pass

## Design Rules
Follow existing ComplyEur design standards:
- B2B SaaS, professional, trustworthy, clear
- No sparkles
- No playful/consumer styling
- No fake testimonials
- No unsupported trust claims
- Prefer consistent `rounded-xl`, `shadow-sm`, clear spacing, sober copy
- Avoid broad visual redesign

## Non-Goals
Do NOT:
- perform a full landing page redesign
- change pricing strategy deeply
- add major dependencies
- perform major package upgrades
- alter billing logic beyond necessary private-beta/demo flow support
- weaken security controls
- invent legal/company details
- fake customer logos, testimonials, certifications, or audits

## Verification Commands
Run:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
```

If pnpm build requires env vars, document exactly which are required. Do not fake secrets.

Also run focused tests for any changed files where practical.

## Deliverables

At the end, provide:

1. Executive summary
2. Files changed
3. Exact fixes implemented
4. Verification command results
5. Any tests still failing and why
6. Remaining private-beta blockers
7. Whether this branch is safe to merge
8. Recommended next branch after this one

## Acceptance Criteria

This task is successful only if:

* /landing is no longer accidentally noindexed
* sitemap/robots metadata are consistent
* middleware/auth redirect tests are either fixed or clearly justified
* a credible /security page exists
* demo/contact flow is more credible than mailto-only
* env requirements are documented
* no unsupported trust/security claims are introduced
* lint/typecheck/unit tests pass, or any failure is clearly unrelated and documented

Be conservative. Prefer small correct fixes over broad rewrites.
