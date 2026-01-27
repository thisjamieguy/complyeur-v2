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
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://complyeur.com'

  // Current date for pages that change frequently
  const now = new Date()

  // Static date for legal pages (update when content changes)
  const legalPagesDate = new Date('2025-01-01')

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/forgot-password`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: legalPagesDate,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: legalPagesDate,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/accessibility`,
      lastModified: legalPagesDate,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]
}
