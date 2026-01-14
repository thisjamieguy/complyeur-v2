'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, Check, ChevronDown, Info, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
  MappingState,
  ColumnMapping,
  MappingConfidence,
  TargetField,
  ImportFormat,
} from '@/types/import';
import { getFieldMetadata } from '@/types/import';
import { updateMapping, validateMappingState, getAvailableTargetFields } from '@/lib/import/mapping';

// ============================================================
// TYPES
// ============================================================

interface ColumnMappingUIProps {
  mappingState: MappingState;
  onMappingChange: (newState: MappingState) => void;
  onConfirm: (saveMapping: boolean, mappingName?: string) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

// ============================================================
// CONFIDENCE BADGE
// ============================================================

function ConfidenceBadge({
  confidence,
  isRequired,
}: {
  confidence: MappingConfidence;
  isRequired: boolean;
}) {
  switch (confidence) {
    case 'auto':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Check className="h-3 w-3 mr-1" />
          Auto-detected
        </Badge>
      );
    case 'saved':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Save className="h-3 w-3 mr-1" />
          From saved
        </Badge>
      );
    case 'manual':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          Manual
        </Badge>
      );
    case 'skipped':
      return (
        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
          Skipped
        </Badge>
      );
    case 'unmapped':
    default:
      if (isRequired) {
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Required
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
          Not mapped
        </Badge>
      );
  }
}

// ============================================================
// SAMPLE DATA DISPLAY
// ============================================================

function SampleDataDisplay({ samples }: { samples: string[] }) {
  if (samples.length === 0) {
    return <span className="text-slate-400 italic">No data</span>;
  }

  return (
    <div className="space-y-1">
      {samples.slice(0, 3).map((sample, index) => (
        <div
          key={index}
          className="text-sm text-slate-600 truncate max-w-[200px]"
          title={sample}
        >
          {sample}
        </div>
      ))}
      {samples.length > 3 && (
        <div className="text-xs text-slate-400">+{samples.length - 3} more</div>
      )}
    </div>
  );
}

// ============================================================
// MAPPING ROW
// ============================================================

interface MappingRowProps {
  mapping: ColumnMapping;
  format: ImportFormat;
  allMappings: ColumnMapping[];
  requiredFields: string[];
  onTargetChange: (sourceColumn: string, targetField: TargetField | null) => void;
}

