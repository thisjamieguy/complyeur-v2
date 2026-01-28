'use client'

import { cn } from '@/lib/utils'

// Inline SVG illustrations for each feature - styled to match brand
function TeamIllustration({ className }: { className?: string }) {
  return (
    <svg className={cn('w-full h-full', className)} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Central person - highlighted */}
      <circle cx="40" cy="28" r="10" className="fill-brand-500" />
      <path d="M24 56c0-8.837 7.163-16 16-16s16 7.163 16 16" className="stroke-brand-500" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Left person - faded */}
      <circle cx="18" cy="32" r="7" className="fill-brand-200" />
      <path d="M6 52c0-6.627 5.373-12 12-12s12 5.373 12 12" className="stroke-brand-200" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Right person - faded */}
      <circle cx="62" cy="32" r="7" className="fill-brand-200" />
      <path d="M50 52c0-6.627 5.373-12 12-12s12 5.373 12 12" className="stroke-brand-200" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Status indicators */}
      <circle cx="48" cy="22" r="4" className="fill-emerald-500" />
      <path d="M46 22l1.5 1.5 3-3" className="stroke-white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalculatorIllustration({ className }: { className?: string }) {
  return (
    <svg className={cn('w-full h-full', className)} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Spreadsheet chaos (crossed out) */}
      <rect x="8" y="16" width="28" height="32" rx="2" className="fill-slate-100 stroke-slate-300" strokeWidth="1" />
      <line x1="8" y1="24" x2="36" y2="24" className="stroke-slate-300" />
      <line x1="8" y1="32" x2="36" y2="32" className="stroke-slate-300" />
      <line x1="8" y1="40" x2="36" y2="40" className="stroke-slate-300" />
      <line x1="20" y1="16" x2="20" y2="48" className="stroke-slate-300" />
      {/* Red X over spreadsheet */}
      <line x1="12" y1="20" x2="32" y2="44" className="stroke-red-400" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="20" x2="12" y2="44" className="stroke-red-400" strokeWidth="2" strokeLinecap="round" />
      {/* Arrow */}
      <path d="M40 32h8" className="stroke-brand-400" strokeWidth="2" strokeLinecap="round" />
      <path d="M46 28l4 4-4 4" className="stroke-brand-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Clean result */}
      <rect x="52" y="20" width="24" height="24" rx="4" className="fill-brand-500" />
      <text x="64" y="36" textAnchor="middle" className="fill-white text-[11px] font-bold">47</text>
      <text x="64" y="40" textAnchor="middle" className="fill-brand-200 text-[5px]">days left</text>
    </svg>
  )
}

function AlertIllustration({ className }: { className?: string }) {
  return (
    <svg className={cn('w-full h-full', className)} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Timeline bar */}
      <rect x="8" y="36" width="64" height="8" rx="4" className="fill-slate-100" />
      {/* Progress (safe zone) */}
      <rect x="8" y="36" width="32" height="8" rx="4" className="fill-emerald-400" />
      {/* Warning zone */}
      <rect x="40" y="36" width="16" height="8" className="fill-amber-400" />
      {/* Danger zone */}
      <rect x="56" y="36" width="16" height="8" rx="4" className="fill-red-400" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }} />
      {/* Alert marker at 70 days */}
      <circle cx="44" cy="40" r="3" className="fill-amber-500 stroke-white" strokeWidth="2" />
      {/* Alert notification */}
      <rect x="32" y="14" width="28" height="16" rx="3" className="fill-white" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
      <rect x="32" y="14" width="28" height="16" rx="3" className="stroke-amber-400" strokeWidth="1.5" fill="none" />
      <circle cx="38" cy="22" r="2" className="fill-amber-400" />
      <line x1="43" y1="20" x2="55" y2="20" className="stroke-slate-400" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="43" y1="24" x2="52" y2="24" className="stroke-slate-300" strokeWidth="1.5" strokeLinecap="round" />
      {/* Labels */}
      <text x="24" y="56" textAnchor="middle" className="fill-emerald-600 text-[7px] font-medium">Safe</text>
      <text x="48" y="56" textAnchor="middle" className="fill-amber-600 text-[7px] font-medium">Warning</text>
      <text x="64" y="56" textAnchor="middle" className="fill-red-600 text-[7px] font-medium">Urgent</text>
    </svg>
  )
}

