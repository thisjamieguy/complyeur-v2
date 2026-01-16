# UI Heuristic Evaluation Report
## ComplyEUR v2.0 — Nielsen's 10 Usability Heuristics

**Evaluation Date:** January 2026
**Evaluator:** Automated UX Review
**Tech Stack:** Next.js (App Router), React, Tailwind CSS, shadcn/ui

---

## Executive Summary

This report evaluates ComplyEUR's user interface against Nielsen's 10 Usability Heuristics. The app demonstrates strong foundations with consistent component usage and good mobile responsiveness. Key strengths include excellent loading state management and clear visual hierarchy. Primary improvement areas include error prevention on forms, help/documentation accessibility, and flexibility features for power users.

**Overall Score: 3.6/5** (Good with room for improvement)

---

## Nielsen's 10 Heuristics — Detailed Analysis

### 1. Visibility of System Status

**Definition:** The system should always keep users informed about what is going on through appropriate feedback within reasonable time.

#### Current Implementation

| Strength | Location |
|----------|----------|
| Loading spinners on all buttons during submission | All forms |
| Button text changes ("Adding..." / "Saving...") | Add Employee, Trip Form, Settings |
| Skeleton loading states for data tables | Dashboard, Calendar, Imports |
| Toast notifications for success/error feedback | Global (Sonner) |
| Suspense boundaries with streaming | Dashboard, Calendar pages |
| Alert banner with unacknowledged count badge | Dashboard top |

#### Violations & Issues

| Issue | Severity | Location |
|-------|----------|----------|
| No progress indicator for multi-step import wizard | Medium | Import flow |
| Calendar date range loading lacks visual feedback | Low | Calendar page |
| No indication of background sync/refresh | Low | Dashboard |
| Settings save lacks confirmation beyond toast | Low | Settings page |

#### Recommendations

1. **Add step indicator to import wizard** — Show "Step 2 of 4" with progress bar
   ```tsx
   // Add to /app/(dashboard)/import/layout.tsx
   <div className="flex gap-2 mb-6">
     {steps.map((step, i) => (
       <div key={i} className={cn(
         "h-2 flex-1 rounded",
         i <= currentStep ? "bg-blue-500" : "bg-gray-200"
       )} />
     ))}
   </div>
   ```

2. **Add last-synced timestamp** — Show "Last updated: 2 minutes ago" on dashboard

3. **Settings confirmation state** — Show green checkmark next to "Save" button after successful save

#### Page Scores

| Page | Score | Notes |
|------|-------|-------|
| Login | 4/5 | Good loading states, clear feedback |
| Dashboard | 4/5 | Excellent skeleton loading, good toast feedback |
| Employees | 4/5 | Loading states present, actions provide feedback |
| Trips | 4/5 | Form submission feedback clear |
| Import | 3/5 | Missing step progress indicator |
| Calendar | 3/5 | Date range change lacks loading indicator |
| Settings | 4/5 | Dirty state tracking good, toast feedback present |
| Admin | 4/5 | Consistent with main app patterns |

---

### 2. Match Between System and Real World

**Definition:** The system should speak the users' language with words, phrases, and concepts familiar to the target audience.

#### Current Implementation

| Strength | Location |
|----------|----------|
| Domain-specific terminology (90/180 rule, Schengen) | Throughout |
| Clear status labels (Compliant, At Risk, Non-Compliant) | Dashboard, Status badges |
| Date format matches UK conventions (12 Jan 2025) | Trip dates |
| "Days Remaining" / "Days Used" intuitive labels | Compliance table |
| Country selection with familiar names | Trip form |

#### Violations & Issues

| Issue | Severity | Location |
|-------|----------|----------|
| "Ghosted" trips — unclear terminology | High | Trip form checkbox |
| "GDPR" page may confuse non-technical users | Medium | Navigation |
| "Retention period" needs context | Medium | Settings |
| "Entitlements" tab uses developer language | Low | Admin > Company |

#### Recommendations

