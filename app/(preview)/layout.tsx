import { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'EU Schengen Compliance Made Simple',
  description:
    'Track the 90/180-day Schengen rule for your UK team. Automated compliance monitoring, real-time alerts, and trip planning for post-Brexit business travel.',
  path: '/landing',
})

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
