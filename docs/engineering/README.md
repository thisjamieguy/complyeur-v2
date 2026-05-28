# Engineering Memory

This directory contains durable engineering memory for ComplyEUR: decisions, recurring risks, and lessons that should survive individual AI sessions.

## Source Of Truth

1. Repository code, migrations, and configuration.
2. Automated tests and in-repo verification artifacts.
3. Current engineering docs in `docs/architecture/`, `docs/security/`, `docs/operations/`, and this directory.
4. Historical memory docs and AI-derived summaries, only when explicitly marked as verified or useful context.

Historical AI context is not authoritative. If it conflicts with code, tests, or current canonical docs, treat it as stale and update or quarantine it.

## Documents

- `architecture-decisions.md`: Current architectural rationale and verified alignment.
- `security-decisions.md`: Security posture and durable security rules.
- `algorithm-decisions.md`: Compliance-engine boundaries and correctness rules.
- `recurring-problems.md`: Repeated failure modes that should become checks or tests.
- `mistakes-and-lessons.md`: Historical lessons worth preserving.
- `adr/`: Lightweight Architecture Decision Records.

Current ADRs:

- `adr/ADR-001-multi-tenant-rls-strategy.md`
- `adr/ADR-002-compliance-engine-boundaries.md`
- `adr/ADR-003-audit-log-immutability.md`

Repository-wide standards live in `docs/standards/`.

## Maintenance Rules

- Keep this directory concise. Link to detailed audits instead of copying them.
- Include repository evidence for claims when practical.
- Mark stale or historical context explicitly.
- Do not store raw chat exports, secrets, customer data, or personal data here.
