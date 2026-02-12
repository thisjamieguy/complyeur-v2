# ComplyEUR v2.0 — Coding Conventions

> **Purpose:** Ensures AI-generated code matches existing patterns.
> Feed this alongside ARCHITECTURE.md at the start of coding sessions.

---

## TypeScript Standards

### Strict Mode — No Exceptions

```json
// tsconfig.json
{ "compilerOptions": { "strict": true } }
```

- **No `any` types.** Use `unknown` + type guards if the type is truly unknown.
- **No `// @ts-ignore`.** Fix the type, don't suppress it.
- **No implicit returns.** Every function has an explicit return type for non-trivial functions.

### Naming Conventions

| Thing              | Convention          | Example                        |
|--------------------|---------------------|--------------------------------|
| Files (components) | PascalCase          | `EmployeeCard.tsx`             |
| Files (utilities)  | camelCase           | `validator.ts`                 |
| Files (types)      | camelCase           | `import.ts`                    |
| Files (actions)    | camelCase           | `actions.ts`                   |
| Components         | PascalCase          | `ValidationTable`              |
| Functions          | camelCase           | `calculateDaysRemaining`       |
| Server Actions     | camelCase, verb-first| `createTrip`, `deleteEmployee`|
| Types/Interfaces   | PascalCase          | `ImportSession`, `ValidatedRow`|
| Constants          | UPPER_SNAKE_CASE    | `MAX_FILE_SIZE`, `SCHENGEN_COUNTRIES` |
| Boolean variables  | is/has/can prefix   | `isLoading`, `hasError`, `canDelete` |
| Event handlers     | handle prefix       | `handleSubmit`, `handleDelete` |

### Imports Order

```typescript
// 1. React / Next.js
import { useState } from 'react'
import { redirect } from 'next/navigation'

// 2. Third-party libraries
import { parseISO, format } from 'date-fns'
import { z } from 'zod'

// 3. Internal — lib/utils
import { createClient } from '@/lib/supabase/server'

// 4. Internal — components
import { EmployeeCard } from '@/components/employees/EmployeeCard'

// 5. Internal — types
import type { ImportSession } from '@/types/import'
```

---

## Component Patterns

### Server Components (default)

Every component is a server component unless it needs interactivity.

```typescript
// app/(dashboard)/employee/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: employees } = await supabase
    .from('employees')
    .select('*')

  return <div>{/* render employees */}</div>
}
```

### Client Components (only when needed)

Add `'use client'` only for: forms, event handlers, useState/useEffect, browser APIs.

```typescript
'use client'

import { useState } from 'react'

export function TripForm() {
  const [isLoading, setIsLoading] = useState(false)
  // ...
}
```

### Loading & Error States (mandatory)

Every async UI interaction needs three states:

```typescript
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

async function handleSubmit() {
  setIsLoading(true)
  setError(null)
  try {
    await createTrip(formData)
    toast.success('Trip added')
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Something went wrong')
    toast.error('Failed to add trip')
  } finally {
    setIsLoading(false)
  }
}
```

Button disabled state during loading:
```tsx
<Button disabled={isLoading}>
  {isLoading ? 'Saving...' : 'Save Changes'}
</Button>
```

---

## Server Actions Pattern

Server actions live in `app/(dashboard)/actions.ts` (or `app/actions/`). They delegate to:
- **Zod schemas** in `lib/validations/` (not inline)
- **DB operations** in `lib/db/` (not inline Supabase queries)
- **Custom error classes** from `lib/errors/` (`AuthError`, `ValidationError`, `NotFoundError`, `DatabaseError`)

```typescript
// app/(dashboard)/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTrip } from '@/lib/db'
import { tripSchema } from '@/lib/validations/trip'
import { checkServerActionRateLimit } from '@/lib/rate-limit'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import type { Permission } from '@/lib/permissions'

// 1. Centralized auth + permission check helper
async function enforceMutationAccess(
  permission: Permission,
  actionName: string
): Promise<{ userId: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile?.role) throw new Error('Forbidden')

  if (!hasPermission(profile.role, permission)) {
    throw new Error('Forbidden')
  }

  return { userId: user.id }
}

// 2. Export async function — thin wrapper
export async function addTripAction(formData: {
  employee_id: string
  country: string
  entry_date: string
  exit_date: string
  purpose?: string
  job_ref?: string
}) {
  // 3. Rate limit check
  await checkServerActionRateLimit('addTripAction')

  // 4. Auth + permission check
  await enforceMutationAccess(PERMISSIONS.TRIPS_CREATE, 'addTripAction')

  // 5. Validate with Zod schema from lib/validations/
  const validated = tripSchema.parse(formData)

  // 6. Delegate DB operation to lib/db/ (handles company_id internally)
  const trip = await createTrip(validated)

  // 7. Revalidate affected routes
  revalidatePath('/dashboard')

  return trip
}
```

**Key rules:**
- `company_id` is resolved inside `lib/db/` from the authenticated user's profile — NEVER from form/request data
- Permission checks use `enforceMutationAccess()` with role-based permissions (`'owner'`/`'admin'`/`'manager'`/`'viewer'`)
- Rate limiting via `checkServerActionRateLimit()` on all public-facing actions

---

## Error Handling

### Custom Error Classes (from `lib/errors/`)

Use domain-specific error classes instead of generic `new Error()`:

