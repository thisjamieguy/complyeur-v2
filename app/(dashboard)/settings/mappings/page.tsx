import { Suspense } from 'react';
import { loadSavedMappings } from '@/app/(dashboard)/import/actions';
import { MappingsList } from './mappings-list';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Column Mappings | Settings | ComplyEur',
  description: 'Manage your saved column mappings for data imports',
};

async function MappingsContent() {
  const mappings = await loadSavedMappings();

  return <MappingsList initialMappings={mappings} />;
}

export default function MappingsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Column Mappings</h1>
        <p className="text-slate-600 mt-1">
          Manage saved column mappings for your data imports. Saved mappings are automatically
          applied when you upload files with matching column names.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        }
      >
        <MappingsContent />
      </Suspense>
    </div>
  );
}