1. **Rename "Ghosted" to "Excluded from calculation"**
   ```tsx
   // In trip-form.tsx
   <FormLabel>Exclude from 90-day calculation</FormLabel>
   <FormDescription>
     Check this to record the trip without counting it toward the 90-day limit
   </FormDescription>
   ```

2. **Add tooltips for technical terms**
   ```tsx
   // Add info icon next to GDPR
   <TooltipProvider>
     <Tooltip>
       <TooltipTrigger>
         <span>Data Privacy</span>
         <InfoIcon className="h-4 w-4 ml-1" />
       </TooltipTrigger>
       <TooltipContent>
         Tools to manage employee data rights and compliance
       </TooltipContent>
     </Tooltip>
   </TooltipProvider>
   ```

3. **Rename navigation label** — "GDPR" → "Data Privacy" or "Privacy Tools"

4. **Add retention period helper text** — "How long to keep trip records before automatic deletion"

#### Page Scores

| Page | Score | Notes |
|------|-------|-------|
| Login | 5/5 | Standard auth terminology |
| Dashboard | 4/5 | Good domain language |
| Employees | 4/5 | Clear employee management terms |
| Trips | 3/5 | "Ghosted" is confusing |
| Import | 4/5 | Clear format descriptions |
| Calendar | 4/5 | Visual timeline intuitive |
| Settings | 3/5 | Some technical jargon |
| Admin | 3/5 | "Entitlements" too technical |

---

### 3. User Control and Freedom

**Definition:** Users often perform actions by mistake and need a clearly marked "emergency exit" to leave the unwanted state.

#### Current Implementation

| Strength | Location |
|----------|----------|
| Cancel buttons on all dialogs | All modals |
| Back navigation on detail pages | Employee detail |
| Escape key closes modals | All dialogs |
| Delete confirmations require explicit action | Delete trip/employee |
| Form reset capability | Settings (Cancel button) |
| Soft-delete with 30-day recovery | GDPR page |

#### Violations & Issues

| Issue | Severity | Location |
|-------|----------|----------|
| No undo for trip deletion | High | Trip list |
| Import has no "back" in later steps | Medium | Import wizard |
| Alert acknowledge cannot be undone | Medium | Alert banner |
| Bulk trip add has no confirmation step | Medium | Employee detail |
| No way to restore accidentally deleted employees quickly | Medium | Dashboard |

#### Recommendations

1. **Add undo for destructive actions**
   ```tsx
   // After delete action
   toast.success("Trip deleted", {
     action: {
       label: "Undo",
       onClick: () => restoreTrip(tripId)
     },
     duration: 8000
   });
   ```

2. **Add back navigation to import steps**
   ```tsx
   // In import/preview/page.tsx
   <Button variant="ghost" onClick={() => router.back()}>
     <ArrowLeft className="h-4 w-4 mr-2" />
     Back to Upload
   </Button>
   ```

3. **Confirmation dialog for bulk actions**
   ```tsx
   // Before bulk trip add
   <AlertDialog>
     <AlertDialogContent>
       <AlertDialogTitle>Add {trips.length} trips?</AlertDialogTitle>
       <AlertDialogDescription>
         Review the trips below before adding
       </AlertDialogDescription>
     </AlertDialogContent>
   </AlertDialog>
   ```

#### Page Scores

| Page | Score | Notes |
|------|-------|-------|
| Login | 4/5 | Clear path back to marketing |
| Dashboard | 3/5 | Limited undo capabilities |
| Employees | 3/5 | No undo after delete |
| Trips | 3/5 | Delete is permanent |
| Import | 2/5 | No back navigation mid-flow |
| Calendar | 4/5 | Easy to change date range |
| Settings | 4/5 | Cancel resets form |
| Admin | 3/5 | Actions hard to reverse |

---

### 4. Consistency and Standards

**Definition:** Users should not have to wonder whether different words, situations, or actions mean the same thing.

#### Current Implementation

