import { z } from 'zod';

export const propertyDataSchema = z.object({
  address: z.string().min(1, 'La dirección es requerida'),
  neighborhood: z.string().default(''),
  city: z.string().default('General Roca'),
  propertyType: z.enum(['departamento', 'casa', 'ph', 'local', 'oficina', 'terreno', 'chacra']).nullable().default(null),
  propertySubtype: z.enum([
    'casa_tradicional', 'casa_de_plan',
    'depto_en_torre', 'depto_en_complejo',
    'terreno_grande', 'terreno_chico',
  ]).nullable().default(null),
  conservationState: z.enum(['normal', 'a_reciclar', 'a_demoler']).nullable().default(null),
  totalArea: z.number().positive().nullable().default(null),
  coveredArea: z.number().positive().nullable().default(null),
  uncoveredArea: z.number().positive().nullable().default(null),
  rooms: z.number().int().positive().nullable().default(null),
  bedrooms: z.number().int().positive().nullable().default(null),
  bathrooms: z.number().int().positive().nullable().default(null),
  garages: z.number().int().min(0).nullable().default(null),
  age: z.number().int().min(0).nullable().default(null),
  floor: z.number().int().nullable().default(null),
  orientation: z.string().nullable().default(null),
  condition: z.enum(['excelente', 'muy_bueno', 'bueno', 'regular', 'malo']).nullable().default(null),
  amenities: z.array(z.string()).default([]),
  description: z.string().default(''),
  additionalNotes: z.string().default(''),
});

export type PropertyDataInput = z.infer<typeof propertyDataSchema>;
