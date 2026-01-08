import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for the calendar view
 */
export function CalendarSkeleton() {
  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-32" />
      </CardHeader>
      <CardContent className="p-0">
        {/* Date header skeleton */}
        <div className="flex border-b border-slate-200">
          {/* Employee column */}
          <div className="w-40 flex-shrink-0 p-3 border-r border-slate-200">
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Date columns */}
          <div className="flex-1 flex overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-8 flex-shrink-0 p-2">
                <Skeleton className="h-4 w-4 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Employee rows skeleton */}
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex border-b border-slate-100 last:border-b-0">
            {/* Employee name */}
            <div className="w-40 flex-shrink-0 p-3 border-r border-slate-100">
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Trip bars area */}
            <div className="flex-1 p-2 relative h-10">
              {rowIndex % 2 === 0 && (
                <Skeleton
                  className="absolute h-6 rounded-sm"
                  style={{
                    left: `${20 + rowIndex * 10}%`,
                    width: `${15 + rowIndex * 5}%`
                  }}
                />
              )}
              {rowIndex % 3 === 0 && (
                <Skeleton
                  className="absolute h-6 rounded-sm"
                  style={{
                    left: `${60 + rowIndex * 3}%`,
                    width: `${10 + rowIndex * 2}%`
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
