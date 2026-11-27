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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      application_details: {
        Row: {
          annual_revenue: number | null
          application_id: string
          business_address: string | null
          business_bank: string | null
          employee_count: number | null
          legal_business_name: string
          nature_of_business: string | null
          owner_address: string | null
          owner_date_of_birth: string | null
          owner_email: string
          owner_full_name: string
          owner_phone: string | null
          registration_year: number | null
          updated_at: string
        }
        Insert: {
          annual_revenue?: number | null
          application_id: string
          business_address?: string | null
          business_bank?: string | null
          employee_count?: number | null
          legal_business_name: string
          nature_of_business?: string | null
          owner_address?: string | null
          owner_date_of_birth?: string | null
          owner_email: string
          owner_full_name: string
          owner_phone?: string | null
          registration_year?: number | null
          updated_at?: string
        }
        Update: {
          annual_revenue?: number | null
          application_id?: string
          business_address?: string | null
          business_bank?: string | null
          employee_count?: number | null
          legal_business_name?: string
          nature_of_business?: string | null
          owner_address?: string | null
          owner_date_of_birth?: string | null
          owner_email?: string
          owner_full_name?: string
          owner_phone?: string | null
          registration_year?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_details_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          application_number: number
          broker_id: string | null
          business_name: string
          client_id: string
          created_at: string
          created_by: string
          deal_summary: string | null
          financing_product: string
          id: string
          requested_amount: number
          source: string
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          updated_at: string
          version: number
        }
        Insert: {
          application_number?: number
          broker_id?: string | null
          business_name: string
          client_id: string
          created_at?: string
          created_by: string
          deal_summary?: string | null
          financing_product: string
          id?: string
          requested_amount: number
          source: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          application_number?: number
          broker_id?: string | null
          business_name?: string
          client_id?: string
          created_at?: string
          created_by?: string
          deal_summary?: string | null
          financing_product?: string
          id?: string
          requested_amount?: number
          source?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "applications_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          application_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          application_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          application_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          application_id: string
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          document_category: string | null
          due_at: string | null
          form_schema: Json
          id: string
          item_type: string
          required: boolean
          status: string
          title: string
        }
        Insert: {
          application_id: string
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          document_category?: string | null
          due_at?: string | null
          form_schema?: Json
          id?: string
          item_type: string
          required?: boolean
          status?: string
          title: string
        }
        Update: {
          application_id?: string
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          document_category?: string | null
          due_at?: string | null
          form_schema?: Json
          id?: string
          item_type?: string
          required?: boolean
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invitations: {
        Row: {
          accepted_at: string | null
          broker_id: string
          client_id: string
          created_at: string
          expires_at: string
          id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          broker_id: string
          client_id: string
          created_at?: string
          expires_at?: string
          id?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          broker_id?: string
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invitations_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          broker_id: string | null
          created_at: string
          created_by: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          broker_id?: string | null
          created_at?: string
          created_by: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          broker_id?: string | null
          created_at?: string
          created_by?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          application_id: string
          archived_at: string | null
          category: string
          checklist_item_id: string | null
          created_at: string
          file_size: number
          id: string
          mime_type: string
          original_filename: string
          scan_status: string
          sha256: string
          storage_path: string
          uploaded_by: string
          visibility: Database["public"]["Enums"]["document_visibility"]
        }
        Insert: {
          application_id: string
          archived_at?: string | null
          category: string
          checklist_item_id?: string | null
          created_at?: string
          file_size: number
          id?: string
          mime_type: string
          original_filename: string
          scan_status?: string
          sha256: string
          storage_path: string
          uploaded_by: string
          visibility: Database["public"]["Enums"]["document_visibility"]
        }
        Update: {
          application_id?: string
          archived_at?: string | null
          category?: string
          checklist_item_id?: string | null
          created_at?: string
          file_size?: number
          id?: string
          mime_type?: string
          original_filename?: string
          scan_status?: string
          sha256?: string
          storage_path?: string
          uploaded_by?: string
          visibility?: Database["public"]["Enums"]["document_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          next_attempt_at: string
          provider_message_id: string | null
          recipient_email: string
          status: string
          template_data: Json
          template_key: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          next_attempt_at?: string
          provider_message_id?: string | null
          recipient_email: string
          status?: string
          template_data?: Json
          template_key: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          next_attempt_at?: string
          provider_message_id?: string | null
          recipient_email?: string
          status?: string
          template_data?: Json
          template_key?: string
        }
        Relationships: []
      }
      financing_decisions: {
        Row: {
          application_id: string
          approved_amount: number | null
          conditions: string | null
          created_at: string
          created_by: string
          decision: string
          id: string
          product: string | null
          published_at: string | null
        }
        Insert: {
          application_id: string
          approved_amount?: number | null
          conditions?: string | null
          created_at?: string
          created_by: string
          decision: string
          id?: string
          product?: string | null
          published_at?: string | null
        }
        Update: {
          application_id?: string
          approved_amount?: number | null
          conditions?: string | null
          created_at?: string
          created_by?: string
          decision?: string
          id?: string
          product?: string | null
          published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financing_decisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_decisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          answers: Json
          checklist_item_id: string
          id: string
          schema_snapshot: Json
          submission_version: number
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          answers: Json
          checklist_item_id: string
          id?: string
          schema_snapshot: Json
          submission_version: number
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          answers?: Json
          checklist_item_id?: string
          id?: string
          schema_snapshot?: Json
          submission_version?: number
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          application_id: string
          author_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          application_id: string
          author_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          application_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          application_id: string
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          application_id: string
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          application_id?: string
          body?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          application_id: string | null
          body: string
          created_at: string
          event_type: string
          id: string
          read_at: string | null
          recipient_id: string
          title: string
        }
        Insert: {
          application_id?: string | null
          body: string
          created_at?: string
          event_type: string
          id?: string
          read_at?: string | null
          recipient_id: string
          title: string
        }
        Update: {
          application_id?: string | null
          body?: string
          created_at?: string
          event_type?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      signature_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          evidence: Json
          id: string
          ip_address: unknown
          signature_request_id: string
          user_agent: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          evidence?: Json
          id?: string
          ip_address?: unknown
          signature_request_id: string
          user_agent?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          evidence?: Json
          id?: string
          ip_address?: unknown
          signature_request_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_events_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_requests: {
        Row: {
          application_id: string
          application_version: number
          consent_text: string
          consent_version: string
          created_at: string
          expires_at: string
          id: string
          requested_by: string
          signed_at: string | null
          signed_document_hash: string | null
          signed_document_id: string | null
          signer_email: string
          signer_name: string
          signer_user_id: string | null
          status: string
          token_hash: string
          unsigned_document_hash: string
          unsigned_document_id: string
        }
        Insert: {
          application_id: string
          application_version: number
          consent_text: string
          consent_version: string
          created_at?: string
          expires_at: string
          id?: string
          requested_by: string
          signed_at?: string | null
          signed_document_hash?: string | null
          signed_document_id?: string | null
          signer_email: string
          signer_name: string
          signer_user_id?: string | null
          status?: string
          token_hash: string
          unsigned_document_hash: string
          unsigned_document_id: string
        }
        Update: {
          application_id?: string
          application_version?: number
          consent_text?: string
          consent_version?: string
          created_at?: string
          expires_at?: string
          id?: string
          requested_by?: string
          signed_at?: string | null
          signed_document_hash?: string | null
          signed_document_id?: string | null
          signer_email?: string
          signer_name?: string
          signer_user_id?: string | null
          status?: string
          token_hash?: string
          unsigned_document_hash?: string
          unsigned_document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_signed_document_id_fkey"
            columns: ["signed_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_unsigned_document_id_fkey"
            columns: ["unsigned_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_application_status: {
        Args: {
          p_application: string
          p_reason?: string
          p_status: Database["public"]["Enums"]["application_status"]
        }
        Returns: boolean
      }
      broker_create_application: {
        Args: {
          p_amount: number
          p_business: string
          p_email: string
          p_name: string
          p_phone?: string
          p_product: string
        }
        Returns: string
      }
      broker_invite_client: { Args: { p_client: string }; Returns: string }
      broker_request_task: {
        Args: {
          p_application: string
          p_description: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      broker_submit_application: {
        Args: { p_application: string }
        Returns: boolean
      }
      client_accept_invite: { Args: { p_token: string }; Returns: string }
      client_submit_task: {
        Args: { p_answers: Json; p_task: string }
        Returns: string
      }
      register_document: {
        Args: {
          p_application: string
          p_category: string
          p_filename: string
          p_mime: string
          p_sha256: string
          p_size: number
          p_storage_path: string
          p_visibility: Database["public"]["Enums"]["document_visibility"]
        }
        Returns: string
      }
      send_portal_message: {
        Args: {
          p_application: string
          p_body: string
          p_channel: Database["public"]["Enums"]["message_channel"]
        }
        Returns: string
      }
    }
    Enums: {
      application_status:
        | "draft"
        | "pending_client_info"
        | "pending_signature"
        | "preparing_documents"
        | "ready_to_submit"
        | "submitted"
        | "under_review"
        | "additional_documents_required"
        | "conditional_approval"
        | "approved"
        | "declined"
        | "funded"
        | "closed"
        | "withdrawn"
      document_visibility:
        | "broker_client"
        | "broker_admin"
        | "admin_only"
        | "all_participants"
      message_channel: "broker_client" | "broker_admin" | "direct_client_admin"
      user_role: "admin" | "broker" | "client"
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
    Enums: {
      application_status: [
        "draft",
        "pending_client_info",
        "pending_signature",
        "preparing_documents",
        "ready_to_submit",
        "submitted",
        "under_review",
        "additional_documents_required",
        "conditional_approval",
        "approved",
        "declined",
        "funded",
        "closed",
        "withdrawn",
      ],
      document_visibility: [
        "broker_client",
        "broker_admin",
        "admin_only",
        "all_participants",
      ],
      message_channel: ["broker_client", "broker_admin", "direct_client_admin"],
      user_role: ["admin", "broker", "client"],
    },
  },
} as const
