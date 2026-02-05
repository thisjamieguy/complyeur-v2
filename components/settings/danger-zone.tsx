'use client'

import * as React from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  getDataCounts,
  getEmployeesForDeletion,
  getTripsForDeletion,
  getMappingsForDeletion,
  getHistoryForDeletion,
  bulkDeleteData,
  type DataCounts,
  type EmployeeItem,
  type TripItem,
  type MappingItem,
  type HistoryItem,
} from '@/lib/actions/bulk-delete'
import { format, parseISO } from 'date-fns'

type Step = 'selection' | 'confirmation'

interface CategoryState {
  expanded: boolean
  selectedIds: Set<string>
  items: EmployeeItem[] | TripItem[] | MappingItem[] | HistoryItem[]
  loading: boolean
}

export function DangerZone() {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<Step>('selection')
  const [counts, setCounts] = React.useState<DataCounts | null>(null)
  const [loadingCounts, setLoadingCounts] = React.useState(false)
  const [confirmInput, setConfirmInput] = React.useState('')
  const [isDeleting, setIsDeleting] = React.useState(false)

  const [employees, setEmployees] = React.useState<CategoryState>({
    expanded: false,
    selectedIds: new Set(),
    items: [],
    loading: false,
  })

  const [trips, setTrips] = React.useState<CategoryState>({
    expanded: false,
    selectedIds: new Set(),
    items: [],
    loading: false,
  })

  const [mappings, setMappings] = React.useState<CategoryState>({
    expanded: false,
    selectedIds: new Set(),
    items: [],
    loading: false,
  })

  const [history, setHistory] = React.useState<CategoryState>({
    expanded: false,
    selectedIds: new Set(),
    items: [],
    loading: false,
  })

  // Load counts when modal opens
  const handleOpenChange = async (newOpen: boolean) => {
    if (newOpen && !counts) {
      setLoadingCounts(true)
      try {
        const data = await getDataCounts()
        setCounts(data)
      } catch (error) {
        console.error('Failed to load data counts:', error)
        toast.error('Failed to load data counts')
      } finally {
        setLoadingCounts(false)
      }
    }
    setOpen(newOpen)

    // Reset state when closing
    if (!newOpen) {
      setStep('selection')
      setConfirmInput('')
      setEmployees((prev) => ({ ...prev, expanded: false, selectedIds: new Set() }))
      setTrips((prev) => ({ ...prev, expanded: false, selectedIds: new Set() }))
      setMappings((prev) => ({ ...prev, expanded: false, selectedIds: new Set() }))
      setHistory((prev) => ({ ...prev, expanded: false, selectedIds: new Set() }))
    }
  }

  // Load items when category is expanded
  const loadEmployees = async () => {
    if (employees.items.length > 0) return
    setEmployees((prev) => ({ ...prev, loading: true }))
    try {
      const items = await getEmployeesForDeletion()
      setEmployees((prev) => ({ ...prev, items, loading: false }))
    } catch (error) {
      console.error('Failed to load employees:', error)
      setEmployees((prev) => ({ ...prev, loading: false }))
    }
  }

  const loadTrips = async () => {
    if (trips.items.length > 0) return
    setTrips((prev) => ({ ...prev, loading: true }))
    try {
      const items = await getTripsForDeletion()
      setTrips((prev) => ({ ...prev, items, loading: false }))
    } catch (error) {
      console.error('Failed to load trips:', error)
      setTrips((prev) => ({ ...prev, loading: false }))
    }
  }

  const loadMappings = async () => {
    if (mappings.items.length > 0) return
    setMappings((prev) => ({ ...prev, loading: true }))
    try {
      const items = await getMappingsForDeletion()
      setMappings((prev) => ({ ...prev, items, loading: false }))
    } catch (error) {
      console.error('Failed to load mappings:', error)
      setMappings((prev) => ({ ...prev, loading: false }))
    }
  }

  const loadHistory = async () => {
    if (history.items.length > 0) return
    setHistory((prev) => ({ ...prev, loading: true }))
    try {
      const items = await getHistoryForDeletion()
      setHistory((prev) => ({ ...prev, items, loading: false }))
    } catch (error) {
      console.error('Failed to load history:', error)
      setHistory((prev) => ({ ...prev, loading: false }))
    }
  }

  const toggleExpand = async (
    category: 'employees' | 'trips' | 'mappings' | 'history'
  ) => {
    const setters = { employees: setEmployees, trips: setTrips, mappings: setMappings, history: setHistory }
    const loaders = { employees: loadEmployees, trips: loadTrips, mappings: loadMappings, history: loadHistory }
    const states = { employees, trips, mappings, history }

    const setter = setters[category]
    const loader = loaders[category]
    const state = states[category]

    setter((prev) => ({ ...prev, expanded: !prev.expanded }))

    if (!state.expanded && state.items.length === 0) {
      await loader()
    }
  }

  const toggleSelectAll = async (
    category: 'employees' | 'trips' | 'mappings' | 'history'
  ) => {
    const setters = { employees: setEmployees, trips: setTrips, mappings: setMappings, history: setHistory }
    const loaders = { employees: loadEmployees, trips: loadTrips, mappings: loadMappings, history: loadHistory }
    const states = { employees, trips, mappings, history }

    const setter = setters[category]
    const loader = loaders[category]
    const state = states[category]

    // If items haven't been loaded yet, load them first
    if (state.items.length === 0) {
      await loader()
      // After loading, select all (the setter will use the updated items)
      setter((prev) => ({
        ...prev,
        selectedIds: new Set(prev.items.map((item) => item.id)),
      }))
      return
    }

    if (state.selectedIds.size === state.items.length && state.items.length > 0) {
      // Deselect all
      setter((prev) => ({ ...prev, selectedIds: new Set() }))
    } else {
      // Select all
      setter((prev) => ({
        ...prev,
        selectedIds: new Set(prev.items.map((item) => item.id)),
      }))
    }
  }

  const toggleItem = (
    category: 'employees' | 'trips' | 'mappings' | 'history',
    itemId: string
  ) => {
    const setters = { employees: setEmployees, trips: setTrips, mappings: setMappings, history: setHistory }
    const setter = setters[category]

    setter((prev) => {
      const newSelected = new Set(prev.selectedIds)
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId)
      } else {
        newSelected.add(itemId)
      }
      return { ...prev, selectedIds: newSelected }
    })
  }

  const hasSelection =
    employees.selectedIds.size > 0 ||
    trips.selectedIds.size > 0 ||
    mappings.selectedIds.size > 0 ||
    history.selectedIds.size > 0

  const handleContinue = () => {
    if (hasSelection) {
      setStep('confirmation')
    }
  }

  const handleBack = () => {
    setStep('selection')
    setConfirmInput('')
  }

  const handleDelete = async () => {
    if (confirmInput !== 'DELETE') return

    setIsDeleting(true)
    try {
      const result = await bulkDeleteData({
        employeeIds: Array.from(employees.selectedIds),
        tripIds: Array.from(trips.selectedIds),
        mappingIds: Array.from(mappings.selectedIds),
        historyIds: Array.from(history.selectedIds),
      })

      if (result.success) {
        toast.success('Data deleted successfully', {
          description: `Deleted ${result.employees} employees, ${result.trips} trips, ${result.mappings} mappings, ${result.history} import records`,
        })
        setOpen(false)
        // Reset counts to force reload on next open
        setCounts(null)
        // Reset item lists
        setEmployees((prev) => ({ ...prev, items: [], selectedIds: new Set() }))
        setTrips((prev) => ({ ...prev, items: [], selectedIds: new Set() }))
        setMappings((prev) => ({ ...prev, items: [], selectedIds: new Set() }))
        setHistory((prev) => ({ ...prev, items: [], selectedIds: new Set() }))
      } else {
        toast.error('Some deletions failed', {
          description: result.errors.join(', '),
        })
      }
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Failed to delete data')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Danger Zone Card */}
      <div className="border border-red-200 bg-red-50/50 rounded-xl p-6">
        <div className="flex items-center gap-2 text-red-800 mb-2">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Danger Zone</h2>
        </div>
        <p className="text-sm text-red-700 mb-4">
          Permanently remove employees, trips, and other data from your account.
        </p>
        <Button
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
          onClick={() => handleOpenChange(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Data...
        </Button>
      </div>

      {/* Delete Data Modal */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          {step === 'selection' ? (
            <>
              <DialogHeader>
                <DialogTitle>Delete Data</DialogTitle>
                <DialogDescription>
                  Select the data you want to delete. Expand categories to select individual items.
                </DialogDescription>
              </DialogHeader>

              {loadingCounts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {/* Employees Category */}
                      <CategorySection
                        title="Employees"
                        count={counts?.employees ?? 0}
                        selectedCount={employees.selectedIds.size}
                        expanded={employees.expanded}
                        loading={employees.loading}
                        recoverable
                        onToggleExpand={() => toggleExpand('employees')}
                        onSelectAll={() => toggleSelectAll('employees')}
                        isAllSelected={
                          employees.items.length > 0 &&
                          employees.selectedIds.size === employees.items.length
                        }
                      >
                        {employees.items.map((item) => (
                          <ItemRow
                            key={item.id}
                            selected={employees.selectedIds.has(item.id)}
                            onToggle={() => toggleItem('employees', item.id)}
                          >
                            {(item as EmployeeItem).name}
                          </ItemRow>
                        ))}
                      </CategorySection>

                      {/* Trips Category */}
                      <CategorySection
                        title="Trips"
                        count={counts?.trips ?? 0}
                        selectedCount={trips.selectedIds.size}
                        expanded={trips.expanded}
                        loading={trips.loading}
                        onToggleExpand={() => toggleExpand('trips')}
                        onSelectAll={() => toggleSelectAll('trips')}
                        isAllSelected={
                          trips.items.length > 0 &&
                          trips.selectedIds.size === trips.items.length
                        }
                      >
                        {(trips.items as TripItem[]).map((item) => (
                          <ItemRow
                            key={item.id}
                            selected={trips.selectedIds.has(item.id)}
                            onToggle={() => toggleItem('trips', item.id)}
                          >
                            <span className="truncate">
                              {item.employeeName} - {item.destination} ({formatDateRange(item.startDate, item.endDate)})
                            </span>
                          </ItemRow>
                        ))}
                      </CategorySection>

                      {/* Mappings Category */}
                      <CategorySection
                        title="Column Mappings"
                        count={counts?.mappings ?? 0}
                        selectedCount={mappings.selectedIds.size}
                        expanded={mappings.expanded}
                        loading={mappings.loading}
                        onToggleExpand={() => toggleExpand('mappings')}
                        onSelectAll={() => toggleSelectAll('mappings')}
                        isAllSelected={
                          mappings.items.length > 0 &&
                          mappings.selectedIds.size === mappings.items.length
                        }
                      >
                        {mappings.items.map((item) => (
                          <ItemRow
                            key={item.id}
                            selected={mappings.selectedIds.has(item.id)}
                            onToggle={() => toggleItem('mappings', item.id)}
                          >
                            {(item as MappingItem).name}
                          </ItemRow>
                        ))}
                      </CategorySection>

                      {/* Import History Category */}
                      <CategorySection
                        title="Import History"
                        count={counts?.history ?? 0}
                        selectedCount={history.selectedIds.size}
                        expanded={history.expanded}
                        loading={history.loading}
                        onToggleExpand={() => toggleExpand('history')}
                        onSelectAll={() => toggleSelectAll('history')}
                        isAllSelected={
                          history.items.length > 0 &&
                          history.selectedIds.size === history.items.length
                        }
                      >
                        {(history.items as HistoryItem[]).map((item) => (
                          <ItemRow
                            key={item.id}
                            selected={history.selectedIds.has(item.id)}
                            onToggle={() => toggleItem('history', item.id)}
                          >
                            <span className="truncate">
                              {item.fileName} ({formatDate(item.createdAt)})
                            </span>
                          </ItemRow>
                        ))}
                      </CategorySection>
                    </div>
                  </ScrollArea>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleContinue}
                  disabled={!hasSelection}
                >
                  Continue
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <button
                    onClick={handleBack}
                    className="text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 rotate-180" />
                  </button>
                  Confirm Deletion
                </DialogTitle>
                <DialogDescription>
                  Review what will be deleted and type DELETE to confirm.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-amber-800 mb-3">
                    You are about to delete:
                  </p>

                  {employees.selectedIds.size > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 text-sm text-amber-700 mb-1">
                        <RotateCcw className="h-4 w-4" />
                        <span className="font-medium">Recoverable (30 days)</span>
                      </div>
                      <ul className="text-sm text-amber-600 ml-6 list-disc">
                        <li>{employees.selectedIds.size} employee{employees.selectedIds.size !== 1 ? 's' : ''}</li>
                      </ul>
                    </div>
                  )}

                  {(trips.selectedIds.size > 0 ||
                    mappings.selectedIds.size > 0 ||
                    history.selectedIds.size > 0) && (
                    <div>
                      <div className="flex items-center gap-2 text-sm text-red-700 mb-1">
                        <Trash2 className="h-4 w-4" />
                        <span className="font-medium">Permanent</span>
                      </div>
                      <ul className="text-sm text-red-600 ml-6 list-disc">
                        {trips.selectedIds.size > 0 && (
                          <li>{trips.selectedIds.size} trip{trips.selectedIds.size !== 1 ? 's' : ''}</li>
                        )}
                        {mappings.selectedIds.size > 0 && (
                          <li>{mappings.selectedIds.size} column mapping{mappings.selectedIds.size !== 1 ? 's' : ''}</li>
                        )}
                        {history.selectedIds.size > 0 && (
                          <li>{history.selectedIds.size} import record{history.selectedIds.size !== 1 ? 's' : ''}</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
                  <p>
                    Employees can be restored from{' '}
                    <span className="font-medium">Settings &rarr; GDPR</span> within 30 days.
                    All other items cannot be recovered.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-delete" className="text-slate-700">
                    Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
                  </Label>
                  <Input
                    id="confirm-delete"
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="DELETE"
                    className="font-mono"
                    disabled={isDeleting}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    autoFocus
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleBack} disabled={isDeleting}>
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={confirmInput !== 'DELETE' || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Data'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Category section with expand/collapse
interface CategorySectionProps {
  title: string
  count: number
  selectedCount: number
  expanded: boolean
  loading: boolean
  recoverable?: boolean
  onToggleExpand: () => void
  onSelectAll: () => void
  isAllSelected: boolean
  children: React.ReactNode
}

function CategorySection({
  title,
  count,
  selectedCount,
  expanded,
  loading,
  recoverable,
  onToggleExpand,
  onSelectAll,
  isAllSelected,
  children,
}: CategorySectionProps) {
  const hasItems = count > 0

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        role="button"
        tabIndex={hasItems ? 0 : undefined}
        className={`w-full flex items-center justify-between p-3 transition-colors text-left ${hasItems ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-60'}`}
        onClick={onToggleExpand}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(); } }}
      >
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isAllSelected && hasItems}
            onCheckedChange={() => onSelectAll()}
            onClick={(e) => e.stopPropagation()}
            disabled={!hasItems}
          />
          <span className="font-medium text-slate-900">{title}</span>
          {recoverable && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              recoverable
            </span>
          )}
          {!recoverable && hasItems && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
              permanent
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <span className="text-xs text-slate-500">
              {selectedCount} selected
            </span>
          )}
          <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full min-w-[2rem] text-center">
            {count}
          </span>
          {hasItems && (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )
          )}
        </div>
      </div>

      {expanded && hasItems && (
        <div className="border-t bg-slate-50/50">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              <div className="p-2 border-b bg-slate-100/50">
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 cursor-pointer"
                  onClick={onSelectAll}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectAll(); } }}
                >
                  <Checkbox checked={isAllSelected} />
                  <span>Select All</span>
                </div>
              </div>
              <div className="divide-y">{children}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Individual item row
interface ItemRowProps {
  selected: boolean
  onToggle: () => void
  children: React.ReactNode
}

function ItemRow({ selected, onToggle, children }: ItemRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="w-full flex items-center gap-3 p-2 pl-4 hover:bg-slate-100 transition-colors text-left text-sm cursor-pointer"
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
    >
      <Checkbox checked={selected} />
      <span className="text-slate-700 truncate">{children}</span>
    </div>
  )
}

// Helper functions
function formatDateRange(start: string, end: string): string {
  try {
    const startDate = parseISO(start)
    const endDate = parseISO(end)
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
  } catch {
    return `${start} - ${end}`
  }
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}
