# Interactive Calendar Redesign - Design Document

**Date:** 2026-02-04
**Status:** Ready for Implementation
**Scope:** Essential features first, comprehensive feature roadmap below
**Development:** Sandboxed until 100% ready for production

---

## Overview

Transform the existing read-only Gantt calendar into a **fully interactive trip management interface**. This calendar is one of THE MAJOR UNITS of the application - the flagship feature that managers will live in daily.

The calendar becomes the primary tool for managers to organize team travel - all trip changes happen directly on the calendar with real-time database sync. The vision is a best-in-class experience comparable to professional scheduling tools like Gantt charts in project management software.

---

## Goals

1. **Direct manipulation** - Create, edit, delete, and reassign trips by interacting with the calendar visually
2. **Instant feedback** - All changes appear immediately (optimistic updates)
3. **Safety net** - Undo/redo support for all actions
4. **Zoom control** - View timeline at different scales (week to 6 months)

---

## User Interactions

### Creating Trips

| Method | Behavior |
|--------|----------|
| Click empty space | Opens trip form with that date pre-filled |
| Click and drag across days | Highlights range, opens form with both dates filled |
| Right-click → "Add trip here" | Opens trip form with that date pre-filled |

### Editing Trips

| Action | Behavior |
|--------|----------|
| Drag left edge of trip | Changes entry date, visual updates as you drag |
| Drag right edge of trip | Changes exit date, visual updates as you drag |
| Drag whole trip vertically | Moves to different employee (confirmation required) |
| Shift + drag to employee | Copies trip instead of moving |
| Right-click trip | Context menu with all options |
| Double-click trip | Opens edit form |

### Context Menu (Right-click on Trip)

- Edit trip
- Delete trip
- Duplicate trip
- Copy to another employee (submenu with employee list)
- Mark as private / Mark as work
- Ghost / Unghost trip

### Context Menu (Right-click on Empty Space)

- Add new trip here
- Paste trip (if one was copied)

### Zoom Controls

- Preset buttons: Week / Month / 3 Months / 6 Months
- Ctrl + scroll wheel for fine adjustment
- Smooth 300ms transition animation

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo last action |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Delete / Backspace | Delete selected trip |
| Enter | Open edit form for selected trip |
| Escape | Cancel current operation / close form |
| Arrow keys | Navigate between trips |

---

## Trip Form Design

**Default View (Minimal)**
- Destination (searchable dropdown with country list)
- End date (date picker, entry date pre-filled from click position)
- Work / Personal toggle

**Expanded View ("More options")**
- Purpose (text input)
- Job reference (text input)
- Ghost trip checkbox

**Behavior**
- Appears as popover near click position
- Auto-focus on destination field
- Enter to save, Escape to cancel
- Validates dates (end must be >= entry)

---

## Technical Architecture

### State Management

New `CalendarProvider` context wrapping the calendar:

```typescript
interface CalendarState {
  trips: Map<string, ProcessedTrip>      // Local trip state
  pendingSaves: Set<string>              // Trip IDs being saved
  selectedTripId: string | null          // Currently selected trip
  clipboard: ProcessedTrip | null        // Copied trip for paste
  undoStack: CalendarAction[]            // Last 10 actions
  redoStack: CalendarAction[]            // Undone actions
  zoomLevel: ZoomLevel                   // Current zoom
}

type CalendarAction =
  | { type: 'CREATE_TRIP'; trip: ProcessedTrip }
  | { type: 'UPDATE_TRIP'; tripId: string; changes: Partial<Trip> }
  | { type: 'DELETE_TRIP'; tripId: string }
  | { type: 'MOVE_TRIP'; tripId: string; newEmployeeId: string }
  | { type: 'DUPLICATE_TRIP'; tripId: string }
```

### Optimistic Update Flow

```
User Action
    ↓
Dispatch to reducer (local state updates instantly)
    ↓
Push action to undo stack
    ↓
UI re-renders immediately
    ↓
Background: Call Supabase mutation
    ↓
Success → Remove from pendingSaves
Failure → Rollback state + show error toast
```

### New Files to Create

