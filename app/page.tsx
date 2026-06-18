import { Metadata } from 'next'
import LandingPage from './(preview)/landing/page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'ComplyEur — Schengen Compliance Software for UK Travel Teams',
    description:
      'Schengen compliance software for UK employers tracking the 90/180-day rule, employee travel risk, and EU trip approvals before bookings are confirmed.',
    path: '/',
  }),
  robots: {
    index: true,
    follow: true,
  },
}

export const dynamic = 'force-static'

export default LandingPage
