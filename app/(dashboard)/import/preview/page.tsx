'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Upload, Download, AlertTriangle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ValidationSummary } from '@/components/import/ValidationSummary';
import { WarningSummaryBanners } from '@/components/import/WarningSummaryBanners';
import { StepIndicator } from '@/components/import/StepIndicator';
import { DuplicateNameResolutionDialog } from '@/components/import/DuplicateNameResolutionDialog';
import { generateErrorCsv, getErrorCsvFilename, downloadCsv } from '@/lib/import/error-export';
import {
  ImportSession,
  ImportFormat,
  DuplicateOptions,
  NON_SCHENGEN_EU,
  ValidatedRow,
  ParsedRow,
  isParsedTripRow,
  isParsedEmployeeRow,
  ValidationSummary as ValidationSummaryType,
} from '@/types/import';
import { validateRows, getValidationSummary } from '@/lib/import/validator';
import { getImportSession, executeImport } from '../actions';
import { showError, showSuccess } from '@/lib/toast';
import { addDays, isAfter, isValid, parseISO } from 'date-fns';

const NON_SCHENGEN_ADVISORY_DISMISSED_KEY = 'complyeur.import.non_schengen_advisory.dismissed';

export default function PreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [session, setSession] = useState<ImportSession | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow<ParsedRow>[]>([]);
  const [summary, setSummary] = useState<ValidationSummaryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importStage, setImportStage] = useState<'idle' | 'preparing' | 'saving' | 'finalizing'>('idle');
  const [showDuplicateNameDialog, setShowDuplicateNameDialog] = useState(false);
  const [showNonSchengenAdvisory, setShowNonSchengenAdvisory] = useState(false);
  const [dontShowNonSchengenAdvisoryAgain, setDontShowNonSchengenAdvisoryAgain] = useState(false);

  // Smart defaults: update existing employees, skip duplicate trips
  const [duplicateOptions, setDuplicateOptions] = useState<DuplicateOptions>({
    employees: 'update' as const,
    trips: 'skip' as const,
    employee_name_conflicts: 'new_employee' as const,
  });

  useEffect(() => {
    async function loadSession() {
      if (!sessionId) {
        router.push('/import');
        return;
      }

      try {
        const loadedSession = await getImportSession(sessionId);

        if (!loadedSession) {
          showError('Session Not Found', 'The import session could not be found');
          router.push('/import');
          return;
        }

        setSession(loadedSession);

        // Re-validate the parsed data
        if (loadedSession.parsed_data && Array.isArray(loadedSession.parsed_data)) {
          const rows = await validateRows(
            loadedSession.parsed_data,
            loadedSession.format as ImportFormat
          );
          setValidatedRows(rows);
          setSummary(getValidationSummary(rows));
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        showError('Load Error', 'Failed to load import session');
        router.push('/import');
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [sessionId, router]);

  const handleImport = async () => {
    if (!session || !sessionId) return;

    // Check if there are any valid rows
    const validRows = validatedRows.filter((r) => r.is_valid);
    if (validRows.length === 0) {
      showError('No Valid Data', 'There are no valid rows to import. Please fix the errors first.');
      return;
    }

    setIsImporting(true);
    setImportStage('preparing');

    try {
      // Show saving stage for larger imports
      if (validRows.length > 50) {
        await new Promise((resolve) => setTimeout(resolve, 300)); // Brief delay to show stage
      }
      setImportStage('saving');

      const result = await executeImport(sessionId, duplicateOptions);

      setImportStage('finalizing');

      // Set flag to signal data was updated - helps other pages know to refresh
      if (typeof window !== 'undefined' && (result.trips_created > 0 || result.employees_created > 0)) {
        sessionStorage.setItem('complyeur_data_updated', Date.now().toString());
      }

      if (result.success) {
        showSuccess('Import Complete', `Successfully imported ${session.format}`);
        router.push(`/import/success?session=${sessionId}`);
      } else {
        showError('Import Failed', 'Some records could not be imported');
        router.push(`/import/success?session=${sessionId}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      showError('Import Error', 'An unexpected error occurred during import');
    } finally {
      setIsImporting(false);
      setImportStage('idle');
    }
  };

  const handleDownloadErrors = () => {
    if (!session) return;

    // Gather all errors and warnings from validated rows
    const allErrors = validatedRows.flatMap((row) => [...row.errors, ...row.warnings]);

    if (allErrors.length === 0) {
      showError('No Errors', 'There are no errors to download');
      return;
    }

    const csv = generateErrorCsv(allErrors);
    const fileName = getErrorCsvFilename(session.file_name);
    downloadCsv(csv, fileName);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const isTripImport = session?.format === 'trips' || session?.format === 'gantt';
    if (!isTripImport) {
      return;
    }

    const hasNonSchengenRows = validatedRows.some((row) => {
      if (!isParsedTripRow(row.data)) return false;
      const country = row.data.country?.trim().toUpperCase();
      return Boolean(country && NON_SCHENGEN_EU.has(country));
    });

    if (!hasNonSchengenRows) {
      return;
    }

    const dismissed = window.localStorage.getItem(NON_SCHENGEN_ADVISORY_DISMISSED_KEY) === '1';
    if (!dismissed) {
      setShowNonSchengenAdvisory(true);
    }
  }, [session, validatedRows]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <StepIndicator currentStep={3} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!session || !summary) {
    return null;
  }

  const canImport = summary.valid > 0;
  const isTripImport = session.format === 'trips' || session.format === 'gantt';
  const isEmployeeImport = session.format === 'employees';

  const futureTripCount = (() => {
    if (!isTripImport) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = addDays(today, 7);

    return validatedRows.reduce((count, row) => {
      if (!isParsedTripRow(row.data)) return count;
      const exitDate = parseISO(row.data.exit_date);
      if (!isValid(exitDate)) return count;
      return isAfter(exitDate, sevenDaysFromNow) ? count + 1 : count;
    }, 0);
  })();

  const duplicateNameGroups = (() => {
    if (!isEmployeeImport) return [];

    const byName = new Map<string, { name: string; rows: number[] }>();

    validatedRows.forEach((row) => {
      if (!isParsedEmployeeRow(row.data)) return;
      const fullName = `${row.data.first_name.trim()} ${row.data.last_name.trim()}`;
      if (!fullName.trim()) return;
      const key = fullName.toLowerCase().replace(/\s+/g, ' ').trim();

      if (!byName.has(key)) {
        byName.set(key, { name: fullName, rows: [] });
      }
      byName.get(key)!.rows.push(row.row_number);
    });

    return Array.from(byName.values())
      .filter((group) => group.rows.length > 1)
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  const duplicateNameModeLabel =
    duplicateOptions.employee_name_conflicts === 'same_employee'
      ? 'duplicates treated as same employee (later rows skipped)'
      : duplicateOptions.employee_name_conflicts === 'rename'
      ? 'duplicates auto-renamed'
      : 'duplicates kept as separate employees';

  const nonSchengenSummary = (() => {
    if (!isTripImport) return { count: 0, countries: [] as string[] };

    let count = 0;
    const countries = new Set<string>();

    validatedRows.forEach((row) => {
      if (!isParsedTripRow(row.data)) return;
      const country = row.data.country?.trim().toUpperCase();
      if (!country) return;

      if (NON_SCHENGEN_EU.has(country)) {
        count++;
        countries.add(country);
      }
    });

    return {
      count,
      countries: Array.from(countries).sort(),
    };
  })();

  const closeNonSchengenAdvisory = () => {
    if (dontShowNonSchengenAdvisoryAgain && typeof window !== 'undefined') {
      window.localStorage.setItem(NON_SCHENGEN_ADVISORY_DISMISSED_KEY, '1');
    }
    setShowNonSchengenAdvisory(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <StepIndicator currentStep={3} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Validation Preview</h1>
        <p className="mt-2 text-slate-500">
          Review the data before importing. Fix any errors in your file and re-upload if needed.
        </p>
      </div>

      {/* File Info */}
      <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">{session.file_name}</p>
          <p className="text-sm text-slate-500">
            Format: {session.format.charAt(0).toUpperCase() + session.format.slice(1)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push(`/import/upload?format=${session.format}`)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Different File
        </Button>
      </div>

      {/* Summary Stats */}
      <ValidationSummary summary={summary} />

      {/* Grouped Warning Banners */}
      <WarningSummaryBanners rows={validatedRows} />

      {/* Info notice for future trips */}
      {isTripImport && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div>
            <p className="font-medium text-blue-800">
              {futureTripCount > 0
                ? `${futureTripCount} future trip${futureTripCount === 1 ? '' : 's'} detected`
                : 'Future trips are supported'}
            </p>
            <p className="mt-1 text-sm text-blue-700">
              Future-dated trips import normally and are marked as upcoming records.
            </p>
          </div>
        </div>
      )}

      {/* Duplicate-name resolution for employee imports */}
      {isEmployeeImport && duplicateNameGroups.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-amber-800">
              {duplicateNameGroups.length} duplicate employee name group
              {duplicateNameGroups.length !== 1 ? 's' : ''} found
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Current behavior: {duplicateNameModeLabel}.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDuplicateNameDialog(true)}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            Resolve Names
          </Button>
        </div>
      )}

      {/* Duplicate handling info */}
      <p className="text-sm text-slate-500">
        Existing employees will be updated. Duplicate trips will be skipped.
        {isEmployeeImport && ` Duplicate-name mode: ${duplicateNameModeLabel}.`}
      </p>

      {/* Warning Callout for Partial Import */}
      {summary.errors > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-800">
              {summary.errors} row{summary.errors !== 1 ? 's have' : ' has'} errors and will be skipped
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Only {summary.valid} valid row{summary.valid !== 1 ? 's' : ''} will be imported.
              Download the errors to fix them in your file.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadErrors}
            className="flex-shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Errors
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => router.push('/import')}
          disabled={isImporting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Format Selection
        </Button>

        <div className="flex flex-col items-end gap-2">
          {/* Progress Stage Indicator */}
          {isImporting && summary.valid > 50 && (
            <p className="text-sm text-slate-500">
              {importStage === 'preparing' && 'Preparing import...'}
              {importStage === 'saving' && `Saving ${summary.valid} records...`}
              {importStage === 'finalizing' && 'Finalizing...'}
            </p>
          )}

          <Button
            onClick={handleImport}
            disabled={!canImport || isImporting}
            className="min-w-[180px]"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                Import {summary.valid} Valid Row{summary.valid !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>

      <DuplicateNameResolutionDialog
        open={showDuplicateNameDialog}
        onOpenChange={setShowDuplicateNameDialog}
        duplicateGroups={duplicateNameGroups}
        value={duplicateOptions.employee_name_conflicts ?? 'new_employee'}
        onValueChange={(next) =>
          setDuplicateOptions((prev) => ({ ...prev, employee_name_conflicts: next }))
        }
      />

      <Dialog
        open={showNonSchengenAdvisory}
        onOpenChange={(open) => {
          if (!open) {
            closeNonSchengenAdvisory();
            return;
          }
          setShowNonSchengenAdvisory(true);
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Non-Schengen Trips Detected</DialogTitle>
            <DialogDescription>
              {nonSchengenSummary.count} trip{nonSchengenSummary.count === 1 ? '' : 's'} to{' '}
              non-Schengen destinations were found ({nonSchengenSummary.countries.join(', ')}).
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            These trips import normally and remain in your history. They do not count toward the
            Schengen 90/180 calculation.
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="dismiss-non-schengen-advisory"
              checked={dontShowNonSchengenAdvisoryAgain}
              onCheckedChange={(checked) => setDontShowNonSchengenAdvisoryAgain(checked === true)}
            />
            <Label htmlFor="dismiss-non-schengen-advisory">
              Don&apos;t show this again
            </Label>
          </div>

          <DialogFooter>
            <Button onClick={closeNonSchengenAdvisory}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
