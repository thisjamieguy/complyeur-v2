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

Evidence Files:
- 2026-06-04-branch-protection-settings.png
- 2026-06-04-required-status-checks.png
- 2026-06-04-pull-request-requirements.png
- 2026-06-04-main-branch-api.json

Verification Source:
GitHub REST API live branch metadata:
https://api.github.com/repos/thisjamieguy/complyeur-v2/branches/main

Result:
FAIL

Required Checks Present:
- validate: MISSING
- tenant-isolation: MISSING
- e2e-baseline: MISSING

Pull Request Requirements:
- Require pull request before merging: NOT ENFORCED
- Require approvals: NOT VERIFIED AS ENFORCED

Direct Push Protection:
- Direct pushes to main are NOT blocked by branch protection.

Notes:
GitHub returned `"protected": false` for the live `main` branch. The returned
branch protection metadata shows status check enforcement is `off` and both
`required_status_checks.contexts` and `required_status_checks.checks` are empty.

Authenticated GitHub Settings UI access was not available during this run
because the local `gh` token was invalid and the device login was not completed.
The recorded result is still a live GitHub result from the production repository
public REST API and is sufficient to fail the beta branch protection requirement:
`main` is not currently protected.
