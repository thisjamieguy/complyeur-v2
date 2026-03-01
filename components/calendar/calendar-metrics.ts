export const CALENDAR_METRIC_EVENT = 'complyeur:calendar:metric'
const MAX_STORED_METRICS = 500

type CalendarMetricName = 'calendar_mount' | 'scroll_sync' | 'viewport_rows'

export interface CalendarMetricDetail {
  name: CalendarMetricName
  timestampMs: number
  data: Record<string, number | string | boolean>
}

declare global {
  interface Window {
    __complyeurCalendarMetrics?: CalendarMetricDetail[]
  }
}

/**
 * Emit calendar runtime metrics as CustomEvents for observability and e2e assertions.
 */
export function emitCalendarMetric(
  name: CalendarMetricName,
  data: Record<string, number | string | boolean>
): void {
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return
  }

  const detail: CalendarMetricDetail = {
    name,
    timestampMs: performance.now(),
    data,
  }

  if (!window.__complyeurCalendarMetrics) {
    window.__complyeurCalendarMetrics = []
  }
  const metricStore = window.__complyeurCalendarMetrics
  metricStore.push(detail)
  if (metricStore.length > MAX_STORED_METRICS) {
    metricStore.splice(0, metricStore.length - MAX_STORED_METRICS)
  }

  window.dispatchEvent(new CustomEvent<CalendarMetricDetail>(CALENDAR_METRIC_EVENT, { detail }))
}
