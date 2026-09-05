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
      allocations: {
        Row: {
          amount: number
          asset_key: string
          team_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          asset_key: string
          team_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          asset_key?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocations_asset_key_fkey"
            columns: ["asset_key"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "allocations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          base_price: number
          benchmark_weight: number
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          base_price?: number
          benchmark_weight?: number
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          base_price?: number
          benchmark_weight?: number
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      benchmark_snapshots: {
        Row: {
          allocation: Json
          created_at: string
          round: number
          total_value: number
        }
        Insert: {
          allocation?: Json
          created_at?: string
          round: number
          total_value: number
        }
        Update: {
          allocation?: Json
          created_at?: string
          round?: number
          total_value?: number
        }
        Relationships: []
      }
      change_log: {
        Row: {
          asset_key: string
          created_at: string
          delta: number
          id: string
          round: number
          team_id: string
        }
        Insert: {
          asset_key: string
          created_at?: string
          delta: number
          id?: string
          round: number
          team_id: string
        }
        Update: {
          asset_key?: string
          created_at?: string
          delta?: number
          id?: string
          round?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_state: {
        Row: {
          current_round: number
          id: number
          status: string
          timer_ends_at: string | null
          timer_seconds: number
          updated_at: string
        }
        Insert: {
          current_round?: number
          id?: number
          status?: string
          timer_ends_at?: string | null
          timer_seconds?: number
          updated_at?: string
        }
        Update: {
          current_round?: number
          id?: number
          status?: string
          timer_ends_at?: string | null
          timer_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          body: string
          headline: string
          image_url: string | null
          posted_at: string
          round: number
        }
        Insert: {
          body?: string
          headline: string
          image_url?: string | null
          posted_at?: string
          round: number
        }
        Update: {
          body?: string
          headline?: string
          image_url?: string | null
          posted_at?: string
          round?: number
        }
        Relationships: []
      }
      price_moves: {
        Row: {
          asset_key: string
          pct: number
          round: number
        }
        Insert: {
          asset_key: string
          pct?: number
          round: number
        }
        Update: {
          asset_key?: string
          pct?: number
          round?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_moves_asset_key_fkey"
            columns: ["asset_key"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["key"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: string
          team_number: number | null
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          role: string
          team_number?: number | null
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: string
          team_number?: number | null
          username?: string
        }
        Relationships: []
      }
      round_snapshots: {
        Row: {
          allocation: Json
          created_at: string
          round: number
          team_id: string
          total_value: number
        }
        Insert: {
          allocation?: Json
          created_at?: string
          round: number
          team_id: string
          total_value: number
        }
        Update: {
          allocation?: Json
          created_at?: string
          round?: number
          team_id?: string
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "round_snapshots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          round: number
          submitted_at: string
          team_id: string
        }
        Insert: {
          round: number
          submitted_at?: string
          team_id: string
        }
        Update: {
          round?: number
          submitted_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          bonds_change_round: number | null
          bonds_locked: boolean
          created_at: string
          id: string
          name: string
          team_number: number
        }
        Insert: {
          bonds_change_round?: number | null
          bonds_locked?: boolean
          created_at?: string
          id: string
          name: string
          team_number: number
        }
        Update: {
          bonds_change_round?: number | null
          bonds_locked?: boolean
          created_at?: string
          id?: string
          name?: string
          team_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_host: { Args: { _uid: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
