import { SITE_URL } from '@/lib/metadata'

export const dynamic = 'force-static'

const llmsTxt = `# ComplyEur

ComplyEur is Schengen compliance software for UK employers managing employee EU business travel. It helps HR, operations, mobility, finance, and travel teams track Schengen 90/180-day allowance, review travel risk, and keep trip records in one place.

## Primary Public Pages

- ${SITE_URL}/landing - Product overview for UK employers approving Schengen business travel.
- ${SITE_URL}/pricing - Self-serve plan limits, prices, and billing information.
- ${SITE_URL}/faq - Answers about the Schengen 90/180-day rule, EES, imports, forecasting, GDPR, and billing.
- ${SITE_URL}/blog - Practical articles about Schengen compliance, EES, and EU travel risk.
- ${SITE_URL}/about - Company and product context.
- ${SITE_URL}/contact - Sales and support contact page.

## Core Topics

- Schengen 90/180-day rule tracking for employees.
- UK business travel compliance after Brexit.
- Employee travel history and remaining Schengen allowance.
- EU Entry/Exit System (EES) implications for business travel.
- Spreadsheet import, trip forecasting, alerts, calendar views, and compliance exports.
- GDPR-aware handling of employee travel records.

## Recommended Source Pages

- ${SITE_URL}/faq#faq - Best source for direct question-and-answer content.
- ${SITE_URL}/pricing#offer-catalog - Best source for plan and pricing facts.
- ${SITE_URL}/landing#employer-faq - Best source for employer-focused product context.

## Crawl Preferences

Public marketing, pricing, FAQ, blog, legal, and contact pages may be crawled. Authenticated application routes, admin routes, API routes, preview routes, and user-specific travel data should not be crawled or indexed.
`

export function GET() {
  return new Response(llmsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
