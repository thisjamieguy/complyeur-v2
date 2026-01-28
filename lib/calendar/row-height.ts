/**
 * Row height calculation utilities for calendar virtualization
 *
 * These functions pre-calculate employee row heights based on trip stacking
 * so the virtualizer knows heights before rendering.
 */

/** Height of each stacked trip row in pixels */
const TRIP_HEIGHT = 28

/** Padding at top and bottom of each row */
const ROW_PADDING = 8

/** Minimum row height (when no trips) */
const MIN_ROW_HEIGHT = 40

interface TripForStacking {
  entryDate: Date
  exitDate: Date
}

/**
 * Check if two trips overlap (share any days)
 */
function tripsOverlap(a: TripForStacking, b: TripForStacking): boolean {
  return a.entryDate <= b.exitDate && b.entryDate <= a.exitDate
}

/**
 * Calculate the maximum stack depth (number of overlapping trip lanes)
 *
 * Uses a greedy lane assignment algorithm:
 * 1. Sort trips by start date
 * 2. For each trip, find the first lane where it doesn't overlap with existing trips
 * 3. Track the maximum lane index used
 */
export function calculateMaxStackDepth(trips: TripForStacking[]): number {
  if (trips.length === 0) return 0
  if (trips.length === 1) return 1

  // Sort by entry date
  const sortedTrips = [...trips].sort(
    (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
  )

  // Track which trips are in which lane
  const laneAssignments = new Map<TripForStacking, number>()
  let maxLane = 0

  for (const trip of sortedTrips) {
    // Find used lanes among overlapping trips
    const usedLanes = new Set<number>()

    for (const [otherTrip, lane] of laneAssignments) {
      if (tripsOverlap(trip, otherTrip)) {
        usedLanes.add(lane)
      }
    }

    // Find first available lane
    let assignedLane = 0
    while (usedLanes.has(assignedLane)) {
      assignedLane++
    }

    laneAssignments.set(trip, assignedLane)
    maxLane = Math.max(maxLane, assignedLane)
  }

  return maxLane + 1 // Convert 0-indexed to count
}

/**
 * Calculate the row height for an employee based on their trips
 *
 * @param trips - Array of trips with entryDate and exitDate
 * @returns Height in pixels
 */
export function calculateRowHeight(trips: TripForStacking[]): number {
  const stackDepth = calculateMaxStackDepth(trips)

  if (stackDepth === 0) {
    return MIN_ROW_HEIGHT
  }

  // Height = padding + (number of lanes * trip height)
  return Math.max(MIN_ROW_HEIGHT, stackDepth * TRIP_HEIGHT + ROW_PADDING)
}

/**
 * Pre-calculate row heights for all employees
 *
 * @param employees - Array of employees with their processed trips
 * @returns Array of heights in the same order as employees
 */
export function calculateAllRowHeights<T extends { trips: TripForStacking[] }>(
  employees: T[]
): number[] {
  return employees.map((employee) => calculateRowHeight(employee.trips))
}
