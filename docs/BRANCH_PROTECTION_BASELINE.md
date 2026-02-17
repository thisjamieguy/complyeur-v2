# Branch Protection Baseline (main)

Apply these settings in GitHub repository settings for `main`:

1. Require a pull request before merging.
2. Require at least 1 approving review.
3. Dismiss stale approvals when new commits are pushed.
4. Require status checks to pass before merging:
   - `validate` (from `.github/workflows/ci.yml`)
5. Require branches to be up to date before merging.
6. Restrict who can push to matching branches (no direct pushes except admins if necessary).
7. Disable force pushes.
8. Disable branch deletion.

Recommended additional controls:
- Enable signed commits.
- Enable secret scanning alerts and push protection.
- Enable Dependabot security updates.
