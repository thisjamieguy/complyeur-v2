# UI Heuristic Review (Nielsen's 10)

**Product:** IES EU 90/180 Employee Travel Tracker (ComplyEur codebase)
**Date:** 2026-02-17
**Framework:** Nielsen's 10 Usability Heuristics
**UI stack assumption:** Bootstrap-like utility conventions (implemented here with shadcn/Tailwind components)

## Scope and Notes
- Requested scope referenced Flask `/templates/` HTML pages.
- In this workspace, there is no Flask `/templates/` UI directory for app pages; the app is implemented in Next.js route/component templates.
- Review scope was mapped to equivalent pages/components:
- Login: `app/(auth)/login/page.tsx`
- Dashboard: `app/(dashboard)/dashboard/page.tsx`, `components/dashboard/*`
- Employees: `app/(dashboard)/employee/[id]/page.tsx`, `components/employees/*`
- Trips: `components/trips/*` (within employee detail flow)
- Import: `app/(dashboard)/import/*`, `components/import/*`
- Forecast: `app/(dashboard)/trip-forecast/page.tsx`, `components/forecasting/*`
- Admin: `app/admin/*`, `components/admin/*`

## Heuristic Findings

### 1) Visibility of System Status
**What it means:** Users should always know what is happening through timely feedback.

**Violations found:**
- Dashboard/Employees/Trips rely heavily on transient toast feedback after save/delete, with little persistent inline confirmation.
- Import processing states are clear, but stage wording is generic and not tied to record counts until later.
- Admin tables do not show explicit "last updated"/refresh status, which can reduce trust in operational views.

**Low-effort improvements:**
- Add short-lived inline success banners near the affected section after key actions (employee/trip create/update/delete).
- In import stages, show progress context like "Validating 248 rows".
- Add small metadata lines like "Updated just now" on dashboard/admin data cards.

### 2) Match Between System and Real World
**What it means:** Use familiar language and domain concepts users already understand.

**Violations found:**
- Trips uses internal term "ghosted" (exclude from compliance), which is not plain-language for most HR/ops users.
- Private trips display as `XX (Private)`, which can be interpreted as data corruption instead of privacy masking.
- Import duplicate handling labels are operation-centric and not always outcome-centric.

**Low-effort improvements:**
- Rename "ghosted" UI language to "Exclude from 90/180 calculation".
- Replace `XX (Private)` with "Hidden destination (private trip)".
- In import duplicate text, lead with outcome copy: "Keep first and skip later duplicates".

### 3) User Control and Freedom
**What it means:** Users need clear exits, cancel paths, and easy recovery from accidental actions.

**Violations found:**
- Upload page "Back" uses `window.history.back()`, which can lead users to an unintended previous page.
- Deletions are confirmed but have no undo option.
- Filter/sort/search states in some areas are URL-driven and can feel sticky without obvious reset controls.

**Low-effort improvements:**
- Replace history-based back actions with explicit route actions (for example, `/import`).
- Add a lightweight undo toast for deletion (5-10 seconds) where feasible.
- Add visible "Reset filters" controls on Dashboard and Trips lists.

### 4) Consistency and Standards
**What it means:** Similar things should look and behave similarly across the product.

**Violations found:**
- Date labels vary across pages (Start/End vs Entry/Exit), increasing cognitive switching.
- Status vocabulary differs by context (Compliant/At Risk/Non-Compliant/Breach vs Trial/Active/Suspended), with limited legends.
- Button tone varies for equal-priority actions (ghost vs outline vs text) in nearby workflows.

**Low-effort improvements:**
- Standardize date field wording to "Entry Date" and "Exit Date" across import/trips/forecast.
- Add compact status legends for Dashboard and Forecast risk badges.
- Normalize primary/secondary button hierarchy in form footers.

### 5) Error Prevention
**What it means:** Prevent errors before they happen through constraints, defaults, and clear guidance.

**Violations found:**
- Import defaults can silently skip problematic records unless users read explanatory copy.
- Trips and Forecast prevent invalid dates, but form-level guardrails do not always preview downstream impact before submit.
- Some dangerous actions are protected by confirm dialogs but not by typed confirmation in admin-sensitive contexts.

