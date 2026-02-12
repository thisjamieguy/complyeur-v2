'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plane, Calendar, Download, ArrowRight, Loader2 } from 'lucide-react';
import { FORMAT_OPTIONS, ImportFormat } from '@/types/import';
import { StepIndicator } from './StepIndicator';
import { FirstTimeGuide } from './FirstTimeGuide';

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
    setSelectedFormat(format);
  };

  const handleContinue = () => {
    if (!selectedFormat) return;
    setIsNavigating(true);
    router.push(`/import/upload?format=${selectedFormat}`);
  };

  const handleDownloadTemplate = (e: React.MouseEvent, templateUrl: string) => {
    e.stopPropagation();
    const filename = templateUrl.split('/').pop() || 'template.csv';
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-8">
      <StepIndicator currentStep={1} />

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Import Data</h1>
        <p className="mt-2 text-slate-500">
          Select the format that matches your data file, then download the template.
        </p>
      </div>

      <FirstTimeGuide />

      <div className="grid gap-8 md:grid-cols-3">
        {FORMAT_OPTIONS.map((format) => {
          const Icon = ICONS[format.icon];
          const isSelected = selectedFormat === format.id;

          return (
            <Card
              key={format.id}
              className={`
                relative cursor-pointer transition-all duration-150
                ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-600/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }
              `}
              onClick={() => handleSelect(format.id)}
            >
              <CardHeader className="pb-4">
                <div
                  className={`
                  w-10 h-10 rounded-xl flex items-center justify-center mb-4
                  ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}
                `}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">{format.title}</CardTitle>
                <CardDescription className="text-slate-500">{format.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-xs text-slate-400">
                  Columns: {format.columns.join(', ')}
                </p>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-600 hover:text-slate-900"
                  onClick={(e) => handleDownloadTemplate(e, format.templateUrl)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Template
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
