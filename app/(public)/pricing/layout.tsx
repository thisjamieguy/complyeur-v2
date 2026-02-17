import { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Pricing - Schengen Compliance Plans',
  description:
    'Compare ComplyEur plans for UK businesses managing Schengen 90/180-day compliance. Transparent GBP pricing with monthly and annual billing options.',
  path: '/pricing',
})

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
