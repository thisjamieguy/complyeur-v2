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