```
/lib/calendar/
  calendar-state.tsx        # React context + reducer
  calendar-actions.ts       # Action creators with validation
  calendar-mutations.ts     # Supabase mutation functions
  undo-redo.ts             # Undo/redo stack logic
  zoom.ts                  # Zoom level calculations

/components/calendar/
  calendar-provider.tsx     # Context provider wrapper
  trip-editor.tsx          # Create/edit trip form
  context-menu.tsx         # Right-click menu
  confirm-dialog.tsx       # Move/delete confirmation
  zoom-controls.tsx        # Zoom preset buttons
  saving-indicator.tsx     # "Saving..." toast
  drag-handle.tsx          # Resize handles for trip edges
```

### Components to Modify

| Component | Changes |
|-----------|---------|
| TripBar | Add drag handles, whole-bar dragging, right-click, selection state |
| EmployeeRow | Drop zone highlighting, click-to-create, drag-to-create |
| GanttChart | Coordinate drag operations, keyboard navigation |
| CalendarView | Connect to CalendarProvider, remove prop-based state |
| DateHeader | Zoom-responsive column widths |

### Database Mutations

All mutations use Supabase client with RLS (no Edge Functions needed):

```typescript
// Create trip
await supabase.from('trips').insert({
  employee_id,
  company_id: user.id,
  country,
  entry_date,
  exit_date,
  purpose,
  job_ref,
  is_private
})

// Update trip
await supabase.from('trips')
  .update({ entry_date, exit_date, ... })
  .eq('id', tripId)

// Delete trip (soft delete)
await supabase.from('trips')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', tripId)

// Move trip to different employee
await supabase.from('trips')
  .update({ employee_id: newEmployeeId })
  .eq('id', tripId)
```

---

## Visual Design

### Drag Feedback

- **Resize cursor**: When hovering trip edges
- **Grabbing cursor**: While dragging
- **Ghost preview**: Semi-transparent trip follows cursor when moving between employees
- **Drop zone highlight**: Target employee row glows blue when valid drop target
- **Date tooltip**: Shows current date value while resizing

### Form Appearance

- Popover with 12px border radius
- White background, subtle shadow
- 8px internal padding
- Matches existing design system

### Zoom Transitions

- 300ms ease-out animation
- Day column widths: 32px (default) → 8px (zoomed out) → 64px (zoomed in)
- Maintains scroll position relative to today

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Save fails (network) | Rollback to previous state, red toast: "Failed to save. Please try again." |
| Save fails (validation) | Rollback, toast shows validation error |
| Conflict (trip modified elsewhere) | Prompt: "This trip was modified. Reload?" |
| Invalid date range (end < start) | Prevent drop, show inline error |
| Drag to non-existent employee | Snap back to original position |

---

## Implementation Phases

### Phase 1: Foundation
- CalendarProvider with state management
- Undo/redo system
- Drag handles on trip edges (resize)
- Optimistic updates + database sync
- Saving indicator

### Phase 2: Core Interactions
- Drag trips between employees (with confirmation)
- Click empty space → create trip form
- Click-and-drag to create trip range
- Right-click context menu
- TripEditor form

### Phase 3: Zoom & Navigation
- Zoom preset buttons
- Ctrl+scroll wheel zoom
- Keyboard shortcuts
- Smooth zoom transitions

### Phase 4: Polish & Testing
- Error handling for all edge cases
- Loading states
- Performance testing with large datasets
- Accessibility review

---

## Testing Strategy

### Unit Tests
- Reducer logic (all action types)
- Undo/redo stack behavior
- Date calculations for drag operations

### Integration Tests
- Drag-to-resize saves to database
- Move trip updates employee_id
- Context menu actions work correctly

### E2E Tests
- Full workflow: create → edit → move → delete trip
- Undo/redo through multiple operations
- Zoom controls at different levels

---

## Future Features (Complete Roadmap)

These are planned for future phases after essentials are solid. Organized by category.

---

### Window & Display Modes

| Feature | Description |
|---------|-------------|
| Pop-out window | Calendar opens in its own browser window |
| Full-screen immersive mode | Distraction-free planning, hides all other UI |
| Dark mode | For late-night planning sessions |
| High contrast mode | For visibility impairments |
| Picture-in-picture mini-calendar | Small month overview always visible |

---

### Trip Block Enhancements

