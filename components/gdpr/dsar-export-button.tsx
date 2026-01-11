'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, Loader2, FileArchive } from 'lucide-react'
import { toast } from 'sonner'
import { requestDsarExport } from '@/app/(dashboard)/gdpr/actions'

interface Employee {
  id: string
  name: string
  isAnonymized: boolean
}

interface DsarExportButtonProps {
  employees: Employee[]
}

/**
 * DSAR Export button component.
 * Allows selecting an employee and generating their data export.
 */
export function DsarExportButton({ employees }: DsarExportButtonProps) {
  const [selectedEmployee, setSelectedEmployee] = React.useState<string>('')
  const [isExporting, setIsExporting] = React.useState(false)

  const activeEmployees = employees.filter((emp) => !emp.isAnonymized)

  const handleExport = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee')
      return
    }

    setIsExporting(true)

    try {
      const result = await requestDsarExport(selectedEmployee)

      if (!result.success) {
        toast.error(result.error ?? 'Failed to generate export')
        return
      }

      // Trigger download
      if (result.downloadUrl && result.fileName) {
        const link = document.createElement('a')
        link.href = result.downloadUrl
        link.download = result.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success('DSAR export complete', {
          description: 'Check your downloads folder',
        })
      }
    } catch (error) {
      console.error('[DSAR Export] Error:', error)
      toast.error('Failed to generate export')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Select an employee..." />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-60">
              {activeEmployees.length === 0 ? (
                <div className="p-2 text-sm text-slate-500">
                  No employees available
                </div>
              ) : (
                activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleExport}
          disabled={!selectedEmployee || isExporting}
          className="gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export Data
            </>
          )}
        </Button>
      </div>

      <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
        <div className="flex items-start gap-3">
          <FileArchive className="mt-0.5 h-5 w-5 text-slate-400" />
          <div>
            <p className="font-medium text-slate-700">GDPR Article 15 - Right of Access</p>
            <p className="mt-1">
              Generates a ZIP file containing all personal data held for the selected employee,
              including employee records, travel history, and compliance data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
