# Branch Protection Baseline

Last updated: 2026-06-15

## Status

Baseline branch protection for `main` is evidenced complete for private beta in
`docs/operations/evidence/branch-protection/2026-06-04-branch-protection-after-fix.md`.

Expanded CodeQL and dependency-security workflow run evidence is tracked
separately in `docs/operations/evidence/EVIDENCE_STATUS.md`.

## Required Baseline Settings

Apply these settings in GitHub repository settings for `main`:

1. Require a pull request before merging.
2. Require status checks to pass before merging:
   - `validate` (from `.github/workflows/ci.yml`)
   - `tenant-isolation`
   - `e2e-baseline`
   - Note: `tenant-isolation` and `e2e-baseline` remain required check names,
     but the CI workflow may complete them as fast no-op checks when a pull
     request does not touch files in their risk surface.
3. Require branches to be up to date before merging.
4. Require conversation resolution before merging.
5. Enforce branch protection for administrators.
6. Disable force pushes.
7. Disable branch deletion.

## Evidence Notes

- 2026-06-04 GitHub API evidence returned `protected: true` for `main`.
- Required checks were present for `validate`, `tenant-isolation`, and
  `e2e-baseline`.
- Pull requests are required before merging.
- The captured evidence did not add an approval-count requirement beyond the
  private-beta baseline.

Recommended additional controls:
- Require at least 1 approving review before broader/public release.
- Dismiss stale approvals when new commits are pushed before broader/public release.
- Enable signed commits.
- Enable secret scanning alerts and push protection.
- Enable Dependabot security updates.
