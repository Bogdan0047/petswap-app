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
      availability: {
        Row: {
          created_at: string
          date: string
          id: string
          slot: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          slot?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          slot?: string
          user_id?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      boost_purchases: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          environment: string
          expires_at: string
          id: string
          starts_at: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          expires_at?: string
          id?: string
          starts_at?: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          expires_at?: string
          id?: string
          starts_at?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      care_requests: {
        Row: {
          care_type: string
          created_at: string
          creator_id: string
          credits_offered: number
          end_at: string
          flexible_timing: boolean
          id: string
          location_area: string | null
          notes: string | null
          pet_id: string
          start_at: string
          status: string
          updated_at: string
        }
        Insert: {
          care_type: string
          created_at?: string
          creator_id: string
          credits_offered?: number
          end_at: string
          flexible_timing?: boolean
          id?: string
          location_area?: string | null
          notes?: string | null
          pet_id: string
          start_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          care_type?: string
          created_at?: string
          creator_id?: string
          credits_offered?: number
          end_at?: string
          flexible_timing?: boolean
          id?: string
          location_area?: string | null
          notes?: string | null
          pet_id?: string
          start_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_bookings: {
        Row: {
          care_request_id: string | null
          completed_by_helper_at: string | null
          completed_by_owner_at: string | null
          confirmed_by_helper_at: string | null
          confirmed_by_owner_at: string | null
          conversation_id: string
          created_at: string
          credits_amount: number
          end_at: string
          helper_id: string
          id: string
          owner_id: string
          pet_id: string | null
          pickup_notes: string | null
          proposed_by: string
          start_at: string
          status: string
          swap_id: string | null
          updated_at: string
        }
        Insert: {
          care_request_id?: string | null
          completed_by_helper_at?: string | null
          completed_by_owner_at?: string | null
          confirmed_by_helper_at?: string | null
          confirmed_by_owner_at?: string | null
          conversation_id: string
          created_at?: string
          credits_amount?: number
          end_at: string
          helper_id: string
          id?: string
          owner_id: string
          pet_id?: string | null
          pickup_notes?: string | null
          proposed_by: string
          start_at: string
          status?: string
          swap_id?: string | null
          updated_at?: string
        }
        Update: {
          care_request_id?: string | null
          completed_by_helper_at?: string | null
          completed_by_owner_at?: string | null
          confirmed_by_helper_at?: string | null
          confirmed_by_owner_at?: string | null
          conversation_id?: string
          created_at?: string
          credits_amount?: number
          end_at?: string
          helper_id?: string
          id?: string
          owner_id?: string
          pet_id?: string | null
          pickup_notes?: string | null
          proposed_by?: string
          start_at?: string
          status?: string
          swap_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_bookings_care_request_id_fkey"
            columns: ["care_request_id"]
            isOneToOne: false
            referencedRelation: "care_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_bookings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_bookings_swap_id_fkey"
            columns: ["swap_id"]
            isOneToOne: false
            referencedRelation: "swaps"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_events: {
        Row: {
          conversion_type: string | null
          converted: boolean
          converted_at: string | null
          created_at: string
          email_event_id: string | null
          event_type: string
          fallback_after_minutes: number | null
          fallback_channel: string | null
          fallback_dispatched_at: string | null
          id: string
          metadata: Json
          opened_email_at: string | null
          opened_push_at: string | null
          primary_channel: string
          push_event_id: string | null
          sent_email_at: string | null
          sent_push_at: string | null
          source_event_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversion_type?: string | null
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          email_event_id?: string | null
          event_type: string
          fallback_after_minutes?: number | null
          fallback_channel?: string | null
          fallback_dispatched_at?: string | null
          id?: string
          metadata?: Json
          opened_email_at?: string | null
          opened_push_at?: string | null
          primary_channel?: string
          push_event_id?: string | null
          sent_email_at?: string | null
          sent_push_at?: string | null
          source_event_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversion_type?: string | null
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          email_event_id?: string | null
          event_type?: string
          fallback_after_minutes?: number | null
          fallback_channel?: string | null
          fallback_dispatched_at?: string | null
          id?: string
          metadata?: Json
          opened_email_at?: string | null
          opened_push_at?: string | null
          primary_channel?: string
          push_event_id?: string | null
          sent_email_at?: string | null
          sent_push_at?: string | null
          source_event_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          created_at: string
          id: string
          recipient_id: string
          request_message: string | null
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id: string
          request_message?: string | null
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string
          request_message?: string | null
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          initiator_id: string | null
          last_message_at: string
          last_message_preview: string | null
          status: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiator_id?: string | null
          last_message_at?: string
          last_message_preview?: string | null
          status?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          initiator_id?: string | null
          last_message_at?: string
          last_message_preview?: string | null
          status?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      conversion_events: {
        Row: {
          booking_id: string | null
          conversation_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          source_event_id: string | null
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          conversation_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          source_event_id?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string | null
          conversation_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          source_event_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reason: string
          related_referral_id: string | null
          related_swap_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          related_referral_id?: string | null
          related_swap_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          related_referral_id?: string | null
          related_swap_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      email_ab_config: {
        Row: {
          created_at: string
          email_type: string
          enabled: boolean
          min_sends_per_variant: number
          updated_at: string
          variant_a: Json
          variant_b: Json
          winner: string | null
        }
        Insert: {
          created_at?: string
          email_type: string
          enabled?: boolean
          min_sends_per_variant?: number
          updated_at?: string
          variant_a?: Json
          variant_b?: Json
          winner?: string | null
        }
        Update: {
          created_at?: string
          email_type?: string
          enabled?: boolean
          min_sends_per_variant?: number
          updated_at?: string
          variant_a?: Json
          variant_b?: Json
          winner?: string | null
        }
        Relationships: []
      }
      email_automation_log: {
        Row: {
          automation_type: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          automation_type: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          automation_type?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_events: {
        Row: {
          clicked_at: string | null
          clicked_cta: string | null
          conversion_type: string | null
          converted: boolean
          converted_at: string | null
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          metadata: Json
          opened_at: string | null
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          user_id: string | null
          variant: string | null
        }
        Insert: {
          clicked_at?: string | null
          clicked_cta?: string | null
          conversion_type?: string | null
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json
          opened_at?: string | null
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
          variant?: string | null
        }
        Update: {
          clicked_at?: string | null
          clicked_cta?: string | null
          conversion_type?: string | null
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          opened_at?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
          variant?: string | null
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          booking_notifications: boolean
          created_at: string
          marketing_enabled: boolean
          match_notifications: boolean
          review_notifications: boolean
          transactional_enabled: boolean
          trust_tips_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_notifications?: boolean
          created_at?: string
          marketing_enabled?: boolean
          match_notifications?: boolean
          review_notifications?: boolean
          transactional_enabled?: boolean
          trust_tips_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_notifications?: boolean
          created_at?: string
          marketing_enabled?: boolean
          match_notifications?: boolean
          review_notifications?: boolean
          transactional_enabled?: boolean
          trust_tips_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          booking_id: string | null
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          kind: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          booking_id?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          booking_id?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "chat_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          body: string
          clicked_at: string | null
          conversion_type: string | null
          converted: boolean
          converted_at: string | null
          created_at: string
          deep_link: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          metadata: Json
          notification_type: string
          opened_at: string | null
          sent_at: string | null
          skip_reason: string | null
          source_event_id: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          clicked_at?: string | null
          conversion_type?: string | null
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          deep_link?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          notification_type: string
          opened_at?: string | null
          sent_at?: string | null
          skip_reason?: string | null
          source_event_id?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          clicked_at?: string | null
          conversion_type?: string | null
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          deep_link?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          notification_type?: string
          opened_at?: string | null
          sent_at?: string | null
          skip_reason?: string | null
          source_event_id?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          bookings: boolean
          created_at: string
          marketing: boolean
          matches: boolean
          messages: boolean
          quiet_end_hour: number
          quiet_hours_enabled: boolean
          quiet_start_hour: number
          reviews: boolean
          safety: boolean
          updated_at: string
          user_id: string
          verification: boolean
        }
        Insert: {
          bookings?: boolean
          created_at?: string
          marketing?: boolean
          matches?: boolean
          messages?: boolean
          quiet_end_hour?: number
          quiet_hours_enabled?: boolean
          quiet_start_hour?: number
          reviews?: boolean
          safety?: boolean
          updated_at?: string
          user_id: string
          verification?: boolean
        }
        Update: {
          bookings?: boolean
          created_at?: string
          marketing?: boolean
          matches?: boolean
          messages?: boolean
          quiet_end_hour?: number
          quiet_hours_enabled?: boolean
          quiet_start_hour?: number
          reviews?: boolean
          safety?: boolean
          updated_at?: string
          user_id?: string
          verification?: boolean
        }
        Relationships: []
      }
      paywall_events: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          price_id: string | null
          trigger: string
          user_id: string | null
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          price_id?: string | null
          trigger: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          price_id?: string | null
          trigger?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pending_email_jobs: {
        Row: {
          attempts: number
          created_at: string
          dedupe_key: string | null
          email_type: string
          id: string
          idempotency_key: string | null
          last_error: string | null
          scheduled_for: string
          status: string
          template_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          email_type: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          scheduled_for: string
          status?: string
          template_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          email_type?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          scheduled_for?: string
          status?: string
          template_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_push_jobs: {
        Row: {
          attempts: number
          body: string
          created_at: string
          deep_link: string | null
          id: string
          idempotency_key: string | null
          last_error: string | null
          metadata: Json
          notification_type: string
          scheduled_for: string
          source_event_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          body: string
          created_at?: string
          deep_link?: string | null
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          metadata?: Json
          notification_type: string
          scheduled_for?: string
          source_event_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          body?: string
          created_at?: string
          deep_link?: string | null
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          metadata?: Json
          notification_type?: string
          scheduled_for?: string
          source_event_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pet_photos: {
        Row: {
          created_at: string
          id: string
          image_url: string
          pet_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          pet_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          pet_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pet_photos_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_photos_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "public_pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          age: number | null
          breed: string | null
          created_at: string
          feeding_notes: string | null
          good_with_children: boolean | null
          good_with_pets: boolean | null
          id: string
          medication_notes: string | null
          name: string
          owner_id: string
          size: string | null
          special_instructions: string | null
          temperament: string | null
          type: string
          updated_at: string
          walking_needs: string | null
        }
        Insert: {
          age?: number | null
          breed?: string | null
          created_at?: string
          feeding_notes?: string | null
          good_with_children?: boolean | null
          good_with_pets?: boolean | null
          id?: string
          medication_notes?: string | null
          name: string
          owner_id: string
          size?: string | null
          special_instructions?: string | null
          temperament?: string | null
          type: string
          updated_at?: string
          walking_needs?: string | null
        }
        Update: {
          age?: number | null
          breed?: string | null
          created_at?: string
          feeding_notes?: string | null
          good_with_children?: boolean | null
          good_with_pets?: boolean | null
          id?: string
          medication_notes?: string | null
          name?: string
          owner_id?: string
          size?: string | null
          special_instructions?: string | null
          temperament?: string | null
          type?: string
          updated_at?: string
          walking_needs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          created_at: string
          id: string
          viewed_user_id: string
          viewer_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          viewed_user_id: string
          viewer_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          viewed_user_id?: string
          viewer_user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          area: string | null
          available_now: boolean
          avatar_url: string | null
          average_rating: number
          bio: string | null
          cancellations_count: number
          completed_swaps: number
          created_at: string
          credits_balance: number
          daily_matches_count: number
          daily_matches_reset_at: string
          deleted_at: string | null
          deletion_completed_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          growth_score: number
          has_children: boolean
          has_pets: boolean
          household_type: string | null
          id: string
          is_active: boolean
          is_address_verified: boolean
          is_demo: boolean
          is_email_verified: boolean
          is_id_verified: boolean
          is_location_verified: boolean
          is_pet_owner_verified: boolean
          is_phone_verified: boolean
          is_premium: boolean
          last_active_at: string
          last_seen_at: string | null
          latitude: number | null
          location_verified_at: string | null
          longitude: number | null
          onboarding_completed: boolean
          pet_experience: string | null
          pet_owner_verified_at: string | null
          phone: string | null
          postcode: string | null
          profile_completion_pct: number
          referral_code: string | null
          reliability_score: number
          response_rate: number
          role_preference: string | null
          selfie_with_pet_url: string | null
          subscription_tier: string
          total_reviews: number
          trust_score: number
          trust_tier: string
          updated_at: string
        }
        Insert: {
          account_status?: string
          area?: string | null
          available_now?: boolean
          avatar_url?: string | null
          average_rating?: number
          bio?: string | null
          cancellations_count?: number
          completed_swaps?: number
          created_at?: string
          credits_balance?: number
          daily_matches_count?: number
          daily_matches_reset_at?: string
          deleted_at?: string | null
          deletion_completed_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          growth_score?: number
          has_children?: boolean
          has_pets?: boolean
          household_type?: string | null
          id: string
          is_active?: boolean
          is_address_verified?: boolean
          is_demo?: boolean
          is_email_verified?: boolean
          is_id_verified?: boolean
          is_location_verified?: boolean
          is_pet_owner_verified?: boolean
          is_phone_verified?: boolean
          is_premium?: boolean
          last_active_at?: string
          last_seen_at?: string | null
          latitude?: number | null
          location_verified_at?: string | null
          longitude?: number | null
          onboarding_completed?: boolean
          pet_experience?: string | null
          pet_owner_verified_at?: string | null
          phone?: string | null
          postcode?: string | null
          profile_completion_pct?: number
          referral_code?: string | null
          reliability_score?: number
          response_rate?: number
          role_preference?: string | null
          selfie_with_pet_url?: string | null
          subscription_tier?: string
          total_reviews?: number
          trust_score?: number
          trust_tier?: string
          updated_at?: string
        }
        Update: {
          account_status?: string
          area?: string | null
          available_now?: boolean
          avatar_url?: string | null
          average_rating?: number
          bio?: string | null
          cancellations_count?: number
          completed_swaps?: number
          created_at?: string
          credits_balance?: number
          daily_matches_count?: number
          daily_matches_reset_at?: string
          deleted_at?: string | null
          deletion_completed_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          growth_score?: number
          has_children?: boolean
          has_pets?: boolean
          household_type?: string | null
          id?: string
          is_active?: boolean
          is_address_verified?: boolean
          is_demo?: boolean
          is_email_verified?: boolean
          is_id_verified?: boolean
          is_location_verified?: boolean
          is_pet_owner_verified?: boolean
          is_phone_verified?: boolean
          is_premium?: boolean
          last_active_at?: string
          last_seen_at?: string | null
          latitude?: number | null
          location_verified_at?: string | null
          longitude?: number | null
          onboarding_completed?: boolean
          pet_experience?: string | null
          pet_owner_verified_at?: string | null
          phone?: string | null
          postcode?: string | null
          profile_completion_pct?: number
          referral_code?: string | null
          reliability_score?: number
          response_rate?: number
          role_preference?: string | null
          selfie_with_pet_url?: string | null
          subscription_tier?: string
          total_reviews?: number
          trust_score?: number
          trust_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_valid: boolean
          last_used_at: string
          p256dh: string
          platform: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_valid?: boolean
          last_used_at?: string
          p256dh: string
          platform?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_valid?: boolean
          last_used_at?: string
          p256dh?: string
          platform?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          credited_at: string | null
          id: string
          invitee_id: string
          inviter_id: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          credited_at?: string | null
          id?: string
          invitee_id: string
          inviter_id: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          credited_at?: string | null
          id?: string
          invitee_id?: string
          inviter_id?: string
          status?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_note: string | null
          category: string
          created_at: string
          description: string
          id: string
          reported_user_id: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          swap_id: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          reported_user_id: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          swap_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          reported_user_id?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          swap_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          swap_id: string
          tags: string[]
          would_trust_again: boolean
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          swap_id: string
          tags?: string[]
          would_trust_again?: boolean
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          swap_id?: string
          tags?: string[]
          would_trust_again?: boolean
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      swaps: {
        Row: {
          cancellation_reason: string | null
          created_at: string
          credits_amount: number
          end_at: string
          helper_id: string
          id: string
          owner_id: string
          pet_id: string
          request_id: string | null
          start_at: string
          status: string
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string
          credits_amount: number
          end_at: string
          helper_id: string
          id?: string
          owner_id: string
          pet_id: string
          request_id?: string | null
          start_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string
          credits_amount?: number
          end_at?: string
          helper_id?: string
          id?: string
          owner_id?: string
          pet_id?: string
          request_id?: string | null
          start_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_type: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak_days: number
          freezes_remaining: number
          freezes_reset_month: string | null
          last_activity_date: string | null
          longest_streak: number
          streak_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak_days?: number
          freezes_remaining?: number
          freezes_reset_month?: string | null
          last_activity_date?: string | null
          longest_streak?: number
          streak_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak_days?: number
          freezes_remaining?: number
          freezes_reset_month?: string | null
          last_activity_date?: string | null
          longest_streak?: number
          streak_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verifications: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          reviewed_at: string | null
          status: string
          user_id: string
          verification_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          reviewed_at?: string | null
          status?: string
          user_id: string
          verification_type: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          reviewed_at?: string | null
          status?: string
          user_id?: string
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_pets: {
        Row: {
          age: number | null
          breed: string | null
          created_at: string | null
          good_with_children: boolean | null
          good_with_pets: boolean | null
          id: string | null
          name: string | null
          owner_id: string | null
          size: string | null
          temperament: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          breed?: string | null
          created_at?: string | null
          good_with_children?: boolean | null
          good_with_pets?: boolean | null
          id?: string | null
          name?: string | null
          owner_id?: string | null
          size?: string | null
          temperament?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          breed?: string | null
          created_at?: string | null
          good_with_children?: boolean | null
          good_with_pets?: boolean | null
          id?: string | null
          name?: string | null
          owner_id?: string | null
          size?: string | null
          temperament?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profile_view: {
        Row: {
          area: string | null
          available_now: boolean | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          completed_swaps: number | null
          first_name: string | null
          has_children: boolean | null
          has_pets: boolean | null
          household_type: string | null
          id: string | null
          is_email_verified: boolean | null
          is_id_verified: boolean | null
          is_phone_verified: boolean | null
          last_active_at: string | null
          pet_experience: string | null
          profile_completion_pct: number | null
          referral_code: string | null
          reliability_score: number | null
          subscription_tier: string | null
          total_reviews: number | null
          trust_score: number | null
          trust_tier: string | null
        }
        Insert: {
          area?: string | null
          available_now?: boolean | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          completed_swaps?: number | null
          first_name?: string | null
          has_children?: boolean | null
          has_pets?: boolean | null
          household_type?: string | null
          id?: string | null
          is_email_verified?: boolean | null
          is_id_verified?: boolean | null
          is_phone_verified?: boolean | null
          last_active_at?: string | null
          pet_experience?: string | null
          profile_completion_pct?: number | null
          referral_code?: string | null
          reliability_score?: number | null
          subscription_tier?: string | null
          total_reviews?: number | null
          trust_score?: number | null
          trust_tier?: string | null
        }
        Update: {
          area?: string | null
          available_now?: boolean | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          completed_swaps?: number | null
          first_name?: string | null
          has_children?: boolean | null
          has_pets?: boolean | null
          household_type?: string | null
          id?: string | null
          is_email_verified?: boolean | null
          is_id_verified?: boolean | null
          is_phone_verified?: boolean | null
          last_active_at?: string | null
          pet_experience?: string | null
          profile_completion_pct?: number | null
          referral_code?: string | null
          reliability_score?: number | null
          subscription_tier?: string | null
          total_reviews?: number | null
          trust_score?: number | null
          trust_tier?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          account_status: string | null
          area: string | null
          available_now: boolean | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          completed_swaps: number | null
          created_at: string | null
          deleted_at: string | null
          first_name: string | null
          id: string | null
          is_address_verified: boolean | null
          is_email_verified: boolean | null
          is_id_verified: boolean | null
          is_location_verified: boolean | null
          is_pet_owner_verified: boolean | null
          is_phone_verified: boolean | null
          is_premium: boolean | null
          last_active_at: string | null
          last_seen_at: string | null
          latitude: number | null
          longitude: number | null
          postcode: string | null
          profile_completion_pct: number | null
          response_rate: number | null
          subscription_tier: string | null
          total_reviews: number | null
          trust_score: number | null
          trust_tier: string | null
        }
        Insert: {
          account_status?: string | null
          area?: string | null
          available_now?: boolean | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          completed_swaps?: number | null
          created_at?: string | null
          deleted_at?: string | null
          first_name?: string | null
          id?: string | null
          is_address_verified?: boolean | null
          is_email_verified?: boolean | null
          is_id_verified?: boolean | null
          is_location_verified?: boolean | null
          is_pet_owner_verified?: boolean | null
          is_phone_verified?: boolean | null
          is_premium?: boolean | null
          last_active_at?: string | null
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          postcode?: string | null
          profile_completion_pct?: number | null
          response_rate?: number | null
          subscription_tier?: string | null
          total_reviews?: number | null
          trust_score?: number | null
          trust_tier?: string | null
        }
        Update: {
          account_status?: string | null
          area?: string | null
          available_now?: boolean | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          completed_swaps?: number | null
          created_at?: string | null
          deleted_at?: string | null
          first_name?: string | null
          id?: string | null
          is_address_verified?: boolean | null
          is_email_verified?: boolean | null
          is_id_verified?: boolean | null
          is_location_verified?: boolean | null
          is_pet_owner_verified?: boolean | null
          is_phone_verified?: boolean | null
          is_premium?: boolean | null
          last_active_at?: string | null
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          postcode?: string | null
          profile_completion_pct?: number | null
          response_rate?: number | null
          subscription_tier?: string | null
          total_reviews?: number | null
          trust_score?: number | null
          trust_tier?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_care_request: {
        Args: { _request_id: string }
        Returns: {
          cancellation_reason: string | null
          created_at: string
          credits_amount: number
          end_at: string
          helper_id: string
          id: string
          owner_id: string
          pet_id: string
          request_id: string | null
          start_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "swaps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      accept_connection: {
        Args: { _connection_id: string }
        Returns: {
          created_at: string
          id: string
          recipient_id: string
          request_message: string | null
          requester_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      accept_conversation: {
        Args: { _conversation_id: string }
        Returns: {
          created_at: string
          id: string
          initiator_id: string | null
          last_message_at: string
          last_message_preview: string | null
          status: string
          user_a: string
          user_b: string
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      block_user: {
        Args: { _blocked_user_id: string }
        Returns: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        SetofOptions: {
          from: "*"
          to: "blocks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_profile_completion: {
        Args: { _user_id: string }
        Returns: number
      }
      calculate_trust_score: { Args: { _user_id: string }; Returns: number }
      cancel_account_deletion: { Args: never; Returns: undefined }
      cancel_care_request: {
        Args: { _request_id: string }
        Returns: {
          care_type: string
          created_at: string
          creator_id: string
          credits_offered: number
          end_at: string
          flexible_timing: boolean
          id: string
          location_area: string | null
          notes: string | null
          pet_id: string
          start_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "care_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_connection: {
        Args: { _connection_id: string }
        Returns: {
          created_at: string
          id: string
          recipient_id: string
          request_message: string | null
          requester_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_first_admin: {
        Args: never
        Returns: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_roles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_chat_booking: {
        Args: { _booking_id: string }
        Returns: {
          care_request_id: string | null
          completed_by_helper_at: string | null
          completed_by_owner_at: string | null
          confirmed_by_helper_at: string | null
          confirmed_by_owner_at: string | null
          conversation_id: string
          created_at: string
          credits_amount: number
          end_at: string
          helper_id: string
          id: string
          owner_id: string
          pet_id: string | null
          pickup_notes: string | null
          proposed_by: string
          start_at: string
          status: string
          swap_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_care_request: {
        Args: {
          _care_type: string
          _credits_offered: number
          _end_at: string
          _flexible_timing?: boolean
          _location_area?: string
          _notes?: string
          _pet_id: string
          _start_at: string
        }
        Returns: {
          care_type: string
          created_at: string
          creator_id: string
          credits_offered: number
          end_at: string
          flexible_timing: boolean
          id: string
          location_area: string | null
          notes: string | null
          pet_id: string
          start_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "care_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_connection: {
        Args: { _message?: string; _recipient_id: string }
        Returns: {
          created_at: string
          id: string
          recipient_id: string
          request_message: string | null
          requester_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decline_connection: {
        Args: { _connection_id: string }
        Returns: {
          created_at: string
          id: string
          recipient_id: string
          request_message: string | null
          requester_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decline_conversation: {
        Args: { _conversation_id: string }
        Returns: {
          created_at: string
          id: string
          initiator_id: string | null
          last_message_at: string
          last_message_preview: string | null
          status: string
          user_a: string
          user_b: string
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_account_status: { Args: never; Returns: Json }
      get_conversion_funnel: {
        Args: { _days?: number }
        Returns: {
          avg_match_to_booking_hours: number
          chats_started: number
          confirmed: number
          matches: number
          proposals_opened: number
          requests_sent: number
        }[]
      }
      get_credit_summary: { Args: { _user_id: string }; Returns: Json }
      get_monetization_metrics: { Args: { _days?: number }; Returns: Json }
      get_my_profile_views_today: { Args: never; Returns: number }
      get_or_create_conversation: {
        Args: { _other_user_id: string }
        Returns: {
          created_at: string
          id: string
          initiator_id: string | null
          last_message_at: string
          last_message_preview: string | null
          status: string
          user_a: string
          user_b: string
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_trust_breakdown: { Args: { _user_id: string }; Returns: Json }
      get_viral_metrics: { Args: { _days?: number }; Returns: Json }
      has_active_boost: { Args: { user_uuid: string }; Returns: boolean }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_daily_matches: { Args: { _user_id: string }; Returns: number }
      is_blocked: { Args: { _a: string; _b: string }; Returns: boolean }
      list_credit_transactions: {
        Args: { _before?: string; _limit?: number }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reason: string
          related_referral_id: string | null
          related_swap_id: string | null
          type: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "credit_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mark_chat_booking_completed: {
        Args: { _booking_id: string }
        Returns: {
          care_request_id: string | null
          completed_by_helper_at: string | null
          completed_by_owner_at: string | null
          confirmed_by_helper_at: string | null
          confirmed_by_owner_at: string | null
          conversation_id: string
          created_at: string
          credits_amount: number
          end_at: string
          helper_id: string
          id: string
          owner_id: string
          pet_id: string | null
          pickup_notes: string | null
          proposed_by: string
          start_at: string
          status: string
          swap_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_communication_converted: {
        Args: {
          _conversion_type: string
          _event_type: string
          _source_event_id: string
          _user_id: string
        }
        Returns: undefined
      }
      mark_conversation_read: {
        Args: { _conversation_id: string }
        Returns: number
      }
      mark_push_converted: {
        Args: { _conversion: string; _type: string; _user_id: string }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      propose_chat_booking: {
        Args: {
          _care_request_id?: string
          _conversation_id: string
          _credits_amount?: number
          _end_at: string
          _pet_id: string
          _pickup_notes?: string
          _start_at: string
        }
        Returns: {
          care_request_id: string | null
          completed_by_helper_at: string | null
          completed_by_owner_at: string | null
          confirmed_by_helper_at: string | null
          confirmed_by_owner_at: string | null
          conversation_id: string
          created_at: string
          credits_amount: number
          end_at: string
          helper_id: string
          id: string
          owner_id: string
          pet_id: string | null
          pickup_notes: string | null
          proposed_by: string
          start_at: string
          status: string
          swap_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      purge_expired_deletions: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_trust: { Args: { _user_id: string }; Returns: undefined }
      recompute_user_badges: { Args: { _user_id: string }; Returns: string[] }
      recompute_user_growth_score: {
        Args: { _user_id: string }
        Returns: number
      }
      record_communication_event: {
        Args: {
          _event_type: string
          _fallback_after_minutes?: number
          _fallback_channel?: string
          _metadata?: Json
          _primary_channel: string
          _source_event_id: string
          _user_id: string
        }
        Returns: string
      }
      record_credit_movement: {
        Args: {
          _amount: number
          _description?: string
          _reason: string
          _referral_id?: string
          _swap_id?: string
          _type: string
          _user_id: string
        }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reason: string
          related_referral_id: string | null
          related_swap_id: string | null
          type: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "credit_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_streak_activity: {
        Args: { _activity: string }
        Returns: {
          created_at: string
          current_streak_days: number
          freezes_remaining: number
          freezes_reset_month: string | null
          last_activity_date: string | null
          longest_streak: number
          streak_type: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_streaks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      redeem_referral: {
        Args: { _code: string }
        Returns: {
          code: string
          created_at: string
          credited_at: string | null
          id: string
          invitee_id: string
          inviter_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "referrals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      report_user: {
        Args: {
          _category: string
          _description: string
          _reported_user_id: string
          _swap_id?: string
        }
        Returns: {
          admin_note: string | null
          category: string
          created_at: string
          description: string
          id: string
          reported_user_id: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          swap_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_account_deletion: { Args: never; Returns: undefined }
      review_id_verification: {
        Args: { _approve: boolean; _verification_id: string }
        Returns: {
          created_at: string
          id: string
          metadata: Json
          reviewed_at: string | null
          status: string
          user_id: string
          verification_type: string
        }
        SetofOptions: {
          from: "*"
          to: "verifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_availability: {
        Args: { _dates: string[]; _slot?: string }
        Returns: {
          created_at: string
          date: string
          id: string
          slot: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "availability"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_user_role: {
        Args: {
          _email: string
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      should_send_push: {
        Args: { _local_hour: number; _type: string; _user_id: string }
        Returns: string
      }
      submit_id_verification: {
        Args: { _id_image_path: string; _selfie_path: string }
        Returns: {
          created_at: string
          id: string
          metadata: Json
          reviewed_at: string | null
          status: string
          user_id: string
          verification_type: string
        }
        SetofOptions: {
          from: "*"
          to: "verifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_review: {
        Args: {
          _comment?: string
          _rating: number
          _swap_id: string
          _tags?: string[]
          _would_trust_again?: boolean
        }
        Returns: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          swap_id: string
          tags: string[]
          would_trust_again: boolean
        }
        SetofOptions: {
          from: "*"
          to: "reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_my_email_verification: { Args: never; Returns: boolean }
      unblock_user: { Args: { _blocked_user_id: string }; Returns: undefined }
      unread_message_count: { Args: never; Returns: number }
      update_last_seen: { Args: never; Returns: undefined }
      user_channel_count_today: {
        Args: { _channel: string; _user_id: string }
        Returns: number
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
