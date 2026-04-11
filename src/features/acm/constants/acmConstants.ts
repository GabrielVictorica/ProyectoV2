import type { AcmStatus, PropertyType, PropertySubtype, ConservationState, PropertyCondition } from '../types/acm';

export const ACM_STATUS_LABELS: Record<AcmStatus, string> = {
  draft: 'Borrador',
  data_collected: 'Datos cargados',
  comparables_loaded: 'Comparables',
  foda_done: 'FODA completo',
  completed: 'Completado',
};

export const ACM_STATUS_COLORS: Record<AcmStatus, string> = {
  draft: 'text-white/40 bg-white/[0.06] border-white/[0.08]',
  data_collected: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  comparables_loaded: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  foda_done: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  departamento: 'Departamento',
  casa: 'Casa',
  ph: 'PH',
  local: 'Local',
  oficina: 'Oficina',
  terreno: 'Terreno',
  chacra: 'Chacra',
};

// Subtipos dinámicos según tipo de propiedad
export const PROPERTY_SUBTYPE_OPTIONS: Partial<Record<PropertyType, { value: NonNullable<PropertySubtype>; label: string }[]>> = {
  casa: [
    { value: 'casa_tradicional', label: 'Casa tradicional' },
    { value: 'casa_de_plan', label: 'Casa de plan' },
  ],
  departamento: [
    { value: 'depto_en_torre', label: 'Departamento en torre' },
    { value: 'depto_en_complejo', label: 'Departamento en complejo' },
  ],
  terreno: [
    { value: 'terreno_grande', label: 'Terreno grande' },
    { value: 'terreno_chico', label: 'Terreno chico' },
  ],
};

export const PROPERTY_SUBTYPE_LABELS: Record<NonNullable<PropertySubtype>, string> = {
  casa_tradicional: 'Casa tradicional',
  casa_de_plan: 'Casa de plan',
  depto_en_torre: 'Depto en torre',
  depto_en_complejo: 'Depto en complejo',
  terreno_grande: 'Terreno grande',
  terreno_chico: 'Terreno chico',
};

export const CONSERVATION_STATE_LABELS: Record<NonNullable<ConservationState>, string> = {
  normal: 'Normal',
  a_reciclar: 'A reciclar',
  a_demoler: 'A demoler',
};

export const CONSERVATION_STATE_OPTIONS: { value: NonNullable<ConservationState>; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'a_reciclar', label: 'A reciclar' },
  { value: 'a_demoler', label: 'A demoler' },
];

export const PROPERTY_CONDITION_LABELS: Record<PropertyCondition, string> = {
  excelente: 'Excelente',
  muy_bueno: 'Muy bueno',
  bueno: 'Bueno',
  regular: 'Regular',
  malo: 'Malo',
};

export const ACM_WIZARD_STEPS = [
  { id: 1, label: 'Datos', description: 'Datos y fotos de la propiedad' },
  { id: 2, label: 'Comparables', description: 'Búsqueda y selección' },
  { id: 3, label: 'FODA', description: 'Análisis guiado por IA' },
  { id: 4, label: 'Conclusiones', description: 'Valuación + conclusión' },
  { id: 5, label: 'Publicar', description: 'Página pública' },
] as const;
