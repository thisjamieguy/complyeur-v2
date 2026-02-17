'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, File, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  ImportFormat,
} from '@/types/import';

interface FileDropzoneProps {
  format: ImportFormat;
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export function FileDropzone({ format, onFileSelect, isProcessing }: FileDropzoneProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }

    if (file.size === 0) {
      return 'File is empty.';
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
      return 'Invalid file type. Only .xlsx, .xls, and .csv files are accepted.';
    }

    // Check for macro-enabled files
    if (file.name.toLowerCase().endsWith('.xlsm') || file.name.toLowerCase().endsWith('.xlsb')) {
      return 'Macro-enabled files are not allowed for security reasons.';
    }

    return null;
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setError(null);

      if (acceptedFiles.length === 0) {
        const rejection = fileRejections[0];
        if (rejection?.errors?.length) {
          setError(rejection.errors[0].message);
        }
        return;
      }

      const file = acceptedFiles[0];
      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        return;
      }

      setSelectedFile(file);
    },
    [validateFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls', '.csv'],
      'text/csv': ['.csv'],
      'text/plain': ['.csv'],
      'application/csv': ['.csv'],
    },
    maxFiles: 1,
    multiple: false,
    disabled: isProcessing,
  });

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Upload {format === 'employees' ? 'Employees' : 'Trips'} File
        </h2>
        <p className="text-slate-500">
          Upload your Excel or CSV file. We&apos;ll validate the data before importing.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
            ${isDragActive ? 'border-blue-600 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <Upload className="h-8 w-8 text-slate-400" />
            </div>
            {isDragActive ? (
              <p className="text-lg font-medium text-blue-600">Drop the file here</p>
            ) : (
              <>
                <p className="text-lg font-medium text-slate-700">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-sm text-slate-500">
                  Supports .xlsx, .xls, and .csv files up to 10MB
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="border rounded-xl p-6 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <File className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemoveFile}
              disabled={isProcessing}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/import')}
          disabled={isProcessing}
        >
          Back
        </Button>
        <Button onClick={handleUpload} disabled={!selectedFile || isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Validate & Preview'
          )}
        </Button>
      </div>
    </div>
  );
}
