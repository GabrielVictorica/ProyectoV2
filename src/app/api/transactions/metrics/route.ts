import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Verificar que el usuario tiene permisos
async function verifyUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { user: null, profile: null, error: 'No autenticado' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();

    return { user, profile, error: null };
}

// GET - Obtener métricas financieras desde la vista
export async function GET(request: NextRequest) {
    try {
        const { user, profile, error: authError } = await verifyUser();
        if (authError || !profile || !user) {
            return NextResponse.json({ error: authError || 'No autorizado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get('organizationId');
        const agentId = searchParams.get('agentId');
        const year = searchParams.get('year');
        const month = searchParams.get('month');

        const adminClient = createAdminClient();
        let query = adminClient
            .from('view_financial_metrics')
            .select('*');

        // Filtros según rol
        if (profile.role === 'god') {
            if (organizationId) query = query.eq('organization_id', organizationId);
        } else if (profile.role === 'parent') {
            query = query.eq('organization_id', profile.organization_id);
        } else {
            // Child solo ve sus propias métricas
            query = query.eq('agent_id', user.id);
        }

        // Filtros adicionales
        if (agentId) query = query.eq('agent_id', agentId);
        if (year) query = query.eq('year', parseInt(year));
        if (month) query = query.eq('month', parseInt(month));

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Error fetching financial metrics:', err);
        return NextResponse.json({ error: 'Error al obtener métricas' }, { status: 500 });
    }
}
