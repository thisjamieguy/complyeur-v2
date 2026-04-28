import type { MetadataRoute } from 'next'

/**
 * Generates robots.txt for search engine crawlers
 *
 * What it does:
 * - Allows crawling of public marketing/legal pages
 * - Blocks crawling of authenticated/app-only routes and test/preview pages
 * - References the sitemap for page discovery
 *
 * Why it matters:
 * - Prevents search engines from indexing private user data
 * - Improves crawl efficiency by focusing on public content
 * - Required for proper SEO hygiene
 */
const DEFAULT_SITE_ORIGIN = 'https://complyeur.com'

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

const PRIVATE_ROUTE_PATTERNS = [
  '/admin',
  '/admin/*',
  '/dashboard',
  '/dashboard/*',
  '/onboarding',
  '/onboarding/*',
  '/employee',
  '/employee/*',
  '/import',
  '/import/*',
  '/exports',
  '/exports/*',
  '/calendar',
  '/calendar/*',
  '/settings',
  '/settings/*',
  '/gdpr',
  '/gdpr/*',
  '/trip-forecast',
  '/trip-forecast/*',
  '/future-job-alerts',
  '/future-job-alerts/*',
  '/mfa',
  '/mfa/*',
  '/api',
  '/api/*',
  '/auth/callback',
  '/auth/callback/*',
  '/test-endpoints',
  '/test-endpoints/*',
]

// Utility routes (login, signup, password reset, unsubscribe) are intentionally
// left crawlable in robots.txt. Blocking them here previously caused Lighthouse's
// `is-crawlable` SEO audit to fail on /login, dropping the SEO score below 0.8.
// These pages are kept out of the sitemap and can rely on page-level meta robots
// directives if we ever need to suppress indexing without blocking crawling.
const NON_INDEXABLE_UTILITY_ROUTES: string[] = [
  '/unsubscribe',
  '/unsubscribe/*',
]

const PREVIEW_ROUTE_PATTERNS = [
  '/landing-sandbox',
  '/landing-sandbox/*',
  '/landing/preview',
  '/landing/preview/*',
  '/landing/sandbox',
  '/landing/sandbox/*',
]

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = getSiteOrigin()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          ...PRIVATE_ROUTE_PATTERNS,
          ...NON_INDEXABLE_UTILITY_ROUTES,
          ...PREVIEW_ROUTE_PATTERNS,
        ],
      },
    ],
    sitemap: [`${siteOrigin}/sitemap.xml`],
    host: siteOrigin,
  }
}
