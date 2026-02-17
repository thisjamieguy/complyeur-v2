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
    // Landing page - main entry point during waitlist mode
    {
      url: `${baseUrl}/landing`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // Note: /login, /signup, /forgot-password redirect to /landing during waitlist mode
    // They will be added back when registration opens
    // Legal and informational pages
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
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // FAQ page - high-value content for user questions
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
