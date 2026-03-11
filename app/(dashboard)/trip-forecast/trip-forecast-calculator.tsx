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
import { addTripAction, updateTripAction } from '@/app/(dashboard)/actions';
import { checkTripOverlap } from '@/lib/validations/trip-overlap';
import { showSuccess, showError } from '@/lib/toast';
import type {
  ForecastEmployee,
  ForecastTrip,
  ForecastResult,
  ScenarioTripConflict,
  ScenarioTripEntry,
} from '@/types/forecast';

const MAX_TRIPS = 10;

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Please try again';
}

function getScenarioSavePayload(scenario: ScenarioTripEntry) {
  return {
    employee_id: scenario.input.employeeId,
    country: scenario.input.country,
    entry_date: scenario.input.startDate,
    exit_date: scenario.input.endDate,
  };
}

function getScenarioReplacePayload(scenario: ScenarioTripEntry) {
  return {
    country: scenario.input.country,
    entry_date: scenario.input.startDate,
    exit_date: scenario.input.endDate,
    purpose: null,
    job_ref: null,
    is_private: false,
    ghosted: false,
  };
}

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
  const [pendingConflict, setPendingConflict] = useState<ScenarioTripConflict | null>(null);

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

  const finalizeSaveAll = useCallback(
    (
      currentScenarios: ScenarioTripEntry[],
      savedCount: number,
      failedScenarioKeys: string[],
      failureMessage: string | null
    ) => {
      const failed = currentScenarios.filter((scenario) =>
        failedScenarioKeys.includes(scenario.key)
      );

      setScenarios(failed);
      recalculate(failed);
      router.refresh();

      if (failed.length === 0) {
        showSuccess(`${savedCount} ${savedCount === 1 ? 'trip' : 'trips'} saved`);
      } else {
        showError(
          `${failed.length} ${failed.length === 1 ? 'trip' : 'trips'} failed to save`,
          failureMessage ?? `${savedCount} saved successfully`
        );
      }

      setSavingKeys(new Set());
    },
    [recalculate, router]
  );

  const continueSaveAll = useCallback(
    async (
      currentScenarios: ScenarioTripEntry[],
      scenarioQueue: ScenarioTripEntry[],
      savedCount: number,
      failedScenarioKeys: string[],
      failureMessage: string | null
    ) => {
      for (let index = 0; index < scenarioQueue.length; index++) {
        const scenario = scenarioQueue[index];

        try {
          const overlapResult = await checkTripOverlap(
            scenario.input.employeeId,
            scenario.input.startDate,
            scenario.input.endDate
          );

          if (overlapResult.hasOverlap) {
            if (!overlapResult.conflictingTrip?.id) {
              failedScenarioKeys.push(scenario.key);
              failureMessage ??=
                overlapResult.message ?? 'This trip overlaps with an existing trip.';
              continue;
            }

            setSavingKeys(new Set());
            setPendingConflict({
              scenarioKey: scenario.key,
              conflictingTripId: overlapResult.conflictingTrip.id,
              message:
                overlapResult.message ?? 'This trip overlaps with an existing trip.',
              saveMode: 'all',
              savedCount,
              remainingScenarioKeys: scenarioQueue
                .slice(index + 1)
                .map((entry) => entry.key),
              failureMessage,
              failedScenarioKeys: [...failedScenarioKeys],
            });
            return;
          }

          await addTripAction(getScenarioSavePayload(scenario));
          savedCount++;
        } catch (error) {
          failedScenarioKeys.push(scenario.key);
          failureMessage ??= getSaveErrorMessage(error);
        }
      }

      finalizeSaveAll(
        currentScenarios,
        savedCount,
        failedScenarioKeys,
        failureMessage
      );
    },
    [finalizeSaveAll]
  );

  const handleSaveTrip = useCallback(
    async (key: string) => {
      const scenario = scenarios.find((s) => s.key === key);
      if (!scenario) return;

      setSavingKeys((prev) => new Set(prev).add(key));
      try {
        const overlapResult = await checkTripOverlap(
          scenario.input.employeeId,
          scenario.input.startDate,
          scenario.input.endDate
        );

        if (overlapResult.hasOverlap) {
          if (!overlapResult.conflictingTrip?.id) {
            showError(
              'Trip overlap detected',
              overlapResult.message ?? 'This trip overlaps with an existing trip.'
            );
            return;
          }

          setPendingConflict({
            scenarioKey: scenario.key,
            conflictingTripId: overlapResult.conflictingTrip.id,
            message:
              overlapResult.message ?? 'This trip overlaps with an existing trip.',
            saveMode: 'single',
          });
          return;
        }

        await addTripAction(getScenarioSavePayload(scenario));
        const updated = scenarios.filter((s) => s.key !== key);
        setScenarios(updated);
        recalculate(updated);
        router.refresh();
        showSuccess('Trip saved', `${scenario.countryName} trip added to schedule`);
      } catch (error) {
        showError('Failed to save trip', getSaveErrorMessage(error));
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

  const handleReplaceConflictTrip = useCallback(async () => {
    if (!pendingConflict) return;

    const conflict = pendingConflict;
    const scenario = scenarios.find((entry) => entry.key === conflict.scenarioKey);
    if (!scenario) {
      setPendingConflict(null);
      return;
    }

    setSavingKeys((prev) => new Set(prev).add(scenario.key));
    setPendingConflict(null);

    try {
      await updateTripAction(
        conflict.conflictingTripId,
        scenario.input.employeeId,
        getScenarioReplacePayload(scenario)
      );

      const updatedScenarios = scenarios.filter((entry) => entry.key !== scenario.key);

      if (conflict.saveMode === 'all') {
        setScenarios(updatedScenarios);
        recalculate(updatedScenarios);

        const remainingScenarioKeys = conflict.remainingScenarioKeys ?? [];
        const remainingScenarios = updatedScenarios.filter((entry) =>
          remainingScenarioKeys.includes(entry.key)
        );

        await continueSaveAll(
          updatedScenarios,
          remainingScenarios,
          (conflict.savedCount ?? 0) + 1,
          conflict.failedScenarioKeys ?? [],
          conflict.failureMessage ?? null
        );
      } else {
        setScenarios(updatedScenarios);
        recalculate(updatedScenarios);
        router.refresh();
        showSuccess(
          'Trip replaced',
          `${scenario.countryName} trip replaced the existing trip.`
        );
        setSavingKeys(new Set());
      }
    } catch (error) {
      showError('Failed to replace trip', getSaveErrorMessage(error));
      setSavingKeys(new Set());
    } finally {
      if (conflict.saveMode === 'single') {
        setSavingKeys((prev) => {
          const next = new Set(prev);
          next.delete(scenario.key);
          return next;
        });
      }
    }
  }, [continueSaveAll, pendingConflict, recalculate, router, scenarios]);

  const handleSaveAll = useCallback(async () => {
    if (scenarios.length === 0) return;

    setSavingKeys(new Set(scenarios.map((scenario) => scenario.key)));
    await continueSaveAll(scenarios, scenarios, 0, [], null);
  }, [continueSaveAll, scenarios]);

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
        pendingConflict={pendingConflict}
        onReplaceConflictTrip={handleReplaceConflictTrip}
        onDismissConflictDialog={() => setPendingConflict(null)}
      />
    </div>
  );
}
