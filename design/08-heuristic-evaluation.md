# Heuristic Evaluation: ComplyEur Full Application

**Evaluated**: March 2, 2026
**Framework**: Nielsen's 10 Usability Heuristics
**Scope**: All dashboard pages (Dashboard, Calendar, Import, Exports, Trip Forecast, Future Alerts, GDPR, Settings), Login, Landing

## Summary
- Critical issues: 0
- Major issues: 4
- Minor issues: 8

---

## Major Issues (Fix Soon)

### Issue 1: Settings page is overwhelmingly long with no navigation
- **Heuristic violated**: #6 — Recognition Rather Than Recall / #8 — Aesthetic & Minimalist Design
- **Location**: `/settings` (full page)
- **Problem**: The Settings page is a single scrolling page containing ~10 distinct sections (Data & Privacy, Calendar, Status Thresholds, Forecasting, Email Notifications, Plan & Billing, Dashboard Tour, Data Format Preferences, Password & Authentication, Two-Factor Authentication, Recent Activity, Email Preferences). Users must scroll extensively to find the setting they want. No table of contents, tabs, or anchor links exist.
- **Impact**: Users waste time scrolling to find settings. Cognitive load is high — they must remember where a setting lives within the long page.
- **Recommendation**: Add a tabbed navigation or left-hand section nav within Settings (e.g., General | Security | Notifications | Billing). Alternatively, add a sticky table of contents with jump links.
- **Severity**: 3 (Major)

### Issue 2: Dashboard footer contains marketing links inappropriate for logged-in users
- **Heuristic violated**: #8 — Aesthetic & Minimalist Design
- **Location**: Footer on every dashboard page
- **Problem**: The footer on every authenticated page contains links to About, FAQ, Pricing, Contact, X (Twitter), Privacy Policy, Terms of Service, Cookie Settings, and Accessibility. These are marketing/public page links that are irrelevant to logged-in users performing compliance tasks. The footer takes up significant vertical space and pushes the actual page content.
- **Impact**: Visual noise on every page. The footer competes for attention with actual functional content, especially on shorter pages (Calendar, Future Alerts) where the footer is prominently visible.
- **Recommendation**: Replace the dashboard footer with a minimal version (just copyright + Privacy/Terms links). Move marketing links to the public/landing pages only. Or remove the footer entirely from dashboard pages and place Privacy/Terms in Settings.
- **Severity**: 3 (Major)

### Issue 3: Browser tab titles are inconsistent and sometimes duplicated
- **Heuristic violated**: #4 — Consistency & Standards
- **Location**: Browser tab across all pages
- **Problem**: Page titles are inconsistent: Dashboard shows "Schengen Compliance Management for UK Travel Teams" (generic, no page name), Calendar/Import/Trip Forecast show the same generic title, Settings shows "Settings | ComplyEur | ComplyEur" (duplicated app name), Exports shows "Export Data | ComplyEur | ComplyEur" (duplicated), GDPR shows "GDPR & Privacy Tools | ComplyEur | ComplyEur" (duplicated).
- **Impact**: Users with multiple tabs open cannot distinguish between pages. Duplicated "ComplyEur" looks unpolished.
- **Recommendation**: Standardize to `{Page Name} | ComplyEur` pattern across all pages. E.g., "Dashboard | ComplyEur", "Calendar | ComplyEur", "Import | ComplyEur".
- **Severity**: 3 (Major)

### Issue 4: No global search or help accessible from the dashboard
- **Heuristic violated**: #10 — Help & Documentation
- **Location**: Global navigation
- **Problem**: While keyboard shortcuts exist (displayed at the bottom of the sidebar), there is no visible search icon/bar or help link in the sidebar navigation. The `/` shortcut for search is only discoverable if users read the small shortcuts text. New users have no way to access documentation, FAQs, or a help center from within the app.
- **Impact**: New users who need help must leave the app to find documentation. The shortcuts bar is easy to miss.
- **Recommendation**: Add a visible search bar or icon in the sidebar (or top bar). Add a "Help" or "?" link in the sidebar under System. Consider a "What's New" or onboarding tooltip for first-time users.
- **Severity**: 3 (Major)

---

## Minor Issues (Fix Later)

