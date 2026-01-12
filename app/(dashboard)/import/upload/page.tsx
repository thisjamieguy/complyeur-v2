'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileDropzone } from '@/components/import/FileDropzone';
import { ImportFormat, IMPORT_FORMATS } from '@/types/import';
import { parseFile } from '@/lib/import/parser';
import { validateRows, getValidationSummary } from '@/lib/import/validator';
import { createImportSession, saveParsedData } from '../actions';
import { showError } from '@/lib/toast';

export default function UploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formatParam = searchParams.get('format');

  const [format, setFormat] = useState<ImportFormat | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (formatParam && IMPORT_FORMATS.includes(formatParam as ImportFormat)) {
      setFormat(formatParam as ImportFormat);
    } else {
      // Redirect to format selection if no valid format
      router.push('/import');
    }
  }, [formatParam, router]);

  const handleFileSelect = async (file: File) => {
    if (!format) return;

    setIsProcessing(true);

    try {
      // Create import session
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);

      const sessionResult = await createImportSession(formData);

      if (!sessionResult.success || !sessionResult.session) {
        showError('Upload Failed', sessionResult.error ?? 'Failed to create import session');
        setIsProcessing(false);
        return;
      }

      const sessionId = sessionResult.session.id;

      // Parse the file
      const parseResult = await parseFile(file, format);

      if (!parseResult.success || !parseResult.data) {
        showError('Parse Error', parseResult.error ?? 'Failed to parse file');
        setIsProcessing(false);
        return;
      }

      // Validate the rows
      const validatedRows = await validateRows(parseResult.data, format);
      const summary = getValidationSummary(validatedRows);

      // Flatten all validation errors for storage
      const allErrors = validatedRows.flatMap((r) => [...r.errors, ...r.warnings]);

      // Save parsed data to session
      await saveParsedData(
        sessionId,
        parseResult.data,
        summary.valid,
        summary.errors,
        allErrors
      );

      // Navigate to preview page
      router.push(`/import/preview?session=${sessionId}`);
    } catch (error) {
      console.error('File processing error:', error);
      showError('Processing Error', 'An unexpected error occurred while processing the file');
      setIsProcessing(false);
    }
  };

  if (!format) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <FileDropzone format={format} onFileSelect={handleFileSelect} isProcessing={isProcessing} />
    </div>
  );
}
