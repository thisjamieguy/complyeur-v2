import { randomBytes } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface Actor {
  label: string
  email: string
  password: string
  userId: string
  companyId: string
  client: SupabaseClient
}

interface SeededTenant {
  owner: Actor
  viewer?: Actor
  employeeId: string
  tripId: string
  alertId: string
  inviteId: string
}

interface ProbeResult {
  name: string
  status: 'pass' | 'fail'
  detail: string
}

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function assertProductionConfirmation(): void {
  if (process.env.CONFIRM_PRODUCTION_SUPABASE_RLS_PROBE !== 'true') {
    throw new Error(
      'Refusing to run production probe without CONFIRM_PRODUCTION_SUPABASE_RLS_PROBE=true'
    )
  }
}

function makeClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function shortId(id: string | undefined | null): string {
  if (!id) return 'missing'
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

function redactEmail(email: string): string {
  const [local, domain] = email.split('@')
  return `${local.slice(0, 12)}…@${domain}`
}

function record(
  results: ProbeResult[],
  name: string,
  passed: boolean,
  detail: string
): void {
  results.push({ name, status: passed ? 'pass' : 'fail', detail })
}

async function listProbeAuthUserIds(admin: SupabaseClient, runId: string): Promise<string[]> {
  const userIds: string[] = []

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) {
      throw new Error(`Failed to list auth users for cleanup: ${error.message}`)
    }

    const users = data?.users ?? []
    for (const user of users) {
      if (user.email?.includes(runId) && user.email.includes('codex-rls')) {
        userIds.push(user.id)
      }
    }

    if (users.length < 1000) break
  }

  return userIds
}

async function cleanupProbeData(
  admin: SupabaseClient,
  runId: string
): Promise<{ userIds: string[]; companyIds: string[]; errors: string[] }> {
  const errors: string[] = []
  const userIds = await listProbeAuthUserIds(admin, runId)
  const companyIds = new Set<string>()

  if (userIds.length > 0) {
    const { data, error } = await admin
      .from('profiles')
      .select('company_id')
      .in('id', userIds)

    if (error) {
      errors.push(`profiles:read:${error.message}`)
    } else {
      for (const profile of data ?? []) {
        if (profile.company_id) companyIds.add(profile.company_id as string)
      }
    }
  }

  const { data: companies, error: companiesError } = await admin
    .from('companies')
    .select('id')
    .ilike('name', `%${runId}%`)

  if (companiesError) {
    errors.push(`companies:read:${companiesError.message}`)
  } else {
    for (const company of companies ?? []) {
      if (company.id) companyIds.add(company.id as string)
    }
  }

  for (const companyId of companyIds) {
    for (const table of [
      'notification_log',
      'alerts',
      'trips',
      'employees',
      'company_user_invites',
      'notification_preferences',
      'company_settings',
      'company_entitlements',
      'audit_log',
    ]) {
      const { error } = await admin.from(table).delete().eq('company_id', companyId)
      if (error) errors.push(`${table}:${error.message}`)
    }
  }

  if (userIds.length > 0) {
    const { error } = await admin.from('profiles').delete().in('id', userIds)
    if (error) errors.push(`profiles:delete:${error.message}`)
  }

  if (companyIds.size > 0) {
    const { error } = await admin.from('companies').delete().in('id', [...companyIds])
    if (error) errors.push(`companies:delete:${error.message}`)
  }

  for (const userId of userIds) {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) errors.push(`auth.users:${shortId(userId)}:${error.message}`)
  }

  return { userIds, companyIds: [...companyIds], errors }
}

async function createAuthUser(
  admin: SupabaseClient,
  email: string,
  password: string
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user?.id) {
    throw new Error(`Failed to create ${email}: ${error?.message ?? 'missing user id'}`)
  }

  return data.user.id
}

