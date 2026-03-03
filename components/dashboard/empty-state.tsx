import Link from 'next/link'
import { Users, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UnifiedAddEmployeeDialog } from '@/components/employees/unified-add-employee-dialog'

/**
 * Empty state displayed when no employees exist for the company.
 * Encourages users to add their first employee via the unified dialog.
 */
export function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 bg-slate-100 rounded-full">
          <Users className="h-12 w-12 text-slate-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-slate-900">
          No employees yet
        </h3>
        <p className="mt-2 text-center text-slate-500 max-w-sm">
          Add your first employee to start tracking Schengen compliance. You can
          also add their upcoming trips at the same time.
        </p>
        <div className="flex flex-col gap-3 mt-6 sm:flex-row sm:items-center">
          <UnifiedAddEmployeeDialog
            trigger={<Button size="lg">Add your first employee</Button>}
            source="empty_state"
          />
          <Button asChild variant="ghost">
            <Link href="/import">
              <Upload className="mr-2 h-4 w-4" />
              Import a spreadsheet instead
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
