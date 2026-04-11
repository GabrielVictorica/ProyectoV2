import { z } from 'zod';

export const fodaResponsesSchema = z.object({
  // Fortalezas
  f1: z.string().default(''),
  f2: z.string().default(''),
  f3: z.string().default(''),
  // Oportunidades
  o1: z.string().default(''),
  o2: z.string().default(''),
  o3: z.string().default(''),
  // Debilidades
  d1: z.string().default(''),
  d2: z.string().default(''),
  d3: z.string().default(''),
  // Amenazas
  a1: z.string().default(''),
  a2: z.string().default(''),
  a3: z.string().default(''),
});

export const fodaAnalysisSchema = z.object({
  fortalezas: z.string().default(''),
  oportunidades: z.string().default(''),
  debilidades: z.string().default(''),
  amenazas: z.string().default(''),
});

export type FodaResponsesInput = z.infer<typeof fodaResponsesSchema>;
export type FodaAnalysisInput = z.infer<typeof fodaAnalysisSchema>;
