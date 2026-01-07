/**
 * Empty State Component for Future Alerts
 *
 * Displayed when there are no future trips scheduled.
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function FutureAlertsEmpty() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto max-w-md">
        <div className="mb-4 text-4xl">📅</div>
        <h3 className="text-lg font-semibold text-slate-900">
          No future trips scheduled
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          When you add trips with future dates, they&apos;ll appear here with
          compliance forecasts to help you plan ahead.
        </p>
        <div className="mt-6">
          <Link href="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
