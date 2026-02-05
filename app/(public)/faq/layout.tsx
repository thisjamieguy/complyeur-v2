import { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'FAQ - Schengen 90/180 Rule Questions Answered',
  description: 'Answers to common questions about the Schengen 90/180-day rule, EU travel compliance, and how ComplyEUR helps UK businesses track employee travel.',
  path: '/faq',
})

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
