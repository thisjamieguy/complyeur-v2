import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import { getEmployeeById, getTripsByEmployeeId, getEmployees } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmployeeDetailActions } from './employee-detail-actions'
import { AddTripModal } from '@/components/trips/add-trip-modal'
import { BulkAddTripsModal } from '@/components/trips/bulk-add-trips-modal'
import { TripList } from '@/components/trips/trip-list'
import { isSchengenCountry } from '@/lib/constants/schengen-countries'

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

  // Calculate Schengen days used (only non-ghosted Schengen trips)
  const schengenTrips = trips.filter(
    (trip) => !trip.ghosted && isSchengenCountry(trip.country)
  )
  const totalSchengenDays = schengenTrips.reduce(
    (sum, trip) => sum + (trip.travel_days ?? 0),
    0
  )

  // Recent trips for the summary card (last 5)
  const recentTrips = trips.slice(0, 5)

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
        <Card>
          <CardHeader>
            <CardTitle>Compliance Status</CardTitle>
            <CardDescription>Current Schengen visa status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge variant="outline">—</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Days Used</span>
                <span className="font-medium">
                  {trips.length > 0 ? totalSchengenDays : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Days Remaining</span>
                <span className="font-medium">—</span>
              </div>
              <p className="text-xs text-gray-400 pt-2 border-t">
                {trips.length > 0
                  ? 'Full compliance calculation coming in Phase 6.'
                  : 'Compliance tracking will be available after adding trips.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trip Summary</CardTitle>
            <CardDescription>Travel overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Trips</span>
                <span className="font-medium">{trips.length}</span>
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
            All recorded trips for {employee.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TripList
            trips={trips}
            employeeId={employee.id}
            employeeName={employee.name}
            employees={employeesForReassign}
          />
        </CardContent>
      </Card>
    </div>
  )
}
