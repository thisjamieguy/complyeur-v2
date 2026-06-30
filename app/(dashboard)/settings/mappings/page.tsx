import { Suspense } from 'react';
import { loadSavedMappings } from '@/app/(dashboard)/import/actions';
import { MappingsList } from './mappings-list';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsSectionHeader } from '@/components/settings/settings-section-header';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Column Mappings',
  description: 'Manage your saved column mappings for data imports',
};

async function MappingsContent() {
  const mappings = await loadSavedMappings();

  return <MappingsList initialMappings={mappings} />;
}

export default function MappingsSettingsPage() {
  return (
    <div className="space-y-8">
      <SettingsSectionHeader
        eyebrow="Data & privacy"
        title="Column mappings"
        description="Saved column mappings are automatically applied when you upload files with matching column names."
      />

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
