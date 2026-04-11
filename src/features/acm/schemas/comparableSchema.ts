import { z } from 'zod';

export const comparableSchema = z.object({
  id: z.string(),
  source: z.enum(['zonaprop', 'argenprop', 'mercadolibre', 'facebook', 'custom', 'manual']),
  sourceUrl: z.string().default(''),
  title: z.string().default(''),
  price: z.number().positive(),
  currency: z.enum(['USD', 'ARS']),
  totalArea: z.number().positive().nullable().default(null),
  coveredArea: z.number().positive().nullable().default(null),
  pricePerM2: z.number().positive().nullable().default(null),
  propertyType: z.string().default(''),
  address: z.string().default(''),
  neighborhood: z.string().default(''),
  city: z.string().default(''),
  rooms: z.number().int().positive().nullable().default(null),
  bedrooms: z.number().int().positive().nullable().default(null),
  bathrooms: z.number().int().positive().nullable().default(null),
  garages: z.number().int().min(0).nullable().default(null),
  age: z.number().int().min(0).nullable().default(null),
  imageUrl: z.string().nullable().default(null),
  selected: z.boolean().default(false),
  adjustmentFactor: z.number().min(0.5).max(1.5).default(1.0),
  adjustedPricePerM2: z.number().positive().nullable().default(null),
  notes: z.string().default(''),
});

export const manualComparableSchema = comparableSchema.omit({ id: true, source: true }).extend({
  source: z.literal('manual').default('manual'),
  sourceUrl: z.string().url('URL inválida').or(z.literal('')).default(''),
  price: z.number().positive('El precio es requerido'),
  currency: z.enum(['USD', 'ARS']),
  address: z.string().min(1, 'La dirección es requerida'),
});

export type ComparableInput = z.infer<typeof comparableSchema>;
export type ManualComparableInput = z.infer<typeof manualComparableSchema>;
