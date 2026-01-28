'use client';

/**
 * Future Alerts Table Component
 *
 * Displays forecast results in a table format with risk badges,
 * days remaining, and compliant-from dates.
 */

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ForecastRiskBadge } from './forecast-risk-badge';
import { formatDisplayDate } from '@/lib/services/forecast-service';
import type { ForecastResult } from '@/types/forecast';

interface FutureAlertsTableProps {
  forecasts: ForecastResult[];
}

export function FutureAlertsTable({ forecasts }: FutureAlertsTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="font-semibold text-slate-700">
              Employee
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              Country
            </TableHead>
            <TableHead className="font-semibold text-slate-700">Dates</TableHead>
            <TableHead className="font-semibold text-slate-700 text-center">
              Duration
            </TableHead>
            <TableHead className="font-semibold text-slate-700 text-center">
              Status
            </TableHead>
            <TableHead className="font-semibold text-slate-700 text-right">
              Days After
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              Compliant From
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {forecasts.map((forecast) => (
            <TableRow key={forecast.tripId}>
              <TableCell className="font-medium">
                <Link
                  href={`/employee/${forecast.employeeId}`}
                  className="text-slate-900 hover:text-blue-600 hover:underline transition-colors"
                >
                  {forecast.employeeName}
                </Link>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <span className="text-lg">{forecast.countryFlag}</span>
                  <span className="text-slate-700">{forecast.countryName}</span>
                  {!forecast.isSchengen && (
                    <span className="text-xs text-slate-400">(non-Schengen)</span>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-slate-600">
                <span className="whitespace-nowrap">
                  {formatDisplayDate(forecast.entryDate)}
                </span>
                <span className="mx-1 text-slate-400">-</span>
                <span className="whitespace-nowrap">
                  {formatDisplayDate(forecast.exitDate)}
                </span>
              </TableCell>
              <TableCell className="text-center text-slate-600">
                {forecast.tripDuration} {forecast.tripDuration === 1 ? 'day' : 'days'}
              </TableCell>
              <TableCell className="text-center">
                <ForecastRiskBadge riskLevel={forecast.riskLevel} />
              </TableCell>
              <TableCell className="text-right">
                <DaysRemainingDisplay
                  daysAfter={forecast.daysAfterTrip}
                  daysRemaining={forecast.daysRemainingAfterTrip}
                  riskLevel={forecast.riskLevel}
                />
              </TableCell>
              <TableCell>
                {forecast.compliantFromDate ? (
                  <span className="text-amber-700">
                    {formatDisplayDate(forecast.compliantFromDate)}
                  </span>
                ) : forecast.isCompliant ? (
                  <span className="text-green-600">Already compliant</span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DaysRemainingDisplay({
  daysAfter,
  daysRemaining,
  riskLevel,
}: {
  daysAfter: number;
  daysRemaining: number;
  riskLevel: 'green' | 'yellow' | 'red';
}) {
  const colorClass =
    riskLevel === 'red'
      ? 'text-red-700'
      : riskLevel === 'yellow'
        ? 'text-amber-700'
        : 'text-slate-600';

  return (
    <div className={colorClass}>
      <div className="font-medium">{daysAfter}/90 days</div>
      <div className="text-xs">
        {daysRemaining >= 0
          ? `${daysRemaining} remaining`
          : `${Math.abs(daysRemaining)} over`}
      </div>
    </div>
  );
}
