import * as Sentry from '@sentry/nextjs'

/**
 * @fileoverview Performance instrumentation utilities for ComplyEur.
 *
 * Provides timing wrappers, logging, and metrics collection for server actions,
 * database queries, and other performance-critical operations.
 *
 * @version 2026-01-09
 */

/** Threshold in ms for logging slow operations */
const SLOW_THRESHOLD_MS = 300

/** Threshold in ms for logging slow database queries */
const SLOW_DB_THRESHOLD_MS = 200

/** Performance metric entry */
interface PerformanceMetric {
  name: string
  duration: number
  timestamp: Date
  success: boolean
  metadata?: Record<string, unknown>
}

/** In-memory metrics buffer (for development/debugging) */
const metricsBuffer: PerformanceMetric[] = []
const MAX_METRICS_BUFFER = 100

/**
 * Add a metric to the buffer (ring buffer behavior)
 */

function persistMetricToSentry(metric: PerformanceMetric, reason: 'slow' | 'error' | 'budget'): void {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  Sentry.captureMessage(`performance:${reason}:${metric.name}`, {
    level: reason === 'error' ? 'error' : 'warning',
    extra: {
      duration: metric.duration,
      timestamp: metric.timestamp.toISOString(),
      success: metric.success,
      metadata: metric.metadata,
    },
  })
}

function addMetric(metric: PerformanceMetric): void {
  metricsBuffer.push(metric)
  if (metricsBuffer.length > MAX_METRICS_BUFFER) {
    metricsBuffer.shift()
  }
}

/**
 * Get recent metrics for debugging/monitoring
 */
export function getRecentMetrics(): PerformanceMetric[] {
  return [...metricsBuffer]
}

/**
 * Clear metrics buffer
 */
export function clearMetrics(): void {
  metricsBuffer.length = 0
}

/**
 * Wrap an async function with timing instrumentation.
 * Logs slow operations and records metrics.
 *
 * @param name - Name of the operation for logging
 * @param fn - Async function to execute
 * @param options - Optional configuration
 * @returns Result of the function
 *
 * @example
 * ```ts
 * const data = await withTiming('getDashboardData', async () => {
 *   return fetchDashboardData()
 * })
 * ```
 */
export async function withTiming<T>(
  name: string,
  fn: () => Promise<T>,
  options?: {
    threshold?: number
    metadata?: Record<string, unknown>
    silent?: boolean
  }
): Promise<T> {
  const start = performance.now()
  const threshold = options?.threshold ?? SLOW_THRESHOLD_MS

  try {
    const result = await fn()
    const duration = performance.now() - start

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      success: true,
      metadata: options?.metadata,
    }
    addMetric(metric)

    if (duration > threshold && !options?.silent) {
      console.warn(
        `[SLOW] ${name}: ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`,
        options?.metadata ? JSON.stringify(options.metadata) : ''
      )
      persistMetricToSentry(metric, 'slow')
    }

    return result
  } catch (error) {
    const duration = performance.now() - start

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      success: false,
      metadata: {
        ...options?.metadata,
        error: error instanceof Error ? error.message : String(error),
      },
    }
    addMetric(metric)

    console.error(
      `[ERROR] ${name}: ${duration.toFixed(2)}ms`,
      error instanceof Error ? error.message : error
    )
    persistMetricToSentry(metric, 'error')
    throw error
  }
}

/**
 * Wrap a database query with timing instrumentation.
 * Uses a lower threshold than general operations.
 *
 * @param queryName - Name/description of the query
 * @param fn - Async function that executes the query
 * @returns Query result
 */
export async function withDbTiming<T>(
  queryName: string,
  fn: () => Promise<T>
): Promise<T> {
  return withTiming(`db:${queryName}`, fn, {
    threshold: SLOW_DB_THRESHOLD_MS,
  })
}

/**
 * Track cache hit/miss for observability.
 *
 * @param cacheName - Name of the cache
 * @param hit - Whether the cache hit
 * @param key - Optional cache key for debugging
 */
