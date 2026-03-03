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
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/90">
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
          {forecasts.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="px-6 py-14 text-center text-sm text-slate-500"
              >
                Select at least one status to show matching trips.
              </TableCell>
            </TableRow>
          )}
          {forecasts.map((forecast) => (
            <TableRow
              key={forecast.tripId}
              className="transition-colors hover:bg-slate-50/80"
            >
              <TableCell className="font-medium">
                <Link
                  href={`/employee/${forecast.employeeId}`}
                  className="text-slate-900 transition-colors hover:text-sky-700"
                >
                  {forecast.employeeName}
                </Link>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                  <span className="text-lg">{forecast.countryFlag}</span>
                  <span className="text-slate-700">{forecast.countryName}</span>
                  {!forecast.isSchengen && (
                    <span className="text-xs text-slate-400">(non-Schengen)</span>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-slate-600">
                <div className="flex flex-col gap-0.5">
                  <span className="whitespace-nowrap font-medium text-slate-800">
                    {formatDisplayDate(forecast.entryDate)}
                  </span>
                  <span className="whitespace-nowrap text-sm text-slate-500">
                    to {formatDisplayDate(forecast.exitDate)}
                  </span>
                </div>
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
                  <span className="font-medium text-amber-700">
                    {formatDisplayDate(forecast.compliantFromDate)}
                  </span>
                ) : forecast.isCompliant ? (
                  <span className="font-medium text-green-700">Already compliant</span>
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
      <div className="font-semibold">{daysAfter}/90 days</div>
      <div className="text-xs">
        {daysRemaining >= 0
          ? `${daysRemaining} remaining`
          : `${Math.abs(daysRemaining)} over`}
      </div>
    </div>
  );
}
