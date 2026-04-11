import { createClient } from '@/lib/supabase/server';
import { generateWithFallback } from '@/lib/ai/fallback';
import { ACM_CONCLUSION_POLISH_PROMPT } from '@/lib/ai/prompts';

// ── POST: Pulir conclusión del agente con IA ────────────────────────────────

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { rawConclusion, propertyAddress, suggestedPrice, currency } = await req.json();

  if (!rawConclusion || rawConclusion.trim().length < 10) {
    return Response.json({ error: 'La conclusión es muy corta' }, { status: 400 });
  }

  try {
    const context = [
      propertyAddress ? `Propiedad: ${propertyAddress}` : '',
      suggestedPrice ? `Valor sugerido: ${currency || 'USD'} ${suggestedPrice.toLocaleString()}` : '',
    ].filter(Boolean).join('\n');

    const { text } = await generateWithFallback({
      system: ACM_CONCLUSION_POLISH_PROMPT,
      prompt: `${context ? `Contexto:\n${context}\n\n` : ''}Conclusión original del agente:\n"${rawConclusion}"\n\nRedactá la versión profesional:`,
    } as any);

    return Response.json({ success: true, polished: text });
  } catch (err: any) {
    console.error('[Conclusion polish]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
