# Coding Standards

ComplyEur code should be easy to audit, easy to test, and hard to misuse.

## Core Rules

- Treat `package.json`, `tsconfig.json`, migrations, and existing local patterns as the source of truth.
- Use TypeScript for new application code. Avoid `any`; when it is unavoidable, keep it local and explain why.
- Prefer small, single-purpose changes. Do not refactor unrelated code while fixing a bug.
- Keep domain logic out of UI components when it is shared, security-sensitive, or compliance-sensitive.
- Use existing helpers and modules before adding new abstractions.
- Keep comments focused on non-obvious business rules, compliance behavior, or security constraints.

## Next.js And React

- Use Server Components by default in App Router routes.
- Add `'use client'` only for browser APIs, local interactive state, or client-only libraries.
- Keep server actions and API routes defensive: validate input, check authorization, and return user-safe errors.
- Avoid placeholder links, fake data, and non-functional UI controls in committed product surfaces.

## Data And Dates

- Use ISO date strings for compliance calculations and persisted trip dates.
- Do not use native JavaScript `Date` parsing for 90/180-day rule logic.
- Keep database types generated and aligned with migrations.

## Review Checklist

- Does the change match existing structure and naming?
- Are validation and authorization handled at the server boundary?
- Are edge cases covered without broad rewrites?
- Would an auditor understand why this code exists?