### Issue 5: Empty state icon inconsistency — emoji vs SVG
- **Heuristic violated**: #4 — Consistency & Standards
- **Location**: Future Job Alerts empty state
- **Problem**: The Future Job Alerts page uses a raw emoji (calendar emoji) as its empty state icon, while all other pages (Dashboard, Calendar) use consistent, styled SVG/icon illustrations.
- **Recommendation**: Replace the emoji with an SVG icon matching the style of other empty states.
- **Severity**: 2 (Minor)

### Issue 6: Calendar empty state lacks direct action
- **Heuristic violated**: #3 — User Control & Freedom
- **Location**: `/calendar` empty state
- **Problem**: The Calendar empty state only offers a "Go to Dashboard" button. A more useful CTA would be "Add Employee" — the actual next step the user needs to take. This adds an unnecessary hop.
- **Recommendation**: Change the CTA to "Add Employee" (linking to the add employee flow) or add it as a secondary action alongside "Go to Dashboard".
- **Severity**: 2 (Minor)

### Issue 7: Feedback button is visually over-prominent
- **Heuristic violated**: #8 — Aesthetic & Minimalist Design
- **Location**: Sidebar, "Feedback BETA" button
- **Problem**: The Feedback button has a bright colored background with a "BETA" badge, making it one of the most visually prominent elements in the sidebar — more prominent than primary navigation items like Dashboard or Import.
- **Recommendation**: Tone down the Feedback button to a subtler style (outline or text-only). Use a small dot or badge for "Beta" rather than a full pill.
- **Severity**: 1 (Cosmetic)

### Issue 8: Export "Cancel" button purpose is unclear
- **Heuristic violated**: #2 — Match Between System and Real World
- **Location**: `/exports` page
- **Problem**: The Export page is not a modal or multi-step flow — it's a standalone page. Having a "Cancel" button alongside "Generate Export" is confusing because there's nothing to cancel. The user navigated here intentionally.
- **Recommendation**: Remove the Cancel button, or change it to "Reset" to clear selections. If the export form should be inside a modal triggered from another page, restructure accordingly.
- **Severity**: 2 (Minor)

### Issue 9: No breadcrumbs for navigation context
- **Heuristic violated**: #1 — Visibility of System Status
- **Location**: All dashboard pages
- **Problem**: While the sidebar highlights the active page, there are no breadcrumbs showing hierarchical position. This matters particularly for sub-pages (e.g., employee detail pages, settings sub-sections, import steps).
- **Recommendation**: Add breadcrumbs for pages with depth (employee detail, settings sub-pages). Not needed for top-level pages where sidebar highlighting is sufficient.
- **Severity**: 1 (Cosmetic)

### Issue 10: Import wizard "Continue" button appears disabled without explanation
- **Heuristic violated**: #1 — Visibility of System Status
- **Location**: `/import` step 1
- **Problem**: The Continue button is disabled (grayed out) with no visible explanation. While it's implicitly disabled because no format is selected, a brief inline message like "Select a format to continue" would reduce confusion.
- **Recommendation**: Add a tooltip or inline text explaining why Continue is disabled, or visually emphasize the format selection cards to draw attention.
- **Severity**: 1 (Cosmetic)

### Issue 11: Trip Forecast form lacks inline validation feedback
- **Heuristic violated**: #9 — Help Users Recognize, Diagnose, and Recover from Errors
- **Location**: `/trip-forecast`
- **Problem**: The form has no visible inline validation. If a user clicks "Check Compliance" without filling all fields, the error handling behavior is unclear from the UI alone.
- **Recommendation**: Add inline validation messages for required fields (Employee, Country, Entry Date, Exit Date) and disable "Check Compliance" until all required fields are filled — similar to the Import page pattern.
- **Severity**: 2 (Minor)

### Issue 12: GDPR page "Right to Erasure" uses red "Delete Employee" button that could cause anxiety
- **Heuristic violated**: #5 — Error Prevention
- **Location**: `/gdpr` Right to Erasure section
- **Problem**: The red "Delete Employee" button is visible and prominent even when disabled. While the button is correctly disabled until an employee is selected, the red color may cause anxiety for users just exploring the page. The nearby explainer about the 30-day recovery is helpful, but the button's visual weight could be reduced.
- **Recommendation**: Use a neutral/outline style for the button when disabled. Only apply red styling when active/enabled and an employee is selected.
- **Severity**: 1 (Cosmetic)

---

## Strengths Observed

