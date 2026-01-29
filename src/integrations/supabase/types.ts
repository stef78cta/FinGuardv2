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
      account_mappings: {
        Row: {
          allocation_pct: number
          chart_account_id: string
          created_at: string
          id: string
          trial_balance_account_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          allocation_pct?: number
          chart_account_id: string
          created_at?: string
          id?: string
          trial_balance_account_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          allocation_pct?: number
          chart_account_id?: string
          created_at?: string
          id?: string
          trial_balance_account_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_mappings_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_mappings_trial_balance_account_id_fkey"
            columns: ["trial_balance_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_sheet_lines: {
        Row: {
          account_code: string | null
          amount: number
          category: string
          chart_account_id: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          line_key: string
          statement_id: string
          subcategory: string | null
          trial_balance_account_id: string | null
        }
        Insert: {
          account_code?: string | null
          amount: number
          category: string
          chart_account_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          line_key: string
          statement_id: string
          subcategory?: string | null
          trial_balance_account_id?: string | null
        }
        Update: {
          account_code?: string | null
          amount?: number
          category?: string
          chart_account_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          line_key?: string
          statement_id?: string
          subcategory?: string | null
          trial_balance_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balance_sheet_lines_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_sheet_lines_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "financial_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_sheet_lines_trial_balance_account_id_fkey"
            columns: ["trial_balance_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_lines: {
        Row: {
          amount: number
          created_at: string
          description: string
          display_order: number
          id: string
          line_key: string
          section: string
          statement_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          display_order?: number
          id?: string
          line_key: string
          section: string
          statement_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          line_key?: string
          section?: string
          statement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_lines_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "financial_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          company_id: string
          created_at: string
          id: string
          is_postable: boolean
          is_system: boolean
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          company_id: string
          created_at?: string
          id?: string
          is_postable?: boolean
          is_system?: boolean
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          company_id?: string
          created_at?: string
          id?: string
          is_postable?: boolean
          is_system?: boolean
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
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
      financial_statements: {
        Row: {
          company_id: string
          currency_code: string
          generated_at: string
          generated_by: string | null
          id: string
          is_current: boolean
          period_end: string
          period_start: string
          sign_convention: string
          source_import_id: string
          statement_type: string
          version: number
        }
        Insert: {
          company_id: string
          currency_code: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_current?: boolean
          period_end: string
          period_start: string
          sign_convention?: string
          source_import_id: string
          statement_type: string
          version?: number
        }
        Update: {
          company_id?: string
          currency_code?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_current?: boolean
          period_end?: string
          period_start?: string
          sign_convention?: string
          source_import_id?: string
          statement_type?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_statements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_statements_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_statements_source_import_id_fkey"
            columns: ["source_import_id"]
            isOneToOne: false
            referencedRelation: "active_trial_balance_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_statements_source_import_id_fkey"
            columns: ["source_import_id"]
            isOneToOne: false
            referencedRelation: "trial_balance_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      income_statement_lines: {
        Row: {
          account_code: string | null
          amount: number
          category: string
          chart_account_id: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          line_key: string
          statement_id: string
          subcategory: string | null
          trial_balance_account_id: string | null
        }
        Insert: {
          account_code?: string | null
          amount: number
          category: string
          chart_account_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          line_key: string
          statement_id: string
          subcategory?: string | null
          trial_balance_account_id?: string | null
        }
        Update: {
          account_code?: string | null
          amount?: number
          category?: string
          chart_account_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          line_key?: string
          statement_id?: string
          subcategory?: string | null
          trial_balance_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_statement_lines_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_statement_lines_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "financial_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_statement_lines_trial_balance_account_id_fkey"
            columns: ["trial_balance_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          category: string | null
          code: string
          company_id: string | null
          created_at: string
          description: string | null
          display_order: number
          formula: Json
          id: string
          is_active: boolean
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          formula: Json
          id?: string
          is_active?: boolean
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          formula?: Json
          id?: string
          is_active?: boolean
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_values: {
        Row: {
          calculated_at: string
          company_id: string
          id: string
          kpi_definition_id: string
          metadata: Json | null
          period_end: string
          period_start: string
          trial_balance_import_id: string
          value: number | null
        }
        Insert: {
          calculated_at?: string
          company_id: string
          id?: string
          kpi_definition_id: string
          metadata?: Json | null
          period_end: string
          period_start: string
          trial_balance_import_id: string
          value?: number | null
        }
        Update: {
          calculated_at?: string
          company_id?: string
          id?: string
          kpi_definition_id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          trial_balance_import_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_values_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_values_trial_balance_import_id_fkey"
            columns: ["trial_balance_import_id"]
            isOneToOne: false
            referencedRelation: "active_trial_balance_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_values_trial_balance_import_id_fkey"
            columns: ["trial_balance_import_id"]
            isOneToOne: false
            referencedRelation: "trial_balance_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_statements: {
        Row: {
          report_id: string
          statement_id: string
        }
        Insert: {
          report_id: string
          statement_id: string
        }
        Update: {
          report_id?: string
          statement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_statements_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_statements_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "financial_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          company_id: string
          file_format: string | null
          file_url: string | null
          generated_at: string
          generated_by: string
          id: string
          metadata: Json | null
          period_end: string
          period_start: string
          report_type: string | null
          status: string
          title: string
        }
        Insert: {
          company_id: string
          file_format?: string | null
          file_url?: string | null
          generated_at?: string
          generated_by: string
          id?: string
          metadata?: Json | null
          period_end: string
          period_start: string
          report_type?: string | null
          status?: string
          title: string
        }
        Update: {
          company_id?: string
          file_format?: string | null
          file_url?: string | null
          generated_at?: string
          generated_by?: string
          id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          report_type?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
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
      assert_mappings_complete_for_import: {
        Args: { _import_id: string }
        Returns: boolean
      }
      can_access_financial_statement: {
        Args: { _statement_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_import: {
        Args: { _import_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_report: {
        Args: { _report_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_trial_balance_account: {
        Args: { _tb_account_id: string; _user_id: string }
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
