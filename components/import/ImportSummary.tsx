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

  /**
   * Navigate to a page with a hard refresh to ensure fresh data.
   * This is necessary because Next.js Router Cache may have stale data
   * from before the import. Using window.location bypasses the Router
   * Cache entirely, ensuring the server is hit for fresh data.
   *
   * We also set a sessionStorage flag so that if the user navigates
   * via sidebar instead, those pages can detect and refresh.
   */
  const navigateWithRefresh = (path: string) => {
    // Set flag for pages to detect they need fresh data
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('complyeur_data_updated', Date.now().toString());
    }
    // Hard navigation bypasses Router Cache completely
    window.location.href = path;
  };

  // Generate contextual subheadline
  const getSubheadline = () => {
    if (!isSuccess) {
      return 'There were errors during the import process.';
    }
    if (format === 'employees') {
      const total = result.employees_created + result.employees_updated;
      if (total === 1) {
        return '1 employee is now ready to track';
      }
      return `${total} employees are now ready to track`;
    }
    // trips or gantt
    if (result.trips_created === 1) {
      return '1 trip has been added to your records';
    }
    return `${result.trips_created} trips have been added to your records`;
  };

  // Build stats array, filtering out zero values
  const stats: Array<{
    icon: React.ElementType;
    value: number;
    label: string;
    color: 'green' | 'blue' | 'amber' | 'red';
  }> = [];

  if (format === 'employees') {
    if (result.employees_created > 0) {
      stats.push({
        icon: Users,
        value: result.employees_created,
        label: 'Employees Created',
        color: 'green',
      });
    }
    if (result.employees_updated > 0) {
      stats.push({
        icon: Users,
        value: result.employees_updated,
        label: 'Employees Updated',
        color: 'blue',
      });
    }
  } else {
    if (result.trips_created > 0) {
      stats.push({
        icon: Plane,
        value: result.trips_created,
        label: 'Trips Created',
        color: 'green',
      });
    }
    if (result.trips_skipped > 0) {
      stats.push({
        icon: Plane,
        value: result.trips_skipped,
        label: 'Trips Skipped',
        color: 'amber',
      });
    }
  }

  if (result.warnings.length > 0) {
    stats.push({
      icon: AlertTriangle,
      value: result.warnings.length,
      label: 'Warnings',
      color: 'amber',
    });
  }

  if (result.errors.length > 0) {
    stats.push({
      icon: AlertTriangle,
      value: result.errors.length,
      label: 'Errors',
      color: 'red',
    });
  }

  return (
    <div className="space-y-8">
      {/* Success/Failure Header */}
      <div className="text-center">
        <div
          className={`
          w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center
          animate-scale-in
          ${isSuccess ? 'bg-green-100' : 'bg-red-100'}
        `}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-red-600" />
          )}
        </div>
        <h1 className="text-3xl font-bold text-slate-900">
          {isSuccess ? "You're all set!" : 'Import Failed'}
        </h1>
        <p className="mt-2 text-slate-500">{getSubheadline()}</p>
      </div>

      {/* Stats Cards with staggered animation */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              color={stat.color}
              delay={index * 100}
            />
          ))}
        </div>
      )}

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
      <div className="flex flex-col items-center gap-4">
        <Button size="lg" onClick={() => navigateWithRefresh('/dashboard')}>
          Go to Dashboard
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/import">Import More Data</Link>
        </Button>
        <p className="text-sm text-slate-400">
          View your updated dashboard →
        </p>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  value: number;
  label: string;
  color: 'green' | 'blue' | 'amber' | 'red';
  delay?: number;
}

function StatCard({ icon: Icon, value, label, color, delay = 0 }: StatCardProps) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div
      className={`${colors[color]} rounded-xl p-4 flex items-center gap-3 animate-fade-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
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
