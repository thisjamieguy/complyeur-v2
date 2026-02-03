# Heuristic Evaluation: ComplyEUR Landing Page

**Evaluated**: 2026-01-29
**Framework**: Nielsen's 10 Usability Heuristics
**Scope**: Landing page (`/landing`), Login page (`/login`), About page (`/about`)

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Major | 2 |
| Minor | 6 |

**Overall Assessment**: The landing page is well-designed with clear messaging, good visual hierarchy, and functional core interactions. Most issues are minor polish items. No critical usability blockers were found.

---

## Major Issues (Fix Soon)

### Issue 1: Duplicate Site Name in Page Titles

- **Heuristic violated**: #4 — Consistency & Standards
- **Location**: All pages (landing, login, about)
- **Problem**: Page titles contain "ComplyEUR" twice. Example: `"About Us - Our Mission | ComplyEUR | ComplyEUR"`
- **Impact**: Looks unprofessional in browser tabs and bookmarks. May affect SEO as search engines display page titles.
- **Recommendation**: Fix the title template in the Next.js layout to only append `| ComplyEUR` once. Check `app/layout.tsx` or page-specific metadata.
- **Severity**: 2 (Minor but affects perceived quality across all pages)

### Issue 2: Missing Autocomplete Attributes on Form Inputs

- **Heuristic violated**: #7 — Flexibility & Efficiency of Use
- **Location**: Login page email and password fields
- **Problem**: Browser console warning: "Input elements should have autocomplete attributes". Password manager integration may be impaired.
- **Impact**: Users cannot leverage saved credentials efficiently. Reduces conversion on login.
- **Recommendation**: Add `autocomplete="email"` to email field, `autocomplete="current-password"` to password field.
- **Severity**: 3 (Blocks password manager functionality)

---

## Minor Issues (Fix Later)

### Issue 3: No Custom Error Styling on Forms

- **Heuristic violated**: #9 — Help Users Recognize, Diagnose, and Recover from Errors
- **Location**: Waitlist signup form (hero section)
- **Problem**: Form validation relies entirely on browser-native tooltip messages ("Please fill in this field", "Please include an '@' in the email address").
- **Impact**: Error messages blend with browser UI rather than matching brand. Limited control over messaging.
- **Recommendation**: Add custom inline error messages below the input field with brand-consistent styling. Keep browser validation as fallback.
- **Severity**: 2

### Issue 4: No Loading State on Form Submission

- **Heuristic violated**: #1 — Visibility of System Status
- **Location**: Waitlist signup forms
- **Problem**: When clicking "Join Waitlist", there's no visible loading indicator during submission. Button doesn't disable or show spinner.
- **Impact**: On slow connections, users may click multiple times thinking nothing happened.
- **Recommendation**: Add loading state to button (spinner icon, "Joining..." text, disable button during request).
- **Severity**: 2

### Issue 5: Footer Link Text Inconsistency

- **Heuristic violated**: #4 — Consistency & Standards
- **Location**: Footer links across pages
- **Problem**: Landing page footer shows "Privacy" and "Terms", while login/about pages show "Privacy Policy" and "Terms of Service".
- **Impact**: Minor inconsistency that affects perceived polish.
- **Recommendation**: Standardize to either short form ("Privacy", "Terms") or long form ("Privacy Policy", "Terms of Service") across all pages.
- **Severity**: 1

### Issue 6: Demo Table Data Randomizes on Interaction

- **Heuristic violated**: #4 — Consistency & Standards
- **Location**: Hero section demo table
- **Problem**: Employee names remain constant but their days/status values change randomly on each page interaction (clicking form, scrolling, etc.).
- **Impact**: Potentially confusing — users might wonder if this is a bug or intentional "live" data simulation.
- **Recommendation**: Either keep values static for consistency, or add a subtle indicator that this is simulated live data updating.
- **Severity**: 1

### Issue 7: Second Waitlist Form Doesn't Show Success State

- **Heuristic violated**: #1 — Visibility of System Status
- **Location**: Bottom CTA section waitlist form
- **Problem**: After submitting the hero form successfully, the bottom form still shows the input field (doesn't sync success state).
- **Impact**: Users scrolling to bottom after signup see duplicate signup prompt.
- **Recommendation**: Sync success state across both forms, or hide the bottom form after successful signup.
- **Severity**: 1

### Issue 8: Login Page Missing Logo/Brand Visual

- **Heuristic violated**: #4 — Consistency & Standards
- **Location**: Login page header
- **Problem**: Login page shows "ComplyEUR" as text heading only, while landing page has the hexagon logo. Creates visual disconnect.
- **Impact**: Reduces brand recognition and polish on a critical conversion page.
- **Recommendation**: Add the same logo used on landing page to login page.
- **Severity**: 1

---

## Strengths Observed

1. **Clear value proposition**: Headline immediately communicates what the product does and for whom
2. **Strong visual hierarchy**: Proper use of headings, spacing, and contrast guides the eye
3. **Good mobile responsiveness**: Layout adapts well to mobile viewport (375px tested)
4. **Accessibility basics**: Skip-to-content link present, semantic HTML structure
5. **Effective social proof**: Demo table shows realistic compliance data, making the product tangible
6. **Success feedback**: Form submission shows clear confirmation message with checkmark icon
7. **Trust signals**: GDPR compliance badge, UK data hosting, encryption mentions
8. **3-step process**: "Get started in minutes" section makes onboarding feel simple
9. **Clean footer**: All legal links functional (About, Contact, Privacy, Terms)
10. **No broken links**: All tested navigation links work correctly

---

## Accessibility Quick Check

| Check | Status |
|-------|--------|
| Skip to content link | Pass |
| Semantic headings (h1-h3) | Pass |
| Form labels | Pass |
| Color contrast (visual) | Pass |
| Focus indicators | Needs review (some elements unclear) |
| Keyboard navigation | Needs review |

**Note**: Full WCAG audit recommended separately.

---

## Next Steps

1. **Immediate** (before launch):
   - Fix duplicate page title issue
   - Add autocomplete attributes to login form

2. **Short-term**:
   - Add loading state to waitlist form button
   - Sync success state between both waitlist forms
   - Add logo to login page

3. **Nice-to-have**:
   - Custom styled form validation errors
   - Standardize footer link text
   - Stabilize or explain demo table data behavior

---

## Test Environment

- **URL**: `http://localhost:3000/landing`
- **Browser**: Playwright (Chromium-based)
- **Viewports tested**: 1280x800 (desktop), 375x812 (mobile)
- **Date**: 2026-01-29
