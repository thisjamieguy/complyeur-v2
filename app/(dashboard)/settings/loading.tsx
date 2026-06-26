import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Route-agnostic fallback shown inside the settings content column while a
 * section loads. The masthead and nav rail live in the layout, so this only
 * sketches a section header plus a couple of cards.
 */
export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      {/* Section header skeleton */}
      <div className="space-y-2 border-b border-border pb-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-80" />
      </div>

      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-9 w-48" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
