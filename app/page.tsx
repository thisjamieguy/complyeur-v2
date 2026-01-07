import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect authenticated users to dashboard, others to login
  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
