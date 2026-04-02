# E2E Page Coverage Matrix

This matrix records how each route is currently reviewed.

Legend:
- `direct smoke` means Playwright opens the page directly and checks the primary heading or page-specific text.
- `workflow-covered` means the page is exercised through a real user flow rather than as an isolated direct URL.
- `restricted` means the current E2E account should be denied or redirected.
- `needs privileged/stateful setup` means the page exists but requires special tokens, elevated roles, or exact server state for meaningful automation.

## Public and Preview

| Route | Type | Current status |
| --- | --- | --- |
| `/` | redirect | direct smoke |
| `/landing` | public | direct smoke |
| `/pricing` | public | direct smoke |
| `/about` | public | direct smoke |
| `/faq` | public | direct smoke |
| `/contact` | public | direct smoke |
| `/blog` | public index | direct smoke |
| `/blog/[slug]` | dynamic public | direct smoke via blog index |
| `/privacy` | public legal | direct smoke |
| `/terms` | public legal | direct smoke |
| `/cookies` | public legal | direct smoke |
| `/accessibility` | public legal | direct smoke |
| `/landing/preview` | preview | direct smoke |
| `/landing-sandbox` | preview variant | direct smoke |
| `/landing/sandbox` | legacy redirect | direct smoke as redirect |

## Auth and Account Recovery

| Route | Type | Current status |
| --- | --- | --- |
| `/login` | auth | direct smoke |
| `/signup` | auth | direct smoke |
| `/forgot-password` | auth recovery | direct smoke |
| `/reset-password` | auth recovery | direct smoke |
| `/check-email` | auth confirmation | direct smoke |
| `/unsubscribe` | public token page | direct smoke for current missing-token redirect behaviour |
| `/mfa` | authenticated security | direct smoke with signed-in account |

## Core App

| Route | Type | Current status |
| --- | --- | --- |
| `/dashboard` | core app | direct smoke + auth smoke |
| `/calendar` | core app | direct smoke + auth navigation |
| `/import` | core app | direct smoke + auth navigation |
| `/import/upload?format=employees` | step page | direct smoke |
| `/import/preview` | step page | workflow-covered by import happy path |
| `/import/success` | step page | workflow-covered by import happy path |
| `/exports` | core app | direct smoke |
| `/trip-forecast` | core app | direct smoke + auth navigation |
| `/future-job-alerts` | core app | direct smoke + auth navigation |
| `/settings` | core app | direct smoke + auth navigation |
| `/settings/import-history` | settings subpage | direct smoke |
| `/settings/mappings` | settings subpage | direct smoke |
| `/settings/team` | settings subpage | direct smoke |
| `/employee/[id]` | dynamic app | direct smoke via dashboard table |
| `/onboarding` | onboarding | needs stateful setup |

## Restricted and Owner/Admin Areas

| Route | Type | Current status |
| --- | --- | --- |
| `/gdpr` | owner/admin gated | direct smoke with current owner-level E2E account |
| `/admin` | superadmin | restricted for standard E2E account |
| `/admin/activity` | superadmin | restricted for standard E2E account |
| `/admin/companies` | superadmin | restricted for standard E2E account |
| `/admin/companies/[id]` | dynamic superadmin | needs privileged + stateful setup |
| `/admin/feedback` | superadmin | restricted for standard E2E account |
| `/admin/metrics` | superadmin | restricted for standard E2E account |
| `/admin/settings` | superadmin | restricted for standard E2E account |
| `/admin/tiers` | superadmin | restricted for standard E2E account |

## Diagnostics and Internal Tools

| Route | Type | Current status |
| --- | --- | --- |
| `/test-endpoints` | internal diagnostics | not included in standard smoke run |

## Workflow Suites Already Used

| Flow | Current status |
| --- | --- |
| Public smoke | passing |
| Auth smoke | passing |
| Auth navigation | passing |
| Employee import happy path | passing |

## Remaining Gaps Worth Doing Next

1. Import failure path and validation error flow.
2. Dashboard/oracle verification for compliance calculations.
3. Privileged route coverage with an owner/admin or superadmin test account.
4. Onboarding-specific flow coverage with a fresh un-onboarded account.
