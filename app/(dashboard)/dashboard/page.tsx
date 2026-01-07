import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEmployees } from '@/lib/db'
import type { Employee } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AddEmployeeDialog } from '@/components/employees/add-employee-dialog'
import { EmployeeActions } from '@/components/employees/employee-actions'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function EmployeeTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-medium text-gray-900">No employees yet</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Get started by adding your first employee to track their Schengen compliance.
          </p>
          <AddEmployeeDialog />
        </div>
      </CardContent>
    </Card>
  )
}

function EmployeeTable({ employees }: { employees: Employee[] }) {
  if (employees.length === 0) {
    return <EmptyState />
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/employee/${employee.id}`}
                    className="hover:underline"
                  >
                    {employee.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">—</Badge>
                </TableCell>
                <TableCell className="text-gray-500">
                  {formatDate(employee.created_at)}
                </TableCell>
                <TableCell>
                  <EmployeeActions employee={employee} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

async function EmployeeList() {
  const employees = await getEmployees()
  return <EmployeeTable employees={employees} />
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-2">
            Manage your team&apos;s Schengen compliance
          </p>
        </div>
        <AddEmployeeDialog />
      </div>

      <Suspense fallback={<EmployeeTableSkeleton />}>
        <EmployeeList />
      </Suspense>
    </div>
  )
}
