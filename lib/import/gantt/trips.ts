import type {
  GanttDateColumn,
  GanttParseResult,
  GanttRow,
  GeneratedTrip,
  TripGenerationSummary,
} from './types';

/**
 * Generates trip records from parsed Gantt data by aggregating consecutive days.
 *
 * @param result - Parsed Gantt result
 * @param options - Generation options
 * @returns Array of generated trips
 *
 * @example
 * // Employee in France Mon-Wed, Germany Thu-Fri
 * // Generates: [{ country: "FR", days: 3 }, { country: "DE", days: 2 }]
 */
export function generateTripsFromGantt(
  result: GanttParseResult,
  options: {
    /** Only generate trips for Schengen countries (default: false) */
    schengenOnly?: boolean;
    /** Minimum days to create a trip (default: 1) */
    minDays?: number;
  } = {}
): GeneratedTrip[] {
  if (!result.success || result.rows.length === 0) {
    return [];
  }

  const { schengenOnly = false, minDays = 1 } = options;
  const trips: GeneratedTrip[] = [];

  for (const row of result.rows) {
    let currentTrip: {
      country: string;
      startIdx: number;
      endIdx: number;
      isSchengen: boolean;
    } | null = null;

    for (let i = 0; i < row.cells.length; i++) {
      const cell = row.cells[i];

      // Determine if this cell should contribute to a trip
      const shouldCount = cell.countryCode && (!schengenOnly || cell.isSchengen);

      if (!shouldCount) {
        // End current trip if exists
        if (currentTrip) {
          const trip = createTrip(row, currentTrip, result.dateColumns);
          if (trip.dayCount >= minDays) {
            trips.push(trip);
          }
          currentTrip = null;
        }
        continue;
      }

      // Check if this extends current trip or starts new one
      if (currentTrip && currentTrip.country === cell.countryCode) {
        // Extend current trip
        currentTrip.endIdx = i;
      } else {
        // End previous trip and start new one
        if (currentTrip) {
          const trip = createTrip(row, currentTrip, result.dateColumns);
          if (trip.dayCount >= minDays) {
            trips.push(trip);
          }
        }
        currentTrip = {
          country: cell.countryCode!,
          startIdx: i,
          endIdx: i,
          isSchengen: cell.isSchengen,
        };
      }
    }

    // Don't forget the last trip
    if (currentTrip) {
      const trip = createTrip(row, currentTrip, result.dateColumns);
      if (trip.dayCount >= minDays) {
        trips.push(trip);
      }
    }
  }

  return trips;
}

/**
 * Helper to create a trip record from aggregated data.
 */
function createTrip(
  row: GanttRow,
  tripData: { country: string; startIdx: number; endIdx: number; isSchengen: boolean },
  dateColumns: GanttDateColumn[]
): GeneratedTrip {
  const startDate = dateColumns[tripData.startIdx].date.date!;
  const endDate = dateColumns[tripData.endIdx].date.date!;

  return {
    employeeName: row.employeeName,
    employeeEmail: row.email,
    entryDate: startDate,
    exitDate: endDate,
    country: tripData.country,
    isSchengen: tripData.isSchengen,
    dayCount: tripData.endIdx - tripData.startIdx + 1,
    sourceRow: row.index + 2, // +2 for 1-based and header row
  };
}

/**
 * Generates trips with a detailed summary.
 *
 * @param result - Parsed Gantt result
 * @param options - Generation options
 * @returns Object with trips array and summary statistics
 */
export function generateTripsWithSummary(
  result: GanttParseResult,
  options: {
    schengenOnly?: boolean;
    minDays?: number;
  } = {}
): {
  trips: GeneratedTrip[];
  summary: TripGenerationSummary;
} {
  const trips = generateTripsFromGantt(result, options);

  // Calculate summary
  const daysByCountry = new Map<string, number>();
  const tripsByEmployee = new Map<string, number>();
  let schengenDays = 0;
  let totalDays = 0;

  for (const trip of trips) {
    totalDays += trip.dayCount;
    if (trip.isSchengen) {
      schengenDays += trip.dayCount;
    }

    daysByCountry.set(trip.country, (daysByCountry.get(trip.country) ?? 0) + trip.dayCount);

    tripsByEmployee.set(
      trip.employeeName,
      (tripsByEmployee.get(trip.employeeName) ?? 0) + 1
    );
  }

  return {
    trips,
    summary: {
      totalDays,
      schengenDays,
      tripsCreated: trips.length,
      rowsProcessed: result.rows.length,
      daysByCountry,
      tripsByEmployee,
    },
  };
}
