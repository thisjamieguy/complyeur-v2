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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
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
      companies: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
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
      employees: {
        Row: {
          anonymized_at: string | null
          company_id: string
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
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
          company_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
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
      create_company_and_profile: {
        Args: { company_name: string; user_email: string; user_id: string }
        Returns: string
      }
      get_last_audit_hash: { Args: { p_company_id: string }; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// ============================================================================
// Convenience Type Aliases
// ============================================================================

// Table Row types
export type Alert = Tables<'alerts'>
export type AuditLog = Tables<'audit_log'>
export type Company = Tables<'companies'>
export type CompanySettings = Tables<'company_settings'>
export type Employee = Tables<'employees'>
export type NotificationLog = Tables<'notification_log'>
export type NotificationPreferences = Tables<'notification_preferences'>
export type Profile = Tables<'profiles'>
export type SchengenCountry = Tables<'schengen_countries'>
export type Trip = Tables<'trips'>

// Insert types
export type AlertInsert = TablesInsert<'alerts'>
export type CompanyInsert = TablesInsert<'companies'>
export type CompanySettingsInsert = TablesInsert<'company_settings'>
export type EmployeeInsert = TablesInsert<'employees'>
export type NotificationLogInsert = TablesInsert<'notification_log'>
export type NotificationPreferencesInsert = TablesInsert<'notification_preferences'>
export type ProfileInsert = TablesInsert<'profiles'>
export type TripInsert = TablesInsert<'trips'>

// Update types
export type AlertUpdate = TablesUpdate<'alerts'>
export type CompanyUpdate = TablesUpdate<'companies'>
export type CompanySettingsUpdate = TablesUpdate<'company_settings'>
export type EmployeeUpdate = TablesUpdate<'employees'>
export type NotificationPreferencesUpdate = TablesUpdate<'notification_preferences'>
export type ProfileUpdate = TablesUpdate<'profiles'>
export type TripUpdate = TablesUpdate<'trips'>

// Custom types for business logic
export type AlertType = 'warning' | 'urgent' | 'breach'
export type AlertRiskLevel = 'green' | 'amber' | 'red'

// Input types (without company_id, which is set server-side)
export type EmployeeInput = Omit<EmployeeInsert, 'company_id'>
export type TripInput = Omit<TripInsert, 'company_id'>

// Join types
export type AlertWithEmployee = Alert & {
  employee: Pick<Employee, 'id' | 'name'> | null
}

export type ProfileWithCompany = Profile & {
  companies: Pick<Company, 'id' | 'name' | 'slug'> | null
}
