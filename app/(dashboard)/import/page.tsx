import { FormatSelector } from '@/components/import/FormatSelector';

export const metadata = {
  title: 'Import',
  description: 'Import employee and trip data from CSV or Excel files',
}

export default function ImportPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <FormatSelector />
    </div>
  );
}
