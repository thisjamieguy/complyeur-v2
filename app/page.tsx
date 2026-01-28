import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'EU Schengen 90/180-Day Visa Compliance for UK Businesses',
  description:
    'ComplyEUR automates Schengen visa tracking for UK businesses. Monitor employee travel, get real-time alerts, and stay compliant with EU regulations.',
  path: '/',
  appendSiteName: false,
})

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect authenticated users to dashboard, others to landing page
  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/landing')
  }
}
