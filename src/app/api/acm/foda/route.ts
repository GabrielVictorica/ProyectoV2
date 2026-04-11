import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateObjectWithFallback } from '@/lib/ai/fallback';
import {
  ACM_FODA_QUESTIONS_PROMPT,
  ACM_FODA_REDACTION_PROMPT,
} from '@/lib/ai/prompts';
import type { PropertyData } from '@/features/acm/types/acm';

// ── POST: Generar preguntas FODA o redactar análisis ─────────────────────────

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { action, propertyData, fodaResponses } = await req.json();

  if (action === 'questions') {
    return handleGenerateQuestions(propertyData);
  }

  if (action === 'redact') {
    return handleRedactAnalysis(propertyData, fodaResponses);
  }

  return Response.json({ error: 'Acción inválida' }, { status: 400 });
}

// ── Generar preguntas contextualizadas ───────────────────────────────────────

async function handleGenerateQuestions(propertyData: Partial<PropertyData>) {
  const propertyDesc = buildPropertyDescription(propertyData);

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        fortalezas: z.array(z.string()).describe('3 preguntas sobre fortalezas de la propiedad'),
        oportunidades: z.array(z.string()).describe('3 preguntas sobre oportunidades del mercado/zona'),
        debilidades: z.array(z.string()).describe('3 preguntas sobre aspectos a mejorar'),
        amenazas: z.array(z.string()).describe('3 preguntas sobre factores de riesgo externos'),
      }),
      system: ACM_FODA_QUESTIONS_PROMPT,
      prompt: `Propiedad a tasar:\n${propertyDesc}\n\nGenerá 3 preguntas por cada letra del FODA.`,
    } as any);

    return Response.json({ success: true, questions: object });
  } catch (err: any) {
    console.error('[FODA questions]', err.message);
    // Fallback: preguntas genéricas si la IA falla
    return Response.json({
      success: true,
      questions: getDefaultQuestions(),
      fallback: true,
    });
  }
}

// ── Redactar análisis diplomáticamente ───────────────────────────────────────

async function handleRedactAnalysis(
  propertyData: Partial<PropertyData>,
  fodaResponses: Record<string, string>,
) {
  const propertyDesc = buildPropertyDescription(propertyData);
  const responsesText = buildResponsesText(fodaResponses);

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        fortalezas: z.string().describe('Redacción profesional de las fortalezas'),
        oportunidades: z.string().describe('Redacción profesional de las oportunidades'),
        debilidades: z.string().describe('Redacción DIPLOMÁTICA de las debilidades'),
        amenazas: z.string().describe('Redacción DIPLOMÁTICA de las amenazas'),
      }),
      system: ACM_FODA_REDACTION_PROMPT,
      prompt: `Propiedad:\n${propertyDesc}\n\nRespuestas del agente:\n${responsesText}\n\nRedactá el análisis FODA profesional. RECORDÁ: D y A deben ser diplomáticas y constructivas.`,
    } as any);

    return Response.json({ success: true, analysis: object });
  } catch (err: any) {
    console.error('[FODA redact]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildPropertyDescription(data: Partial<PropertyData>): string {
  const parts: string[] = [];
  if (data.propertyType) parts.push(`Tipo: ${data.propertyType}`);
  if (data.address) parts.push(`Dirección: ${data.address}`);
  if (data.neighborhood) parts.push(`Barrio: ${data.neighborhood}`);
  if (data.city) parts.push(`Ciudad: ${data.city}`);
  if (data.totalArea) parts.push(`Superficie total: ${data.totalArea} m²`);
  if (data.coveredArea) parts.push(`Superficie cubierta: ${data.coveredArea} m²`);
  if (data.rooms) parts.push(`Ambientes: ${data.rooms}`);
  if (data.bedrooms) parts.push(`Dormitorios: ${data.bedrooms}`);
  if (data.bathrooms) parts.push(`Baños: ${data.bathrooms}`);
  if (data.garages !== null && data.garages !== undefined) parts.push(`Cocheras: ${data.garages}`);
  if (data.age !== null && data.age !== undefined) parts.push(`Antigüedad: ${data.age === 0 ? 'A estrenar' : data.age + ' años'}`);
  if (data.condition) parts.push(`Estado: ${data.condition}`);
  if (data.orientation) parts.push(`Orientación: ${data.orientation}`);
  if ((data.amenities || []).length > 0) parts.push(`Amenities: ${data.amenities!.join(', ')}`);
  if (data.description) parts.push(`Descripción: ${data.description}`);
  return parts.join('\n') || 'Sin datos de propiedad disponibles';
}

function buildResponsesText(responses: Record<string, string>): string {
  const sections = [
    { key: 'f', label: 'FORTALEZAS' },
    { key: 'o', label: 'OPORTUNIDADES' },
    { key: 'd', label: 'DEBILIDADES' },
    { key: 'a', label: 'AMENAZAS' },
  ];

  return sections
    .map(({ key, label }) => {
      const answers = [1, 2, 3]
        .map((i) => responses[`${key}${i}`])
        .filter(Boolean)
        .map((a, i) => `  ${i + 1}. ${a}`)
        .join('\n');
      return `${label}:\n${answers || '  (sin respuesta)'}`;
    })
    .join('\n\n');
}

function getDefaultQuestions() {
  return {
    fortalezas: [
      '¿Cuáles son los mejores atributos de esta propiedad frente a otras similares?',
      '¿Tiene alguna característica única que la diferencie?',
      '¿Cómo describirías la ubicación en términos de accesibilidad y servicios?',
    ],
    oportunidades: [
      '¿Hay desarrollos o mejoras urbanas planificadas en la zona?',
      '¿La propiedad tiene potencial de ampliación o refacción?',
      '¿Existe demanda creciente para este tipo de propiedad en la zona?',
    ],
    debilidades: [
      '¿Hay aspectos que podrían mejorarse en la propiedad?',
      '¿Identificás alguna limitación en la distribución o funcionalidad?',
      '¿El estado de conservación requiere alguna inversión?',
    ],
    amenazas: [
      '¿Hay factores externos que podrían afectar el valor (obras, inundaciones, etc.)?',
      '¿Existe mucha oferta competitiva similar en la zona?',
      '¿Hay cambios regulatorios o urbanos que podrían impactar negativamente?',
    ],
  };
}
