import { z } from 'zod';

export const personSchema = z.object({
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
    email: z.string().optional().or(z.literal('')).nullable(),
    phone: z.string().optional().or(z.literal('')).nullable(),
    dniCuil: z.string().optional().or(z.literal('')).nullable(),
    birthday: z.string().optional().or(z.literal('')).nullable(),

    familyComposition: z.string().optional().nullable(),
    familyNotes: z.string().optional().nullable(),
    occupationCompany: z.string().optional().nullable(),
    interestsHobbies: z.string().optional().nullable(),
    personalityNotes: z.string().optional().nullable(),

    contactType: z.array(z.string()).default([]),
    source: z.string().optional().nullable(),
    referredById: z.string().optional().nullable(),
    influenceLevel: z.coerce.number().min(1).max(5).default(3),

    preferredChannel: z.string().optional().nullable(),
    bestContactTime: z.string().optional().nullable(),

    relationshipStatus: z.string().default('contacto_telefonico'),
    lifecycleStatus: z.enum(['active', 'following_up', 'lost']).default('active'),
    lostReason: z.string().optional().nullable(),
    nextActionAt: z.string().optional().nullable(),
    lastInteractionAt: z.string().optional().nullable(),
    tags: z.union([
        z.array(z.string()),
        z.string().transform(s => s ? s.split(',').map(t => t.trim()).filter(Boolean) : [])
    ]).default([]),
    observations: z.string().optional().nullable(),

    organizationId: z.string().uuid().optional().nullable(),
    agentId: z.string().uuid().optional().or(z.literal('')).nullable(),
});
