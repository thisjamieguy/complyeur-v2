import type { MetadataRoute } from 'next'

/**
 * Generates robots.txt for search engine crawlers
 *
 * What it does:
 * - Allows crawling of public marketing/legal pages
 * - Blocks crawling of authenticated dashboard routes, API endpoints, and admin areas
 * - References the sitemap for page discovery
 *
 * Why it matters:
 * - Prevents search engines from indexing private user data
 * - Improves crawl efficiency by focusing on public content
 * - Required for proper SEO hygiene
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://complyeur.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/login',
          '/signup',
          '/privacy',
          '/terms',
          '/accessibility',
          '/forgot-password',
          '/about',
          '/contact',
        ],
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/admin',
          '/admin/*',
          '/api',
          '/api/*',
          '/settings',
          '/settings/*',
          '/employee',
          '/employee/*',
          '/import',
          '/import/*',
          '/exports',
          '/exports/*',
          '/calendar',
          '/calendar/*',
          '/gdpr',
          '/gdpr/*',
          '/trip-forecast',
          '/trip-forecast/*',
          '/future-job-alerts',
          '/future-job-alerts/*',
          '/test-endpoints',
          '/test-endpoints/*',
          '/mfa',
          '/mfa/*',
          '/unsubscribe',
          '/unsubscribe/*',
          '/reset-password',
          '/reset-password/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
