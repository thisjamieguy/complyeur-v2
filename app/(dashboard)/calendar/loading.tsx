import { CalendarSkeleton } from '@/components/calendar/calendar-skeleton'

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div>
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-5 w-72 bg-slate-100 rounded-lg animate-pulse mt-2" />
      </div>

      {/* Calendar skeleton */}
      <CalendarSkeleton />
    </div>
  )
}
