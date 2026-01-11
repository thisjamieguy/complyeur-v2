/**
 * @fileoverview Performance utilities export.
 */

export {
  withTiming,
  withDbTiming,
  trackCacheAccess,
  timed,
  getRecentMetrics,
  getPerformanceSummary,
  measurePayload,
  clearMetrics,
  type PerformanceSummary,
} from './instrumentation'
