import { Users } from 'lucide-react'
import { listTeamMembersAndInvites } from './actions'
import { TeamManagementClient } from './team-management-client'

export const metadata = {
  title: 'Team | ComplyEur',
  description: 'Manage user access for your company account',
}

export default async function TeamSettingsPage() {
  const result = await listTeamMembersAndInvites()

  if (!result.success || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Team</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {result.error ?? 'Failed to load team settings.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Users className="h-6 w-6 text-blue-600" />
          Team
        </h1>
        <p className="mt-1 text-slate-600">
          Invite colleagues, assign roles, and manage seat usage for your company.
        </p>
      </div>

      <TeamManagementClient
        currentUserId={result.data.currentUserId}
        currentRole={result.data.currentRole}
        canManageUsers={result.data.canManageUsers}
        isOwner={result.data.isOwner}
        seatUsage={result.data.seatUsage}
        members={result.data.members}
        invites={result.data.invites}
      />
    </div>
  )
}
