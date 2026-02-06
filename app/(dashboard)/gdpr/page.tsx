import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Download, Trash2, EyeOff, Clock, FileText } from 'lucide-react'
import { DsarExportButton } from '@/components/gdpr/dsar-export-button'
import { DeleteButton } from '@/components/gdpr/delete-button'
import { AnonymizeButton } from '@/components/gdpr/anonymize-button'
import { DeletedEmployeesTable } from '@/components/gdpr/deleted-employees-table'
import { AuditLogTable } from '@/components/gdpr/audit-log-table'
import {
  getEmployeesForGdpr,
  getDeletedEmployeesAction,
  getGdprAuditLogAction,
  getRetentionStatsAction,
  isAdmin,
} from './actions'
import { GdprPageClient } from './gdpr-page-client'

export const metadata = {
  title: 'GDPR & Privacy Tools | ComplyEUR',
  description: 'Manage employee data rights, exports, and privacy compliance',
}

export default async function GdprPage() {
  // Check admin access
  const hasAccess = await isAdmin()
  if (!hasAccess) {
    redirect('/dashboard')
  }

  // Fetch all required data in parallel
  const [employees, deletedEmployees, auditLog, retentionStats] = await Promise.all([
    getEmployeesForGdpr(),
    getDeletedEmployeesAction(),
    getGdprAuditLogAction({ limit: 10 }),
    getRetentionStatsAction(),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            GDPR & Privacy Tools
          </h1>
          <p className="text-slate-600 mt-1">
            Manage data subject rights, exports, and compliance tools
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <FileText className="h-3 w-3" />
          Owner/Admin Only
        </Badge>
      </div>

      {/* Retention Stats */}
      {retentionStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-900">
                {retentionStats.retentionMonths}
              </div>
              <div className="text-sm text-slate-600">Retention Period (months)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-900">
                {retentionStats.expiringTripsCount}
              </div>
              <div className="text-sm text-slate-600">Expired Trips (pending purge)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-900">
                {retentionStats.expiringSoonTripsCount}
              </div>
              <div className="text-sm text-slate-600">Trips Expiring Soon</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-900">
                {retentionStats.pendingDeletionEmployeesCount}
              </div>
              <div className="text-sm text-slate-600">Pending Permanent Deletion</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main tools grid */}
      <GdprPageClient
        employees={employees}
        deletedEmployees={deletedEmployees}
        auditLog={auditLog}
      />
    </div>
  )
}
