import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import { parseISO, format } from 'date-fns'
import { getEmployeeById, getTripsByEmployeeId, getEmployees } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmployeeDetailActions } from './employee-detail-actions'
import { AddTripModal } from '@/components/trips/add-trip-modal'
import { BulkAddTripsModal } from '@/components/trips/bulk-add-trips-modal'
import { TripList } from '@/components/trips/trip-list'
import { isSchengenCountry } from '@/lib/constants/schengen-countries'
import { isExemptFromTracking, NATIONALITY_TYPE_LABELS, type NationalityType } from '@/lib/constants/nationality-types'
import { calculateCompliance, parseDateOnlyAsUTC, type Trip as ComplianceTrip, type RiskLevel } from '@/lib/compliance'

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
 * Uses parseISO from date-fns to avoid timezone issues
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
function getStatusBadgeProps(riskLevel: RiskLevel, isCompliant: boolean): {
  label: string
  className: string
} {
  if (!isCompliant) {
    return {
      label: 'Violation',
      className: 'bg-red-100 text-red-800 border-red-200',
    }
  }
  switch (riskLevel) {
    case 'red':
      return {
        label: 'Critical',
        className: 'bg-red-100 text-red-800 border-red-200',
      }
    case 'amber':
      return {
        label: 'Warning',
        className: 'bg-amber-100 text-amber-800 border-amber-200',
      }
    case 'green':
    default:
      return {
        label: 'Compliant',
        className: 'bg-green-100 text-green-800 border-green-200',
      }
  }
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = await params
  const [employee, trips, allEmployees] = await Promise.all([
    getEmployeeById(id),
    getTripsByEmployeeId(id),
    getEmployees(),
  ])

  if (!employee) {
    notFound()
  }

  // Simplified employee list for reassignment (just id and name)
  const employeesForReassign = allEmployees.map(e => ({ id: e.id, name: e.name }))

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
  const complianceResult = !exempt && schengenTrips.length > 0
    ? calculateCompliance(complianceTrips, {
        mode: 'audit',
        referenceDate: new Date(),
      })
    : null

  // Recent trips for the summary card (last 5)
  const recentTrips = displayTrips.slice(0, 5)

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
                  {complianceResult ? (
                    <Badge
                      variant="outline"
                      className={getStatusBadgeProps(complianceResult.riskLevel, complianceResult.isCompliant).className}
                    >
                      {getStatusBadgeProps(complianceResult.riskLevel, complianceResult.isCompliant).label}
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

      <Card>
        <CardHeader>
          <CardTitle>Travel History</CardTitle>
          <CardDescription>
            Recorded trips for {employee.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TripList
            trips={displayTrips}
            employeeId={employee.id}
            employeeName={employee.name}
            employees={employeesForReassign}
          />
        </CardContent>
      </Card>
    </div>
  )
}
