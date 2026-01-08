import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      {/* Page header skeleton */}
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-80 mt-2" />
      </div>

      {/* Data & Privacy Section skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Slider field */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-72" />
          </div>
          {/* Select field */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </CardContent>
      </Card>

      {/* Risk Thresholds Section skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-full max-w-lg mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Three threshold rows */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          ))}
          {/* Visual bar */}
          <Skeleton className="h-6 w-full mt-4" />
        </CardContent>
      </Card>

      {/* Forecasting Section skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-80 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-52" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3 w-72" />
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Three toggle rows */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          ))}
          {/* Weekly digest */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          </div>
          {/* Custom threshold */}
          <div className="pt-4 border-t">
            <Skeleton className="h-4 w-48" />
            <div className="flex items-center gap-3 mt-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons skeleton */}
      <div className="flex justify-end gap-3 sticky bottom-6 bg-slate-50 p-4 -mx-4 rounded-lg border shadow-sm">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Personal preferences section skeleton */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <Skeleton className="h-6 w-56 mb-2" />
        <Skeleton className="h-4 w-96 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
