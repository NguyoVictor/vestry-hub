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
      accounts_payable: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_url: string | null
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          tenant_id: string
          vendor_name: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          tenant_id: string
          vendor_name: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          tenant_id?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action_type: string
          actor_avatar_url: string | null
          actor_id: string | null
          actor_name: string | null
          created_at: string | null
          description: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          action_type: string
          actor_avatar_url?: string | null
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string | null
          description: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          action_type?: string
          actor_avatar_url?: string | null
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string | null
          description?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_broadcasts: {
        Row: {
          channels: string[] | null
          created_at: string | null
          created_by: string | null
          email_failed_count: number | null
          email_sent_count: number | null
          id: string
          message: string
          priority: string | null
          push_failed_count: number | null
          push_sent_count: number | null
          recipient_ids: string[] | null
          recipient_type: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          tenant_id: string
          total_recipients: number | null
        }
        Insert: {
          channels?: string[] | null
          created_at?: string | null
          created_by?: string | null
          email_failed_count?: number | null
          email_sent_count?: number | null
          id?: string
          message: string
          priority?: string | null
          push_failed_count?: number | null
          push_sent_count?: number | null
          recipient_ids?: string[] | null
          recipient_type?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          tenant_id: string
          total_recipients?: number | null
        }
        Update: {
          channels?: string[] | null
          created_at?: string | null
          created_by?: string | null
          email_failed_count?: number | null
          email_sent_count?: number | null
          id?: string
          message?: string
          priority?: string | null
          push_failed_count?: number | null
          push_sent_count?: number | null
          recipient_ids?: string[] | null
          recipient_type?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          tenant_id?: string
          total_recipients?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_broadcasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_usage: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          input_summary: string | null
          output_length: number | null
          tenant_id: string
          tool_name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          input_summary?: string | null
          output_length?: number | null
          tenant_id: string
          tool_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          input_summary?: string | null
          output_length?: number | null
          tenant_id?: string
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_pinned: boolean | null
          publish_at: string | null
          status: string | null
          target_audience:
            | Database["public"]["Enums"]["announcement_audience_enum"]
            | null
          target_id: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          publish_at?: string | null
          status?: string | null
          target_audience?:
            | Database["public"]["Enums"]["announcement_audience_enum"]
            | null
          target_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          publish_at?: string | null
          status?: string | null
          target_audience?:
            | Database["public"]["Enums"]["announcement_audience_enum"]
            | null
          target_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance: {
        Row: {
          asset_id: string
          completed_date: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string
          id: string
          maintenance_date: string | null
          maintenance_type: string | null
          notes: string | null
          performed_by: string | null
          scheduled_date: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description: string
          id?: string
          maintenance_date?: string | null
          maintenance_type?: string | null
          notes?: string | null
          performed_by?: string | null
          scheduled_date?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string
          id?: string
          maintenance_date?: string | null
          maintenance_type?: string | null
          notes?: string | null
          performed_by?: string | null
          scheduled_date?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "church_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_release_requests: {
        Row: {
          asset_id: string
          created_at: string | null
          date_needed: string | null
          id: string
          notes: string | null
          purpose: string | null
          requested_by: string
          return_date: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          date_needed?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          requested_by: string
          return_date?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          date_needed?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          requested_by?: string
          return_date?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_release_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "church_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_release_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in_method:
            | Database["public"]["Enums"]["checkin_method_enum"]
            | null
          checked_in_at: string | null
          id: string
          member_id: string
          session_id: string
          status: Database["public"]["Enums"]["attendance_status_enum"] | null
        }
        Insert: {
          check_in_method?:
            | Database["public"]["Enums"]["checkin_method_enum"]
            | null
          checked_in_at?: string | null
          id?: string
          member_id: string
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status_enum"] | null
        }
        Update: {
          check_in_method?:
            | Database["public"]["Enums"]["checkin_method_enum"]
            | null
          checked_in_at?: string | null
          id?: string
          member_id?: string
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          is_open: boolean | null
          qr_code_token: string | null
          service_id: string | null
          session_date: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_open?: boolean | null
          qr_code_token?: string | null
          service_id?: string | null
          session_date?: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_open?: boolean | null
          qr_code_token?: string | null
          service_id?: string | null
          session_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_favorites: {
        Row: {
          book: string
          chapter: number
          created_at: string | null
          id: string
          user_id: string
          verse: number
          verse_text: string | null
        }
        Insert: {
          book: string
          chapter: number
          created_at?: string | null
          id?: string
          user_id: string
          verse: number
          verse_text?: string | null
        }
        Update: {
          book?: string
          chapter?: number
          created_at?: string | null
          id?: string
          user_id?: string
          verse?: number
          verse_text?: string | null
        }
        Relationships: []
      }
      bible_highlights: {
        Row: {
          book: string
          chapter: number
          color: string | null
          created_at: string | null
          id: string
          user_id: string
          verse: number
        }
        Insert: {
          book: string
          chapter: number
          color?: string | null
          created_at?: string | null
          id?: string
          user_id: string
          verse: number
        }
        Update: {
          book?: string
          chapter?: number
          color?: string | null
          created_at?: string | null
          id?: string
          user_id?: string
          verse?: number
        }
        Relationships: []
      }
      bible_notes: {
        Row: {
          book: string
          chapter: number
          created_at: string | null
          id: string
          note_text: string
          tenant_id: string
          updated_at: string | null
          user_id: string
          verse: number
        }
        Insert: {
          book: string
          chapter: number
          created_at?: string | null
          id?: string
          note_text: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
          verse: number
        }
        Update: {
          book?: string
          chapter?: number
          created_at?: string | null
          id?: string
          note_text?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
          verse?: number
        }
        Relationships: [
          {
            foreignKeyName: "bible_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      board_meetings: {
        Row: {
          action_items: Json | null
          agenda: string | null
          created_at: string | null
          created_by: string | null
          end_time: string | null
          id: string
          location: string | null
          location_type: string | null
          meeting_date: string
          minutes: string | null
          minutes_content: string | null
          minutes_document_url: string | null
          online_link: string | null
          pre_meeting_notes: string | null
          start_time: string | null
          status: string | null
          tenant_id: string
          title: string
          type: string | null
          venue: string | null
        }
        Insert: {
          action_items?: Json | null
          agenda?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          location_type?: string | null
          meeting_date: string
          minutes?: string | null
          minutes_content?: string | null
          minutes_document_url?: string | null
          online_link?: string | null
          pre_meeting_notes?: string | null
          start_time?: string | null
          status?: string | null
          tenant_id: string
          title: string
          type?: string | null
          venue?: string | null
        }
        Update: {
          action_items?: Json | null
          agenda?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          location_type?: string | null
          meeting_date?: string
          minutes?: string | null
          minutes_content?: string | null
          minutes_document_url?: string | null
          online_link?: string | null
          pre_meeting_notes?: string | null
          start_time?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          type?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_meetings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          branch_password_hash: string | null
          branch_username: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          location: string | null
          name: string
          pastor_id: string | null
          tenant_id: string
        }
        Insert: {
          branch_password_hash?: string | null
          branch_username?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          location?: string | null
          name: string
          pastor_id?: string | null
          tenant_id: string
        }
        Update: {
          branch_password_hash?: string | null
          branch_username?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          location?: string | null
          name?: string
          pastor_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_templates: {
        Row: {
          channels: string[] | null
          created_at: string | null
          id: string
          is_system: boolean | null
          message: string
          name: string
          priority: string | null
          subject: string
          tenant_id: string
        }
        Insert: {
          channels?: string[] | null
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          message: string
          name: string
          priority?: string | null
          subject: string
          tenant_id: string
        }
        Update: {
          channels?: string[] | null
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          message?: string
          name?: string
          priority?: string | null
          subject?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          body: string
          channels: string[]
          created_at: string | null
          delivered_count: number | null
          id: string
          read_count: number | null
          recipient_config: Json | null
          recipient_count: number | null
          recipient_type: string
          scheduled_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
          subject: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          body: string
          channels?: string[]
          created_at?: string | null
          delivered_count?: number | null
          id?: string
          read_count?: number | null
          recipient_config?: Json | null
          recipient_count?: number | null
          recipient_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          channels?: string[]
          created_at?: string | null
          delivered_count?: number | null
          id?: string
          read_count?: number | null
          recipient_config?: Json | null
          recipient_count?: number | null
          recipient_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          allocated_amount: number
          budget_id: string
          category: string
          id: string
          spent_amount: number | null
        }
        Insert: {
          allocated_amount: number
          budget_id: string
          category: string
          id?: string
          spent_amount?: number | null
        }
        Update: {
          allocated_amount?: number
          budget_id?: string
          category?: string
          id?: string
          spent_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          name: string
          period: Database["public"]["Enums"]["budget_period_enum"] | null
          start_date: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          name: string
          period?: Database["public"]["Enums"]["budget_period_enum"] | null
          start_date?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          name?: string
          period?: Database["public"]["Enums"]["budget_period_enum"] | null
          start_date?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      canva_oauth_state: {
        Row: {
          code_verifier: string
          created_at: string | null
          expires_at: string | null
          id: string
          state: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          code_verifier: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          state: string
          tenant_id: string
          user_id: string
        }
        Update: {
          code_verifier?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          state?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      canva_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canva_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string | null
          account_name: string
          account_type: string
          created_at: string | null
          id: string
          is_default: boolean | null
          tenant_id: string
        }
        Insert: {
          account_code?: string | null
          account_name: string
          account_type: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          tenant_id: string
        }
        Update: {
          account_code?: string | null
          account_name?: string
          account_type?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          tenant_id?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          active: boolean
          class_id: string | null
          created_at: string
          date_of_birth: string
          family_id: string | null
          first_name: string
          gender: string | null
          guardian_primary_id: string | null
          guardian_secondary_id: string | null
          id: string
          last_name: string
          photo_url: string | null
          special_needs_notes: string | null
          tenant_id: string
        }
        Insert: {
          active?: boolean
          class_id?: string | null
          created_at?: string
          date_of_birth: string
          family_id?: string | null
          first_name: string
          gender?: string | null
          guardian_primary_id?: string | null
          guardian_secondary_id?: string | null
          id?: string
          last_name: string
          photo_url?: string | null
          special_needs_notes?: string | null
          tenant_id: string
        }
        Update: {
          active?: boolean
          class_id?: string | null
          created_at?: string
          date_of_birth?: string
          family_id?: string | null
          first_name?: string
          gender?: string | null
          guardian_primary_id?: string | null
          guardian_secondary_id?: string | null
          id?: string
          last_name?: string
          photo_url?: string | null
          special_needs_notes?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "children_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_guardian_primary_id_fkey"
            columns: ["guardian_primary_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_guardian_secondary_id_fkey"
            columns: ["guardian_secondary_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      children_checkins: {
        Row: {
          check_in_method: string
          checked_in_at: string
          checked_in_by: string | null
          checked_out_at: string | null
          checked_out_by: string | null
          child_id: string
          created_at: string
          id: string
          notes: string | null
          qr_code_data: string | null
          service_id: string | null
          tenant_id: string
        }
        Insert: {
          check_in_method?: string
          checked_in_at?: string
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          child_id: string
          created_at?: string
          id?: string
          notes?: string | null
          qr_code_data?: string | null
          service_id?: string | null
          tenant_id: string
        }
        Update: {
          check_in_method?: string
          checked_in_at?: string
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          child_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          qr_code_data?: string | null
          service_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_checkins_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_checkins_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_checkins_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_checkins_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      children_classes: {
        Row: {
          active: boolean
          capacity: number | null
          created_at: string
          id: string
          max_age: number
          min_age: number
          name: string
          teacher_id: string | null
          tenant_id: string
        }
        Insert: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          id?: string
          max_age?: number
          min_age?: number
          name: string
          teacher_id?: string | null
          tenant_id: string
        }
        Update: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          id?: string
          max_age?: number
          min_age?: number
          name?: string
          teacher_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_classes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      children_ministry_settings: {
        Row: {
          auto_assign_class_by_age: boolean
          auto_send_qr_on_confirm: boolean
          created_at: string
          email_qr_to_parents: boolean
          id: string
          kiosk_auto_return_seconds: number
          kiosk_idle_timeout_minutes: number
          kiosk_pin: string
          notify_checkin: boolean
          notify_checkout: boolean
          qr_reminder_days_before: number
          send_qr_reminder: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_assign_class_by_age?: boolean
          auto_send_qr_on_confirm?: boolean
          created_at?: string
          email_qr_to_parents?: boolean
          id?: string
          kiosk_auto_return_seconds?: number
          kiosk_idle_timeout_minutes?: number
          kiosk_pin?: string
          notify_checkin?: boolean
          notify_checkout?: boolean
          qr_reminder_days_before?: number
          send_qr_reminder?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_assign_class_by_age?: boolean
          auto_send_qr_on_confirm?: boolean
          created_at?: string
          email_qr_to_parents?: boolean
          id?: string
          kiosk_auto_return_seconds?: number
          kiosk_idle_timeout_minutes?: number
          kiosk_pin?: string
          notify_checkin?: boolean
          notify_checkout?: boolean
          qr_reminder_days_before?: number
          send_qr_reminder?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_ministry_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      children_qr_codes: {
        Row: {
          child_id: string
          created_at: string
          expires_at: string
          id: string
          qr_data: string
          sent_at: string | null
          service_id: string | null
          tenant_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          expires_at: string
          id?: string
          qr_data: string
          sent_at?: string | null
          service_id?: string | null
          tenant_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          qr_data?: string
          sent_at?: string | null
          service_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_qr_codes_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_qr_codes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_qr_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      church_assets: {
        Row: {
          assigned_to: string | null
          category: string | null
          condition: string | null
          created_at: string | null
          depreciation_rate: number | null
          description: string | null
          id: string
          image_path: string | null
          location: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_value: number | null
          quantity: number
          serial_number: string | null
          tenant_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          depreciation_rate?: number | null
          description?: string | null
          id?: string
          image_path?: string | null
          location?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          quantity?: number
          serial_number?: string | null
          tenant_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          depreciation_rate?: number | null
          description?: string | null
          id?: string
          image_path?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          quantity?: number
          serial_number?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "church_assets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "church_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      church_media_items: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          media_type: string
          mime_type: string | null
          storage_path: string | null
          tenant_id: string
          title: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          media_type: string
          mime_type?: string | null
          storage_path?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          media_type?: string
          mime_type?: string | null
          storage_path?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "church_media_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "church_media_items_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_resources: {
        Row: {
          collection_id: string
          id: string
          position: number
          resource_id: string
        }
        Insert: {
          collection_id: string
          id?: string
          position?: number
          resource_id: string
        }
        Update: {
          collection_id?: string
          id?: string
          position?: number
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_resources_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "resource_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "discipleship_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          body: string
          bounced_count: number | null
          channel: Database["public"]["Enums"]["comm_channel_enum"]
          created_at: string | null
          created_by: string | null
          delivered_count: number | null
          id: string
          is_test: boolean | null
          opened_count: number | null
          recipient_count: number | null
          recipient_ids: string[] | null
          recipient_type:
            | Database["public"]["Enums"]["comm_recipient_enum"]
            | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: Database["public"]["Enums"]["comm_status_enum"] | null
          subject: string | null
          tenant_id: string
        }
        Insert: {
          body: string
          bounced_count?: number | null
          channel: Database["public"]["Enums"]["comm_channel_enum"]
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          id?: string
          is_test?: boolean | null
          opened_count?: number | null
          recipient_count?: number | null
          recipient_ids?: string[] | null
          recipient_type?:
            | Database["public"]["Enums"]["comm_recipient_enum"]
            | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: Database["public"]["Enums"]["comm_status_enum"] | null
          subject?: string | null
          tenant_id: string
        }
        Update: {
          body?: string
          bounced_count?: number | null
          channel?: Database["public"]["Enums"]["comm_channel_enum"]
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          id?: string
          is_test?: boolean | null
          opened_count?: number | null
          recipient_count?: number | null
          recipient_ids?: string[] | null
          recipient_type?:
            | Database["public"]["Enums"]["comm_recipient_enum"]
            | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: Database["public"]["Enums"]["comm_status_enum"] | null
          subject?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          unread_count: number | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          unread_count?: number | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          unread_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_forum: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          name: string | null
          status: string | null
          tenant_id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_forum?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_forum?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      convert_checkins: {
        Row: {
          checkin_date: string | null
          conducted_by: string | null
          convert_id: string
          created_at: string | null
          id: string
          next_checkin_date: string | null
          notes: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          checkin_date?: string | null
          conducted_by?: string | null
          convert_id: string
          created_at?: string | null
          id?: string
          next_checkin_date?: string | null
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          checkin_date?: string | null
          conducted_by?: string | null
          convert_id?: string
          created_at?: string | null
          id?: string
          next_checkin_date?: string | null
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convert_checkins_convert_id_fkey"
            columns: ["convert_id"]
            isOneToOne: false
            referencedRelation: "new_converts"
            referencedColumns: ["id"]
          },
        ]
      }
      convert_stage_history: {
        Row: {
          advanced_at: string | null
          advanced_by: string | null
          convert_id: string
          from_stage: number | null
          id: string
          notes: string | null
          stage: number | null
          tenant_id: string | null
          to_stage: number
          updated_at: string | null
        }
        Insert: {
          advanced_at?: string | null
          advanced_by?: string | null
          convert_id: string
          from_stage?: number | null
          id?: string
          notes?: string | null
          stage?: number | null
          tenant_id?: string | null
          to_stage: number
          updated_at?: string | null
        }
        Update: {
          advanced_at?: string | null
          advanced_by?: string | null
          convert_id?: string
          from_stage?: number | null
          id?: string
          notes?: string | null
          stage?: number | null
          tenant_id?: string | null
          to_stage?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convert_stage_history_convert_id_fkey"
            columns: ["convert_id"]
            isOneToOne: false
            referencedRelation: "new_converts"
            referencedColumns: ["id"]
          },
        ]
      }
      course_comments: {
        Row: {
          comment: string
          course_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment: string
          course_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment?: string
          course_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_comments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          course_id: string
          enrolled_at: string | null
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id: string
          enrolled_at?: string | null
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string | null
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          device_type: string | null
          id: string
          tenant_id: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          tenant_id: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          tenant_id?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discipleship_pathways: {
        Row: {
          created_at: string | null
          id: string
          name: string
          stages: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          stages?: Json
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          stages?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discipleship_pathways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      discipleship_resources: {
        Row: {
          assignment_count: number | null
          author: string | null
          category: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_label: string | null
          duration_minutes: number | null
          external_url: string | null
          file_url: string | null
          id: string
          is_downloadable: boolean | null
          is_published: boolean | null
          is_required: boolean | null
          lesson_content: string | null
          recommended_stages: number[] | null
          resource_type: string | null
          sequence_order: number | null
          tags: string[] | null
          tenant_id: string
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          assignment_count?: number | null
          author?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_label?: string | null
          duration_minutes?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_downloadable?: boolean | null
          is_published?: boolean | null
          is_required?: boolean | null
          lesson_content?: string | null
          recommended_stages?: number[] | null
          resource_type?: string | null
          sequence_order?: number | null
          tags?: string[] | null
          tenant_id: string
          thumbnail_url?: string | null
          title: string
          type?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          assignment_count?: number | null
          author?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_label?: string | null
          duration_minutes?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_downloadable?: boolean | null
          is_published?: boolean | null
          is_required?: boolean | null
          lesson_content?: string | null
          recommended_stages?: number[] | null
          resource_type?: string | null
          sequence_order?: number | null
          tags?: string[] | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discipleship_resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipleship_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipleship_resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_automations: {
        Row: {
          audience: string | null
          automation_key: string
          config: Json | null
          created_at: string | null
          description: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string | null
          template_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          audience?: string | null
          automation_key: string
          config?: Json | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string | null
          template_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          audience?: string | null
          automation_key?: string
          config?: Json | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string | null
          template_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_automations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_branding: {
        Row: {
          button_color: string
          created_at: string
          email_signature: string | null
          footer_text: string | null
          id: string
          logo_url: string | null
          primary_color: string
          sender_name: string | null
          sender_photo_url: string | null
          tenant_id: string
          text_color: string
          updated_at: string
        }
        Insert: {
          button_color?: string
          created_at?: string
          email_signature?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          sender_name?: string | null
          sender_photo_url?: string | null
          tenant_id: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          button_color?: string
          created_at?: string
          email_signature?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          sender_name?: string | null
          sender_photo_url?: string | null
          tenant_id?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_quotas: {
        Row: {
          id: string
          lifetime_sent: number | null
          monthly_sent: number | null
          quota_reset_at: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          lifetime_sent?: number | null
          monthly_sent?: number | null
          quota_reset_at?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          lifetime_sent?: number | null
          monthly_sent?: number | null
          quota_reset_at?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_quotas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          category_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          subject: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          subject: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          subject?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "email_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          event_id: string
          id: string
          member_id: string
          registered_at: string | null
        }
        Insert: {
          event_id: string
          id?: string
          member_id: string
          registered_at?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          member_id?: string
          registered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string | null
          email: string | null
          event_id: string
          id: string
          member_id: string | null
          name: string | null
          notes: string | null
          phone: string | null
          rsvp_source: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          event_id: string
          id?: string
          member_id?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          rsvp_source?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          event_id?: string
          id?: string
          member_id?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          rsvp_source?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          allow_rsvp: boolean | null
          banner_image_url: string | null
          branch_id: string | null
          budget: number | null
          capacity_limit: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          is_all_day: boolean | null
          is_published: boolean | null
          location: string | null
          location_type: string | null
          online_link: string | null
          organizer_id: string | null
          registration_deadline: string | null
          show_on_public_page: boolean | null
          start_time: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string
          title: string
          type: string | null
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          allow_rsvp?: boolean | null
          banner_image_url?: string | null
          branch_id?: string | null
          budget?: number | null
          capacity_limit?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          is_all_day?: boolean | null
          is_published?: boolean | null
          location?: string | null
          location_type?: string | null
          online_link?: string | null
          organizer_id?: string | null
          registration_deadline?: string | null
          show_on_public_page?: boolean | null
          start_time?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id: string
          title: string
          type?: string | null
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          allow_rsvp?: boolean | null
          banner_image_url?: string | null
          branch_id?: string | null
          budget?: number | null
          capacity_limit?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          is_all_day?: boolean | null
          is_published?: boolean | null
          location?: string | null
          location_type?: string | null
          online_link?: string | null
          organizer_id?: string | null
          registration_deadline?: string | null
          show_on_public_page?: boolean | null
          start_time?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string
          title?: string
          type?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          budget_category_id: string | null
          category: string | null
          created_at: string | null
          currency: string | null
          description: string
          expense_date: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          receipt_url: string | null
          recorded_by: string | null
          recurrence_frequency: string | null
          rejection_reason: string | null
          tenant_id: string
          title: string | null
          updated_at: string | null
          vendor: string | null
          vendor_email: string | null
          vendor_phone: string | null
        }
        Insert: {
          amount: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          budget_category_id?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description: string
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          recurrence_frequency?: string | null
          rejection_reason?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string | null
          vendor?: string | null
          vendor_email?: string | null
          vendor_phone?: string | null
        }
        Update: {
          amount?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          budget_category_id?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          recurrence_frequency?: string | null
          rejection_reason?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
          vendor?: string | null
          vendor_email?: string | null
          vendor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          amenities: string[] | null
          booker_contact_person: string | null
          booker_email: string | null
          booker_name: string | null
          booker_org_name: string | null
          booker_phone: string | null
          booker_type: string | null
          capacity: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          photo_url: string | null
          quotation: number | null
          tenant_id: string
          thumbnail_path: string | null
          type: string | null
          updated_at: string | null
          video_path: string | null
        }
        Insert: {
          amenities?: string[] | null
          booker_contact_person?: string | null
          booker_email?: string | null
          booker_name?: string | null
          booker_org_name?: string | null
          booker_phone?: string | null
          booker_type?: string | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          photo_url?: string | null
          quotation?: number | null
          tenant_id: string
          thumbnail_path?: string | null
          type?: string | null
          updated_at?: string | null
          video_path?: string | null
        }
        Update: {
          amenities?: string[] | null
          booker_contact_person?: string | null
          booker_email?: string | null
          booker_name?: string | null
          booker_org_name?: string | null
          booker_phone?: string | null
          booker_type?: string | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          photo_url?: string | null
          quotation?: number | null
          tenant_id?: string
          thumbnail_path?: string | null
          type?: string | null
          updated_at?: string | null
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_booking_responses: {
        Row: {
          body: string | null
          booking_id: string | null
          channel: string
          created_at: string
          from_address: string | null
          id: string
          is_read: boolean
          tenant_id: string
        }
        Insert: {
          body?: string | null
          booking_id?: string | null
          channel: string
          created_at?: string
          from_address?: string | null
          id: string
          is_read?: boolean
          tenant_id: string
        }
        Update: {
          body?: string | null
          booking_id?: string | null
          channel?: string
          created_at?: string
          from_address?: string | null
          id?: string
          is_read?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_booking_responses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "facility_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_bookings: {
        Row: {
          admin_deleted_at: string | null
          approved_at: string | null
          approved_by: string | null
          booked_by: string | null
          booker_contact_person: string | null
          booker_email: string | null
          booker_name: string | null
          booker_org_name: string | null
          booker_phone: string | null
          booker_type: string | null
          booking_date: string
          booking_number: string | null
          booking_reference: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          end_time: string | null
          equipment_needed: string[] | null
          expected_attendees: number | null
          external_email: string | null
          external_name: string | null
          external_org: string | null
          external_phone: string | null
          facility_id: string | null
          facility_name: string
          id: string
          notes: string | null
          purpose: string | null
          rejection_reason: string | null
          setup_notes: string | null
          setup_required: boolean | null
          source: string
          start_time: string | null
          status: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id: string
        }
        Insert: {
          admin_deleted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          booked_by?: string | null
          booker_contact_person?: string | null
          booker_email?: string | null
          booker_name?: string | null
          booker_org_name?: string | null
          booker_phone?: string | null
          booker_type?: string | null
          booking_date: string
          booking_number?: string | null
          booking_reference?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          end_time?: string | null
          equipment_needed?: string[] | null
          expected_attendees?: number | null
          external_email?: string | null
          external_name?: string | null
          external_org?: string | null
          external_phone?: string | null
          facility_id?: string | null
          facility_name: string
          id?: string
          notes?: string | null
          purpose?: string | null
          rejection_reason?: string | null
          setup_notes?: string | null
          setup_required?: boolean | null
          source?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id: string
        }
        Update: {
          admin_deleted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          booked_by?: string | null
          booker_contact_person?: string | null
          booker_email?: string | null
          booker_name?: string | null
          booker_org_name?: string | null
          booker_phone?: string | null
          booker_type?: string | null
          booking_date?: string
          booking_number?: string | null
          booking_reference?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          end_time?: string | null
          equipment_needed?: string[] | null
          expected_attendees?: number | null
          external_email?: string | null
          external_name?: string | null
          external_org?: string | null
          external_phone?: string | null
          facility_id?: string | null
          facility_name?: string
          id?: string
          notes?: string | null
          purpose?: string | null
          rejection_reason?: string | null
          setup_notes?: string | null
          setup_required?: boolean | null
          source?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_images: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          image_path: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          image_path: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          image_path?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_images_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_responses: {
        Row: {
          created_at: string
          facility_id: string | null
          id: string
          message: string
          raw_payload: Json | null
          respondent_email: string | null
          respondent_name: string
          respondent_org: string | null
          respondent_phone: string | null
          source: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          facility_id?: string | null
          id?: string
          message: string
          raw_payload?: Json | null
          respondent_email?: string | null
          respondent_name: string
          respondent_org?: string | null
          respondent_phone?: string | null
          source?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          facility_id?: string | null
          id?: string
          message?: string
          raw_payload?: Json | null
          respondent_email?: string | null
          respondent_name?: string
          respondent_org?: string | null
          respondent_phone?: string | null
          source?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_responses_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      families: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          head_of_household_id: string | null
          id: string
          name: string
          postal_code: string | null
          state: string | null
          street: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at: string
          head_of_household_id?: string | null
          id: string
          name: string
          postal_code?: string | null
          state?: string | null
          street?: string | null
          tenant_id: string
          updated_at: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          head_of_household_id?: string | null
          id?: string
          name?: string
          postal_code?: string | null
          state?: string | null
          street?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          birth_day: number | null
          birth_month: number | null
          birth_year: number | null
          classification: string | null
          family_id: string
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          member_id: string | null
          middle_name: string | null
          relationship: string
          role: string | null
          suffix: string | null
        }
        Insert: {
          birth_day?: number | null
          birth_month?: number | null
          birth_year?: number | null
          classification?: string | null
          family_id: string
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          member_id?: string | null
          middle_name?: string | null
          relationship?: string
          role?: string | null
          suffix?: string | null
        }
        Update: {
          birth_day?: number | null
          birth_month?: number | null
          birth_year?: number | null
          classification?: string | null
          family_id?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          member_id?: string | null
          middle_name?: string | null
          relationship?: string
          role?: string | null
          suffix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_permissions: {
        Row: {
          access_level: string
          created_at: string
          feature: string
          id: string
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          feature: string
          id?: string
          role: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          feature?: string
          id?: string
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      fellowship_members: {
        Row: {
          fellowship_id: string
          id: string
          joined_at: string | null
          member_id: string
          tenant_id: string
        }
        Insert: {
          fellowship_id: string
          id?: string
          joined_at?: string | null
          member_id: string
          tenant_id: string
        }
        Update: {
          fellowship_id?: string
          id?: string
          joined_at?: string | null
          member_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fellowship_members_fellowship_id_fkey"
            columns: ["fellowship_id"]
            isOneToOne: false
            referencedRelation: "house_fellowships"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority_enum"] | null
          related_convert_id: string | null
          related_member_id: string | null
          related_visitor_id: string | null
          status: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority_enum"] | null
          related_convert_id?: string | null
          related_member_id?: string | null
          related_visitor_id?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority_enum"] | null
          related_convert_id?: string | null
          related_member_id?: string | null
          related_visitor_id?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_tasks_related_convert_id_fkey"
            columns: ["related_convert_id"]
            isOneToOne: false
            referencedRelation: "new_converts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_related_visitor_id_fkey"
            columns: ["related_visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          fund_id: string
          id: string
          reference_id: string | null
          reference_type: string | null
          running_balance: number | null
          tenant_id: string
          transaction_date: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fund_id: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number | null
          tenant_id: string
          transaction_date?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fund_id?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number | null
          tenant_id?: string
          transaction_date?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_transactions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      funds: {
        Row: {
          balance: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      giving_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          giving_record_id: string
          id: string
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          giving_record_id: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          giving_record_id?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "giving_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giving_audit_log_giving_record_id_fkey"
            columns: ["giving_record_id"]
            isOneToOne: false
            referencedRelation: "giving_records"
            referencedColumns: ["id"]
          },
        ]
      }
      giving_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      giving_records: {
        Row: {
          amount: number
          campaign_id: string | null
          category: string | null
          created_at: string | null
          currency: string | null
          donor_name: string | null
          fund_id: string | null
          given_at: string
          giving_type: Database["public"]["Enums"]["giving_type_enum"]
          id: string
          is_anonymous: boolean | null
          member_id: string | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          pesapal_transaction_id: string | null
          pledge_id: string | null
          receipt_number: string | null
          receipt_url: string | null
          recorded_by: string | null
          tenant_id: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          donor_name?: string | null
          fund_id?: string | null
          given_at?: string
          giving_type: Database["public"]["Enums"]["giving_type_enum"]
          id?: string
          is_anonymous?: boolean | null
          member_id?: string | null
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          pesapal_transaction_id?: string | null
          pledge_id?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          tenant_id: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          donor_name?: string | null
          fund_id?: string | null
          given_at?: string
          giving_type?: Database["public"]["Enums"]["giving_type_enum"]
          id?: string
          is_anonymous?: boolean | null
          member_id?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          pesapal_transaction_id?: string | null
          pledge_id?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          tenant_id?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "giving_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giving_records_pledge_id_fkey"
            columns: ["pledge_id"]
            isOneToOne: false
            referencedRelation: "pledges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giving_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giving_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string | null
          member_id: string
          role: string | null
          tenant_id: string | null
        }
        Insert: {
          group_id: string
          joined_at?: string | null
          member_id: string
          role?: string | null
          tenant_id?: string | null
        }
        Update: {
          group_id?: string
          joined_at?: string | null
          member_id?: string
          role?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          group_type: string | null
          id: string
          is_active: boolean | null
          last_meeting_date: string | null
          leader_id: string | null
          meeting_day: string | null
          meeting_location: string | null
          meeting_schedule: string | null
          meeting_time: string | null
          name: string
          tenant_id: string
          type: Database["public"]["Enums"]["group_type_enum"] | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          group_type?: string | null
          id?: string
          is_active?: boolean | null
          last_meeting_date?: string | null
          leader_id?: string | null
          meeting_day?: string | null
          meeting_location?: string | null
          meeting_schedule?: string | null
          meeting_time?: string | null
          name: string
          tenant_id: string
          type?: Database["public"]["Enums"]["group_type_enum"] | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          group_type?: string | null
          id?: string
          is_active?: boolean | null
          last_meeting_date?: string | null
          leader_id?: string | null
          meeting_day?: string | null
          meeting_location?: string | null
          meeting_schedule?: string | null
          meeting_time?: string | null
          name?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["group_type_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      house_fellowships: {
        Row: {
          created_at: string | null
          host_address: string | null
          host_name: string | null
          id: string
          is_active: boolean | null
          leader_id: string | null
          max_capacity: number | null
          meeting_day: string | null
          meeting_time: string | null
          name: string
          notes: string | null
          tenant_id: string
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          created_at?: string | null
          host_address?: string | null
          host_name?: string | null
          id?: string
          is_active?: boolean | null
          leader_id?: string | null
          max_capacity?: number | null
          meeting_day?: string | null
          meeting_time?: string | null
          name: string
          notes?: string | null
          tenant_id: string
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          created_at?: string | null
          host_address?: string | null
          host_name?: string | null
          id?: string
          is_active?: boolean | null
          leader_id?: string | null
          max_capacity?: number | null
          meeting_day?: string | null
          meeting_time?: string | null
          name?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      incident_updates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          incident_id: string
          status_at_time: string | null
          update_text: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          incident_id: string
          status_at_time?: string | null
          update_text: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          incident_id?: string
          status_at_time?: string | null
          update_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          incident_date: string
          incident_type: string
          persons_involved: string | null
          reported_by: string | null
          resolution_notes: string | null
          status: Database["public"]["Enums"]["incident_status_enum"] | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          incident_date?: string
          incident_type: string
          persons_involved?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["incident_status_enum"] | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          incident_date?: string
          incident_type?: string
          persons_involved?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["incident_status_enum"] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          created_at: string | null
          credentials: Json | null
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          provider: Database["public"]["Enums"]["integration_provider_enum"]
          tenant_id: string
          test_status: Database["public"]["Enums"]["test_status_enum"] | null
        }
        Insert: {
          created_at?: string | null
          credentials?: Json | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          provider: Database["public"]["Enums"]["integration_provider_enum"]
          tenant_id: string
          test_status?: Database["public"]["Enums"]["test_status_enum"] | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          provider?: Database["public"]["Enums"]["integration_provider_enum"]
          tenant_id?: string
          test_status?: Database["public"]["Enums"]["test_status_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          document_url: string | null
          due_date: string
          id: string
          invoice_number: string | null
          issue_date: string | null
          line_items: Json
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_terms: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          tax_percent: number | null
          tenant_id: string
          total_amount: number
          updated_at: string | null
          vendor_email: string | null
          vendor_name: string
          vendor_phone: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          document_url?: string | null
          due_date: string
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_terms?: string | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          tax_percent?: number | null
          tenant_id: string
          total_amount: number
          updated_at?: string | null
          vendor_email?: string | null
          vendor_name: string
          vendor_phone?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          document_url?: string | null
          due_date?: string
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_terms?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_percent?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string | null
          vendor_email?: string | null
          vendor_name?: string
          vendor_phone?: string | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          entry_date: string | null
          id: string
          journal_number: string | null
          reference: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          entry_date?: string | null
          id?: string
          journal_number?: string | null
          reference?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          entry_date?: string | null
          id?: string
          journal_number?: string | null
          reference?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          id: string
          journal_entry_id: string
          notes: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          id?: string
          journal_entry_id: string
          notes?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          id?: string
          journal_entry_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string
          entry_date: string
          fund_id: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description: string
          entry_date?: string
          fund_id?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string
          entry_date?: string
          fund_id?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_signatures: {
        Row: {
          agreement_key: string
          agreement_name: string
          created_at: string
          id: string
          ip_address: string | null
          signature_data: string
          signature_type: string
          signed_at: string
          signer_email: string
          signer_name: string
          signer_title: string
          tenant_id: string
        }
        Insert: {
          agreement_key: string
          agreement_name: string
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_data: string
          signature_type?: string
          signed_at?: string
          signer_email: string
          signer_name: string
          signer_title: string
          tenant_id: string
        }
        Update: {
          agreement_key?: string
          agreement_name?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_data?: string
          signature_type?: string
          signed_at?: string
          signer_email?: string
          signer_name?: string
          signer_title?: string
          tenant_id?: string
        }
        Relationships: []
      }
      lesson_completions: {
        Row: {
          completed_at: string | null
          course_id: string
          enrollment_id: string
          id: string
          lesson_index: number
          module_index: number
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrollment_id: string
          id?: string
          lesson_index: number
          module_index: number
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrollment_id?: string
          id?: string
          lesson_index?: number
          module_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "course_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      livestreams: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          chat_embed_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          embed_url: string | null
          estimated_duration: number | null
          id: string
          linked_event_id: string | null
          linked_service_id: string | null
          notify_members: boolean | null
          platform: string
          scheduled_start: string | null
          show_on_public_page: boolean | null
          status: string | null
          stream_key: string | null
          stream_url: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          chat_embed_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          embed_url?: string | null
          estimated_duration?: number | null
          id?: string
          linked_event_id?: string | null
          linked_service_id?: string | null
          notify_members?: boolean | null
          platform: string
          scheduled_start?: string | null
          show_on_public_page?: boolean | null
          status?: string | null
          stream_key?: string | null
          stream_url: string
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          chat_embed_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          embed_url?: string | null
          estimated_duration?: number | null
          id?: string
          linked_event_id?: string | null
          linked_service_id?: string | null
          notify_members?: boolean | null
          platform?: string
          scheduled_start?: string | null
          show_on_public_page?: boolean | null
          status?: string | null
          stream_key?: string | null
          stream_url?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "livestreams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      login_events: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          location: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      media_albums: {
        Row: {
          cover_photo_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          linked_event_id: string | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          cover_photo_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          linked_event_id?: string | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          cover_photo_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          linked_event_id?: string | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_albums_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          created_at: string | null
          file_size: number | null
          file_type: string
          file_url: string
          folder_id: string | null
          height: number | null
          id: string
          name: string
          tags: string[] | null
          tenant_id: string
          updated_at: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          folder_id?: string | null
          height?: number | null
          id?: string
          name: string
          tags?: string[] | null
          tenant_id: string
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          folder_id?: string | null
          height?: number | null
          id?: string
          name?: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_folders: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          parent_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          parent_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_photos: {
        Row: {
          album_id: string | null
          caption: string | null
          created_at: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          height: number | null
          id: string
          tenant_id: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          album_id?: string | null
          caption?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          height?: number | null
          id?: string
          tenant_id: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          album_id?: string | null
          caption?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          height?: number | null
          id?: string
          tenant_id?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "media_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_items: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          meeting_id: string
          status: string | null
          task_description: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          meeting_id: string
          status?: string | null
          task_description?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          meeting_id?: string
          status?: string | null
          task_description?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meeting_attendees: {
        Row: {
          attendance_status: string | null
          id: string
          is_present: boolean | null
          meeting_id: string
          member_id: string
          tenant_id: string | null
        }
        Insert: {
          attendance_status?: string | null
          id?: string
          is_present?: boolean | null
          meeting_id: string
          member_id: string
          tenant_id?: string | null
        }
        Update: {
          attendance_status?: string | null
          id?: string
          is_present?: boolean | null
          meeting_id?: string
          member_id?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      meeting_decisions: {
        Row: {
          created_at: string | null
          decision_text: string
          id: string
          meeting_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decision_text?: string
          id?: string
          meeting_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decision_text?: string
          id?: string
          meeting_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "board_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_minutes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          meeting_id: string
          minutes_text: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          meeting_id: string
          minutes_text?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          meeting_id?: string
          minutes_text?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "board_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      member_permission_overrides: {
        Row: {
          access_level: string
          created_at: string
          feature: string
          id: string
          member_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          feature: string
          id?: string
          member_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          feature?: string
          id?: string
          member_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_permission_overrides_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_request_notes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          note: string
          request_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note: string
          request_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string
          request_id?: string
        }
        Relationships: []
      }
      member_requests: {
        Row: {
          assigned_to: string | null
          attachment_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_confidential: boolean | null
          member_id: string
          priority: string | null
          request_type: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id: string
          title: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachment_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_confidential?: boolean | null
          member_id: string
          priority?: string | null
          request_type: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id: string
          title?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachment_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_confidential?: boolean | null
          member_id?: string
          priority?: string | null
          request_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      member_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          member_id: string
          session_token: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          member_id: string
          session_token: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          member_id?: string
          session_token?: string
          tenant_id?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          avatar_url: string | null
          baptism_date: string | null
          baptized: boolean | null
          city: string | null
          communication_prefs: Json | null
          country: string | null
          created_at: string
          custom_fields: Json | null
          date_of_birth: string | null
          department: string | null
          discipleship_stage: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          family_id: string | null
          first_name: string | null
          gender: string | null
          id: string
          id_number: string | null
          is_counselor: boolean | null
          join_date: string | null
          last_name: string | null
          marital_status:
            | Database["public"]["Enums"]["marital_status_enum"]
            | null
          member_type: string | null
          membership_number: string
          membership_status: string | null
          nationality: string | null
          notes: string | null
          occupation: string | null
          pastoral_notes: string | null
          phone: string | null
          portal_last_seen: string | null
          postal_code: string | null
          registration_source: string | null
          salvation_date: string | null
          secondary_phone: string | null
          skills: string[] | null
          state: string | null
          status: string | null
          street: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          baptism_date?: string | null
          baptized?: boolean | null
          city?: string | null
          communication_prefs?: Json | null
          country?: string | null
          created_at: string
          custom_fields?: Json | null
          date_of_birth?: string | null
          department?: string | null
          discipleship_stage?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          family_id?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          id_number?: string | null
          is_counselor?: boolean | null
          join_date?: string | null
          last_name?: string | null
          marital_status?:
            | Database["public"]["Enums"]["marital_status_enum"]
            | null
          member_type?: string | null
          membership_number: string
          membership_status?: string | null
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          pastoral_notes?: string | null
          phone?: string | null
          portal_last_seen?: string | null
          postal_code?: string | null
          registration_source?: string | null
          salvation_date?: string | null
          secondary_phone?: string | null
          skills?: string[] | null
          state?: string | null
          status?: string | null
          street?: string | null
          tenant_id: string
          updated_at: string
        }
        Update: {
          avatar_url?: string | null
          baptism_date?: string | null
          baptized?: boolean | null
          city?: string | null
          communication_prefs?: Json | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          date_of_birth?: string | null
          department?: string | null
          discipleship_stage?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          family_id?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          id_number?: string | null
          is_counselor?: boolean | null
          join_date?: string | null
          last_name?: string | null
          marital_status?:
            | Database["public"]["Enums"]["marital_status_enum"]
            | null
          member_type?: string | null
          membership_number?: string
          membership_status?: string | null
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          pastoral_notes?: string | null
          phone?: string | null
          portal_last_seen?: string | null
          postal_code?: string | null
          registration_source?: string | null
          salvation_date?: string | null
          secondary_phone?: string | null
          skills?: string[] | null
          state?: string | null
          status?: string | null
          street?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          body: string
          conversation_id: string | null
          created_at: string | null
          group_id: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          tenant_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body: string
          conversation_id?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          tenant_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string
          conversation_id?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      new_converts: {
        Row: {
          baptism_date: string | null
          baptism_status: string | null
          conversion_date: string | null
          counsellor_id: string | null
          counsellor_name: string | null
          created_at: string | null
          discipleship_stage: string | null
          email: string | null
          first_name: string | null
          graduated_at: string | null
          graduation_date: string | null
          id: string
          last_name: string | null
          member_id: string | null
          mentor_id: string | null
          notes: string | null
          phone: string | null
          salvation_date: string | null
          tenant_id: string
          updated_at: string | null
          visitor_id: string | null
        }
        Insert: {
          baptism_date?: string | null
          baptism_status?: string | null
          conversion_date?: string | null
          counsellor_id?: string | null
          counsellor_name?: string | null
          created_at?: string | null
          discipleship_stage?: string | null
          email?: string | null
          first_name?: string | null
          graduated_at?: string | null
          graduation_date?: string | null
          id?: string
          last_name?: string | null
          member_id?: string | null
          mentor_id?: string | null
          notes?: string | null
          phone?: string | null
          salvation_date?: string | null
          tenant_id: string
          updated_at?: string | null
          visitor_id?: string | null
        }
        Update: {
          baptism_date?: string | null
          baptism_status?: string | null
          conversion_date?: string | null
          counsellor_id?: string | null
          counsellor_name?: string | null
          created_at?: string | null
          discipleship_stage?: string | null
          email?: string | null
          first_name?: string | null
          graduated_at?: string | null
          graduation_date?: string | null
          id?: string
          last_name?: string | null
          member_id?: string | null
          mentor_id?: string | null
          notes?: string | null
          phone?: string | null
          salvation_date?: string | null
          tenant_id?: string
          updated_at?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_converts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "new_converts_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_member_request: boolean | null
          email_new_donation: boolean | null
          email_new_event: boolean | null
          email_new_member: boolean | null
          email_new_visitor: boolean | null
          email_weekly_digest: boolean | null
          email_weekly_summary: boolean | null
          id: string
          inapp_member_request: boolean | null
          inapp_new_donation: boolean | null
          inapp_new_event: boolean | null
          inapp_new_member: boolean | null
          inapp_new_visitor: boolean | null
          inapp_weekly_digest: boolean | null
          inapp_weekly_summary: boolean | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          email_member_request?: boolean | null
          email_new_donation?: boolean | null
          email_new_event?: boolean | null
          email_new_member?: boolean | null
          email_new_visitor?: boolean | null
          email_weekly_digest?: boolean | null
          email_weekly_summary?: boolean | null
          id?: string
          inapp_member_request?: boolean | null
          inapp_new_donation?: boolean | null
          inapp_new_event?: boolean | null
          inapp_new_member?: boolean | null
          inapp_new_visitor?: boolean | null
          inapp_weekly_digest?: boolean | null
          inapp_weekly_summary?: boolean | null
          tenant_id: string
          user_id: string
        }
        Update: {
          email_member_request?: boolean | null
          email_new_donation?: boolean | null
          email_new_event?: boolean | null
          email_new_member?: boolean | null
          email_new_visitor?: boolean | null
          email_weekly_digest?: boolean | null
          email_weekly_summary?: boolean | null
          id?: string
          inapp_member_request?: boolean | null
          inapp_new_donation?: boolean | null
          inapp_new_event?: boolean | null
          inapp_new_member?: boolean | null
          inapp_new_visitor?: boolean | null
          inapp_weekly_digest?: boolean | null
          inapp_weekly_summary?: boolean | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          task_id: string | null
          tenant_id: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          task_id?: string | null
          tenant_id: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          task_id?: string | null
          tenant_id?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "follow_up_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          id: string
          steps_completed: Json | null
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          steps_completed?: Json | null
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          steps_completed?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          digital_file_url: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_type: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          digital_file_url?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_type: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          digital_file_url?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_type?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_activities: {
        Row: {
          activity_date: string
          beneficiary_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          follow_up_count: number | null
          follow_up_required: boolean | null
          id: string
          led_by: string | null
          location: string | null
          materials_distributed: string | null
          name: string | null
          outcomes: string | null
          people_reached: number | null
          photo_urls: Json | null
          report: string | null
          salvations: number | null
          start_time: string | null
          status: string | null
          target_community: string | null
          team_leader_id: string | null
          tenant_id: string
          title: string
          type: string | null
          updated_at: string | null
          visitors_captured: number | null
          volunteer_ids: Json | null
        }
        Insert: {
          activity_date: string
          beneficiary_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          follow_up_count?: number | null
          follow_up_required?: boolean | null
          id?: string
          led_by?: string | null
          location?: string | null
          materials_distributed?: string | null
          name?: string | null
          outcomes?: string | null
          people_reached?: number | null
          photo_urls?: Json | null
          report?: string | null
          salvations?: number | null
          start_time?: string | null
          status?: string | null
          target_community?: string | null
          team_leader_id?: string | null
          tenant_id: string
          title: string
          type?: string | null
          updated_at?: string | null
          visitors_captured?: number | null
          volunteer_ids?: Json | null
        }
        Update: {
          activity_date?: string
          beneficiary_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          follow_up_count?: number | null
          follow_up_required?: boolean | null
          id?: string
          led_by?: string | null
          location?: string | null
          materials_distributed?: string | null
          name?: string | null
          outcomes?: string | null
          people_reached?: number | null
          photo_urls?: Json | null
          report?: string | null
          salvations?: number | null
          start_time?: string | null
          status?: string | null
          target_community?: string | null
          team_leader_id?: string | null
          tenant_id?: string
          title?: string
          type?: string | null
          updated_at?: string | null
          visitors_captured?: number | null
          volunteer_ids?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_activities_led_by_fkey"
            columns: ["led_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          notes: string | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          recipient_id: string | null
          recipient_name: string
          reference: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          recipient_id?: string | null
          recipient_name: string
          reference?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          recipient_id?: string | null
          recipient_name?: string
          reference?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_payments: {
        Row: {
          created_at: string | null
          deductions_breakdown: Json
          gross_amount: number
          id: string
          net_amount: number
          payment_method: string | null
          payment_reference: string | null
          payroll_run_id: string
          payroll_staff_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          deductions_breakdown: Json
          gross_amount: number
          id?: string
          net_amount: number
          payment_method?: string | null
          payment_reference?: string | null
          payroll_run_id: string
          payroll_staff_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          deductions_breakdown?: Json
          gross_amount?: number
          id?: string
          net_amount?: number
          payment_method?: string | null
          payment_reference?: string | null
          payroll_run_id?: string
          payroll_staff_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payments_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payments_payroll_staff_id_fkey"
            columns: ["payroll_staff_id"]
            isOneToOne: false
            referencedRelation: "payroll_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          notes: string | null
          pay_period_end: string
          pay_period_start: string
          payment_method:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          staff_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          pay_period_end: string
          pay_period_start: string
          payment_method?:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          staff_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          pay_period_end?: string
          pay_period_start?: string
          payment_method?:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          staff_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          id: string
          period_month: number
          period_year: number
          processed_at: string | null
          processed_by: string | null
          staff_count: number
          tenant_id: string
          total_deductions: number
          total_gross: number
          total_net: number
        }
        Insert: {
          id?: string
          period_month: number
          period_year: number
          processed_at?: string | null
          processed_by?: string | null
          staff_count: number
          tenant_id: string
          total_deductions: number
          total_gross: number
          total_net: number
        }
        Update: {
          id?: string
          period_month?: number
          period_year?: number
          processed_at?: string | null
          processed_by?: string | null
          staff_count?: number
          tenant_id?: string
          total_deductions?: number
          total_gross?: number
          total_net?: number
        }
        Relationships: []
      }
      payroll_staff: {
        Row: {
          account_number: string | null
          annual_leave_days: number | null
          bank_name: string | null
          contract_renewal_date: string | null
          created_at: string | null
          custom_position: string | null
          deductions: Json | null
          department: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_relationship: string | null
          employment_type: string | null
          end_date: string | null
          gross_salary: number
          health_insurance: boolean | null
          id: string
          job_title: string | null
          member_id: string | null
          mpesa_number: string | null
          net_salary: number
          notes: string | null
          pay_frequency: string | null
          payment_day: number | null
          payment_method: string | null
          pension_contribution: boolean | null
          probation_end_date: string | null
          routing_number: string | null
          sick_leave_days: number | null
          staff_id_number: string | null
          start_date: string | null
          status: string | null
          supervisor_id: string | null
          tax_id: string | null
          tenant_id: string
          updated_at: string | null
          work_days: string[] | null
        }
        Insert: {
          account_number?: string | null
          annual_leave_days?: number | null
          bank_name?: string | null
          contract_renewal_date?: string | null
          created_at?: string | null
          custom_position?: string | null
          deductions?: Json | null
          department?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_relationship?: string | null
          employment_type?: string | null
          end_date?: string | null
          gross_salary: number
          health_insurance?: boolean | null
          id?: string
          job_title?: string | null
          member_id?: string | null
          mpesa_number?: string | null
          net_salary: number
          notes?: string | null
          pay_frequency?: string | null
          payment_day?: number | null
          payment_method?: string | null
          pension_contribution?: boolean | null
          probation_end_date?: string | null
          routing_number?: string | null
          sick_leave_days?: number | null
          staff_id_number?: string | null
          start_date?: string | null
          status?: string | null
          supervisor_id?: string | null
          tax_id?: string | null
          tenant_id: string
          updated_at?: string | null
          work_days?: string[] | null
        }
        Update: {
          account_number?: string | null
          annual_leave_days?: number | null
          bank_name?: string | null
          contract_renewal_date?: string | null
          created_at?: string | null
          custom_position?: string | null
          deductions?: Json | null
          department?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_relationship?: string | null
          employment_type?: string | null
          end_date?: string | null
          gross_salary?: number
          health_insurance?: boolean | null
          id?: string
          job_title?: string | null
          member_id?: string | null
          mpesa_number?: string | null
          net_salary?: number
          notes?: string | null
          pay_frequency?: string | null
          payment_day?: number | null
          payment_method?: string | null
          pension_contribution?: boolean | null
          probation_end_date?: string | null
          routing_number?: string | null
          sick_leave_days?: number | null
          staff_id_number?: string | null
          start_date?: string | null
          status?: string | null
          supervisor_id?: string | null
          tax_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          work_days?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_staff_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_staff_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "payroll_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      pledge_campaigns: {
        Row: {
          allow_anonymous: boolean | null
          category: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          name: string
          start_date: string | null
          status: string | null
          target_amount: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allow_anonymous?: boolean | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          name: string
          start_date?: string | null
          status?: string | null
          target_amount?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allow_anonymous?: boolean | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          name?: string
          start_date?: string | null
          status?: string | null
          target_amount?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pledge_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pledge_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pledges: {
        Row: {
          campaign_id: string
          committed_amount: number
          created_at: string | null
          donor_name: string | null
          fulfilled_amount: number | null
          id: string
          is_anonymous: boolean | null
          member_id: string
          notes: string | null
          payment_schedule:
            | Database["public"]["Enums"]["payment_schedule_enum"]
            | null
          pledge_date: string | null
          status: Database["public"]["Enums"]["pledge_status_enum"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          committed_amount: number
          created_at?: string | null
          donor_name?: string | null
          fulfilled_amount?: number | null
          id?: string
          is_anonymous?: boolean | null
          member_id: string
          notes?: string | null
          payment_schedule?:
            | Database["public"]["Enums"]["payment_schedule_enum"]
            | null
          pledge_date?: string | null
          status?: Database["public"]["Enums"]["pledge_status_enum"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          committed_amount?: number
          created_at?: string | null
          donor_name?: string | null
          fulfilled_amount?: number | null
          id?: string
          is_anonymous?: boolean | null
          member_id?: string
          notes?: string | null
          payment_schedule?:
            | Database["public"]["Enums"]["payment_schedule_enum"]
            | null
          pledge_date?: string | null
          status?: Database["public"]["Enums"]["pledge_status_enum"] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pledges_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pledge_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pledges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pledges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_requests: {
        Row: {
          answered_notes: string | null
          created_at: string | null
          id: string
          is_anonymous: boolean | null
          is_answered: boolean | null
          member_id: string
          request: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          answered_notes?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_answered?: boolean | null
          member_id: string
          request: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          answered_notes?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_answered?: boolean | null
          member_id?: string
          request?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          answer_given: string | null
          answered_at: string | null
          id: string
          is_correct: boolean | null
          participant_id: string
          points_earned: number | null
          question_index: number
          session_id: string
          time_taken_ms: number | null
        }
        Insert: {
          answer_given?: string | null
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          participant_id: string
          points_earned?: number | null
          question_index: number
          session_id: string
          time_taken_ms?: number | null
        }
        Update: {
          answer_given?: string | null
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          participant_id?: string
          points_earned?: number | null
          question_index?: number
          session_id?: string
          time_taken_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "quiz_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_participants: {
        Row: {
          avatar_emoji: string | null
          coins: number | null
          display_name: string
          id: string
          is_host: boolean | null
          joined_at: string | null
          rank: number | null
          score: number | null
          session_id: string
          streak: number | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          avatar_emoji?: string | null
          coins?: number | null
          display_name: string
          id?: string
          is_host?: boolean | null
          joined_at?: string | null
          rank?: number | null
          score?: number | null
          session_id: string
          streak?: number | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          avatar_emoji?: string | null
          coins?: number | null
          display_name?: string
          id?: string
          is_host?: boolean | null
          joined_at?: string | null
          rank?: number | null
          score?: number | null
          session_id?: string
          streak?: number | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_participants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          confetti_enabled: boolean | null
          created_at: string | null
          current_question_index: number | null
          ended_at: string | null
          host_user_id: string | null
          id: string
          join_code: string
          join_url: string | null
          music_enabled: boolean | null
          quiz_id: string
          settings: Json | null
          started_at: string | null
          status: string | null
          tenant_id: string
          theme: string | null
        }
        Insert: {
          confetti_enabled?: boolean | null
          created_at?: string | null
          current_question_index?: number | null
          ended_at?: string | null
          host_user_id?: string | null
          id?: string
          join_code: string
          join_url?: string | null
          music_enabled?: boolean | null
          quiz_id: string
          settings?: Json | null
          started_at?: string | null
          status?: string | null
          tenant_id: string
          theme?: string | null
        }
        Update: {
          confetti_enabled?: boolean | null
          created_at?: string | null
          current_question_index?: number | null
          ended_at?: string | null
          host_user_id?: string | null
          id?: string
          join_code?: string
          join_url?: string | null
          music_enabled?: boolean | null
          quiz_id?: string
          settings?: Json | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          allow_doc_reading: boolean | null
          created_at: string | null
          dok_levels: string[] | null
          grade_level: string | null
          id: string
          language: string | null
          num_questions: number | null
          question_types: string[] | null
          questions: Json | null
          source_file_name: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allow_doc_reading?: boolean | null
          created_at?: string | null
          dok_levels?: string[] | null
          grade_level?: string | null
          id?: string
          language?: string | null
          num_questions?: number | null
          question_types?: string[] | null
          questions?: Json | null
          source_file_name?: string | null
          status?: string | null
          tenant_id: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allow_doc_reading?: boolean | null
          created_at?: string | null
          dok_levels?: string[] | null
          grade_level?: string | null
          id?: string
          language?: string | null
          num_questions?: number | null
          question_types?: string[] | null
          questions?: Json | null
          source_file_name?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          completed_at: string | null
          completion_status: string | null
          convert_id: string
          id: string
          resource_id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          completion_status?: string | null
          convert_id: string
          id?: string
          resource_id: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          completion_status?: string | null
          convert_id?: string
          id?: string
          resource_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_convert_id_fkey"
            columns: ["convert_id"]
            isOneToOne: false
            referencedRelation: "new_converts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "discipleship_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_collections: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          recommended_stage: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          recommended_stage?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          recommended_stage?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_collections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          file_url: string | null
          id: string
          is_public: boolean | null
          tenant_id: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          is_public?: boolean | null
          tenant_id: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          is_public?: boolean | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_delete: boolean | null
          can_read: boolean | null
          can_write: boolean | null
          id: string
          module: string
          role_name: string
          tenant_id: string
        }
        Insert: {
          can_delete?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          id?: string
          module: string
          role_name: string
          tenant_id: string
        }
        Update: {
          can_delete?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          id?: string
          module?: string
          role_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string | null
          data_source: string
          id: string
          last_run: string | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          data_source: string
          id?: string
          last_run?: string | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          data_source?: string
          id?: string
          last_run?: string | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          affected_user_id: string | null
          affected_user_name: string | null
          alert_type: string
          created_at: string | null
          description: string
          id: string
          ip_address: string | null
          location: string | null
          raw_data: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          affected_user_id?: string | null
          affected_user_name?: string | null
          alert_type: string
          created_at?: string | null
          description: string
          id?: string
          ip_address?: string | null
          location?: string | null
          raw_data?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          affected_user_id?: string | null
          affected_user_name?: string | null
          alert_type?: string
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: string | null
          location?: string | null
          raw_data?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sermon_archives: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          extracted_text: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          preacher: string | null
          scripture_references: string | null
          sermon_date: string | null
          status: string | null
          storage_path: string | null
          tags: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          extracted_text?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          preacher?: string | null
          scripture_references?: string | null
          sermon_date?: string | null
          status?: string | null
          storage_path?: string | null
          tags?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          extracted_text?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          preacher?: string | null
          scripture_references?: string | null
          sermon_date?: string | null
          status?: string | null
          storage_path?: string | null
          tags?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sermon_archives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sermon_archives_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sermon_series: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          start_date: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sermon_series_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sermons: {
        Row: {
          additional_instructions: string | null
          ai_generated: boolean | null
          audience: string | null
          audio_file_path: string | null
          audio_url: string | null
          created_at: string | null
          created_by: string | null
          doc_file_path: string | null
          draft_notes: string | null
          duration: string | null
          id: string
          introduction: string | null
          is_published: boolean | null
          manuscript: string | null
          notes: string | null
          preacher_id: string | null
          scripture_reference: string | null
          series: string | null
          sermon_date: string | null
          sermon_type: string | null
          speaker: string | null
          status: string | null
          style: string | null
          tenant_id: string
          thumbnail_path: string | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          additional_instructions?: string | null
          ai_generated?: boolean | null
          audience?: string | null
          audio_file_path?: string | null
          audio_url?: string | null
          created_at?: string | null
          created_by?: string | null
          doc_file_path?: string | null
          draft_notes?: string | null
          duration?: string | null
          id?: string
          introduction?: string | null
          is_published?: boolean | null
          manuscript?: string | null
          notes?: string | null
          preacher_id?: string | null
          scripture_reference?: string | null
          series?: string | null
          sermon_date?: string | null
          sermon_type?: string | null
          speaker?: string | null
          status?: string | null
          style?: string | null
          tenant_id: string
          thumbnail_path?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          additional_instructions?: string | null
          ai_generated?: boolean | null
          audience?: string | null
          audio_file_path?: string | null
          audio_url?: string | null
          created_at?: string | null
          created_by?: string | null
          doc_file_path?: string | null
          draft_notes?: string | null
          duration?: string | null
          id?: string
          introduction?: string | null
          is_published?: boolean | null
          manuscript?: string | null
          notes?: string | null
          preacher_id?: string | null
          scripture_reference?: string | null
          series?: string | null
          sermon_date?: string | null
          sermon_type?: string | null
          speaker?: string | null
          status?: string | null
          style?: string | null
          tenant_id?: string
          thumbnail_path?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sermons_preacher_id_fkey"
            columns: ["preacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sermons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_attendance: {
        Row: {
          created_at: string
          id: string
          member_id: string
          service_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          service_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          service_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_attendance_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_request_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          internal_name: string
          is_active: boolean
          is_default: boolean
          label: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          internal_name: string
          is_active?: boolean
          is_default?: boolean
          label: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          internal_name?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          actual_attendance: number | null
          allow_attendance: boolean
          branch_id: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          expected_attendance: number | null
          id: string
          is_recurring: boolean | null
          location: string | null
          name: string | null
          notes: string | null
          order_of_service: Json | null
          parent_service_id: string | null
          preacher: string | null
          recurrence_rule: string | null
          service_date: string
          service_leader_id: string | null
          service_type: Database["public"]["Enums"]["service_type_enum"] | null
          start_time: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          worship_leader_id: string | null
        }
        Insert: {
          actual_attendance?: number | null
          allow_attendance?: boolean
          branch_id?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          expected_attendance?: number | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          name?: string | null
          notes?: string | null
          order_of_service?: Json | null
          parent_service_id?: string | null
          preacher?: string | null
          recurrence_rule?: string | null
          service_date: string
          service_leader_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type_enum"] | null
          start_time?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
          worship_leader_id?: string | null
        }
        Update: {
          actual_attendance?: number | null
          allow_attendance?: boolean
          branch_id?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          expected_attendance?: number | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          name?: string | null
          notes?: string | null
          order_of_service?: Json | null
          parent_service_id?: string | null
          preacher?: string | null
          recurrence_rule?: string | null
          service_date?: string
          service_leader_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type_enum"] | null
          start_time?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          worship_leader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_parent_service_id_fkey"
            columns: ["parent_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      set_list_songs: {
        Row: {
          id: string
          key_override: string | null
          notes: string | null
          position: number
          set_list_id: string
          song_id: string
        }
        Insert: {
          id?: string
          key_override?: string | null
          notes?: string | null
          position: number
          set_list_id: string
          song_id: string
        }
        Update: {
          id?: string
          key_override?: string | null
          notes?: string | null
          position?: number
          set_list_id?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_list_songs_set_list_id_fkey"
            columns: ["set_list_id"]
            isOneToOne: false
            referencedRelation: "set_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_list_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      set_lists: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          notes: string | null
          service_date: string | null
          service_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          service_date?: string | null
          service_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          service_date?: string | null
          service_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_history: {
        Row: {
          cost: number | null
          created_at: string | null
          currency: string | null
          delivered_count: number | null
          failed_count: number | null
          id: string
          is_test: boolean | null
          message: string
          recipient_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          is_test?: boolean | null
          message: string
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          is_test?: boolean | null
          message?: string
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_recipients: {
        Row: {
          at_message_id: string | null
          created_at: string | null
          delivered_at: string | null
          failure_reason: string | null
          id: string
          network_code: string | null
          phone_number: string
          retry_count: number | null
          sms_history_id: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          at_message_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          failure_reason?: string | null
          id?: string
          network_code?: string | null
          phone_number: string
          retry_count?: number | null
          sms_history_id: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          at_message_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          failure_reason?: string | null
          id?: string
          network_code?: string | null
          phone_number?: string
          retry_count?: number | null
          sms_history_id?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_recipients_sms_history_id_fkey"
            columns: ["sms_history_id"]
            isOneToOne: false
            referencedRelation: "sms_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_settings: {
        Row: {
          at_api_key: string | null
          at_sender_id: string | null
          at_username: string | null
          created_at: string | null
          id: string
          is_configured: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          at_api_key?: string | null
          at_sender_id?: string | null
          at_username?: string | null
          created_at?: string | null
          id?: string
          is_configured?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          at_api_key?: string | null
          at_sender_id?: string | null
          at_username?: string | null
          created_at?: string | null
          id?: string
          is_configured?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          body: string
          category_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          body: string
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          body?: string
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "email_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          artist: string | null
          chord_sheet_path: string | null
          chords: string | null
          created_at: string | null
          id: string
          key: string | null
          lyrics: string | null
          tags: string[] | null
          tempo: number | null
          tenant_id: string
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          artist?: string | null
          chord_sheet_path?: string | null
          chords?: string | null
          created_at?: string | null
          id?: string
          key?: string | null
          lyrics?: string | null
          tags?: string[] | null
          tempo?: number | null
          tenant_id: string
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          artist?: string | null
          chord_sheet_path?: string | null
          chords?: string | null
          created_at?: string | null
          id?: string
          key?: string | null
          lyrics?: string | null
          tags?: string[] | null
          tempo?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "songs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_absences: {
        Row: {
          absence_date: string
          created_at: string | null
          id: string
          notes: string | null
          reason: string | null
          staff_id: string
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          absence_date: string
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          staff_id: string
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          absence_date?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          staff_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_absences_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "payroll_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_absences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leave_balances: {
        Row: {
          annual_leave_total: number | null
          annual_leave_used: number | null
          compassionate_leave_total: number | null
          compassionate_leave_used: number | null
          created_at: string | null
          id: string
          maternity_leave_total: number | null
          maternity_leave_used: number | null
          paternity_leave_total: number | null
          paternity_leave_used: number | null
          sick_leave_total: number | null
          sick_leave_used: number | null
          staff_id: string
          tenant_id: string
          unpaid_leave_used: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          annual_leave_total?: number | null
          annual_leave_used?: number | null
          compassionate_leave_total?: number | null
          compassionate_leave_used?: number | null
          created_at?: string | null
          id?: string
          maternity_leave_total?: number | null
          maternity_leave_used?: number | null
          paternity_leave_total?: number | null
          paternity_leave_used?: number | null
          sick_leave_total?: number | null
          sick_leave_used?: number | null
          staff_id: string
          tenant_id: string
          unpaid_leave_used?: number | null
          updated_at?: string | null
          year?: number
        }
        Update: {
          annual_leave_total?: number | null
          annual_leave_used?: number | null
          compassionate_leave_total?: number | null
          compassionate_leave_used?: number | null
          created_at?: string | null
          id?: string
          maternity_leave_total?: number | null
          maternity_leave_used?: number | null
          paternity_leave_total?: number | null
          paternity_leave_used?: number | null
          sick_leave_total?: number | null
          sick_leave_used?: number | null
          staff_id?: string
          tenant_id?: string
          unpaid_leave_used?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_leave_balances_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "payroll_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leave_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cover_notes: string | null
          cover_staff_id: string | null
          created_at: string | null
          duration_days: number | null
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          staff_id: string
          start_date: string
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cover_notes?: string | null
          cover_staff_id?: string | null
          created_at?: string | null
          duration_days?: number | null
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          staff_id: string
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cover_notes?: string | null
          cover_staff_id?: string | null
          created_at?: string | null
          duration_days?: number | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          staff_id?: string
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_leave_requests_cover_staff_id_fkey"
            columns: ["cover_staff_id"]
            isOneToOne: false
            referencedRelation: "payroll_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "payroll_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payroll: {
        Row: {
          allowances: number
          basic_salary: number
          created_at: string | null
          deductions: number
          id: string
          month: number
          net_salary: number | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          reference: string | null
          staff_id: string
          status: string
          tenant_id: string
          updated_at: string | null
          year: number
        }
        Insert: {
          allowances?: number
          basic_salary?: number
          created_at?: string | null
          deductions?: number
          id?: string
          month: number
          net_salary?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          staff_id: string
          status?: string
          tenant_id: string
          updated_at?: string | null
          year: number
        }
        Update: {
          allowances?: number
          basic_salary?: number
          created_at?: string | null
          deductions?: number
          id?: string
          month?: number
          net_salary?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          staff_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_payroll_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "payroll_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payroll_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_positions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_tasks: {
        Row: {
          assigned_to: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          org_id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          org_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          org_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "payroll_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      store_bundles: {
        Row: {
          bundle_price: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          member_discount: number | null
          name: string
          original_price: number | null
          product_ids: string[] | null
          sales_count: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          bundle_price?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          member_discount?: number | null
          name: string
          original_price?: number | null
          product_ids?: string[] | null
          sales_count?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          bundle_price?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          member_discount?: number | null
          name?: string
          original_price?: number | null
          product_ids?: string[] | null
          sales_count?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_bundles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_coupons: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          start_date: string | null
          tenant_id: string
          updated_at: string | null
          uses_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          start_date?: string | null
          tenant_id: string
          updated_at?: string | null
          uses_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          start_date?: string | null
          tenant_id?: string
          updated_at?: string | null
          uses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_coupons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_user_id: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_method: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          order_number: string
          order_status: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          subtotal: number
          tenant_id: string
          total: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_user_id?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_method?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          order_status?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          subtotal: number
          tenant_id: string
          total: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_user_id?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_method?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          order_status?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          subtotal?: number
          tenant_id?: string
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          category: string | null
          compare_at_price: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          digital_file_url: string | null
          id: string
          image_urls: Json | null
          name: string
          price: number
          product_type: string | null
          sales_count: number | null
          sku: string | null
          status: string | null
          stock_quantity: number | null
          tags: string[] | null
          tenant_id: string
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          category?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          digital_file_url?: string | null
          id?: string
          image_urls?: Json | null
          name: string
          price: number
          product_type?: string | null
          sales_count?: number | null
          sku?: string | null
          status?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          category?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          digital_file_url?: string | null
          id?: string
          image_urls?: Json | null
          name?: string
          price?: number
          product_type?: string | null
          sales_count?: number | null
          sku?: string | null
          status?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_media: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          duration: string | null
          duration_seconds: number | null
          file_size: number | null
          file_url: string
          id: string
          linked_sermon_id: string | null
          media_type: string
          media_url: string | null
          published_at: string | null
          recording_date: string | null
          scripture_reference: string | null
          series: string | null
          series_id: string | null
          speaker: string | null
          speaker_member_id: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          file_url: string
          id?: string
          linked_sermon_id?: string | null
          media_type: string
          media_url?: string | null
          published_at?: string | null
          recording_date?: string | null
          scripture_reference?: string | null
          series?: string | null
          series_id?: string | null
          speaker?: string | null
          speaker_member_id?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          file_url?: string
          id?: string
          linked_sermon_id?: string | null
          media_type?: string
          media_url?: string | null
          published_at?: string | null
          recording_date?: string | null
          scripture_reference?: string | null
          series?: string | null
          series_id?: string | null
          speaker?: string | null
          speaker_member_id?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_media_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "sermon_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_answers: {
        Row: {
          answer_boolean: boolean | null
          answer_options: Json | null
          answer_rating: number | null
          answer_text: string | null
          answer_value: Json | null
          created_at: string | null
          file_url: string | null
          id: string
          question_index: number
          question_text: string
          question_type: string
          response_id: string
        }
        Insert: {
          answer_boolean?: boolean | null
          answer_options?: Json | null
          answer_rating?: number | null
          answer_text?: string | null
          answer_value?: Json | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          question_index: number
          question_text: string
          question_type: string
          response_id: string
        }
        Update: {
          answer_boolean?: boolean | null
          answer_options?: Json | null
          answer_rating?: number | null
          answer_text?: string | null
          answer_value?: Json | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          question_index?: number
          question_text?: string
          question_type?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          completed_at: string | null
          id: string
          is_complete: boolean | null
          member_id: string | null
          member_name: string | null
          responses: Json
          started_at: string | null
          submitted_at: string | null
          survey_id: string
          tenant_id: string | null
          time_taken_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_complete?: boolean | null
          member_id?: string | null
          member_name?: string | null
          responses?: Json
          started_at?: string | null
          submitted_at?: string | null
          survey_id: string
          tenant_id?: string | null
          time_taken_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_complete?: boolean | null
          member_id?: string | null
          member_name?: string | null
          responses?: Json
          started_at?: string | null
          submitted_at?: string | null
          survey_id?: string
          tenant_id?: string | null
          time_taken_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          closing_date: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_anonymous: boolean | null
          is_published: boolean | null
          questions: Json
          target_audience: string | null
          target_group_id: string | null
          tenant_id: string
          title: string
          view_count: number | null
        }
        Insert: {
          closing_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_published?: boolean | null
          questions?: Json
          target_audience?: string | null
          target_group_id?: string | null
          tenant_id: string
          title: string
          view_count?: number | null
        }
        Update: {
          closing_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_published?: boolean | null
          questions?: Json
          target_audience?: string | null
          target_group_id?: string | null
          tenant_id?: string
          title?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_deductible_types: {
        Row: {
          created_at: string
          id: string
          is_deductible: boolean
          is_system: boolean
          notes: string | null
          sort_order: number
          tenant_id: string
          type_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_deductible?: boolean
          is_system?: boolean
          notes?: string | null
          sort_order?: number
          tenant_id: string
          type_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_deductible?: boolean
          is_system?: boolean
          notes?: string | null
          sort_order?: number
          tenant_id?: string
          type_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tax_settings: {
        Row: {
          created_at: string
          fiscal_year_start_day: number
          fiscal_year_start_month: number
          id: string
          is_configured: boolean
          legal_org_name: string | null
          receipt_footer: string | null
          registration_number: string | null
          registration_type: string | null
          registration_type_other: string | null
          signature_name: string | null
          signature_title: string | null
          statement_header: string | null
          tax_address: string | null
          tax_city: string | null
          tax_country: string | null
          tax_postal_code: string | null
          tax_state: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fiscal_year_start_day?: number
          fiscal_year_start_month?: number
          id?: string
          is_configured?: boolean
          legal_org_name?: string | null
          receipt_footer?: string | null
          registration_number?: string | null
          registration_type?: string | null
          registration_type_other?: string | null
          signature_name?: string | null
          signature_title?: string | null
          statement_header?: string | null
          tax_address?: string | null
          tax_city?: string | null
          tax_country?: string | null
          tax_postal_code?: string | null
          tax_state?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fiscal_year_start_day?: number
          fiscal_year_start_month?: number
          id?: string
          is_configured?: boolean
          legal_org_name?: string | null
          receipt_footer?: string | null
          registration_number?: string | null
          registration_type?: string | null
          registration_type_other?: string | null
          signature_name?: string | null
          signature_title?: string | null
          statement_header?: string | null
          tax_address?: string | null
          tax_city?: string | null
          tax_country?: string | null
          tax_postal_code?: string | null
          tax_state?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tax_statements: {
        Row: {
          deductible_total: number
          generated_at: string
          id: string
          member_id: string
          non_deductible_total: number
          sent_at: string | null
          statement_data: Json | null
          status: string
          tenant_id: string
          total_giving: number
          year: number
        }
        Insert: {
          deductible_total?: number
          generated_at?: string
          id?: string
          member_id: string
          non_deductible_total?: number
          sent_at?: string | null
          statement_data?: Json | null
          status?: string
          tenant_id: string
          total_giving?: number
          year: number
        }
        Update: {
          deductible_total?: number
          generated_at?: string
          id?: string
          member_id?: string
          non_deductible_total?: number
          sent_at?: string | null
          statement_data?: Json | null
          status?: string
          tenant_id?: string
          total_giving?: number
          year?: number
        }
        Relationships: []
      }
      tenant_seo_settings: {
        Row: {
          created_at: string | null
          facebook_pixel_id: string | null
          ga_measurement_id: string | null
          gsc_verification: string | null
          id: string
          keywords: string[] | null
          meta_description: string | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          page_title: string | null
          public_page_visible: boolean | null
          show_in_directory: boolean | null
          structured_data_enabled: boolean | null
          tenant_id: string
          twitter_card_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          facebook_pixel_id?: string | null
          ga_measurement_id?: string | null
          gsc_verification?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          page_title?: string | null
          public_page_visible?: boolean | null
          show_in_directory?: boolean | null
          structured_data_enabled?: boolean | null
          tenant_id: string
          twitter_card_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          facebook_pixel_id?: string | null
          ga_measurement_id?: string | null
          gsc_verification?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          page_title?: string | null
          public_page_visible?: boolean | null
          show_in_directory?: boolean | null
          structured_data_enabled?: boolean | null
          tenant_id?: string
          twitter_card_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_seo_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          about: string | null
          absence_alert_recipients: string
          absence_alerts_enabled: boolean
          absence_threshold: number
          accent_color: string | null
          address: string | null
          afternoon_service_time: string
          allow_self_checkout: boolean
          app_slug: string | null
          at_api_key: string | null
          at_low_balance_alert: boolean
          at_low_balance_threshold: number
          at_sender_id: string | null
          at_sms_enabled: boolean
          at_username: string | null
          auto_generate_member_ids: boolean
          average_attendance: number | null
          checkin_minutes_after: number
          checkin_minutes_before: number
          checkin_window_enabled: boolean
          church_code: string | null
          city: string | null
          contact_email: string | null
          core_values: string[] | null
          country: string | null
          created_at: string
          currency: string | null
          custom_domain: string | null
          default_attendance_status: string
          default_language: string | null
          denomination: string | null
          early_riser_time: string
          enable_checkin: boolean
          enabled_modules: Json | null
          facebook_url: string | null
          fiscal_year_start_month: number
          founded_year: number | null
          id: string
          instagram_url: string | null
          invite_code: string | null
          invite_code_uses: number
          location_radius_meters: number
          location_verification_enabled: boolean
          logo: string | null
          member_id_prefix: string
          mission_statement: string | null
          morning_service_time: string
          name: string
          notif_anniversary: boolean
          notif_appt_confirmation: boolean
          notif_appt_reminder: boolean
          notif_appt_status_change: boolean
          notif_asset_approval: boolean
          notif_asset_return: boolean
          notif_birthday: boolean
          notif_donation_confirmation: boolean
          notif_event_cancellation: boolean
          notif_event_reminder_1d: boolean
          notif_event_reminder_3d: boolean
          notif_event_reminder_7d: boolean
          notif_followup_assignment: boolean
          notif_group_announcement: boolean
          notif_group_meeting_reminder: boolean
          notif_milestone: boolean
          notif_pledge_reminder: boolean
          notif_recurring_donation: boolean
          notif_service_reminder: boolean
          notif_service_request: boolean
          notif_task_assigned: boolean
          notif_task_due_soon: boolean
          notif_task_overdue: boolean
          notif_volunteer_assignment: boolean
          notif_welcome: boolean
          onboarding_completed: boolean | null
          onboarding_step: number | null
          phone: string | null
          post_code: string | null
          primary_color: string | null
          push_notifications_enabled: boolean
          qr_checkin_enabled: boolean
          registration_enabled: boolean
          require_post_code: boolean | null
          senior_pastor: string | null
          service_days: string[] | null
          service_time: string | null
          slug: string
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan_enum"]
            | null
          subscription_status: Database["public"]["Enums"]["subscription_status_enum"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier_enum"]
          tagline: string | null
          tenant_metadata: Json | null
          timezone: string | null
          twitter_url: string | null
          updated_at: string
          vision_statement: string | null
          website_url: string | null
          whatsapp_access_token: string | null
          whatsapp_business_account_id: string | null
          whatsapp_category: string | null
          whatsapp_connected: boolean | null
          whatsapp_description: string | null
          whatsapp_display_name: string | null
          whatsapp_number: string | null
          whatsapp_phone_number: string | null
          whatsapp_phone_number_id: string | null
          whatsapp_profile_picture: string | null
          whatsapp_provider: string | null
          whatsapp_website: string | null
          youtube_url: string | null
        }
        Insert: {
          about?: string | null
          absence_alert_recipients?: string
          absence_alerts_enabled?: boolean
          absence_threshold?: number
          accent_color?: string | null
          address?: string | null
          afternoon_service_time?: string
          allow_self_checkout?: boolean
          app_slug?: string | null
          at_api_key?: string | null
          at_low_balance_alert?: boolean
          at_low_balance_threshold?: number
          at_sender_id?: string | null
          at_sms_enabled?: boolean
          at_username?: string | null
          auto_generate_member_ids?: boolean
          average_attendance?: number | null
          checkin_minutes_after?: number
          checkin_minutes_before?: number
          checkin_window_enabled?: boolean
          church_code?: string | null
          city?: string | null
          contact_email?: string | null
          core_values?: string[] | null
          country?: string | null
          created_at: string
          currency?: string | null
          custom_domain?: string | null
          default_attendance_status?: string
          default_language?: string | null
          denomination?: string | null
          early_riser_time?: string
          enable_checkin?: boolean
          enabled_modules?: Json | null
          facebook_url?: string | null
          fiscal_year_start_month?: number
          founded_year?: number | null
          id: string
          instagram_url?: string | null
          invite_code?: string | null
          invite_code_uses?: number
          location_radius_meters?: number
          location_verification_enabled?: boolean
          logo?: string | null
          member_id_prefix?: string
          mission_statement?: string | null
          morning_service_time?: string
          name: string
          notif_anniversary?: boolean
          notif_appt_confirmation?: boolean
          notif_appt_reminder?: boolean
          notif_appt_status_change?: boolean
          notif_asset_approval?: boolean
          notif_asset_return?: boolean
          notif_birthday?: boolean
          notif_donation_confirmation?: boolean
          notif_event_cancellation?: boolean
          notif_event_reminder_1d?: boolean
          notif_event_reminder_3d?: boolean
          notif_event_reminder_7d?: boolean
          notif_followup_assignment?: boolean
          notif_group_announcement?: boolean
          notif_group_meeting_reminder?: boolean
          notif_milestone?: boolean
          notif_pledge_reminder?: boolean
          notif_recurring_donation?: boolean
          notif_service_reminder?: boolean
          notif_service_request?: boolean
          notif_task_assigned?: boolean
          notif_task_due_soon?: boolean
          notif_task_overdue?: boolean
          notif_volunteer_assignment?: boolean
          notif_welcome?: boolean
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          post_code?: string | null
          primary_color?: string | null
          push_notifications_enabled?: boolean
          qr_checkin_enabled?: boolean
          registration_enabled?: boolean
          require_post_code?: boolean | null
          senior_pastor?: string | null
          service_days?: string[] | null
          service_time?: string | null
          slug: string
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan_enum"]
            | null
          subscription_status: Database["public"]["Enums"]["subscription_status_enum"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier_enum"]
          tagline?: string | null
          tenant_metadata?: Json | null
          timezone?: string | null
          twitter_url?: string | null
          updated_at: string
          vision_statement?: string | null
          website_url?: string | null
          whatsapp_access_token?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_category?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_description?: string | null
          whatsapp_display_name?: string | null
          whatsapp_number?: string | null
          whatsapp_phone_number?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_profile_picture?: string | null
          whatsapp_provider?: string | null
          whatsapp_website?: string | null
          youtube_url?: string | null
        }
        Update: {
          about?: string | null
          absence_alert_recipients?: string
          absence_alerts_enabled?: boolean
          absence_threshold?: number
          accent_color?: string | null
          address?: string | null
          afternoon_service_time?: string
          allow_self_checkout?: boolean
          app_slug?: string | null
          at_api_key?: string | null
          at_low_balance_alert?: boolean
          at_low_balance_threshold?: number
          at_sender_id?: string | null
          at_sms_enabled?: boolean
          at_username?: string | null
          auto_generate_member_ids?: boolean
          average_attendance?: number | null
          checkin_minutes_after?: number
          checkin_minutes_before?: number
          checkin_window_enabled?: boolean
          church_code?: string | null
          city?: string | null
          contact_email?: string | null
          core_values?: string[] | null
          country?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          default_attendance_status?: string
          default_language?: string | null
          denomination?: string | null
          early_riser_time?: string
          enable_checkin?: boolean
          enabled_modules?: Json | null
          facebook_url?: string | null
          fiscal_year_start_month?: number
          founded_year?: number | null
          id?: string
          instagram_url?: string | null
          invite_code?: string | null
          invite_code_uses?: number
          location_radius_meters?: number
          location_verification_enabled?: boolean
          logo?: string | null
          member_id_prefix?: string
          mission_statement?: string | null
          morning_service_time?: string
          name?: string
          notif_anniversary?: boolean
          notif_appt_confirmation?: boolean
          notif_appt_reminder?: boolean
          notif_appt_status_change?: boolean
          notif_asset_approval?: boolean
          notif_asset_return?: boolean
          notif_birthday?: boolean
          notif_donation_confirmation?: boolean
          notif_event_cancellation?: boolean
          notif_event_reminder_1d?: boolean
          notif_event_reminder_3d?: boolean
          notif_event_reminder_7d?: boolean
          notif_followup_assignment?: boolean
          notif_group_announcement?: boolean
          notif_group_meeting_reminder?: boolean
          notif_milestone?: boolean
          notif_pledge_reminder?: boolean
          notif_recurring_donation?: boolean
          notif_service_reminder?: boolean
          notif_service_request?: boolean
          notif_task_assigned?: boolean
          notif_task_due_soon?: boolean
          notif_task_overdue?: boolean
          notif_volunteer_assignment?: boolean
          notif_welcome?: boolean
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          post_code?: string | null
          primary_color?: string | null
          push_notifications_enabled?: boolean
          qr_checkin_enabled?: boolean
          registration_enabled?: boolean
          require_post_code?: boolean | null
          senior_pastor?: string | null
          service_days?: string[] | null
          service_time?: string | null
          slug?: string
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan_enum"]
            | null
          subscription_status?: Database["public"]["Enums"]["subscription_status_enum"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier_enum"]
          tagline?: string | null
          tenant_metadata?: Json | null
          timezone?: string | null
          twitter_url?: string | null
          updated_at?: string
          vision_statement?: string | null
          website_url?: string | null
          whatsapp_access_token?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_category?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_description?: string | null
          whatsapp_display_name?: string | null
          whatsapp_number?: string | null
          whatsapp_phone_number?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_profile_picture?: string | null
          whatsapp_provider?: string | null
          whatsapp_website?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      testimonies: {
        Row: {
          approved_by: string | null
          author_name: string | null
          body: string
          category: string | null
          created_at: string | null
          id: string
          is_anonymous: boolean | null
          is_approved: boolean | null
          member_id: string
          status: string | null
          tenant_id: string
          testimony_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          author_name?: string | null
          body: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_approved?: boolean | null
          member_id: string
          status?: string | null
          tenant_id: string
          testimony_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          author_name?: string | null
          body?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_approved?: boolean | null
          member_id?: string
          status?: string | null
          tenant_id?: string
          testimony_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonies_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonies_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          category: string | null
          certificate_title: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty: string | null
          enrollment_count: number | null
          has_certificate: boolean | null
          id: string
          instructor_member_id: string | null
          modules: Json | null
          status: string | null
          target_audience: string | null
          tenant_id: string
          title: string
          total_duration_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          certificate_title?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          enrollment_count?: number | null
          has_certificate?: boolean | null
          id?: string
          instructor_member_id?: string | null
          modules?: Json | null
          status?: string | null
          target_audience?: string | null
          tenant_id: string
          title: string
          total_duration_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          certificate_title?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          enrollment_count?: number | null
          has_certificate?: boolean | null
          id?: string
          instructor_member_id?: string | null
          modules?: Json | null
          status?: string | null
          target_audience?: string | null
          tenant_id?: string
          title?: string
          total_duration_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string | null
          id: string
          member_id: string
          progress: number | null
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string | null
          id?: string
          member_id: string
          progress?: number | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string | null
          id?: string
          member_id?: string
          progress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_fine_permissions: {
        Row: {
          created_at: string
          id: string
          level: string
          permission_key: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          permission_key: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          permission_key?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_role_overrides: {
        Row: {
          created_at: string
          id: string
          member_id: string
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          role: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_overrides_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          email_verified: boolean | null
          first_name: string
          gender: string | null
          id: string
          join_date: string
          last_login_at: string | null
          last_name: string
          mfa_enabled: boolean | null
          mfa_secret: string | null
          password_hash: string | null
          phone: string | null
          phone_verified: boolean | null
          role: Database["public"]["Enums"]["user_role_enum"]
          status: Database["public"]["Enums"]["user_status_enum"]
          tenant_id: string
          updated_at: string
          user_metadata: Json | null
        }
        Insert: {
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          email_verified?: boolean | null
          first_name: string
          gender?: string | null
          id: string
          join_date: string
          last_login_at?: string | null
          last_name: string
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          password_hash?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          role: Database["public"]["Enums"]["user_role_enum"]
          status: Database["public"]["Enums"]["user_status_enum"]
          tenant_id: string
          updated_at?: string
          user_metadata?: Json | null
        }
        Update: {
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          email_verified?: boolean | null
          first_name?: string
          gender?: string | null
          id?: string
          join_date?: string
          last_login_at?: string | null
          last_name?: string
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          password_hash?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role_enum"]
          status?: Database["public"]["Enums"]["user_status_enum"]
          tenant_id?: string
          updated_at?: string
          user_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_followup_notes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          note: string
          status_at_time: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note: string
          status_at_time?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string
          status_at_time?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_followup_notes_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          assigned_to: string | null
          city: string | null
          converted_to_member_id: string | null
          created_at: string | null
          email: string | null
          first_name: string
          follow_up_due_date: string | null
          follow_up_status: string | null
          gender: string | null
          how_heard: string | null
          how_heard_detail: string | null
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          service_attended: string | null
          tenant_id: string
          visit_date: string
        }
        Insert: {
          assigned_to?: string | null
          city?: string | null
          converted_to_member_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          follow_up_due_date?: string | null
          follow_up_status?: string | null
          gender?: string | null
          how_heard?: string | null
          how_heard_detail?: string | null
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          service_attended?: string | null
          tenant_id: string
          visit_date: string
        }
        Update: {
          assigned_to?: string | null
          city?: string | null
          converted_to_member_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          follow_up_due_date?: string | null
          follow_up_status?: string | null
          gender?: string | null
          how_heard?: string | null
          how_heard_detail?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          service_attended?: string | null
          tenant_id?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_assignments: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          member_id: string
          notified_at: string | null
          role_name: string
          service_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          member_id: string
          notified_at?: string | null
          role_name: string
          service_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          member_id?: string
          notified_at?: string | null
          role_name?: string
          service_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_assignments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_hours: {
        Row: {
          activity_description: string | null
          assignment_id: string | null
          created_at: string | null
          hours: number
          id: string
          logged_by: string | null
          logged_date: string
          role_id: string | null
          tenant_id: string
          volunteer_member_id: string
        }
        Insert: {
          activity_description?: string | null
          assignment_id?: string | null
          created_at?: string | null
          hours?: number
          id?: string
          logged_by?: string | null
          logged_date?: string
          role_id?: string | null
          tenant_id: string
          volunteer_member_id: string
        }
        Update: {
          activity_description?: string | null
          assignment_id?: string | null
          created_at?: string | null
          hours?: number
          id?: string
          logged_by?: string | null
          logged_date?: string
          role_id?: string | null
          tenant_id?: string
          volunteer_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_hours_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_hours_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_hours_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "volunteer_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_hours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_roles: {
        Row: {
          created_at: string | null
          department: string | null
          department_color: string | null
          description: string | null
          id: string
          max_volunteers: number | null
          min_volunteers: number | null
          name: string
          required_skills: string[] | null
          requirements: string | null
          tenant_id: string
          time_commitment: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          department_color?: string | null
          description?: string | null
          id?: string
          max_volunteers?: number | null
          min_volunteers?: number | null
          name: string
          required_skills?: string[] | null
          requirements?: string | null
          tenant_id: string
          time_commitment?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          department_color?: string | null
          description?: string | null
          id?: string
          max_volunteers?: number | null
          min_volunteers?: number | null
          name?: string
          required_skills?: string[] | null
          requirements?: string | null
          tenant_id?: string
          time_commitment?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          hours_served: number | null
          id: string
          joined_at: string | null
          member_id: string
          notes: string | null
          reference_id: string | null
          reference_type: string | null
          role_id: string | null
          start_date: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          hours_served?: number | null
          id?: string
          joined_at?: string | null
          member_id: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          role_id?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          hours_served?: number | null
          id?: string
          joined_at?: string | null
          member_id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          role_id?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteers_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "volunteer_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      website_consultation_requests: {
        Row: {
          church_name: string | null
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string | null
          tenant_id: string | null
        }
        Insert: {
          church_name?: string | null
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone?: string | null
          tenant_id?: string | null
        }
        Update: {
          church_name?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      website_reviews: {
        Row: {
          church_name: string
          created_at: string
          id: string
          rating: number
          review_text: string
          reviewer_name: string
          tenant_id: string
        }
        Insert: {
          church_name: string
          created_at?: string
          id?: string
          rating: number
          review_text: string
          reviewer_name: string
          tenant_id: string
        }
        Update: {
          church_name?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string
          reviewer_name?: string
          tenant_id?: string
        }
        Relationships: []
      }
      whatsapp_automations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          template_name: string | null
          tenant_id: string
          trigger_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template_name?: string | null
          tenant_id: string
          trigger_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template_name?: string | null
          tenant_id?: string
          trigger_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_credit_transactions: {
        Row: {
          balance_after: number
          created_at: string | null
          credits_change: number
          description: string
          id: string
          tenant_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string | null
          credits_change: number
          description: string
          id?: string
          tenant_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string | null
          credits_change?: number
          description?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_credit_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_credits: {
        Row: {
          created_at: string | null
          free_trial_credits: number | null
          id: string
          tenant_id: string
          total_credits: number | null
          updated_at: string | null
          used_credits: number | null
        }
        Insert: {
          created_at?: string | null
          free_trial_credits?: number | null
          id?: string
          tenant_id: string
          total_credits?: number | null
          updated_at?: string | null
          used_credits?: number | null
        }
        Update: {
          created_at?: string | null
          free_trial_credits?: number | null
          id?: string
          tenant_id?: string
          total_credits?: number | null
          updated_at?: string | null
          used_credits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_credits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          read_at: string | null
          recipient_member_id: string | null
          recipient_phone: string
          sent_at: string | null
          status: string | null
          template_name: string
          template_variables: Json | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          recipient_member_id?: string | null
          recipient_phone: string
          sent_at?: string | null
          status?: string | null
          template_name: string
          template_variables?: Json | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          recipient_member_id?: string | null
          recipient_phone?: string
          sent_at?: string | null
          status?: string | null
          template_name?: string
          template_variables?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_approved: boolean | null
          is_system: boolean | null
          name: string
          tenant_id: string
          variables: Json | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_approved?: boolean | null
          is_system?: boolean | null
          name: string
          tenant_id: string
          variables?: Json | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_approved?: boolean | null
          is_system?: boolean | null
          name?: string
          tenant_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_church_code: { Args: { church_name: string }; Returns: string }
      get_dashboard_stats: { Args: { p_tenant_id: string }; Returns: Json }
      get_my_tenant_id: { Args: never; Returns: string }
      increment_unread_count: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      seed_chart_of_accounts: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      announcement_audience_enum: "all" | "group" | "branch"
      attendance_status_enum: "present" | "absent" | "late"
      budget_period_enum: "monthly" | "annual"
      checkin_method_enum: "manual" | "qr_scan" | "self_checkin"
      comm_channel_enum: "email" | "sms"
      comm_recipient_enum: "all" | "group" | "manual"
      comm_status_enum: "draft" | "sent" | "failed"
      giving_type_enum:
        | "tithe"
        | "offering"
        | "pledge_payment"
        | "special_donation"
      group_type_enum:
        | "ministry"
        | "cell_group"
        | "choir"
        | "youth"
        | "house_fellowship"
        | "other"
        | "department"
        | "children"
        | "women"
        | "men"
        | "prayer"
        | "outreach"
        | "bible_study"
      incident_status_enum: "open" | "investigating" | "resolved"
      integration_provider_enum:
        | "pesapal"
        | "intasend"
        | "africas_talking"
        | "resend"
      marital_status_enum: "single" | "married" | "divorced" | "widowed"
      payment_method_enum: "cash" | "mpesa" | "bank_transfer" | "card"
      payment_schedule_enum: "one_time" | "weekly" | "monthly"
      payment_status_enum: "pending" | "confirmed" | "failed" | "voided"
      pledge_status_enum: "pending" | "partial" | "fulfilled" | "overdue"
      service_type_enum: "sunday" | "midweek" | "special"
      subscription_plan_enum: "free" | "foundation" | "growth" | "enterprise"
      subscription_status_enum: "active" | "trial" | "suspended" | "cancelled"
      subscription_tier_enum: "free" | "basic" | "pro" | "enterprise"
      task_priority_enum: "low" | "medium" | "high"
      task_status_enum: "open" | "in_progress" | "completed" | "cancelled"
      test_status_enum: "untested" | "success" | "failed"
      user_role_enum: "super_admin" | "staff_leader" | "member" | "guest"
      user_status_enum: "active" | "inactive" | "suspended"
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
    Enums: {
      announcement_audience_enum: ["all", "group", "branch"],
      attendance_status_enum: ["present", "absent", "late"],
      budget_period_enum: ["monthly", "annual"],
      checkin_method_enum: ["manual", "qr_scan", "self_checkin"],
      comm_channel_enum: ["email", "sms"],
      comm_recipient_enum: ["all", "group", "manual"],
      comm_status_enum: ["draft", "sent", "failed"],
      giving_type_enum: [
        "tithe",
        "offering",
        "pledge_payment",
        "special_donation",
      ],
      group_type_enum: [
        "ministry",
        "cell_group",
        "choir",
        "youth",
        "house_fellowship",
        "other",
        "department",
        "children",
        "women",
        "men",
        "prayer",
        "outreach",
        "bible_study",
      ],
      incident_status_enum: ["open", "investigating", "resolved"],
      integration_provider_enum: [
        "pesapal",
        "intasend",
        "africas_talking",
        "resend",
      ],
      marital_status_enum: ["single", "married", "divorced", "widowed"],
      payment_method_enum: ["cash", "mpesa", "bank_transfer", "card"],
      payment_schedule_enum: ["one_time", "weekly", "monthly"],
      payment_status_enum: ["pending", "confirmed", "failed", "voided"],
      pledge_status_enum: ["pending", "partial", "fulfilled", "overdue"],
      service_type_enum: ["sunday", "midweek", "special"],
      subscription_plan_enum: ["free", "foundation", "growth", "enterprise"],
      subscription_status_enum: ["active", "trial", "suspended", "cancelled"],
      subscription_tier_enum: ["free", "basic", "pro", "enterprise"],
      task_priority_enum: ["low", "medium", "high"],
      task_status_enum: ["open", "in_progress", "completed", "cancelled"],
      test_status_enum: ["untested", "success", "failed"],
      user_role_enum: ["super_admin", "staff_leader", "member", "guest"],
      user_status_enum: ["active", "inactive", "suspended"],
    },
  },
} as const
A new version of Supabase CLI is available: v2.90.0 (currently installed v2.75.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