export function trackCacheAccess(
  cacheName: string,
  hit: boolean,
  key?: string
): void {
  const metric: PerformanceMetric = {
    name: `cache:${cacheName}:${hit ? 'hit' : 'miss'}`,
    duration: 0,
    timestamp: new Date(),
    success: true,
    metadata: key ? { key } : undefined,
  }
  addMetric(metric)

  // Log cache misses in development for debugging
  if (!hit && process.env.NODE_ENV === 'development') {
    console.debug(`[CACHE MISS] ${cacheName}`, key ? `key: ${key}` : '')
  }
}

/**
 * Create a timing decorator for class methods.
 * Useful for instrumenting service classes.
 */
export function timed(name?: string) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const methodName = name ?? `${target.constructor.name}.${propertyKey}`

    descriptor.value = async function (...args: unknown[]) {
      return withTiming(methodName, () => originalMethod.apply(this, args))
    }

    return descriptor
  }
}

/**
 * Performance summary for admin/debugging.
 */
export interface PerformanceSummary {
  totalOperations: number
  successRate: number
  avgDuration: number
  p95Duration: number
  slowestOperations: Array<{
    name: string
    duration: number
    timestamp: Date
  }>
  cacheHitRate: number
}

/**
 * Get a performance summary from recent metrics.
 */
export function getPerformanceSummary(): PerformanceSummary {
  const metrics = getRecentMetrics()

  if (metrics.length === 0) {
    return {
      totalOperations: 0,
      successRate: 100,
      avgDuration: 0,
      p95Duration: 0,
      slowestOperations: [],
      cacheHitRate: 100,
    }
  }

  // Filter out cache metrics for duration calculations
  const operationMetrics = metrics.filter((m) => !m.name.startsWith('cache:'))
  const cacheMetrics = metrics.filter((m) => m.name.startsWith('cache:'))

  // Calculate success rate
  const successCount = operationMetrics.filter((m) => m.success).length
  const successRate =
    operationMetrics.length > 0
      ? (successCount / operationMetrics.length) * 100
      : 100

  // Calculate average duration
  const totalDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0)
  const avgDuration =
    operationMetrics.length > 0 ? totalDuration / operationMetrics.length : 0

  // Calculate p95 duration
  const sortedDurations = operationMetrics
    .map((m) => m.duration)
    .sort((a, b) => a - b)
  const p95Index = Math.floor(sortedDurations.length * 0.95)
  const p95Duration = sortedDurations[p95Index] ?? 0

  // Get slowest operations
  const slowestOperations = [...operationMetrics]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5)
    .map((m) => ({
      name: m.name,
      duration: m.duration,
      timestamp: m.timestamp,
    }))

  // Calculate cache hit rate
  const cacheHits = cacheMetrics.filter((m) =>
    m.name.includes(':hit')
  ).length
  const cacheHitRate =
    cacheMetrics.length > 0 ? (cacheHits / cacheMetrics.length) * 100 : 100

  return {
    totalOperations: operationMetrics.length,
    successRate,
    avgDuration,
    p95Duration,
    slowestOperations,
    cacheHitRate,
  }
}

/**
 * Measure payload size and log if it exceeds budget.
 *
 * @param name - Name of the payload (e.g., route name)
 * @param data - Data to measure
 * @param budgetKB - Budget in kilobytes
 */
export function measurePayload(
  name: string,
  data: unknown,
  budgetKB: number
): void {
  const json = JSON.stringify(data)
  const sizeKB = Buffer.byteLength(json, 'utf8') / 1024

  const metric: PerformanceMetric = {
    name: `payload:${name}`,
    duration: sizeKB, // Storing size in duration field for simplicity
    timestamp: new Date(),
    success: sizeKB <= budgetKB,
    metadata: {
      sizeKB: Math.round(sizeKB * 10) / 10,
      budgetKB,
    },
  }
  addMetric(metric)

  if (sizeKB > budgetKB) {
    console.warn(
      `[PAYLOAD OVER BUDGET] ${name}: ${sizeKB.toFixed(1)}KB > ${budgetKB}KB budget`
    )
    persistMetricToSentry(metric, 'budget')
  }
}
