import { streamText } from 'ai';
import { tool } from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CHAT_PROVIDER } from '@/lib/ai/providers';
import { ACM_CHAT_SYSTEM_PROMPT } from '@/lib/ai/prompts';

export const maxDuration = 30;

const propertyParamsSchema = z.object({
  address: z.string().nullable().describe('Calle y número'),
  neighborhood: z.string().nullable().describe('Barrio'),
  city: z.string().nullable().describe('Ciudad'),
  propertyType: z
    .enum(['departamento', 'casa', 'ph', 'local', 'oficina', 'terreno'])
    .nullable(),
  totalArea: z.number().nullable().describe('Superficie total en m²'),
  coveredArea: z.number().nullable().describe('Superficie cubierta en m²'),
  uncoveredArea: z.number().nullable().describe('Superficie descubierta o semicubierta en m²'),
  rooms: z.number().nullable().describe('Ambientes totales'),
  bedrooms: z.number().nullable().describe('Dormitorios'),
  bathrooms: z.number().nullable().describe('Baños'),
  garages: z.number().nullable().describe('Cocheras'),
  age: z.number().nullable().describe('Antigüedad en años (0 = a estrenar)'),
  floor: z.number().nullable().describe('Piso (solo para departamentos)'),
  orientation: z.string().nullable().describe('Orientación principal: Norte, Sur, Este, Oeste, NE, etc.'),
  condition: z
    .enum(['excelente', 'muy_bueno', 'bueno', 'regular', 'malo'])
    .nullable()
    .describe('Estado general de la propiedad'),
  amenities: z.array(z.string()).describe('Lista de amenities: pileta, gym, SUM, etc.'),
  description: z.string().describe('Descripción general de la propiedad'),
  additionalNotes: z.string().describe('Notas adicionales relevantes para la tasación'),
});

type PropertyParams = z.infer<typeof propertyParamsSchema>;
type SaveResult = { saved: boolean; reason?: string; fieldsExtracted?: number };

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('No autorizado', { status: 401 });

  const { messages, acmId } = await req.json();

  const savePropertyDataTool = tool<PropertyParams, SaveResult>({
    description:
      'Guardá los datos de la propiedad recopilados en la conversación. ' +
      'Llamá esta función cuando tengas suficiente información sobre la propiedad ' +
      '(mínimo: dirección, tipo de propiedad y superficie). ' +
      'Podés llamarla varias veces a medida que recopilás más datos.',
    inputSchema: propertyParamsSchema,
    execute: async (propertyData): Promise<SaveResult> => {
      if (!acmId) return { saved: false, reason: 'Sin acmId' };

      const adminClient = createAdminClient();
      const { error } = await (adminClient as any)
        .from('acm_reports')
        .update({ property_data: propertyData, status: 'data_collected' })
        .eq('id', acmId)
        .eq('agent_id', user.id);

      if (error) return { saved: false, reason: error.message };

      const filled = Object.values(propertyData as Record<string, unknown>).filter(
        (v) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0),
      ).length;

      return { saved: true, fieldsExtracted: filled };
    },
  });

  const result = streamText({
    model: CHAT_PROVIDER.model,
    system: ACM_CHAT_SYSTEM_PROMPT,
    messages,
    tools: { savePropertyData: savePropertyDataTool },
  });

  return result.toTextStreamResponse();
}