| Strength | Location |
|----------|----------|
| Consistent button styles (primary blue, ghost, destructive red) | Throughout |
| Uniform card design with border + shadow | All pages |
| Same modal/dialog pattern everywhere | All forms |
| Consistent 8px spacing system | Throughout |
| Uniform table/card responsive pattern | Dashboard, Trips |
| Same toast notification style | All actions |
| Consistent status badge colors | All status displays |

#### Violations & Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Some pages use "Add" vs "Create" | Low | Various buttons |
| Filter button styles differ (pills vs dropdown) | Medium | Dashboard vs Admin |
| Date display format inconsistent (some show time) | Low | Audit logs vs trips |
| "View" vs "View Details" button text | Low | Dashboard vs Admin |

#### Recommendations

1. **Standardize action verbs**
   - Use "Add" for creation: "Add Employee", "Add Trip"
   - Use "Edit" for modification: "Edit Employee", "Edit Trip"
   - Use "Delete" for removal (with confirmation)

2. **Unify filter UI pattern**
   ```tsx
   // Standardize on button-group filters for status
   // Use dropdowns for multi-option filters (sort, tier)
   ```

3. **Create date formatting utility**
   ```tsx
   // lib/utils/dates.ts
   export const formatDate = (date: string) => format(parseISO(date), 'd MMM yyyy')
   export const formatDateTime = (date: string) => format(parseISO(date), 'd MMM yyyy, HH:mm')
   ```

#### Page Scores

| Page | Score | Notes |
|------|-------|-------|
| Login | 5/5 | Standard auth patterns |
| Dashboard | 4/5 | Consistent with design system |
| Employees | 4/5 | Follows established patterns |
| Trips | 4/5 | Consistent with employee page |
| Import | 4/5 | Uniform card/button styles |
| Calendar | 4/5 | Unique but consistent internally |
| Settings | 4/5 | Follows form patterns |
| Admin | 3/5 | Some filter inconsistencies |

---

### 5. Error Prevention

**Definition:** Even better than good error messages is a careful design which prevents problems from occurring in the first place.

#### Current Implementation

| Strength | Location |
|----------|----------|
| Trip overlap detection before submission | Add Trip form |
| Date validation (exit >= entry) | Trip form |
| Non-Schengen country warning | Trip form |
| Trip duration > 180 days warning | Trip form |
| Email format validation | Login/Signup |
| Required field indicators | All forms |
| Confirmation dialogs for deletes | All delete actions |

#### Violations & Issues

| Issue | Severity | Location |
|-------|----------|----------|
| No duplicate employee name warning | Medium | Add Employee |
| Import allows invalid date formats | High | Import preview |
| Can create trip in the far future (no warning) | Medium | Trip form |
| No validation for unrealistic retention periods | Low | Settings |
| Bulk trip upload lacks row-level preview | High | Bulk add trips |

#### Recommendations

1. **Add duplicate employee detection**
   ```tsx
   // In add-employee-dialog.tsx
   const checkDuplicate = async (name: string) => {
     const exists = await checkEmployeeNameExists(name);
     if (exists) {
       return "An employee with this name already exists";
     }
   };
   ```

2. **Pre-validate import data with clear errors**
   ```tsx
   // Add validation summary before import confirmation
   <Card className="border-red-200 bg-red-50">
     <CardHeader>
       <CardTitle>3 rows have issues</CardTitle>
     </CardHeader>
     <CardContent>
       <ul>
         <li>Row 5: Invalid date format (expected DD/MM/YYYY)</li>
         <li>Row 12: Unknown country code "XYZ"</li>
       </ul>
     </CardContent>
   </Card>
   ```

3. **Add future trip warning**
   ```tsx
   // If trip entry_date > 90 days in future
   {isFarFuture && (
     <Alert variant="amber">
       This trip is over 90 days in the future. Verify the dates are correct.
     </Alert>
   )}
   ```

4. **Constrain numeric inputs**
   ```tsx
   // Settings retention period
   <Input type="number" min={1} max={120} />
   ```

#### Page Scores

