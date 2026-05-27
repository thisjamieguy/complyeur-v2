# Phase Execution Prompt And Results Log

Use this document when working through `docs/GO_LIVE_CHECKLIST.md`.

---

## Reusable Phase Prompt

Copy this prompt into Codex when you want it to carry out one phase of the master production readiness checklist.

```text
You are acting as my senior production-readiness engineer for ComplyEur.

Work through Phase [PHASE NUMBER AND NAME] from:
docs/GO_LIVE_CHECKLIST.md

Rules:
- Do not mark anything complete unless you have direct evidence.
- Run automated checks where possible.
- For checks that require dashboards, secrets, email inboxes, Stripe, Supabase, Vercel, Sentry, DNS, or browser/manual confirmation, tell me exactly what I need to verify and what evidence to record.
- If any check fails, stop and clearly report the blocker, likely cause, and next action.
- Do not change unrelated code.
- Do not use destructive commands.
- Do not expose or print secrets.
- Work from the project root: /Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur

For this phase, produce:
1. A pass/fail/blocked result for every checklist item in the phase.
2. The command outputs or evidence needed for each completed item.
3. A short blocker list ordered by launch risk.
4. A clear go/no-go recommendation for this phase only.
5. A filled results log entry using the template in docs/operations/PHASE_EXECUTION_PROMPT_AND_RESULTS.md.

Phase to run:
[PASTE THE PHASE SECTION FROM GO_LIVE_CHECKLIST.md HERE]
```

---

## Fast Phase Prompt

Use this shorter version when you already know which phase you want to run.

```text
Run Phase [NUMBER] of docs/GO_LIVE_CHECKLIST.md as a production-readiness gate.

Verify every item you can directly verify, list anything that needs my manual confirmation, and fill out a phase results log entry. Stop on any blocker that would make this phase NO-GO.
```

---

## Results Log Template

Copy this section for each phase you run.

```markdown
## Phase [NUMBER]: [NAME]

Date:
Release / commit:
Environment:
Run by:
Decision: GO / SOFT GO / NO-GO / BLOCKED

### Summary

Overall result:
Main risks:
Manual evidence still needed:

### Checklist Results

| Item | Result | Evidence / Notes |
|------|--------|------------------|
| [Checklist item] | PASS / FAIL / BLOCKED / N/A | [Command, screenshot, dashboard link, or manual note] |

### Commands Run

```bash
[command]
```

Result:

```text
[important output summary]
```

### Manual Checks Needed

- [ ] [Manual check]
- [ ] [Manual check]

### Blockers

| Severity | Blocker | Owner | Next Action |
|----------|---------|-------|-------------|
| Critical / High / Medium / Low | [Issue] | [Name] | [Action] |

### Accepted Risks

| Risk | Reason Accepted | Owner | Follow-up Date |
|------|-----------------|-------|----------------|
| [Risk] | [Reason] | [Name] | [Date] |

### Evidence Links

- CI:
- Vercel:
- Supabase:
- Stripe:
- Sentry:
- Uptime:
- Screenshots / notes:

### Phase Recommendation

Recommendation:
Reason:
Next phase allowed: Yes / No
```

---

## Status Terms

- `PASS`: verified with direct evidence.
- `FAIL`: checked and did not meet the release standard.
- `BLOCKED`: cannot verify until access, credentials, dashboard confirmation, or another dependency is available.
- `N/A`: not applicable to this release, with reason recorded.
- `SOFT GO`: acceptable for private beta only, not public production.
- `GO`: acceptable to proceed to the next phase.
- `NO-GO`: must fix before proceeding.

