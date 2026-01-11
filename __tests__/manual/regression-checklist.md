# ComplyEUR Pre-Release Regression Checklist

**Version:** 2.0
**Last Updated:** January 2026
**Purpose:** Manual verification before each production deployment

---

## How to Use This Checklist

1. Complete all sections before approving a release
2. Mark each item with:
   - `[x]` - Passed
   - `[ ]` - Not tested yet
   - `[!]` - Failed (document issue in notes)
3. Record tester name and date at the bottom
4. All CRITICAL items must pass; IMPORTANT items should pass

---

## 1. Authentication (CRITICAL)

### Signup
- [ ] Navigate to `/signup`
- [ ] Enter valid email, company name, and strong password
- [ ] Submit → Success, lands on dashboard
- [ ] Check: Profile created with correct company association
- [ ] Signup with existing email → Error: "User already registered"
- [ ] Signup with invalid email (e.g., "notanemail") → Error shown
- [ ] Signup with weak password (e.g., "abc123") → Password requirements shown
- [ ] Signup with mismatched passwords → Error: "Passwords do not match"

### Login
- [ ] Navigate to `/login`
- [ ] Enter correct credentials → Success, redirects to dashboard
- [ ] Enter wrong password → Error: "Invalid login credentials"
- [ ] Enter non-existent email → Error: "Invalid login credentials"
- [ ] Check: Session persists across page refreshes
- [ ] Check: Email is case-insensitive (user@EXAMPLE.com works)

### Logout
- [ ] Click logout button
- [ ] Redirected to login page
- [ ] Cannot access `/dashboard` without re-authenticating
- [ ] Back button does not restore authenticated session

### Password Reset
- [ ] Navigate to `/forgot-password`
- [ ] Enter registered email → Success message shown
- [ ] Check inbox for reset email (may take 1-2 minutes)
- [ ] Click reset link → Opens reset password page
- [ ] Enter new password → Success, can login with new password
- [ ] Old password no longer works

---

## 2. Employee Management (IMPORTANT)

