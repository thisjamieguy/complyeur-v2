# Heuristic Evaluation: Landing + Associated Pages (Local)

**Evaluated**: February 12, 2026  
**Framework**: Nielsen's 10 Usability Heuristics  
**Environment**: Local app on `http://127.0.0.1:3100`

## Scope

Routes reviewed:
- `/landing`
- `/pricing`
- `/about`
- `/faq`
- `/contact`
- `/privacy`
- `/terms`
- `/accessibility`
- `/login`
- `/signup`

## Summary

- Critical issues: 0
- Major issues: 4
- Minor issues: 6
- Broken internal links from landing flow: 0 (`/`, `/about`, `/contact`, `/faq`, `/login`, `/pricing`, `/privacy`, `/terms` all returned `200`)

**Launch readiness**: **Conditional go-live**.  
You can soft launch, but fix the 4 major items before paid traffic or broad announcement.

## Major Issues (Fix Soon)

### 1) No explicit submission feedback on waitlist forms
- **Heuristic violated**: #1 Visibility of System Status, #9 Help Users Recognize/Recover from Errors
- **Location**: `/landing` (both "Join Waitlist" forms)
- **Problem**: Submitting a valid email posts successfully (`POST /landing` returns `200`), but there is no explicit success state, no loading state, and no failure message.
- **Impact**: Users cannot tell if submission worked, which increases re-submits and drop-off.
- **Recommendation**:
  - Add loading state: disable button + "Submitting..." text or spinner.
  - Add inline success confirmation near the submitted form.
  - Add explicit error feedback with retry guidance.
- **Severity**: 3 (Major)

### 2) Signup page has no `<h1>`
- **Heuristic violated**: #4 Consistency & Standards, #6 Recognition Rather Than Recall
- **Location**: `/signup`
- **Problem**: Rendered page has no primary heading (`h1` list was empty during audit).
- **Impact**: Weak orientation for users and assistive tech; inconsistent page structure versus the rest of the public flow.
- **Recommendation**: Add a clear `<h1>` (for example, "Create your account") above the form.
- **Severity**: 3 (Major)

### 3) Auth forms rely on post-submit validation instead of preventative semantics
- **Heuristic violated**: #5 Error Prevention, #7 Flexibility & Efficiency of Use
- **Location**: `/login`, `/signup`
- **Problem**:
  - Key inputs are not marked `required`.
  - Browser surfaced warnings about missing `autocomplete` usage on input fields.
  - Validation errors only appear after submit.
- **Impact**: Slower form completion, weaker password manager/autofill support, higher frustration.
- **Recommendation**:
  - Add `required` where mandatory.
  - Add `autocomplete` tokens (`email`, `current-password`, `new-password`, `organization` where applicable).
  - Keep server validation, but strengthen client-side prevention.
- **Severity**: 3 (Major)

### 4) Navigation model changes abruptly between landing and associated pages
- **Heuristic violated**: #3 User Control & Freedom, #4 Consistency & Standards
- **Location**: `/landing` vs `/pricing`, `/about`, `/faq`, `/contact`, `/privacy`, `/terms`, `/accessibility`
- **Problem**: Landing has a full top nav; most associated pages reduce to logo + footer links only.
- **Impact**: Users lose fast wayfinding once they enter secondary pages, especially on long legal/help pages.
- **Recommendation**: Keep a lightweight but consistent top nav (or sticky in-page quick nav) across associated pages.
- **Severity**: 3 (Major)

## Minor Issues (Fix Later)

### 1) Waitlist empty-email error relies on browser-native popup only
- **Heuristic violated**: #9 Help Users Recognize/Recover from Errors
- **Location**: `/landing`
- **Problem**: Empty email shows browser message ("Please fill in this field.") with no persistent inline error UI.
- **Impact**: Inconsistent behavior across browsers, weaker clarity for some users.
- **Recommendation**: Add inline, accessible error text tied with `aria-describedby`.
- **Severity**: 2 (Minor)

### 2) Many small interactive targets on mobile
- **Heuristic violated**: #8 Aesthetic & Minimalist Design (readability/operability balance)
- **Location**: Most associated pages at mobile width (`390px`)
- **Problem**: High count of sub-40px clickable elements, especially in legal/footer dense areas.
- **Impact**: Harder tap accuracy on phones.
- **Recommendation**: Increase line height/padding for dense link groups and legal cross-links.
- **Severity**: 2 (Minor)

### 3) FAQ is dense and lacks a "find answer fast" control
- **Heuristic violated**: #6 Recognition Rather Than Recall
- **Location**: `/faq`
- **Problem**: Long accordion list without local search/filter/jump links.
- **Impact**: Slower answer discovery for first-time users.
- **Recommendation**: Add FAQ search and category quick-jump links.
- **Severity**: 2 (Minor)

### 4) Repeated image/preload warnings in console
- **Heuristic violated**: #1 Visibility of System Status (indirect performance quality signal)
- **Location**: Multiple pages
- **Problem**: Repeated warnings for unused preloaded logo assets and image dimension ratio mismatches.
- **Impact**: Potential performance overhead and noisy runtime telemetry.
- **Recommendation**: Align preload strategy with actual above-the-fold usage and preserve image aspect ratio with matching dimensions/styles.
- **Severity**: 2 (Minor)

### 5) Marketing pages heavily depend on footer for secondary navigation
- **Heuristic violated**: #3 User Control & Freedom
- **Location**: `/pricing`, `/about`, `/faq`, `/contact`, `/privacy`, `/terms`, `/accessibility`
- **Problem**: Primary cross-page movement is often at page bottom.
- **Impact**: More scrolling to change route, especially on long pages.
- **Recommendation**: Add a slim secondary nav or floating "quick links" block.
- **Severity**: 2 (Minor)

### 6) Conversion intent is split across two waitlist forms on one page
- **Heuristic violated**: #8 Aesthetic & Minimalist Design
- **Location**: `/landing`
- **Problem**: Two similar waitlist forms can feel repetitive without clear distinction.
- **Impact**: Mild cognitive overhead and unclear "best" action point.
- **Recommendation**: Keep one primary form and convert the second into a contextual CTA link, or clearly explain the difference.
- **Severity**: 2 (Minor)

## Strengths Observed

- Clear and specific landing value proposition with strong visual hierarchy.
- Route coverage for associated pages is complete and internally linked correctly.
- Skip link and main landmark are present across reviewed routes.
- Mobile layout did not show horizontal overflow in tested viewport (`390px`).
- Auth pages show explicit inline error text after failed submit (good recovery messaging once triggered).
- Pricing toggle uses clear state semantics (`aria-pressed`), supporting assistive technologies.

## Launch Checklist Before Going Live

1. Add explicit success/loading/error states for waitlist submission on `/landing`.
2. Add `<h1>` to `/signup`.
3. Add `required` + `autocomplete` semantics on `/login` and `/signup`.
4. Add consistent top-level navigation pattern across associated pages.

## Suggested Next Step

After these four fixes, run a quick re-audit of the same route set and then proceed to live launch.
