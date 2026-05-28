# AI Agent Rules

AI agents are helpers, not sources of truth. Repository evidence wins over historical memory and generated summaries.

## Source Of Truth Order

1. Current code, migrations, config, and package manifests
2. Current automated tests and audit evidence
3. Current engineering, architecture, security, and standards docs
4. Historical memory, older audits, and AI-context notes

## Before Editing

- Read the smallest relevant set of files before proposing or changing code.
- Check `AGENTS.md`, `docs/README.md`, and the relevant standards document for the task.
- Verify old memory claims against current implementation before using them.
- Preserve user changes and unrelated dirty worktree state.

## During Editing

- Do not modify production business logic unless the task explicitly requires it.
- Do not add dependencies for convenience.
- Do not import raw chat exports, raw AI memories, screenshots containing secrets, or debug logs.
- Prefer concise docs that explain durable decisions, risks, and review requirements.

## Handoff

- Report changed files, verification commands, and unresolved risks.
- Flag stale or contradictory docs instead of silently pretending certainty.
- Do not create commits unless explicitly asked.