function MappingRow({
  mapping,
  format,
  allMappings,
  requiredFields,
  onTargetChange,
}: MappingRowProps) {
  const fieldMetadata = getFieldMetadata(format);
  const availableFields = getAvailableTargetFields(format, allMappings, mapping.sourceColumn);
  const isRequired =
    mapping.targetField !== null && requiredFields.includes(mapping.targetField);

  // Check if this is an unmapped required field situation
  const isUnmappedRequired =
    mapping.confidence === 'unmapped' &&
    availableFields.some((f) => requiredFields.includes(f));

  return (
    <tr className="border-b last:border-b-0">
      <td className="py-4 px-4">
        <div className="font-medium text-slate-900">{mapping.sourceColumn}</div>
      </td>
      <td className="py-4 px-4">
        <SampleDataDisplay samples={mapping.sampleValues} />
      </td>
      <td className="py-4 px-4">
        <Select
          value={mapping.targetField ?? 'skip'}
          onValueChange={(value) => {
            onTargetChange(
              mapping.sourceColumn,
              value === 'skip' ? null : (value as TargetField)
            );
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select field..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="skip">
              <span className="text-slate-500">Skip this column</span>
            </SelectItem>
            {mapping.targetField && !availableFields.includes(mapping.targetField) && (
              <SelectItem value={mapping.targetField}>
                {fieldMetadata.find((f) => f.field === mapping.targetField)?.label ??
                  mapping.targetField}
                {requiredFields.includes(mapping.targetField) && ' *'}
              </SelectItem>
            )}
            {availableFields.map((field) => {
              const meta = fieldMetadata.find((f) => f.field === field);
              return (
                <SelectItem key={field} value={field}>
                  {meta?.label ?? field}
                  {requiredFields.includes(field) && ' *'}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </td>
      <td className="py-4 px-4">
        <ConfidenceBadge
          confidence={mapping.confidence}
          isRequired={isRequired || isUnmappedRequired}
        />
      </td>
    </tr>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ColumnMappingUI({
  mappingState,
  onMappingChange,
  onConfirm,
  onCancel,
  isSaving = false,
}: ColumnMappingUIProps) {
  const [saveForFuture, setSaveForFuture] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [mappingName, setMappingName] = useState('');
  const [mappingNameError, setMappingNameError] = useState<string | null>(null);

  // Get required fields for this format
  const requiredFields = useMemo(() => {
    if (mappingState.format === 'employees') {
      return ['name'];
    }
    return ['employee_name', 'entry_date', 'exit_date', 'country'];
  }, [mappingState.format]);

  // Validate current state
  const validation = useMemo(
    () => validateMappingState(mappingState),
    [mappingState]
  );

  // Check for duplicate mappings
  const duplicateErrors = validation.errors.filter((e) => e.includes('Duplicate'));

  // Handle target field change
  const handleTargetChange = (sourceColumn: string, targetField: TargetField | null) => {
    const newState = updateMapping(mappingState, sourceColumn, targetField);
    onMappingChange(newState);
  };

  // Handle confirm button
  const handleConfirm = () => {
    if (saveForFuture) {
      setShowSaveDialog(true);
    } else {
      onConfirm(false);
    }
  };

  // Handle save dialog confirm
  const handleSaveConfirm = () => {
    if (!mappingName.trim()) {
      setMappingNameError('Please enter a name for this mapping');
      return;
    }
    if (mappingName.length > 100) {
      setMappingNameError('Name must be 100 characters or less');
      return;
    }
    setMappingNameError(null);
    setShowSaveDialog(false);
    onConfirm(true, mappingName.trim());
  };

  // Format label for display
  const formatLabel =
    mappingState.format === 'employees'
      ? 'Employees'
      : mappingState.format === 'trips'
        ? 'Trips'
        : 'Schedule/Gantt';

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Map Columns</h2>
          <p className="text-slate-500">
            Some columns in your file weren&apos;t recognized. Please map them to the
            correct ComplyEUR fields.
          </p>
        </div>

        {/* Validation Errors */}
        {duplicateErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {duplicateErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Missing Required Fields */}
        {mappingState.unmappedRequired.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Required fields still need to be mapped:{' '}
              <strong>{mappingState.unmappedRequired.join(', ')}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Mapping Table */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Column Mappings</CardTitle>
            <CardDescription>
              Importing as <strong>{formatLabel}</strong>. Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Source Column
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Sample Data
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Map To
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mappingState.mappings.map((mapping) => (
                    <MappingRow
                      key={mapping.sourceColumn}
                      mapping={mapping}
                      format={mappingState.format}
                      allMappings={mappingState.mappings}
                      requiredFields={requiredFields}
                      onTargetChange={handleTargetChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Save for Future Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="save-mapping"
            checked={saveForFuture}
            onCheckedChange={(checked) => setSaveForFuture(checked === true)}
          />
          <Label
            htmlFor="save-mapping"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Save this mapping for future imports
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-slate-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                When you upload files with the same column names in the future, this mapping
                will be applied automatically.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!validation.isValid || isSaving}
          >
            {isSaving ? 'Processing...' : 'Continue to Preview'}
          </Button>
        </div>

        {/* Save Mapping Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Column Mapping</DialogTitle>
              <DialogDescription>
                Give this mapping a name so you can identify it later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mapping-name">Mapping Name</Label>
                <Input
                  id="mapping-name"
                  placeholder="e.g., HR System Export, Travel Tracker Format"
                  value={mappingName}
                  onChange={(e) => {
                    setMappingName(e.target.value);
                    setMappingNameError(null);
                  }}
                  className={mappingNameError ? 'border-red-500' : ''}
                />
                {mappingNameError && (
                  <p className="text-sm text-red-600">{mappingNameError}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveConfirm}>Save & Continue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
