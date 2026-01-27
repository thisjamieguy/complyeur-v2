import { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Sign In to Your Account',
  description:
    'Sign in to ComplyEUR to manage Schengen visa compliance. Track the 90/180-day rule and keep your employees compliant with EU travel regulations.',
  path: '/login',
})

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
