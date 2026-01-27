import { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'About Us - Our Mission',
  description: 'Learn how ComplyEUR helps UK businesses manage Schengen 90/180-day visa compliance with automated tracking, alerts, and reporting.',
  path: '/about',
})

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
