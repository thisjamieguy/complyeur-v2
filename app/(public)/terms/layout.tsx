import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | ComplyEUR',
  description: 'Read the Terms of Service for using ComplyEUR Schengen compliance management service.',
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
