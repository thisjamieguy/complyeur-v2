import { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Reset Your Password',
  description:
    'Forgot your ComplyEUR password? Enter your email to receive a secure password reset link and regain access to your Schengen compliance dashboard.',
  path: '/forgot-password',
})

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
