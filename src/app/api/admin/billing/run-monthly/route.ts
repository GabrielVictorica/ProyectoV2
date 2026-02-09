import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST - Execute monthly billing function manually
export async function POST() {
    try {
        // Verify God user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'god') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Execute the monthly closing function using raw SQL
        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .rpc('run_monthly_billing_close' as any);

        if (error) {
            console.error('Error executing monthly closing:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: data || 'Cierre mensual ejecutado correctamente'
        });
    } catch (err) {
        console.error('Error in monthly billing run:', err);
        return NextResponse.json({ error: 'Error al ejecutar cierre mensual' }, { status: 500 });
    }
}
