/**
 * 🏆 Copa de Productividad — Configuración Central
 *
 * Este archivo contiene TODA la configuración de la copa.
 * Es el único lugar donde se definen puntos, fechas y reglas.
 *
 * IMPORTANTE: Este feature es TEMPORAL. Al finalizar la competencia,
 * borrar toda la carpeta `src/features/competition/` y la tabla
 * `competition_team_members` de Supabase.
 */

// ─── Fechas de la competencia ─────────────────────────────────────

export const COMPETITION_START_DATE = '2026-03-02';
export const COMPETITION_END_DATE = '2026-12-31';

// ─── Objetivo de facturación por equipo ───────────────────────────

/** Facturación = gross_commission (actual_price × commission%) */
export const TEAM_BILLING_GOAL_USD = 240_000;

// ─── Tabla de puntos por actividad ────────────────────────────────

export const POINTS_TABLE = {
  pre_listing: 40,
  cierre: 30,        // × sides (1 punta = 30, 2 puntas = 60)
  captacion: 25,
  pre_buying: 20,
  reunion_verde: 10,
  acm: 5,
  visita: 2,
  nuevo_contacto: 1, // Nueva persona en CRM (persons)
  nueva_busqueda: 1,  // Nueva búsqueda cargada (person_searches)
} as const;

/** Bonus de referido: +5 a reunion_verde, pre_listing, o pre_buying
 *  si el agente tiene un "referido" previo para la misma persona.
 *  Se aplica UNA sola vez por persona. */
export const REFERIDO_BONUS = 5;

/** Actividades que califican para el bonus de referido */
export const REFERIDO_QUALIFYING_TYPES = [
  'reunion_verde',
  'pre_listing',
  'pre_buying',
] as const;

// ─── Semana Perfecta ─────────────────────────────────────────────

/** Bonus por cumplir TODOS los criterios en una semana (lun-dom) */
export const PERFECT_WEEK_BONUS = 50;

/** Criterios fijos (iguales para todos los agentes) */
export const PERFECT_WEEK_FIXED_CRITERIA = {
  reunion_verde: 15,  // ≥ 15 reuniones verdes
  referido: 2,        // ≥ 2 referidos
} as const;

/** Criterios dinámicos (dependen del objetivo de cada agente):
 *  - weekly_pl_pb_target: número crítico (PL+PB combinados)
 *  - required_prelistings_weekly: PLs específicamente (del objetivo de captaciones)
 *  Estos se leen de `view_agent_progress` en runtime.
 */

// ─── Equipos ─────────────────────────────────────────────────────

export type TeamId = 'negro' | 'dorado';

export const TEAMS_CONFIG: Record<TeamId, {
  name: string;
  emoji: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
}> = {
  negro: {
    name: 'Equipo Negro',
    emoji: '🦅',
    color: '#1a1a2e',
    gradientFrom: 'from-slate-800',
    gradientTo: 'to-slate-950',
  },
  dorado: {
    name: 'Equipo Dorado',
    emoji: '🦁',
    color: '#b8860b',
    gradientFrom: 'from-amber-600',
    gradientTo: 'to-yellow-700',
  },
} as const;

// ─── Acceso restringido ──────────────────────────────────────────

/** Usuarios que pueden ver la pestaña de la Copa */
export const AUTHORIZED_USERS = {
  /** Siempre tiene acceso */
  godRole: true,
  /** Acceso por nombre (parent/child) */
  byName: [
    { firstName: 'Analia', lastName: 'Muñoz' },
    { firstName: 'Jorge', lastName: 'Lagos' },
  ],
} as const;

/**
 * Verifica si un usuario tiene acceso a la Copa.
 */
export function hasCompetitionAccess(user: {
  role: string | null;
  firstName?: string;
  lastName?: string;
}): boolean {
  if (user.role === 'god') return true;

  return AUTHORIZED_USERS.byName.some(
    (auth) =>
      auth.firstName.toLowerCase() === user.firstName?.toLowerCase() &&
      auth.lastName.toLowerCase() === user.lastName?.toLowerCase()
  );
}

// ─── Activity types mapeados ─────────────────────────────────────

/** Tipos de actividad de la tabla `activities` que suman puntos */
export const SCORED_ACTIVITY_TYPES = [
  'pre_listing',
  'captacion',
  'pre_buying',
  'reunion_verde',
  'acm',
  'visita',
  'referido',
] as const;

export type ScoredActivityType = typeof SCORED_ACTIVITY_TYPES[number];