| Feature | Description |
|---------|-------------|
| Status colors | Different colors for confirmed vs unconfirmed trips |
| Duration label on bar | Show "5d" directly on the trip bar |
| Country flags on bars | Visual country indicator on each trip |
| Destination preview | Country code visible on the bar itself |
| Tentative mode | Dashed border for "maybe" trips that don't count toward compliance |
| Split trip | Right-click to split a long trip into two |
| Merge trips | Select two adjacent trips → merge into one |
| Trip linking | Visually connect related trips (outbound + return legs) |

---

### Advanced Trip Manipulation

| Feature | Description |
|---------|-------------|
| Snap-to-weekend | Trips auto-align to start Monday / end Friday when dragging near |
| Trip templates | Save "Paris client visit (5 days)" as reusable template |
| Recurring trips | "Every 2nd Monday" pattern for regular travelers |
| Trip cloning with offset | "Repeat this trip 4 weeks later" |
| Duplicate across employees | Copy trip to all selected employees |
| Swap employees | Drag trip from Sarah to Mike, option to swap |

---

### Smart Assistance & Intelligence

| Feature | Description |
|---------|-------------|
| Auto-scheduler | "Find next available 2-week window for Germany" button |
| Compliance forecast | "If current pattern continues, breach on [date]" |
| Trip suggestions | "Sarah hasn't used 45 days - safe for extended trip" |
| Conflict detector | "James and Mike both in Paris - intentional?" |
| Risk alerts banner | Warning when any employee is within 10 days of breach |
| "Danger zone" overlay | Red tint on dates where adding a trip would breach |
| Safe travel windows highlighting | Green overlay on safe dates |

---

### Visual Modes & Overlays

| Feature | Description |
|---------|-------------|
| Employee avatars | Photos/avatars next to names |
| Team grouping | Collapse/expand departments |
| Compliance heatmap overlay | Red glow on risky periods |
| Density view | Compressed rows showing just presence/absence |
| Focus employee mode | Click employee → others fade, their trips highlight |
| Country filter | Toggle to show only specific country trips |
| Time machine | Slider to view calendar as it looked on any past date |
| Seasonal patterns | Subtle background shading for Q1/Q2/Q3/Q4 |
| Schengen entry/exit markers | Visual pins showing border crossings |

---

### Navigation & Scale

| Feature | Description |
|---------|-------------|
| Mini-map navigation | Small overview showing position in full timeline |
| Search/jump to employee | Type name, calendar scrolls to them |
| "Focus mode" | Temporarily hide employees with no upcoming trips |
| Split view | Compare two employees side-by-side |
| Fiscal year view | Apr-Mar for UK businesses |
| Quarter jump buttons | Q1 / Q2 / Q3 / Q4 quick navigation |
| "Jump to next trip" | Arrow button to scroll to next upcoming trip |
| Bookmark dates | Star important dates for quick return |

---

### Data Entry Shortcuts

| Feature | Description |
|---------|-------------|
| Quick-add bar | Type "Sarah, Paris, 10-15 March" → creates trip |
| Voice input | "Add trip for James to Berlin next Monday for 5 days" |
| Multi-select trips | Shift+click for bulk actions |
| Quick filters | Show only: warnings, this week, specific employee |

---

### Manager Workflow

| Feature | Description |
|---------|-------------|
| Trip requests queue | Employees request trips, manager approves on calendar |
| Batch approval mode | Review multiple pending trips at once |
| Lock/freeze periods | Mark company holidays or blackout dates |
| Annotation pins | Drop notes on specific dates ("Board meeting", "Trade show") |
| Trip status workflow | Requested → Approved → Completed badges |
| Notes/comments on trips | Visible on hover |
| What-if mode | Drag trips around to see compliance impact without saving |

---

### Audit & History

| Feature | Description |
|---------|-------------|
| Change timeline | See all modifications made today/this week |
| Blame view | "Who created/modified this trip?" |
| Restore deleted | Trash bin with 30-day recovery |
| Version compare | "Show what changed since last Monday" |
| Undo/redo stack | Ctrl+Z to reverse last 10 actions |

---

### Data Views & Insights

