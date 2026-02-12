'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FileDropzone } from '@/components/import/FileDropzone';
import { ColumnMappingUI } from '@/components/import/ColumnMappingUI';
import { DateFormatConfirmation } from '@/components/import/DateFormatConfirmation';
import { StepIndicator } from '@/components/import/StepIndicator';
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
  getStoredImportDateFormat,
  setStoredImportDateFormat,
} from '@/lib/import/date-preferences';
import {
  createImportSession,
  saveParsedData,
  loadSavedMappings,
  saveColumnMapping,
  incrementMappingUsage,
} from '../actions';
import { showError, showSuccess } from '@/lib/toast';

// ============================================================
// PROCESSING STAGES
// ============================================================

type ProcessingStage = 'idle' | 'uploading' | 'parsing' | 'validating' | 'preparing';

const STAGE_MESSAGES: Record<ProcessingStage, string> = {
  idle: '',
  uploading: 'Uploading file...',
  parsing: 'Reading spreadsheet...',
  validating: 'Validating data...',
  preparing: 'Preparing preview...',
};

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
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
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

  useEffect(() => {
    setSelectedDateFormat(getStoredImportDateFormat());
  }, []);

  // ============================================================
  // FILE UPLOAD HANDLER
  // ============================================================

  const handleFileSelect = async (file: File) => {
    if (!format) return;

    setIsProcessing(true);
    setProcessingStage('uploading');

    try {
      // Step 1: Create import session
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);

      const sessionResult = await createImportSession(formData);

      if (!sessionResult.success || !sessionResult.session) {
        showError('Upload Failed', sessionResult.error ?? 'Failed to create import session');
        setIsProcessing(false);
        setProcessingStage('idle');
        return;
      }

      setSessionId(sessionResult.session.id);
      setProcessingStage('parsing');

      // Special handling for Gantt/Schedule format
      if (format === 'gantt') {
        const buffer = await file.arrayBuffer();
        const ganttResult = parseGanttFromData(buffer);

        if (!ganttResult.success || !ganttResult.data) {
          showError('Parse Error', ganttResult.error ?? 'Failed to parse schedule file');
          setIsProcessing(false);
          setProcessingStage('idle');
          return;
        }

        setProcessingStage('validating');
        const validatedRows = await validateRows(ganttResult.data, 'gantt');
        const summary = getValidationSummary(validatedRows);
        const allErrors = validatedRows.flatMap((r) => [...r.errors, ...r.warnings]);

        setProcessingStage('preparing');
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
        setProcessingStage('idle');
        return;
      }

      setProcessingStage('validating');
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
        setProcessingStage('idle');
        return;
      }

      setProcessingStage('preparing');

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
      setProcessingStage('idle');
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
            if (report.detectedFormat === 'DD/MM') {
              setSelectedDateFormat('DD/MM');
            } else if (report.detectedFormat === 'MM/DD') {
              setSelectedDateFormat('MM/DD');
            }
            setShowDateConfirmation(true);
            setIsProcessing(false);
            setProcessingStage('idle');
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
      setProcessingStage('idle');
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
      const transformedData = applyMappings(data, state.mappings, {
        preferredDateFormat: selectedDateFormat,
      });

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
      setProcessingStage('idle');
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
      setProcessingStage('preparing');

      // Continue to date check and processing
      await proceedAfterMapping(rawData, mappingState, sessionId);
    } catch (error) {
      console.error('Mapping confirm error:', error);
      showError('Error', 'Failed to save mapping');
      setIsProcessing(false);
      setProcessingStage('idle');
    }
  };

  // ============================================================
  // DATE FORMAT CONFIRMATION HANDLER
  // ============================================================

  const handleDateConfirm = async () => {
    if (!rawData || !mappingState || !sessionId) return;

    setDateConfirmed(true);
    setStoredImportDateFormat(selectedDateFormat);
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
        <StepIndicator currentStep={2} />
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Confirm Date Format</h2>
          <p className="text-slate-500">
            We detected some dates that could be interpreted in different ways.
          </p>
        </div>

        <DateFormatConfirmation
          report={dateReport}
          selectedFormat={selectedDateFormat}
          onFormatChange={(format) => {
            setSelectedDateFormat(format);
            setStoredImportDateFormat(format);
          }}
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
        <StepIndicator currentStep={2} />
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

  // Show processing state
  if (isProcessing && processingStage !== 'idle') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <StepIndicator currentStep={2} />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
          <p className="text-lg font-medium text-slate-900">
            {STAGE_MESSAGES[processingStage]}
          </p>
        </div>
      </div>
    );
  }

  // Default: show file dropzone
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <StepIndicator currentStep={2} />
      <FileDropzone format={format} onFileSelect={handleFileSelect} isProcessing={isProcessing} />
    </div>
  );
}
