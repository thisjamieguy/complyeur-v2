import { listTeamMembersAndInvites } from './actions'
import { TeamManagementClient } from './team-management-client'
import { SettingsSectionHeader } from '@/components/settings/settings-section-header'

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Team',
  description: 'Manage user access for your company account',
}

export default async function TeamSettingsPage() {
  const result = await listTeamMembersAndInvites()

  if (!result.success || !result.data) {
    if (result.error === 'Forbidden') {
      return (
        <div className="space-y-8">
          <SettingsSectionHeader
            eyebrow="Organisation"
            title="Team"
            description="Invite colleagues, assign roles, and manage seat usage for your company."
          />
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-600">
              Access
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              Team access is managed by an Owner or Admin
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your current role can use the workspace, but cannot view invite details, seat
              usage, or member roles.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-8">
        <SettingsSectionHeader
          eyebrow="Organisation"
          title="Team"
          description="Invite colleagues, assign roles, and manage seat usage for your company."
        />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {result.error ?? 'Failed to load team settings.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SettingsSectionHeader
        eyebrow="Organisation"
        title="Team"
        description="Invite colleagues, assign roles, and manage seat usage for your company."
      />

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