| Feature | Description |
|---------|-------------|
| Utilization heatmap | Which employees travel most/least |
| Destination breakdown | Side panel showing trips by country |
| Timeline comparison | Compare two employees side-by-side |
| Travel stats dashboard | "Your team traveled 342 days this quarter" |
| Compliance score | Team-wide health metric (% in safe zone) |
| Public holidays overlay | Per-country bank holidays on timeline |

---

### Export & Sharing

| Feature | Description |
|---------|-------------|
| Share view link | Generate read-only link for stakeholders |
| Print/export PDF | Clean PDF of current calendar view |
| CSV import | Bulk upload trips from spreadsheet |
| Calendar sync | Export to Google/Outlook calendar |
| Webhook notifications | Alert when compliance status changes |

---

### Collaboration (Multi-user)

| Feature | Description |
|---------|-------------|
| Live cursor presence | See other managers viewing the calendar |
| Slack notifications | "Trip approved" messages |
| Mobile companion | Quick view on phone (read-only) |

---

### Enterprise Features (Future)

| Feature | Description |
|---------|-------------|
| Role-based views | Managers see their team, directors see all |
| Approval workflows | Request → Manager approve → HR approve |
| Budget tracking | Estimated trip costs on the calendar |
| Policy enforcement | "This trip would exceed quarterly travel budget" |

---

### Accessibility & Polish

| Feature | Description |
|---------|-------------|
| Screen reader support | Full ARIA labels |
| Touch/tablet optimization | Pinch to zoom, swipe to scroll |
| Offline mode | View calendar without connection, sync when back |

---

## Success Criteria

### Phase 1 (Essentials)
1. User can create a trip in under 5 seconds (click, enter destination, save)
2. Dragging to resize feels instant (no perceptible lag)
3. Undo/redo works reliably for all operations
4. No data loss on network failures (rollback works)
5. Performance stays smooth with 50+ employees and 500+ trips

### Long-term Vision
6. Calendar is the "home base" for managers - they spend most of their time here
7. Comparable experience to professional tools (Monday.com, Asana timelines)
8. Zero learning curve - interactions feel intuitive immediately
9. Managers can plan a full month of team travel in under 10 minutes
10. Full accessibility compliance (WCAG 2.1 AA)

---

## Development Notes

### Sandboxing Strategy
This feature will be developed in isolation until 100% ready:
- Feature flag: `ENABLE_INTERACTIVE_CALENDAR`
- Separate route during development: `/calendar-v2`
- Existing calendar remains untouched until new version is stable
- Full regression testing before switchover

### Feature Priority Tiers

**Tier 1 (MVP - Must Have)**
- Drag edges to resize
- Drag to move between employees
- Click/drag to create
- Right-click context menu
- Undo/redo
- Zoom controls

**Tier 2 (High Value)**
- Pop-out window / fullscreen mode
- Status colors (confirmed/unconfirmed)
- Trip templates
- Keyboard shortcuts
- Employee search/jump

**Tier 3 (Differentiation)**
- Compliance forecast & smart warnings
- What-if mode
- Team grouping
- Public holidays overlay
- CSV import/export

**Tier 4 (Polish)**
- Everything else from the roadmap above

---

## User Personas

### Primary: Operations Manager / HR Manager
- **Role:** Responsible for coordinating team travel across the EU
- **Pain points:** Manually tracking compliance in spreadsheets, fear of visa violations, time spent on admin
- **Goals:** See team availability at a glance, quickly schedule trips, avoid compliance breaches
- **Tech comfort:** Moderate - familiar with business tools (Excel, email, basic SaaS)

### Secondary: Team Lead / Project Manager
- **Role:** Needs to plan project-based travel for their direct reports
- **Pain points:** Coordinating multiple people for site visits, last-minute changes
- **Goals:** Plan team trips efficiently, see who's available when
- **Tech comfort:** Varies widely

### Tertiary: Company Admin / Business Owner
- **Role:** Oversees all company travel, final approval authority
- **Pain points:** Lack of visibility, compliance risk exposure
- **Goals:** Dashboard-level oversight, peace of mind on compliance
- **Tech comfort:** Lower - wants simple, clear information

---

## User Stories

### Trip Creation
- As a manager, I want to click on a date and quickly add a trip so that I don't have to navigate away from the calendar
- As a manager, I want to drag across multiple days so that I can set the trip duration visually
- As a manager, I want to see compliance impact before I save so that I don't accidentally cause a breach

