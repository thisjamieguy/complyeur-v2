import { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Accessibility Statement',
  description:
    'ComplyEur is committed to digital accessibility. We make our Schengen compliance platform usable for everyone, following WCAG 2.1 guidelines.',
  path: '/accessibility',
})

export default function AccessibilityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
