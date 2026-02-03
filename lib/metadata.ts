import { Metadata } from 'next'

/**
 * Base URL for the site - used for canonical URLs and Open Graph
 * Falls back to production URL if environment variable is not set
 */
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://complyeur.com'

/**
 * Default Open Graph image for social sharing
 * Next.js auto-generates this from /app/opengraph-image.tsx
 */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph-image`

/**
 * Shared metadata configuration for SEO
 * Use this to generate consistent metadata across pages
 */
export interface PageMetadataOptions {
  /** Page title (30-60 chars recommended) */
  title: string
  /** Page description (120-160 chars recommended) */
  description: string
  /** Path for canonical URL (e.g., '/login', '/privacy') */
  path: string
  /** Optional custom OG image URL */
  ogImage?: string
  /** Whether to append site name to title (default: true) */
  appendSiteName?: boolean
}

/**
 * Generates complete metadata for a page including:
 * - Title and description
 * - Canonical URL
 * - Open Graph tags
 * - Twitter card tags
 */
export function createPageMetadata({
  title,
  description,
  path,
  ogImage = DEFAULT_OG_IMAGE,
  appendSiteName = true,
}: PageMetadataOptions): Metadata {
  const canonicalUrl = `${SITE_URL}${path}`
  const fullTitle = appendSiteName ? `${title} | ComplyEUR` : title

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: 'ComplyEUR',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_GB',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
  }
}

/**
 * Default site-wide metadata for the root layout
 * This provides fallback values when pages don't define their own metadata
 */
export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ComplyEUR - Schengen Compliance Management',
    template: '%s | ComplyEUR',
  },
  description:
    'Track and manage EU Schengen 90/180-day visa compliance for your employees. Automated tracking, real-time alerts, and compliance reporting for UK businesses.',
  keywords: [
    'Schengen compliance',
    'visa tracking',
    '90/180 rule',
    'employee travel management',
    'EU travel compliance',
    'UK business travel',
    'Schengen visa calculator',
  ],
  authors: [{ name: 'ComplyEUR' }],
  creator: 'ComplyEUR',
  publisher: 'ComplyEUR',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: 'ComplyEUR',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'ComplyEUR - Schengen Compliance Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@complyeur',
  },
}
