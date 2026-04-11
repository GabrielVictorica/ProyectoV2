import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data } = await (adminClient as any)
    .from('acm_reports')
    .select('property_data, agent_branding, suggested_price_usd, is_public')
    .eq('id', id)
    .single();

  if (!data || !data.is_public) {
    return {
      title: 'ACM | EntreInmobiliarios',
    };
  }

  const pd = data.property_data as any;
  const brand = data.agent_branding as any;
  const address = [pd?.address, pd?.neighborhood, pd?.city].filter(Boolean).join(', ') || 'Propiedad';
  const price = data.suggested_price_usd
    ? `USD ${Number(data.suggested_price_usd).toLocaleString('es-AR')}`
    : '';
  const description = `Análisis Comparativo de Mercado${price ? ` — Valuación: ${price}` : ''}. ${address}.${brand?.organizationName ? ` Por ${brand.organizationName}.` : ''}`;

  return {
    title: `ACM: ${address} | EntreInmobiliarios`,
    description,
    openGraph: {
      title: `Tasación: ${address}`,
      description,
      type: 'article',
      siteName: 'EntreInmobiliarios',
    },
  };
}

export default function AcmPublicLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-[#030712]">
      {children}
    </div>
  );
}