| Page | Score | Notes |
|------|-------|-------|
| Login | 4/5 | Good validation |
| Dashboard | 3/5 | Limited preventive measures |
| Employees | 3/5 | No duplicate detection |
| Trips | 4/5 | Good date/overlap validation |
| Import | 2/5 | Needs better pre-validation |
| Calendar | 4/5 | Date constraints in place |
| Settings | 3/5 | Needs input constraints |
| Admin | 3/5 | Basic validation only |

---

### 6. Recognition Rather Than Recall

**Definition:** Minimize the user's memory load by making objects, actions, and options visible.

#### Current Implementation

| Strength | Location |
|----------|----------|
| Status filters show counts (All 10, At Risk 2) | Dashboard |
| Country dropdown with searchable list | Trip form |
| Recent trips visible on employee detail | Employee page |
| Alert badge shows unread count | Dashboard banner |
| Stats cards summarize key metrics | Dashboard, Admin |
| Visual status badges (color-coded) | Throughout |

#### Violations & Issues

| Issue | Severity | Location |
|-------|----------|----------|
| No "recently viewed" employees | Low | Dashboard |
| Import format options need re-reading each time | Medium | Import |
| No visual diff on settings change | Medium | Settings |
| Calendar lacks employee quick-jump | Medium | Calendar |
| No saved filter preferences | Low | Dashboard |

#### Recommendations

1. **Add recently viewed section**
   ```tsx
   // Dashboard sidebar or dropdown
   <Card>
     <CardHeader>Recently Viewed</CardHeader>
     <CardContent>
       {recentEmployees.map(emp => (
         <Link href={`/employee/${emp.id}`}>{emp.name}</Link>
       ))}
     </CardContent>
   </Card>
   ```

2. **Show import format summary cards**
   ```tsx
   // Instead of just names, show example data
   <Card>
     <CardTitle>Employee Import</CardTitle>
     <CardDescription>
       Columns: Name, Passport Number, Nationality
     </CardDescription>
     <Badge>CSV only</Badge>
   </Card>
   ```

3. **Settings change highlighting**
   ```tsx
   // Highlight changed fields
   <FormItem className={cn(isDirty && "bg-yellow-50 ring-1 ring-yellow-200")}>
   ```

4. **Calendar employee quick-select**
   ```tsx
   // Add searchable employee dropdown to jump to specific person
   <Select onValueChange={scrollToEmployee}>
     <SelectTrigger>Jump to employee...</SelectTrigger>
     {employees.map(emp => (
       <SelectItem value={emp.id}>{emp.name}</SelectItem>
     ))}
   </Select>
   ```

#### Page Scores

| Page | Score | Notes |
|------|-------|-------|
| Login | 4/5 | Simple, clear options |
| Dashboard | 4/5 | Good stats visibility |
| Employees | 4/5 | Clear list view |
| Trips | 4/5 | History visible inline |
| Import | 3/5 | Format options need context |
| Calendar | 3/5 | Hard to find specific employee |
| Settings | 3/5 | Changes not highlighted |
| Admin | 4/5 | Good summary metrics |

---

### 7. Flexibility and Efficiency of Use

**Definition:** Accelerators — unseen by the novice user — may speed up interaction for expert users.

#### Current Implementation

| Strength | Location |
|----------|----------|
| Searchable employee list | Dashboard |
| Multiple sort options | Dashboard, Trips |
| Bulk import functionality | Import |
| URL-based filters (shareable) | Dashboard |
| Keyboard navigation in dropdowns | All dropdowns |
| Escape closes modals | All dialogs |

#### Violations & Issues

| Issue | Severity | Location |
|-------|----------|----------|
| No keyboard shortcuts | Medium | Global |
| No bulk select/delete for trips | Medium | Employee detail |
| No quick-add trip (single form) | Low | Dashboard |
| No export presets | Low | Exports |
| No "mark multiple alerts as read" | Medium | Alert banner |
| No saved views/filters | Medium | Dashboard |

#### Recommendations