async function getCompanyId(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await admin
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to read profile for ${shortId(userId)}: ${error.message}`)
  }

  return (data?.company_id as string | null) ?? null
}

async function ensureOwnerProfile(
  admin: SupabaseClient,
  userId: string,
  email: string,
  companyName: string
): Promise<string> {
  const existingCompanyId = await getCompanyId(admin, userId)
  if (existingCompanyId) return existingCompanyId

  const { data, error } = await admin.rpc('create_company_and_profile', {
    user_id: userId,
    user_email: email,
    company_name: companyName,
    user_terms_accepted_at: new Date().toISOString(),
    user_auth_provider: 'email',
    user_first_name: 'Codex',
    user_last_name: 'Probe',
  })

  if (error || !data) {
    throw new Error(`Failed to provision company/profile for ${email}: ${error?.message}`)
  }

  return data as string
}

async function signInAs(
  url: string,
  anonKey: string,
  label: string,
  email: string,
  password: string,
  userId: string,
  companyId: string
): Promise<Actor> {
  const client = makeClient(url, anonKey)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(`Failed to sign in ${label}: ${error.message}`)
  }

  return { label, email, password, userId, companyId, client }
}

async function createOwnerTenant(params: {
  admin: SupabaseClient
  url: string
  anonKey: string
  label: string
  runId: string
  password: string
  createdUsers: Set<string>
  createdCompanyIds: Set<string>
}): Promise<Actor> {
  const email = `codex-rls-${params.label}-${params.runId}@complyeur.test`
  const userId = await createAuthUser(params.admin, email, params.password)
  params.createdUsers.add(userId)
  const companyId = await ensureOwnerProfile(
    params.admin,
    userId,
    email,
    `Codex RLS Probe ${params.label.toUpperCase()} ${params.runId}`
  )
  params.createdCompanyIds.add(companyId)

  const { error: companyNameError } = await params.admin
    .from('companies')
    .update({ name: `Codex RLS Probe ${params.label.toUpperCase()} ${params.runId}` })
    .eq('id', companyId)

  if (companyNameError) {
    throw new Error(`Failed to mark probe company ${shortId(companyId)}: ${companyNameError.message}`)
  }

  await params.admin
    .from('profiles')
    .update({
      role: 'owner',
      onboarding_completed_at: new Date().toISOString(),
      dashboard_tour_completed_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return signInAs(
    params.url,
    params.anonKey,
    `owner_${params.label}`,
    email,
    params.password,
    userId,
    companyId
  )
}

async function createViewerInCompany(params: {
  admin: SupabaseClient
  url: string
  anonKey: string
  label: string
  runId: string
  password: string
  companyId: string
  createdUsers: Set<string>
  createdCompanyIds: Set<string>
}): Promise<Actor> {
  const email = `codex-rls-viewer-${params.label}-${params.runId}@complyeur.test`
  const userId = await createAuthUser(params.admin, email, params.password)
  params.createdUsers.add(userId)

  const triggerCompanyId = await getCompanyId(params.admin, userId)
  if (triggerCompanyId && triggerCompanyId !== params.companyId) {
    params.createdCompanyIds.add(triggerCompanyId)
  }

  const { error } = await params.admin
    .from('profiles')
    .update({
      company_id: params.companyId,
      email,
      role: 'viewer',
      auth_provider: 'email',
      terms_accepted_at: new Date().toISOString(),
      onboarding_completed_at: new Date().toISOString(),
      dashboard_tour_completed_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to update viewer profile: ${error.message}`)
  }

  return signInAs(
    params.url,
    params.anonKey,
    `viewer_${params.label}`,
    email,
    params.password,
    userId,
    params.companyId
  )
}

