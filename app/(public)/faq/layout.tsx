import { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'FAQ - Schengen 90/180 Rule Questions Answered',
  description: 'Get answers to common questions about the Schengen 90/180-day rule, EU travel compliance, visa tracking, and how ComplyEUR helps UK businesses manage employee travel.',
  path: '/faq',
})

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
