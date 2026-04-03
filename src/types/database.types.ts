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
      activities: {
        Row: {
          agent_id: string
          client_id: string | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          organization_id: string
          person_id: string | null
          property_id: string | null
          status: string
          time: string | null
          transaction_id: string | null
          type: string
          updated_at: string | null
          visit_metadata: Json | null
        }
        Insert: {
          agent_id: string
          client_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          organization_id: string
          person_id?: string | null
          property_id?: string | null
          status?: string
          time?: string | null
          transaction_id?: string | null
          type: string
          updated_at?: string | null
          visit_metadata?: Json | null
        }
        Update: {
          agent_id?: string
          client_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          person_id?: string | null
          property_id?: string | null
          status?: string
          time?: string | null
          transaction_id?: string | null
          type?: string
          updated_at?: string | null
          visit_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "person_searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "view_anonymous_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_objectives: {
        Row: {
          agent_id: string
          annual_billing_goal: number
          average_commission_target: number | null
          average_ticket_target: number
          conversion_rate: number | null
          created_at: string | null
          currency: string | null
          id: string
          listings_goal_annual: number | null
          listings_goal_end_date: string | null
          listings_goal_start_date: string | null
          monthly_living_expenses: number | null
          pl_to_listing_conversion_target: number | null
          sales_effectiveness_ratio: number
          split_percentage: number | null
          updated_at: string | null
          working_weeks: number | null
          year: number
        }
        Insert: {
          agent_id: string
          annual_billing_goal?: number
          average_commission_target?: number | null
          average_ticket_target?: number
          conversion_rate?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          listings_goal_annual?: number | null
          listings_goal_end_date?: string | null
          listings_goal_start_date?: string | null
          monthly_living_expenses?: number | null
          pl_to_listing_conversion_target?: number | null
          sales_effectiveness_ratio?: number
          split_percentage?: number | null
          updated_at?: string | null
          working_weeks?: number | null
          year: number
        }
        Update: {
          agent_id?: string
          annual_billing_goal?: number
          average_commission_target?: number | null
          average_ticket_target?: number
          conversion_rate?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          listings_goal_annual?: number | null
          listings_goal_end_date?: string | null
          listings_goal_start_date?: string | null
          monthly_living_expenses?: number | null
          pl_to_listing_conversion_target?: number | null
          sales_effectiveness_ratio?: number
          split_percentage?: number | null
          updated_at?: string | null
          working_weeks?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_objectives_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_records: {
        Row: {
          amount: number
          billing_type: string | null
          concept: string
          created_at: string | null
          currency: string | null
          due_date: string
          first_due_date: string | null
          id: string
          internal_notes: string | null
          notes: string | null
          organization_id: string
          original_amount: number | null
          paid_at: string | null
          payment_details: Json | null
          payment_method: string | null
          period: string | null
          receipt_url: string | null
          second_due_date: string | null
          status: string
          surcharge_amount: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          billing_type?: string | null
          concept: string
          created_at?: string | null
          currency?: string | null
          due_date: string
          first_due_date?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          organization_id: string
          original_amount?: number | null
          paid_at?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          period?: string | null
          receipt_url?: string | null
          second_due_date?: string | null
          status?: string
          surcharge_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          billing_type?: string | null
          concept?: string
          created_at?: string | null
          currency?: string | null
          due_date?: string
          first_due_date?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          organization_id?: string
          original_amount?: number | null
          paid_at?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          period?: string | null
          receipt_url?: string | null
          second_due_date?: string | null
          status?: string
          surcharge_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          agent_id: string
          client_id: string
          content: string
          created_at: string
          id: string
          type: string
        }
        Insert: {
          agent_id: string
          client_id: string
          content: string
          created_at?: string
          id?: string
          type: string
        }
        Update: {
          agent_id?: string
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "person_searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "view_anonymous_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_team_members: {
        Row: {
          agent_id: string
          id: string
          is_active: boolean
          joined_at: string
          team: string
        }
        Insert: {
          agent_id: string
          id?: string
          is_active?: boolean
          joined_at?: string
          team: string
        }
        Update: {
          agent_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_team_members_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_addresses: {
        Row: {
          address_type: string
          city: string | null
          created_at: string | null
          floor: string | null
          id: string
          number: string | null
          organization_id: string
          postal_code: string | null
          province: string | null
          street: string | null
          updated_at: string | null
        }
        Insert: {
          address_type: string
          city?: string | null
          created_at?: string | null
          floor?: string | null
          id?: string
          number?: string | null
          organization_id: string
          postal_code?: string | null
          province?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Update: {
          address_type?: string
          city?: string | null
          created_at?: string | null
          floor?: string | null
          id?: string
          number?: string | null
          organization_id?: string
          postal_code?: string | null
          province?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_addresses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          billing_address: string | null
          contract_start_date: string | null
          created_at: string | null
          cuit: string | null
          email: string | null
          id: string
          is_active: boolean | null
          legal_name: string | null
          logo_url: string | null
          name: string
          org_status: string | null
          phone: string | null
          royalty_percentage: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          billing_address?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          cuit?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          org_status?: string | null
          phone?: string | null
          royalty_percentage?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          billing_address?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          cuit?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          org_status?: string | null
          phone?: string | null
          royalty_percentage?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      person_history: {
        Row: {
          agent_id: string | null
          created_at: string | null
          event_type: string
          field_name: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          person_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          event_type: string
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          person_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          event_type?: string
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_history_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_history_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      person_interactions: {
        Row: {
          agent_id: string | null
          content: string | null
          created_at: string | null
          id: string
          organization_id: string | null
          person_id: string | null
          type: string
        }
        Insert: {
          agent_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          person_id?: string | null
          type: string
        }
        Update: {
          agent_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          person_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_interactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: [ "id"]
          },
          {
            foreignKeyName: "person_interactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      person_searches: {
        Row: {
          agent_id: string
          bedrooms: string[] | null
          budget_max: number | null
          budget_min: number | null
          client_type: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_interaction_at: string | null
          last_name: string
          motivation: string | null
          notes: string | null
          organization_id: string
          payment_methods: string[] | null
          person_id: string | null
          phone: string | null
          preferences: Json | null
          preferred_zones: string[] | null
          property_types: string[] | null
          search_type: Database["public"]["Enums"]["client_type"] | null
          secondary_phone: string | null
          source: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          bedrooms?: string[] | null
          budget_max?: number | null
          budget_min?: number | null
          client_type?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_interaction_at?: string | null
          last_name: string
          motivation?: string | null
          notes?: string | null
          organization_id: string
          payment_methods?: string[] | null
          person_id?: string | null
          phone?: string | null
          preferences?: Json | null
          preferred_zones?: string[] | null
          property_types?: string[] | null
          search_type?: Database["public"]["Enums"]["client_type"] | null
          secondary_phone?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          bedrooms?: string[] | null
          budget_max?: number | null
          budget_min?: number | null
          client_type?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_interaction_at?: string | null
          last_name?: string
          motivation?: string | null
          notes?: string | null
          organization_id?: string
          payment_methods?: string[] | null
          person_id?: string | null
          phone?: string | null
          preferences?: Json | null
          preferred_zones?: string[] | null
          property_types?: string[] | null
          search_type?: Database["public"]["Enums"]["client_type"] | null
          secondary_phone?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      persons: {
        Row: {
          agent_id: string | null
          best_contact_time: string | null
          birthday: string | null
          contact_type: string[] | null
          created_at: string | null
          dni_cuil: string | null
          email: string | null
          family_composition: string | null
          family_notes: string | null
          first_name: string
          id: string
          influence_level: number | null
          interests_hobbies: string | null
          language: string | null
          last_interaction_at: string | null
          last_name: string
          lifecycle_status: string | null
          lost_reason: string | null
          next_action_at: string | null
          observations: string | null
          occupation_company: string | null
          organization_id: string | null
          personality_notes: string | null
          phone: string | null
          preferred_channel: string | null
          referred_by_id: string | null
          relationship_status: string | null
          source: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          best_contact_time?: string | null
          birthday?: string | null
          contact_type?: string[] | null
          created_at?: string | null
          dni_cuil?: string | null
          email?: string | null
          family_composition?: string | null
          family_notes?: string | null
          first_name: string
          id?: string
          influence_level?: number | null
          interests_hobbies?: string | null
          language?: string | null
          last_interaction_at?: string | null
          last_name: string
          lifecycle_status?: string | null
          lost_reason?: string | null
          next_action_at?: string | null
          observations?: string | null
          occupation_company?: string | null
          organization_id?: string | null
          personality_notes?: string | null
          phone?: string | null
          preferred_channel?: string | null
          referred_by_id?: string | null
          relationship_status?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          best_contact_time?: string | null
          birthday?: string | null
          contact_type?: string[] | null
          created_at?: string | null
          dni_cuil?: string | null
          email?: string | null
          family_composition?: string | null
          family_notes?: string | null
          first_name?: string
          id?: string
          influence_level?: number | null
          interests_hobbies?: string | null
          language?: string | null
          last_interaction_at?: string | null
          last_name?: string
          lifecycle_status?: string | null
          lost_reason?: string | null
          next_action_at?: string | null
          observations?: string | null
          occupation_company?: string | null
          organization_id?: string | null
          personality_notes?: string | null
          phone?: string | null
          preferred_channel?: string | null
          referred_by_id?: string | null
          relationship_status?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persons_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_referred_by_id_fkey"
            columns: ["referred_by_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_supervisors: {
        Row: {
          agent_id: string
          created_at: string | null
          supervisor_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          supervisor_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_supervisors_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_supervisors_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          default_split_percentage: number | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          organization_id: string | null
          parent_id: string | null
          phone: string | null
          reports_to_organization_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_split_percentage?: number | null
          first_name: string
          id: string
          is_active?: boolean | null
          last_name: string
          organization_id?: string | null
          parent_id?: string | null
          phone?: string | null
          reports_to_organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_split_percentage?: number | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          organization_id?: string | null
          parent_id?: string | null
          phone?: string | null
          reports_to_organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_reports_to_organization_id_fkey"
            columns: ["reports_to_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          agent_id: string
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          covered_area: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          floor_number: number | null
          garage_spaces: number | null
          has_garden: boolean | null
          has_pool: boolean | null
          id: string
          images: Json | null
          is_featured: boolean | null
          is_published: boolean | null
          neighborhood: string | null
          operation_type: string | null
          organization_id: string
          price: number | null
          property_type_id: string | null
          status_id: string | null
          title: string
          total_area: number | null
          updated_at: string | null
          video_url: string | null
          views_count: number | null
          virtual_tour_url: string | null
        }
        Insert: {
          address?: string | null
          agent_id: string
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          covered_area?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          floor_number?: number | null
          garage_spaces?: number | null
          has_garden?: boolean | null
          has_pool?: boolean | null
          id?: string
          images?: Json | null
          is_featured?: boolean | null
          is_published?: boolean | null
          neighborhood?: string | null
          operation_type?: string | null
          organization_id: string
          price?: number | null
          property_type_id?: string | null
          status_id?: string | null
          title: string
          total_area?: number | null
          updated_at?: string | null
          video_url?: string | null
          views_count?: number | null
          virtual_tour_url?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          covered_area?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          floor_number?: number | null
          garage_spaces?: number | null
          has_garden?: boolean | null
          has_pool?: boolean | null
          id?: string
          images?: Json | null
          is_featured?: boolean | null
          is_published?: boolean | null
          neighborhood?: string | null
          operation_type?: string | null
          organization_id?: string
          price?: number | null
          property_type_id?: string | null
          status_id?: string | null
          title?: string
          total_area?: number | null
          updated_at?: string | null
          video_url?: string | null
          views_count?: number | null
          virtual_tour_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_property_type_id_fkey"
            columns: ["property_type_id"]
            isOneToOne: false
            referencedRelation: "property_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "property_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      property_interests: {
        Row: {
          agent_id: string
          client_id: string
          created_at: string | null
          id: string
          interest_level: string | null
          notes: string | null
          property_id: string
        }
        Insert: {
          agent_id: string
          client_id: string
          created_at?: string | null
          id?: string
          interest_level?: string | null
          notes?: string | null
          property_id: string
        }
        Update: {
          agent_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          interest_level?: string | null
          notes?: string | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_interests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_interests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_interests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "person_searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_interests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "view_anonymous_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_interests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_statuses: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      property_types: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          actual_price: number
          agent_id: string
          agent_split_percentage: number
          buyer_id: string | null
          buyer_name: string | null
          buyer_person_id: string | null
          cancellation_reason: string | null
          closing_date: string | null
          commission_percentage: number
          created_at: string | null
          custom_property_title: string | null
          gross_commission: number
          id: string
          master_commission_amount: number | null
          net_commission: number
          notes: string | null
          office_commission_amount: number | null
          organization_id: string
          property_id: string | null
          royalty_percentage_at_closure: number | null
          seller_id: string | null
          seller_name: string | null
          seller_person_id: string | null
          sides: number
          status: string | null
          transaction_date: string
          updated_at: string | null
        }
        Insert: {
          actual_price: number
          agent_id: string
          agent_split_percentage?: number
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_person_id?: string | null
          cancellation_reason?: string | null
          closing_date?: string | null
          commission_percentage?: number
          created_at?: string | null
          custom_property_title?: string | null
          gross_commission: number
          id?: string
          master_commission_amount?: number | null
          net_commission?: number
          notes?: string | null
          office_commission_amount?: number | null
          organization_id: string
          property_id?: string | null
          royalty_percentage_at_closure?: number | null
          seller_id?: string | null
          seller_name?: string | null
          seller_person_id?: string | null
          sides?: number
          status?: string | null
          transaction_date?: string
          updated_at?: string | null
        }
        Update: {
          actual_price?: number
          agent_id?: string
          agent_split_percentage?: number
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_person_id?: string | null
          cancellation_reason?: string | null
          closing_date?: string | null
          commission_percentage?: number
          created_at?: string | null
          custom_property_title?: string | null
          gross_commission?: number
          id?: string
          master_commission_amount?: number | null
          net_commission?: number
          notes?: string | null
          office_commission_amount?: number | null
          organization_id?: string
          property_id?: string | null
          royalty_percentage_at_closure?: number | null
          seller_id?: string | null
          seller_name?: string | null
          seller_person_id?: string | null
          sides?: number
          status?: string | null
          transaction_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "person_searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "view_anonymous_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_buyer_person_id_fkey"
            columns: ["buyer_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "person_searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "view_anonymous_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_person_id_fkey"
            columns: ["seller_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_notes: {
        Row: {
          agent_id: string
          content: string | null
          created_at: string | null
          id: string
          organization_id: string
          updated_at: string | null
          week_start_date: string
        }
        Insert: {
          agent_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          organization_id: string
          updated_at?: string | null
          week_start_date: string
        }
        Update: {
          agent_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string
          updated_at?: string | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      clients: {
        Row: {
          agent_id: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_interaction_at: string | null
          last_name: string | null
          motivation: string | null
          organization_id: string | null
          person_id: string | null
          phone: string | null
          preferred_zones: string[] | null
          search_bedrooms: string[] | null
          search_payment_methods: string[] | null
          search_property_types: string[] | null
          source: string | null
          status: string | null
          tags: string[] | null
          type: Database["public"]["Enums"]["client_type"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      view_agent_progress: {
        Row: {
          actual_active_listings_count: number | null
          actual_gross_income: number | null
          actual_puntas_count: number | null
          agent_id: string | null
          annual_billing_goal: number | null
          average_commission_target: number | null
          average_ticket_target: number | null
          completed_gross_income: number | null
          completed_puntas_count: number | null
          conversion_rate: number | null
          currency: string | null
          estimated_puntas_needed: number | null
          financial_viability_ratio: number | null
          gap_to_goal: number | null
          listings_goal_annual: number | null
          listings_goal_end_date: string | null
          listings_goal_start_date: string | null
          minimum_listings_required: number | null
          monthly_living_expenses: number | null
          net_income_goal: number | null
          objective_id: string | null
          pl_to_listing_conversion_target: number | null
          progress_percentage: number | null
          required_pl_pb_annual: number | null
          required_prelistings_annual: number | null
          required_prelistings_monthly: number | null
          required_prelistings_weekly: number | null
          reserved_gross_income: number | null
          reserved_puntas_count: number | null
          run_rate_projection: number | null
          sales_effectiveness_ratio: number | null
          split_percentage: number | null
          weekly_critical_activities_count: number | null
          weekly_green_meetings_count: number | null
          weekly_pl_pb_target: number | null
          working_weeks: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_objectives_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      view_agent_progress_extended: {
        Row: {
          actual_active_listings_count: number | null
          actual_gross_income: number | null
          actual_puntas_count: number | null
          agent_id: string | null
          annual_billing_goal: number | null
          average_commission_target: number | null
          average_ticket_target: number | null
          completed_gross_income: number | null
          completed_puntas_count: number | null
          conversion_rate: number | null
          currency: string | null
          default_split_percentage: number | null
          estimated_puntas_needed: number | null
          financial_viability_ratio: number | null
          first_name: string | null
          gap_to_goal: number | null
          last_name: string | null
          listings_goal_annual: number | null
          listings_goal_end_date: string | null
          listings_goal_start_date: string | null
          minimum_listings_required: number | null
          monthly_living_expenses: number | null
          net_income_goal: number | null
          objective_id: string | null
          organization_id: string | null
          pl_to_listing_conversion_target: number | null
          progress_percentage: number | null
          required_pl_pb_annual: number | null
          required_prelistings_annual: number | null
          required_prelistings_monthly: number | null
          required_prelistings_weekly: number | null
          reserved_gross_income: number | null
          reserved_puntas_count: number | null
          run_rate_projection: number | null
          sales_effectiveness_ratio: number | null
          split_percentage: number | null
          weekly_critical_activities_count: number | null
          weekly_green_meetings_count: number | null
          weekly_pl_pb_target: number | null
          working_weeks: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_objectives_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      view_anonymous_clients: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          agent_phone: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string | null
          display_name: string | null
          display_phone: string | null
          id: string | null
          motivation: string | null
          organization_id: string | null
          organization_name: string | null
          preferred_zones: string[] | null
          search_bedrooms: string[] | null
          search_payment_methods: string[] | null
          search_property_types: string[] | null
          status: string | null
          tags: string[] | null
          type: Database["public"]["Enums"]["client_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      view_financial_metrics: {
        Row: {
          agent_id: string | null
          average_ticket: number | null
          closed_deals_count: number | null
          double_sided_count: number | null
          month: number | null
          organization_id: string | null
          single_sided_count: number | null
          status: string | null
          total_gross_commission: number | null
          total_master_income: number | null
          total_net_income: number | null
          total_office_income: number | null
          total_sales_volume: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      view_team_objectives_summary: {
        Row: {
          agents_with_goals: number | null
          avg_progress: number | null
          organization_id: string | null
          total_completed_income: number | null
          total_completed_puntas: number | null
          total_puntas_closed: number | null
          total_puntas_needed: number | null
          total_reserved_income: number | null
          total_reserved_puntas: number | null
          total_team_goal: number | null
          total_team_income: number | null
          year: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_org_id: { Args: { user_uuid: string }; Returns: string }
      get_user_organization: { Args: never; Returns: string }
      get_user_reports_to_org_id: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_role:
        | { Args: never; Returns: Database["public"]["Enums"]["user_role"] }
        | {
            Args: { user_uuid: string }
            Returns: Database["public"]["Enums"]["user_role"]
          }
      handle_monthly_closings: { Args: never; Returns: string }
      is_agent_visible_to_user: {
        Args: { p_agent_id: string; p_user_id: string }
        Returns: boolean
      }
      is_god: { Args: { user_uuid: string }; Returns: boolean }
      is_parent: { Args: { user_uuid: string }; Returns: boolean }
      is_parent_of: { Args: { child_id: string }; Returns: boolean }
      run_monthly_billing_close:
        | { Args: never; Returns: string }
        | { Args: { p_period?: string }; Returns: string }
      should_mask_client_data: {
        Args: { p_client_agent_id: string; p_viewer_id: string }
        Returns: boolean
      }
      should_mask_client_data_v2: {
        Args: {
          p_client_agent_id: string
          p_viewer_id: string
          p_viewer_org: string
          p_viewer_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      client_source: "referral" | "portal" | "social" | "walk-in"
      client_status: "active" | "inactive" | "closed" | "archived"
      client_type: "buyer" | "seller" | "investor" | "tenant" | "landlord"
      user_role: "god" | "parent" | "child"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type BillingRecord = Database['public']['Tables']['billing_records']['Row'];
export type UserRole = Database['public']['Enums']['user_role'];
export type Property = Database['public']['Tables']['properties']['Row'];
export type PropertyType = Database['public']['Tables']['property_types']['Row'];
export type PropertyStatus = Database['public']['Tables']['property_statuses']['Row'];
