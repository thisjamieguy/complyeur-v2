'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, FileSpreadsheet, Calendar, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { EmptyState } from '@/components/ui/empty-state';
import type { SavedColumnMapping } from '@/types/import';
import { deleteColumnMapping } from '@/app/(dashboard)/import/actions';
import { showSuccess, showError } from '@/lib/toast';

interface MappingsListProps {
  initialMappings: SavedColumnMapping[];
}

export function MappingsList({ initialMappings }: MappingsListProps) {
  const [mappings, setMappings] = useState(initialMappings);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);

    try {
      const success = await deleteColumnMapping(deleteId);

      if (success) {
        setMappings((prev) => prev.filter((m) => m.id !== deleteId));
        showSuccess('Mapping Deleted', 'The column mapping has been deleted.');
      } else {
        showError('Delete Failed', 'Failed to delete the mapping. Please try again.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showError('Delete Failed', 'An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const formatBadge = (format: string) => {
    switch (format) {
      case 'employees':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Employees
          </Badge>
        );
      case 'trips':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Trips
          </Badge>
        );
      case 'gantt':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Schedule/Gantt
          </Badge>
        );
      default:
        return <Badge variant="outline">{format}</Badge>;
    }
  };

  if (mappings.length === 0) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="No saved mappings"
        description="When you import files with custom column names and save the mapping, they'll appear here. Saved mappings are automatically applied to future imports with matching columns."
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {mappings.map((mapping) => (
          <Card key={mapping.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-900">{mapping.name}</h3>
                    {formatBadge(mapping.format)}
                  </div>

                  {mapping.description && (
                    <p className="text-sm text-slate-600">{mapping.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Hash className="h-4 w-4" />
                      <span>
                        {Object.keys(mapping.mappings).length} column
                        {Object.keys(mapping.mappings).length !== 1 ? 's' : ''} mapped
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {mapping.last_used_at
                          ? `Used ${formatDistanceToNow(new Date(mapping.last_used_at), {
                              addSuffix: true,
                            })}`
                          : 'Never used'}
                      </span>
                    </div>

                    {mapping.times_used > 0 && (
                      <span className="text-slate-400">
                        {mapping.times_used} time{mapping.times_used !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Show mapped columns preview */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(mapping.mappings)
                      .slice(0, 5)
                      .map(([source, target]) => (
                        <span
                          key={source}
                          className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded"
                          title={`${source} → ${target}`}
                        >
                          {source} → {target}
                        </span>
                      ))}
                    {Object.keys(mapping.mappings).length > 5 && (
                      <span className="text-xs text-slate-400">
                        +{Object.keys(mapping.mappings).length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setDeleteId(mapping.id)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column Mapping?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this saved column mapping. Future imports will need to
              be mapped manually again if they use the same column names.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
