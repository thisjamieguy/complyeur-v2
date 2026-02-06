export type TierSlug = 'free' | 'starter' | 'professional' | 'enterprise'

export type BillingInterval = 'monthly' | 'annual'

export interface PlanCatalogEntry {
  slug: TierSlug
  publicName: string
  description: string
  monthlyPriceGbp: number
  annualPriceGbp: number
  employeeCap: number | null
  userCap: number | null
  ctaLabel: string
  recommended: boolean
  showOnPricing: boolean
  badgeClassName: string
}

const FALLBACK_BADGE_CLASS = 'bg-slate-100 text-slate-700'

export const PLAN_CATALOG: readonly PlanCatalogEntry[] = [
  {
    slug: 'free',
    publicName: 'Basic',
    description: 'Entry tier for smaller teams with occasional Schengen travel.',
    monthlyPriceGbp: 27,
    annualPriceGbp: 267,
    employeeCap: 10,
    userCap: 2,
    ctaLabel: 'Start Basic',
    recommended: false,
    showOnPricing: true,
    badgeClassName: 'bg-slate-100 text-slate-700',
  },
  {
    slug: 'starter',
    publicName: 'Pro',
    description: 'Core plan for teams that need regular compliance monitoring.',
    monthlyPriceGbp: 87,
    annualPriceGbp: 867,
    employeeCap: 50,
    userCap: 5,
    ctaLabel: 'Start Pro',
    recommended: true,
    showOnPricing: true,
    badgeClassName: 'bg-blue-100 text-blue-700',
  },
  {
    slug: 'professional',
    publicName: 'Pro+',
    description: 'Highest self-serve plan for larger teams and broader oversight.',
    monthlyPriceGbp: 197,
    annualPriceGbp: 1967,
    employeeCap: 200,
    userCap: 15,
    ctaLabel: 'Start Pro+',
    recommended: false,
    showOnPricing: true,
    badgeClassName: 'bg-purple-100 text-purple-700',
  },
  {
    slug: 'enterprise',
    publicName: 'Enterprise (Legacy)',
    description: 'Legacy plan retained for existing accounts only.',
    monthlyPriceGbp: 0,
    annualPriceGbp: 0,
    employeeCap: null,
    userCap: null,
    ctaLabel: 'Contact Support',
    recommended: false,
    showOnPricing: false,
    badgeClassName: 'bg-amber-100 text-amber-700',
  },
] as const

const PLAN_BY_SLUG: Record<TierSlug, PlanCatalogEntry> = PLAN_CATALOG.reduce(
  (acc, plan) => {
    acc[plan.slug] = plan
    return acc
  },
  {} as Record<TierSlug, PlanCatalogEntry>
)

export const SELF_SERVE_PLANS = PLAN_CATALOG.filter((plan) => plan.showOnPricing)

export function getPlanBySlug(slug: string | null | undefined): PlanCatalogEntry | null {
  if (!slug) return null
  return PLAN_BY_SLUG[slug as TierSlug] ?? null
}

export function getTierDisplayName(
  slug: string | null | undefined,
  displayName?: string | null
): string {
  if (displayName && displayName.trim().length > 0) {
    return displayName
  }

  const plan = getPlanBySlug(slug)
  if (plan) {
    return plan.publicName
  }

  if (!slug) {
    return PLAN_BY_SLUG.free.publicName
  }

  return slug
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getTierBadgeClassName(slug: string | null | undefined): string {
  return getPlanBySlug(slug)?.badgeClassName ?? FALLBACK_BADGE_CLASS
}

export function formatGbpPrice(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
