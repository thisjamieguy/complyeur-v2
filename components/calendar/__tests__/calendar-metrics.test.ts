// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
  CALENDAR_METRIC_EVENT,
  emitCalendarMetric,
} from '../calendar-metrics'

describe('emitCalendarMetric', () => {
  it('stores and dispatches calendar metric events', () => {
    let dispatched = 0
    const handler = () => {
      dispatched += 1
    }

    window.__complyeurCalendarMetrics = []
    window.addEventListener(CALENDAR_METRIC_EVENT, handler)

    emitCalendarMetric('viewport_rows', {
      visibleRows: 8,
      renderedCells: 1600,
      totalEmployees: 42,
    })

    window.removeEventListener(CALENDAR_METRIC_EVENT, handler)

    expect(dispatched).toBe(1)
    expect(window.__complyeurCalendarMetrics).toBeDefined()
    expect(window.__complyeurCalendarMetrics?.at(-1)?.name).toBe('viewport_rows')
  })

  it('keeps metric store bounded', () => {
    window.__complyeurCalendarMetrics = []

    for (let index = 0; index < 510; index += 1) {
      emitCalendarMetric('scroll_sync', {
        samples: index,
      })
    }

    expect(window.__complyeurCalendarMetrics).toHaveLength(500)
    expect(window.__complyeurCalendarMetrics?.[0]?.data.samples).toBe(10)
    expect(window.__complyeurCalendarMetrics?.at(-1)?.data.samples).toBe(509)
  })
})