1. **Add keyboard shortcuts**
   ```tsx
   // Global shortcut handler
   useEffect(() => {
     const handler = (e: KeyboardEvent) => {
       if (e.metaKey || e.ctrlKey) {
         switch (e.key) {
           case 'k': openSearch(); break;
           case 'n': openAddEmployee(); break;
           case 't': openAddTrip(); break;
         }
       }
     };
     document.addEventListener('keydown', handler);
     return () => document.removeEventListener('keydown', handler);
   }, []);
   ```

2. **Add bulk trip selection**
   ```tsx
   // Checkbox column in trip table
   <TableHead className="w-[40px]">
     <Checkbox onCheckedChange={toggleSelectAll} />
   </TableHead>
   ```

3. **Add command palette (Cmd+K)**
   ```tsx
   // Using cmdk library
   <CommandDialog open={open} onOpenChange={setOpen}>
     <CommandInput placeholder="Search employees, trips..." />
     <CommandList>
       <CommandGroup heading="Employees">
         {employees.map(emp => <CommandItem>{emp.name}</CommandItem>)}
       </CommandGroup>
     </CommandList>
   </CommandDialog>
   ```

4. **Export presets**
   ```tsx
   <Select>
     <SelectTrigger>Load preset...</SelectTrigger>
     <SelectItem value="all-current-month">All employees - Current month</SelectItem>
     <SelectItem value="at-risk-ytd">At-risk employees - Year to date</SelectItem>
   </Select>
   ```

#### Page Scores

| Page | Score | Notes |
|------|-------|-------|
| Login | 3/5 | Standard, no shortcuts |
| Dashboard | 3/5 | Search exists, needs shortcuts |
| Employees | 3/5 | No bulk operations |
| Trips | 3/5 | No bulk select |
| Import | 4/5 | Bulk import is efficient |
| Calendar | 3/5 | Basic navigation only |
| Settings | 3/5 | No quick presets |
| Admin | 3/5 | Basic efficiency |

---

### 8. Aesthetic and Minimalist Design

**Definition:** Dialogues should not contain information which is irrelevant or rarely needed.

#### Current Implementation

| Strength | Location |
|----------|----------|
| Clean card-based layouts | Throughout |
| Consistent whitespace | All pages |
| Progressive disclosure (collapsible alerts) | Alert banner |
| Focused forms (minimal fields) | Add Employee |
| Clear visual hierarchy | Dashboard |
| No unnecessary decorative elements | Throughout |

#### Violations & Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Settings page is dense | Medium | Settings |
| Employee detail shows all trips (no pagination) | Medium | Employee page |
| GDPR page has too many sections visible | Medium | GDPR |
| Import preview can be overwhelming | Medium | Import preview |
| Admin company tabs have lots of info | Low | Admin company detail |

#### Recommendations

1. **Collapse advanced settings**
   ```tsx
   // Settings page
   <Collapsible>
     <CollapsibleTrigger>
       <Button variant="ghost">Advanced Settings</Button>
     </CollapsibleTrigger>
     <CollapsibleContent>
       {/* Retention, forecasting, etc. */}
     </CollapsibleContent>
   </Collapsible>
   ```

2. **Paginate trip history**
   ```tsx
   // Employee detail - show 10 trips, "Load more" button
   const [visibleTrips, setVisibleTrips] = useState(10);
   {trips.slice(0, visibleTrips).map(trip => <TripRow />)}
   {trips.length > visibleTrips && (
     <Button onClick={() => setVisibleTrips(v => v + 10)}>
       Show more ({trips.length - visibleTrips} remaining)
     </Button>
   )}
   ```

3. **GDPR page tabs**
   ```tsx
   // Split into tabs: Data Requests | Deleted Employees | Audit Log
   <Tabs defaultValue="requests">
     <TabsList>
       <TabsTrigger value="requests">Data Requests</TabsTrigger>
       <TabsTrigger value="deleted">Deleted Employees</TabsTrigger>
       <TabsTrigger value="audit">Audit Log</TabsTrigger>
     </TabsList>
   </Tabs>
   ```

