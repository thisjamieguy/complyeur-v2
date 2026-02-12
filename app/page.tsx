import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// No metadata - this page immediately redirects to /landing or /dashboard
// Having duplicate metadata between / and /landing hurts SEO
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
}

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect authenticated users to dashboard, others to landing page
  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/landing-new')
  }
}
