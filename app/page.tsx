import { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'

// No metadata - this page immediately redirects to /landing or /dashboard
// Having duplicate metadata between / and /landing hurts SEO
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
}
export const dynamic = 'force-static'

export default function Home() {
  permanentRedirect('/landing')
}