### Add Employee
- [ ] Click "Add Employee" button
- [ ] Enter valid name → Employee appears in list
- [ ] Enter name with special characters (O'Brien) → Accepted
- [ ] Enter international name (José García) → Accepted
- [ ] Enter empty name → Error: "Name is required"
- [ ] Enter single character → Error: "at least 2 characters"

### Edit Employee
- [ ] Click edit on existing employee
- [ ] Change name → Changes saved and reflected in list
- [ ] Verify trips still associated with employee

### Delete Employee
- [ ] Click delete on employee
- [ ] Confirmation dialog appears
- [ ] Confirm → Employee removed from list
- [ ] Check: Employee's trips are handled appropriately

### Search/Filter
- [ ] Type in search box → Results filter as you type
- [ ] Search by partial name → Matches shown
- [ ] Clear search → All employees shown
- [ ] Case-insensitive search works

---

## 3. Trip Management (CRITICAL)

### Add Trip
- [ ] Select employee from dropdown
- [ ] Select Schengen country (e.g., France)
- [ ] Set valid date range
- [ ] Submit → Trip added, compliance recalculates
- [ ] Verify days remaining decreases by trip duration

### Edit Trip
- [ ] Click edit on existing trip
- [ ] Change dates → Compliance updates
- [ ] Change country → Compliance updates
- [ ] Extend trip → Days remaining decreases
- [ ] Shorten trip → Days remaining increases

### Delete Trip
- [ ] Click delete on trip
- [ ] Confirmation appears
- [ ] Confirm → Trip removed
- [ ] Days remaining improves by deleted trip's duration

### Trip Validation
- [ ] Try end date before start date → Error shown
- [ ] Try trip > 180 days → Error: "cannot exceed 180 days"
- [ ] Try overlapping dates with existing trip → Warning shown
- [ ] Try unknown country code → Error: "select a valid country"

---

## 4. Compliance Calculations (CRITICAL)

### Basic Calculations
- [ ] Employee with 0 trips → Shows 90 days remaining, green status
- [ ] Add 10-day trip → Shows 80 days remaining
- [ ] Add 70 more days of trips → Shows 10 days remaining, amber status
- [ ] Add 5 more days → Shows 5 days remaining, red status
- [ ] Add 10 more days → Shows -5 days, breach warning

### Country Handling
- [ ] France trip → Counts toward Schengen days
- [ ] Ireland (IE) trip → NOT counted (stays at same days remaining)
- [ ] Cyprus (CY) trip → NOT counted
- [ ] Monaco (MC) trip → Counts toward Schengen days
- [ ] Vatican (VA) trip → Counts toward Schengen days

### Date Handling
- [ ] Same-day trip (entry = exit) → Counts as 1 day
- [ ] Overlapping trips → Days are not double-counted
- [ ] Trip before October 12, 2025 → Not counted
- [ ] Trip spanning Oct 12, 2025 → Only days from Oct 12 counted

### Window Expiry
- [ ] Old trip (>180 days ago) → Not counted in current calculation
- [ ] Days "falling out" of window → Days remaining improves

---

## 5. Multi-Tenancy Isolation (CRITICAL)

> **Important:** Test with two different browser sessions/incognito windows

### Data Isolation
- [ ] Login as Company A user in Browser 1
- [ ] Login as Company B user in Browser 2
- [ ] Company A cannot see Company B employees
- [ ] Company A cannot see Company B trips
- [ ] URL manipulation doesn't expose other company data

### Parameter Tampering (Developer Tools)
- [ ] Try modifying API request with different company_id
- [ ] Verify request is rejected or returns empty data
- [ ] Try accessing employee ID from other company directly
- [ ] Verify access is denied

---

## 6. Dashboard & Reports (IMPORTANT)

### Dashboard View
- [ ] Dashboard loads without errors
- [ ] Compliance summary shows correct totals
- [ ] Risk indicators display correct colors
- [ ] Employee list shows current status

### Calendar View
- [ ] Navigate to calendar
- [ ] Trips display on correct dates
- [ ] Click on trip → Shows details
- [ ] Month/week/day views work

---

## 7. Exports (IMPORTANT)

### CSV Export
- [ ] Click CSV download button
- [ ] File downloads successfully
- [ ] Open in Excel/Numbers → Data formatted correctly
- [ ] Verify correct columns and data

### PDF Export
- [ ] Click PDF download button
- [ ] File downloads successfully
- [ ] Open PDF → Readable, properly styled
- [ ] Company branding displays correctly
- [ ] Data accuracy verified

---

## 8. Responsive Design (IMPORTANT)

### Mobile (375px width)
- [ ] Dashboard loads and is usable
- [ ] Navigation menu works (hamburger/drawer)
- [ ] Forms are fillable
- [ ] Tables scroll horizontally
- [ ] Buttons are tap-sized (>44px)

### Tablet (768px width)
- [ ] Dashboard layout adapts
- [ ] Tables are readable
- [ ] Forms work correctly

### Desktop (1024px+ width)
- [ ] Full layout displays
- [ ] All features accessible
- [ ] No horizontal scrolling needed

---

## 9. Cross-Browser Testing (IMPORTANT)

### Chrome (Latest)
- [ ] All features work
- [ ] No console errors
- [ ] Animations smooth

### Safari (Latest)
- [ ] All features work
- [ ] Date pickers work correctly
- [ ] Forms submit properly

### Firefox (Latest)
- [ ] All features work
- [ ] Styling consistent
- [ ] Forms work correctly

### Edge (Latest)
- [ ] All features work
- [ ] No compatibility issues

---

## 10. Performance (NICE-TO-HAVE)

- [ ] Dashboard loads in <3 seconds
- [ ] Employee list with 50+ employees loads smoothly
- [ ] Trip calculations update within 1 second
- [ ] No visible lag when typing in forms
- [ ] Page navigation is responsive

---

## 11. Error Handling (IMPORTANT)

- [ ] Network disconnect → Shows offline indicator or error
- [ ] Invalid API response → User-friendly error message
- [ ] Session expired → Redirects to login with message
- [ ] Form validation errors → Clear, specific messages
- [ ] Server error (500) → Generic error page, not stack trace

---

## 12. Accessibility (NICE-TO-HAVE)

- [ ] Tab navigation works through all interactive elements
- [ ] Form labels are associated with inputs
- [ ] Error messages are announced to screen readers
- [ ] Color is not the only indicator of status
- [ ] Focus indicators are visible

---

## Sign-Off

| Role | Name | Date | Result |
|------|------|------|--------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |

### Notes
_Record any issues, observations, or follow-ups here:_

---

### Failed Items (if any)

| Item | Description | Severity | Ticket # |
|------|-------------|----------|----------|
| | | | |

---

## Quick Reference: Risk Levels

| Days Remaining | Status | Color |
|----------------|--------|-------|
| 30+ | Safe | Green |
| 10-29 | Caution | Amber |
| <10 | Danger | Red |
| 0 | At Limit | Red |
| Negative | Breach | Red + Warning |

## Quick Reference: Key Dates

| Date | Significance |
|------|--------------|
| October 12, 2025 | Compliance start date |
| Any date | 180-day rolling window looks back from this date |

## Quick Reference: Schengen Status

| Country | Schengen? |
|---------|-----------|
| France, Germany, Italy, etc. | Yes |
| Monaco, Vatican, San Marino, Andorra | Yes (microstates) |
| Ireland | No (opted out) |
| Cyprus | No (not yet implemented) |
| UK | No (not member) |
