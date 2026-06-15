Date:
2026-06-04

Verified By:
James Walsh

Environment:
GitHub Production Repository

Repository:
thisjamieguy/complyeur-v2

Branch:
main

Before Result:
FAIL

After Result:
PASS

Protection Type:
GitHub classic branch protection rule

Settings Enabled:
- Require pull request before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Require conversation resolution before merging
- Enforce branch protection for administrators
- Disable force pushes
- Disable branch deletions

Required Checks Present:
- validate: PRESENT
- tenant-isolation: PRESENT
- e2e-baseline: PRESENT

Direct Push Protection:
Enabled

Evidence Files:
- 2026-06-04-branch-protection-enabled.png
- 2026-06-04-required-checks-enabled.png
- 2026-06-04-pull-request-protection-enabled.png
- 2026-06-04-main-branch-api-after.json
- 2026-06-04-main-branch-protection-after.json
- 2026-06-04-main-check-runs-after.json
- 2026-06-04-branch-protection-payload.json

Verification Source:
- GitHub REST API live branch metadata:
  https://api.github.com/repos/thisjamieguy/complyeur-v2/branches/main
- GitHub REST API live branch protection metadata:
  https://api.github.com/repos/thisjamieguy/complyeur-v2/branches/main/protection

Notes:
The branch protection rule was applied through the GitHub REST API using an
administrator-authenticated GitHub CLI session for `thisjamieguy`.

Live after-fix metadata returned `"protected": true` for `main`. The branch
protection response returned `required_status_checks.strict: true` and required
contexts/checks for `validate`, `tenant-isolation`, and `e2e-baseline`.

Pull request protection is enabled through the `required_pull_request_reviews`
branch protection object. The required approval count is `0`, so pull requests
are required before merging, but additional approval count requirements were not
added beyond the beta minimum.

Direct pushes are blocked by the required pull request gate with administrator
enforcement enabled. Force pushes and branch deletions are disabled.