```typescript
import { AuthError, DatabaseError, NotFoundError, ValidationError } from '@/lib/errors'

// ✅ Correct — typed errors enable proper handling upstream
throw new AuthError('Not authenticated')
throw new NotFoundError('Employee not found')
throw new ValidationError('Invalid date range')
throw new DatabaseError('Failed to insert trip')
```

### Always try/catch async operations

```typescript
// ✅ Correct
try {
  const { data, error } = await supabase.from('trips').select('*')
  if (error) throw new DatabaseError(error.message)
  return data
} catch (err) {
  if (err instanceof AuthError || err instanceof DatabaseError) {
    throw err  // Re-throw known errors
  }
  throw new DatabaseError('Failed to load trips')
}

// ❌ Wrong — unhandled promise
const { data } = await supabase.from('trips').select('*')
```

### Supabase error pattern

Always check for `error` in Supabase responses:

```typescript
const { data, error } = await supabase.from('employees').insert({ ... })
if (error) {
  // Handle error — don't assume data exists
  throw new DatabaseError(error.message)
}
// Safe to use data here
```

---

## Styling Conventions

### Design Tokens (use ONLY these)

```
Colors:
  Primary text:     slate-900
  Secondary text:   slate-500
  Muted text:       slate-400
  Accent:           blue-600 (hover: blue-700)
  Borders:          slate-200
  Surface:          slate-50
  Background:       white
  
  Status — Safe:    green-600 text, green-50 bg
  Status — Warning: amber-600 text, amber-50 bg
  Status — Critical:red-600 text, red-50 bg

Spacing: 8px system only (p-1, p-2, p-4, p-6, p-8, p-12, p-16)
Border radius: rounded-xl (cards), rounded-lg (buttons/inputs), rounded-md (badges)
Font: Inter via system-ui stack
Icons: Lucide React (h-4 w-4 inline, h-5 w-5 buttons, h-6 w-6 nav)
```

### Component Class Patterns

```
Card:       bg-white rounded-xl border border-slate-200 shadow-sm p-6
Primary btn: bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors
Secondary btn: bg-white hover:bg-slate-50 text-slate-900 font-medium px-4 py-2 rounded-lg border border-slate-200
Input:      w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
Badge safe: bg-green-50 text-green-700 px-2 py-1 rounded-md text-sm font-medium
Badge warn: bg-amber-50 text-amber-700 px-2 py-1 rounded-md text-sm font-medium
Badge crit: bg-red-50 text-red-700 px-2 py-1 rounded-md text-sm font-medium
```

### Forbidden

- Purple gradients
- Neon / bright saturated colors
- Sparkle emojis (✨) as UI elements
- Emoji as icon replacements — use Lucide
- Aggressive hover effects (lift, rotate, bounce)
- Arbitrary spacing values (13px, 27px, etc.)
- Placeholder `#` href values

---

## Git Conventions

### Commit Messages (Conventional Commits)

```
feat: add employee bulk delete
fix: correct 90/180 window calculation for leap year edge case
chore: update Supabase types after schema change
refactor: extract compliance calculator to lib/compliance
docs: add ARCHITECTURE.md for AI context loading
test: add trip overlap detection tests
style: fix dashboard card spacing inconsistency
```

Format: `type: lowercase description`

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`, `perf`

### Commit Frequency

- Commit after each working feature/fix — don't batch unrelated changes
- Commit working state before starting debugging sessions
- Never commit broken code to main

---

## Testing Approach

### What to Test

1. **Compliance calculations** — Most critical. Must match oracle calculator output for 300+ test cases.
2. **Multi-tenancy isolation** — Create two company accounts, verify zero data leakage.
3. **Date edge cases** — Leap years, year boundaries, same-day entry/exit, overlapping trips.
4. **Country classification** — IE and CY must NEVER count as Schengen.

### After Every Change

1. Verify the change works as expected
2. Test adjacent features (cascade bugs are common)
3. Run TypeScript check: `npx tsc --noEmit`
4. Commit with meaningful message

### When Debugging

1. **STOP** — don't keep making changes
2. Isolate the exact file/function failing
3. Understand the error before fixing
4. Minimal fix only — no refactoring while debugging
5. Test adjacent features after fix
6. Commit working state before moving on

---

## Copy & Messaging Standards

### UI Copy

| Do ✅                            | Don't ❌               |
|----------------------------------|------------------------|
| Add Employee                     | Get Started            |
| Save Changes                     | Submit                 |
| View Dashboard                   | Go                     |
| Export Report                    | Download               |
| No employees yet. Add your first.| Nothing here!          |
| Trip dates overlap with Jan 5-10.| Invalid input          |

### Example Placeholders in Docs/Tests

- Use generic company names: "Company A", "Company B", "Acme Corp"
- **NEVER** use "IES" or "INC" as company names

---

## File Creation Checklist

Before creating any new file:

- [ ] Is it in the correct folder per the structure in ARCHITECTURE.md?
- [ ] Components go in `components/<feature>/` (e.g., `components/trips/`, `components/employees/`) — NOT a generic shared folder
- [ ] Does the filename follow naming conventions (PascalCase component, camelCase util)?
- [ ] If it's a new table: does it have RLS policies?
- [ ] If it's a new query: does it go in `lib/db/` and filter by `company_id`?
- [ ] If it handles dates: is it using `date-fns` / `lib/compliance/date-utils.ts` not native `Date`?
- [ ] If it's a form: does it have loading + error states?
- [ ] If it's a mutation: is it a server action using `enforceMutationAccess()` with proper permissions?
- [ ] If it's a validation: does the Zod schema go in `lib/validations/`?