### Trip Editing
- As a manager, I want to drag the edge of a trip to change dates so that I can make quick adjustments
- As a manager, I want to drag a trip to a different employee so that I can reassign work
- As a manager, I want to undo my last action so that I can recover from mistakes

### Planning & Visibility
- As a manager, I want to zoom out to see 3 months so that I can plan ahead
- As a manager, I want to see which employees are at risk so that I can prioritise them
- As a manager, I want to filter by country so that I can see all Germany trips at once

### Collaboration
- As a manager, I want to share a view with stakeholders so that they can see the plan without editing
- As a team lead, I want to request a trip for approval so that I follow company process

---

## Competitive Reference

### Inspirations

| Tool | What they do well | What to learn |
|------|-------------------|---------------|
| **Monday.com** | Timeline view, drag-and-drop, smooth animations | Interaction patterns, visual feedback |
| **Asana Timeline** | Clean Gantt view, dependency lines | Minimal UI, focus on content |
| **Teamdeck** | Resource scheduling, availability overlay | Team-centric view |
| **Float** | Simple drag scheduling, clean design | Visual simplicity |
| **Google Calendar** | Right-click menus, keyboard shortcuts | Familiar patterns |
| **Notion Calendar** | Modern aesthetic, smooth transitions | Design polish |

### Differentiation
Our calendar is compliance-first. Unlike generic schedulers, every interaction shows compliance impact. The 90/180-day rule is baked into every visual cue.

---

## Constraints & Edge Cases

### Technical Limits

| Constraint | Limit | Behaviour when exceeded |
|------------|-------|-------------------------|
| Max employees displayed | 500 | Pagination or "load more" |
| Max trips per employee | 200 | Older trips archived |
| Date range | 2 years back, 1 year forward | Scroll stops at boundary |
| Concurrent editors | 1 per company (initially) | Lock or last-write-wins |
| Minimum trip duration | 1 day | Cannot create 0-day trips |
| Maximum trip duration | 180 days | Warning shown, still allowed |

### Edge Cases to Handle

| Scenario | Expected behaviour |
|----------|-------------------|
| Trip spans year boundary | Displays correctly across Dec-Jan |
| Employee deleted while viewing | Trip fades, cannot edit |
| Network drops mid-drag | Rollback to last saved state |
| Browser closed mid-save | Pending changes lost (acceptable) |
| Two users edit same trip | Last save wins, toast warns second user |
| Trip dates in the past | Can edit, but shows "past trip" styling |
| 100+ trips on one day | Stacking with overflow indicator |

---

## Browser & Device Support

### Supported Browsers

| Browser | Version | Support Level |
|---------|---------|---------------|
| Chrome | Latest 2 versions | Full support |
| Firefox | Latest 2 versions | Full support |
| Safari | Latest 2 versions | Full support |
| Edge | Latest 2 versions | Full support |
| IE11 | - | Not supported |

### Device Support

| Device | Support Level | Notes |
|--------|---------------|-------|
| Desktop (1280px+) | Full | Primary experience |
| Tablet (768-1279px) | Partial | Touch gestures, may hide some features |
| Mobile (<768px) | Read-only | List view fallback, no drag interactions |

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial load | < 2s | Time to interactive |
| Drag response | < 16ms | Frame time during drag (60fps) |
| Save latency | < 500ms | User action to confirmation |
| Zoom transition | < 300ms | Animation duration |
| Search results | < 100ms | Type to results |
| Memory usage | < 100MB | With 100 employees, 500 trips |

---

## Security & Permissions

### Who Can Do What

| Action | Company Admin | Manager | Employee (future) |
|--------|---------------|---------|-------------------|
| View all trips | ✓ | ✓ | Own only |
| Create trips | ✓ | ✓ | Request only |
| Edit trips | ✓ | Own team | Own only |
| Delete trips | ✓ | Own team | Request only |
| Move trips between employees | ✓ | Own team | ✗ |
| Export data | ✓ | ✓ | ✗ |
| See private trips | ✓ | Own team | Own only |

