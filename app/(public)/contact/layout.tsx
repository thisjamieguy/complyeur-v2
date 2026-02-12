import { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Contact Us',
  description: 'Get in touch with ComplyEur for Schengen compliance questions, support enquiries, or partnership opportunities. We respond within 24 hours.',
  path: '/contact',
})

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