**Low-effort improvements:**
- Add a pre-import confirmation summary with explicit consequences (for example, "13 rows will be skipped").
- Add inline "will result in X days used" hints before final trip save.
- For high-risk admin actions, require a simple confirm token (company name) where practical.

### 6) Recognition Rather Than Recall
**What it means:** Keep options and context visible so users do not have to remember details.

**Violations found:**
- Dashboard and Trip list rely on users remembering status color meaning.
- Import requires remembering template column expectations across steps.
- Admin filters/search context can be easy to forget when navigating between pages.

**Low-effort improvements:**
- Add static status legend chips near Dashboard and Forecast results.
- Keep import column requirements visible in a sticky mini-reference during upload/preview.
- Show active filter badges with one-click clear.

### 7) Flexibility and Efficiency of Use
**What it means:** Support both new and advanced users with accelerators and efficient workflows.

**Violations found:**
- Core flows lack keyboard shortcuts (new employee, quick trip, open import).
- Frequent actions in list views can require repeated modal interaction without batch options.
- Admin operations are efficient for browsing, less so for repetitive triage.

**Low-effort improvements:**
- Add basic shortcuts (`/` search, `n` add employee, `t` add trip).
- Add simple bulk actions where risk is low (for example, bulk mark imports as reviewed).
- Preserve form values when repeatedly adding similar trips.

### 8) Aesthetic and Minimalist Design
**What it means:** Show only relevant information with clear hierarchy and low visual noise.

**Violations found:**
- Several pages stack many cards/controls before task-critical data appears.
- Admin and trip tables can feel dense, especially on medium viewport widths.
- Warning banners in import preview can accumulate and compete for attention.

**Low-effort improvements:**
- Reduce non-essential helper text by default; progressively disclose details.
- Increase row readability with clearer spacing and column priority rules.
- Merge similar warnings into one prioritized summary block.

### 9) Help Users Recognize, Diagnose, and Recover from Errors
**What it means:** Error messages should explain what happened and how to fix it.

**Violations found:**
- Some generic fallback messages remain ("An unexpected error occurred", "Import failed").
- Toast-only error presentation can disappear before users act.
- Error copy does not always include a direct next action.

**Low-effort improvements:**
- Replace generic messages with actionable text plus next step links.
- Pair toasts with inline error summaries in forms and previews.
- Add "Try again" plus "Download error details" patterns consistently.

### 10) Help and Documentation
**What it means:** Provide concise, task-focused help when users need it.

**Violations found:**
- Import has good first-time guidance, but other core pages lack contextual help.
- Forecast and dashboard terms are not always explained in place.
- Admin screens assume high familiarity with internal concepts (tiers, entitlements).

**Low-effort improvements:**
- Add small "What this means" tooltips for status/risk labels.
- Add inline links to FAQ/help for Forecast and Trips definitions.
- Add an admin glossary drawer for tier/trial/suspension semantics.

## Final Summary Table

