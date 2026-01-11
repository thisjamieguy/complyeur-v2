/**
 * Network retry utility with exponential backoff
 *
 * Handles transient network failures gracefully by retrying
 * failed requests with increasing delays.
 */

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelayMs?: number
  /** Maximum delay in ms (default: 10000) */
  maxDelayMs?: number
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number
}

export interface RetryResult<T> {
  data: T | null
  error: Error | null
  retryCount: number
  success: boolean
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

/**
 * Check if an error is retryable
 * Only retry on network errors, not on validation or auth errors
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Network-related errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('abort')
    ) {
      return true
    }

    // HTTP status codes that are retryable
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    ) {
      return true
    }
  }

  // Don't retry validation, auth, or client errors
  return false
}

/**
 * Calculate delay for a given retry attempt using exponential backoff
 */
function calculateDelay(
  attempt: number,
  config: Required<RetryConfig>
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)
  // Add some jitter (±10%) to prevent thundering herd
  const jitter = delay * (0.9 + Math.random() * 0.2)
  return Math.min(jitter, config.maxDelayMs)
}

/**
 * Wait for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute an async operation with automatic retry on network failures
 *
 * @param fn - The async function to execute
 * @param config - Optional retry configuration
 * @returns Result object with data, error, retry count, and success flag
 *
 * @example
 * const result = await withRetry(
 *   async () => {
 *     const response = await fetch('/api/data')
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`)
 *     return response.json()
 *   },
 *   { maxRetries: 3 }
 * )
 *
 * if (result.success) {
 *   console.log('Data:', result.data)
 * } else {
 *   console.error('Failed after', result.retryCount, 'retries:', result.error)
 * }
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: RetryConfig
): Promise<RetryResult<T>> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  let lastError: Error | null = null
  let retryCount = 0

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      const data = await fn()
      return {
        data,
        error: null,
        retryCount,
        success: true,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        return {
          data: null,
          error: lastError,
          retryCount,
          success: false,
        }
      }

      // Don't wait after the last attempt
      if (attempt < mergedConfig.maxRetries) {
        const delay = calculateDelay(attempt, mergedConfig)
        console.log(
          `[Retry] Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`,
          lastError.message
        )
        await sleep(delay)
        retryCount++
      }
    }
  }

  return {
    data: null,
    error: lastError,
    retryCount,
    success: false,
  }
}

/**
 * Execute an async operation and throw on failure (after retries)
 *
 * @param fn - The async function to execute
 * @param config - Optional retry configuration
 * @returns The result of the async function
 * @throws Error after all retries have been exhausted
 *
 * @example
 * try {
 *   const data = await retryAsync(async () => {
 *     const response = await fetch('/api/data')
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`)
 *     return response.json()
 *   })
 *   console.log('Data:', data)
 * } catch (error) {
 *   console.error('All retries failed:', error)
 * }
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  config?: RetryConfig
): Promise<T> {
  const result = await withRetry(fn, config)

  if (!result.success) {
    throw result.error || new Error('Unknown error after retries')
  }

  return result.data as T
}

/**
 * Create a retryable version of an async function
 *
 * @param fn - The async function to wrap
 * @param config - Optional retry configuration
 * @returns A wrapped function that automatically retries
 *
 * @example
 * const fetchDataWithRetry = createRetryable(
 *   async (id: string) => {
 *     const response = await fetch(`/api/data/${id}`)
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`)
 *     return response.json()
 *   },
 *   { maxRetries: 2 }
 * )
 *
 * const result = await fetchDataWithRetry('123')
 */
export function createRetryable<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  config?: RetryConfig
): (...args: TArgs) => Promise<RetryResult<TReturn>> {
  return async (...args: TArgs) => {
    return withRetry(() => fn(...args), config)
  }
}
