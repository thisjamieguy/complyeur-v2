'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plane, Calendar, Download, ArrowRight, Loader2 } from 'lucide-react';
import { FORMAT_OPTIONS, ImportFormat } from '@/types/import';

const ICONS = {
  users: Users,
  plane: Plane,
  calendar: Calendar,
} as const;

export function FormatSelector() {
  const router = useRouter();
  const [selectedFormat, setSelectedFormat] = useState<ImportFormat | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSelect = (format: ImportFormat) => {
    if (format === 'gantt') return; // Disabled for now
    setSelectedFormat(format);
  };

  const handleContinue = () => {
    if (!selectedFormat) return;
    setIsNavigating(true);
    router.push(`/import/upload?format=${selectedFormat}`);
  };

  const handleDownloadTemplate = (e: React.MouseEvent, templateUrl: string) => {
    e.stopPropagation();
    window.open(templateUrl, '_blank');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Import Data</h1>
        <p className="mt-2 text-slate-500">
          Select the format that matches your data file, then download the template.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {FORMAT_OPTIONS.map((format) => {
          const Icon = ICONS[format.icon];
          const isSelected = selectedFormat === format.id;
          const isDisabled = format.id === 'gantt';

          return (
            <Card
              key={format.id}
              className={`
                relative cursor-pointer transition-all duration-150
                ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-600/20'
                    : 'border-slate-200 hover:border-slate-300'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => handleSelect(format.id)}
            >
              {isDisabled && (
                <div className="absolute top-3 right-3">
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                </div>
              )}

              <CardHeader className="pb-4">
                <div
                  className={`
                  w-12 h-12 rounded-xl flex items-center justify-center mb-4
                  ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}
                `}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{format.title}</CardTitle>
                <CardDescription className="text-slate-500">{format.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Required columns:</p>
                  <div className="flex flex-wrap gap-1">
                    {format.columns.map((col) => (
                      <span
                        key={col}
                        className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => handleDownloadTemplate(e, format.templateUrl)}
                  disabled={isDisabled}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!selectedFormat || isNavigating}
          className="min-w-[200px]"
        >
          {isNavigating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