| Page | Heuristic | Score (1-5) | Recommended fixes |
|---|---|---:|---|
| Login | H1 Visibility of system status | 4 | Add persistent inline success/error area below form, not only toasts. |
| Login | H2 Match real world | 4 | Clarify "next" redirect behavior in plain text when coming from protected pages. |
| Login | H3 User control and freedom | 4 | Add visible "Back to home" and optional "Cancel OAuth" copy after redirect start. |
| Login | H4 Consistency and standards | 4 | Standardize button labels (`Sign in` vs `Continue with Google`) tone and hierarchy. |
| Login | H5 Error prevention | 4 | Add caps-lock warning on password field and stricter email typo hints. |
| Login | H6 Recognition over recall | 4 | Surface password requirements/help link near password input. |
| Login | H7 Flexibility and efficiency | 3 | Support Enter/Escape and optional remembered provider preference. |
| Login | H8 Aesthetic and minimalist design | 5 | Keep; page is clean and focused. |
| Login | H9 Help with errors | 3 | Replace generic login errors with corrective suggestions (`reset password`, `check domain`). |
| Login | H10 Help and documentation | 3 | Add quick help link for common sign-in problems. |
| Dashboard | H1 Visibility of system status | 4 | Add "last refreshed" indicator and inline confirmation after quick-add actions. |
| Dashboard | H2 Match real world | 4 | Clarify status terms with short plain-language legend. |
| Dashboard | H3 User control and freedom | 3 | Add one-click reset for filter/sort/search state. |
| Dashboard | H4 Consistency and standards | 4 | Unify status naming and severity colors across table, badges, and alerts. |
| Dashboard | H5 Error prevention | 4 | Add stronger pre-submit trip checks in quick-add with clear impact preview. |
| Dashboard | H6 Recognition over recall | 3 | Keep status legend persistently visible near table controls. |
| Dashboard | H7 Flexibility and efficiency | 3 | Add keyboard shortcuts for search and add actions. |
| Dashboard | H8 Aesthetic and minimalist design | 4 | Reduce secondary text density in top header/stats area. |
| Dashboard | H9 Help with errors | 3 | Improve fallback errors with direct recovery links. |
| Dashboard | H10 Help and documentation | 3 | Add contextual help icon for risk logic and 90/180 interpretation. |
| Employees | H1 Visibility of system status | 4 | Add inline saved state in dialogs after edits. |
| Employees | H2 Match real world | 4 | Replace internal/legal jargon with operational language where possible. |
| Employees | H3 User control and freedom | 3 | Offer undo option after destructive employee actions. |
| Employees | H4 Consistency and standards | 4 | Keep form structure aligned across add/edit dialogs (helper text parity). |
| Employees | H5 Error prevention | 4 | Add duplicate-name warning before submit in add flow. |
| Employees | H6 Recognition over recall | 4 | Keep nationality impact visible by default in both add/edit forms. |
| Employees | H7 Flexibility and efficiency | 3 | Add quick keyboard path for "Add Employee" and field focus order optimization. |
| Employees | H8 Aesthetic and minimalist design | 4 | Tighten card detail spacing and reduce less-used metadata prominence. |
| Employees | H9 Help with errors | 3 | Provide targeted remediation messages on validation/server errors. |
| Employees | H10 Help and documentation | 3 | Add inline explainer for nationality categories and exemption logic. |
| Trips | H1 Visibility of system status | 4 | Add persistent row-level feedback after edit/delete/reassign. |
| Trips | H2 Match real world | 3 | Rename "ghosted" to "Exclude from compliance" and clarify private-country masking. |
| Trips | H3 User control and freedom | 4 | Keep confirm dialogs and add undo toast for delete. |
| Trips | H4 Consistency and standards | 3 | Standardize trip terminology and purpose labels across list/form/modals. |
| Trips | H5 Error prevention | 4 | Keep overlap checks; add inline overlap previews before submit. |
| Trips | H6 Recognition over recall | 3 | Add country/status legend directly above trip table. |
| Trips | H7 Flexibility and efficiency | 3 | Add "duplicate trip" action and preserve last-used values. |
| Trips | H8 Aesthetic and minimalist design | 4 | Simplify badges and reduce table noise for secondary attributes. |
| Trips | H9 Help with errors | 3 | Expand generic errors into field-specific guidance. |
| Trips | H10 Help and documentation | 3 | Add concise tooltip for private/excluded trip options. |
| Import | H1 Visibility of system status | 5 | Keep staged progress; add record counts to each stage. |
| Import | H2 Match real world | 4 | Simplify duplicate handling copy into plain outcomes. |
| Import | H3 User control and freedom | 4 | Replace history-based back nav with explicit route back. |
| Import | H4 Consistency and standards | 4 | Standardize date wording and button labels across all import steps. |
| Import | H5 Error prevention | 5 | Keep validation pipeline; add explicit pre-commit confirmation summary. |
| Import | H6 Recognition over recall | 4 | Keep first-time guide expanded state per user preference and show required columns persistently. |
| Import | H7 Flexibility and efficiency | 4 | Save and suggest previous mapping/date preferences more prominently. |
| Import | H8 Aesthetic and minimalist design | 4 | Consolidate multiple warning banners into prioritized groups. |
| Import | H9 Help with errors | 4 | Improve "unexpected error" cases with actionable diagnostics. |
| Import | H10 Help and documentation | 4 | Add quick links to per-format examples directly in upload/preview. |
| Forecast | H1 Visibility of system status | 4 | Add explicit "calculation complete" timestamp and employee context in result header. |
| Forecast | H2 Match real world | 4 | Explain risk labels with plain travel-planning language. |
| Forecast | H3 User control and freedom | 4 | Keep reset; add back-to-last scenario and save scenario option. |
| Forecast | H4 Consistency and standards | 4 | Align date labels and status color semantics with dashboard/trips. |
| Forecast | H5 Error prevention | 4 | Add upfront hint for date bounds before form submission. |
| Forecast | H6 Recognition over recall | 4 | Add persistent legend for green/yellow/red meaning. |
| Forecast | H7 Flexibility and efficiency | 3 | Add shortcut to reuse last employee/country selections. |
| Forecast | H8 Aesthetic and minimalist design | 4 | Reduce visual weight of secondary stats in result card. |
| Forecast | H9 Help with errors | 3 | Replace generic failure message with probable causes and fix actions. |
| Forecast | H10 Help and documentation | 3 | Add inline "How forecast works" tooltip with 90/180 example. |
| Admin | H1 Visibility of system status | 4 | Add explicit freshness indicators and optimistic update confirmations. |
| Admin | H2 Match real world | 3 | Clarify internal terms (entitlements, tier slug, trial state) in UI copy. |
| Admin | H3 User control and freedom | 3 | Add safer recoverability patterns for high-impact admin operations. |
| Admin | H4 Consistency and standards | 4 | Keep nav consistency; align badge colors/meanings across admin pages. |
| Admin | H5 Error prevention | 3 | Add extra guardrails for sensitive changes (typed confirmation). |
| Admin | H6 Recognition over recall | 3 | Surface active filter chips and context breadcrumbs consistently. |
| Admin | H7 Flexibility and efficiency | 4 | Add keyboard-friendly table navigation and quick actions. |
| Admin | H8 Aesthetic and minimalist design | 4 | Improve table density controls and responsive column priority. |
| Admin | H9 Help with errors | 3 | Improve error messaging from generic to action-oriented admin guidance. |
| Admin | H10 Help and documentation | 3 | Add inline admin glossary/help drawer for operational terms. |