function ImportIllustration({ className }: { className?: string }) {
  return (
    <svg className={cn('w-full h-full', className)} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Excel file icon */}
      <rect x="8" y="18" width="24" height="30" rx="2" className="fill-emerald-100 stroke-emerald-500" strokeWidth="1.5" />
      <rect x="12" y="24" width="8" height="4" className="fill-emerald-500" />
      <rect x="12" y="30" width="16" height="3" rx="0.5" className="fill-emerald-300" />
      <rect x="12" y="35" width="16" height="3" rx="0.5" className="fill-emerald-300" />
      <rect x="12" y="40" width="16" height="3" rx="0.5" className="fill-emerald-300" />
      {/* Gantt chart icon */}
      <rect x="8" y="52" width="24" height="14" rx="2" className="fill-blue-100 stroke-blue-500" strokeWidth="1.5" />
      <rect x="12" y="56" width="10" height="2" rx="1" className="fill-blue-500" />
      <rect x="14" y="60" width="8" height="2" rx="1" className="fill-blue-400" />
      {/* Arrow */}
      <path d="M36 40h12" className="stroke-brand-400" strokeWidth="2" strokeLinecap="round" />
      <path d="M46 36l4 4-4 4" className="stroke-brand-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Result: organized trips */}
      <rect x="52" y="20" width="24" height="40" rx="3" className="fill-white stroke-brand-300" strokeWidth="1.5" />
      <rect x="56" y="26" width="16" height="6" rx="1.5" className="fill-brand-100" />
      <rect x="58" y="28" width="12" height="2" rx="1" className="fill-brand-500" />
      <rect x="56" y="36" width="16" height="6" rx="1.5" className="fill-brand-100" />
      <rect x="58" y="38" width="10" height="2" rx="1" className="fill-brand-500" />
      <rect x="56" y="46" width="16" height="6" rx="1.5" className="fill-brand-100" />
      <rect x="58" y="48" width="8" height="2" rx="1" className="fill-brand-500" />
      {/* Check mark */}
      <circle cx="68" cy="20" r="6" className="fill-emerald-500" />
      <path d="M65 20l2 2 4-4" className="stroke-white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// GDPR Badge component
function GDPRBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      GDPR Compliant
    </div>
  )
}

// Feature card data with outcome-focused copy
const features = [
  {
    id: 'tracking',
    title: 'One place for every traveller',
    description: 'See who\'s compliant and who\'s at risk — without opening a spreadsheet.',
    outcome: 'Instant visibility across your entire team',
    illustration: TeamIllustration,
    bgClass: 'from-brand-50 to-brand-100/50',
    accentColor: 'brand',
  },
  {
    id: 'calculator',
    title: 'Answers in seconds, not hours',
    description: 'Calculate remaining days automatically, updated in real-time.',
    outcome: 'Replace error-prone spreadsheet math',
    illustration: CalculatorIllustration,
    bgClass: 'from-blue-50 to-indigo-50/50',
    accentColor: 'blue',
  },
  {
    id: 'alerts',
    title: 'Alerts before problems happen',
    description: 'Proactive warnings mean you can act before violations occur.',
    outcome: 'Three-tier warning system',
    illustration: AlertIllustration,
    bgClass: 'from-amber-50 to-orange-50/50',
    accentColor: 'amber',
  },
  {
    id: 'import',
    title: 'Add trips, we do the math',
    description: 'Log trips manually or import from spreadsheets — compliance is calculated instantly.',
    outcome: 'Skip the spreadsheet formulas',
    illustration: ImportIllustration,
    bgClass: 'from-emerald-50 to-teal-50/50',
    accentColor: 'emerald',
  },
]

interface FeatureCardProps {
  title: string
  description: string
  outcome: string
  illustration: React.ComponentType<{ className?: string }>
  bgClass: string
  accentColor: string
  index: number
}

function FeatureCard({ title, description, outcome, illustration: Illustration, bgClass, accentColor, index }: FeatureCardProps) {
  // Map accent colors to border hover states
  const borderHoverClass = {
    brand: 'hover:border-brand-200',
    blue: 'hover:border-blue-200',
    amber: 'hover:border-amber-200',
    emerald: 'hover:border-emerald-200',
  }[accentColor] || 'hover:border-brand-200'

  return (
    <div
      className={cn(
        "group relative bg-white rounded-2xl border border-slate-200/80 hover:shadow-lg motion-safe:transition-all motion-safe:duration-300 overflow-hidden",
        borderHoverClass
      )}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Illustration area */}
      <div className={cn("relative h-44 bg-linear-to-br border-b border-slate-100/80 flex items-center justify-center overflow-hidden", bgClass)}>
        <div className="w-24 h-24 motion-safe:group-hover:scale-105 motion-safe:transition-transform motion-safe:duration-300">
          <Illustration />
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/30" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/20" />
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Outcome tag */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium mb-3">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {outcome}
        </div>

        <h3 className="text-lg font-semibold text-slate-900 mb-2 leading-snug">
          {title}
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
}

export function FeatureCards() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-slate-50/50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 text-balance">
            Everything you need to stay compliant
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-6">
            Replace spreadsheet anxiety with confidence. ComplyEUR handles the complexity so you can focus on your business.
          </p>
          <GDPRBadge />
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              title={feature.title}
              description={feature.description}
              outcome={feature.outcome}
              illustration={feature.illustration}
              bgClass={feature.bgClass}
              accentColor={feature.accentColor}
              index={index}
            />
          ))}
        </div>

        {/* Trust footer */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Data hosted in the UK</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>AES-256 encryption at rest</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Instant compliance calculations</span>
          </div>
        </div>
      </div>
    </section>
  )
}
