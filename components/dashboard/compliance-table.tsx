'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './status-badge'
import { StatusFilters } from './status-filters'
import { SortSelect } from './sort-select'
import { EmptyState } from './empty-state'
import { DashboardStats } from './dashboard-stats'
import type {
  EmployeeCompliance,
  StatusFilter,
  SortOption,
  ComplianceStats,
} from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface ComplianceTableProps {
  employees: EmployeeCompliance[]
}

/**
 * Format a date string for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'No trips'
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Calculate compliance statistics from employee data
 */
function calculateStats(employees: EmployeeCompliance[]): ComplianceStats {
  return {
    total: employees.length,
    compliant: employees.filter((e) => e.risk_level === 'green').length,
    at_risk: employees.filter((e) => e.risk_level === 'amber').length,
    non_compliant: employees.filter((e) => e.risk_level === 'red').length,
  }
}

/**
 * Mobile card view for a single employee
 */
function EmployeeCard({ employee }: { employee: EmployeeCompliance }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Link
          href={`/employee/${employee.id}`}
          className="font-medium text-slate-900 hover:underline"
        >
          {employee.name}
        </Link>
        <StatusBadge status={employee.risk_level} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-slate-500">Days Used:</span>
          <span className="ml-2 font-medium">{employee.days_used} / 90</span>
        </div>
        <div>
          <span className="text-slate-500">Remaining:</span>
          <span
            className={cn(
              'ml-2 font-medium',
              employee.days_remaining < 0 && 'text-red-600'
            )}
          >
            {employee.days_remaining}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-slate-500">Last Trip:</span>
          <span className="ml-2">{formatDate(employee.last_trip_date)}</span>
        </div>
      </div>
      <div className="pt-2 border-t border-slate-100">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/employee/${employee.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * Main compliance table component with filtering and sorting.
 * Displays employee compliance data with status badges and days remaining.
 * Responsive: converts to card layout on mobile.
 */
export function ComplianceTable({ employees }: ComplianceTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize filter from URL or default to 'all'
  const initialFilter =
    (searchParams.get('status') as StatusFilter) || 'all'
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter)
  const [sortBy, setSortBy] = useState<SortOption>('days_remaining_asc')

  // Calculate stats from all employees (unfiltered)
  const stats = useMemo(() => calculateStats(employees), [employees])

  // Handle filter change and update URL
  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter)
    const params = new URLSearchParams(searchParams.toString())
    if (filter === 'all') {
      params.delete('status')
    } else {
      params.set('status', filter)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  // Apply filtering and sorting
  const filteredAndSorted = useMemo(() => {
    let result = [...employees]

    // Apply filter
    if (statusFilter !== 'all') {
      result = result.filter((e) => e.risk_level === statusFilter)
    }

    // Apply sort
    switch (sortBy) {
      case 'days_remaining_asc':
        result.sort((a, b) => a.days_remaining - b.days_remaining)
        break
      case 'days_remaining_desc':
        result.sort((a, b) => b.days_remaining - a.days_remaining)
        break
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'days_used_desc':
        result.sort((a, b) => b.days_used - a.days_used)
        break
      case 'days_used_asc':
        result.sort((a, b) => a.days_used - b.days_used)
        break
    }

    return result
  }, [employees, statusFilter, sortBy])

  // Show empty state if no employees at all
  if (employees.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-8">
      {/* Summary stats */}
      <DashboardStats stats={stats} />

      {/* Filters and sort controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <StatusFilters
          activeFilter={statusFilter}
          onFilterChange={handleFilterChange}
          stats={stats}
        />
        <SortSelect value={sortBy} onValueChange={setSortBy} />
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold w-[130px]">Status</TableHead>
              <TableHead className="font-semibold w-[100px]">Days Used</TableHead>
              <TableHead className="font-semibold w-[130px]">Days Remaining</TableHead>
              <TableHead className="font-semibold w-[120px]">Last Trip</TableHead>
              <TableHead className="font-semibold w-[90px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-slate-500"
                >
                  No employees match the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSorted.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/employee/${employee.id}`)}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/employee/${employee.id}`}
                      className="hover:underline text-slate-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {employee.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={employee.risk_level} />
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {employee.days_used} / 90
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'font-medium',
                        employee.days_remaining >= 30 && 'text-green-600',
                        employee.days_remaining >= 10 &&
                          employee.days_remaining < 30 &&
                          'text-amber-600',
                        employee.days_remaining < 10 && 'text-red-600'
                      )}
                    >
                      {employee.days_remaining} days
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {formatDate(employee.last_trip_date)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/employee/${employee.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-4">
        {filteredAndSorted.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            No employees match the selected filter.
          </div>
        ) : (
          filteredAndSorted.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))
        )}
      </div>
    </div>
  )
}
