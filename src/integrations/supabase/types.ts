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
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_post_tags: {
        Row: {
          id: string
          post_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          post_id: string
          tag_id: string
        }
        Update: {
          id?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          focus_keyword: string | null
          id: string
          is_deleted: boolean
          meta_description: string | null
          published_at: string | null
          seo_title: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          focus_keyword?: string | null
          id?: string
          is_deleted?: boolean
          meta_description?: string | null
          published_at?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          focus_keyword?: string | null
          id?: string
          is_deleted?: boolean
          meta_description?: string | null
          published_at?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      forecasts: {
        Row: {
          accuracy: number | null
          confidence_interval: number
          created_at: string
          dataset_name: string
          forecast_horizon: number
          frequency: string
          id: string
          mae: number | null
          mape: number | null
          model: string
          parameters: Json
          r2_score: number | null
          results: Json
          rmse: number | null
          status: string
          training_time_ms: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          confidence_interval?: number
          created_at?: string
          dataset_name: string
          forecast_horizon?: number
          frequency?: string
          id?: string
          mae?: number | null
          mape?: number | null
          model: string
          parameters?: Json
          r2_score?: number | null
          results?: Json
          rmse?: number | null
          status?: string
          training_time_ms?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          confidence_interval?: number
          created_at?: string
          dataset_name?: string
          forecast_horizon?: number
          frequency?: string
          id?: string
          mae?: number | null
          mape?: number | null
          model?: string
          parameters?: Json
          r2_score?: number | null
          results?: Json
          rmse?: number | null
          status?: string
          training_time_ms?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mining_history: {
        Row: {
          algorithm: string
          created_at: string
          dataset_name: string | null
          execution_time_ms: number | null
          id: string
          parameters: Json | null
          results_summary: Json | null
          task_type: string
          user_id: string
        }
        Insert: {
          algorithm: string
          created_at?: string
          dataset_name?: string | null
          execution_time_ms?: number | null
          id?: string
          parameters?: Json | null
          results_summary?: Json | null
          task_type: string
          user_id: string
        }
        Update: {
          algorithm?: string
          created_at?: string
          dataset_name?: string | null
          execution_time_ms?: number | null
          id?: string
          parameters?: Json | null
          results_summary?: Json | null
          task_type?: string
          user_id?: string
        }
        Relationships: []
      }
      mining_results: {
        Row: {
          created_at: string
          history_id: string | null
          id: string
          result_data: Json
          result_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          history_id?: string | null
          id?: string
          result_data: Json
          result_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          history_id?: string | null
          id?: string
          result_data?: Json
          result_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mining_results_history_id_fkey"
            columns: ["history_id"]
            isOneToOne: false
            referencedRelation: "mining_history"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_rules: {
        Row: {
          antecedent: string[]
          confidence: number | null
          consequent: string[]
          created_at: string
          history_id: string | null
          id: string
          lift: number | null
          notes: string | null
          rule_name: string | null
          support: number | null
          user_id: string
        }
        Insert: {
          antecedent: string[]
          confidence?: number | null
          consequent: string[]
          created_at?: string
          history_id?: string | null
          id?: string
          lift?: number | null
          notes?: string | null
          rule_name?: string | null
          support?: number | null
          user_id: string
        }
        Update: {
          antecedent?: string[]
          confidence?: number | null
          consequent?: string[]
          created_at?: string
          history_id?: string | null
          id?: string
          lift?: number | null
          notes?: string | null
          rule_name?: string | null
          support?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_rules_history_id_fkey"
            columns: ["history_id"]
            isOneToOne: false
            referencedRelation: "mining_history"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          department: string | null
          description: string | null
          display_order: number
          education: string | null
          email: string | null
          experience: string | null
          facebook_url: string | null
          full_name: string
          github_url: string | null
          id: string
          image_url: string | null
          instagram_url: string | null
          is_active: boolean
          is_featured: boolean
          linkedin_url: string | null
          location: string | null
          phone: string | null
          portfolio_url: string | null
          role: string
          short_bio: string | null
          skills: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          description?: string | null
          display_order?: number
          education?: string | null
          email?: string | null
          experience?: string | null
          facebook_url?: string | null
          full_name: string
          github_url?: string | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          role: string
          short_bio?: string | null
          skills?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string | null
          display_order?: number
          education?: string | null
          email?: string | null
          experience?: string | null
          facebook_url?: string | null
          full_name?: string
          github_url?: string | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          role?: string
          short_bio?: string | null
          skills?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          page_path: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          page_path: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          page_path?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
