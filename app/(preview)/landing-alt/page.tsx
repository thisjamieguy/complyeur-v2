import { Metadata } from 'next'
import LandingAltPage from '../landing-claude/page'
import { createPageMetadata } from '@/lib/metadata'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'ComplyEur — Schengen Compliance Software for UK Travel Teams',
    description:
      'Schengen compliance software for UK employers. Check the 90/180-day rule, review travel history, and spot approval risk before EU trips are booked.',
    path: '/landing-alt',
  }),
  robots: {
    index: false,
    follow: false,
  },
}

export default LandingAltPage
