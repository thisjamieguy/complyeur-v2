import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'ComplyEur Cookie Policy and Consent Controls',
  description:
    'Read how ComplyEur uses necessary, analytics, and third-party cookies, and how you can manage consent preferences on the Schengen compliance platform.',
  path: '/cookies',
})

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
