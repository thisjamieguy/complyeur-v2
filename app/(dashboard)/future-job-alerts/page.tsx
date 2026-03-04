/**
 * Future Job Alerts Page
 *
 * Phase 10: Forecasting & Planning
 * Displays all future trips with compliance forecasts.
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAllTripsGroupedByEmployee } from '@/lib/db';
import {
  calculateFutureJobCompliance,
  sortForecasts,
  filterForecastsByRisk,
} from '@/lib/services/forecast-service';
import type {
  ForecastResult,
  ForecastRiskFilter,
  ForecastRiskLevel,
  ForecastSortField,
  SortOrder,
} from '@/types/forecast';
import { FutureAlertsTable } from '@/components/forecasting/future-alerts-table';
import { FutureAlertsControls } from '@/components/forecasting/future-alerts-controls';
import { FutureAlertsEmpty } from '@/components/forecasting/future-alerts-empty';
import { FutureAlertsLoading } from '@/components/forecasting/future-alerts-loading';

export const metadata: Metadata = {
  title: 'Future Alerts',
  description: 'Review upcoming trips and their compliance status before scheduling',
}

interface PageProps {
  searchParams: Promise<{
    sort?: string;
    order?: string;
    filter?: string;
  }>;
}

const DEFAULT_RISK_FILTER: ForecastRiskFilter = ['yellow', 'red'];
const VALID_RISK_LEVELS: ForecastRiskLevel[] = ['green', 'yellow', 'red'];

function parseRiskFilter(filterParam?: string): ForecastRiskFilter {
  if (!filterParam) {
    return DEFAULT_RISK_FILTER;
  }

  if (filterParam === 'none') {
    return [];
  }

  if (filterParam === 'all') {
    return [...VALID_RISK_LEVELS];
  }

  if (filterParam === 'at-risk') {
    return ['yellow', 'red'];
  }

  if (filterParam === 'critical') {
    return ['red'];
  }

  const selectedLevels = filterParam
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is ForecastRiskLevel =>
      VALID_RISK_LEVELS.includes(value as ForecastRiskLevel)
    );

  return Array.from(new Set(selectedLevels));
}

async function FutureAlertsContent({
  sortField,
  sortOrder,
  riskFilter,
}: {
  sortField: ForecastSortField;
  sortOrder: SortOrder;
  riskFilter: ForecastRiskFilter;
}) {
  // Fetch all trips grouped by employee
  const groupedData = await getAllTripsGroupedByEmployee();

  // Calculate forecasts for all future trips
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allForecasts: ForecastResult[] = [];

  for (const [, { employee, trips }] of groupedData) {
    // Filter to future trips only
    const futureTrips = trips.filter((trip) => {
      if (trip.ghosted) return false;
      const entryDate = new Date(trip.entryDate);
      return entryDate >= today;
    });

    // Calculate forecast for each future trip
    for (const futureTrip of futureTrips) {
      const forecast = calculateFutureJobCompliance(
        futureTrip,
        trips,
        employee.name
      );
      allForecasts.push(forecast);
    }
  }

  // Apply filtering
  const filteredForecasts = filterForecastsByRisk(allForecasts, riskFilter);

  // Apply sorting
  const sortedForecasts = sortForecasts(filteredForecasts, sortField, sortOrder);

  // Calculate stats
  const stats = {
    total: allForecasts.length,
    safe: allForecasts.filter((f) => f.riskLevel === 'green').length,
    atRisk: allForecasts.filter((f) => f.riskLevel !== 'green').length,
    critical: allForecasts.filter((f) => f.riskLevel === 'red').length,
  };

  if (allForecasts.length === 0) {
    return <FutureAlertsEmpty />;
  }

  return (
    <>
      <FutureAlertsControls
        currentSort={sortField}
        currentOrder={sortOrder}
        currentFilter={riskFilter}
        stats={stats}
      />
      <FutureAlertsTable forecasts={sortedForecasts} />
    </>
  );
}

export default async function FutureJobAlertsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse search params with defaults
  const sortField = (params.sort as ForecastSortField) || 'date';
  const sortOrder = (params.order as SortOrder) || 'asc';
  const riskFilter = parseRiskFilter(params.filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Future Job Alerts
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Review upcoming trips and their compliance status before scheduling.
        </p>
      </div>

      <Suspense fallback={<FutureAlertsLoading />}>
        <FutureAlertsContent
          sortField={sortField}
          sortOrder={sortOrder}
          riskFilter={riskFilter}
        />
      </Suspense>
    </div>
  );
}
