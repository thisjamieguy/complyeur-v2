'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { ValidatedRow, ParsedRow, isParsedTripRow } from '@/types/import';

interface WarningSummaryBannersProps {
  rows: ValidatedRow<ParsedRow>[];
}

interface GroupedWarning {
  pattern: string;
  message: string;
  countries: Set<string>;
  affectedRows: {
    rowNumber: number;
    employeeName: string;
    country: string;
    entryDate: string;
    exitDate: string;
  }[];
}

// Extract the base pattern from a warning message (removes specific values)
function getWarningPattern(message: string): string {
  // Pattern for non-Schengen country warnings
  if (message.includes('is not a Schengen country')) {
    return 'non-schengen';
  }
  // Add more patterns as needed
  return message;
}

// Extract country code from non-Schengen warning message
function extractCountryFromMessage(message: string): string | null {
  const match = message.match(/^([A-Z]{2,3})\s+is not a Schengen country/);
  return match ? match[1] : null;
}

export function WarningSummaryBanners({ rows }: WarningSummaryBannersProps) {
  const [expandedPatterns, setExpandedPatterns] = useState<Set<string>>(new Set());

  // Group warnings by pattern
  const groupedWarnings = new Map<string, GroupedWarning>();

  rows.forEach((row) => {
    row.warnings.forEach((warning) => {
      const pattern = getWarningPattern(warning.message);

      if (!groupedWarnings.has(pattern)) {
        groupedWarnings.set(pattern, {
          pattern,
          message: warning.message,
          countries: new Set(),
          affectedRows: [],
        });
      }

      const group = groupedWarnings.get(pattern)!;

      // Extract country for non-Schengen warnings
      if (pattern === 'non-schengen') {
        const country = extractCountryFromMessage(warning.message);
        if (country) {
          group.countries.add(country);
        }
      }

      // Add row info
      if (isParsedTripRow(row.data)) {
        group.affectedRows.push({
          rowNumber: row.row_number,
          employeeName: row.data.employee_name ?? '',
          country: row.data.country,
          entryDate: row.data.entry_date,
          exitDate: row.data.exit_date,
        });
      }
    });
  });

  // Convert to array and filter out empty groups
  const warningGroups = Array.from(groupedWarnings.values()).filter(
    (g) => g.affectedRows.length > 0
  );

  if (warningGroups.length === 0) {
    return null;
  }

  const togglePattern = (pattern: string) => {
    const newExpanded = new Set(expandedPatterns);
    if (newExpanded.has(pattern)) {
      newExpanded.delete(pattern);
    } else {
      newExpanded.add(pattern);
    }
    setExpandedPatterns(newExpanded);
  };

  return (
    <div className="space-y-3">
      {warningGroups.map((group) => {
        const isExpanded = expandedPatterns.has(group.pattern);
        const tripCount = group.affectedRows.length;
        const countriesList = Array.from(group.countries).sort().join(', ');

        return (
          <div
            key={group.pattern}
            className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50"
          >
            <button
              onClick={() => togglePattern(group.pattern)}
              className="w-full flex items-start gap-3 p-4 text-left hover:bg-amber-100/50 transition-colors"
            >
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {group.pattern === 'non-schengen' ? (
                  <>
                    <p className="font-medium text-amber-800">
                      {tripCount} trip{tripCount !== 1 ? 's' : ''} to non-Schengen{' '}
                      {group.countries.size === 1 ? 'country' : 'countries'} ({countriesList})
                    </p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      These trips will be recorded but won&apos;t count toward the 90/180 rule.
                    </p>
                  </>
                ) : (
                  <p className="font-medium text-amber-800">
                    {tripCount} row{tripCount !== 1 ? 's' : ''} with warnings
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 text-amber-600">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-amber-200 bg-amber-50/50 px-4 py-3">
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {group.affectedRows.map((row, idx) => (
                    <div
                      key={`${row.rowNumber}-${idx}`}
                      className="flex items-center gap-2 text-sm text-amber-700"
                    >
                      <span className="font-mono text-amber-500 w-12">
                        Row {row.rowNumber}
                      </span>
                      <span className="truncate">
                        {row.employeeName && <span className="font-medium">{row.employeeName}</span>}
                        {row.employeeName && ' → '}
                        <span className="font-medium">{row.country}</span>
                        {' '}
                        <span className="text-amber-600/70">
                          ({row.entryDate}
                          {row.entryDate !== row.exitDate && ` to ${row.exitDate}`})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
