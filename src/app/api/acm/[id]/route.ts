import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest } from 'next/server';

/**
 * GET /api/acm/[id]
 * Público — devuelve datos del ACM para la página compartible.
 * Solo si is_public = true.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data, error } = await (adminClient as any)
    .from('acm_reports')
    .select(`
      id, status, is_public,
      property_data, property_images,
      comparables, foda_analysis,
      conclusions, suggested_price_usd, suggested_price_ars,
      agent_conclusion, agent_branding,
      created_at, updated_at,
      agent_id, organization_id
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return Response.json({ error: 'ACM no encontrado' }, { status: 404 });
  }

  if (!data.is_public) {
    return Response.json({ error: 'Este ACM no está disponible' }, { status: 403 });
  }

  if (data.status !== 'completed' && data.status !== 'foda_done') {
    return Response.json({ error: 'Este ACM aún no está completo' }, { status: 403 });
  }

  return Response.json({ success: true, data });
}
