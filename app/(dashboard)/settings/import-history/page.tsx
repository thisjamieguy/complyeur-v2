import { Suspense } from 'react';
import { Metadata } from 'next';
import { getImportSessionsPaginated } from '../../import/actions';
import { ImportHistoryList } from './import-history-list';
import { SettingsSectionHeader } from '@/components/settings/settings-section-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Import History',
  description: 'View your past import sessions and results',
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

async function ImportHistoryContent({ page }: { page: number }) {
  const result = await getImportSessionsPaginated(page, 20);

  return (
    <ImportHistoryList
      sessions={result.sessions}
      currentPage={result.page}
      totalPages={result.totalPages}
      total={result.total}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-20 bg-slate-100 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

export default async function ImportHistoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const parsedPage = Number.parseInt(params.page ?? '1', 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;

  return (
    <div className="space-y-8">
      <SettingsSectionHeader
        eyebrow="Data & privacy"
        title="Import history"
        description="Review your past import sessions, their outcomes, and any follow-up issues."
      />

      {/* History List */}
      <Suspense fallback={<LoadingSkeleton />}>
        <ImportHistoryContent page={page} />
      </Suspense>
    </div>
  );
}
