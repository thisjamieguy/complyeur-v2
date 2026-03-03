# Admin Feedback Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/admin/feedback` page that lists all user feedback submissions, with company name linked to the company page, category filter, and pagination.

**Architecture:** Two changes only — add a nav item to the existing sidebar array, then create a single server component page that queries `feedback_submissions` joined with `companies` and `profiles`. Follows the exact pattern of `app/admin/activity/page.tsx`.

**Tech Stack:** Next.js App Router (server component), Supabase admin client, Tailwind CSS, Lucide icons, shadcn/ui Card + Badge.

---

### Task 1: Add Feedback to the admin sidebar

**Files:**
- Modify: `components/admin/admin-sidebar.tsx`

**Step 1: Add `MessageSquare` to the icon imports**

In `components/admin/admin-sidebar.tsx`, the import block currently is:
```ts
import {
  LayoutDashboard,
  Building2,
  Layers,
  Activity,
  Settings,
  BarChart3,
  ArrowLeft,
} from 'lucide-react'
```

Add `MessageSquare` to that list:
```ts
import {
  LayoutDashboard,
  Building2,
  Layers,
  Activity,
  Settings,
  BarChart3,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react'
```

**Step 2: Add the nav item**

In the `navigation` array, insert the Feedback entry between Activity and Settings:
```ts
const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Companies', href: '/admin/companies', icon: Building2 },
  { name: 'Tiers', href: '/admin/tiers', icon: Layers },
  { name: 'Metrics', href: '/admin/metrics', icon: BarChart3 },
  { name: 'Activity', href: '/admin/activity', icon: Activity },
  { name: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]
```

**Step 3: Verify manually**

Visit `/admin` in the browser — "Feedback" should appear in the sidebar between Activity and Settings.

**Step 4: Commit**

```bash
git add components/admin/admin-sidebar.tsx
git commit -m "feat(admin): add Feedback nav item to admin sidebar"
```

---

### Task 2: Create the `/admin/feedback` page

**Files:**
- Create: `app/admin/feedback/page.tsx`

**Step 1: Write the page file**

Create `app/admin/feedback/page.tsx` with this exact content:

```tsx
import Link from 'next/link'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { requireSuperAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Bug, Lightbulb, HelpCircle, MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

const CATEGORY_CONFIG = {
  bug: {
    label: 'Bug',
    icon: Bug,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    badgeClass: 'bg-red-100 text-red-700',
  },
  feature_request: {
    label: 'Feature Request',
    icon: Lightbulb,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  confusing_ux: {
    label: 'Confusing UX',
    icon: HelpCircle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  other: {
    label: 'Other',
    icon: MessageSquare,
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    badgeClass: 'bg-slate-100 text-slate-700',
  },
} as const

type Category = keyof typeof CATEGORY_CONFIG

const VALID_CATEGORIES = Object.keys(CATEGORY_CONFIG) as Category[]

const FILTER_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All', value: '' },
  { label: 'Bugs', value: 'bug' },
  { label: 'Feature Requests', value: 'feature_request' },
  { label: 'Confusing UX', value: 'confusing_ux' },
  { label: 'Other', value: 'other' },
]

interface SearchParams {
  page?: string
  category?: string
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireSuperAdmin()
  const supabase = createAdminClient()
  const params = await searchParams

  const page = Math.max(1, parseInt(params.page || '1'))
  const categoryParam = params.category
  const activeCategory = VALID_CATEGORIES.includes(categoryParam as Category)
    ? (categoryParam as Category)
    : null

  const perPage = 50
  const offset = (page - 1) * perPage

  let query = supabase
    .from('feedback_submissions')
    .select(
      `
      id,
      category,
      message,
      page_path,
      created_at,
      companies ( id, name ),
      profiles!user_id ( full_name )
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (activeCategory) {
    query = query.eq('category', activeCategory)
  }

  const { data: submissions, count } = await query

  const totalPages = Math.ceil((count || 0) / perPage)

  function buildHref(overrides: Partial<SearchParams>) {
    const next = { page: String(page), category: categoryParam || '', ...overrides }
    const qs = new URLSearchParams()
    if (next.page && next.page !== '1') qs.set('page', next.page)
    if (next.category) qs.set('category', next.category)
    const str = qs.toString()
    return `/admin/feedback${str ? `?${str}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Feedback</h1>
        <p className="mt-1 text-sm text-slate-500">
          User-submitted feedback across all companies ({count ?? 0} total)
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => {
          const isActive =
            option.value === '' ? !activeCategory : activeCategory === option.value
          return (
            <Link
              key={option.value}
              href={buildHref({ category: option.value, page: '1' })}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
              )}
            >
              {option.label}
            </Link>
          )
        })}
      </div>

      {/* Submissions list */}
      {!submissions || submissions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">No feedback submitted yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-slate-100">
            {submissions.map((item) => {
              const category = item.category as Category
              const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other
              const Icon = config.icon
              const company = item.companies as { id: string; name: string } | null
              const profile = item.profiles as { full_name: string | null } | null

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                >
                  {/* Category icon */}
                  <div className={cn('rounded-full p-2 shrink-0', config.bgColor)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 leading-snug">{item.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.page_path}
                      {profile?.full_name && (
                        <> &middot; {profile.full_name}</>
                      )}
                    </p>
                  </div>

                  {/* Right meta */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0 min-w-[140px]">
                    {company ? (
                      <Link
                        href={`/admin/companies/${company.id}`}
                        className="text-sm font-medium text-slate-900 hover:underline text-right"
                      >
                        {company.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-400">Unknown company</span>
                    )}
                    <Badge
                      className={cn(
                        'text-xs border-0',
                        config.badgeClass,
                      )}
                    >
                      {config.label}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildHref({ page: String(page - 1) })}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildHref({ page: String(page + 1) })}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

```bash
npm run typecheck
```

Expected: no errors.

**Step 3: Smoke test in browser**

Navigate to `/admin/feedback`. Confirm:
- Page loads with the correct heading
- Sidebar shows "Feedback" as active
- Category filter buttons work (URL changes, list filters)
- Each submission shows message, page path, company name (linked), category badge, time ago
- Empty state shows if no submissions exist

**Step 4: Commit**

```bash
git add app/admin/feedback/page.tsx
git commit -m "feat(admin): add feedback submissions page"
```