### Data Protection
- All trip data encrypted at rest (Supabase default)
- RLS enforces company isolation
- Private trips hidden from exports by default
- Audit log for compliance (who changed what, when)

---

## Data Validation Rules

### Trip Validation

| Field | Rule | Error message |
|-------|------|---------------|
| Entry date | Required, valid date | "Entry date is required" |
| Exit date | Required, >= entry date | "Exit date must be after entry date" |
| Destination | Required, valid country | "Please select a destination" |
| Employee | Must exist, not deleted | "Employee not found" |
| Duration | Max 180 days (warning only) | "Trip exceeds 180 days - please confirm" |

### Business Rules
- Cannot create trip for deleted employee
- Cannot set dates in the past (unless explicitly editing historical data)
- Ghosted trips don't count toward compliance calculations
- Private trips visible only to managers + the employee

---

## Onboarding & First-Use Experience

### First Visit
1. Brief tooltip tour (3-4 steps max):
   - "Click anywhere to add a trip"
   - "Drag edges to change dates"
   - "Right-click for more options"
   - "Press Ctrl+Z to undo"
2. Show sample data for empty accounts (optional)
3. "Skip tour" always visible

### Progressive Disclosure
- Advanced features hidden until needed
- Keyboard shortcuts shown in tooltips after user demonstrates proficiency
- "Did you know?" tips appear occasionally (dismissable forever)

### Help Resources
- `?` button opens help panel
- Contextual tooltips on hover (after 1s delay)
- Link to documentation/video tutorials
- In-app feedback button

---

## Success Metrics

### Quantitative

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Time to create trip | ~30s (separate form) | <10s | Analytics event timing |
| Trips created per session | ~2 | ~5 | Session tracking |
| Calendar page time | ~2 min | ~10 min | Time on page |
| Feature adoption (drag) | 0% | 80% | Track drag events |
| Error rate | Unknown | <1% | Failed save attempts |

### Qualitative
- User feedback: "This is so much easier"
- Support tickets: Fewer "how do I..." questions
- NPS improvement on calendar feature specifically

---

## Feedback Collection

### In-App
- Feedback button (bottom-right corner)
- Post-action micro-surveys: "Was this easy?" (thumbs up/down)
- Feature request form in settings

### External
- Monthly user interviews (first 3 months)
- Usage analytics dashboard (Posthog/Mixpanel)
- Support ticket categorisation

---

## Rollback Plan

### If Issues Arise Post-Launch

| Severity | Action | Timeline |
|----------|--------|----------|
| Critical (data loss, security) | Immediate revert to old calendar | <1 hour |
| Major (core features broken) | Revert, fix, re-deploy | <24 hours |
| Minor (cosmetic, edge cases) | Hotfix without rollback | <1 week |

### Rollback Mechanism
- Feature flag `ENABLE_INTERACTIVE_CALENDAR` can be toggled off instantly
- Old calendar code remains in codebase until new calendar is stable (3 months)
- Database schema unchanged (no migration rollback needed)

---

## Migration Strategy

### Transition Plan

**Phase 1: Soft Launch**
- New calendar available at `/calendar-v2`
- Banner on old calendar: "Try the new calendar (beta)"
- Feedback collection active

**Phase 2: Default Switch**
- New calendar becomes default at `/calendar`
- Old calendar available at `/calendar-classic`
- In-app notification explaining changes

**Phase 3: Deprecation**
- Old calendar shows deprecation warning
- 30-day notice before removal
- Remove old calendar code

### User Communication
- Email announcement 2 weeks before default switch
- In-app changelog/release notes
- Video walkthrough of new features

---

## Known Limitations

### Deliberate Constraints (v1)

| Limitation | Reason | Future consideration |
|------------|--------|---------------------|
| Single-user editing | Complexity of real-time sync | Multi-user in Tier 4 |
| No mobile drag | Touch interactions unreliable | Tablet support in Tier 3 |
| No offline editing | Sync complexity | Offline in Tier 4 |
| English only | Solo founder bandwidth | i18n in future |
| No recurring trips | Compliance complexity | After core stable |

### Technical Debt Accepted
- Initial implementation may not be fully accessible (WCAG AA target for Tier 3)
- Performance optimization deferred until after core features work
- Test coverage target 70% for v1, 90% for production release
