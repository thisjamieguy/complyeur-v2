'use client';

import { CheckCircle2, Users, Plane, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImportResult, ImportFormat, ValidationError } from '@/types/import';
import Link from 'next/link';

interface ImportSummaryProps {
  result: ImportResult;
  format: ImportFormat;
}

export function ImportSummary({ result, format }: ImportSummaryProps) {
  const isSuccess = result.success;

  return (
    <div className="space-y-8">
      {/* Success/Failure Header */}
      <div className="text-center">
        <div
          className={`
          w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center
          ${isSuccess ? 'bg-green-100' : 'bg-red-100'}
        `}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          ) : (
            <AlertTriangle className="h-10 w-10 text-red-600" />
          )}
        </div>
        <h1 className="text-3xl font-bold text-slate-900">
          {isSuccess ? 'Import Successful' : 'Import Failed'}
        </h1>
        <p className="mt-2 text-slate-500">
          {isSuccess
            ? 'Your data has been imported successfully.'
            : 'There were errors during the import process.'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {format === 'employees' ? (
          <>
            <StatCard
              icon={Users}
              value={result.employees_created}
              label="Employees Created"
              color="green"
            />
            <StatCard
              icon={Users}
              value={result.employees_updated}
              label="Employees Updated"
              color="blue"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={Plane}
              value={result.trips_created}
              label="Trips Created"
              color="green"
            />
            <StatCard
              icon={Plane}
              value={result.trips_skipped}
              label="Trips Skipped"
              color="amber"
            />
          </>
        )}
        {result.warnings.length > 0 && (
          <StatCard
            icon={AlertTriangle}
            value={result.warnings.length}
            label="Warnings"
            color="amber"
          />
        )}
        {result.errors.length > 0 && (
          <StatCard
            icon={AlertTriangle}
            value={result.errors.length}
            label="Errors"
            color="red"
          />
        )}
      </div>

      {/* Warnings/Errors List */}
      {(result.warnings.length > 0 || result.errors.length > 0) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-slate-900 mb-4">Import Details</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {result.errors.map((error, idx) => (
                <ErrorItem key={`error-${idx}`} error={error} type="error" />
              ))}
              {result.warnings.map((warning, idx) => (
                <ErrorItem key={`warning-${idx}`} error={warning} type="warning" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" asChild>
          <Link href="/import">Import More Data</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard">
            Go to Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  value: number;
  label: string;
  color: 'green' | 'blue' | 'amber' | 'red';
}

function StatCard({ icon: Icon, value, label, color }: StatCardProps) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className={`${colors[color]} rounded-xl p-4 flex items-center gap-3`}>
      <Icon className="h-6 w-6" />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm opacity-80">{label}</p>
      </div>
    </div>
  );
}

interface ErrorItemProps {
  error: ValidationError;
  type: 'error' | 'warning';
}

function ErrorItem({ error, type }: ErrorItemProps) {
  return (
    <div
      className={`
      flex items-start gap-2 text-sm p-2 rounded
      ${type === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}
    `}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>
        {error.row > 0 && <span className="font-medium">Row {error.row}: </span>}
        {error.column && <span className="font-medium">{error.column} - </span>}
        {error.message}
      </span>
    </div>
  );
}
