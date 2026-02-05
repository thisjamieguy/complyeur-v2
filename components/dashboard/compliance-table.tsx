'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, Plus } from 'lucide-react'
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
import { EmployeeSearch } from './employee-search'
import { QuickAddTripModal } from './quick-add-trip-modal'
import { Pagination } from '@/components/ui/pagination'
import type {
  EmployeeCompliance,
  StatusFilter,
  SortOption,
  ComplianceStats,
} from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface PaginationInfo {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface ComplianceTableProps {
  employees: EmployeeCompliance[]
  /** Pre-calculated stats from all employees (not just current page) */
  stats?: ComplianceStats
  /** Pagination info from server */
  pagination?: PaginationInfo
  /** Current search query (for controlled input) */
  initialSearch?: string
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
    breach: employees.filter((e) => e.risk_level === 'breach').length,
    exempt: employees.filter((e) => e.risk_level === 'exempt').length,
  }
}

/**
 * Mobile card view for a single employee.
 * Memoized to prevent re-renders when parent state changes.
 */
const EmployeeCard = memo(function EmployeeCard({
  employee,
  onAddTrip,
}: {
  employee: EmployeeCompliance
  onAddTrip: () => void
}) {
  const isExempt = employee.risk_level === 'exempt'

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Link
          href={`/employee/${employee.id}`}
          className="font-medium text-slate-900 hover:underline"
        >
          {employee.name}
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation()
              onAddTrip()
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <StatusBadge status={employee.risk_level} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {isExempt ? (
          <div className="col-span-2">
            <span className="text-slate-500">EU/Schengen citizen — exempt from 90/180-day tracking</span>
          </div>
        ) : (
          <>
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
          </>
        )}
        <div className="col-span-2">
          <span className="text-slate-500">Last Trip:</span>
          <span className="ml-2">{formatDate(employee.last_trip_date)}</span>
        </div>
      </div>
      <Link
        href={`/employee/${employee.id}`}
        className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <Eye className="h-4 w-4" />
        <span>View Details</span>
      </Link>
    </div>
  )
})

/**
 * Main compliance table component with filtering and sorting.
 * Displays employee compliance data with status badges and days remaining.
 * Responsive: converts to card layout on mobile.
 *
 * Supports server-side pagination when pagination prop is provided.
 */
export function ComplianceTable({
  employees,
  stats: serverStats,
  pagination,
  initialSearch: initialSearchProp,
}: ComplianceTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize filter from URL or default to 'all'
  const initialFilter =
    (searchParams.get('status') as StatusFilter) || 'all'
  const initialSearch = initialSearchProp ?? searchParams.get('search') ?? ''
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter)
  const [sortBy, setSortBy] = useState<SortOption>('days_remaining_asc')
  const [searchQuery, setSearchQuery] = useState(initialSearch)

  // Quick add trip modal state
  const [addTripModal, setAddTripModal] = useState<{
    open: boolean
    employeeId: string
    employeeName: string
  }>({ open: false, employeeId: '', employeeName: '' })

  // Memoized callbacks to prevent child re-renders
  const openAddTripModal = useCallback(
    (employeeId: string, employeeName: string) => {
      setAddTripModal({ open: true, employeeId, employeeName })
    },
    []
  )

  const closeAddTripModal = useCallback(() => {
    setAddTripModal({ open: false, employeeId: '', employeeName: '' })
  }, [])

  // Use server stats if provided (for accurate totals with pagination),
  // otherwise calculate from current employees (backward compatible)
  const stats = useMemo(
    () => serverStats ?? calculateStats(employees),
    [serverStats, employees]
  )

  // Handle filter change and update URL
  const handleFilterChange = useCallback(
    (filter: StatusFilter) => {
      setStatusFilter(filter)
      const params = new URLSearchParams(searchParams.toString())
      if (filter === 'all') {
        params.delete('status')
      } else {
        params.set('status', filter)
      }
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  // Handle search change and update URL (resets to page 1)
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query)
      const params = new URLSearchParams(searchParams.toString())
      if (query.trim()) {
        params.set('search', query.trim())
      } else {
        params.delete('search')
      }
      // Reset to page 1 when search changes
      params.delete('page')
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (page === 1) {
        params.delete('page')
      } else {
        params.set('page', page.toString())
      }
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  // Apply filtering and sorting
  const filteredAndSorted = useMemo(() => {
    let result = [...employees]

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim()
      result = result.filter((e) =>
        e.name.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((e) => e.risk_level === statusFilter)
    }

    // Note: exempt employees sort to end when sorting by days_remaining_asc
    // since they have days_remaining=90

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
  }, [employees, searchQuery, statusFilter, sortBy])

  // Show empty state if no employees at all (check stats.total for accurate count with pagination)
  const totalEmployees = serverStats?.total ?? employees.length
  if (totalEmployees === 0 && employees.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-8">
      {/* Summary stats */}
      <DashboardStats stats={stats} />

      {/* Search, filters and sort controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <EmployeeSearch
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name..."
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <StatusFilters
            activeFilter={statusFilter}
            onFilterChange={handleFilterChange}
            stats={stats}
          />
          <SortSelect value={sortBy} onValueChange={setSortBy} />
        </div>
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
              <TableHead className="font-semibold w-[140px]">Actions</TableHead>
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
              filteredAndSorted.map((employee) => {
                const isExempt = employee.risk_level === 'exempt'
                return (
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
                      {isExempt ? '-' : `${employee.days_used} / 90`}
                    </TableCell>
                    <TableCell>
                      {isExempt ? (
                        <span className="text-slate-400">-</span>
                      ) : (
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
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(employee.last_trip_date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            openAddTripModal(employee.id, employee.name)
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/employee/${employee.id}`}>View</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
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
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onAddTrip={() => openAddTripModal(employee.id, employee.name)}
            />
          ))
        )}
      </div>

      {/* Pagination (only shown when pagination prop is provided) */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalCount}
          onPageChange={handlePageChange}
        />
      )}

      {/* Quick add trip modal */}
      <QuickAddTripModal
        employeeId={addTripModal.employeeId}
        employeeName={addTripModal.employeeName}
        open={addTripModal.open}
        onOpenChange={(open) => {
          if (!open) closeAddTripModal()
        }}
      />
    </div>
  )
}
