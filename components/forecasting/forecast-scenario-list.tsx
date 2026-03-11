'use client';

/**
 * Forecast Scenario List Component
 *
 * Renders a list of multi-trip scenario results with remove buttons
 * and a summary bar showing worst risk level and total days.
 */

import { useState, useMemo } from 'react';
import { X, Save, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ForecastResultCard } from './forecast-result-card';
import { ForecastRiskBadge } from './forecast-risk-badge';
import { getSchengenCountries } from '@/lib/compliance';
import type {
  ForecastResult,
  ScenarioTripConflict,
  ScenarioTripEntry,
  ForecastRiskLevel,
} from '@/types/forecast';

interface ForecastScenarioListProps {
  scenarios: ScenarioTripEntry[];
  results: ForecastResult[];
  onRemoveTrip: (key: string) => void;
  onClearAll: () => void;
  onSaveTrip: (key: string) => void;
  onSaveAll: () => void;
  onEditTrip: (key: string, updates: { startDate: string; endDate: string; country: string }) => void;
  savingKeys: Set<string>;
  pendingConflict: ScenarioTripConflict | null;
  onReplaceConflictTrip: () => void;
  onDismissConflictDialog: () => void;
}

const RISK_SEVERITY: Record<ForecastRiskLevel, number> = {
  green: 0,
  yellow: 1,
  red: 2,
};

export function ForecastScenarioList({
  scenarios,
  results,
  onRemoveTrip,
  onClearAll,
  onSaveTrip,
  onSaveAll,
  onEditTrip,
  savingKeys,
  pendingConflict,
  onReplaceConflictTrip,
  onDismissConflictDialog,
}: ForecastScenarioListProps) {
  const isSavingAny = savingKeys.size > 0;
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editCountry, setEditCountry] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const schengenCountries = useMemo(() => getSchengenCountries(), []);

  if (scenarios.length === 0) return null;

  const editingScenario = editingKey
    ? scenarios.find((s) => s.key === editingKey)
    : null;
  const conflictScenario = pendingConflict
    ? scenarios.find((s) => s.key === pendingConflict.scenarioKey)
    : null;
  const isReplacingConflict = pendingConflict
    ? savingKeys.has(pendingConflict.scenarioKey)
    : false;

  function openEdit(scenario: ScenarioTripEntry) {
    setEditCountry(scenario.input.country);
    setEditStartDate(scenario.input.startDate);
    setEditEndDate(scenario.input.endDate);
    setEditingKey(scenario.key);
  }

  function handleEditSave() {
    if (!editingKey || !editCountry || !editStartDate || !editEndDate) return;
    onEditTrip(editingKey, {
      startDate: editStartDate,
      endDate: editEndDate,
      country: editCountry,
    });
    setEditingKey(null);
  }

  function handleConflictEdit() {
    if (conflictScenario) {
      openEdit(conflictScenario);
    }
    onDismissConflictDialog();
  }

  // Determine worst risk across all results
  const worstRisk = results.reduce<ForecastRiskLevel>((worst, r) => {
    return RISK_SEVERITY[r.riskLevel] > RISK_SEVERITY[worst]
      ? r.riskLevel
      : worst;
  }, 'green');

  // Get days after the final trip (last result chronologically)
  const lastResult = results[results.length - 1];
  const totalDaysAfterFinal = lastResult?.daysAfterTrip ?? 0;

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-900">
            {scenarios.length} {scenarios.length === 1 ? 'trip' : 'trips'} planned
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Overall:</span>
            <ForecastRiskBadge riskLevel={worstRisk} />
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="text-sm text-slate-600">
            {totalDaysAfterFinal}/90 days after final trip
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onSaveAll}
            disabled={isSavingAny}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {isSavingAny ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save All Trips
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            disabled={isSavingAny}
            className="text-slate-600"
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Result cards */}
      {scenarios.map((scenario, index) => {
        const result = results[index];
        if (!result) return null;
        const isSaving = savingKeys.has(scenario.key);
        const borderColor = result.isCompliant ? 'border-green-200' : 'border-red-200';

        return (
          <div
            key={scenario.key}
            className={`relative rounded-xl border ${borderColor} bg-white shadow-sm overflow-hidden`}
          >
            <button
              onClick={() => onRemoveTrip(scenario.key)}
              disabled={isSaving}
              className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              aria-label={`Remove trip to ${scenario.countryName}`}
            >
              <X className="h-4 w-4" />
            </button>
            <ForecastResultCard result={result} className="border-0 shadow-none rounded-none" />
            <div className="flex justify-end gap-2 px-6 pb-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEdit(scenario)}
                disabled={isSaving}
                className="text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSaveTrip(scenario.key)}
                disabled={isSaving}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save Trip
              </Button>
            </div>
          </div>
        );
      })}

      {/* Edit dialog */}
      <Dialog open={editingKey !== null} onOpenChange={(open) => !open && setEditingKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Trip{editingScenario ? ` to ${editingScenario.countryName}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-country">Country</Label>
              <Select value={editCountry} onValueChange={setEditCountry}>
                <SelectTrigger id="edit-country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {schengenCountries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-date">Entry Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-date">Exit Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingKey(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEditSave}
                disabled={!editCountry || !editStartDate || !editEndDate}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingConflict !== null}
        onOpenChange={(open) => {
          if (!open) {
            onDismissConflictDialog();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trip overlap detected</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingConflict?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-sm text-slate-600">
            You can edit the forecasted trip or replace the existing trip entirely.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConflictEdit}>
              Edit trip
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onReplaceConflictTrip}
              disabled={!conflictScenario || isReplacingConflict}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isReplacingConflict ? 'Replacing...' : 'Replace trip entirely'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
