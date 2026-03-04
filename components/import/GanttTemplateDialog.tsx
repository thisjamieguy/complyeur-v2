'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { showError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEFAULT_GANTT_TEMPLATE_OPTIONS,
  MAX_GANTT_TEMPLATE_DAYS,
  MAX_UNLIMITED_TEMPLATE_EMPLOYEE_ROWS,
  downloadBlob,
  generateGanttTemplateWorkbook,
  getGanttTemplateBounds,
  type GanttTemplateRange,
} from '@/lib/import/gantt/template-workbook';

type PastRangePreset = '180_days' | '12_months' | '18_months' | 'custom_weeks';
type FutureRangePreset = '12_weeks' | '3_months' | '6_months' | 'custom_weeks';

const PAST_RANGE_OPTIONS: Array<{ value: PastRangePreset; label: string }> = [
  { value: '180_days', label: '180 days' },
  { value: '12_months', label: '12 months' },
  { value: '18_months', label: '18 months' },
  { value: 'custom_weeks', label: 'Custom weeks' },
];

const FUTURE_RANGE_OPTIONS: Array<{ value: FutureRangePreset; label: string }> = [
  { value: '12_weeks', label: '12 weeks' },
  { value: '3_months', label: '3 months' },
  { value: '6_months', label: '6 months' },
  { value: 'custom_weeks', label: 'Custom weeks' },
];

