import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Schengen Compliance Blog for UK Travel Teams',
  description:
    'Read practical guidance on Schengen 90/180 compliance, EES border changes, and EU business travel risk management for UK companies.',
  path: '/blog',
})

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
