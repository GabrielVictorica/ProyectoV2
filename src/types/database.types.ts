export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            clients: {
                Row: {
                    agent_id: string
                    client_type: string | null
                    created_at: string | null
                    email: string | null
                    first_name: string
                    id: string
                    last_name: string
                    notes: string | null
                    organization_id: string
                    phone: string | null
                    preferences: Json | null
                    secondary_phone: string | null
                    source: string | null
                    status: string | null
                    updated_at: string | null
                }
                Insert: {
                    agent_id: string
                    client_type?: string | null
                    created_at?: string | null
                    email?: string | null
                    first_name: string
                    id?: string
                    last_name: string
                    notes?: string | null
                    organization_id: string
                    phone?: string | null
                    preferences?: Json | null
                    secondary_phone?: string | null
                    source?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Update: {
                    agent_id?: string
                    client_type?: string | null
                    created_at?: string | null
                    email?: string | null
                    first_name?: string
                    id?: string
                    last_name?: string
                    notes?: string | null
                    organization_id?: string
                    phone?: string | null
                    preferences?: Json | null
                    secondary_phone?: string | null
                    source?: string | null
                    status?: string | null
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
                    }
                ]
            }
            organization_addresses: {
                Row: {
                    id: string
                    organization_id: string
                    address_type: 'office' | 'billing'
                    street: string | null
                    number: string | null
                    floor: string | null
                    city: string | null
                    postal_code: string | null
                    province: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    organization_id: string
                    address_type: 'office' | 'billing'
                    street?: string | null
                    number?: string | null
                    floor?: string | null
                    city?: string | null
                    postal_code?: string | null
                    province?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    organization_id?: string
                    address_type?: 'office' | 'billing'
                    street?: string | null
                    number?: string | null
                    floor?: string | null
                    city?: string | null
                    postal_code?: string | null
                    province?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "organization_addresses_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
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
                    org_status: 'active' | 'suspended' | 'pending_payment' | null
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
                    org_status?: 'active' | 'suspended' | 'pending_payment' | null
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
                    org_status?: 'active' | 'suspended' | 'pending_payment' | null
                    phone?: string | null
                    royalty_percentage?: number | null
                    slug?: string
                    updated_at?: string | null
                }
                Relationships: []
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
                    }
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
                    }
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
                    }
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
                        foreignKeyName: "property_interests_property_id_fkey"
                        columns: ["property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    }
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
            billing_records: {
                Row: {
                    id: string
                    organization_id: string
                    concept: string
                    amount: number
                    status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'pending_review'
                    due_date: string
                    paid_at: string | null
                    notes: string | null
                    period: string | null
                    original_amount: number | null
                    surcharge_amount: number | null
                    first_due_date: string | null
                    second_due_date: string | null
                    payment_method: string | null
                    receipt_url: string | null
                    billing_type: 'royalty' | 'commission' | 'advertising' | 'penalty' | 'adjustment' | null
                    internal_notes: string | null
                    payment_details: Json | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    organization_id: string
                    concept: string
                    amount: number
                    status?: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'pending_review'
                    due_date: string
                    paid_at?: string | null
                    notes?: string | null
                    period?: string | null
                    original_amount?: number | null
                    surcharge_amount?: number | null
                    first_due_date?: string | null
                    second_due_date?: string | null
                    payment_method?: string | null
                    receipt_url?: string | null
                    billing_type?: 'royalty' | 'commission' | 'advertising' | 'penalty' | 'adjustment' | null
                    internal_notes?: string | null
                    payment_details?: Json | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    organization_id?: string
                    concept?: string
                    amount?: number
                    status?: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'pending_review'
                    due_date?: string
                    paid_at?: string | null
                    notes?: string | null
                    period?: string | null
                    original_amount?: number | null
                    surcharge_amount?: number | null
                    first_due_date?: string | null
                    second_due_date?: string | null
                    payment_method?: string | null
                    receipt_url?: string | null
                    billing_type?: 'royalty' | 'commission' | 'advertising' | 'penalty' | 'adjustment' | null
                    internal_notes?: string | null
                    payment_details?: Json | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "billing_records_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            transactions: {
                Row: {
                    id: string
                    organization_id: string
                    property_id: string | null
                    agent_id: string
                    transaction_date: string
                    actual_price: number
                    sides: number
                    commission_percentage: number
                    agent_split_percentage: number
                    gross_commission: number
                    net_commission: number
                    buyer_name: string | null
                    seller_name: string | null
                    buyer_id: string | null
                    seller_id: string | null
                    notes: string | null
                    master_commission_amount: number
                    office_commission_amount: number
                    royalty_percentage_at_closure: number
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    organization_id: string
                    property_id?: string | null
                    agent_id: string
                    transaction_date?: string
                    actual_price: number
                    sides?: number
                    commission_percentage?: number
                    agent_split_percentage: number
                    gross_commission: number
                    net_commission: number
                    buyer_name?: string | null
                    seller_name?: string | null
                    buyer_id?: string | null
                    seller_id?: string | null
                    notes?: string | null
                    master_commission_amount?: number
                    office_commission_amount?: number
                    royalty_percentage_at_closure?: number
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    organization_id?: string
                    property_id?: string | null
                    agent_id?: string
                    transaction_date?: string
                    actual_price?: number
                    sides?: number
                    commission_percentage?: number
                    agent_split_percentage?: number
                    gross_commission?: number
                    net_commission?: number
                    buyer_name?: string | null
                    seller_name?: string | null
                    buyer_id?: string | null
                    seller_id?: string | null
                    notes?: string | null
                    master_commission_amount?: number
                    office_commission_amount?: number
                    royalty_percentage_at_closure?: number
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: [
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
                        foreignKeyName: "transactions_seller_id_fkey"
                        columns: ["seller_id"]
                        isOneToOne: false
                        referencedRelation: "clients"
                        referencedColumns: ["id"]
                    }
                ]
            }
            activities: {
                Row: {
                    agent_id: string
                    client_id: string | null
                    created_at: string | null
                    date: string
                    id: string
                    notes: string | null
                    organization_id: string
                    property_id: string | null
                    status: string
                    time: string | null
                    type: string
                    updated_at: string | null
                }
                Insert: {
                    agent_id: string
                    client_id?: string | null
                    created_at?: string | null
                    date: string
                    id?: string
                    notes?: string | null
                    organization_id: string
                    property_id?: string | null
                    status?: string
                    time?: string | null
                    type: string
                    updated_at?: string | null
                }
                Update: {
                    agent_id?: string
                    client_id?: string | null
                    created_at?: string | null
                    date?: string
                    id?: string
                    notes?: string | null
                    organization_id?: string
                    property_id?: string | null
                    status?: string
                    time?: string | null
                    type?: string
                    updated_at?: string | null
                }
                Relationships: [
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
                        foreignKeyName: "activities_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "activities_property_id_fkey"
                        columns: ["property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    }
                ]
            }

            profile_supervisors: { Row: any; Insert: any; Update: any; Relationships: any[] }
            agent_objectives: { Row: any; Insert: any; Update: any; Relationships: any[] }
            persons: { Row: any; Insert: any; Update: any; Relationships: any[] }
            person_searches: { Row: any; Insert: any; Update: any; Relationships: any[] }
        }
        Views: {
            view_financial_metrics: {
                Row: {
                    organization_id: string
                    agent_id: string
                    year: number
                    month: number
                    total_sales_volume: number
                    total_gross_commission: number
                    total_net_income: number
                    total_master_income: number
                    total_office_income: number
                    closed_deals_count: number
                    average_ticket: number
                    double_sided_count: number
                    single_sided_count: number
                }
                Relationships: []
            }

            view_agent_progress: { Row: any; Relationships: any[] }
            view_team_objectives_summary: { Row: any; Relationships: any[] }
            view_anonymous_clients: { Row: any; Relationships: any[] }
            view_agent_progress_extended: { Row: any; Relationships: any[] }
        }
        Functions: {
            get_user_organization: {
                Args: Record<PropertyKey, never>
                Returns: string
            }
            get_user_role: {
                Args: Record<PropertyKey, never>
                Returns: Database["public"]["Enums"]["user_role"]
            }
            is_parent_of: {
                Args: {
                    child_id: string
                }
                Returns: boolean
            }
        }
        Enums: {
            user_role: "god" | "parent" | "child"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type Insertable<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type Updatable<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]

// Convenience types
export type Profile = Tables<"profiles">
export type Organization = Tables<"organizations">
export type Property = Tables<"properties">
export type Client = Tables<"clients">
export type PropertyType = Tables<"property_types">
export type PropertyStatus = Tables<"property_statuses">
export type PropertyInterest = Tables<"property_interests">
export type BillingRecord = Tables<"billing_records">
export type Transaction = Tables<"transactions">
export type UserRole = Enums<"user_role">
