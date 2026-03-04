import { FormatSelector } from '@/components/import/FormatSelector';
import { getCompanyEntitlements } from '@/lib/billing/entitlements';

export const metadata = {
  title: 'Import',
  description: 'Import employee and trip data from CSV or Excel files',
}

export default async function ImportPage() {
  const entitlements = await getCompanyEntitlements();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <FormatSelector maxEmployees={entitlements?.max_employees ?? null} />
    </div>
  );
}
