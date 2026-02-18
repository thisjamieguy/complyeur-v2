'use client';

import { useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { ValidationSummary as ValidationSummaryType } from '@/types/import';

interface ValidationSummaryProps {
  summary: ValidationSummaryType;
}

export function ValidationSummary({ summary }: ValidationSummaryProps) {
  const cards = useMemo(() => [
    {
      label: 'Total Rows',
      value: summary.total,
      icon: FileSpreadsheet,
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-600',
      iconColor: 'text-slate-500',
    },
    {
      label: 'Valid',
      value: summary.valid,
      icon: CheckCircle2,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      iconColor: 'text-green-500',
    },
    {
      label: 'Errors',
      value: summary.errors,
      icon: AlertCircle,
      bgColor: summary.errors > 0 ? 'bg-red-50' : 'bg-slate-50',
      textColor: summary.errors > 0 ? 'text-red-700' : 'text-slate-600',
      iconColor: summary.errors > 0 ? 'text-red-500' : 'text-slate-400',
    },
    {
      label: 'Warnings',
      value: summary.warnings,
      icon: AlertTriangle,
      bgColor: summary.warnings > 0 ? 'bg-amber-50' : 'bg-slate-50',
      textColor: summary.warnings > 0 ? 'text-amber-700' : 'text-slate-600',
      iconColor: summary.warnings > 0 ? 'text-amber-500' : 'text-slate-400',
    },
  ], [summary.total, summary.valid, summary.errors, summary.warnings]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`${card.bgColor} rounded-xl p-4 flex items-center gap-3`}
          >
            <div className={`${card.iconColor}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
              <p className="text-sm text-slate-500">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
