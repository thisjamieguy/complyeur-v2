'use client';

/**
 * DateFormatConfirmation Component
 *
 * What it does:
 * - Displays date format ambiguity warnings to users
 * - Allows users to confirm DD/MM vs MM/DD interpretation
 * - Shows examples of ambiguous dates found in their data
 *
 * Why it matters:
 * - Prevents silent date parsing errors (Jan 2 vs Feb 1)
 * - Gives users control over how their data is interpreted
 * - Builds trust by being transparent about assumptions
 */

import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AmbiguityReport } from '@/lib/import/date-parser';

interface DateFormatConfirmationProps {
  /** The ambiguity analysis report from date parser */
  report: AmbiguityReport;
  /** Currently selected format preference */
  selectedFormat: 'DD/MM' | 'MM/DD';
  /** Callback when format selection changes */
  onFormatChange: (format: 'DD/MM' | 'MM/DD') => void;
  /** Whether user has confirmed their choice */
  isConfirmed: boolean;
  /** Callback when user confirms the format */
  onConfirm: () => void;
}

/**
 * Date format confirmation UI component.
 * Shows different states based on confidence level and confirmation status.
 */
export function DateFormatConfirmation({
  report,
  selectedFormat,
  onFormatChange,
  isConfirmed,
  onConfirm,
}: DateFormatConfirmationProps) {
  // High confidence - auto-detected, no confirmation needed
  if (!report.requiresConfirmation && report.confidence === 'high') {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Date Format Detected</AlertTitle>
        <AlertDescription className="text-green-700">
          {report.explanation}
        </AlertDescription>
      </Alert>
    );
  }

  // No dates found or all in unambiguous format
  if (report.totalDates === 0 || (!report.requiresConfirmation && report.confidence === 'medium')) {
    return (
      <Alert className="border-slate-200 bg-slate-50">
        <CheckCircle2 className="h-4 w-4 text-slate-600" />
        <AlertTitle className="text-slate-800">Dates Processed</AlertTitle>
        <AlertDescription className="text-slate-700">
          {report.explanation}
        </AlertDescription>
      </Alert>
    );
  }

  // Needs confirmation - show radio selection
  return (
    <Alert
      className={`border-2 ${
        isConfirmed ? 'border-green-200 bg-green-50' : 'border-amber-300 bg-amber-50'
      }`}
    >
      <AlertCircle
        className={`h-4 w-4 ${isConfirmed ? 'text-green-600' : 'text-amber-600'}`}
      />
      <AlertTitle className={isConfirmed ? 'text-green-800' : 'text-amber-800'}>
        {isConfirmed ? 'Date Format Confirmed' : 'Please Confirm Date Format'}
      </AlertTitle>
      <AlertDescription className="mt-3 space-y-4">
        <p className={isConfirmed ? 'text-green-700' : 'text-amber-700'}>
          {report.explanation}
        </p>

        {/* Show examples of ambiguous dates */}
        {report.ambiguousExamples.length > 0 && (
          <div className="rounded-lg bg-white/50 p-3">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Ambiguous dates found in your file:
            </p>
            <div className="flex flex-wrap gap-2">
              {report.ambiguousExamples.map((date, i) => (
                <code
                  key={i}
                  className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-800"
                >
                  {date}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Format selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-700">
              How should we interpret your dates?
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center"
                    aria-label="Date format help"
                  >
                    <HelpCircle className="h-4 w-4 text-slate-400" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    <strong>DD/MM/YYYY:</strong> Day first (UK/EU standard).
                  </p>
                  <p className="mt-1">Example: &quot;05/01/2025&quot; = 5th January 2025</p>
                  <p className="mt-3">
                    <strong>MM/DD/YYYY:</strong> Month first (US standard).
                  </p>
                  <p className="mt-1">Example: &quot;05/01/2025&quot; = May 1st 2025</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <RadioGroup
            value={selectedFormat}
            onValueChange={(value) => onFormatChange(value as 'DD/MM' | 'MM/DD')}
            className="grid grid-cols-2 gap-4"
          >
            {(['DD/MM', 'MM/DD'] as const).map((fmt) => (
              <div key={fmt}>
                <RadioGroupItem value={fmt} id={`format-${fmt}`} className="peer sr-only" />
                <Label
                  htmlFor={`format-${fmt}`}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 p-4 transition-all ${
                    selectedFormat === fmt
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg font-semibold text-slate-900">{fmt}/YYYY</span>
                  <span className="mt-1 text-sm text-slate-500">
                    {fmt === 'DD/MM' ? 'UK/European' : 'US'} format
                  </span>
                  <code className="mt-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    05/01/2025 → {fmt === 'DD/MM' ? '5 January' : '1 May'}
                  </code>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Confirm button or confirmed state */}
        {!isConfirmed ? (
          <Button onClick={onConfirm} className="w-full" size="lg">
            Confirm Date Format
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">
              Format confirmed: {selectedFormat}/YYYY
            </span>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Compact version for inline display in tables/previews.
 */
export function DateFormatBadge({
  format,
  isConfirmed,
}: {
  format: 'DD/MM' | 'MM/DD';
  isConfirmed: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isConfirmed
          ? 'bg-green-100 text-green-800'
          : 'bg-amber-100 text-amber-800'
      }`}
    >
      {isConfirmed ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertCircle className="h-3 w-3" />
      )}
      {format}
    </span>
  );
}
