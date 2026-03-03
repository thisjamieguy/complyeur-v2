import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadLocalEnv } from './env'

export type AdminConfig = {
  url: string
  serviceRoleKey: string
}

export type AdminConfigStatus =
  | {
      ok: true
      config: AdminConfig
    }
  | {
      ok: false
      reason: string
    }

export type ProvisionResult = {
  ok: boolean
  reason?: string
  userId?: string
}

function isSafeSupabaseAdminTarget(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
  } catch {
    return false
  }
}

export function getAdminConfigStatus(): AdminConfigStatus {
  loadLocalEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return { ok: false, reason: 'Missing Supabase admin credentials for provisioning.' }
  }

  if (
    process.env.E2E_ALLOW_REMOTE_SUPABASE !== 'true' &&
    !isSafeSupabaseAdminTarget(url)
  ) {
    return {
      ok: false,
      reason: `Refusing to run multi-user E2E provisioning against non-local Supabase (${url}). Set E2E_ALLOW_REMOTE_SUPABASE=true to override.`,
    }
  }

  return {
    ok: true,
    config: { url, serviceRoleKey },
  }
}

function createAdminClient(config: AdminConfig): SupabaseClient {
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function createAdminClientFromEnv(): SupabaseClient {
  const status = getAdminConfigStatus()
  if (status.ok === false) {
    throw new Error(status.reason)
  }

  return createAdminClient(status.config)
}

async function findUserIdByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error || !data?.users) return null
  const users = data.users as Array<{ id: string; email?: string | null }>
  const match = users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
  return match?.id ?? null
}

export async function ensureTestUser(params: {
  email: string
  password: string
  companyName: string
}): Promise<ProvisionResult> {
  const status = getAdminConfigStatus()
  if (status.ok === false) {
    return { ok: false, reason: status.reason }
  }

  const supabase = createAdminClient(status.config)
  const normalizedEmail = params.email.toLowerCase().trim()

  let userId: string | null = null

  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: params.password,
    email_confirm: true,
  })

  if (createData?.user?.id) {
    userId = createData.user.id
  } else if (createError) {
    const msg = createError.message.toLowerCase()
    if (
      msg.includes('already registered') ||
      msg.includes('already been registered') ||
      msg.includes('user already')
    ) {
      userId = await findUserIdByEmail(supabase, normalizedEmail)
    } else {
      return { ok: false, reason: `Failed to create user: ${createError.message}` }
    }
  }

  if (!userId) {
    return { ok: false, reason: 'Unable to resolve user id for test account.' }
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password: params.password,
    email_confirm: true,
  })

  if (updateError) {
    return { ok: false, reason: `Failed to sync test user credentials: ${updateError.message}` }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.company_id) {
    const termsAcceptedAt = new Date().toISOString()
    const fullSignature = await supabase.rpc('create_company_and_profile', {
      user_id: userId,
      user_email: normalizedEmail,
      company_name: params.companyName,
      user_terms_accepted_at: termsAcceptedAt,
      user_auth_provider: 'email',
      user_first_name: null,
      user_last_name: null,
    })

    let rpcError = fullSignature.error

    if (rpcError?.code === 'PGRST202') {
      const legacySignature = await supabase.rpc('create_company_and_profile', {
        user_id: userId,
        user_email: normalizedEmail,
        company_name: params.companyName,
        user_terms_accepted_at: termsAcceptedAt,
      })
      rpcError = legacySignature.error
    }

    if (rpcError) {
      return { ok: false, reason: `Failed to provision profile: ${rpcError.message}` }
    }
  }

  return { ok: true, userId }
}

export async function deleteUserByEmail(email: string): Promise<ProvisionResult> {
  const status = getAdminConfigStatus()
  if (status.ok === false) {
    return { ok: false, reason: status.reason }
  }

  const supabase = createAdminClient(status.config)
  const userId = await findUserIdByEmail(supabase, email)
  if (!userId) {
    return { ok: true }
  }

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) {
    return { ok: false, reason: `Failed to delete user: ${error.message}` }
  }

  return { ok: true }
}

export function hasAdminConfig(): boolean {
  return getAdminConfigStatus().ok
}
