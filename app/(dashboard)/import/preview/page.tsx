'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Upload } from 'lucide-react';
import { ValidationSummary } from '@/components/import/ValidationSummary';
import { ValidationTable } from '@/components/import/ValidationTable';
import {
  ImportSession,
  ImportFormat,
  ValidatedRow,
  ParsedRow,
  ValidationSummary as ValidationSummaryType,
} from '@/types/import';
import { validateRows, getValidationSummary } from '@/lib/import/validator';
import { getImportSession, executeImport } from '../actions';
import { showError, showSuccess } from '@/lib/toast';

export default function PreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [session, setSession] = useState<ImportSession | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow<ParsedRow>[]>([]);
  const [summary, setSummary] = useState<ValidationSummaryType | null>(null);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

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

    try {
      const result = await executeImport(sessionId, session.format as ImportFormat, validatedRows);

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
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
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

      {/* Error Filter Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="show-errors"
            checked={showOnlyErrors}
            onCheckedChange={setShowOnlyErrors}
          />
          <Label htmlFor="show-errors" className="text-sm text-slate-600">
            Show only rows with errors/warnings
          </Label>
        </div>
      </div>

      {/* Validation Table */}
      <ValidationTable
        rows={validatedRows}
        format={session.format as ImportFormat}
        showOnlyErrors={showOnlyErrors}
      />

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

        <div className="flex items-center gap-4">
          {summary.errors > 0 && (
            <p className="text-sm text-amber-600">
              {summary.errors} row(s) with errors will be skipped
            </p>
          )}
          <Button
            onClick={handleImport}
            disabled={!canImport || isImporting}
            className="min-w-[160px]"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                Import {summary.valid} Row{summary.valid !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
