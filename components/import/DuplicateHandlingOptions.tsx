'use client';

import { Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { ImportFormat, DuplicateOptions, DuplicateHandlingMode } from '@/types/import';

interface DuplicateHandlingOptionsProps {
  format: ImportFormat;
  value: DuplicateOptions;
  onChange: (options: DuplicateOptions) => void;
  disabled?: boolean;
}

export function DuplicateHandlingOptions({
  format,
  value,
  onChange,
  disabled = false,
}: DuplicateHandlingOptionsProps) {
  const handleEmployeeChange = (mode: DuplicateHandlingMode) => {
    onChange({ ...value, employees: mode });
  };

  // Only show for employees format
  if (format !== 'employees') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-slate-700">Duplicate Trip Detection</p>
            <p className="text-sm text-slate-500 mt-1">
              Trips are matched by employee email and exact dates.
              If a trip already exists with the same employee, entry date, and exit date, it will be skipped.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
      <div>
        <p className="font-medium text-slate-700">Duplicate Employee Handling</p>
        <p className="text-sm text-slate-500 mt-1">
          Choose what happens when an employee with the same email already exists.
        </p>
      </div>

      <RadioGroup
        value={value.employees}
        onValueChange={(val) => handleEmployeeChange(val as DuplicateHandlingMode)}
        disabled={disabled}
        className="space-y-3"
      >
        <div className="flex items-start gap-3">
          <RadioGroupItem value="skip" id="skip" className="mt-1" />
          <Label htmlFor="skip" className="cursor-pointer">
            <span className="font-medium text-slate-900">Skip duplicates</span>
            <p className="text-sm text-slate-500 font-normal">
              Existing employees will be kept unchanged. Only new employees will be added.
            </p>
          </Label>
        </div>

        <div className="flex items-start gap-3">
          <RadioGroupItem value="update" id="update" className="mt-1" />
          <Label htmlFor="update" className="cursor-pointer">
            <span className="font-medium text-slate-900">Update existing</span>
            <p className="text-sm text-slate-500 font-normal">
              Existing employees will be updated with new name, nationality, and passport data.
            </p>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
