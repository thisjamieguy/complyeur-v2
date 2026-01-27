import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadLocalEnv } from './env'

export type AdminConfig = {
  url: string
  serviceRoleKey: string
}

export type ProvisionResult = {
  ok: boolean
  reason?: string
  userId?: string
}

function getAdminConfig(): AdminConfig | null {
  loadLocalEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return { url, serviceRoleKey }
}

function createAdminClient(config: AdminConfig): SupabaseClient {
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function findUserIdByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error || !data?.users) return null
  const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
  return match?.id ?? null
}

export async function ensureTestUser(params: {
  email: string
  password: string
  companyName: string
}): Promise<ProvisionResult> {
  const config = getAdminConfig()
  if (!config) {
    return { ok: false, reason: 'Missing Supabase admin credentials for provisioning.' }
  }

  const supabase = createAdminClient(config)
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
    if (msg.includes('already registered') || msg.includes('user already')) {
      userId = await findUserIdByEmail(supabase, normalizedEmail)
    } else {
      return { ok: false, reason: `Failed to create user: ${createError.message}` }
    }
  }

  if (!userId) {
    return { ok: false, reason: 'Unable to resolve user id for test account.' }
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
  const config = getAdminConfig()
  if (!config) {
    return { ok: false, reason: 'Missing Supabase admin credentials for cleanup.' }
  }

  const supabase = createAdminClient(config)
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
  return getAdminConfig() !== null
}
