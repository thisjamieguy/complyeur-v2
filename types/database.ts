export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string | null
          details: Json | null
          details_after: Json | null
          details_before: Json | null
          id: string
          ip_address: unknown
          target_company_id: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          details_after?: Json | null
          details_before?: Json | null
          id?: string
          ip_address?: unknown
          target_company_id?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          details_after?: Json | null
          details_before?: Json | null
          id?: string
          ip_address?: unknown
          target_company_id?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_backup_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_backup_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          session_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          session_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          session_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_backup_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          company_id: string
          created_at: string
          days_used: number | null
          email_sent: boolean | null
          employee_id: string
          id: string
          message: string
          resolved: boolean | null
          resolved_at: string | null
          risk_level: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          company_id: string
          created_at?: string
          days_used?: number | null
          email_sent?: boolean | null
          employee_id: string
          id?: string
          message: string
          resolved?: boolean | null
          resolved_at?: string | null
          risk_level: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          company_id?: string
          created_at?: string
          days_used?: number | null
          email_sent?: boolean | null
          employee_id?: string
          id?: string
          message?: string
          resolved?: boolean | null
          resolved_at?: string | null
          risk_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_compliance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "alerts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          entry_hash: string | null
          id: string
          ip_address: unknown
          previous_hash: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          entry_hash?: string | null
          id?: string
          ip_address?: unknown
          previous_hash?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          entry_hash?: string | null
          id?: string
          ip_address?: unknown
          previous_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      background_jobs: {
        Row: {
          attempts: number | null
          company_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          input_data: Json | null
          job_type: string
          last_error: string | null
          max_attempts: number | null
          output_data: Json | null
          progress_current: number | null
          progress_message: string | null
          progress_total: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number | null
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          input_data?: Json | null
          job_type: string
          last_error?: string | null
          max_attempts?: number | null
          output_data?: Json | null
          progress_current?: number | null
          progress_message?: string | null
          progress_total?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number | null
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          input_data?: Json | null
          job_type?: string
          last_error?: string | null
          max_attempts?: number | null
          output_data?: Json | null
          progress_current?: number | null
          progress_message?: string | null
          progress_total?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "background_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      column_mappings: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          description: string | null
          format: string
          id: string
          last_used_at: string | null
          mappings: Json
          name: string
          times_used: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          format: string
          id?: string
          last_used_at?: string | null
          mappings?: Json
          name: string
          times_used?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          format?: string
          id?: string
          last_used_at?: string | null
          mappings?: Json
          name?: string
          times_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "column_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "column_mappings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_entitlements: {
        Row: {
          can_api_access: boolean | null
          can_audit_logs: boolean | null
          can_bulk_import: boolean | null
          can_calendar: boolean | null
          can_export_csv: boolean | null
          can_export_pdf: boolean | null
          can_forecast: boolean | null
          can_sso: boolean | null
          company_id: string | null
          created_at: string | null
          id: string
          is_suspended: boolean | null
          is_trial: boolean | null
          manual_override: boolean | null
          max_employees: number | null
          max_users: number | null
          override_notes: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          suspended_at: string | null
          suspended_reason: string | null
          tier_slug: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          can_api_access?: boolean | null
          can_audit_logs?: boolean | null
          can_bulk_import?: boolean | null
          can_calendar?: boolean | null
          can_export_csv?: boolean | null
          can_export_pdf?: boolean | null
          can_forecast?: boolean | null
          can_sso?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_suspended?: boolean | null
          is_trial?: boolean | null
          manual_override?: boolean | null
          max_employees?: number | null
          max_users?: number | null
          override_notes?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          tier_slug?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          can_api_access?: boolean | null
          can_audit_logs?: boolean | null
          can_bulk_import?: boolean | null
          can_calendar?: boolean | null
          can_export_csv?: boolean | null
          can_export_pdf?: boolean | null
          can_forecast?: boolean | null
          can_sso?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_suspended?: boolean | null
          is_trial?: boolean | null
          manual_override?: boolean | null
          max_employees?: number | null
          max_users?: number | null
          override_notes?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          tier_slug?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_entitlements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_entitlements_tier_slug_fkey"
            columns: ["tier_slug"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["slug"]
          },
        ]
      }
      company_notes: {
        Row: {
          admin_user_id: string | null
          category: string | null
          company_id: string | null
          created_at: string | null
          follow_up_date: string | null
          id: string
          is_pinned: boolean | null
          note_content: string
          updated_at: string | null
        }
        Insert: {
          admin_user_id?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          is_pinned?: boolean | null
          note_content: string
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          is_pinned?: boolean | null
          note_content?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_notes_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          breach_email_enabled: boolean | null
          company_id: string
          created_at: string
          critical_threshold: number | null
          custom_alert_threshold: number | null
          email_notifications: boolean | null
          future_job_warning_threshold: number | null
          notify_70_days: boolean | null
          notify_85_days: boolean | null
          notify_90_days: boolean | null
          retention_months: number | null
          risk_threshold_amber: number | null
          risk_threshold_green: number | null
          session_timeout_minutes: number | null
          status_amber_max: number | null
          status_green_max: number | null
          status_red_max: number | null
          updated_at: string
          urgent_email_enabled: boolean | null
          warning_email_enabled: boolean | null
          warning_threshold: number | null
          weekly_digest: boolean | null
        }
        Insert: {
          breach_email_enabled?: boolean | null
          company_id: string
          created_at?: string
          critical_threshold?: number | null
          custom_alert_threshold?: number | null
          email_notifications?: boolean | null
          future_job_warning_threshold?: number | null
          notify_70_days?: boolean | null
          notify_85_days?: boolean | null
          notify_90_days?: boolean | null
          retention_months?: number | null
          risk_threshold_amber?: number | null
          risk_threshold_green?: number | null
          session_timeout_minutes?: number | null
          status_amber_max?: number | null
          status_green_max?: number | null
          status_red_max?: number | null
          updated_at?: string
          urgent_email_enabled?: boolean | null
          warning_email_enabled?: boolean | null
          warning_threshold?: number | null
          weekly_digest?: boolean | null
        }
        Update: {
          breach_email_enabled?: boolean | null
          company_id?: string
          created_at?: string
          critical_threshold?: number | null
          custom_alert_threshold?: number | null
          email_notifications?: boolean | null
          future_job_warning_threshold?: number | null
          notify_70_days?: boolean | null
          notify_85_days?: boolean | null
          notify_90_days?: boolean | null
          retention_months?: number | null
          risk_threshold_amber?: number | null
          risk_threshold_green?: number | null
          session_timeout_minutes?: number | null
          status_amber_max?: number | null
          status_green_max?: number | null
          status_red_max?: number | null
          updated_at?: string
          urgent_email_enabled?: boolean | null
          warning_email_enabled?: boolean | null
          warning_threshold?: number | null
          weekly_digest?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_compliance_snapshots: {
        Row: {
          company_id: string
          created_at: string
          days_remaining: number
          days_used: number
          employee_id: string
          id: string
          is_compliant: boolean
          next_reset_date: string | null
          risk_level: string
          snapshot_generated_at: string
          trips_hash: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days_remaining: number
          days_used: number
          employee_id: string
          id?: string
          is_compliant?: boolean
          next_reset_date?: string | null
          risk_level: string
          snapshot_generated_at?: string
          trips_hash?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days_remaining?: number
          days_used?: number
          employee_id?: string
          id?: string
          is_compliant?: boolean
          next_reset_date?: string | null
          risk_level?: string
          snapshot_generated_at?: string
          trips_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_compliance_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_compliance_snapshots_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_compliance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_compliance_snapshots_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          anonymized_at: string | null
          company_id: string
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          nationality_type: string
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          nationality_type?: string
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          nationality_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_submissions: {
        Row: {
          category: string
          company_id: string
          created_at: string
          id: string
          message: string
          page_path: string
          user_id: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          id?: string
          message: string
          page_path: string
          user_id: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          page_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_sessions: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string | null
          error_rows: number | null
          file_name: string
          file_size: number
          format: string
          id: string
          parsed_data: Json | null
          result: Json | null
          status: string
          total_rows: number | null
          user_id: string
          valid_rows: number | null
          validation_errors: Json | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          error_rows?: number | null
          file_name: string
          file_size: number
          format: string
          id?: string
          parsed_data?: Json | null
          result?: Json | null
          status?: string
          total_rows?: number | null
          user_id: string
          valid_rows?: number | null
          validation_errors?: Json | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_rows?: number | null
          file_name?: string
          file_size?: number
          format?: string
          id?: string
          parsed_data?: Json | null
          result?: Json | null
          status?: string
          total_rows?: number | null
          user_id?: string
          valid_rows?: number | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "import_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          alert_id: string | null
          company_id: string
          created_at: string
          employee_id: string | null
          error_message: string | null
          id: string
          notification_type: string
          recipient_email: string
          resend_message_id: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          alert_id?: string | null
          company_id: string
          created_at?: string
          employee_id?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          recipient_email: string
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          alert_id?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          recipient_email?: string
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_compliance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "notification_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          company_id: string
          created_at: string
          id: string
          receive_breach_emails: boolean | null
          receive_urgent_emails: boolean | null
          receive_warning_emails: boolean | null
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          receive_breach_emails?: boolean | null
          receive_urgent_emails?: boolean | null
          receive_warning_emails?: boolean | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          receive_breach_emails?: boolean | null
          receive_urgent_emails?: boolean | null
          receive_warning_emails?: boolean | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_provider: string | null
          company_id: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_superadmin: boolean | null
          last_activity_at: string | null
          last_name: string | null
          role: string | null
          terms_accepted_at: string | null
          updated_at: string | null
        }
        Insert: {
          auth_provider?: string | null
          company_id?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_superadmin?: boolean | null
          last_activity_at?: string | null
          last_name?: string | null
          role?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_provider?: string | null
          company_id?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_superadmin?: boolean | null
          last_activity_at?: string | null
          last_name?: string | null
          role?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      schengen_countries: {
        Row: {
          code: string
          is_full_member: boolean | null
          name: string
          notes: string | null
        }
        Insert: {
          code: string
          is_full_member?: boolean | null
          name: string
          notes?: string | null
        }
        Update: {
          code?: string
          is_full_member?: boolean | null
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      tiers: {
        Row: {
          can_api_access: boolean | null
          can_audit_logs: boolean | null
          can_bulk_import: boolean | null
          can_calendar: boolean | null
          can_export_csv: boolean | null
          can_export_pdf: boolean | null
          can_forecast: boolean | null
          can_sso: boolean | null
          created_at: string | null
          description: string | null
          display_name: string
          is_active: boolean | null
          max_employees: number
          max_users: number
          slug: string
          sort_order: number | null
          stripe_price_id_annual: string | null
          stripe_price_id_monthly: string | null
          updated_at: string | null
        }
        Insert: {
          can_api_access?: boolean | null
          can_audit_logs?: boolean | null
          can_bulk_import?: boolean | null
          can_calendar?: boolean | null
          can_export_csv?: boolean | null
          can_export_pdf?: boolean | null
          can_forecast?: boolean | null
          can_sso?: boolean | null
          created_at?: string | null
          description?: string | null
          display_name: string
          is_active?: boolean | null
          max_employees?: number
          max_users?: number
          slug: string
          sort_order?: number | null
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          updated_at?: string | null
        }
        Update: {
          can_api_access?: boolean | null
          can_audit_logs?: boolean | null
          can_bulk_import?: boolean | null
          can_calendar?: boolean | null
          can_export_csv?: boolean | null
          can_export_pdf?: boolean | null
          can_forecast?: boolean | null
          can_sso?: boolean | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          is_active?: boolean | null
          max_employees?: number
          max_users?: number
          slug?: string
          sort_order?: number | null
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trips: {
        Row: {
          company_id: string
          country: string
          created_at: string
          employee_id: string
          entry_date: string
          exit_date: string
          ghosted: boolean | null
          id: string
          is_private: boolean | null
          job_ref: string | null
          purpose: string | null
          travel_days: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          country: string
          created_at?: string
          employee_id: string
          entry_date: string
          exit_date: string
          ghosted?: boolean | null
          id?: string
          is_private?: boolean | null
          job_ref?: string | null
          purpose?: string | null
          travel_days?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          country?: string
          created_at?: string
          employee_id?: string
          entry_date?: string
          exit_date?: string
          ghosted?: boolean | null
          id?: string
          is_private?: boolean | null
          job_ref?: string | null
          purpose?: string | null
          travel_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_compliance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "trips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      employee_compliance_summary: {
        Row: {
          company_id: string | null
          employee_id: string | null
          employee_name: string | null
          last_trip_end: string | null
          total_travel_days: number | null
          total_trips: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_pending_invite_for_auth_user: {
        Args: { p_user_email: string; p_user_id: string }
        Returns: string | null
      }
      create_company_and_profile:
        | {
            Args: { company_name: string; user_email: string; user_id: string }
            Returns: string
          }
        | {
            Args: {
              company_name: string
              user_email: string
              user_id: string
              user_terms_accepted_at?: string
            }
            Returns: string
          }
        | {
            Args: {
              company_name: string
              user_auth_provider?: string
              user_email: string
              user_first_name?: string
              user_id: string
              user_last_name?: string
              user_terms_accepted_at?: string
            }
            Returns: string
          }
      get_company_seat_usage: { Args: { p_company_id: string }; Returns: Json }
      get_company_user_limit: { Args: { p_company_id: string }; Returns: number }
      get_dashboard_summary: { Args: { p_company_id: string }; Returns: Json }
      get_last_audit_hash: { Args: { p_company_id: string }; Returns: string }
      increment_mapping_usage: {
        Args: { mapping_id: string }
        Returns: undefined
      }
      transfer_company_ownership: {
        Args: {
          p_company_id: string
          p_current_owner_id: string
          p_new_owner_id: string
        }
        Returns: boolean
      }
      unsubscribe_by_token: { Args: { token: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
