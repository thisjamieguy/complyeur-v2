import { NextResponse } from 'next/server'
import { AppError, AuthError, DatabaseError } from '@/lib/errors'
import {
  DEFAULT_GANTT_TEMPLATE_OPTIONS,
  MAX_GANTT_TEMPLATE_DAYS,
  MAX_UNLIMITED_TEMPLATE_EMPLOYEE_ROWS,
  getGanttTemplateBounds,
  type GanttTemplateRange,
  type GanttTemplateRangeUnit,
} from '@/lib/import/gantt/template-config'
import { generateGanttTemplateWorkbookData } from '@/lib/import/gantt/template-workbook'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import { createClient } from '@/lib/supabase/server'

const VALID_RANGE_UNITS = new Set<GanttTemplateRangeUnit>(['days', 'weeks', 'months'])

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    await requireCompanyAccess(supabase)

    const options = parseTemplateOptions(new URL(request.url).searchParams)
    const { filename, bytes } = await generateGanttTemplateWorkbookData({
      anchorDate: new Date(),
      ...options,
    })
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes)
        controller.close()
      },
    })

    return new NextResponse(body, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    const message =
      error instanceof Error
        ? error.message
        : 'We could not generate the Gantt template workbook.'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

function parseTemplateOptions(searchParams: URLSearchParams): Omit<
  Parameters<typeof generateGanttTemplateWorkbookData>[0],
  'anchorDate'
> {
  const employeeRows = parseInteger(
    searchParams.get('employeeRows'),
    DEFAULT_GANTT_TEMPLATE_OPTIONS.employeeRows
  )
  const pastRange = parseRange(
    searchParams,
    'past',
    DEFAULT_GANTT_TEMPLATE_OPTIONS.pastRange
  )
  const futureRange = parseRange(
    searchParams,
    'future',
    DEFAULT_GANTT_TEMPLATE_OPTIONS.futureRange
  )

  if (!Number.isInteger(employeeRows) || employeeRows < 1) {
    throw new AppError('Employee rows must be at least 1.', 'VALIDATION_ERROR', 400)
  }

  if (employeeRows > MAX_UNLIMITED_TEMPLATE_EMPLOYEE_ROWS) {
    throw new AppError(
      `Employee rows cannot exceed ${MAX_UNLIMITED_TEMPLATE_EMPLOYEE_ROWS}.`,
      'VALIDATION_ERROR',
      400
    )
  }

  const { totalDays } = getGanttTemplateBounds(new Date(), pastRange, futureRange)
  if (totalDays > MAX_GANTT_TEMPLATE_DAYS) {
    throw new AppError(
      `This selection creates ${totalDays} date columns. Reduce the range to ${MAX_GANTT_TEMPLATE_DAYS} days or fewer so the workbook stays import-compatible.`,
      'VALIDATION_ERROR',
      400
    )
  }

  return {
    employeeRows,
    pastRange,
    futureRange,
  }
}

function parseRange(
  searchParams: URLSearchParams,
  prefix: 'past' | 'future',
  defaults: GanttTemplateRange
): GanttTemplateRange {
  const unitParam = searchParams.get(`${prefix}Unit`)
  const valueParam = searchParams.get(`${prefix}Value`)

  const unit = unitParam ?? defaults.unit
  if (!VALID_RANGE_UNITS.has(unit as GanttTemplateRangeUnit)) {
    throw new AppError(`Invalid ${prefix} range unit.`, 'VALIDATION_ERROR', 400)
  }

  const value = parseInteger(valueParam, defaults.value)
  if (!Number.isInteger(value) || value < 1) {
    throw new AppError(`Invalid ${prefix} range value.`, 'VALIDATION_ERROR', 400)
  }

  return {
    unit: unit as GanttTemplateRangeUnit,
    value,
  }
}

function parseInteger(value: string | null, fallback: number): number {
  if (value === null) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}
