import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getImportSessionsPaginated } from '../../import/actions';
import { ImportHistoryList } from './import-history-list';

export const metadata: Metadata = {
  title: 'Import History | ComplyEur',
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
  const page = Math.max(1, parseInt(params.page ?? '1', 10));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-100 rounded-lg">
              <History className="h-5 w-5 text-slate-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Import History</h1>
          </div>
          <p className="text-slate-500">
            View your past import sessions and their results.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Link>
        </Button>
      </div>

      {/* History List */}
      <Suspense fallback={<LoadingSkeleton />}>
        <ImportHistoryContent page={page} />
      </Suspense>
    </div>
  );
}
