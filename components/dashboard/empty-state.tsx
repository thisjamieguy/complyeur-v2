import { Users } from 'lucide-react'
import { AddEmployeeDialog } from '@/components/employees/add-employee-dialog'

/**
 * Empty state displayed when no employees exist for the company.
 * Encourages users to add their first employee.
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
          Add your first employee to start tracking Schengen compliance.
        </p>
        <div className="mt-6">
          <AddEmployeeDialog />
        </div>
      </div>
    </div>
  )
}
