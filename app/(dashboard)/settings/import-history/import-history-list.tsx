'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  Plane,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ImportSession } from '@/types/import';

interface ImportHistoryListProps {
  sessions: ImportSession[];
  currentPage: number;
  totalPages: number;
  total: number;
}

const FORMAT_ICONS = {
  employees: Users,
  trips: Plane,
  gantt: Calendar,
} as const;

const FORMAT_LABELS = {
  employees: 'Employees',
  trips: 'Trips',
  gantt: 'Schedule',
} as const;

export function ImportHistoryList({
  sessions,
  currentPage,
  totalPages,
  total,
}: ImportHistoryListProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-xl">
        <FileSpreadsheet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No import history</h3>
        <p className="text-slate-500 mb-6">
          You haven&apos;t completed any imports yet.
        </p>
        <Button asChild>
          <Link href="/import">Start an Import</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sessions List */}
      <div className="space-y-3">
        {sessions.map((session) => {
          const FormatIcon = FORMAT_ICONS[session.format] || FileSpreadsheet;
          const isSuccess = session.status === 'completed';
          const importedCount =
            session.result?.employees_created ??
            session.result?.trips_created ??
            session.valid_rows ??
            0;

          return (
            <div
              key={session.id}
              className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
            >
              {/* Format Icon */}
              <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                <FormatIcon className="h-5 w-5 text-slate-600" />
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-slate-900 truncate">
                    {session.file_name}
                  </p>
                  <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                    {FORMAT_LABELS[session.format]}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {format(new Date(session.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                </p>
              </div>

              {/* Import Stats */}
              <div className="text-right flex-shrink-0">
                <p className="font-medium text-slate-900">
                  {importedCount} imported
                </p>
                <p className="text-sm text-slate-500">
                  of {session.total_rows} rows
                </p>
              </div>

              {/* Status */}
              <div className="flex-shrink-0">
                {isSuccess ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Success</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Failed</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-slate-500">
            Showing {(currentPage - 1) * 20 + 1}–
            {Math.min(currentPage * 20, total)} of {total} imports
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              asChild={currentPage > 1}
            >
              {currentPage > 1 ? (
                <Link href={`/settings/import-history?page=${currentPage - 1}`}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Link>
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </>
              )}
            </Button>
            <span className="text-sm text-slate-600 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              asChild={currentPage < totalPages}
            >
              {currentPage < totalPages ? (
                <Link href={`/settings/import-history?page=${currentPage + 1}`}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
