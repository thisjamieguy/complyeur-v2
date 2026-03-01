# Landing Preview Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current "sandbox" demo with a simpler guided preview that walks a prospect through one compliant trip, one high-risk trip, and one non-compliant trip.

**Architecture:** Keep the existing route and demo calendar component, but rewrite the preview page to use a fixed guided sequence instead of free-form trip management. Update the public landing copy so the experience is described as a preview rather than a sandbox while preserving existing route compatibility.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS

---

### Task 1: Rewrite the landing preview page around three preset demo steps

**Files:**
- Modify: `app/(preview)/landing-sandbox/page.tsx`

**Step 1: Replace the current free-form form model**

Remove the generic add/remove trip workflow, including:
- `nextIdRef`
- `error`
- `handleSubmit`
- `removeTrip`
- "Trips in sandbox" list copy

Replace it with:
- a seeded list of employees already visible in the dashboard/calendar
- a fixed scenario state machine with three steps
- one active traveller input flow that edits name, country, entry date, and exit date for the guided examples

**Step 2: Seed stable demo data**

Create a base data set that always includes:
- 3-4 named employees already shown in the UI
- one employee already in an amber/high-risk state
- one empty guided traveller whose trips are added during the walkthrough

Define three scenario submissions:
- compliant trip
- high-risk trip
- non-compliant trip

Use fixed offsets from today so the demo remains current without manual date maintenance.

**Step 3: Build a guided control panel**

Replace the old form UI with a left-side panel that:
- labels the experience as `Preview`, never `Sandbox`
- explains the three-step walkthrough in plain language
- shows three action buttons/cards for the compliant, high-risk, and non-compliant scenarios
- preloads the guided traveller fields for each step
- lets the prospect edit name/country/dates before applying the step

**Step 4: Make the dashboard tell the story**

Add a compact dashboard above the calendar showing:
- compliant count
- high-risk count
- non-compliant count
- a short active warning/insight banner tied to the currently applied step

Make the messaging explicit:
- first step shows a compliant confirmation
- second step shows a high-risk warning
- third step shows a non-compliant warning

**Step 5: Keep the calendar as the visual proof**

Continue passing computed employee trips into `DemoCalendar`, but ensure the guided traveller trips accumulate so the user can see:
- first trip added as compliant
- second trip added for the same traveller and shown as high risk
- third trip added for the same traveller and shown as non-compliant

**Step 6: Update surrounding copy**

Replace visible labels such as:
- `Preview Sandbox`
- `Trips in sandbox`
- `sandbox.complyeur.local`

with preview-oriented alternatives such as:
- `Preview`
- `Interactive preview`
- `preview.complyeur.app`

---

### Task 2: Remove public-facing "sandbox" wording from landing CTAs

**Files:**
- Modify: `app/(preview)/landing/page.tsx`
- Modify: `components/ui/saa-s-template.tsx`

**Step 1: Update CTA text**

Keep links pointing at the existing route, but change labels to preview language, for example:
- `Open the interactive preview`
- `Try the live preview`
- `Open calendar preview`

**Step 2: Update helper copy**

Replace any public-facing sentence that calls the experience a sandbox so prospects only see preview-oriented naming.

---

### Task 3: Verify the simplified flow

**Files:**
- Verify: `app/(preview)/landing-sandbox/page.tsx`
- Verify: `app/(preview)/landing/page.tsx`
- Verify: `components/ui/saa-s-template.tsx`

**Step 1: Run lint on touched files if available**

Run the project lint command or a targeted equivalent and confirm there are no new errors.

**Step 2: Review the updated diff**

Confirm the implementation now:
- uses preview wording instead of sandbox wording in public-facing UI
- presents exactly three guided scenario actions
- keeps seeded employees visible
- shows dashboard feedback above the calendar
- accumulates the guided traveller's trips across compliant, high-risk, and non-compliant states

**Step 3: Manual browser verification**

Open the preview page locally and confirm:
- the header says `Preview`
- the dashboard appears above the calendar
- the first scenario creates a compliant trip
- the second scenario adds a high-risk trip for the same traveller
- the third scenario adds a non-compliant trip and updates both dashboard and calendar
