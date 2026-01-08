import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton loader for the summary stats cards.
 */
export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton loader for the filter and sort controls.
 */
export function FiltersSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4">
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-lg" />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-[220px] rounded-lg" />
      </div>
    </div>
  )
}

/**
 * Skeleton loader for the compliance table rows.
 */
export function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Table header skeleton */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      {/* Table rows skeleton */}
      <div className="divide-y divide-slate-100">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex items-center gap-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Combined skeleton for the entire dashboard loading state.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats cards */}
      <StatsCardsSkeleton />

      {/* Filters and sort */}
      <FiltersSkeleton />

      {/* Table */}
      <TableSkeleton />
    </div>
  )
}