4. **Import preview summary first**
   ```tsx
   // Show summary card first, expand to see all rows
   <Card>
     <CardTitle>Import Preview</CardTitle>
     <CardDescription>
       {validRows} valid rows, {errorRows} errors
     </CardDescription>
     <Button variant="ghost" onClick={() => setShowAll(true)}>
       Review all rows
     </Button>
   </Card>
   ```

#### Page Scores

| Page | Score | Notes |
|------|-------|-------|
| Login | 5/5 | Clean, focused |
| Dashboard | 4/5 | Good balance |
| Employees | 4/5 | Clean layout |
| Trips | 4/5 | Focused form |
| Import | 3/5 | Preview overwhelming |
| Calendar | 4/5 | Visual, not cluttered |
| Settings | 2/5 | Too dense |
| Admin | 3/5 | Lots of information |

---

### 9. Help Users Recognize, Diagnose, and Recover from Errors

**Definition:** Error messages should be expressed in plain language (no codes), precisely indicate the problem, and constructively suggest a solution.

#### Current Implementation

| Strength | Location |
|----------|----------|
| Field-level validation messages | All forms |
| Clear toast error notifications | Throughout |
| FormError component with dismissible alerts | Forms |
| Trip overlap explains which trip conflicts | Trip form |
| Country validation warning (specific) | Trip form |

#### Violations & Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Generic "Something went wrong" errors | High | Various API errors |
| Import errors lack row numbers | High | Import |
| Auth errors could be clearer | Medium | Login |
| Network errors lack retry option | Medium | All async actions |
| No error state for empty searches | Low | Dashboard search |

#### Recommendations

1. **Improve API error messages**
   ```tsx
   // Instead of generic error
   // Bad: "Failed to add trip"
   // Good: "Could not save trip: The entry date overlaps with your trip to France (Oct 5-12)"
   ```

2. **Import error details**
   ```tsx
   // Show row-level errors
   <Alert variant="destructive">
     <AlertTitle>3 rows have errors</AlertTitle>
     <AlertDescription>
       <ul className="list-disc pl-4">
         <li><strong>Row 5:</strong> Invalid date "32/01/2025" — dates must be DD/MM/YYYY</li>
         <li><strong>Row 12:</strong> Country "Narnia" not recognized</li>
         <li><strong>Row 18:</strong> Entry date is after exit date</li>
       </ul>
     </AlertDescription>
   </Alert>
   ```

3. **Auth error specificity**
   ```tsx
   // Login errors
   switch (error.code) {
     case 'invalid_credentials':
       return "Email or password is incorrect. Check your details and try again.";
     case 'email_not_confirmed':
       return "Please verify your email before logging in. Check your inbox.";
     case 'too_many_requests':
       return "Too many login attempts. Please wait 5 minutes before trying again.";
   }
   ```

4. **Add retry buttons**
   ```tsx
   toast.error("Failed to load employees", {
     action: {
       label: "Retry",
       onClick: () => refetch()
     }
   });
   ```

5. **Empty search state**
   ```tsx
   {filteredEmployees.length === 0 && searchQuery && (
     <EmptyState
       icon={SearchX}
       title="No employees found"
       description={`No results for "${searchQuery}". Try a different search term.`}
       action={<Button onClick={clearSearch}>Clear search</Button>}
     />
   )}
   ```

#### Page Scores

| Page | Score | Notes |
|------|-------|-------|
| Login | 3/5 | Generic auth errors |
| Dashboard | 3/5 | Basic error handling |
| Employees | 3/5 | Add errors clear, API errors generic |
| Trips | 4/5 | Good overlap/validation errors |
| Import | 2/5 | Errors lack specificity |
| Calendar | 3/5 | Basic error handling |
| Settings | 3/5 | Save errors generic |
| Admin | 3/5 | Standard error handling |

---

### 10. Help and Documentation

**Definition:** Even though it is better if the system can be used without documentation, it may be necessary to provide help and documentation.