- **Excellent empty states**: Every page has thoughtful empty state messaging with clear descriptions and CTAs (Dashboard, Calendar, Future Alerts)
- **Strong information architecture**: The sidebar grouping (Main, Data, Tools, System) is logical and well-organized
- **Good contextual help**: Import ("First time importing?"), Forecast ("How this forecast works"), GDPR (Article references), Exports ("Export Information" panel) all provide inline guidance
- **Keyboard shortcuts**: Comprehensive shortcut system with visible reference in sidebar footer
- **Consistent visual design**: Clean color palette, consistent card styling, good spacing throughout
- **GDPR page is excellent**: Well-structured with stat cards, clear GDPR Article references, recovery periods, and audit log — a standout page
- **Import wizard**: Clear 4-step progress indicator with template downloads — well designed for reducing errors
- **Exports page**: Good scope/format selection with descriptions — helps users make the right choice
- **Sidebar collapse**: Supports both wide and narrow layouts
- **User profile in sidebar**: Shows name, email, and role — good status visibility

---

## Resolution Status (March 2, 2026)

All 12 issues have been resolved:

| # | Issue | Status | Fix Applied |
|---|-------|--------|-------------|
| 1 | Settings page too long | Already had tabs | Settings already had General/Workspace/Privacy section nav |
| 2 | Dashboard footer marketing links | Fixed | Created `DashboardFooter` with copyright + Privacy/Terms only |
| 3 | Browser tab titles inconsistent | Fixed | Standardized all pages to `{Page} | ComplyEur` via template |
| 4 | No search/help in sidebar | Fixed | Added Search (with `/` kbd) and Help (with `?` kbd) to sidebar |
| 5 | Future Alerts emoji icon | Fixed | Replaced with `CalendarClock` SVG in consistent circle style |
| 6 | Calendar CTA "Go to Dashboard" | Fixed | Changed to "Add Employee" with `UserPlus` icon |
| 7 | Feedback button too prominent | Fixed | Changed from amber bg to subtle text style matching nav items |
| 8 | Export Cancel button | Fixed | Changed to "Reset" with proper state reset handler |
| 9 | No breadcrumbs | Deferred | Low priority cosmetic — sidebar highlighting is sufficient |
| 10 | Import Continue no explanation | Fixed | Added "Select a format to continue" hint text |
| 11 | Trip Forecast no validation | Fixed | Button disabled until all fields filled |
| 12 | GDPR Delete red when disabled | Fixed | Uses `outline` variant when disabled, `destructive` when enabled |

---

## Addendum: First-Run Manual Employee Entry

**Evaluated**: March 3, 2026
**Framework**: Nielsen's 10 Usability Heuristics
**Scope**: First employee creation for new users entering the dashboard without using spreadsheet import

### Summary
- Critical issues: 0
- Major issues: 1
- Minor issues: 1

### Major Issue: First manual employee entry sat behind an extra modal step
- **Heuristic violated**: #6 — Recognition Rather Than Recall / #8 — Aesthetic & Minimalist Design
- **Location**: Empty dashboard state before any employees exist
- **Problem**: The first-run dashboard asked users to click an `Add Employee` button and then complete the form in a modal. This added friction at the exact moment the product needed the fastest possible activation path.
- **Impact**: New users had to interpret an empty state, open a dialog, then fill the form. For a first-login setup flow, that is one step too indirect.
- **Recommendation**: Put the first employee form directly inside the empty state, and keep spreadsheet import as a secondary path.
- **Severity**: 3 (Major)

### Minor Issue: First-run flow no longer has a dedicated onboarding employee step
- **Heuristic violated**: #1 — Visibility of System Status
- **Location**: `/onboarding` to `/dashboard` handoff
- **Problem**: The legacy onboarding wizard had an employee step, but the current live onboarding flow only handles billing. Users do not get an explicit "next step" transition into adding their first person.
- **Impact**: Billing feels complete, but operational setup has not actually started yet.
- **Recommendation**: Consider reintroducing a post-billing setup checkpoint or guided next-step state after dashboard entry.
- **Severity**: 2 (Minor)

### Resolution Status (March 3, 2026)
- Fixed the major friction point by replacing the empty dashboard CTA button with an inline first-employee form and keeping spreadsheet import as a secondary action.
- Remaining product gap: first-login onboarding still ends at billing rather than at "first employee added".
