'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileDropzone } from '@/components/import/FileDropzone';
import { ColumnMappingUI } from '@/components/import/ColumnMappingUI';
import { DateFormatConfirmation } from '@/components/import/DateFormatConfirmation';
import type { ImportFormat, MappingState, ParsedRow } from '@/types/import';
import { IMPORT_FORMATS } from '@/types/import';
import { parseFileRaw, parseGanttFromData } from '@/lib/import/parser';
import { validateRows, getValidationSummary } from '@/lib/import/validator';
import {
  initializeMappingState,
  needsManualMapping,
  applyMappings,
  mappingsToStorageFormat,
} from '@/lib/import/mapping';
import { analyzeAmbiguity, type AmbiguityReport } from '@/lib/import/date-parser';
import {
  createImportSession,
  saveParsedData,
  loadSavedMappings,
  saveColumnMapping,
  incrementMappingUsage,
} from '../actions';
import { showError, showSuccess } from '@/lib/toast';

// ============================================================
// UPLOAD PAGE COMPONENT
// ============================================================

export default function UploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formatParam = searchParams.get('format');

  // Basic state
  const [format, setFormat] = useState<ImportFormat | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Raw parsed data (before mapping)
  const [rawData, setRawData] = useState<Record<string, unknown>[] | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[] | null>(null);

  // Column mapping state
  const [mappingState, setMappingState] = useState<MappingState | null>(null);
  const [showMappingUI, setShowMappingUI] = useState(false);
  const [appliedSavedMappingId, setAppliedSavedMappingId] = useState<string | null>(null);

  // Date format state
  const [dateReport, setDateReport] = useState<AmbiguityReport | null>(null);
  const [showDateConfirmation, setShowDateConfirmation] = useState(false);
  const [selectedDateFormat, setSelectedDateFormat] = useState<'DD/MM' | 'MM/DD'>('DD/MM');
  const [dateConfirmed, setDateConfirmed] = useState(false);

  // Validate format param
  useEffect(() => {
    if (formatParam && IMPORT_FORMATS.includes(formatParam as ImportFormat)) {
      setFormat(formatParam as ImportFormat);
    } else {
      router.push('/import');
    }
  }, [formatParam, router]);

  // ============================================================
  // FILE UPLOAD HANDLER
  // ============================================================

  const handleFileSelect = async (file: File) => {
    if (!format) return;

    setIsProcessing(true);

    try {
      // Step 1: Create import session
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);

      const sessionResult = await createImportSession(formData);

      if (!sessionResult.success || !sessionResult.session) {
        showError('Upload Failed', sessionResult.error ?? 'Failed to create import session');
        setIsProcessing(false);
        return;
      }

      setSessionId(sessionResult.session.id);

      // Special handling for Gantt/Schedule format
      if (format === 'gantt') {
        const buffer = await file.arrayBuffer();
        const ganttResult = parseGanttFromData(buffer);

        if (!ganttResult.success || !ganttResult.data) {
          showError('Parse Error', ganttResult.error ?? 'Failed to parse schedule file');
          setIsProcessing(false);
          return;
        }

        const validatedRows = await validateRows(ganttResult.data, 'gantt');
        const summary = getValidationSummary(validatedRows);
        const allErrors = validatedRows.flatMap((r) => [...r.errors, ...r.warnings]);

        await saveParsedData(
          sessionResult.session.id,
          ganttResult.data,
          summary.valid,
          summary.errors,
          allErrors
        );

        router.push(`/import/preview?session=${sessionResult.session.id}`);
        return;
      }

      // Step 2: Parse file raw (without strict validation)
      const parseResult = await parseFileRaw(file);

      if (!parseResult.success || !parseResult.rawData || !parseResult.rawHeaders) {
        showError('Parse Error', parseResult.error ?? 'Failed to parse file');
        setIsProcessing(false);
        return;
      }

      setRawData(parseResult.rawData);
      setRawHeaders(parseResult.rawHeaders);

      // Step 3: Load saved mappings and initialize mapping state
      const savedMappings = await loadSavedMappings(format);
      const initialMappingState = initializeMappingState(
        parseResult.rawHeaders,
        format,
        sessionResult.session.id,
        savedMappings,
        parseResult.rawData
      );

      setMappingState(initialMappingState);

      // Track if a saved mapping was applied
      if (savedMappings.length > 0) {
        const applied = savedMappings.find((sm) =>
          initialMappingState.mappings.some(
            (m) => m.confidence === 'saved' && sm.mappings[m.sourceColumn]
          )
        );
        if (applied) {
          setAppliedSavedMappingId(applied.id);
        }
      }

      // Step 4: Check if manual mapping is needed
      if (needsManualMapping(initialMappingState)) {
        setShowMappingUI(true);
        setIsProcessing(false);
        return;
      }

      // Step 5: No mapping needed - check date format for trips/gantt
      await proceedAfterMapping(
        parseResult.rawData,
        initialMappingState,
        sessionResult.session.id
      );
    } catch (error) {
      console.error('File processing error:', error);
      showError('Processing Error', 'An unexpected error occurred while processing the file');
      setIsProcessing(false);
    }
  };

  // ============================================================
  // PROCEED AFTER MAPPING (check dates, validate, navigate)
  // ============================================================

  const proceedAfterMapping = async (
    data: Record<string, unknown>[],
    state: MappingState,
    currentSessionId: string
  ) => {
    setIsProcessing(true);

    try {
      // Check date format for trips/gantt formats
      if (state.format === 'trips' || state.format === 'gantt') {
        const dateColumns = ['entry_date', 'exit_date'];
        const dateStrings: string[] = [];

        for (const mapping of state.mappings) {
          if (mapping.targetField && dateColumns.includes(mapping.targetField)) {
            const sourceCol = mapping.sourceColumn;
            for (const row of data) {
              const value = row[sourceCol];
              if (value !== null && value !== undefined && String(value).trim()) {
                dateStrings.push(String(value).trim());
              }
            }
          }
        }

        if (dateStrings.length > 0) {
          const report = analyzeAmbiguity(dateStrings);
          setDateReport(report);

          if (report.requiresConfirmation) {
            // Set default format based on detection
            if (report.detectedFormat === 'DD/MM' || report.detectedFormat === 'UNKNOWN') {
              setSelectedDateFormat('DD/MM');
            } else if (report.detectedFormat === 'MM/DD') {
              setSelectedDateFormat('MM/DD');
            }
            setShowDateConfirmation(true);
            setIsProcessing(false);
            return;
          }
        }
      }

      // No date confirmation needed - proceed to validation
      await completeProcessing(data, state, currentSessionId);
    } catch (error) {
      console.error('Processing error:', error);
      showError('Processing Error', 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  // ============================================================
  // COMPLETE PROCESSING (apply mappings, validate, save, navigate)
  // ============================================================

  const completeProcessing = async (
    data: Record<string, unknown>[],
    state: MappingState,
    currentSessionId: string
  ) => {
    setIsProcessing(true);

    try {
      // Apply mappings to transform data
      const transformedData = applyMappings(data, state.mappings);

      // Validate the rows
      const validatedRows = await validateRows(transformedData, state.format);
      const summary = getValidationSummary(validatedRows);

      // Flatten all validation errors for storage
      const allErrors = validatedRows.flatMap((r) => [...r.errors, ...r.warnings]);

      // Save parsed data to session
      await saveParsedData(
        currentSessionId,
        transformedData,
        summary.valid,
        summary.errors,
        allErrors
      );

      // Increment usage count for saved mapping if one was applied
      if (appliedSavedMappingId) {
        await incrementMappingUsage(appliedSavedMappingId);
      }

      // Navigate to preview page
      router.push(`/import/preview?session=${currentSessionId}`);
    } catch (error) {
      console.error('Complete processing error:', error);
      showError('Processing Error', 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  // ============================================================
  // MAPPING CONFIRMATION HANDLER
  // ============================================================

  const handleMappingConfirm = async (saveMapping: boolean, mappingName?: string) => {
    if (!mappingState || !rawData || !sessionId) return;

    setIsProcessing(true);

    try {
      // Save the mapping if requested
      if (saveMapping && mappingName) {
        const storageMappings = mappingsToStorageFormat(mappingState.mappings);
        const savedMapping = await saveColumnMapping(
          mappingName,
          mappingState.format,
          storageMappings
        );

        if (savedMapping) {
          showSuccess('Mapping Saved', 'Your column mapping has been saved for future imports.');
          setAppliedSavedMappingId(savedMapping.id);
        }
      }

      setShowMappingUI(false);

      // Continue to date check and processing
      await proceedAfterMapping(rawData, mappingState, sessionId);
    } catch (error) {
      console.error('Mapping confirm error:', error);
      showError('Error', 'Failed to save mapping');
      setIsProcessing(false);
    }
  };

  // ============================================================
  // DATE FORMAT CONFIRMATION HANDLER
  // ============================================================

  const handleDateConfirm = async () => {
    if (!rawData || !mappingState || !sessionId) return;

    setDateConfirmed(true);
    await completeProcessing(rawData, mappingState, sessionId);
  };

  // ============================================================
  // CANCEL HANDLERS
  // ============================================================

  const handleMappingCancel = () => {
    setShowMappingUI(false);
    setMappingState(null);
    setRawData(null);
    setRawHeaders(null);
    setSessionId(null);
  };

  const handleDateCancel = () => {
    setShowDateConfirmation(false);
    setDateReport(null);
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (!format) {
    return null;
  }

  // Show date format confirmation
  if (showDateConfirmation && dateReport) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Confirm Date Format</h2>
          <p className="text-slate-500">
            We detected some dates that could be interpreted in different ways.
          </p>
        </div>

        <DateFormatConfirmation
          report={dateReport}
          selectedFormat={selectedDateFormat}
          onFormatChange={setSelectedDateFormat}
          isConfirmed={dateConfirmed}
          onConfirm={handleDateConfirm}
        />

        <div className="flex justify-end gap-4">
          <button
            onClick={handleDateCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            disabled={isProcessing}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Show column mapping UI
  if (showMappingUI && mappingState) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ColumnMappingUI
          mappingState={mappingState}
          onMappingChange={setMappingState}
          onConfirm={handleMappingConfirm}
          onCancel={handleMappingCancel}
          isSaving={isProcessing}
        />
      </div>
    );
  }

  // Default: show file dropzone
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <FileDropzone format={format} onFileSelect={handleFileSelect} isProcessing={isProcessing} />
    </div>
  );
}