#### Current Implementation

| Strength | Location |
|----------|----------|
| Form field descriptions | Trip form (purpose, ghosted) |
| Export info alert explaining formats | Exports page |
| Placeholder text in inputs | Search, forms |
| Clear labels throughout | All forms |
| Alert banner explains what it shows | Dashboard |

#### Violations & Issues

| Issue | Severity | Location |
|-------|----------|----------|
| No help center or documentation link | High | Global |
| No tooltips on dashboard metrics | Medium | Dashboard stats |
| 90/180 rule not explained in-app | High | Dashboard |
| Import format not documented | Medium | Import |
| No onboarding for new users | High | Post-signup |
| Settings options lack explanations | Medium | Settings |

#### Recommendations

1. **Add contextual help tooltips**
   ```tsx
   // Dashboard stats
   <Card>
     <CardHeader className="flex flex-row items-center gap-2">
       <CardTitle>Days Remaining</CardTitle>
       <TooltipProvider>
         <Tooltip>
           <TooltipTrigger>
             <HelpCircle className="h-4 w-4 text-muted-foreground" />
           </TooltipTrigger>
           <TooltipContent className="max-w-xs">
             Days remaining in the rolling 180-day window before reaching
             the 90-day Schengen limit
           </TooltipContent>
         </Tooltip>
       </TooltipProvider>
     </CardHeader>
   </Card>
   ```

2. **Add 90/180 explainer**
   ```tsx
   // Collapsible info section on dashboard
   <Collapsible className="mb-4">
     <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground">
       <InfoIcon className="h-4 w-4" />
       What is the 90/180 day rule?
     </CollapsibleTrigger>
     <CollapsibleContent className="mt-2 p-4 bg-blue-50 rounded-lg">
       <p>Non-EU nationals can stay in the Schengen Area for up to 90 days
       within any rolling 180-day period. ComplyEUR tracks this automatically
       for each employee.</p>
     </CollapsibleContent>
   </Collapsible>
   ```

3. **New user onboarding**
   ```tsx
   // First-time user checklist
   <Card className="border-blue-200 bg-blue-50">
     <CardHeader>
       <CardTitle>Getting Started</CardTitle>
     </CardHeader>
     <CardContent>
       <ul className="space-y-2">
         <li className="flex items-center gap-2">
           <CheckCircle className="h-4 w-4 text-green-500" />
           Create your account
         </li>
         <li className="flex items-center gap-2">
           <Circle className="h-4 w-4 text-gray-300" />
           Add your first employee
         </li>
         <li className="flex items-center gap-2">
           <Circle className="h-4 w-4 text-gray-300" />
           Log a trip
         </li>
       </ul>
     </CardContent>
   </Card>
   ```

4. **Help link in header**
   ```tsx
   // Add to sidebar footer or header
   <Link href="/help" className="flex items-center gap-2">
     <HelpCircle className="h-4 w-4" />
     Help & Support
   </Link>
   ```

5. **Import format documentation**
   ```tsx
   // Inline help on import page
   <Accordion type="single" collapsible>
     <AccordionItem value="format">
       <AccordionTrigger>CSV Format Requirements</AccordionTrigger>
       <AccordionContent>
         <ul className="list-disc pl-4 space-y-1 text-sm">
           <li>First row must be column headers</li>
           <li>Dates: DD/MM/YYYY format</li>
           <li>Country: 2-letter ISO code (e.g., FR, DE, ES)</li>
         </ul>
       </AccordionContent>
     </AccordionItem>
   </Accordion>
   ```

#### Page Scores

| Page | Score | Notes |
|------|-------|-------|
| Login | 3/5 | Basic, no contextual help |
| Dashboard | 2/5 | No metric explanations |
| Employees | 3/5 | Minimal guidance |
| Trips | 3/5 | Some field descriptions |
| Import | 2/5 | Format unclear |
| Calendar | 2/5 | No help for interpretation |
| Settings | 2/5 | Options unexplained |
| Admin | 3/5 | Basic labels |

