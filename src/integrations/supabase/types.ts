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
      announcements: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_pinned: boolean | null
          publish_at: string | null
          target_audience:
            | Database["public"]["Enums"]["announcement_audience_enum"]
            | null
          target_id: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          publish_at?: string | null
          target_audience?:
            | Database["public"]["Enums"]["announcement_audience_enum"]
            | null
          target_id?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          publish_at?: string | null
          target_audience?:
            | Database["public"]["Enums"]["announcement_audience_enum"]
            | null
          target_id?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_tenant_id_fkey"
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
            foreignKeyName: "attendance_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          pastor_id: string | null
          tenant_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          pastor_id?: string | null
          tenant_id: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          pastor_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_pastor_id_fkey"
            columns: ["pastor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_tenant_id_fkey"
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
      church_assets: {
        Row: {
          assigned_to: string | null
          category: string | null
          condition: string | null
          created_at: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_value: number | null
          serial_number: string | null
          tenant_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          serial_number?: string | null
          tenant_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
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
      communications: {
        Row: {
          body: string
          bounced_count: number | null
          channel: Database["public"]["Enums"]["comm_channel_enum"]
          created_at: string | null
          created_by: string | null
          delivered_count: number | null
          id: string
          opened_count: number | null
          recipient_ids: string[] | null
          recipient_type:
            | Database["public"]["Enums"]["comm_recipient_enum"]
            | null
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
          opened_count?: number | null
          recipient_ids?: string[] | null
          recipient_type?:
            | Database["public"]["Enums"]["comm_recipient_enum"]
            | null
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
          opened_count?: number | null
          recipient_ids?: string[] | null
          recipient_type?:
            | Database["public"]["Enums"]["comm_recipient_enum"]
            | null
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
      convert_checkins: {
        Row: {
          checkin_date: string | null
          conducted_by: string | null
          convert_id: string
          created_at: string | null
          id: string
          notes: string | null
        }
        Insert: {
          checkin_date?: string | null
          conducted_by?: string | null
          convert_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
        }
        Update: {
          checkin_date?: string | null
          conducted_by?: string | null
          convert_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
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
          to_stage: number
        }
        Insert: {
          advanced_at?: string | null
          advanced_by?: string | null
          convert_id: string
          from_stage?: number | null
          id?: string
          notes?: string | null
          to_stage: number
        }
        Update: {
          advanced_at?: string | null
          advanced_by?: string | null
          convert_id?: string
          from_stage?: number | null
          id?: string
          notes?: string | null
          to_stage?: number
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
          {
            foreignKeyName: "event_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          category: string | null
          created_at: string | null
          currency: string | null
          description: string
          expense_date: string
          id: string
          payment_method: string | null
          receipt_url: string | null
          recorded_by: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description: string
          expense_date?: string
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string
          expense_date?: string
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          tenant_id?: string
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
          capacity: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          photo_url: string | null
          tenant_id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          amenities?: string[] | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          photo_url?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          amenities?: string[] | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          photo_url?: string | null
          tenant_id?: string
          type?: string | null
          updated_at?: string | null
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
      facility_bookings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          booked_by: string | null
          booking_date: string
          booking_reference: string | null
          created_at: string | null
          end_time: string | null
          equipment_needed: string[] | null
          expected_attendees: number | null
          facility_id: string | null
          facility_name: string
          id: string
          notes: string | null
          purpose: string | null
          rejection_reason: string | null
          setup_notes: string | null
          setup_required: boolean | null
          start_time: string | null
          status: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          booked_by?: string | null
          booking_date: string
          booking_reference?: string | null
          created_at?: string | null
          end_time?: string | null
          equipment_needed?: string[] | null
          expected_attendees?: number | null
          facility_id?: string | null
          facility_name: string
          id?: string
          notes?: string | null
          purpose?: string | null
          rejection_reason?: string | null
          setup_notes?: string | null
          setup_required?: boolean | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          booked_by?: string | null
          booking_date?: string
          booking_reference?: string | null
          created_at?: string | null
          end_time?: string | null
          equipment_needed?: string[] | null
          expected_attendees?: number | null
          facility_id?: string | null
          facility_name?: string
          id?: string
          notes?: string | null
          purpose?: string | null
          rejection_reason?: string | null
          setup_notes?: string | null
          setup_required?: boolean | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_bookings_booked_by_fkey"
            columns: ["booked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "families_head_of_household_id_fkey"
            columns: ["head_of_household_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          family_id: string
          id: string
          member_id: string
          relationship: string
        }
        Insert: {
          family_id: string
          id?: string
          member_id: string
          relationship?: string
        }
        Update: {
          family_id?: string
          id?: string
          member_id?: string
          relationship?: string
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
          related_member_id?: string | null
          related_visitor_id?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_related_member_id_fkey"
            columns: ["related_member_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      giving_records: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          given_at: string
          giving_type: Database["public"]["Enums"]["giving_type_enum"]
          id: string
          member_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          pesapal_transaction_id: string | null
          pledge_id: string | null
          receipt_url: string | null
          recorded_by: string | null
          tenant_id: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          given_at?: string
          giving_type: Database["public"]["Enums"]["giving_type_enum"]
          id?: string
          member_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          pesapal_transaction_id?: string | null
          pledge_id?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          tenant_id: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          given_at?: string
          giving_type?: Database["public"]["Enums"]["giving_type_enum"]
          id?: string
          member_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          pesapal_transaction_id?: string | null
          pledge_id?: string | null
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
        }
        Insert: {
          group_id: string
          joined_at?: string | null
          member_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string | null
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
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
            foreignKeyName: "groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
      meeting_action_items: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          meeting_id: string
          status: string | null
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
          updated_at?: string | null
        }
        Relationships: []
      }
      meeting_attendees: {
        Row: {
          attendance_status: string | null
          id: string
          meeting_id: string
          member_id: string
        }
        Insert: {
          attendance_status?: string | null
          id?: string
          meeting_id: string
          member_id: string
        }
        Update: {
          attendance_status?: string | null
          id?: string
          meeting_id?: string
          member_id?: string
        }
        Relationships: []
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
            foreignKeyName: "member_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          baptism_date: string | null
          baptized: boolean | null
          city: string | null
          country: string | null
          created_at: string
          custom_fields: Json | null
          department: string | null
          discipleship_stage: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          family_id: string | null
          id: string
          id_number: string | null
          marital_status:
            | Database["public"]["Enums"]["marital_status_enum"]
            | null
          membership_number: string
          nationality: string | null
          notes: string | null
          occupation: string | null
          postal_code: string | null
          salvation_date: string | null
          secondary_phone: string | null
          skills: string[] | null
          state: string | null
          street: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          baptism_date?: string | null
          baptized?: boolean | null
          city?: string | null
          country?: string | null
          created_at: string
          custom_fields?: Json | null
          department?: string | null
          discipleship_stage?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          family_id?: string | null
          id: string
          id_number?: string | null
          marital_status?:
            | Database["public"]["Enums"]["marital_status_enum"]
            | null
          membership_number: string
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          postal_code?: string | null
          salvation_date?: string | null
          secondary_phone?: string | null
          skills?: string[] | null
          state?: string | null
          street?: string | null
          tenant_id: string
          updated_at: string
        }
        Update: {
          baptism_date?: string | null
          baptized?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          department?: string | null
          discipleship_stage?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          family_id?: string | null
          id?: string
          id_number?: string | null
          marital_status?:
            | Database["public"]["Enums"]["marital_status_enum"]
            | null
          membership_number?: string
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          postal_code?: string | null
          salvation_date?: string | null
          secondary_phone?: string | null
          skills?: string[] | null
          state?: string | null
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
            foreignKeyName: "members_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
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
          body: string
          created_at: string | null
          group_id: string | null
          id: string
          is_read: boolean | null
          recipient_id: string | null
          sender_id: string
          tenant_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id?: string | null
          sender_id: string
          tenant_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id?: string | null
          sender_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          counsellor_id: string | null
          created_at: string | null
          discipleship_stage: string | null
          graduated_at: string | null
          id: string
          member_id: string | null
          mentor_id: string | null
          notes: string | null
          salvation_date: string | null
          tenant_id: string
          visitor_id: string | null
        }
        Insert: {
          baptism_date?: string | null
          baptism_status?: string | null
          counsellor_id?: string | null
          created_at?: string | null
          discipleship_stage?: string | null
          graduated_at?: string | null
          id?: string
          member_id?: string | null
          mentor_id?: string | null
          notes?: string | null
          salvation_date?: string | null
          tenant_id: string
          visitor_id?: string | null
        }
        Update: {
          baptism_date?: string | null
          baptism_status?: string | null
          counsellor_id?: string | null
          created_at?: string | null
          discipleship_stage?: string | null
          graduated_at?: string | null
          id?: string
          member_id?: string | null
          mentor_id?: string | null
          notes?: string | null
          salvation_date?: string | null
          tenant_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_converts_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "new_converts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          tenant_id?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
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
      outreach_activities: {
        Row: {
          activity_date: string
          beneficiary_count: number | null
          created_at: string | null
          description: string | null
          id: string
          led_by: string | null
          location: string | null
          outcomes: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          activity_date: string
          beneficiary_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          led_by?: string | null
          location?: string | null
          outcomes?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          activity_date?: string
          beneficiary_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          led_by?: string | null
          location?: string | null
          outcomes?: string | null
          tenant_id?: string
          title?: string
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
          bank_name: string | null
          created_at: string | null
          deductions: Json | null
          employment_type: string | null
          gross_salary: number
          id: string
          job_title: string | null
          member_id: string | null
          mpesa_number: string | null
          net_salary: number
          notes: string | null
          pay_frequency: string | null
          payment_method: string | null
          start_date: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          deductions?: Json | null
          employment_type?: string | null
          gross_salary: number
          id?: string
          job_title?: string | null
          member_id?: string | null
          mpesa_number?: string | null
          net_salary: number
          notes?: string | null
          pay_frequency?: string | null
          payment_method?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          deductions?: Json | null
          employment_type?: string | null
          gross_salary?: number
          id?: string
          job_title?: string | null
          member_id?: string | null
          mpesa_number?: string | null
          net_salary?: number
          notes?: string | null
          pay_frequency?: string | null
          payment_method?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pledge_campaigns: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          target_amount: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          target_amount?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          target_amount?: number | null
          tenant_id?: string
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
          fulfilled_amount: number | null
          id: string
          member_id: string
          payment_schedule:
            | Database["public"]["Enums"]["payment_schedule_enum"]
            | null
          status: Database["public"]["Enums"]["pledge_status_enum"] | null
          tenant_id: string
        }
        Insert: {
          campaign_id: string
          committed_amount: number
          created_at?: string | null
          fulfilled_amount?: number | null
          id?: string
          member_id: string
          payment_schedule?:
            | Database["public"]["Enums"]["payment_schedule_enum"]
            | null
          status?: Database["public"]["Enums"]["pledge_status_enum"] | null
          tenant_id: string
        }
        Update: {
          campaign_id?: string
          committed_amount?: number
          created_at?: string | null
          fulfilled_amount?: number | null
          id?: string
          member_id?: string
          payment_schedule?:
            | Database["public"]["Enums"]["payment_schedule_enum"]
            | null
          status?: Database["public"]["Enums"]["pledge_status_enum"] | null
          tenant_id?: string
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
      sermons: {
        Row: {
          audio_url: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          notes: string | null
          preacher_id: string | null
          scripture_reference: string | null
          series: string | null
          sermon_date: string | null
          tenant_id: string
          title: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          notes?: string | null
          preacher_id?: string | null
          scripture_reference?: string | null
          series?: string | null
          sermon_date?: string | null
          tenant_id: string
          title: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          notes?: string | null
          preacher_id?: string | null
          scripture_reference?: string | null
          series?: string | null
          sermon_date?: string | null
          tenant_id?: string
          title?: string
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
      services: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          id: string
          is_recurring: boolean | null
          location: string | null
          parent_service_id: string | null
          recurrence_rule: string | null
          service_date: string
          service_type: Database["public"]["Enums"]["service_type_enum"] | null
          start_time: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          parent_service_id?: string | null
          recurrence_rule?: string | null
          service_date: string
          service_type?: Database["public"]["Enums"]["service_type_enum"] | null
          start_time?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          parent_service_id?: string | null
          recurrence_rule?: string | null
          service_date?: string
          service_type?: Database["public"]["Enums"]["service_type_enum"] | null
          start_time?: string | null
          tenant_id?: string
          title?: string
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
            foreignKeyName: "services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      songs: {
        Row: {
          artist: string | null
          chords: string | null
          created_at: string | null
          id: string
          key: string | null
          lyrics: string | null
          tags: string[] | null
          tempo: number | null
          tenant_id: string
          title: string
        }
        Insert: {
          artist?: string | null
          chords?: string | null
          created_at?: string | null
          id?: string
          key?: string | null
          lyrics?: string | null
          tags?: string[] | null
          tempo?: number | null
          tenant_id: string
          title: string
        }
        Update: {
          artist?: string | null
          chords?: string | null
          created_at?: string | null
          id?: string
          key?: string | null
          lyrics?: string | null
          tags?: string[] | null
          tempo?: number | null
          tenant_id?: string
          title?: string
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
      survey_responses: {
        Row: {
          id: string
          member_id: string | null
          responses: Json
          submitted_at: string | null
          survey_id: string
        }
        Insert: {
          id?: string
          member_id?: string | null
          responses?: Json
          submitted_at?: string | null
          survey_id: string
        }
        Update: {
          id?: string
          member_id?: string | null
          responses?: Json
          submitted_at?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean | null
          questions: Json
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          questions?: Json
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          questions?: Json
          tenant_id?: string
          title?: string
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
          accent_color: string | null
          address: string | null
          average_attendance: number | null
          church_code: string | null
          city: string | null
          contact_email: string | null
          country: string | null
          created_at: string
          currency: string | null
          custom_domain: string | null
          default_language: string | null
          denomination: string | null
          enabled_modules: Json | null
          facebook_url: string | null
          founded_year: number | null
          id: string
          instagram_url: string | null
          logo: string | null
          name: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          phone: string | null
          primary_color: string | null
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
          website_url: string | null
          whatsapp_number: string | null
          youtube_url: string | null
        }
        Insert: {
          about?: string | null
          accent_color?: string | null
          address?: string | null
          average_attendance?: number | null
          church_code?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at: string
          currency?: string | null
          custom_domain?: string | null
          default_language?: string | null
          denomination?: string | null
          enabled_modules?: Json | null
          facebook_url?: string | null
          founded_year?: number | null
          id: string
          instagram_url?: string | null
          logo?: string | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          primary_color?: string | null
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
          website_url?: string | null
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Update: {
          about?: string | null
          accent_color?: string | null
          address?: string | null
          average_attendance?: number | null
          church_code?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          default_language?: string | null
          denomination?: string | null
          enabled_modules?: Json | null
          facebook_url?: string | null
          founded_year?: number | null
          id?: string
          instagram_url?: string | null
          logo?: string | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          primary_color?: string | null
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
          website_url?: string | null
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      testimonies: {
        Row: {
          approved_by: string | null
          body: string
          created_at: string | null
          id: string
          is_approved: boolean | null
          member_id: string
          tenant_id: string
          title: string
        }
        Insert: {
          approved_by?: string | null
          body: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          member_id: string
          tenant_id: string
          title: string
        }
        Update: {
          approved_by?: string | null
          body?: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          member_id?: string
          tenant_id?: string
          title?: string
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
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          modules: Json | null
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          modules?: Json | null
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          modules?: Json | null
          tenant_id?: string
          title?: string
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
      users: {
        Row: {
          avatar: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          email_verified: boolean
          first_name: string
          gender: string | null
          id: string
          join_date: string
          last_login_at: string | null
          last_name: string
          mfa_enabled: boolean
          mfa_secret: string | null
          password_hash: string
          phone: string | null
          phone_verified: boolean
          role: Database["public"]["Enums"]["user_role_enum"]
          status: Database["public"]["Enums"]["user_status_enum"]
          tenant_id: string
          updated_at: string
          user_metadata: Json | null
        }
        Insert: {
          avatar?: string | null
          avatar_url?: string | null
          created_at: string
          date_of_birth?: string | null
          email: string
          email_verified: boolean
          first_name: string
          gender?: string | null
          id: string
          join_date: string
          last_login_at?: string | null
          last_name: string
          mfa_enabled: boolean
          mfa_secret?: string | null
          password_hash: string
          phone?: string | null
          phone_verified: boolean
          role: Database["public"]["Enums"]["user_role_enum"]
          status: Database["public"]["Enums"]["user_status_enum"]
          tenant_id: string
          updated_at: string
          user_metadata?: Json | null
        }
        Update: {
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          email_verified?: boolean
          first_name?: string
          gender?: string | null
          id?: string
          join_date?: string
          last_login_at?: string | null
          last_name?: string
          mfa_enabled?: boolean
          mfa_secret?: string | null
          password_hash?: string
          phone?: string | null
          phone_verified?: boolean
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
          converted_to_member_id: string | null
          created_at: string | null
          email: string | null
          first_name: string
          follow_up_due_date: string | null
          follow_up_status: string | null
          how_heard: string | null
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
          converted_to_member_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          follow_up_due_date?: string | null
          follow_up_status?: string | null
          how_heard?: string | null
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
          converted_to_member_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          follow_up_due_date?: string | null
          follow_up_status?: string | null
          how_heard?: string | null
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
            foreignKeyName: "visitors_converted_to_member_id_fkey"
            columns: ["converted_to_member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "volunteer_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      volunteer_roles: {
        Row: {
          created_at: string | null
          department: string | null
          description: string | null
          id: string
          max_volunteers: number | null
          min_volunteers: number | null
          name: string
          required_skills: string[] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          description?: string | null
          id?: string
          max_volunteers?: number | null
          min_volunteers?: number | null
          name: string
          required_skills?: string[] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          description?: string | null
          id?: string
          max_volunteers?: number | null
          min_volunteers?: number | null
          name?: string
          required_skills?: string[] | null
          tenant_id?: string
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
          member_id: string
          notes: string | null
          reference_id: string | null
          reference_type: string | null
          role_id: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          hours_served?: number | null
          id?: string
          member_id: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          role_id?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          hours_served?: number | null
          id?: string
          member_id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          role_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_tenant_id: { Args: never; Returns: string }
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
