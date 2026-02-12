import { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Create Your Account',
  description:
    'Sign up for ComplyEur to track Schengen visa compliance for your UK business. Manage the 90/180-day rule with automated alerts and monitoring.',
  path: '/signup',
})

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
