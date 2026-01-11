import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accessibility Statement | ComplyEUR',
  description: 'Learn about our commitment to accessibility and how we make ComplyEUR usable for everyone.',
}

export default function AccessibilityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
