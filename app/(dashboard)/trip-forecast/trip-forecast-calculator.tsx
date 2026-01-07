'use client';

/**
 * Trip Forecast Calculator Client Component
 *
 * Handles state management for the trip forecast calculator.
 */

import { useState } from 'react';
import { parseISO } from 'date-fns';
import { TripForecastForm } from '@/components/forecasting/trip-forecast-form';
import { ForecastResultCard } from '@/components/forecasting/forecast-result-card';
import { calculateWhatIfScenario } from '@/lib/services/forecast-service';
import type { ForecastEmployee, ForecastTrip, WhatIfResult } from '@/types/forecast';

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

export function TripForecastCalculator({ employees, tripsMap }: TripForecastCalculatorProps) {
  const [result, setResult] = useState<WhatIfResult | null>(null);

  const handleCalculate = async (
    employeeId: string,
    startDate: string,
    endDate: string,
    country: string
  ): Promise<WhatIfResult | null> => {
    const employeeData = tripsMap[employeeId];
    if (!employeeData) {
      return null;
    }

    const whatIfResult = calculateWhatIfScenario(
      {
        employeeId,
        scenarioStart: parseISO(startDate),
        scenarioEnd: parseISO(endDate),
        scenarioCountry: country,
      },
      employeeData.trips,
      employeeData.employeeName
    );

    return whatIfResult;
  };

  return (
    <div className="space-y-6">
      {/* Form card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Test a Hypothetical Trip
        </h2>
        <TripForecastForm
          employees={employees}
          onCalculate={handleCalculate}
          onResult={setResult}
        />
      </div>

      {/* Result card */}
      {result && <ForecastResultCard result={result} />}
    </div>
  );
}
