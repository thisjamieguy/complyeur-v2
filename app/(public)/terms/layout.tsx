import { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Terms of Service',
  description:
    'Read ComplyEUR Terms of Service for Schengen compliance management. Understand the terms governing your use of our visa tracking platform.',
  path: '/terms',
})

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
