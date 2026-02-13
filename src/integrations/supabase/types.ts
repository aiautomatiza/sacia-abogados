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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaign_queue: {
        Row: {
          batch_number: number
          campaign_id: string
          channel: string
          contacts: Json
          created_at: string | null
          error_message: string | null
          id: string
          processed_at: string | null
          retry_count: number | null
          scheduled_for: string
          status: string
          tenant_id: string
          total_batches: number
          updated_at: string | null
          webhook_payload: Json
          webhook_url: string
        }
        Insert: {
          batch_number: number
          campaign_id: string
          channel: string
          contacts: Json
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          retry_count?: number | null
          scheduled_for: string
          status?: string
          tenant_id: string
          total_batches: number
          updated_at?: string | null
          webhook_payload: Json
          webhook_url: string
        }
        Update: {
          batch_number?: number
          campaign_id?: string
          channel?: string
          contacts?: Json
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          retry_count?: number | null
          scheduled_for?: string
          status?: string
          tenant_id?: string
          total_batches?: number
          updated_at?: string | null
          webhook_payload?: Json
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          batches_failed: number | null
          batches_sent: number | null
          channel: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          status: string
          tenant_id: string
          total_batches: number
          total_contacts: number
          updated_at: string | null
        }
        Insert: {
          batches_failed?: number | null
          batches_sent?: number | null
          channel: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          status?: string
          tenant_id: string
          total_batches: number
          total_contacts: number
          updated_at?: string | null
        }
        Update: {
          batches_failed?: number | null
          batches_sent?: number | null
          channel?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          status?: string
          tenant_id?: string
          total_batches?: number
          total_contacts?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string | null
          content_type: Database["public"]["Enums"]["message_content_type"]
          conversation_id: string
          created_at: string
          delivery_status: Database["public"]["Enums"]["message_delivery_status"]
          error_message: string | null
          external_message_id: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          message_state:
            | Database["public"]["Enums"]["message_state_enum"]
            | null
          metadata: Json | null
          replied_to_message_id: string | null
          sender_id: string | null
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          updated_at: string
        }
        Insert: {
          content?: string | null
          content_type?: Database["public"]["Enums"]["message_content_type"]
          conversation_id: string
          created_at?: string
          delivery_status?: Database["public"]["Enums"]["message_delivery_status"]
          error_message?: string | null
          external_message_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_state?:
            | Database["public"]["Enums"]["message_state_enum"]
            | null
          metadata?: Json | null
          replied_to_message_id?: string | null
          sender_id?: string | null
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          updated_at?: string
        }
        Update: {
          content?: string | null
          content_type?: Database["public"]["Enums"]["message_content_type"]
          conversation_id?: string
          created_at?: string
          delivery_status?: Database["public"]["Enums"]["message_delivery_status"]
          error_message?: string | null
          external_message_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_state?:
            | Database["public"]["Enums"]["message_state_enum"]
            | null
          metadata?: Json | null
          replied_to_message_id?: string | null
          sender_id?: string | null
          sender_type?: Database["public"]["Enums"]["message_sender_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_replied_to_message_id_fkey"
            columns: ["replied_to_message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_tags: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_conversation_id: string | null
          assigned_to: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          contact_id: string
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          metadata: Json | null
          pending_agent_response: boolean | null
          state: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[] | null
          tenant_id: string
          unread_count: number
          updated_at: string
          whatsapp_24h_window_expires_at: string | null
        }
        Insert: {
          ai_conversation_id?: string | null
          assigned_to?: string | null
          channel?: Database["public"]["Enums"]["conversation_channel"]
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          pending_agent_response?: boolean | null
          state?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          tags?: string[] | null
          tenant_id: string
          unread_count?: number
          updated_at?: string
          whatsapp_24h_window_expires_at?: string | null
        }
        Update: {
          ai_conversation_id?: string | null
          assigned_to?: string | null
          channel?: Database["public"]["Enums"]["conversation_channel"]
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          pending_agent_response?: boolean | null
          state?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          tags?: string[] | null
          tenant_id?: string
          unread_count?: number
          updated_at?: string
          whatsapp_24h_window_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_calls: {
        Row: {
          agent_id: string | null
          audio_duration_seconds: number | null
          audio_url: string | null
          call_datetime: string
          call_sid: string | null
          contact_id: string
          created_at: string
          duration_seconds: number | null
          end_reason: string | null
          id: string
          metadata: Json | null
          state: Database["public"]["Enums"]["call_state"]
          summary: string | null
          tenant_id: string
          transcript: string | null
          type: Database["public"]["Enums"]["call_type"]
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          audio_duration_seconds?: number | null
          audio_url?: string | null
          call_datetime?: string
          call_sid?: string | null
          contact_id: string
          created_at?: string
          duration_seconds?: number | null
          end_reason?: string | null
          id?: string
          metadata?: Json | null
          state?: Database["public"]["Enums"]["call_state"]
          summary?: string | null
          tenant_id: string
          transcript?: string | null
          type?: Database["public"]["Enums"]["call_type"]
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          audio_duration_seconds?: number | null
          audio_url?: string | null
          call_datetime?: string
          call_sid?: string | null
          contact_id?: string
          created_at?: string
          duration_seconds?: number | null
          end_reason?: string | null
          id?: string
          metadata?: Json | null
          state?: Database["public"]["Enums"]["call_state"]
          summary?: string | null
          tenant_id?: string
          transcript?: string | null
          type?: Database["public"]["Enums"]["call_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          assigned_to: string | null
          attributes: Json | null
          created_at: string
          external_crm_id: string | null
          id: string
          location_id: string | null
          nombre: string | null
          numero: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attributes?: Json | null
          created_at?: string
          external_crm_id?: string | null
          id?: string
          location_id?: string | null
          nombre?: string | null
          numero: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attributes?: Json | null
          created_at?: string
          external_crm_id?: string | null
          id?: string
          location_id?: string | null
          nombre?: string | null
          numero?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_fields: {
        Row: {
          created_at: string | null
          display_order: number | null
          field_label: string
          field_name: string
          field_type: string
          id: string
          options: Json | null
          required: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          field_label: string
          field_name: string
          field_type: string
          id?: string
          options?: Json | null
          required?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          options?: Json | null
          required?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ia_lock: {
        Row: {
          id: string
          is_busy: boolean | null
          updated_at: string
        }
        Insert: {
          id?: string
          is_busy?: boolean | null
          updated_at?: string
        }
        Update: {
          id?: string
          is_busy?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          comercial_role: Database["public"]["Enums"]["comercial_role"] | null
          created_at: string
          email: string
          external_id: string | null
          full_name: string | null
          id: string
          location_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          comercial_role?: Database["public"]["Enums"]["comercial_role"] | null
          created_at?: string
          email: string
          external_id?: string | null
          full_name?: string | null
          id: string
          location_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          comercial_role?: Database["public"]["Enums"]["comercial_role"] | null
          created_at?: string
          email?: string
          external_id?: string | null
          full_name?: string | null
          id?: string
          location_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_credentials: {
        Row: {
          calls_credential: string | null
          conversations_credential: string | null
          created_at: string | null
          encryption_version: number | null
          id: string
          tenant_id: string
          updated_at: string | null
          whatsapp_credential: string | null
        }
        Insert: {
          calls_credential?: string | null
          conversations_credential?: string | null
          created_at?: string | null
          encryption_version?: number | null
          id?: string
          tenant_id: string
          updated_at?: string | null
          whatsapp_credential?: string | null
        }
        Update: {
          calls_credential?: string | null
          conversations_credential?: string | null
          created_at?: string | null
          encryption_version?: number | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
          whatsapp_credential?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_locations: {
        Row: {
          id: string
          tenant_id: string
          name: string
          code: string | null
          address_line1: string
          address_line2: string | null
          city: string
          state_province: string | null
          postal_code: string | null
          country: string
          latitude: number | null
          longitude: number | null
          phone: string | null
          email: string | null
          timezone: string
          is_active: boolean
          is_default: boolean
          operating_hours: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          code?: string | null
          address_line1: string
          address_line2?: string | null
          city: string
          state_province?: string | null
          postal_code?: string | null
          country?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          email?: string | null
          timezone?: string
          is_active?: boolean
          is_default?: boolean
          operating_hours?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          code?: string | null
          address_line1?: string
          address_line2?: string | null
          city?: string
          state_province?: string | null
          postal_code?: string | null
          country?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          email?: string | null
          timezone?: string
          is_active?: boolean
          is_default?: boolean
          operating_hours?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          appointments_enabled: boolean | null
          appointments_webhook_url: string | null
          calls_enabled: boolean | null
          calls_phone_number: string | null
          calls_webhook_url: string | null
          created_at: string | null
          id: string
          tenant_id: string
          updated_at: string | null
          whatsapp_enabled: boolean | null
          whatsapp_webhook_url: string | null
        }
        Insert: {
          appointments_enabled?: boolean | null
          appointments_webhook_url?: string | null
          calls_enabled?: boolean | null
          calls_phone_number?: string | null
          calls_webhook_url?: string | null
          created_at?: string | null
          id?: string
          tenant_id: string
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_webhook_url?: string | null
        }
        Update: {
          appointments_enabled?: boolean | null
          appointments_webhook_url?: string | null
          calls_enabled?: boolean | null
          calls_phone_number?: string | null
          calls_webhook_url?: string | null
          created_at?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          id: string
          tenant_id: string
          type: Database["public"]["Enums"]["appointment_type"]
          contact_id: string
          agent_id: string | null
          location_id: string | null
          scheduled_at: string
          duration_minutes: number
          timezone: string
          status: Database["public"]["Enums"]["appointment_status"]
          title: string | null
          description: string | null
          customer_notes: string | null
          reminder_sent_at: string | null
          confirmation_sent_at: string | null
          call_phone_number: string | null
          call_id: string | null
          metadata: Json
          created_by: string | null
          created_at: string
          updated_at: string
          cancelled_at: string | null
          cancelled_reason: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          type: Database["public"]["Enums"]["appointment_type"]
          contact_id: string
          agent_id?: string | null
          location_id?: string | null
          scheduled_at: string
          duration_minutes?: number
          timezone?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string | null
          description?: string | null
          customer_notes?: string | null
          reminder_sent_at?: string | null
          confirmation_sent_at?: string | null
          call_phone_number?: string | null
          call_id?: string | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
          cancelled_at?: string | null
          cancelled_reason?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["appointment_type"]
          contact_id?: string
          agent_id?: string | null
          location_id?: string | null
          scheduled_at?: string
          duration_minutes?: number
          timezone?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string | null
          description?: string | null
          customer_notes?: string | null
          reminder_sent_at?: string | null
          confirmation_sent_at?: string | null
          call_phone_number?: string | null
          call_id?: string | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
          cancelled_at?: string | null
          cancelled_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "tenant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "crm_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          comercial_role: Database["public"]["Enums"]["comercial_role"] | null
          completed_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          external_id: string | null
          full_name: string
          id: string
          invited_by: string
          location_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
          tenant_id: string | null
          token: string
          user_id: string | null
        }
        Insert: {
          comercial_role?: Database["public"]["Enums"]["comercial_role"] | null
          completed_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          external_id?: string | null
          full_name: string
          id?: string
          invited_by: string
          location_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string | null
          tenant_id?: string | null
          token?: string
          user_id?: string | null
        }
        Update: {
          comercial_role?: Database["public"]["Enums"]["comercial_role"] | null
          completed_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          external_id?: string | null
          full_name?: string
          id?: string
          invited_by?: string
          location_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          tenant_id?: string | null
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
        Relationships: []
      }
      webhooks: {
        Row: {
          channel: string
          created_at: string
          id: number
          tenant_id: string
          webhook: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: number
          tenant_id: string
          webhook: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: number
          tenant_id?: string
          webhook?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          body_text: string
          category: string
          created_at: string
          footer_text: string | null
          header_text: string | null
          id: string
          language: string
          name: string
          status: string
          template_id: string
          tenant_id: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_text: string
          category: string
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          language?: string
          name: string
          status?: string
          template_id: string
          tenant_id: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_text?: string
          category?: string
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          language?: string
          name?: string
          status?: string
          template_id?: string
          tenant_id?: string
          updated_at?: string
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
      v_appointments_detailed: {
        Row: {
          id: string | null
          tenant_id: string | null
          type: Database["public"]["Enums"]["appointment_type"] | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          scheduled_at: string | null
          duration_minutes: number | null
          timezone: string | null
          title: string | null
          description: string | null
          customer_notes: string | null
          call_phone_number: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
          reminder_sent_at: string | null
          confirmation_sent_at: string | null
          created_by: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_attributes: Json | null
          agent_id: string | null
          agent_email: string | null
          location_id: string | null
          location_name: string | null
          location_address: string | null
          location_city: string | null
          location_phone: string | null
          call_id: string | null
          call_state: Database["public"]["Enums"]["call_state"] | null
          call_duration: number | null
          time_status: string | null
          scheduled_end_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "tenant_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_crm_calls_detailed: {
        Row: {
          agent_email: string | null
          agent_id: string | null
          audio_duration_seconds: number | null
          audio_url: string | null
          call_datetime: string | null
          call_sid: string | null
          contact_attributes: Json | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          duration_seconds: number | null
          end_reason: string | null
          id: string | null
          metadata: Json | null
          state: Database["public"]["Enums"]["call_state"] | null
          summary: string | null
          tenant_id: string | null
          tenant_name: string | null
          transcript: string | null
          type: Database["public"]["Enums"]["call_type"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_appointments_stats: {
        Args: {
          p_tenant_id?: string
          p_date_from?: string
          p_date_to?: string
          p_type?: Database["public"]["Enums"]["appointment_type"]
          p_location_id?: string
          p_agent_id?: string
        }
        Returns: {
          total: number
          scheduled: number
          confirmed: number
          completed: number
          cancelled: number
          no_show: number
          in_progress: number
          completion_rate: number
          cancellation_rate: number
          no_show_rate: number
          calls_count: number
          in_person_count: number
          avg_duration_minutes: number
        }[]
      }
      check_appointment_availability: {
        Args: {
          p_tenant_id: string
          p_type: Database["public"]["Enums"]["appointment_type"]
          p_scheduled_at: string
          p_duration_minutes: number
          p_agent_id?: string
          p_location_id?: string
          p_exclude_appointment_id?: string
        }
        Returns: boolean
      }
      get_contact_upcoming_appointments: {
        Args: {
          p_contact_id: string
          p_limit?: number
        }
        Returns: {
          id: string
          tenant_id: string
          type: Database["public"]["Enums"]["appointment_type"]
          status: Database["public"]["Enums"]["appointment_status"]
          scheduled_at: string
          duration_minutes: number
          timezone: string
          title: string | null
          description: string | null
          customer_notes: string | null
          call_phone_number: string | null
          metadata: Json
          created_at: string
          updated_at: string
          cancelled_at: string | null
          cancelled_reason: string | null
          reminder_sent_at: string | null
          confirmation_sent_at: string | null
          created_by: string | null
          contact_id: string
          contact_name: string | null
          contact_phone: string | null
          contact_attributes: Json | null
          agent_id: string | null
          agent_email: string | null
          location_id: string | null
          location_name: string | null
          location_address: string | null
          location_city: string | null
          location_phone: string | null
          call_id: string | null
          call_state: Database["public"]["Enums"]["call_state"] | null
          call_duration: number | null
          time_status: string
          scheduled_end_at: string
        }[]
      }
      calculate_calls_stats: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_search_term?: string
          p_states?: Database["public"]["Enums"]["call_state"][]
          p_tenant_id?: string
          p_types?: Database["public"]["Enums"]["call_type"][]
        }
        Returns: {
          avg_duration: number
          completed: number
          completion_rate: number
          failed: number
          missed: number
          pending: number
          scheduled: number
          total: number
          total_duration: number
          user_hangup: number
          voicemail: number
        }[]
      }
      clean_expired_invitations: { Args: never; Returns: undefined }
      get_user_tenant_id: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_campaign_batch: {
        Args: { p_campaign_id: string; p_status: string }
        Returns: undefined
      }
      is_super_admin: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "user_client" | "super_admin"
      appointment_type: "call" | "in_person"
      comercial_role: "director_comercial_general" | "director_sede" | "comercial"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
        | "rescheduled"
      call_state:
        | "pending"
        | "completed"
        | "failed"
        | "missed"
        | "voicemail"
        | "user_hangup"
        | "scheduled"
      call_type: "inbound" | "outbound"
      conversation_channel: "whatsapp" | "instagram" | "webchat" | "email"
      conversation_status: "active" | "archived"
      message_content_type:
        | "text"
        | "audio"
        | "image"
        | "document"
        | "video"
        | "location"
        | "sticker"
      message_delivery_status:
        | "sending"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
      message_sender_type: "contact" | "agent" | "system" | "ai"
      message_state_enum: "collecting" | "ai" | "processed" | "pendant"
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
      app_role: ["user_client", "super_admin"],
      appointment_type: ["call", "in_person"],
      comercial_role: ["director_comercial_general", "director_sede", "comercial"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
      ],
      call_state: [
        "pending",
        "completed",
        "failed",
        "missed",
        "voicemail",
        "user_hangup",
        "scheduled",
      ],
      call_type: ["inbound", "outbound"],
      conversation_channel: ["whatsapp", "instagram", "webchat", "email"],
      conversation_status: ["active", "archived"],
      message_content_type: [
        "text",
        "audio",
        "image",
        "document",
        "video",
        "location",
        "sticker",
      ],
      message_delivery_status: [
        "sending",
        "sent",
        "delivered",
        "read",
        "failed",
      ],
      message_sender_type: ["contact", "agent", "system", "ai"],
      message_state_enum: ["collecting", "ai", "processed", "pendant"],
    },
  },
} as const
