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
      brand_color_types: {
        Row: {
          brand_id: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_id: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_color_types_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_color_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_color_types_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_colors: {
        Row: {
          brand_color_type_id: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          rgb_hex: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_color_type_id: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          rgb_hex: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_color_type_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          rgb_hex?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_colors_brand_color_type_id_fkey"
            columns: ["brand_color_type_id"]
            isOneToOne: false
            referencedRelation: "brand_color_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_colors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_colors_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_gender_size_types: {
        Row: {
          brand_id: string
          code: string
          created_at: string
          created_by: string | null
          gender: string
          id: string
          is_active: boolean
          name: string
          note: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_id: string
          code: string
          created_at?: string
          created_by?: string | null
          gender: string
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          gender?: string
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_gender_size_types_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_gender_size_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_gender_size_types_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_gender_sizes: {
        Row: {
          brand_gender_size_type_id: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_gender_size_type_id: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_gender_size_type_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_gender_sizes_brand_gender_size_type_id_fkey"
            columns: ["brand_gender_size_type_id"]
            isOneToOne: false
            referencedRelation: "brand_gender_size_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_gender_sizes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_gender_sizes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_lines: {
        Row: {
          brand_id: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_id: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_lines_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_lines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_lines_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      item_types: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          small_brand_id: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          small_brand_id: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          small_brand_id?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_types_small_brand_id_fkey"
            columns: ["small_brand_id"]
            isOneToOne: false
            referencedRelation: "small_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_types_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          item_type_id: string
          name: string
          note: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          item_type_id: string
          name: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          item_type_id?: string
          name?: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_item_type_id_fkey"
            columns: ["item_type_id"]
            isOneToOne: false
            referencedRelation: "item_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          level: number
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          level: number
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          comment_id: string | null
          created_at: string
          id: string
          period_start: string | null
          read_at: string | null
          recipient_id: string
          type: string
          weekly_log_id: string | null
        }
        Insert: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          period_start?: string | null
          read_at?: string | null
          recipient_id: string
          type: string
          weekly_log_id?: string | null
        }
        Update: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          period_start?: string | null
          read_at?: string | null
          recipient_id?: string
          type?: string
          weekly_log_id?: string | null
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
      org_company_divisions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          sort_order: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          sort_order?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_company_divisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_company_divisions_org_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_company_divisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_group_companies: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          org_group_id: string
          sort_order: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          org_group_id: string
          sort_order?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          org_group_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_group_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_group_companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_group_companies_org_group_id_fkey"
            columns: ["org_group_id"]
            isOneToOne: false
            referencedRelation: "org_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      org_groups: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_groups_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_section_teams: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          id: string
          section_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          id?: string
          section_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          id?: string
          section_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_section_teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_section_teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_section_teams_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "org_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      org_sections: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          organization_id: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          organization_id: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          organization_id?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_sections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_sections_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_unit_leaders: {
        Row: {
          company_id: string | null
          created_at: string
          department_id: string | null
          id: string
          org_group_id: string | null
          org_section_id: string | null
          organization_id: string | null
          profile_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          org_group_id?: string | null
          org_section_id?: string | null
          organization_id?: string | null
          profile_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          org_group_id?: string | null
          org_section_id?: string | null
          organization_id?: string | null
          profile_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_unit_leaders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_unit_leaders_org_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_unit_leaders_org_group_id_fkey"
            columns: ["org_group_id"]
            isOneToOne: false
            referencedRelation: "org_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_unit_leaders_org_section_id_fkey"
            columns: ["org_section_id"]
            isOneToOne: false
            referencedRelation: "org_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_unit_leaders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_unit_leaders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_unit_leaders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      products: {
        Row: {
          brand_color_id: string
          brand_gender_size_id: string
          brand_line_id: string
          code: string
          cost_price: number | null
          created_at: string
          created_by: string | null
          gender: string
          id: string
          image_url: string | null
          is_active: boolean
          material: string | null
          name: string
          note: string | null
          release_year: number | null
          sale_price: number | null
          sales_status: string | null
          season: string | null
          sort_order: number
          sub_item_id: string
          thumbnail_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_color_id: string
          brand_gender_size_id: string
          brand_line_id: string
          code: string
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          gender: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          material?: string | null
          name: string
          note?: string | null
          release_year?: number | null
          sale_price?: number | null
          sales_status?: string | null
          season?: string | null
          sort_order?: number
          sub_item_id: string
          thumbnail_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_color_id?: string
          brand_gender_size_id?: string
          brand_line_id?: string
          code?: string
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          gender?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          material?: string | null
          name?: string
          note?: string | null
          release_year?: number | null
          sale_price?: number | null
          sales_status?: string | null
          season?: string | null
          sort_order?: number
          sub_item_id?: string
          thumbnail_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_color_id_fkey"
            columns: ["brand_color_id"]
            isOneToOne: false
            referencedRelation: "brand_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_brand_gender_size_id_fkey"
            columns: ["brand_gender_size_id"]
            isOneToOne: false
            referencedRelation: "brand_gender_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_brand_line_id_fkey"
            columns: ["brand_line_id"]
            isOneToOne: false
            referencedRelation: "brand_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_sub_item_id_fkey"
            columns: ["sub_item_id"]
            isOneToOne: false
            referencedRelation: "sub_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_key: string
          bio: string | null
          created_at: string
          department_id: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string | null
          notify_on_comment: boolean
          notify_on_mention: boolean
          notify_on_reminder: boolean
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
          is_active?: boolean
          name?: string | null
          notify_on_comment?: boolean
          notify_on_mention?: boolean
          notify_on_reminder?: boolean
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
          is_active?: boolean
          name?: string | null
          notify_on_comment?: boolean
          notify_on_mention?: boolean
          notify_on_reminder?: boolean
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
      small_brands: {
        Row: {
          brand_id: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_id: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "small_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "small_brands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "small_brands_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_items: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          item_id: string
          name: string
          note: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          item_id: string
          name: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          item_id?: string
          name?: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_menu_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          menu_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          menu_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          menu_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_menu_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_menu_permissions_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_menu_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      get_org_chart_members: {
        Args: never
        Returns: {
          avatar_key: string
          department_id: string
          id: string
          is_active: boolean
          name: string
          role: string
        }[]
      }
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
      next_master_code: { Args: { p_entity: string }; Returns: string }
      search_mentionable_profiles: {
        Args: { max_results?: number; search_query: string }
        Returns: {
          avatar_key: string
          email: string
          id: string
          name: string
        }[]
      }
      set_user_menu_permissions: {
        Args: { p_menu_ids: string[]; p_user_id: string }
        Returns: undefined
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
      stats_my_work_summary: {
        Args: { author_id_param: string; today_param: string }
        Returns: {
          due_this_week_count: number
          in_progress_count: number
          overdue_count: number
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
