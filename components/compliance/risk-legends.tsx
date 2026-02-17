import { Badge } from '@/components/ui/badge'

export function DashboardStatusLegend() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Status legend
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">Compliant</Badge>
        <Badge className="bg-amber-100 text-amber-800 border-amber-400 hover:bg-amber-100">At Risk</Badge>
        <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100">Non-Compliant</Badge>
        <Badge className="bg-brand-800 text-white border-brand-800 hover:bg-brand-800">Breach</Badge>
        <Badge className="bg-brand-100 text-brand-800 border-brand-300 hover:bg-brand-100">Exempt</Badge>
      </div>
    </div>
  )
}

export function ForecastRiskLegend() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Forecast risk guide
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">Safe: comfortably within 90 days</Badge>
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">At Risk: close to limit</Badge>
        <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Over Limit: exceeds 90 days</Badge>
      </div>
    </div>
  )
}

export function TripTypeLegend() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Trip legend
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-blue-600 text-white hover:bg-blue-600">Schengen</Badge>
        <Badge variant="secondary">EU (non-Schengen)</Badge>
        <Badge variant="outline">Non-Schengen</Badge>
        <Badge variant="secondary">Private trip (destination hidden)</Badge>
        <Badge variant="outline">Excluded from compliance</Badge>
      </div>
    </div>
  )
}
