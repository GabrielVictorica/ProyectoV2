import { generateObject } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { VISION_PROVIDER } from '@/lib/ai/providers';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { imageUrl } = await req.json();
  if (!imageUrl) return Response.json({ error: 'Sin imagen' }, { status: 400 });

  try {
    const { object } = await generateObject({
      model: VISION_PROVIDER.model,
      schema: z.object({
        chatMessage: z
          .string()
          .describe(
            'Mensaje en primera persona plural para mostrar al agente. ' +
            'Describí lo que se ve en la foto de manera útil para la tasación. ' +
            'Máximo 3 oraciones. Español rioplatense profesional.',
          ),
        observedFeatures: z
          .array(z.string())
          .describe(
            'Lista de características observadas: materiales, estado, distribución, amenities visibles, etc.',
          ),
        estimatedCondition: z
          .enum(['excelente', 'muy_bueno', 'bueno', 'regular', 'malo', 'unknown'])
          .describe('Estado estimado de lo que se ve en la imagen'),
        propertyTypeHint: z
          .enum(['departamento', 'casa', 'ph', 'local', 'oficina', 'terreno', 'unknown'])
          .describe('Tipo de propiedad que se puede inferir de la imagen'),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: imageUrl,
            },
            {
              type: 'text',
              text: 'Analizá esta imagen de una propiedad inmobiliaria argentina para ayudar en una tasación. Describí lo que ves enfocándote en aspectos relevantes para valuar la propiedad.',
            },
          ],
        },
      ],
    });

    return Response.json({ success: true, analysis: object });
  } catch (err: any) {
    console.error('[ACM analyze-image]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
