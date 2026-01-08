import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, Users } from 'lucide-react'

/**
 * Empty state shown when no employees exist
 */
export function CalendarEmptyState() {
  return (
    <Card className="rounded-xl">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <CalendarDays className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          No employees yet
        </h3>
        <p className="text-slate-500 text-center max-w-md mb-6">
          Add employees to see their travel timeline on the calendar. Once you have
          employees with trips, they&apos;ll appear here in a visual timeline.
        </p>
        <Link href="/dashboard">
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
