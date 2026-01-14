'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  ValidatedRow,
  ParsedRow,
  ImportFormat,
  isParsedEmployeeRow,
  isParsedTripRow,
} from '@/types/import';

interface ValidationTableProps {
  rows: ValidatedRow<ParsedRow>[];
  format: ImportFormat;
  showOnlyErrors?: boolean;
}

export function ValidationTable({
  rows,
  format,
  showOnlyErrors = false,
}: ValidationTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const filteredRows = showOnlyErrors
    ? rows.filter((r) => !r.is_valid || r.warnings.length > 0)
    : rows;

  const displayRows = showAll ? filteredRows : filteredRows.slice(0, 20);
  const hasMore = filteredRows.length > 20;

  const toggleRow = (rowNum: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowNum)) {
      newExpanded.delete(rowNum);
    } else {
      newExpanded.add(rowNum);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusIcon = (row: ValidatedRow<ParsedRow>) => {
    if (!row.is_valid) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (row.warnings.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  };

  const getRowData = (row: ValidatedRow<ParsedRow>) => {
    const data = row.data;
    if (format === 'employees' && isParsedEmployeeRow(data)) {
      return [data.first_name, data.last_name, data.email];
    }
    if ((format === 'trips' || format === 'gantt') && isParsedTripRow(data)) {
      return [data.employee_email, data.entry_date, data.exit_date, data.country];
    }
    return [];
  };

  const getHeaders = () => {
    if (format === 'employees') {
      return ['First Name', 'Last Name', 'Email'];
    }
    return ['Employee Email', 'Entry Date', 'Exit Date', 'Country'];
  };

  if (filteredRows.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        {showOnlyErrors ? 'No errors or warnings found.' : 'No data to display.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-12">Row</TableHead>
              <TableHead className="w-12">Status</TableHead>
              {getHeaders().map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row) => {
              const isExpanded = expandedRows.has(row.row_number);
              const hasIssues = row.errors.length > 0 || row.warnings.length > 0;

              return (
                <>
                  <TableRow
                    key={row.row_number}
                    className={`
                      ${!row.is_valid ? 'bg-red-50' : row.warnings.length > 0 ? 'bg-amber-50' : ''}
                      ${hasIssues ? 'cursor-pointer hover:bg-slate-50' : ''}
                    `}
                    onClick={() => hasIssues && toggleRow(row.row_number)}
                  >
                    <TableCell className="font-mono text-sm text-slate-500">
                      {row.row_number}
                    </TableCell>
                    <TableCell>{getStatusIcon(row)}</TableCell>
                    {getRowData(row).map((value, idx) => (
                      <TableCell key={idx} className="max-w-[200px] truncate">
                        {value || <span className="text-slate-400 italic">Empty</span>}
                      </TableCell>
                    ))}
                    <TableCell>
                      {hasIssues && (
                        <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {isExpanded && hasIssues && (
                    <TableRow key={`${row.row_number}-details`}>
                      <TableCell colSpan={getHeaders().length + 3} className="bg-slate-50 py-3">
                        <div className="space-y-2 px-4">
                          {row.errors.map((error, idx) => (
                            <div
                              key={`error-${idx}`}
                              className="flex items-start gap-2 text-sm text-red-600"
                            >
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>
                                <span className="font-medium">{error.column}:</span> {error.message}
                                {error.value && (
                                  <span className="text-red-400 ml-1">
                                    (value: &quot;{error.value}&quot;)
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                          {row.warnings.map((warning, idx) => (
                            <div
                              key={`warning-${idx}`}
                              className="flex items-start gap-2 text-sm text-amber-600"
                            >
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>
                                <span className="font-medium">{warning.column}:</span>{' '}
                                {warning.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show Less' : `Show All (${filteredRows.length} rows)`}
          </Button>
        </div>
      )}
    </div>
  );
}
