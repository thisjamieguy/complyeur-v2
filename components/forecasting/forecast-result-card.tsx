'use client';

/**
 * Forecast Result Card Component
 *
 * Displays the result of a what-if scenario calculation.
 */

import { ForecastRiskBadge } from './forecast-risk-badge';
import {
  formatDisplayDate,
  formatDaysRemaining,
} from '@/lib/services/forecast-service';
import type { WhatIfResult, ForecastResult } from '@/types/forecast';
import { cn } from '@/lib/utils';

interface ForecastResultCardProps {
  result: WhatIfResult | ForecastResult;
  className?: string;
}

export function ForecastResultCard({
  result,
  className,
}: ForecastResultCardProps) {
  const isScenario = 'isScenario' in result && result.isScenario;

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-6 shadow-sm',
        result.isCompliant ? 'border-green-200' : 'border-red-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {isScenario ? 'Scenario Result' : 'Forecast Result'}
          </h3>
          <p className="text-sm text-slate-600">
            {result.employeeName} &bull; {result.countryFlag} {result.countryName}
          </p>
        </div>
        <ForecastRiskBadge riskLevel={result.riskLevel} />
      </div>

      {/* Trip details */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs font-medium uppercase text-slate-500">
            Trip Dates
          </div>
          <div className="mt-1 text-sm text-slate-900">
            {formatDisplayDate(result.entryDate)} -{' '}
            {formatDisplayDate(result.exitDate)}
          </div>
          <div className="text-xs text-slate-500">
            {result.tripDuration} {result.tripDuration === 1 ? 'day' : 'days'}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium uppercase text-slate-500">
            Days Before Trip
          </div>
          <div className="mt-1 text-sm text-slate-900">
            {result.daysUsedBeforeTrip} days used
          </div>
          <div className="text-xs text-slate-500">in 180-day window</div>
        </div>

        <div>
          <div className="text-xs font-medium uppercase text-slate-500">
            Days After Trip
          </div>
          <div
            className={cn(
              'mt-1 text-sm font-medium',
              result.riskLevel === 'red'
                ? 'text-red-700'
                : result.riskLevel === 'yellow'
                  ? 'text-amber-700'
                  : 'text-green-700'
            )}
          >
            {result.daysAfterTrip}/90 days
          </div>
          <div className="text-xs text-slate-500">
            {formatDaysRemaining(result.daysRemainingAfterTrip)}
          </div>
        </div>
      </div>

      {/* Compliance message */}
      <div
        className={cn(
          'mt-4 rounded-lg p-4',
          result.isCompliant ? 'bg-green-50' : 'bg-red-50'
        )}
      >
        {result.isCompliant ? (
          <div className="flex items-start gap-3">
            <span className="text-lg">✓</span>
            <div>
              <div className="font-medium text-green-800">
                This trip is compliant
              </div>
              <div className="text-sm text-green-700">
                {result.isSchengen
                  ? `The employee will have ${result.daysRemainingAfterTrip} days remaining after this trip.`
                  : 'This trip is to a non-Schengen country and does not count toward the 90-day limit.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠</span>
            <div>
              <div className="font-medium text-red-800">
                This trip exceeds the 90-day limit
              </div>
              <div className="text-sm text-red-700">
                The employee will be {Math.abs(result.daysRemainingAfterTrip)}{' '}
                days over the limit after this trip.
              </div>
              {result.compliantFromDate && (
                <div className="mt-2 text-sm text-red-700">
                  <strong>Compliant from:</strong>{' '}
                  {formatDisplayDate(result.compliantFromDate)}
                  <br />
                  Delay the trip until this date for it to be compliant.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Warning for at-risk trips */}
      {result.isCompliant && result.riskLevel === 'yellow' && (
        <div className="mt-4 rounded-lg bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚡</span>
            <div>
              <div className="font-medium text-amber-800">Approaching limit</div>
              <div className="text-sm text-amber-700">
                While this trip is compliant, the employee will be at{' '}
                {result.daysAfterTrip} days. Consider limiting additional Schengen
                travel.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
