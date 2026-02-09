'use client';

/**
 * Tipos específicos para las vistas y tablas de Supabase
 * usadas en el módulo de Objetivos.
 */

// Tipos para view_agent_progress
export interface ViewAgentProgress {
    objective_id: string;
    agent_id: string;
    year: number;
    annual_billing_goal: number;
    monthly_living_expenses: number;
    average_ticket_target: number;
    average_commission_target: number;
    split_percentage: number;
    conversion_rate: number;
    working_weeks: number;
    currency: string;
    actual_gross_income: number;
    actual_puntas_count: number;
    progress_percentage: number;
    gap_to_goal: number;
    estimated_puntas_needed: number;
    net_income_goal: number;
    required_pl_pb_annual: number;
    weekly_pl_pb_target: number;
    financial_viability_ratio: number;
    run_rate_projection: number;
    listings_goal_annual: number;
    pl_to_listing_conversion_target: number;
    required_prelistings_annual: number;
    required_prelistings_monthly: number;
    required_prelistings_weekly: number;
    listings_goal_start_date: string | null;
    listings_goal_end_date: string | null;
    weekly_green_meetings_count: number;
    weekly_critical_activities_count: number;
    actual_active_listings_count: number;
}

// Tipos para view_agent_progress_extended (incluye datos de perfil)
export interface ViewAgentProgressExtended extends ViewAgentProgress {
    organization_id: string;
    first_name: string;
    last_name: string;
    default_split_percentage: number;
}

// Tipos para view_team_objectives_summary
export interface ViewTeamObjectivesSummary {
    year: number;
    organization_id: string | null;
    agents_with_goals: number;
    total_team_goal: number;
    total_team_income: number;
    avg_progress: number;
    total_puntas_needed: number;
    total_puntas_closed: number;
}

// Tipos para view_financial_metrics
export interface ViewFinancialMetrics {
    agent_id: string;
    total_sales_volume: number;
    total_gross_commission: number;
    closed_deals_count: number;
}

// Tipo para perfil básico
export interface ProfileBasic {
    id: string;
    first_name: string;
    last_name: string;
    organization_id: string;
    default_split_percentage: number | null;
}

// Tipo para agente con progreso (usado en tabla de supervisión)
export interface AgentWithProgress {
    agent_id: string;
    first_name: string;
    last_name: string;
    organization_id: string;
    annual_billing_goal: number;
    actual_gross_income: number;
    progress_percentage: number;
    actual_puntas_count: number;
    estimated_puntas_needed: number;
    run_rate_projection: number;
    gap_to_goal: number;
    currency: string;
    weekly_pl_pb_target: number;
    listings_goal_annual: number;
    required_prelistings_annual: number;
    required_prelistings_weekly: number;
}

// Tipo para el historial promedio
export interface HistoricalAverage {
    avgTicket: number;
    avgCommPercent: number;
}
