# Beta Verification Automation

Last updated: 2026-06-16

This guide explains which private-beta checks ComplyEur can now verify from the
repo, which checks can be partially assisted, and which checks still require a
human decision or external dashboard access.

## What Codex Can Verify

Fully automated from the repo:

- Generate a timestamped evidence log in `docs/operations/evidence/`
- Probe a deployed `/api/health` endpoint and fail fast if it is not healthy
- Check that the beta verification docs, helper scripts, and evidence directory
  are present
- Classify the remaining gates so the release owner does not miss a step

Partially automated from the repo:

- Check whether required env var names are loaded in the current shell without
  printing their values
- Run the existing Stripe webhook validation script
- Trigger test email helpers, while leaving inbox placement and rendering to a
  human recipient
- Reuse existing Playwright baseline coverage to reduce the manual surface area
- Prepare structured evidence capture before a restore tabletop or launch review
- Capture public and protected health evidence when production secrets are
  available locally and are not printed

Manual only:

- Gmail, Outlook, and corporate inbox deliverability
- Password reset token reuse and post-reset session behavior
- Real-device Safari and Android Chrome passes
- Screen reader, ad blocker, and dark-mode email checks
- Sentry alert recipients and test-alert delivery
- Supabase backup/PITR dashboard verification and restore-drill sign-off
- SPF/DKIM/DMARC verification and legal review

## Commands

Create an evidence log before starting manual checks:

```bash
pnpm beta:evidence -- --slug private-beta --env-url https://your-beta-url
```

Preview the output path without writing a file:

```bash
pnpm beta:evidence -- --slug private-beta --env-url https://your-beta-url --dry-run
```

Classify remaining gates and check repo helper coverage:

```bash
pnpm beta:manual-gates
```

Probe the deployed health endpoint:

```bash
pnpm beta:health -- --base-url https://your-beta-url
```

Smoke-test the helper itself in a restricted environment:

```bash
pnpm beta:health -- --self-test
```

Optional helper checks already in the repo:

```bash
pnpm billing:webhook:check
pnpm email:auth:sync
pnpm email:test your-address@example.com
pnpm email:dns:check -- --domain complyeur.com --dkim-selector your-selector
pnpm test:e2e:baseline
```

## Where To Record Evidence

- Generated evidence logs belong in `docs/operations/evidence/`
- Use `docs/operations/BETA_EVIDENCE_LOG_TEMPLATE.md` as the source template
- Capture screenshots, dashboard links, or issue references directly in the
  generated evidence file

## How To Decide If Beta Is Safe To Proceed

Beta is safe to proceed only when all of the following are true:

1. Automated repo checks are green:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm beta:manual-gates`
   - `pnpm beta:health -- --base-url ...`
2. Critical manual gates are completed and recorded:
   - email deliverability
   - password reset behavior
   - non-founder core journey
   - recovery tabletop evidence
   - Sentry alert routing evidence
   - tester brief and known-issues distribution
3. No unresolved critical blocker remains in
   `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`

If any critical blocker remains open, beta is not ready for invite.
