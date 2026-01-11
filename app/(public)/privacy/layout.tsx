import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | ComplyEUR',
  description: 'Learn how ComplyEUR handles your data and protects your privacy.',
}

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
