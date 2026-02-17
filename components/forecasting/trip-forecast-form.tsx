'use client';

/**
 * Trip Forecast Calculator Form
 *
 * Allows users to test hypothetical trips before scheduling them.
 */

import { useState } from 'react';
import { parseISO, isBefore, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getSchengenCountries } from '@/lib/compliance';
import type { ForecastEmployee, WhatIfResult } from '@/types/forecast';

interface TripForecastFormProps {
  employees: ForecastEmployee[];
  onCalculate: (
    employeeId: string,
    startDate: string,
    endDate: string,
    country: string
  ) => Promise<WhatIfResult | null>;
  onResult: (result: WhatIfResult | null) => void;
}

export function TripForecastForm({
  employees,
  onCalculate,
  onResult,
}: TripForecastFormProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [country, setCountry] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schengenCountries = getSchengenCountries();
  const today = format(new Date(), 'yyyy-MM-dd');

  const validateForm = (): string | null => {
    if (!employeeId) {
      return 'Please select an employee';
    }
    if (!startDate) {
      return 'Please select a start date';
    }
    if (!endDate) {
      return 'Please select an end date';
    }
    if (!country) {
      return 'Please select a country';
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const todayDate = parseISO(today);

    if (isBefore(start, todayDate)) {
      return 'Start date must be in the future';
    }
    if (isBefore(end, start)) {
      return 'End date must be on or after start date';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsCalculating(true);

    try {
      const result = await onCalculate(employeeId, startDate, endDate, country);
      onResult(result);
    } catch {
      setError('We could not calculate this scenario. Check your dates and employee selection, then try again.');
      onResult(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleReset = () => {
    setEmployeeId('');
    setStartDate('');
    setEndDate('');
    setCountry('');
    setError(null);
    onResult(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Employee selector */}
        <div className="space-y-2">
          <Label htmlFor="employee">Employee</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger id="employee">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Country selector */}
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger id="country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {schengenCountries.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                  {c.isMicrostate && (
                    <span className="ml-1 text-xs text-slate-400">
                      (microstate)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start date */}
        <div className="space-y-2">
          <Label htmlFor="start-date">Entry Date</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {/* End date */}
        <div className="space-y-2">
          <Label htmlFor="end-date">Exit Date</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            min={startDate || today}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isCalculating}>
          {isCalculating ? 'Calculating...' : 'Check Compliance'}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Both entry and exit days count toward the 90-day Schengen limit.
      </p>
    </form>
  );
}
