'use client';

import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FirstTimeGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Collapsed header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <HelpCircle className="h-4 w-4" />
          <span>First time importing? See how it works</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="pt-4 space-y-4">
            <div className="space-y-3">
              <Step number={1} title="Choose a format">
                Select the format that matches your data. Download the template
                to see the required columns.
              </Step>
              <Step number={2} title="Upload your file">
                Upload your spreadsheet (Excel or CSV). We&apos;ll validate the
                data and show you a preview.
              </Step>
              <Step number={3} title="Review & import">
                Check the preview for any errors, then import your data. You can
                fix issues in your file and re-upload.
              </Step>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="text-slate-500"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

function Step({ number, title, children }: StepProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
        {number}
      </div>
      <div>
        <p className="font-medium text-slate-900 text-sm">{title}</p>
        <p className="text-sm text-slate-500 mt-0.5">{children}</p>
      </div>
    </div>
  );
}
