/**
 * Trip Forecast Calculator Page
 *
 * Phase 10: Forecasting & Planning
 * Allows users to test hypothetical trips before scheduling.
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getEmployeesForSelect, getAllTripsGroupedByEmployee } from '@/lib/db';
import { checkEntitlement } from '@/lib/billing/entitlements';
import { TripForecastCalculator } from './trip-forecast-calculator';
import { Skeleton } from '@/components/ui/skeleton';

async function TripForecastContent() {
  const [employees, groupedData] = await Promise.all([
    getEmployeesForSelect(),
    getAllTripsGroupedByEmployee(),
  ]);

  // Convert Map to a serializable object for the client component
  const tripsMap: Record<string, { employeeName: string; trips: typeof groupedData extends Map<string, { employee: { name: string }; trips: infer T }> ? T : never }> = {};
  for (const [employeeId, { employee, trips }] of groupedData) {
    tripsMap[employeeId] = {
      employeeName: employee.name,
      trips,
    };
  }

  return <TripForecastCalculator employees={employees} tripsMap={tripsMap} />;
}

export default async function TripForecastPage() {
  const hasForecast = await checkEntitlement('can_forecast')
  if (!hasForecast) {
    redirect('/dashboard?upgrade=forecast')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Trip Forecast
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Test hypothetical trips to check compliance before scheduling.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          </div>
        }
      >
        <TripForecastContent />
      </Suspense>
    </div>
  );
}
