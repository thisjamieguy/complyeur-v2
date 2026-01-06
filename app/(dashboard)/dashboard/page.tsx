import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null // This should be handled by middleware
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, companies(name)')
    .eq('id', user.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome to ComplyEUR</h1>
        <p className="text-gray-600 mt-2">
          Manage your team&apos;s Schengen compliance with ease
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Email:</span> {user.email}
              </div>
              {profile?.companies?.name && (
                <div>
                  <span className="font-medium">Company:</span> {profile.companies.name}
                </div>
              )}
              <div>
                <span className="font-medium">Status:</span>{' '}
                <span className="text-green-600">Authenticated</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Get started with compliance management</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Add your first employee</li>
              <li>• Set up travel alerts</li>
              <li>• Configure company settings</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schengen Rules</CardTitle>
            <CardDescription>Key compliance information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Max stay:</span> 90 days per 180-day period
              </div>
              <div>
                <span className="font-medium">Ireland & Cyprus:</span> Not Schengen
              </div>
              <div>
                <span className="font-medium">Entry/Exit:</span> Both days count
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