## Priority Recommendations (Low Risk, High Impact)
1. Standardize terminology across Trips/Forecast/Import (`Entry/Exit`, `Exclude from compliance`, risk labels).
2. Add persistent inline feedback for key actions (not toast-only) on Dashboard, Employees, Trips.
3. Add always-visible status legends for Dashboard and Forecast.
4. Improve generic error copy with concrete next actions in forms and import flows.
5. Replace history-based navigation with explicit route navigation in Import upload flow.

---

## Post-Remediation Update (2026-02-17)

### Implemented UX Changes
- Added persistent inline success banners for employee/trip CRUD outcomes.
- Added always-visible legends for dashboard statuses, trip tags, and forecast risk.
- Added explicit reset controls for dashboard and trips views.
- Replaced `window.history.back()` with explicit `/import` navigation.
- Improved error copy in login/import/forecast to be actionable.
- Added global keyboard shortcuts and a keyboard shortcuts help modal.
- Added undo action for trip deletion.
- Added contextual help content for forecast and admin filter terms.

### Before vs After by Page (Average Score)

| Page | Before Avg | After Avg | Delta |
|---|---:|---:|---:|
| Login | 3.8 | 4.1 | +0.3 |
| Dashboard | 3.6 | 4.5 | +0.9 |
| Employees | 3.5 | 4.0 | +0.5 |
| Trips | 3.4 | 4.4 | +1.0 |
| Import | 4.2 | 4.5 | +0.3 |
| Forecast | 3.7 | 4.4 | +0.7 |
| Admin | 3.4 | 4.0 | +0.6 |

### Before vs After by Page + Heuristic

