'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getRoleLabel } from '@/lib/permissions'
import {
  inviteTeamMember,
  removeTeamMember,
  revokeInvite,
  transferOwnership,
  updateTeamMemberRole,
  type SeatUsage,
  type TeamInvite,
  type TeamMember,
} from './actions'

type TeamRole = 'admin' | 'manager' | 'viewer'

interface TeamManagementClientProps {
  currentUserId: string
  currentRole: string | null
  canManageUsers: boolean
  isOwner: boolean
  seatUsage: SeatUsage
  members: TeamMember[]
  invites: TeamInvite[]
}

function isTeamRole(value: string | null | undefined): value is TeamRole {
  return value === 'admin' || value === 'manager' || value === 'viewer'
}

function roleBadgeClass(role: string | null): string {
  switch (role) {
    case 'owner':
      return 'bg-emerald-100 text-emerald-800'
    case 'admin':
      return 'bg-blue-100 text-blue-800'
    case 'manager':
      return 'bg-violet-100 text-violet-800'
    case 'viewer':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function statusBadgeClass(status: TeamInvite['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800'
    case 'accepted':
      return 'bg-green-100 text-green-800'
    case 'revoked':
      return 'bg-slate-200 text-slate-700'
    case 'expired':
      return 'bg-rose-100 text-rose-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function memberDisplayName(member: TeamMember): string {
  if (member.full_name) return member.full_name

  const first = member.first_name?.trim()
  const last = member.last_name?.trim()
  const combined = [first, last].filter(Boolean).join(' ')
  if (combined) return combined

  return member.email ?? 'Unnamed user'
}

export function TeamManagementClient({
  currentUserId,
  currentRole,
  canManageUsers,
  isOwner,
  seatUsage,
  members,
  invites,
}: TeamManagementClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('viewer')
  const [roleDrafts, setRoleDrafts] = useState<Record<string, TeamRole>>({})

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === 'pending'),
    [invites]
  )

  const resolvedRoleForMember = (member: TeamMember): TeamRole => {
    const draft = roleDrafts[member.id]
    if (draft) return draft
    if (isTeamRole(member.role)) return member.role
    return 'viewer'
  }

  const refreshAfterSuccess = () => {
    router.refresh()
  }

  const handleInvite = () => {
    startTransition(async () => {
      const result = await inviteTeamMember(inviteEmail, inviteRole)
      if (!result.success) {
        toast.error(result.error ?? 'Failed to send invite')
        return
      }

      if (result.warning) {
        toast.warning(result.warning)
      } else {
        toast.success('Invite sent')
      }

      setInviteEmail('')
      setInviteRole('viewer')
      refreshAfterSuccess()
    })
  }

  const handleRoleUpdate = (member: TeamMember) => {
    const nextRole = resolvedRoleForMember(member)

    startTransition(async () => {
      const result = await updateTeamMemberRole(member.id, nextRole)
      if (!result.success) {
        toast.error(result.error ?? 'Failed to update role')
        return
      }

      toast.success('Role updated')
      refreshAfterSuccess()
    })
  }

  const handleRemove = (member: TeamMember) => {
    if (!window.confirm(`Remove ${memberDisplayName(member)} from your company?`)) {
      return
    }

    startTransition(async () => {
      const result = await removeTeamMember(member.id)
      if (!result.success) {
        toast.error(result.error ?? 'Failed to remove user')
        return
      }

      toast.success('User removed')
      refreshAfterSuccess()
    })
  }

  const handleTransferOwnership = (member: TeamMember) => {
    if (!window.confirm(`Transfer ownership to ${memberDisplayName(member)}?`)) {
      return
    }

    startTransition(async () => {
      const result = await transferOwnership(member.id)
      if (!result.success) {
        toast.error(result.error ?? 'Failed to transfer ownership')
        return
      }

      toast.success('Ownership transferred')
      refreshAfterSuccess()
    })
  }

  const handleRevokeInvite = (inviteId: string) => {
    startTransition(async () => {
      const result = await revokeInvite(inviteId)
      if (!result.success) {
        toast.error(result.error ?? 'Failed to revoke invite')
        return
      }

      toast.success('Invite revoked')
      refreshAfterSuccess()
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seats</CardTitle>
          <CardDescription>
            {seatUsage.active_users} active users + {seatUsage.pending_invites} pending invites of {seatUsage.limit} total seats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-blue-600"
              style={{
                width: `${Math.min(((seatUsage.active_users + seatUsage.pending_invites) / Math.max(seatUsage.limit, 1)) * 100, 100)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {seatUsage.available} seat{seatUsage.available === 1 ? '' : 's'} available
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite Team Member</CardTitle>
          <CardDescription>
            Owner and admins can invite new users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canManageUsers ? (
            <p className="text-sm text-slate-600">
              You are signed in as {getRoleLabel(currentRole)}. Ask an Owner or Admin to invite users.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
              <Input
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                disabled={isPending}
              />
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as TeamRole)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="viewer">Employee</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleInvite}
                disabled={isPending || !inviteEmail.trim()}
              >
                Send Invite
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>
            Manage roles and ownership for your company.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const role = member.role
                const selectedRole = resolvedRoleForMember(member)
                const roleChanged = isTeamRole(role) && selectedRole !== role

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{memberDisplayName(member)}</div>
                      <div className="text-xs text-slate-500">{member.email ?? 'No email'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleBadgeClass(role)}>{getRoleLabel(role)}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {member.created_at
                        ? formatDistanceToNow(new Date(member.created_at), { addSuffix: true })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {canManageUsers && role !== 'owner' && member.id !== currentUserId && (
                          <>
                            <Select
                              value={selectedRole}
                              onValueChange={(value) => {
                                if (!isTeamRole(value)) return
                                setRoleDrafts((prev) => ({ ...prev, [member.id]: value }))
                              }}
                              disabled={isPending}
                            >
                              <SelectTrigger className="w-[150px]" size="sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="viewer">Employee</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRoleUpdate(member)}
                              disabled={!roleChanged || isPending}
                            >
                              Save
                            </Button>
                          </>
                        )}

                        {isOwner && role !== 'owner' && member.id !== currentUserId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTransferOwnership(member)}
                            disabled={isPending}
                          >
                            Make Owner
                          </Button>
                        )}

                        {canManageUsers && role !== 'owner' && member.id !== currentUserId && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemove(member)}
                            disabled={isPending}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Invites</CardTitle>
          <CardDescription>
            Invites expire automatically after 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pendingInvites.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">No pending invites.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>
                      <Badge className={roleBadgeClass(invite.role)}>
                        {getRoleLabel(invite.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass(invite.status)}>
                        {invite.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageUsers && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevokeInvite(invite.id)}
                          disabled={isPending}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
