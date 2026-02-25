import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Calendar } from 'lucide-react'
import { parseISO, format } from 'date-fns'
import { getEmployeeById, getTripsByEmployeeId, getEmployeesForDropdown } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmployeeDetailActions } from './employee-detail-actions'
import { TripList } from '@/components/trips/trip-list'

const AddTripModal = dynamic(
  () => import('@/components/trips/add-trip-modal').then(mod => ({ default: mod.AddTripModal })),
)
const BulkAddTripsModal = dynamic(
  () => import('@/components/trips/bulk-add-trips-modal').then(mod => ({ default: mod.BulkAddTripsModal })),
)
import { isSchengenCountry } from '@/lib/constants/schengen-countries'
import { isExemptFromTracking, NATIONALITY_TYPE_LABELS, type NationalityType } from '@/lib/constants/nationality-types'
import { calculateCompliance, getStatusFromDaysUsed, parseDateOnlyAsUTC, type Trip as ComplianceTrip, type RiskLevel } from '@/lib/compliance'
import { toUTCMidnight } from '@/lib/compliance/date-utils'
import { getCompanySettings } from '@/lib/actions/settings'

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>
}

function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'd MMMM yyyy')
}

function formatDateTime(dateString: string): string {
  return format(parseISO(dateString), "d MMMM yyyy 'at' HH:mm")
}

/**
 * Convert database trip to compliance engine format
 * Uses UTC date-only parsing to avoid timezone drift
 */
function toComplianceTrip(trip: { entry_date: string; exit_date: string; country: string }): ComplianceTrip {
  return {
    entryDate: parseDateOnlyAsUTC(trip.entry_date),
    exitDate: parseDateOnlyAsUTC(trip.exit_date),
    country: trip.country,
  }
}

/**
 * Get badge styling based on risk level
 */
function getStatusBadgeProps(status: RiskLevel | 'exempt'): {
  label: string
  className: string
} {
  switch (status) {
    case 'breach':
      return {
        label: 'Breach',
        className: 'bg-slate-900 text-white border-slate-900',
      }
    case 'red':
      return {
        label: 'High Risk',
        className: 'bg-rose-100 text-rose-800 border-rose-300',
      }
    case 'amber':
      return {
        label: 'At Risk',
        className: 'bg-amber-100 text-amber-800 border-amber-200',
      }
    case 'exempt':
      return {
        label: 'Exempt',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      }
    case 'green':
    default:
      return {
        label: 'Compliant',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      }
  }
}

/**
 * Skeleton for the trip list while streaming
 */
function TripListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

/**
 * Async server component for trip list — streams via Suspense
 * so the employee header renders immediately.
 */
async function TripSection({
  employeeId,
  employeeName,
  nationalityType,
  trips,
}: {
  employeeId: string
  employeeName: string
  nationalityType: NationalityType
  trips: Awaited<ReturnType<typeof getTripsByEmployeeId>>
}) {
  const employeesForReassign = await getEmployeesForDropdown()

  // UK citizens don't need domestic UK trips displayed
  const displayTrips = nationalityType === 'uk_citizen'
    ? trips.filter((trip) => trip.country !== 'GB')
    : trips

  return (
    <TripList
      trips={displayTrips}
      employeeId={employeeId}
      employeeName={employeeName}
      employees={employeesForReassign}
    />
  )
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = await params
  // Fetch employee first (single row by PK — fast) and trips in parallel
  const [employee, trips, settings] = await Promise.all([
    getEmployeeById(id),
    getTripsByEmployeeId(id),
    getCompanySettings(),
  ])

  if (!employee) {
    notFound()
  }

  const nationalityType = (employee.nationality_type ?? 'uk_citizen') as NationalityType
  const exempt = isExemptFromTracking(nationalityType)

  // UK citizens don't need domestic UK trips displayed
  const displayTrips = nationalityType === 'uk_citizen'
    ? trips.filter((trip) => trip.country !== 'GB')
    : trips

  // Calculate Schengen days used (only non-ghosted Schengen trips)
  const schengenTrips = displayTrips.filter(
    (trip) => !trip.ghosted && isSchengenCountry(trip.country)
  )
  const totalSchengenDays = schengenTrips.reduce(
    (sum, trip) => sum + (trip.travel_days ?? 0),
    0
  )

  // Calculate compliance using the compliance engine (rolling 180-day window)
  // Skip for exempt employees
  const complianceTrips = schengenTrips.map(toComplianceTrip)
  const complianceResult = !exempt
    ? calculateCompliance(complianceTrips, {
        mode: 'audit',
        referenceDate: toUTCMidnight(new Date()),
      })
    : null

  const detailStatus = exempt
    ? 'exempt'
    : complianceResult
      ? getStatusFromDaysUsed(complianceResult.daysUsed, {
          greenMax: settings?.status_green_max ?? 68,
          amberMax: settings?.status_amber_max ?? 82,
          redMax: settings?.status_red_max ?? 89,
        })
      : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{employee.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Added {formatDate(employee.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AddTripModal employeeId={employee.id} employeeName={employee.name} />
          <BulkAddTripsModal employeeId={employee.id} employeeName={employee.name} />
          <EmployeeDetailActions employee={employee} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!exempt && (
          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
              <CardDescription>Current Schengen visa status (rolling 180-day window)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  {detailStatus ? (
                    <Badge
                      variant="outline"
                      className={getStatusBadgeProps(detailStatus).className}
                    >
                      {getStatusBadgeProps(detailStatus).label}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                      No trips
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Days Used</span>
                  <span className="font-medium">
                    {complianceResult ? `${complianceResult.daysUsed} / 90` : '0 / 90'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Days Remaining</span>
                  <span className={`font-medium ${
                    complianceResult && complianceResult.daysRemaining < 0
                      ? 'text-red-600'
                      : complianceResult && complianceResult.daysRemaining < 10
                        ? 'text-amber-600'
                        : ''
                  }`}>
                    {complianceResult
                      ? complianceResult.daysRemaining >= 0
                        ? complianceResult.daysRemaining
                        : `${Math.abs(complianceResult.daysRemaining)} over limit`
                      : '90'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {exempt && (
          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
              <CardDescription>EU/Schengen citizens are exempt from the 90/180-day rule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Exempt
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Trip Summary</CardTitle>
            <CardDescription>Travel overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Trips</span>
                <span className="font-medium">{displayTrips.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Schengen Trips</span>
                <span className="font-medium">{schengenTrips.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Schengen Days</span>
                <span className="font-medium">{totalSchengenDays}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Employee information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Name</span>
                <p className="font-medium">{employee.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Nationality Type</span>
                <p className="font-medium">{NATIONALITY_TYPE_LABELS[nationalityType]}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Created</span>
                <p className="font-medium">{formatDateTime(employee.created_at)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Last Updated</span>
                <p className="font-medium">{formatDateTime(employee.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trip list streams via Suspense — header/cards render immediately */}
      <Card>
        <CardHeader>
          <CardTitle>Travel History</CardTitle>
          <CardDescription>
            Recorded trips for {employee.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<TripListSkeleton />}>
            <TripSection
              employeeId={employee.id}
              employeeName={employee.name}
              nationalityType={nationalityType}
              trips={trips}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
