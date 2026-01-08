/**
 * Database types for Supabase
 *
 * To regenerate these types from your Supabase database:
 * 1. Install the Supabase CLI: npm install -g supabase
 * 2. Login: supabase login
 * 3. Generate types: supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 *
 * Or run: pnpm db:types (after adding the script to package.json)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          company_id: string
          email: string
          first_name: string | null
          last_name: string | null
          role: 'admin' | 'manager' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          role?: 'admin' | 'manager' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          role?: 'admin' | 'manager' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      employees: {
        Row: {
          id: string
          company_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'employees_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      trips: {
        Row: {
          id: string
          employee_id: string
          company_id: string
          country: string
          entry_date: string
          exit_date: string
          purpose: string | null
          job_ref: string | null
          is_private: boolean
          ghosted: boolean
          travel_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          company_id: string
          country: string
          entry_date: string
          exit_date: string
          purpose?: string | null
          job_ref?: string | null
          is_private?: boolean
          ghosted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          company_id?: string
          country?: string
          entry_date?: string
          exit_date?: string
          purpose?: string | null
          job_ref?: string | null
          is_private?: boolean
          ghosted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trips_employee_id_fkey'
            columns: ['employee_id']
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trips_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      alerts: {
        Row: {
          id: string
          employee_id: string
          company_id: string
          alert_type: 'warning' | 'urgent' | 'breach'
          risk_level: 'green' | 'amber' | 'red'
          message: string
          days_used: number | null
          resolved: boolean
          resolved_at: string | null
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          email_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          company_id: string
          alert_type: 'warning' | 'urgent' | 'breach'
          risk_level: 'green' | 'amber' | 'red'
          message: string
          days_used?: number | null
          resolved?: boolean
          resolved_at?: string | null
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          email_sent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          company_id?: string
          alert_type?: 'warning' | 'urgent' | 'breach'
          risk_level?: 'green' | 'amber' | 'red'
          message?: string
          days_used?: number | null
          resolved?: boolean
          resolved_at?: string | null
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          email_sent?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'alerts_employee_id_fkey'
            columns: ['employee_id']
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'alerts_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      company_settings: {
        Row: {
          company_id: string
          retention_months: number
          warning_threshold: number
          critical_threshold: number
          email_notifications: boolean
          warning_email_enabled: boolean
          urgent_email_enabled: boolean
          breach_email_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          company_id: string
          retention_months?: number
          warning_threshold?: number
          critical_threshold?: number
          email_notifications?: boolean
          warning_email_enabled?: boolean
          urgent_email_enabled?: boolean
          breach_email_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          retention_months?: number
          warning_threshold?: number
          critical_threshold?: number
          email_notifications?: boolean
          warning_email_enabled?: boolean
          urgent_email_enabled?: boolean
          breach_email_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'company_settings_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      notification_log: {
        Row: {
          id: string
          company_id: string
          alert_id: string | null
          employee_id: string | null
          notification_type: 'warning' | 'urgent' | 'breach' | 'resolution'
          recipient_email: string
          subject: string
          status: 'pending' | 'sent' | 'failed' | 'bounced'
          resend_message_id: string | null
          error_message: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          alert_id?: string | null
          employee_id?: string | null
          notification_type: 'warning' | 'urgent' | 'breach' | 'resolution'
          recipient_email: string
          subject: string
          status?: 'pending' | 'sent' | 'failed' | 'bounced'
          resend_message_id?: string | null
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          alert_id?: string | null
          employee_id?: string | null
          notification_type?: 'warning' | 'urgent' | 'breach' | 'resolution'
          recipient_email?: string
          subject?: string
          status?: 'pending' | 'sent' | 'failed' | 'bounced'
          resend_message_id?: string | null
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_log_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notification_log_alert_id_fkey'
            columns: ['alert_id']
            referencedRelation: 'alerts'
            referencedColumns: ['id']
          }
        ]
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          company_id: string
          receive_warning_emails: boolean
          receive_urgent_emails: boolean
          receive_breach_emails: boolean
          unsubscribe_token: string
          unsubscribed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          receive_warning_emails?: boolean
          receive_urgent_emails?: boolean
          receive_breach_emails?: boolean
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          receive_warning_emails?: boolean
          receive_urgent_emails?: boolean
          receive_breach_emails?: boolean
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notification_preferences_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      audit_log: {
        Row: {
          id: string
          company_id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          details: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_log_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_company_and_profile: {
        Args: {
          user_id: string
          user_email: string
          company_name: string
        }
        Returns: string
      }
      unsubscribe_by_token: {
        Args: {
          token: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types for common operations
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Entity types
export type Company = Tables<'companies'>
export type Profile = Tables<'profiles'>

// Insert types
export type CompanyInsert = InsertTables<'companies'>
export type ProfileInsert = InsertTables<'profiles'>

// Update types
export type CompanyUpdate = UpdateTables<'companies'>
export type ProfileUpdate = UpdateTables<'profiles'>

// Profile with company relation
export type ProfileWithCompany = Profile & {
  companies: Company | null
}

// Employee types
export interface Employee {
  id: string
  company_id: string
  name: string
  created_at: string
  updated_at: string
}

export type EmployeeInsert = Pick<Employee, 'name'> // company_id added server-side
export type EmployeeUpdate = Partial<Pick<Employee, 'name'>>

// For list views with future compliance data
export interface EmployeeWithStatus extends Employee {
  days_used?: number
  days_remaining?: number
  status?: 'compliant' | 'at-risk' | 'non-compliant'
}

// Trip types
export interface Trip {
  id: string
  employee_id: string
  company_id: string
  country: string
  entry_date: string
  exit_date: string
  purpose: string | null
  job_ref: string | null
  is_private: boolean
  ghosted: boolean
  travel_days: number // Generated column in database
  created_at: string
  updated_at: string
}

// Insert type - company_id added server-side, travel_days computed by database
export interface TripInsert {
  employee_id: string
  country: string
  entry_date: string
  exit_date: string
  purpose?: string | null
  job_ref?: string | null
  is_private?: boolean
  ghosted?: boolean
}

// Update type - partial fields
export interface TripUpdate {
  country?: string
  entry_date?: string
  exit_date?: string
  purpose?: string | null
  job_ref?: string | null
  is_private?: boolean
  ghosted?: boolean
}

// Trip with country name for display
export interface TripWithCountryName extends Trip {
  country_name: string
  is_schengen: boolean
}

// Alert types
export type AlertType = 'warning' | 'urgent' | 'breach'
export type AlertRiskLevel = 'green' | 'amber' | 'red'

export interface Alert {
  id: string
  employee_id: string
  company_id: string
  alert_type: AlertType
  risk_level: AlertRiskLevel
  message: string
  days_used: number | null
  resolved: boolean
  resolved_at: string | null
  acknowledged: boolean
  acknowledged_at: string | null
  acknowledged_by: string | null
  email_sent: boolean
  created_at: string
}

export interface AlertInsert {
  employee_id: string
  company_id: string
  alert_type: AlertType
  risk_level: AlertRiskLevel
  message: string
  days_used?: number
  resolved?: boolean
  acknowledged?: boolean
  email_sent?: boolean
}

export interface AlertUpdate {
  resolved?: boolean
  resolved_at?: string
  acknowledged?: boolean
  acknowledged_at?: string
  acknowledged_by?: string
  email_sent?: boolean
}

// Alert with employee info for display
export interface AlertWithEmployee extends Alert {
  employee: {
    id: string
    name: string
  }
}

// Notification log types
export type NotificationType = 'warning' | 'urgent' | 'breach' | 'resolution'
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'bounced'

export interface NotificationLog {
  id: string
  company_id: string
  alert_id: string | null
  employee_id: string | null
  notification_type: NotificationType
  recipient_email: string
  subject: string
  status: NotificationStatus
  resend_message_id: string | null
  error_message: string | null
  sent_at: string | null
  created_at: string
}

export interface NotificationLogInsert {
  company_id: string
  alert_id?: string | null
  employee_id?: string | null
  notification_type: NotificationType
  recipient_email: string
  subject: string
  status?: NotificationStatus
  resend_message_id?: string | null
  error_message?: string | null
  sent_at?: string | null
}

// Company settings types
export interface CompanySettings {
  company_id: string
  retention_months: number
  warning_threshold: number
  critical_threshold: number
  email_notifications: boolean
  warning_email_enabled: boolean
  urgent_email_enabled: boolean
  breach_email_enabled: boolean
  created_at: string
  updated_at: string
}

export interface CompanySettingsUpdate {
  retention_months?: number
  warning_threshold?: number
  critical_threshold?: number
  email_notifications?: boolean
  warning_email_enabled?: boolean
  urgent_email_enabled?: boolean
  breach_email_enabled?: boolean
}

// Notification preferences types (per-user)
export interface NotificationPreferences {
  id: string
  user_id: string
  company_id: string
  receive_warning_emails: boolean
  receive_urgent_emails: boolean
  receive_breach_emails: boolean
  unsubscribe_token: string
  unsubscribed_at: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPreferencesUpdate {
  receive_warning_emails?: boolean
  receive_urgent_emails?: boolean
  receive_breach_emails?: boolean
}
