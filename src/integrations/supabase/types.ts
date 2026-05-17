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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_balances: {
        Row: {
          account_id: string
          credit_total: number
          debit_total: number
          ending_balance: number
          id: string
          period: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          credit_total?: number
          debit_total?: number
          ending_balance?: number
          id?: string
          period: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          credit_total?: number
          debit_total?: number
          ending_balance?: number
          id?: string
          period?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coa_accounts: {
        Row: {
          code: string
          created_at: string
          entry_type: string
          id: string
          is_accumulated_depreciation: boolean
          is_depreciation_expense: boolean
          is_fixed_asset: boolean
          name: string
          normal_balance: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          entry_type: string
          id?: string
          is_accumulated_depreciation?: boolean
          is_depreciation_expense?: boolean
          is_fixed_asset?: boolean
          name: string
          normal_balance: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          entry_type?: string
          id?: string
          is_accumulated_depreciation?: boolean
          is_depreciation_expense?: boolean
          is_fixed_asset?: boolean
          name?: string
          normal_balance?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      entity_rk_accounts: {
        Row: {
          account_id: string
          counter_entity_id: string
          created_at: string
          id: string
          owner_entity_id: string
        }
        Insert: {
          account_id: string
          counter_entity_id: string
          created_at?: string
          id?: string
          owner_entity_id: string
        }
        Update: {
          account_id?: string
          counter_entity_id?: string
          created_at?: string
          id?: string
          owner_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_rk_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "coa_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_rk_accounts_counter_entity_id_fkey"
            columns: ["counter_entity_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_rk_accounts_owner_entity_id_fkey"
            columns: ["owner_entity_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_transfers: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          from_entity_id: string
          id: string
          journal_from_id: string | null
          journal_to_id: string | null
          to_entity_id: string
          transfer_date: string
          transfer_group_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          from_entity_id: string
          id?: string
          journal_from_id?: string | null
          journal_to_id?: string | null
          to_entity_id: string
          transfer_date: string
          transfer_group_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          from_entity_id?: string
          id?: string
          journal_from_id?: string | null
          journal_to_id?: string | null
          to_entity_id?: string
          transfer_date?: string
          transfer_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_transfers_from_entity_id_fkey"
            columns: ["from_entity_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_transfers_to_entity_id_fkey"
            columns: ["to_entity_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_asset_coa_mapping: {
        Row: {
          coa_accumulated_depr_id: string | null
          coa_asset_id: string
          coa_depr_expense_id: string | null
          created_at: string
          default_useful_life_years: number
          id: string
          updated_at: string
        }
        Insert: {
          coa_accumulated_depr_id?: string | null
          coa_asset_id: string
          coa_depr_expense_id?: string | null
          created_at?: string
          default_useful_life_years?: number
          id?: string
          updated_at?: string
        }
        Update: {
          coa_accumulated_depr_id?: string | null
          coa_asset_id?: string
          coa_depr_expense_id?: string | null
          created_at?: string
          default_useful_life_years?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      fixed_asset_depreciation_history: {
        Row: {
          asset_id: string
          created_at: string
          depreciation_amount: number
          id: string
          journal_id: string | null
          period_month: number
          period_year: number
        }
        Insert: {
          asset_id: string
          created_at?: string
          depreciation_amount?: number
          id?: string
          journal_id?: string | null
          period_month: number
          period_year: number
        }
        Update: {
          asset_id?: string
          created_at?: string
          depreciation_amount?: number
          id?: string
          journal_id?: string | null
          period_month?: number
          period_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_asset_depreciation_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          accumulated_depreciation: number
          acquisition_cost: number
          acquisition_date: string
          asset_name: string
          book_value: number
          coa_accumulated_depr_id: string | null
          coa_asset_id: string
          coa_depr_expense_id: string | null
          created_at: string
          created_from_journal_id: string | null
          depreciation_method: string
          id: string
          last_depreciation_date: string | null
          notes: string | null
          status: string
          unit_id: string | null
          updated_at: string
          useful_life_years: number
        }
        Insert: {
          accumulated_depreciation?: number
          acquisition_cost?: number
          acquisition_date: string
          asset_name: string
          book_value?: number
          coa_accumulated_depr_id?: string | null
          coa_asset_id: string
          coa_depr_expense_id?: string | null
          created_at?: string
          created_from_journal_id?: string | null
          depreciation_method?: string
          id?: string
          last_depreciation_date?: string | null
          notes?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          useful_life_years?: number
        }
        Update: {
          accumulated_depreciation?: number
          acquisition_cost?: number
          acquisition_date?: string
          asset_name?: string
          book_value?: number
          coa_accumulated_depr_id?: string | null
          coa_asset_id?: string
          coa_depr_expense_id?: string | null
          created_at?: string
          created_from_journal_id?: string | null
          depreciation_method?: string
          id?: string
          last_depreciation_date?: string | null
          notes?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          useful_life_years?: number
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          correction_reason: string | null
          correction_type: string | null
          created_at: string
          description: string | null
          id: string
          original_journal_id: string | null
          status: string
          total_amount: number
          transaction_date: string
          transaction_type: string
          transfer_group_id: string | null
          updated_at: string
        }
        Insert: {
          correction_reason?: string | null
          correction_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          original_journal_id?: string | null
          status?: string
          total_amount?: number
          transaction_date: string
          transaction_type: string
          transfer_group_id?: string | null
          updated_at?: string
        }
        Update: {
          correction_reason?: string | null
          correction_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          original_journal_id?: string | null
          status?: string
          total_amount?: number
          transaction_date?: string
          transaction_type?: string
          transfer_group_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_original_journal_id_fkey"
            columns: ["original_journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_code: string
          account_id: string
          account_name: string
          created_at: string
          credit: number
          debit: number
          id: string
          journal_entry_id: string
          line_order: number
        }
        Insert: {
          account_code: string
          account_id: string
          account_name: string
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          journal_entry_id: string
          line_order?: number
        }
        Update: {
          account_code?: string
          account_id?: string
          account_name?: string
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          journal_entry_id?: string
          line_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "coa_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_installments: {
        Row: {
          created_at: string
          due_date: string
          id: string
          installment_no: number
          interest_due: number
          is_paid: boolean
          loan_id: string
          paid_amount: number
          paid_date: string | null
          principal_due: number
          total_due: number
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          installment_no: number
          interest_due?: number
          is_paid?: boolean
          loan_id: string
          paid_amount?: number
          paid_date?: string | null
          principal_due?: number
          total_due?: number
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          installment_no?: number
          interest_due?: number
          is_paid?: boolean
          loan_id?: string
          paid_amount?: number
          paid_date?: string | null
          principal_due?: number
          total_due?: number
        }
        Relationships: [
          {
            foreignKeyName: "loan_installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          borrower_name: string
          created_at: string
          id: string
          interest_rate: number
          monthly_installment: number
          notes: string | null
          outstanding_principal: number
          principal_amount: number
          start_date: string
          status: string
          tenure_months: number
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          borrower_name: string
          created_at?: string
          id?: string
          interest_rate?: number
          monthly_installment?: number
          notes?: string | null
          outstanding_principal?: number
          principal_amount?: number
          start_date: string
          status?: string
          tenure_months?: number
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          borrower_name?: string
          created_at?: string
          id?: string
          interest_rate?: number
          monthly_installment?: number
          notes?: string | null
          outstanding_principal?: number
          principal_amount?: number
          start_date?: string
          status?: string
          tenure_months?: number
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          avg_cost: number
          code: string
          created_at: string
          id: string
          min_stock: number
          name: string
          notes: string | null
          selling_price: number
          status: string
          stock_qty: number
          unit_id: string | null
          uom: string
          updated_at: string
        }
        Insert: {
          avg_cost?: number
          code: string
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          notes?: string | null
          selling_price?: number
          status?: string
          stock_qty?: number
          unit_id?: string | null
          uom?: string
          updated_at?: string
        }
        Update: {
          avg_cost?: number
          code?: string
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          notes?: string | null
          selling_price?: number
          status?: string
          stock_qty?: number
          unit_id?: string | null
          uom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          jabatan: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          jabatan?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          jabatan?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      profit_distribution_config: {
        Row: {
          coa_account_code: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          percentage: number
          updated_at: string
        }
        Insert: {
          coa_account_code: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          percentage: number
          updated_at?: string
        }
        Update: {
          coa_account_code?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      profit_distribution_runs: {
        Row: {
          created_at: string
          executed: boolean
          id: string
          journal_entry_id: string | null
          net_profit: number
          period_end: string
          period_start: string
        }
        Insert: {
          created_at?: string
          executed?: boolean
          id?: string
          journal_entry_id?: string | null
          net_profit: number
          period_end: string
          period_start: string
        }
        Update: {
          created_at?: string
          executed?: boolean
          id?: string
          journal_entry_id?: string | null
          net_profit?: number
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      report_cache: {
        Row: {
          generated_at: string
          id: string
          period: string
          period_start: string | null
          report_json: Json
          report_type: string
          unit_id: string | null
        }
        Insert: {
          generated_at?: string
          id?: string
          period: string
          period_start?: string | null
          report_json: Json
          report_type: string
          unit_id?: string | null
        }
        Update: {
          generated_at?: string
          id?: string
          period?: string
          period_start?: string | null
          report_json?: Json
          report_type?: string
          unit_id?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          journal_entry_id: string | null
          movement_date: string
          movement_type: string
          notes: string | null
          product_id: string
          qty: number
          reference: string | null
          total_value: number
          unit_cost: number
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          movement_date?: string
          movement_type: string
          notes?: string | null
          product_id: string
          qty: number
          reference?: string | null
          total_value?: number
          unit_cost?: number
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          movement_date?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          qty?: number
          reference?: string | null
          total_value?: number
          unit_cost?: number
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_pusat: boolean
          kas_account_id: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_pusat?: boolean
          kas_account_id?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_pusat?: boolean
          kas_account_id?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          unit_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_unit_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_pusat: { Args: { _user_id: string }; Returns: boolean }
      recalc_account_balance: {
        Args: { p_account_id: string; p_period: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin_pusat" | "admin_unit"
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
      app_role: ["admin_pusat", "admin_unit"],
    },
  },
} as const
