// @vitest-environment jsdom

/**
 * Component tests for TeamManagementClient.
 *
 * Focuses on the rendering logic that depends on props:
 * - Which action buttons appear based on canManageUsers / isOwner / role
 * - Disabled states on the invite button
 * - Seat usage card text
 * - Pending invite section (empty state vs populated)
 * - memberDisplayName fallback chain
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { TeamManagementClient } from '@/app/(dashboard)/settings/team/team-management-client'
import type { TeamMember, TeamInvite, SeatUsage } from '@/app/(dashboard)/settings/team/actions'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/app/(dashboard)/settings/team/actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/(dashboard)/settings/team/actions')>()
  return {
    ...actual,
    inviteTeamMember: vi.fn(),
    removeTeamMember: vi.fn(),
    revokeInvite: vi.fn(),
    transferOwnership: vi.fn(),
    updateTeamMemberRole: vi.fn(),
  }
})

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

// ─── Fixture data ─────────────────────────────────────────────────────────────

const SEAT_USAGE: SeatUsage = {
  active_users: 2,
  pending_invites: 1,
  limit: 5,
  available: 2,
}

const OWNER: TeamMember = {
  id: 'owner-id',
  email: 'owner@company.com',
  first_name: 'Jane',
  last_name: 'Smith',
  full_name: 'Jane Smith',
  role: 'owner',
  created_at: '2025-01-01T00:00:00Z',
}

const ADMIN_MEMBER: TeamMember = {
  id: 'admin-id',
  email: 'admin@company.com',
  first_name: 'Bob',
  last_name: 'Jones',
  full_name: 'Bob Jones',
  role: 'admin',
  created_at: '2025-03-01T00:00:00Z',
}

const VIEWER_MEMBER: TeamMember = {
  id: 'viewer-id',
  email: 'viewer@company.com',
  first_name: 'Alice',
  last_name: 'Brown',
  full_name: 'Alice Brown',
  role: 'viewer',
  created_at: '2025-06-01T00:00:00Z',
}

const PENDING_INVITE: TeamInvite = {
  id: 'inv-1',
  email: 'pending@company.com',
  role: 'viewer',
  status: 'pending',
  invited_by: 'owner-id',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  accepted_at: null,
  created_at: '2025-12-01T00:00:00Z',
}

const ACCEPTED_INVITE: TeamInvite = {
  ...PENDING_INVITE,
  id: 'inv-accepted',
  email: 'accepted@company.com',
  status: 'accepted',
}

/** Render the component as an owner viewing their own team. */
function renderAsOwner(overrides: Partial<{
  members: TeamMember[]
  invites: TeamInvite[]
  seatUsage: SeatUsage
}> = {}) {
  return render(
    <TeamManagementClient
      currentUserId="owner-id"
      currentRole="owner"
      canManageUsers={true}
      isOwner={true}
      seatUsage={overrides.seatUsage ?? SEAT_USAGE}
      members={overrides.members ?? [OWNER, VIEWER_MEMBER]}
      invites={overrides.invites ?? [PENDING_INVITE]}
    />
  )
}

