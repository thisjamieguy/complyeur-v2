/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateCompliance, parseDateOnlyAsUTC } from '@/lib/compliance'
import { CALENDAR_HIDE_NO_SCHENGEN_COOKIE } from '@/lib/calendar/filter-preferences'
import { buildDayMap } from '../calendar-view.utils'

const dynamicProps: Array<Record<string, unknown>> = []

vi.mock('next/dynamic', () => ({
  default: () => {
    return function DynamicMock(props: Record<string, unknown>) {
      dynamicProps.push(props)
      return null
    }
  },
}))

import { CalendarView } from '../calendar-view'
import type { ProcessedEmployee } from '../types'

function getDesktopProps(): { employees: ProcessedEmployee[]; dates: Date[] } {
  const desktopProps = [...dynamicProps]
    .reverse()
    .find((props) => Array.isArray(props.dates))

  if (!desktopProps) {
    throw new Error('Desktop calendar props were not captured')
  }

  return {
    employees: desktopProps.employees as ProcessedEmployee[],
    dates: desktopProps.dates as Date[],
  }
}

describe('CalendarView', () => {
  beforeEach(() => {
    dynamicProps.length = 0
    document.cookie = `${CALENDAR_HIDE_NO_SCHENGEN_COOKIE}=; Max-Age=0; Path=/`
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('marks past days as historical while keeping planning risk for today and future dates', () => {
    render(
      <CalendarView
        employees={[
          {
            id: 'employee-1',
            name: 'John Smith',
            trips: [
              {
                id: 'history-1',
                country: 'FR',
                entry_date: '2025-12-01',
                exit_date: '2026-02-16',
                purpose: 'Long assignment',
                is_private: false,
                ghosted: false,
              },
              {
                id: 'current-1',
                country: 'DE',
                entry_date: '2026-03-10',
                exit_date: '2026-03-21',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
              {
                id: 'future-1',
                country: 'ES',
                entry_date: '2026-04-05',
                exit_date: '2026-04-12',
                purpose: 'Conference',
                is_private: false,
                ghosted: false,
              },
            ],
          },
        ]}
      />
    )

    const { employees: desktopEmployees, dates } = getDesktopProps()
    const [employee] = desktopEmployees
    expect(employee).not.toHaveProperty('dayMap')

    const dayMap = buildDayMap(
      employee.trips,
      dates[0],
      dates[dates.length - 1],
      employee.complianceByDate,
      { today: new Date('2026-03-10T00:00:00.000Z') }
    )

    const historyDay = dayMap.get('2026-02-10')
    const startDay = dayMap.get('2026-03-10')
    const preBreachDay = dayMap.get('2026-03-20')
    const breachDay = dayMap.get('2026-03-21')

    expect(historyDay?.trip.id).toBe('history-1')
    expect(historyDay?.displayMode).toBe('historical')

    expect(startDay?.trip.id).toBe('current-1')
    expect(preBreachDay?.trip.id).toBe('current-1')
    expect(breachDay?.trip.id).toBe('current-1')

    expect(startDay?.displayMode).toBe('planning')
    expect(preBreachDay?.displayMode).toBe('planning')
    expect(breachDay?.displayMode).toBe('planning')
    expect(startDay?.riskLevel).toBe('amber')
    expect(startDay?.isBreachDay).toBe(false)
    expect(preBreachDay?.riskLevel).toBe('amber')
    expect(preBreachDay?.isBreachDay).toBe(false)
    expect(breachDay?.riskLevel).toBe('red')
    expect(breachDay?.isBreachDay).toBe(true)

    const expectedCurrent = calculateCompliance(
      [
        {
          country: 'FR',
          entryDate: parseDateOnlyAsUTC('2025-12-01'),
          exitDate: parseDateOnlyAsUTC('2026-02-16'),
        },
        {
          country: 'DE',
          entryDate: parseDateOnlyAsUTC('2026-03-10'),
          exitDate: parseDateOnlyAsUTC('2026-03-21'),
        },
        {
          country: 'ES',
          entryDate: parseDateOnlyAsUTC('2026-04-05'),
          exitDate: parseDateOnlyAsUTC('2026-04-12'),
        },
      ],
      {
        mode: 'audit',
        referenceDate: new Date('2026-03-10T00:00:00.000Z'),
      }
    )

    expect(employee.currentDaysRemaining).toBe(expectedCurrent.daysRemaining)
    expect(employee.currentRiskLevel).toBe(expectedCurrent.riskLevel)
  })

  it('persists the Schengen-only filter and excludes non-Schengen or out-of-range employees', async () => {
    render(
      <CalendarView
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
            ],
          },
          {
            id: 'employee-2',
            name: 'Bob Non-Schengen',
            trips: [
              {
                id: 'trip-2',
                country: 'US',
                entry_date: '2026-03-13',
                exit_date: '2026-03-14',
                purpose: 'Conference',
                is_private: false,
                ghosted: false,
              },
            ],
          },
          {
            id: 'employee-3',
            name: 'Cara Later Schengen',
            trips: [
              {
                id: 'trip-3',
                country: 'DE',
                entry_date: '2026-05-01',
                exit_date: '2026-05-03',
                purpose: 'Future meeting',
                is_private: false,
                ghosted: false,
              },
            ],
          },
        ]}
      />
    )

    await act(async () => {
      fireEvent.click(
        screen.getByRole('switch', { name: /only show employees with schengen trips/i })
      )
      await Promise.resolve()
    })

    const { employees: desktopEmployees } = getDesktopProps()
    expect(desktopEmployees.map((employee) => employee.name)).toEqual(['Alice Schengen'])
    expect(document.cookie).toContain(`${CALENDAR_HIDE_NO_SCHENGEN_COOKIE}=1`)
  })
})