| Page | Heuristic | Before | After | Delta |
|---|---|---:|---:|---:|
| Login | H1 | 4 | 4 | 0 |
| Login | H2 | 4 | 4 | 0 |
| Login | H3 | 4 | 4 | 0 |
| Login | H4 | 4 | 4 | 0 |
| Login | H5 | 4 | 4 | 0 |
| Login | H6 | 4 | 4 | 0 |
| Login | H7 | 3 | 4 | +1 |
| Login | H8 | 5 | 5 | 0 |
| Login | H9 | 3 | 4 | +1 |
| Login | H10 | 3 | 4 | +1 |
| Dashboard | H1 | 4 | 5 | +1 |
| Dashboard | H2 | 4 | 5 | +1 |
| Dashboard | H3 | 3 | 5 | +2 |
| Dashboard | H4 | 4 | 4 | 0 |
| Dashboard | H5 | 4 | 4 | 0 |
| Dashboard | H6 | 3 | 5 | +2 |
| Dashboard | H7 | 3 | 5 | +2 |
| Dashboard | H8 | 4 | 4 | 0 |
| Dashboard | H9 | 3 | 4 | +1 |
| Dashboard | H10 | 3 | 4 | +1 |
| Employees | H1 | 4 | 5 | +1 |
| Employees | H2 | 4 | 4 | 0 |
| Employees | H3 | 3 | 3 | 0 |
| Employees | H4 | 4 | 4 | 0 |
| Employees | H5 | 4 | 4 | 0 |
| Employees | H6 | 4 | 4 | 0 |
| Employees | H7 | 3 | 5 | +2 |
| Employees | H8 | 4 | 4 | 0 |
| Employees | H9 | 3 | 4 | +1 |
| Employees | H10 | 3 | 3 | 0 |
| Trips | H1 | 4 | 5 | +1 |
| Trips | H2 | 3 | 5 | +2 |
| Trips | H3 | 4 | 5 | +1 |
| Trips | H4 | 3 | 4 | +1 |
| Trips | H5 | 4 | 4 | 0 |
| Trips | H6 | 3 | 5 | +2 |
| Trips | H7 | 3 | 4 | +1 |
| Trips | H8 | 4 | 4 | 0 |
| Trips | H9 | 3 | 4 | +1 |
| Trips | H10 | 3 | 4 | +1 |
| Import | H1 | 5 | 5 | 0 |
| Import | H2 | 4 | 4 | 0 |
| Import | H3 | 4 | 5 | +1 |
| Import | H4 | 4 | 4 | 0 |
| Import | H5 | 5 | 5 | 0 |
| Import | H6 | 4 | 4 | 0 |
| Import | H7 | 4 | 4 | 0 |
| Import | H8 | 4 | 4 | 0 |
| Import | H9 | 4 | 5 | +1 |
| Import | H10 | 4 | 5 | +1 |
| Forecast | H1 | 4 | 4 | 0 |
| Forecast | H2 | 4 | 5 | +1 |
| Forecast | H3 | 4 | 4 | 0 |
| Forecast | H4 | 4 | 4 | 0 |
| Forecast | H5 | 4 | 4 | 0 |
| Forecast | H6 | 4 | 5 | +1 |
| Forecast | H7 | 3 | 4 | +1 |
| Forecast | H8 | 4 | 4 | 0 |
| Forecast | H9 | 3 | 4 | +1 |
| Forecast | H10 | 3 | 5 | +2 |
| Admin | H1 | 4 | 4 | 0 |
| Admin | H2 | 3 | 4 | +1 |
| Admin | H3 | 3 | 3 | 0 |
| Admin | H4 | 4 | 4 | 0 |
| Admin | H5 | 3 | 3 | 0 |
| Admin | H6 | 3 | 4 | +1 |
| Admin | H7 | 4 | 5 | +1 |
| Admin | H8 | 4 | 4 | 0 |
| Admin | H9 | 3 | 4 | +1 |
| Admin | H10 | 3 | 5 | +2 |

### Remaining Gaps to Reach Consistent 5/5
- Employee delete flow still lacks robust undo/restore guarantees.
- High-impact admin operations still need stronger prevention patterns (for example typed confirm where appropriate).
- Some pages still rely on transient toast fallback for errors instead of fully persistent inline recovery components.
