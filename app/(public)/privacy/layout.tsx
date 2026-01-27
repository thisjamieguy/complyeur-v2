import { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Privacy Policy',
  description:
    'Learn how ComplyEUR protects your data and privacy. We explain what we collect, how we use it, and your rights under GDPR and UK data protection law.',
  path: '/privacy',
})

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
