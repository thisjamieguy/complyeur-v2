import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'

export const MAX_GANTT_TEMPLATE_DAYS = 500
export const MAX_UNLIMITED_TEMPLATE_EMPLOYEE_ROWS = 1000

export type GanttTemplateRangeUnit = 'days' | 'weeks' | 'months'

export interface GanttTemplateRange {
  unit: GanttTemplateRangeUnit
  value: number
}

export interface GanttTemplateWorkbookOptions {
  anchorDate: Date
  employeeRows: number
  pastRange: GanttTemplateRange
  futureRange: GanttTemplateRange
}

export const DEFAULT_GANTT_TEMPLATE_OPTIONS: Omit<GanttTemplateWorkbookOptions, 'anchorDate'> = {
  employeeRows: 10,
  pastRange: { unit: 'months', value: 12 },
  futureRange: { unit: 'weeks', value: 12 },
}

export interface GanttTemplateBounds {
  startDate: Date
  endDate: Date
  totalDays: number
}

export function getGanttTemplateBounds(
  anchorDate: Date,
  pastRange: GanttTemplateRange,
  futureRange: GanttTemplateRange
): GanttTemplateBounds {
  const normalizedAnchor = normalizeAnchorDate(anchorDate)
  const startDate = resolvePastDate(normalizedAnchor, pastRange)
  const endDate = resolveFutureDate(normalizedAnchor, futureRange)
  const totalDays = differenceInCalendarDays(endDate, startDate) + 1

  return {
    startDate,
    endDate,
    totalDays,
  }
}

export function buildGanttTemplateDates(
  anchorDate: Date,
  pastRange: GanttTemplateRange,
  futureRange: GanttTemplateRange
): Date[] {
  const { startDate, totalDays } = getGanttTemplateBounds(anchorDate, pastRange, futureRange)

  if (totalDays > MAX_GANTT_TEMPLATE_DAYS) {
    throw new Error(
      `This selection creates ${totalDays} date columns. Reduce the range to ${MAX_GANTT_TEMPLATE_DAYS} days or fewer so the workbook stays import-compatible.`
    )
  }

  return Array.from({ length: totalDays }, (_, index) => addDays(startDate, index))
}

function normalizeAnchorDate(anchorDate: Date): Date {
  return new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate())
}

function resolvePastDate(anchorDate: Date, range: GanttTemplateRange): Date {
  switch (range.unit) {
    case 'days':
      return subDays(anchorDate, range.value)
    case 'weeks':
      return subWeeks(anchorDate, range.value)
    case 'months':
      return subMonths(anchorDate, range.value)
    default:
      return anchorDate
  }
}

function resolveFutureDate(anchorDate: Date, range: GanttTemplateRange): Date {
  switch (range.unit) {
    case 'days':
      return addDays(anchorDate, range.value)
    case 'weeks':
      return addWeeks(anchorDate, range.value)
    case 'months':
      return addMonths(anchorDate, range.value)
    default:
      return anchorDate
  }
}
