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
      companies: {
        Row: {
          address: string | null
          country_code: string | null
          created_at: string | null
          cui: string
          currency: string | null
          fiscal_year_start_month: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          country_code?: string | null
          created_at?: string | null
          cui: string
          currency?: string | null
          fiscal_year_start_month?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          country_code?: string | null
          created_at?: string | null
          cui?: string
          currency?: string | null
          fiscal_year_start_month?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_balance_accounts: {
        Row: {
          account_code: string
          account_name: string
          closing_credit: number | null
          closing_debit: number | null
          created_at: string | null
          credit_turnover: number | null
          debit_turnover: number | null
          id: string
          import_id: string
          opening_credit: number | null
          opening_debit: number | null
        }
        Insert: {
          account_code: string
          account_name: string
          closing_credit?: number | null
          closing_debit?: number | null
          created_at?: string | null
          credit_turnover?: number | null
          debit_turnover?: number | null
          id?: string
          import_id: string
          opening_credit?: number | null
          opening_debit?: number | null
        }
        Update: {
          account_code?: string
          account_name?: string
          closing_credit?: number | null
          closing_debit?: number | null
          created_at?: string | null
          credit_turnover?: number | null
          debit_turnover?: number | null
          id?: string
          import_id?: string
          opening_credit?: number | null
          opening_debit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_balance_accounts_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "active_trial_balance_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_accounts_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "trial_balance_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_balance_imports: {
        Row: {
          company_id: string
          created_at: string | null
          deleted_at: string | null
          error_message: string | null
          file_size_bytes: number | null
          id: string
          period_end: string
          period_start: string
          processed_at: string | null
          source_file_name: string
          source_file_url: string | null
          status: Database["public"]["Enums"]["import_status"] | null
          updated_at: string | null
          uploaded_by: string
          validation_errors: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          period_end: string
          period_start: string
          processed_at?: string | null
          source_file_name: string
          source_file_url?: string | null
          status?: Database["public"]["Enums"]["import_status"] | null
          updated_at?: string | null
          uploaded_by: string
          validation_errors?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          period_end?: string
          period_start?: string
          processed_at?: string | null
          source_file_name?: string
          source_file_url?: string | null
          status?: Database["public"]["Enums"]["import_status"] | null
          updated_at?: string | null
          uploaded_by?: string
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_balance_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_imports_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          last_login_at: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_trial_balance_imports: {
        Row: {
          accounts_count: number | null
          company_id: string | null
          created_at: string | null
          deleted_at: string | null
          error_message: string | null
          file_size_bytes: number | null
          id: string | null
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          source_file_name: string | null
          source_file_url: string | null
          status: Database["public"]["Enums"]["import_status"] | null
          updated_at: string | null
          uploaded_by: string | null
          validation_errors: Json | null
        }
        Insert: {
          accounts_count?: never
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          source_file_name?: string | null
          source_file_url?: string | null
          status?: Database["public"]["Enums"]["import_status"] | null
          updated_at?: string | null
          uploaded_by?: string | null
          validation_errors?: Json | null
        }
        Update: {
          accounts_count?: never
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          source_file_name?: string | null
          source_file_url?: string | null
          status?: Database["public"]["Enums"]["import_status"] | null
          updated_at?: string | null
          uploaded_by?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_balance_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_imports_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_import: {
        Args: { _import_id: string; _user_id: string }
        Returns: boolean
      }
      create_company_with_member: {
        Args: { p_cui: string; p_name: string; p_user_id: string }
        Returns: string
      }
      get_accounts_paginated: {
        Args: { _import_id: string; _limit?: number; _offset?: number }
        Returns: {
          account_code: string
          account_name: string
          closing_credit: number
          closing_debit: number
          credit_turnover: number
          debit_turnover: number
          id: string
          import_id: string
          opening_credit: number
          opening_debit: number
          total_count: number
        }[]
      }
      get_balances_with_accounts: {
        Args: { _company_id: string; _limit?: number; _offset?: number }
        Returns: Json
      }
      get_company_imports_with_totals: {
        Args: { _company_id: string }
        Returns: {
          accounts_count: number
          created_at: string
          error_message: string
          import_id: string
          period_end: string
          period_start: string
          processed_at: string
          source_file_name: string
          source_file_url: string
          status: Database["public"]["Enums"]["import_status"]
          total_closing_credit: number
          total_closing_debit: number
        }[]
      }
      get_import_totals: {
        Args: { _import_id: string }
        Returns: {
          accounts_count: number
          total_closing_credit: number
          total_closing_debit: number
          total_credit_turnover: number
          total_debit_turnover: number
          total_opening_credit: number
          total_opening_debit: number
        }[]
      }
      get_user_id_from_auth: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      soft_delete_import: { Args: { _import_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin"
      import_status:
        | "draft"
        | "processing"
        | "validated"
        | "completed"
        | "error"
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
    Enums: {
      app_role: ["user", "admin", "super_admin"],
      import_status: ["draft", "processing", "validated", "completed", "error"],
    },
  },
} as const
