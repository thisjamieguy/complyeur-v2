import { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
}

export const dynamic = 'force-static'

export default function HomePage() {
  permanentRedirect('/landing')
}