interface GanttTemplateDialogProps {
  maxEmployees: number | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function GanttTemplateDialog({
  maxEmployees,
  onOpenChange,
  open,
}: GanttTemplateDialogProps) {
  const [employeeRows, setEmployeeRows] = useState(
    String(DEFAULT_GANTT_TEMPLATE_OPTIONS.employeeRows)
  );
  const [pastRangePreset, setPastRangePreset] = useState<PastRangePreset>('12_months');
  const [futureRangePreset, setFutureRangePreset] = useState<FutureRangePreset>('12_weeks');
  const [pastCustomWeeks, setPastCustomWeeks] = useState('12');
  const [futureCustomWeeks, setFutureCustomWeeks] = useState('12');
  const [isDownloading, setIsDownloading] = useState(false);

  const maxRows = maxEmployees ?? MAX_UNLIMITED_TEMPLATE_EMPLOYEE_ROWS;
  const parsedEmployeeRows = Number.parseInt(employeeRows, 10);
  const parsedPastCustomWeeks = Number.parseInt(pastCustomWeeks, 10);
  const parsedFutureCustomWeeks = Number.parseInt(futureCustomWeeks, 10);
  const pastRange = resolvePastRange(pastRangePreset, parsedPastCustomWeeks);
  const futureRange = resolveFutureRange(futureRangePreset, parsedFutureCustomWeeks);

  const employeeRowsError = getEmployeeRowsError(parsedEmployeeRows, maxRows);
  const customWeeksError = getCustomWeeksError(
    pastRangePreset,
    parsedPastCustomWeeks,
    futureRangePreset,
    parsedFutureCustomWeeks
  );

  const bounds =
    !employeeRowsError && !customWeeksError && pastRange && futureRange
      ? getGanttTemplateBounds(new Date(), pastRange, futureRange)
      : null;
  const totalDaysError =
    bounds && bounds.totalDays > MAX_GANTT_TEMPLATE_DAYS
      ? `This selection creates ${bounds.totalDays} date columns. Reduce the range to ${MAX_GANTT_TEMPLATE_DAYS} days or fewer so the workbook stays import-compatible.`
      : null;
  const validationError = employeeRowsError ?? customWeeksError ?? totalDaysError;

  useEffect(() => {
    if (!open) {
      setEmployeeRows(String(DEFAULT_GANTT_TEMPLATE_OPTIONS.employeeRows));
      setPastRangePreset('12_months');
      setFutureRangePreset('12_weeks');
      setPastCustomWeeks('12');
      setFutureCustomWeeks('12');
      setIsDownloading(false);
    }
  }, [open]);

  const handleDownload = async () => {
    if (validationError || !pastRange || !futureRange) {
      return;
    }

    setIsDownloading(true);

    try {
      const { blob, filename } = await generateGanttTemplateWorkbook({
        anchorDate: new Date(),
        employeeRows: parsedEmployeeRows,
        pastRange,
        futureRange,
      });

      downloadBlob(blob, filename);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not generate the custom Gantt template.';
      showError('Template Download Failed', message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Customize Gantt Template</DialogTitle>
          <DialogDescription>
            Generate a workbook with a blank schedule sheet, ISO country codes,
            and a worked example.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="gantt-template-employee-rows">Blank employee rows</Label>
            <Input
              id="gantt-template-employee-rows"
              inputMode="numeric"
              max={maxRows}
              min={1}
              type="number"
              value={employeeRows}
              onChange={(event) => setEmployeeRows(event.target.value)}
            />
            <p className="text-xs text-slate-500">
              {maxEmployees
                ? `Up to ${maxRows} rows on your current plan.`
                : `Up to ${maxRows} rows per workbook.`}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gantt-template-past-range">How far back</Label>
              <Select
                value={pastRangePreset}
                onValueChange={(value) => setPastRangePreset(value as PastRangePreset)}
              >
                <SelectTrigger
                  aria-label="How far back"
                  className="w-full"
                  id="gantt-template-past-range"
                >
                  <SelectValue placeholder="Choose a past range" />
                </SelectTrigger>
                <SelectContent>
                  {PAST_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pastRangePreset === 'custom_weeks' && (
                <Input
                  aria-label="Past custom weeks"
                  inputMode="numeric"
                  max={71}
                  min={1}
                  type="number"
                  value={pastCustomWeeks}
                  onChange={(event) => setPastCustomWeeks(event.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gantt-template-future-range">How far forward</Label>
              <Select
                value={futureRangePreset}
                onValueChange={(value) => setFutureRangePreset(value as FutureRangePreset)}
              >
                <SelectTrigger
                  aria-label="How far forward"
                  className="w-full"
                  id="gantt-template-future-range"
                >
                  <SelectValue placeholder="Choose a future range" />
                </SelectTrigger>
                <SelectContent>
                  {FUTURE_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {futureRangePreset === 'custom_weeks' && (
                <Input
                  aria-label="Future custom weeks"
                  inputMode="numeric"
                  max={71}
                  min={1}
                  type="number"
                  value={futureCustomWeeks}
                  onChange={(event) => setFutureCustomWeeks(event.target.value)}
                />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {bounds ? (
              <p>
                This workbook will include {parsedEmployeeRows} blank employee
                row{parsedEmployeeRows === 1 ? '' : 's'} and daily columns from{' '}
                <span className="font-medium text-slate-900">
                  {bounds.startDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>{' '}
                to{' '}
                <span className="font-medium text-slate-900">
                  {bounds.endDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                .
              </p>
            ) : (
              <p>Choose a valid employee count and date range to generate the workbook.</p>
            )}
          </div>

          {validationError && (
            <p className="text-sm text-red-600" role="alert">
              {validationError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDownloading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={Boolean(validationError) || isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              'Download custom template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function resolvePastRange(
  preset: PastRangePreset,
  customWeeks: number
): GanttTemplateRange | null {
  switch (preset) {
    case '180_days':
      return { unit: 'days', value: 180 };
    case '12_months':
      return { unit: 'months', value: 12 };
    case '18_months':
      return { unit: 'months', value: 18 };
    case 'custom_weeks':
      return Number.isInteger(customWeeks) ? { unit: 'weeks', value: customWeeks } : null;
    default:
      return null;
  }
}

function resolveFutureRange(
  preset: FutureRangePreset,
  customWeeks: number
): GanttTemplateRange | null {
  switch (preset) {
    case '12_weeks':
      return { unit: 'weeks', value: 12 };
    case '3_months':
      return { unit: 'months', value: 3 };
    case '6_months':
      return { unit: 'months', value: 6 };
    case 'custom_weeks':
      return Number.isInteger(customWeeks) ? { unit: 'weeks', value: customWeeks } : null;
    default:
      return null;
  }
}

function getEmployeeRowsError(employeeRows: number, maxRows: number): string | null {
  if (!Number.isInteger(employeeRows)) {
    return 'Enter the number of blank employee rows to include.';
  }

  if (employeeRows < 1) {
    return 'Employee rows must be at least 1.';
  }

  if (employeeRows > maxRows) {
    return `Employee rows cannot exceed ${maxRows}.`;
  }

  return null;
}

function getCustomWeeksError(
  pastRangePreset: PastRangePreset,
  pastCustomWeeks: number,
  futureRangePreset: FutureRangePreset,
  futureCustomWeeks: number
): string | null {
  if (pastRangePreset === 'custom_weeks' && !isValidCustomWeeks(pastCustomWeeks)) {
    return 'Past custom weeks must be between 1 and 71.';
  }

  if (futureRangePreset === 'custom_weeks' && !isValidCustomWeeks(futureCustomWeeks)) {
    return 'Future custom weeks must be between 1 and 71.';
  }

  return null;
}

function isValidCustomWeeks(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 71;
}
