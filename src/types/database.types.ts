export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    role: 'customer' | 'contractor'
                    full_name: string | null
                    phone: string | null
                    address: string | null
                    zip_code: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    role: 'customer' | 'contractor'
                    full_name?: string | null
                    phone?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    role?: 'customer' | 'contractor'
                    full_name?: string | null
                    phone?: string | null
                    created_at?: string
                }
            }
            contractors: {
                Row: {
                    id: string
                    company_name: string
                    org_nr: string | null
                    service_radius_km: number | null
                    location: unknown | null
                    services: string[] | null
                    is_available: boolean | null
                    // New fields
                    category: string[] | null
                    latitude: number | null
                    longitude: number | null
                    postcodes: string[] | null
                    min_price: number | null
                }
                Insert: {
                    id: string
                    company_name: string
                    org_nr?: string | null
                    service_radius_km?: number | null
                    location?: unknown | null
                    services?: string[] | null
                    is_available?: boolean | null
                    // New fields
                    category?: string[] | null
                    latitude?: number | null
                    longitude?: number | null
                    postcodes?: string[] | null
                    min_price?: number | null
                }
                Update: {
                    id?: string
                    company_name?: string
                    org_nr?: string | null
                    service_radius_km?: number | null
                    location?: unknown | null
                    services?: string[] | null
                    is_available?: boolean | null
                    // New fields
                    category?: string[] | null
                    latitude?: number | null
                    longitude?: number | null
                    postcodes?: string[] | null
                    min_price?: number | null
                }
            }
            jobs: {
                Row: {
                    id: string
                    customer_id: string
                    description_raw: string | null
                    structured_data: Json | null
                    location_address: string | null
                    location: unknown | null
                    price_min: number | null
                    price_max: number | null
                    stripe_payment_intent_id: string | null
                    status: 'draft' | 'pending_contractor' | 'assigned' | 'completed' | 'cancelled' | 'manual_review'
                    created_at: string
                    // New fields
                    main_category: string | null
                    subcategory: string | null
                    estimated_hours: number | null
                    material_needed: boolean | null
                    number_of_workers: number | null
                    complexity: number | null
                    price_modifier: number | null
                    price_ai: number | null
                    customer_lat: number | null
                    customer_lng: number | null
                }
                Insert: {
                    id?: string
                    customer_id: string
                    description_raw?: string | null
                    structured_data?: Json | null
                    location_address?: string | null
                    location?: unknown | null
                    price_min?: number | null
                    price_max?: number | null
                    stripe_payment_intent_id?: string | null
                    status?: 'draft' | 'pending_contractor' | 'assigned' | 'completed' | 'cancelled'
                    created_at?: string
                    // New fields
                    main_category?: string | null
                    subcategory?: string | null
                    estimated_hours?: number | null
                    material_needed?: boolean | null
                    number_of_workers?: number | null
                    complexity?: number | null
                    price_modifier?: number | null
                    price_ai?: number | null
                    customer_lat?: number | null
                    customer_lng?: number | null
                }
                Update: {
                    id?: string
                    customer_id?: string
                    description_raw?: string | null
                    structured_data?: Json | null
                    location_address?: string | null
                    location?: unknown | null
                    price_min?: number | null
                    price_max?: number | null
                    stripe_payment_intent_id?: string | null
                    status?: 'draft' | 'pending_contractor' | 'assigned' | 'completed' | 'cancelled'
                    created_at?: string
                    // New fields
                    main_category?: string | null
                    subcategory?: string | null
                    estimated_hours?: number | null
                    material_needed?: boolean | null
                    number_of_workers?: number | null
                    complexity?: number | null
                    price_modifier?: number | null
                    price_ai?: number | null
                    customer_lat?: number | null
                    customer_lng?: number | null
                }
            }
            job_offers: {
                Row: {
                    id: string
                    job_id: string
                    contractor_id: string
                    status: 'pending' | 'accepted' | 'declined' | 'expired'
                    expires_at: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    job_id: string
                    contractor_id: string
                    status?: 'pending' | 'accepted' | 'declined' | 'expired'
                    expires_at: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    job_id?: string
                    contractor_id?: string
                    status?: 'pending' | 'accepted' | 'declined' | 'expired'
                    expires_at?: string
                    created_at?: string
                }
            }
        }
    }
}
