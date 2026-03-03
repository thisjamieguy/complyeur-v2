'use client';

/**
 * Trip Forecast Calculator Client Component
 *
 * Handles state management for multi-trip forecast scenarios.
 * Users can add multiple hypothetical trips for one employee
 * and see the combined compliance impact.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TripForecastForm } from '@/components/forecasting/trip-forecast-form';
import { ForecastScenarioList } from '@/components/forecasting/forecast-scenario-list';
import { calculateMultiTripScenario, getCountryName } from '@/lib/services/forecast-service';
import { addTripAction } from '@/app/(dashboard)/actions';
import { showSuccess, showError } from '@/lib/toast';
import type {
  ForecastEmployee,
  ForecastTrip,
  ForecastResult,
  ScenarioTripEntry,
} from '@/types/forecast';

const MAX_TRIPS = 10;

interface TripForecastCalculatorProps {
  employees: ForecastEmployee[];
  tripsMap: Record<
    string,
    {
      employeeName: string;
      trips: ForecastTrip[];
    }
  >;
}

let nextKey = 0;

export function TripForecastCalculator({ employees, tripsMap }: TripForecastCalculatorProps) {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioTripEntry[]>([]);
  const [results, setResults] = useState<ForecastResult[]>([]);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  const lockedEmployeeId = scenarios.length > 0 ? scenarios[0].input.employeeId : undefined;

  const recalculate = useCallback(
    (updatedScenarios: ScenarioTripEntry[]) => {
      if (updatedScenarios.length === 0) {
        setResults([]);
        return;
      }

      const employeeId = updatedScenarios[0].input.employeeId;
      const employeeData = tripsMap[employeeId];
      if (!employeeData) {
        setResults([]);
        return;
      }

      const newResults = calculateMultiTripScenario(
        updatedScenarios,
        employeeData.trips,
        employeeData.employeeName
      );
      setResults(newResults);
    },
    [tripsMap]
  );

  const handleAddTrip = useCallback(
    (employeeId: string, startDate: string, endDate: string, country: string) => {
      if (scenarios.length >= MAX_TRIPS) return;

      const entry: ScenarioTripEntry = {
        key: `trip-${++nextKey}`,
        input: { employeeId, startDate, endDate, country },
        countryName: getCountryName(country),
      };

      const updated = [...scenarios, entry];
      setScenarios(updated);
      recalculate(updated);
    },
    [scenarios, recalculate]
  );

  const handleRemoveTrip = useCallback(
    (key: string) => {
      const updated = scenarios.filter((s) => s.key !== key);
      setScenarios(updated);
      recalculate(updated);
    },
    [scenarios, recalculate]
  );

  const handleEditTrip = useCallback(
    (key: string, updates: { startDate: string; endDate: string; country: string }) => {
      const updated = scenarios.map((s) =>
        s.key === key
          ? {
              ...s,
              input: { ...s.input, ...updates },
              countryName: getCountryName(updates.country),
            }
          : s
      );
      setScenarios(updated);
      recalculate(updated);
    },
    [scenarios, recalculate]
  );

  const handleClearAll = useCallback(() => {
    setScenarios([]);
    setResults([]);
  }, []);

  const handleSaveTrip = useCallback(
    async (key: string) => {
      const scenario = scenarios.find((s) => s.key === key);
      if (!scenario) return;

      setSavingKeys((prev) => new Set(prev).add(key));
      try {
        await addTripAction({
          employee_id: scenario.input.employeeId,
          country: scenario.input.country,
          entry_date: scenario.input.startDate,
          exit_date: scenario.input.endDate,
        });
        const updated = scenarios.filter((s) => s.key !== key);
        setScenarios(updated);
        recalculate(updated);
        router.refresh();
        showSuccess('Trip saved', `${scenario.countryName} trip added to schedule`);
      } catch {
        showError('Failed to save trip', 'Please try again');
      } finally {
        setSavingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [scenarios, recalculate, router]
  );

  const handleSaveAll = useCallback(async () => {
    if (scenarios.length === 0) return;

    const allKeys = new Set(scenarios.map((s) => s.key));
    setSavingKeys(allKeys);

    let savedCount = 0;
    const failed: ScenarioTripEntry[] = [];

    for (const scenario of scenarios) {
      try {
        await addTripAction({
          employee_id: scenario.input.employeeId,
          country: scenario.input.country,
          entry_date: scenario.input.startDate,
          exit_date: scenario.input.endDate,
        });
        savedCount++;
      } catch {
        failed.push(scenario);
      }
    }

    setScenarios(failed);
    recalculate(failed);
    router.refresh();

    if (failed.length === 0) {
      showSuccess(`${savedCount} ${savedCount === 1 ? 'trip' : 'trips'} saved`);
    } else {
      showError(
        `${failed.length} ${failed.length === 1 ? 'trip' : 'trips'} failed to save`,
        `${savedCount} saved successfully`
      );
    }

    setSavingKeys(new Set());
  }, [scenarios, recalculate, router]);

  return (
    <div className="space-y-6">
      {/* Form card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Plan a Future Trip
        </h2>
        <TripForecastForm
          employees={employees}
          onAddTrip={handleAddTrip}
          lockedEmployeeId={lockedEmployeeId}
          hasTrips={scenarios.length > 0}
        />
        {scenarios.length >= MAX_TRIPS && (
          <p className="mt-2 text-sm text-amber-600">
            Maximum of {MAX_TRIPS} trips per scenario reached.
          </p>
        )}
      </div>

      {/* Scenario results */}
      <ForecastScenarioList
        scenarios={scenarios}
        results={results}
        onRemoveTrip={handleRemoveTrip}
        onClearAll={handleClearAll}
        onSaveTrip={handleSaveTrip}
        onSaveAll={handleSaveAll}
        onEditTrip={handleEditTrip}
        savingKeys={savingKeys}
      />
    </div>
  );
}
