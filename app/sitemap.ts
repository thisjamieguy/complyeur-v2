import type { MetadataRoute } from 'next'

/**
 * Generates sitemap.xml for search engine discovery
 *
 * What it does:
 * - Lists all public pages that should be indexed
 * - Provides lastModified dates for cache freshness
 * - Sets changeFrequency and priority hints for crawlers
 *
 * Why it matters:
 * - Helps search engines discover and index public pages
 * - Improves SEO by providing structured page information
 * - Ensures marketing and legal pages are properly indexed
 *
 * Common mistakes to avoid:
 * - Don't include authenticated routes (they'll return 401/403)
 * - Don't include dynamic user-specific pages
 * - Keep lastModified dates reasonably accurate
 */
const DEFAULT_SITE_ORIGIN = 'https://complyeur.com'
const LEGAL_PAGES_LAST_MODIFIED = new Date('2025-01-01')

type SitemapChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

interface PublicSitemapPage {
  path: `/${string}`
  changeFrequency: SitemapChangeFrequency
  priority: number
  lastModified: Date
}

function getSiteOrigin(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    DEFAULT_SITE_ORIGIN

  try {
    return new URL(configuredUrl).origin
  } catch {
    return DEFAULT_SITE_ORIGIN
  }
}

function getDeploymentLastModified(): Date {
  const commitDate = process.env.VERCEL_GIT_COMMIT_DATE
  if (!commitDate) {
    return new Date()
  }

  const parsed = new Date(commitDate)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function toAbsoluteUrl(siteOrigin: string, path: `/${string}`): string {
  return new URL(path, `${siteOrigin}/`).toString()
}

const deploymentLastModified = getDeploymentLastModified()

const PUBLIC_SITEMAP_PAGES: PublicSitemapPage[] = [
  {
    path: '/landing',
    lastModified: deploymentLastModified,
    changeFrequency: 'weekly',
    priority: 1.0,
  },
  {
    path: '/pricing',
    lastModified: deploymentLastModified,
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    path: '/faq',
    lastModified: deploymentLastModified,
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/about',
    lastModified: deploymentLastModified,
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/contact',
    lastModified: deploymentLastModified,
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/privacy',
    lastModified: LEGAL_PAGES_LAST_MODIFIED,
    changeFrequency: 'yearly',
    priority: 0.5,
  },
  {
    path: '/terms',
    lastModified: LEGAL_PAGES_LAST_MODIFIED,
    changeFrequency: 'yearly',
    priority: 0.5,
  },
  {
    path: '/accessibility',
    lastModified: LEGAL_PAGES_LAST_MODIFIED,
    changeFrequency: 'yearly',
    priority: 0.4,
  },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const siteOrigin = getSiteOrigin()

  return PUBLIC_SITEMAP_PAGES.map((page) => ({
    url: toAbsoluteUrl(siteOrigin, page.path),
    lastModified: page.lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
