'use client'

import { useState, useMemo, useCallback, memo, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
// DashboardStats removed — replaced by ComplianceBriefing in the dashboard page
import { EmployeeSearch } from './employee-search'
import { Pagination } from '@/components/ui/pagination'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const QuickAddTripModal = dynamic(
  () => import('./quick-add-trip-modal').then(m => m.QuickAddTripModal),
  { ssr: false }
)
import { DashboardStatusLegend } from '@/components/compliance/risk-legends'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  /** Whether the company has any employees before search/filtering */
  hasEmployees: boolean
  /** Pre-calculated stats from all employees (not just current page) */
  stats?: ComplianceStats
  /** Pagination info from server */
  pagination?: PaginationInfo
  /** Current search query (for controlled input) */
  initialSearch?: string
  /** Current sort from server (synced via URL param) */
  initialSort?: SortOption
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

function getDaysRemainingClassName(
  riskLevel: EmployeeCompliance['risk_level']
): string {
  switch (riskLevel) {
    case 'green':
      return 'text-emerald-700'
    case 'amber':
      return 'text-amber-700'
    case 'red':
      return 'text-rose-600'
    case 'breach':
      return 'text-slate-900'
    case 'exempt':
    default:
      return 'text-brand-500'
  }
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
  onOpenAddTrip,
}: {
  employee: EmployeeCompliance
  onOpenAddTrip: (employeeId: string, employeeName: string) => void
}) {
  const isExempt = employee.risk_level === 'exempt'

  return (
    <div className="bg-white border border-slate-200/80 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Link
          href={`/employee/${employee.id}`}
          className="font-medium text-brand-900 hover:underline"
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
              onOpenAddTrip(employee.id, employee.name)
            }}
            aria-label={`Add trip for ${employee.name}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <StatusBadge status={employee.risk_level} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {isExempt ? (
          <div className="col-span-2">
            <span className="text-brand-600">EU/Schengen citizen — exempt from 90/180-day tracking</span>
          </div>
        ) : (
          <>
            <div>
              <span className="text-brand-600">Days Used:</span>
              <span className="ml-2 font-medium">{employee.days_used} / 90</span>
            </div>
            <div>
              <span className="text-brand-600">Remaining:</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'ml-2 font-medium cursor-help underline decoration-slate-200 decoration-dotted underline-offset-2',
                      getDaysRemainingClassName(employee.risk_level)
                    )}
                  >
                    {employee.days_remaining}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="w-64 p-3 shadow-xl border-slate-200 bg-white" side="bottom">
                  <ComplianceCalculationTrace employee={employee} />
                </TooltipContent>
              </Tooltip>
            </div>
          </>
        )}
        <div className="col-span-2">
          <span className="text-brand-600">Last Trip:</span>
          <span className="ml-2">{formatDate(employee.last_trip_date)}</span>
        </div>
      </div>
      <Link
        href={`/employee/${employee.id}`}
        className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-sm text-brand-500 hover:text-brand-800"
      >
        <Eye className="h-4 w-4" />
        <span>View Details</span>
      </Link>
    </div>
  )
})

/**
 * Get dynamic styles for a table row based on risk level.
 * Adds background tints and a status-colored left border for visual urgency.
 */
function getRowRiskStyles(riskLevel: EmployeeCompliance['risk_level']): string {
  switch (riskLevel) {
    case 'breach':
      return 'bg-rose-50/40 hover:bg-rose-100/60 border-l-2 border-l-rose-600'
    case 'red':
      return 'bg-orange-50/30 hover:bg-orange-100/50 border-l-2 border-l-orange-500'
    case 'amber':
      return 'bg-amber-50/20 hover:bg-amber-100/40 border-l-2 border-l-amber-400'
    case 'green':
      return 'hover:bg-emerald-50/30 border-l-2 border-l-transparent'
    case 'exempt':
    default:
      return 'hover:bg-slate-50 border-l-2 border-l-transparent'
  }
}

/**
 * Tooltip content that explains the 90/180-day compliance math.
 * Built from the extended EmployeeCompliance fields.
 */
function ComplianceCalculationTrace({ employee }: { employee: EmployeeCompliance }) {
  if (employee.risk_level === 'exempt') return null

  return (
    <div className="space-y-3 py-1">
      <div className="border-b border-slate-100 pb-1.5">
        <h4 className="font-semibold text-slate-900 text-sm leading-none">Calculation Trace</h4>
        <p className="text-[10px] text-slate-400 uppercase font-medium mt-1">Schengen 90/180-day rule</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Current Window Use:</span>
          <span className="font-bold text-slate-900">{employee.days_used} / 90 days</span>
        </div>

        {employee.max_stay_days !== undefined && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Max Stay if Entering Today:</span>
            <span className="font-semibold text-brand-600">{employee.max_stay_days} days</span>
          </div>
        )}

        {employee.next_expiring_date && (
          <div className="pt-1.5 border-t border-slate-100">
            <div className="flex justify-between items-start text-xs">
              <span className="text-slate-500 italic">Next day back:</span>
              <div className="text-right">
                <div className="font-semibold text-slate-900">
                  {formatDate(employee.next_expiring_date)}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">
                  +{employee.next_expiring_count} {employee.next_expiring_count === 1 ? 'day' : 'days'} recovered
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Main compliance table component with filtering and sorting.
 * Displays employee compliance data with status badges and days remaining.
 * Responsive: converts to card layout on mobile.
 *
 * Supports server-side pagination when pagination prop is provided.
 */
export function ComplianceTable({
  employees,
  hasEmployees,
  stats: serverStats,
  pagination,
  initialSearch: initialSearchProp,
  initialSort: initialSortProp,
}: ComplianceTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize filter from URL or default to 'all'
  const initialFilter =
    (searchParams.get('status') as StatusFilter) || 'all'
  const initialSearch = initialSearchProp ?? searchParams.get('search') ?? ''
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter)
  const [sortBy, setSortBy] = useState<SortOption>(initialSortProp ?? 'days_remaining_asc')
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [inlineMessage, setInlineMessage] = useState<string | null>(null)

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

  const handleAddTripOpenChange = useCallback((open: boolean) => {
    if (!open) closeAddTripModal()
  }, [closeAddTripModal])

  // Use server stats if provided (for accurate totals with pagination),
  // otherwise calculate from current employees (backward compatible)
  const stats = useMemo(
    () => serverStats ?? calculateStats(employees),
    [serverStats, employees]
  )

  // Handle filter change and update URL (resets to page 1)
  const handleFilterChange = useCallback(
    (filter: StatusFilter) => {
      setStatusFilter(filter)
      const params = new URLSearchParams(searchParams.toString())
      if (filter === 'all') {
        params.delete('status')
      } else {
        params.set('status', filter)
      }
      // Reset to page 1 when filter changes
      params.delete('page')
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

  // Handle sort change — push to URL param for server-side sort (M-26)
  const handleSortChange = useCallback(
    (sort: SortOption) => {
      setSortBy(sort)
      const params = new URLSearchParams(searchParams.toString())
      if (sort === 'days_remaining_asc') {
        params.delete('sort')
      } else {
        params.set('sort', sort)
      }
      // Reset to page 1 when sort changes
      params.delete('page')
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  const handleResetView = useCallback(() => {
    setStatusFilter('all')
    setSortBy('days_remaining_asc')
    setSearchQuery('')
    router.push(pathname, { scroll: false })
  }, [pathname, router])

  useEffect(() => {
    const employeeUpdatedHandler = (event: Event) => {
      const customEvent = event as CustomEvent<string>
      setInlineMessage(customEvent.detail || 'Employee list updated successfully.')
    }
    window.addEventListener('complyeur:employee-updated', employeeUpdatedHandler as EventListener)
    return () => {
      window.removeEventListener('complyeur:employee-updated', employeeUpdatedHandler as EventListener)
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('focusSearch') === '1') {
      window.dispatchEvent(new Event('complyeur:focus-dashboard-search'))
      const params = new URLSearchParams(searchParams.toString())
      params.delete('focusSearch')
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }
  }, [pathname, router, searchParams])

  // Status filter is now server-side via URL params (like search and sort)
  const filteredAndSorted = employees

  // Show empty state if no employees at all (check stats.total for accurate count with pagination)
  if (!hasEmployees) {
    return <EmptyState />
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-8">
        {inlineMessage && (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{inlineMessage}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setInlineMessage(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search, filters and sort controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <EmployeeSearch
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name..."
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleResetView}
          >
            Reset filters
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <StatusFilters
            activeFilter={statusFilter}
            onFilterChange={handleFilterChange}
            stats={stats}
          />
          <SortSelect value={sortBy} onValueChange={handleSortChange} />
        </div>
        <DashboardStatusLegend />
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-brand-50">
              <TableHead className="font-semibold text-brand-700">Employee</TableHead>
              <TableHead className="font-semibold text-brand-700 w-[130px]">Status</TableHead>
              <TableHead className="font-semibold text-brand-700 w-[100px]">Days Used</TableHead>
              <TableHead className="font-semibold text-brand-700 w-[130px]">Days Remaining</TableHead>
              <TableHead className="font-semibold text-brand-700 w-[120px]">Last Trip</TableHead>
              <TableHead className="font-semibold text-brand-700 w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-brand-600"
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
                    className={cn(
                      'cursor-pointer transition-all',
                      getRowRiskStyles(employee.risk_level)
                    )}
                    onClick={() => router.push(`/employee/${employee.id}`)}
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/employee/${employee.id}`}
                        className="hover:underline text-brand-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {employee.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={employee.risk_level} />
                    </TableCell>
                    <TableCell className="text-brand-500">
                      {isExempt ? '-' : `${employee.days_used} / 90`}
                    </TableCell>
                    <TableCell>
                      {isExempt ? (
                        <span className="text-brand-300">-</span>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                'font-medium cursor-help underline decoration-slate-200 decoration-dotted underline-offset-4',
                                getDaysRemainingClassName(employee.risk_level)
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {employee.days_remaining} days
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="w-64 p-3 shadow-xl border-slate-200 bg-white" side="top">
                            <ComplianceCalculationTrace employee={employee} />
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="text-brand-600">
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
                          aria-label={`Add trip for ${employee.name}`}
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
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-brand-600">
            No employees match the selected filter.
          </div>
        ) : (
          filteredAndSorted.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onOpenAddTrip={openAddTripModal}
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
        onOpenChange={handleAddTripOpenChange}
      />
    </div>
  </TooltipProvider>
  )
}
