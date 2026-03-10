/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

function getDesktopEmployees(): ProcessedEmployee[] {
  const desktopProps = [...dynamicProps]
    .reverse()
    .find((props) => Array.isArray(props.dates))

  if (!desktopProps) {
    throw new Error('Desktop calendar props were not captured')
  }

  return desktopProps.employees as ProcessedEmployee[]
}

describe('CalendarView', () => {
  beforeEach(() => {
    dynamicProps.length = 0
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
            ],
          },
        ]}
      />
    )

    const [employee] = getDesktopEmployees()
    const historyDay = employee.dayMap.get('2026-02-10')
    const startDay = employee.dayMap.get('2026-03-10')
    const preBreachDay = employee.dayMap.get('2026-03-20')
    const breachDay = employee.dayMap.get('2026-03-21')

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
  })
})