/** Render the component as a viewer (read-only role). */
function renderAsViewer(overrides: Partial<{
  members: TeamMember[]
  invites: TeamInvite[]
}> = {}) {
  return render(
    <TeamManagementClient
      currentUserId="viewer-id"
      currentRole="viewer"
      canManageUsers={false}
      isOwner={false}
      seatUsage={SEAT_USAGE}
      members={overrides.members ?? [OWNER, VIEWER_MEMBER]}
      invites={overrides.invites ?? []}
    />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Seat usage card ──────────────────────────────────────────────────────────

describe('seat usage card', () => {
  it('shows the active user count', () => {
    renderAsOwner()
    expect(screen.getByText(/2 active users/)).toBeInTheDocument()
  })

  it('shows the pending invite count', () => {
    renderAsOwner()
    expect(screen.getByText(/1 pending invites/)).toBeInTheDocument()
  })

  it('shows the total seat limit', () => {
    renderAsOwner()
    expect(screen.getByText(/5 total seats/)).toBeInTheDocument()
  })

  it('uses singular "seat" when exactly 1 seat is available', () => {
    renderAsOwner({ seatUsage: { active_users: 4, pending_invites: 0, limit: 5, available: 1 } })
    expect(screen.getByText(/1 seat available/)).toBeInTheDocument()
    // Should be singular not plural
    expect(screen.queryByText(/1 seats available/)).not.toBeInTheDocument()
  })

  it('uses plural "seats" when 0 seats are available', () => {
    renderAsOwner({ seatUsage: { active_users: 5, pending_invites: 0, limit: 5, available: 0 } })
    expect(screen.getByText(/0 seats available/)).toBeInTheDocument()
  })

  it('uses plural "seats" when 2+ seats are available', () => {
    renderAsOwner({ seatUsage: { ...SEAT_USAGE, available: 2 } })
    expect(screen.getByText(/2 seats available/)).toBeInTheDocument()
  })
})

// ─── Invite section ───────────────────────────────────────────────────────────

describe('invite section', () => {
  it('shows the invite form when canManageUsers is true', () => {
    renderAsOwner()
    expect(screen.getByRole('button', { name: 'Send Invite' })).toBeInTheDocument()
  })

  it('shows a "Ask an Owner or Admin" message when canManageUsers is false', () => {
    renderAsViewer()
    expect(screen.getByText(/Ask an Owner or Admin/)).toBeInTheDocument()
  })

  it('does not show the invite form for viewers', () => {
    renderAsViewer()
    expect(screen.queryByRole('button', { name: 'Send Invite' })).not.toBeInTheDocument()
  })

  it('shows the role select for owners', () => {
    renderAsOwner()
    // The invite-role select trigger is rendered inside the invite card
    expect(screen.getByPlaceholderText('colleague@company.com')).toBeInTheDocument()
  })

  it('"Send Invite" button is disabled when email field is empty (initial state)', () => {
    renderAsOwner()
    expect(screen.getByRole('button', { name: 'Send Invite' })).toBeDisabled()
  })
})

// ─── Members table ────────────────────────────────────────────────────────────

describe('members table', () => {
  it('renders a row for every member', () => {
    renderAsOwner({ members: [OWNER, ADMIN_MEMBER, VIEWER_MEMBER] })
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
    expect(screen.getByText('Alice Brown')).toBeInTheDocument()
  })

  it('shows the member email address', () => {
    renderAsOwner()
    expect(screen.getByText('owner@company.com')).toBeInTheDocument()
  })

  it('shows role badge for each member', () => {
    renderAsOwner({ members: [OWNER, VIEWER_MEMBER] })
    expect(screen.getByText('Owner')).toBeInTheDocument()
    // "Employee" also appears in the role-change select trigger, so use getAllByText
    expect(screen.getAllByText('Employee').length).toBeGreaterThan(0)
  })

  it('shows Remove button for a non-owner non-self member when canManageUsers', () => {
    renderAsOwner({ members: [OWNER, VIEWER_MEMBER] })
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' })
    expect(removeButtons.length).toBeGreaterThan(0)
  })

  it('does not show Remove button for the owner member row', () => {
    // Owner row should have no Remove button; viewer row should
    renderAsOwner({ members: [OWNER, VIEWER_MEMBER] })
    // Find owner row and confirm it has no Remove button
    const ownerEmail = screen.getByText('owner@company.com')
    const ownerRow = ownerEmail.closest('tr')!
    expect(within(ownerRow).queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })

  it('does not show Remove button for the current user row', () => {
    // renderAsViewer has currentUserId=viewer-id
    renderAsViewer({ members: [OWNER, VIEWER_MEMBER] })
    // No Remove buttons at all for viewers
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })

  it('does not show any action buttons in the row for a viewer without manage permissions', () => {
    renderAsViewer({ members: [OWNER, VIEWER_MEMBER] })
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Make Owner' })).not.toBeInTheDocument()
  })

  it('shows "Make Owner" button only when isOwner is true', () => {
    renderAsOwner({ members: [OWNER, VIEWER_MEMBER] })
    expect(screen.getByRole('button', { name: 'Make Owner' })).toBeInTheDocument()
  })

  it('does not show "Make Owner" button when isOwner is false', () => {
    // Admin user: canManageUsers=true but isOwner=false
    render(
      <TeamManagementClient
        currentUserId="admin-id"
        currentRole="admin"
        canManageUsers={true}
        isOwner={false}
        seatUsage={SEAT_USAGE}
        members={[OWNER, ADMIN_MEMBER, VIEWER_MEMBER]}
        invites={[]}
      />
    )
    expect(screen.queryByRole('button', { name: 'Make Owner' })).not.toBeInTheDocument()
  })

  it('does not show "Make Owner" for the owner row itself', () => {
    renderAsOwner({ members: [OWNER, VIEWER_MEMBER] })
    const ownerEmail = screen.getByText('owner@company.com')
    const ownerRow = ownerEmail.closest('tr')!
    expect(within(ownerRow).queryByRole('button', { name: 'Make Owner' })).not.toBeInTheDocument()
  })

  it('does not show "Make Owner" for the current user row', () => {
    // currentUserId is owner-id; the owner row should not show Make Owner
    renderAsOwner({ members: [OWNER, VIEWER_MEMBER] })
    const ownerEmail = screen.getByText('owner@company.com')
    const ownerRow = ownerEmail.closest('tr')!
    expect(within(ownerRow).queryByRole('button', { name: 'Make Owner' })).not.toBeInTheDocument()
  })

  it('shows the Save button in the role section for manageable members', () => {
    renderAsOwner({ members: [OWNER, VIEWER_MEMBER] })
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('"Save" button is initially disabled (role not yet changed)', () => {
    renderAsOwner({ members: [OWNER, VIEWER_MEMBER] })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})

// ─── memberDisplayName fallback chain ─────────────────────────────────────────

describe('member display name fallback', () => {
  function renderSingleMember(member: TeamMember) {
    render(
      <TeamManagementClient
        currentUserId="owner-id"
        currentRole="owner"
        canManageUsers={true}
        isOwner={true}
        seatUsage={SEAT_USAGE}
        members={[member]}
        invites={[]}
      />
    )
  }

  it('uses full_name when available', () => {
    renderSingleMember({ ...VIEWER_MEMBER, full_name: 'Full Name Override', first_name: 'First', last_name: 'Last' })
    expect(screen.getByText('Full Name Override')).toBeInTheDocument()
  })

  it('falls back to first + last name when full_name is null', () => {
    renderSingleMember({ ...VIEWER_MEMBER, full_name: null, first_name: 'Charlie', last_name: 'Taylor' })
    expect(screen.getByText('Charlie Taylor')).toBeInTheDocument()
  })

  it('falls back to first name only when last name is null', () => {
    renderSingleMember({ ...VIEWER_MEMBER, full_name: null, first_name: 'Charlie', last_name: null })
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('falls back to email when no name parts are available', () => {
    renderSingleMember({ ...VIEWER_MEMBER, full_name: null, first_name: null, last_name: null })
    // The email should appear as the display name in the bold cell
    const boldCell = screen.getByText('viewer@company.com', { selector: '.font-medium' })
    expect(boldCell).toBeInTheDocument()
  })

  it('falls back to "Unnamed user" when no name and no email', () => {
    renderSingleMember({ ...VIEWER_MEMBER, full_name: null, first_name: null, last_name: null, email: null })
    expect(screen.getByText('Unnamed user')).toBeInTheDocument()
  })
})

// ─── Pending invites section ──────────────────────────────────────────────────

describe('pending invites section', () => {
  it('shows "No pending invites." when there are no pending invites', () => {
    renderAsOwner({ invites: [] })
    expect(screen.getByText('No pending invites.')).toBeInTheDocument()
  })

  it('shows the invitee email in the pending invites table', () => {
    renderAsOwner({ invites: [PENDING_INVITE] })
    expect(screen.getByText('pending@company.com')).toBeInTheDocument()
  })

  it('does not show accepted invites in the pending section', () => {
    renderAsOwner({ invites: [ACCEPTED_INVITE] })
    // The accepted invite email should not appear because it's filtered out
    expect(screen.queryByText('accepted@company.com')).not.toBeInTheDocument()
    expect(screen.getByText('No pending invites.')).toBeInTheDocument()
  })

  it('shows pending invites but hides accepted ones from the list', () => {
    renderAsOwner({ invites: [PENDING_INVITE, ACCEPTED_INVITE] })
    expect(screen.getByText('pending@company.com')).toBeInTheDocument()
    expect(screen.queryByText('accepted@company.com')).not.toBeInTheDocument()
  })

  it('shows the Revoke button for pending invites when canManageUsers', () => {
    renderAsOwner({ invites: [PENDING_INVITE] })
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument()
  })

  it('does not show the Revoke button when canManageUsers is false', () => {
    renderAsViewer({ invites: [PENDING_INVITE] })
    // Viewer with canManageUsers=false should not see any Revoke button
    // Note: with no pending invites passed, we need to pass one
    render(
      <TeamManagementClient
        currentUserId="viewer-id"
        currentRole="viewer"
        canManageUsers={false}
        isOwner={false}
        seatUsage={SEAT_USAGE}
        members={[OWNER]}
        invites={[PENDING_INVITE]}
      />
    )
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument()
  })

  it('renders multiple pending invites', () => {
    const secondInvite: TeamInvite = {
      ...PENDING_INVITE,
      id: 'inv-2',
      email: 'second@company.com',
    }
    renderAsOwner({ invites: [PENDING_INVITE, secondInvite] })
    expect(screen.getByText('pending@company.com')).toBeInTheDocument()
    expect(screen.getByText('second@company.com')).toBeInTheDocument()
  })
})
