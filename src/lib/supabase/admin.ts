import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Cliente de Supabase con service_role key
 * SOLO para uso en Server Actions y API Routes
 * NUNCA exponer al cliente
 */
export function createAdminClient(): SupabaseClient<Database> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    if (!supabaseServiceKey.startsWith('eyJ')) {
        console.error('CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY does not look like a valid JWT (should start with "eyJ"). Check your .env.local file.');
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
