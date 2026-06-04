# Documentation Map

This repository keeps the engineering root focused on source, config, tests, and automation. Supporting documents belong under `docs/`.

## Sections

- `architecture/`: Architecture decisions, environment model, migration workflow
- `audits/`: Broad product and codebase assessments
- `beta/`: Beta launch planning, metrics, known issues, and outcomes
- `billing/`: Stripe pricing and billing operations
- `compliance/`: Compliance programs and evidence material
- `engineering/`: Engineering memory, durable decisions, ADRs, and recurring lessons
- `internal/`: Private/internal notes, one-off prompt documents, and investigation notes
- `legal/`: Legal templates and policy support docs
- `marketing/blog-drafts/`: Draft content and publication working files
- `operations/`: Release, go-live, and operating checklists
- `plans/`: Feature design and implementation planning docs
- `release/`: Current release source of truth, audit inventories, and go/no-go summaries
- `security/`: Security audits, pentest material, and authorization reviews
- `standards/`: Coding, security, testing, and AI-agent governance standards
- `testing/`: Test strategy and quality references

## Root Hygiene

- Keep new markdown files out of the repo root unless they are primary entrypoints such as `README.md`, `CHANGELOG.md`, `AGENTS.md`, or `CLAUDE.md`.
- Prefer adding operational, audit, planning, and draft content under the relevant `docs/` subfolder.
