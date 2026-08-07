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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      departments: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          type: string
          weekly_log_id: string
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          type: string
          weekly_log_id: string
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          type?: string
          weekly_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "weekly_log_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_weekly_log_id_fkey"
            columns: ["weekly_log_id"]
            isOneToOne: false
            referencedRelation: "weekly_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_key: string
          bio: string | null
          created_at: string
          department_id: string | null
          email: string | null
          id: string
          name: string | null
          phone_number: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_key?: string
          bio?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          id: string
          name?: string | null
          phone_number?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_key?: string
          bio?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone_number?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_log_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          department_id: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          uploaded_by: string
          weekly_log_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          department_id: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          uploaded_by: string
          weekly_log_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          department_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          uploaded_by?: string
          weekly_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_log_attachments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_log_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_log_attachments_weekly_log_id_fkey"
            columns: ["weekly_log_id"]
            isOneToOne: false
            referencedRelation: "weekly_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_log_comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_log_comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "weekly_log_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_log_comment_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_log_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_comment_id: string | null
          updated_at: string
          weekly_log_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          weekly_log_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          weekly_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_log_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_log_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "weekly_log_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_log_comments_weekly_log_id_fkey"
            columns: ["weekly_log_id"]
            isOneToOne: false
            referencedRelation: "weekly_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_log_reactions: {
        Row: {
          created_at: string
          id: string
          reaction: string
          updated_at: string
          user_id: string
          weekly_log_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction: string
          updated_at?: string
          user_id: string
          weekly_log_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction?: string
          updated_at?: string
          user_id?: string
          weekly_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_log_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_log_reactions_weekly_log_id_fkey"
            columns: ["weekly_log_id"]
            isOneToOne: false
            referencedRelation: "weekly_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_logs: {
        Row: {
          author_id: string
          content: string
          created_at: string
          department_id: string
          estimated_cost: number | null
          estimated_mm: number | null
          id: string
          importance: number
          partner_company: string | null
          start_date: string
          status: string
          target_end_date: string
          title: string
          updated_at: string
          work_type: string[]
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          department_id: string
          estimated_cost?: number | null
          estimated_mm?: number | null
          id?: string
          importance?: number
          partner_company?: string | null
          start_date: string
          status?: string
          target_end_date: string
          title: string
          updated_at?: string
          work_type: string[]
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          department_id?: string
          estimated_cost?: number | null
          estimated_mm?: number | null
          id?: string
          importance?: number
          partner_company?: string | null
          start_date?: string
          status?: string
          target_end_date?: string
          title?: string
          updated_at?: string
          work_type?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "weekly_logs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_logs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      work_types: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_department_id: { Args: never; Returns: string }
      current_organization_id: { Args: never; Returns: string }
      get_profile_identities: {
        Args: { profile_ids: string[] }
        Returns: {
          avatar_key: string
          email: string
          id: string
          name: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      search_mentionable_profiles: {
        Args: { max_results?: number; search_query: string }
        Returns: {
          avatar_key: string
          email: string
          id: string
          name: string
        }[]
      }
      stats_logs_by_department: {
        Args: { from_date?: string; org_id?: string; to_date?: string }
        Returns: {
          completed_count: number
          department_id: string
          department_name: string
          in_progress_count: number
          planned_count: number
          total_count: number
        }[]
      }
      stats_logs_by_importance: {
        Args: {
          dept_id?: string
          from_date?: string
          org_id?: string
          to_date?: string
        }
        Returns: {
          importance: number
          log_count: number
        }[]
      }
      stats_logs_by_status: {
        Args: {
          dept_id?: string
          from_date?: string
          org_id?: string
          to_date?: string
        }
        Returns: {
          log_count: number
          status: string
        }[]
      }
      stats_logs_by_work_type: {
        Args: {
          dept_id?: string
          from_date?: string
          org_id?: string
          to_date?: string
        }
        Returns: {
          log_count: number
          work_type: string
        }[]
      }
      stats_logs_monthly_trend: {
        Args: { dept_id?: string; months?: number; org_id?: string }
        Returns: {
          completed_count: number
          created_count: number
          month: string
        }[]
      }
      stats_reactions_summary: {
        Args: {
          dept_id?: string
          from_date?: string
          org_id?: string
          to_date?: string
        }
        Returns: {
          reaction: string
          reaction_count: number
        }[]
      }
      stats_workload_summary: {
        Args: {
          dept_id?: string
          from_date?: string
          org_id?: string
          to_date?: string
        }
        Returns: {
          avg_duration_days: number
          cost_count: number
          cost_sum: number
          mm_count: number
          mm_sum: number
          total_count: number
        }[]
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
