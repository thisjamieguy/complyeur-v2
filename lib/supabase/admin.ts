import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Admin database types - these are added by the admin panel migration
 * and may not be in the auto-generated types yet.
 */
export interface AdminDatabase {
  public: {
    Tables: {
      tiers: {
        Row: {
          slug: string
          display_name: string
          description: string | null
          max_employees: number
          max_users: number
          can_export_csv: boolean | null
          can_export_pdf: boolean | null
          can_forecast: boolean | null
          can_calendar: boolean | null
          can_bulk_import: boolean | null
          can_api_access: boolean | null
          can_sso: boolean | null
          can_audit_logs: boolean | null
          stripe_price_id_monthly: string | null
          stripe_price_id_annual: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<AdminDatabase['public']['Tables']['tiers']['Row']> & { slug: string; display_name: string }
        Update: Partial<AdminDatabase['public']['Tables']['tiers']['Row']>
      }
      company_entitlements: {
        Row: {
          id: string
          company_id: string
          tier_slug: string | null
          max_employees: number | null
          max_users: number | null
          can_export_csv: boolean | null
          can_export_pdf: boolean | null
          can_forecast: boolean | null
          can_calendar: boolean | null
          can_bulk_import: boolean | null
          can_api_access: boolean | null
          can_sso: boolean | null
          can_audit_logs: boolean | null
          is_trial: boolean | null
          trial_ends_at: string | null
          is_suspended: boolean | null
          suspended_at: string | null
          suspended_reason: string | null
          manual_override: boolean | null
          override_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<AdminDatabase['public']['Tables']['company_entitlements']['Row']> & { company_id: string }
        Update: Partial<AdminDatabase['public']['Tables']['company_entitlements']['Row']>
      }
      company_notes: {
        Row: {
          id: string
          company_id: string
          admin_user_id: string
          note_content: string
          category: string
          is_pinned: boolean
          follow_up_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<AdminDatabase['public']['Tables']['company_notes']['Row']> & {
          company_id: string
          admin_user_id: string
          note_content: string
        }
        Update: Partial<AdminDatabase['public']['Tables']['company_notes']['Row']>
      }
      admin_audit_log: {
        Row: {
          id: string
          admin_user_id: string
          target_company_id: string | null
          target_user_id: string | null
          action: string
          details: Record<string, unknown>
          details_before: Record<string, unknown> | null
          details_after: Record<string, unknown> | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Partial<AdminDatabase['public']['Tables']['admin_audit_log']['Row']> & {
          admin_user_id: string
          action: string
        }
        Update: never
      }
    }
  }
}

/**
 * Creates a Supabase client using the service role key.
 *
 * WARNING: This client bypasses RLS completely.
 * ONLY use this in:
 * - Server actions that have already verified superadmin status
 * - API routes that have already verified superadmin status
 *
 * NEVER expose this client or its operations to regular users.
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'This is required for admin operations. ' +
      'Add it to your .env.local file.'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
