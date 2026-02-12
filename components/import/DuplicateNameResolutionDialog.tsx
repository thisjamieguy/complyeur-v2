'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { EmployeeNameConflictMode } from '@/types/import';

export interface DuplicateNameGroup {
  name: string;
  rows: number[];
}

interface DuplicateNameResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateGroups: DuplicateNameGroup[];
  value: EmployeeNameConflictMode;
  onValueChange: (value: EmployeeNameConflictMode) => void;
}

export function DuplicateNameResolutionDialog({
  open,
  onOpenChange,
  duplicateGroups,
  value,
  onValueChange,
}: DuplicateNameResolutionDialogProps) {
  const duplicateRows = duplicateGroups.reduce((total, group) => total + group.rows.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Resolve Duplicate Employee Names</DialogTitle>
          <DialogDescription>
            Found {duplicateGroups.length} duplicate name group
            {duplicateGroups.length !== 1 ? 's' : ''} across {duplicateRows} rows.
            Choose how this import should handle duplicate names.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup
            value={value}
            onValueChange={(next) => onValueChange(next as EmployeeNameConflictMode)}
            className="space-y-3"
          >
            <Label
              htmlFor="name-conflicts-new"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50"
            >
              <RadioGroupItem id="name-conflicts-new" value="new_employee" className="mt-0.5" />
              <span>
                <span className="font-medium text-slate-900">Keep as new employees</span>
                <span className="block text-sm text-slate-600">
                  Duplicate names are imported as separate employees.
                </span>
              </span>
            </Label>

            <Label
              htmlFor="name-conflicts-same"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50"
            >
              <RadioGroupItem id="name-conflicts-same" value="same_employee" className="mt-0.5" />
              <span>
                <span className="font-medium text-slate-900">Treat as same employee</span>
                <span className="block text-sm text-slate-600">
                  Keep first row for each duplicate name and skip later rows.
                </span>
              </span>
            </Label>

            <Label
              htmlFor="name-conflicts-rename"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50"
            >
              <RadioGroupItem id="name-conflicts-rename" value="rename" className="mt-0.5" />
              <span>
                <span className="font-medium text-slate-900">Auto-rename duplicates</span>
                <span className="block text-sm text-slate-600">
                  Keep all rows and append a numeric suffix (for example: Jane Doe (2)).
                </span>
              </span>
            </Label>
          </RadioGroup>

          <div className="rounded-lg border bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700">Duplicate names detected</p>
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {duplicateGroups.map((group) => (
                <p key={group.name} className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{group.name}</span> (rows{' '}
                  {group.rows.join(', ')})
                </p>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
