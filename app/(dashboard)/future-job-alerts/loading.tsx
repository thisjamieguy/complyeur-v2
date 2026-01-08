/**
 * Loading skeleton for Future Job Alerts page.
 */

import { FutureAlertsLoading } from '@/components/forecasting/future-alerts-loading';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Future Job Alerts
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Review upcoming trips and their compliance status before scheduling.
        </p>
      </div>
      <FutureAlertsLoading />
    </div>
  );
}
