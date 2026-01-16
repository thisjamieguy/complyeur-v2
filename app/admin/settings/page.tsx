import { requireSuperAdmin } from '@/lib/admin/auth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Shield, Database, Key } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const { user, profile } = await requireSuperAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Admin Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Admin panel configuration and security settings
        </p>
      </div>

      {/* Current Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Current Admin Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Name</span>
            <span className="text-sm font-medium text-slate-900">
              {profile.full_name || 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Email</span>
            <span className="text-sm font-medium text-slate-900">
              {user.email}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">User ID</span>
            <code className="text-xs text-slate-500 font-mono">
              {user.id}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Status</span>
            <Badge className="bg-green-100 text-green-800">Super Admin</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Security Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-amber-700">
          <p>
            All admin actions are logged and auditable. The admin panel uses a separate
            service role client that bypasses Row Level Security for administrative operations.
          </p>
          <p>
            <strong>Important:</strong> The service role key should never be exposed in
            client-side code. Admin operations are restricted to server actions only.
          </p>
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Environment
          </CardTitle>
          <CardDescription>
            Current deployment environment and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Node Environment</span>
            <Badge variant="secondary">
              {process.env.NODE_ENV}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Supabase URL</span>
            <code className="text-xs text-slate-500 font-mono truncate max-w-[300px]">
              {process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https?:\/\//, '')}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Service Role Key</span>
            <span className="text-sm text-slate-500">
              {process.env.SUPABASE_SERVICE_ROLE_KEY ? (
                <Badge className="bg-green-100 text-green-800">Configured</Badge>
              ) : (
                <Badge variant="destructive">Missing</Badge>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Access Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Access Control
          </CardTitle>
          <CardDescription>
            How to grant admin access to other users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            To grant super admin access to a user, run the following SQL query
            in the Supabase SQL editor:
          </p>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
{`UPDATE profiles
SET is_superadmin = true
WHERE id = 'USER_UUID_HERE';`}
          </pre>
          <p className="text-sm text-slate-500">
            Replace <code className="bg-slate-100 px-1 rounded">USER_UUID_HERE</code> with
            the actual user ID from the profiles table.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