---

## Summary Scoring Table

| Page | H1 | H2 | H3 | H4 | H5 | H6 | H7 | H8 | H9 | H10 | **Avg** |
|------|-----|-----|-----|-----|-----|-----|-----|-----|-----|------|---------|
| Login | 4 | 5 | 4 | 5 | 4 | 4 | 3 | 5 | 3 | 3 | **4.0** |
| Dashboard | 4 | 4 | 3 | 4 | 3 | 4 | 3 | 4 | 3 | 2 | **3.4** |
| Employees | 4 | 4 | 3 | 4 | 3 | 4 | 3 | 4 | 3 | 3 | **3.5** |
| Trips | 4 | 3 | 3 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | **3.6** |
| Import | 3 | 4 | 2 | 4 | 2 | 3 | 4 | 3 | 2 | 2 | **2.9** |
| Calendar | 3 | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 2 | **3.4** |
| Settings | 4 | 3 | 4 | 4 | 3 | 3 | 3 | 2 | 3 | 2 | **3.1** |
| Admin | 4 | 3 | 3 | 3 | 3 | 4 | 3 | 3 | 3 | 3 | **3.2** |
| **Avg** | **3.8** | **3.8** | **3.3** | **4.0** | **3.3** | **3.6** | **3.1** | **3.6** | **3.0** | **2.5** | **3.4** |

**Heuristic Key:**
- H1: Visibility of System Status
- H2: Match Between System and Real World
- H3: User Control and Freedom
- H4: Consistency and Standards
- H5: Error Prevention
- H6: Recognition Rather Than Recall
- H7: Flexibility and Efficiency of Use
- H8: Aesthetic and Minimalist Design
- H9: Help Users Recognize, Diagnose, and Recover from Errors
- H10: Help and Documentation

---

## Priority Fixes (Quick Wins)

### High Priority (Impact + Low Effort)

| Fix | Location | Effort | Impact |
|-----|----------|--------|--------|
| Add step indicator to import wizard | Import layout | 30 min | High |
| Rename "Ghosted" to "Exclude from calculation" | Trip form | 5 min | High |
| Add 90/180 rule explainer | Dashboard | 30 min | High |
| Improve import error messages with row numbers | Import preview | 1 hr | High |
| Add tooltips to dashboard metrics | Dashboard stats | 30 min | Medium |
| Add undo toast for trip deletion | Trip actions | 30 min | High |

### Medium Priority

| Fix | Location | Effort | Impact |
|-----|----------|--------|--------|
| Add keyboard shortcuts (Cmd+K search) | Global | 2 hr | Medium |
| Collapse advanced settings | Settings page | 1 hr | Medium |
| Add back navigation to import steps | Import wizard | 30 min | Medium |
| Paginate trip history | Employee detail | 1 hr | Medium |
| Add "recently viewed" employees | Dashboard | 1 hr | Low |

### Low Priority (Nice to Have)

| Fix | Location | Effort | Impact |
|-----|----------|--------|--------|
| Saved filter presets | Dashboard | 3 hr | Low |
| Bulk trip selection/deletion | Employee detail | 2 hr | Low |
| Export presets | Exports page | 1 hr | Low |
| New user onboarding checklist | Dashboard | 3 hr | Medium |

---

## Conclusion

ComplyEUR v2.0 demonstrates solid UX foundations with consistent design patterns, good responsive behavior, and appropriate loading states. The primary areas for improvement are:

1. **Help & Documentation (Score: 2.5/5)** — Users need more contextual guidance, especially around the 90/180 rule
2. **Error Recovery (Score: 3.0/5)** — Error messages need specificity and recovery options
3. **Flexibility (Score: 3.1/5)** — Power users would benefit from keyboard shortcuts and bulk operations
4. **Error Prevention (Score: 3.3/5)** — Import validation and duplicate detection need strengthening

Implementing the high-priority quick wins would significantly improve the user experience with minimal development effort.