async function seedTenant(
  admin: SupabaseClient,
  owner: Actor,
  runId: string,
  label: string
): Promise<SeededTenant> {
  const { data: employee, error: employeeError } = await admin
    .from('employees')
    .insert({
      company_id: owner.companyId,
      name: `Codex RLS ${label.toUpperCase()} ${runId}`,
      email: `codex-rls-employee-${label}-${runId}@complyeur.test`,
      nationality_type: 'uk_citizen',
    })
    .select('id')
    .single()

  if (employeeError || !employee?.id) {
    throw new Error(`Failed to seed employee ${label}: ${employeeError?.message}`)
  }

  const { data: trip, error: tripError } = await admin
    .from('trips')
    .insert({
      company_id: owner.companyId,
      employee_id: employee.id,
      country: 'FR',
      entry_date: '2026-01-10',
      exit_date: '2026-01-12',
      purpose: `Codex RLS probe ${runId}`,
      is_private: false,
    })
    .select('id')
    .single()

  if (tripError || !trip?.id) {
    throw new Error(`Failed to seed trip ${label}: ${tripError?.message}`)
  }

  const { data: alert, error: alertError } = await admin
    .from('alerts')
    .insert({
      company_id: owner.companyId,
      employee_id: employee.id,
      alert_type: 'warning',
      risk_level: 'amber',
      message: `Codex RLS probe alert ${runId}`,
      days_used: 42,
    })
    .select('id')
    .single()

  if (alertError || !alert?.id) {
    throw new Error(`Failed to seed alert ${label}: ${alertError?.message}`)
  }

  const { data: invite, error: inviteError } = await admin
    .from('company_user_invites')
    .insert({
      company_id: owner.companyId,
      email: `codex-rls-invite-${label}-${runId}@complyeur.test`,
      role: 'viewer',
      invited_by: owner.userId,
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (inviteError || !invite?.id) {
    throw new Error(`Failed to seed invite ${label}: ${inviteError?.message}`)
  }

  return {
    owner,
    employeeId: employee.id,
    tripId: trip.id,
    alertId: alert.id,
    inviteId: invite.id,
  }
}

async function runProbe(): Promise<void> {
  assertProductionConfirmation()
  for (const envName of requiredEnv) requireEnv(envName)

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const parsedUrl = new URL(url)

  if (parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === 'localhost') {
    throw new Error('Production probe refuses to run against local Supabase URL.')
  }

  const runId = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`
  const password = `CodexProbe-${runId}-Aa1!`
  const admin = makeClient(url, serviceKey)
  const results: ProbeResult[] = []
  const createdUsers = new Set<string>()
  const createdCompanyIds = new Set<string>()

  let tenantA: SeededTenant | null = null
  let tenantB: SeededTenant | null = null

  try {
    console.log(
      JSON.stringify(
        {
          event: 'production_rls_probe_start',
          host: parsedUrl.host,
          runId,
        },
        null,
        2
      )
    )

    const cleanupRunId = process.env.CLEANUP_PRODUCTION_SUPABASE_RLS_PROBE_RUN_ID
    if (cleanupRunId) {
      const cleanup = await cleanupProbeData(admin, cleanupRunId)
      console.log(
        JSON.stringify(
          {
            event: 'production_rls_probe_cleanup_only',
            runId: cleanupRunId,
            userIds: cleanup.userIds.map(shortId),
            companyIds: cleanup.companyIds.map(shortId),
            cleanupErrors: cleanup.errors,
          },
          null,
          2
        )
      )
      if (cleanup.errors.length > 0) process.exitCode = 1
      return
    }

    const ownerA = await createOwnerTenant({
      admin,
      url,
      anonKey,
      label: 'a',
      runId,
      password,
      createdUsers,
      createdCompanyIds,
    })
    const ownerB = await createOwnerTenant({
      admin,
      url,
      anonKey,
      label: 'b',
      runId,
      password,
      createdUsers,
      createdCompanyIds,
    })
    const viewerA = await createViewerInCompany({
      admin,
      url,
      anonKey,
      label: 'a',
      runId,
      password,
      companyId: ownerA.companyId,
      createdUsers,
      createdCompanyIds,
    })

    tenantA = await seedTenant(admin, ownerA, runId, 'a')
    tenantB = await seedTenant(admin, ownerB, runId, 'b')
    tenantA.viewer = viewerA

    console.log(
      JSON.stringify(
        {
          event: 'production_rls_probe_seeded',
          users: [ownerA, ownerB, viewerA].map((actor) => ({
            label: actor.label,
            email: redactEmail(actor.email),
            userId: shortId(actor.userId),
            companyId: shortId(actor.companyId),
          })),
          employees: {
            tenantA: shortId(tenantA.employeeId),
            tenantB: shortId(tenantB.employeeId),
          },
        },
        null,
        2
      )
    )

    const employeesRead = await ownerA.client
      .from('employees')
      .select('id, company_id, name')
      .eq('company_id', ownerB.companyId)
    record(
      results,
      'owner_a cannot read company_b employees by company_id',
      !employeesRead.error && (employeesRead.data?.length ?? 0) === 0,
      employeesRead.error?.message ?? `rows=${employeesRead.data?.length ?? 0}`
    )

    const tripsRead = await ownerA.client
      .from('trips')
      .select('id, company_id, employee_id')
      .eq('company_id', ownerB.companyId)
    record(
      results,
      'owner_a cannot read company_b trips by company_id',
      !tripsRead.error && (tripsRead.data?.length ?? 0) === 0,
      tripsRead.error?.message ?? `rows=${tripsRead.data?.length ?? 0}`
    )

    const ownEmployeeRead = await ownerA.client
      .from('employees')
      .select('id')
      .eq('id', tenantA.employeeId)
      .maybeSingle()
    record(
      results,
      'owner_a can read own employee positive control',
      !ownEmployeeRead.error && ownEmployeeRead.data?.id === tenantA.employeeId,
      ownEmployeeRead.error?.message ?? `row=${shortId(ownEmployeeRead.data?.id as string)}`
    )

    const crossTripUpdate = await ownerA.client
      .from('trips')
      .update({ purpose: `unauthorized update ${runId}` })
      .eq('id', tenantB.tripId)
      .select('id')
    record(
      results,
      'owner_a cannot update company_b trip by id',
      !crossTripUpdate.error && (crossTripUpdate.data?.length ?? 0) === 0,
      crossTripUpdate.error?.message ?? `rows=${crossTripUpdate.data?.length ?? 0}`
    )

    const crossAlertDelete = await ownerA.client
      .from('alerts')
      .delete()
      .eq('id', tenantB.alertId)
      .select('id')
    record(
      results,
      'owner_a cannot delete company_b alert by id',
      !crossAlertDelete.error && (crossAlertDelete.data?.length ?? 0) === 0,
      crossAlertDelete.error?.message ?? `rows=${crossAlertDelete.data?.length ?? 0}`
    )

    const crossEmployeeInsert = await ownerA.client
      .from('employees')
      .insert({
        company_id: ownerB.companyId,
        name: `Unauthorized Employee ${runId}`,
        nationality_type: 'uk_citizen',
      })
      .select('id')
    record(
      results,
      'owner_a cannot insert employee into company_b',
      Boolean(crossEmployeeInsert.error) && (crossEmployeeInsert.data?.length ?? 0) === 0,
      crossEmployeeInsert.error?.message ?? `rows=${crossEmployeeInsert.data?.length ?? 0}`
    )

    const crossTripInsert = await ownerA.client
      .from('trips')
      .insert({
        company_id: ownerB.companyId,
        employee_id: tenantB.employeeId,
        country: 'DE',
        entry_date: '2026-02-01',
        exit_date: '2026-02-02',
      })
      .select('id')
    record(
      results,
      'owner_a cannot insert trip into company_b',
      Boolean(crossTripInsert.error) && (crossTripInsert.data?.length ?? 0) === 0,
      crossTripInsert.error?.message ?? `rows=${crossTripInsert.data?.length ?? 0}`
    )

    const viewerInviteRead = await viewerA.client
      .from('company_user_invites')
      .select('id, email, company_id')
      .eq('company_id', ownerA.companyId)
    record(
      results,
      'viewer_a cannot read company_a invite metadata',
      !viewerInviteRead.error && (viewerInviteRead.data?.length ?? 0) === 0,
      viewerInviteRead.error?.message ?? `rows=${viewerInviteRead.data?.length ?? 0}`
    )

    const viewerInviteUpdate = await viewerA.client
      .from('company_user_invites')
      .update({ status: 'revoked' })
      .eq('id', tenantA.inviteId)
      .select('id')
    record(
      results,
      'viewer_a cannot update company_a invite',
      !viewerInviteUpdate.error && (viewerInviteUpdate.data?.length ?? 0) === 0,
      viewerInviteUpdate.error?.message ?? `rows=${viewerInviteUpdate.data?.length ?? 0}`
    )

    const seatUsageCross = await ownerA.client.rpc('get_company_seat_usage', {
      p_company_id: ownerB.companyId,
    })
    record(
      results,
      'owner_a direct RPC cannot read company_b seat usage',
      Boolean(seatUsageCross.error),
      seatUsageCross.error?.message ?? JSON.stringify(seatUsageCross.data)
    )

    const seatLimitCross = await ownerA.client.rpc('get_company_user_limit', {
      p_company_id: ownerB.companyId,
    })
    record(
      results,
      'owner_a direct RPC cannot read company_b user limit',
      Boolean(seatLimitCross.error),
      seatLimitCross.error?.message ?? JSON.stringify(seatLimitCross.data)
    )

    const ownershipTransferCross = await ownerB.client.rpc('transfer_company_ownership', {
      p_company_id: ownerA.companyId,
      p_current_owner_id: ownerA.userId,
      p_new_owner_id: ownerB.userId,
    })
    record(
      results,
      'owner_b direct RPC cannot transfer company_a ownership',
      Boolean(ownershipTransferCross.error),
      ownershipTransferCross.error?.message ?? JSON.stringify(ownershipTransferCross.data)
    )

    const ownershipTransferViewer = await viewerA.client.rpc('transfer_company_ownership', {
      p_company_id: ownerA.companyId,
      p_current_owner_id: ownerA.userId,
      p_new_owner_id: viewerA.userId,
    })
    record(
      results,
      'viewer_a direct RPC cannot transfer company_a ownership',
      Boolean(ownershipTransferViewer.error),
      ownershipTransferViewer.error?.message ?? JSON.stringify(ownershipTransferViewer.data)
    )
  } finally {
    const cleanupErrors: string[] = []

    for (const companyId of createdCompanyIds) {
      for (const table of [
        'notification_log',
        'alerts',
        'trips',
        'employees',
        'company_user_invites',
        'notification_preferences',
        'company_settings',
        'company_entitlements',
        'audit_log',
      ]) {
        const { error } = await admin.from(table).delete().eq('company_id', companyId)
        if (error) cleanupErrors.push(`${table}:${error.message}`)
      }
    }

    if (createdUsers.size > 0) {
      const { error } = await admin.from('profiles').delete().in('id', [...createdUsers])
      if (error) cleanupErrors.push(`profiles:${error.message}`)
    }

    if (createdCompanyIds.size > 0) {
      const { error } = await admin.from('companies').delete().in('id', [...createdCompanyIds])
      if (error) cleanupErrors.push(`companies:${error.message}`)
    }

    for (const userId of createdUsers) {
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) cleanupErrors.push(`auth.users:${shortId(userId)}:${error.message}`)
    }

    console.log(
      JSON.stringify(
        {
          event: 'production_rls_probe_cleanup',
          createdUsers: [...createdUsers].map(shortId),
          createdCompanyIds: [...createdCompanyIds].map(shortId),
          cleanupErrors,
        },
        null,
        2
      )
    )

    if (cleanupErrors.length > 0) {
      process.exitCode = 1
    }
  }

  const failed = results.filter((result) => result.status === 'fail')
  console.log(JSON.stringify({ event: 'production_rls_probe_results', results }, null, 2))

  if (failed.length > 0) {
    process.exitCode = 1
  }
}

runProbe().catch((error) => {
  console.error(
    JSON.stringify(
      {
        event: 'production_rls_probe_error',
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  )
  process.exitCode = 1
})
