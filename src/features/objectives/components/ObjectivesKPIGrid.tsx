'use client';

import { motion } from 'framer-motion';
import { ObjectivesKPICard } from './ObjectivesKPICard';
import {
    Target,
    DollarSign,
    CheckCircle2,
    TrendingUp,
    BarChart3,
    ShieldCheck,
    AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { ViewAgentProgress, ViewTeamObjectivesSummary } from '../types/supabase';

interface ObjectivesKPIGridProps {
    isTeamView: boolean;
    teamSummary: ViewTeamObjectivesSummary | null;
    progress: ViewAgentProgress | null;
    isLoading: boolean;
    variant?: 'financial' | 'operational';
}

export function ObjectivesKPIGrid({
    isTeamView,
    teamSummary,
    progress,
    isLoading,
    variant = 'financial', // Por defecto financiero si no se especifica
}: ObjectivesKPIGridProps) {
    // Modo Equipo - Las KPIs se integran en el ProgressPanel y OperationalPanel
    if (isTeamView) {
        return null;
    }

    if (progress) {
        // MODO INDIVIDUAL UNIFICADO — Solo métricas anuales
        if (variant === 'operational') return null;

        // Cálculos financieros anuales
        const annualGoal = progress.annual_billing_goal || 0;
        const splitPct = progress.split_percentage || 50;
        const monthlyExpenses = progress.monthly_living_expenses || 0;
        const avgTicketTarget = progress.average_ticket_target || 0;
        const avgCommTarget = progress.average_commission_target || 0;

        // Comisión Neta acumulada = actual_gross_income * split%
        const netCommissionActual = (progress.actual_gross_income || 0) * (splitPct / 100);

        const actualPuntas = progress.actual_puntas_count || 0;
        const totalSalesVolume = progress.total_sales_volume || 0;

        // Ticket Promedio Real = volumen de ventas / cantidad de operaciones
        const avgTicketReal = actualPuntas > 0 ? totalSalesVolume / actualPuntas : 0;

        // Comisión Promedio Real por punta = comisión bruta / cantidad de operaciones
        const avgCommPerPunta = actualPuntas > 0 ? (progress.actual_gross_income || 0) / actualPuntas : 0;

        // Target de comisión por punta = ticket_target * (commission_target / 100)
        const commTargetPerPunta = avgTicketTarget * (avgCommTarget / 100);

        // Validación Financiera
        const netMonthlyIncome = (annualGoal * (splitPct / 100)) / 12;
        const monthlySurplus = netMonthlyIncome - monthlyExpenses;
        const isCovered = monthlySurplus >= 0;

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {/* 1. Puntas Totales (Anual) */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    <ObjectivesKPICard
                        title="Puntas Totales"
                        value={progress.actual_puntas_count || 0}
                        icon={<CheckCircle2 className="h-5 w-5" />}
                        loading={isLoading}
                        color="blue"
                        showProgress={true}
                        progressValue={progress.actual_puntas_count || 0}
                        progressTotal={Math.ceil((progress.actual_puntas_count || 0) + (progress.estimated_puntas_needed || 0))}
                        subtitle={`Meta Anual: ${Math.ceil((progress.actual_puntas_count || 0) + (progress.estimated_puntas_needed || 0))}`}
                        segmentedProgress={{
                            completed: progress.completed_puntas_count || 0,
                            reserved: progress.reserved_puntas_count || 0,
                            total: Math.ceil((progress.actual_puntas_count || 0) + (progress.estimated_puntas_needed || 0)) || 1,
                            completedLabel: `${progress.completed_puntas_count || 0} cerradas`,
                            reservedLabel: `${progress.reserved_puntas_count || 0} reservadas`,
                        }}
                    />
                </motion.div>

                {/* 2. Comisión Neta Acumulada */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }}>
                    <ObjectivesKPICard
                        title="Comisión Neta"
                        value={formatCurrency(netCommissionActual)}
                        icon={<DollarSign className="h-5 w-5" />}
                        loading={isLoading}
                        color="green"
                        isString
                        subtitle={`Split ${splitPct}% · Meta ${formatCurrency(annualGoal * (splitPct / 100))}`}
                        segmentedProgress={{
                            completed: (progress.completed_gross_income || 0) * (splitPct / 100),
                            reserved: (progress.reserved_gross_income || 0) * (splitPct / 100),
                            total: netCommissionActual || 1,
                            completedLabel: `${formatCurrency((progress.completed_gross_income || 0) * (splitPct / 100))} cerrado`,
                            reservedLabel: `${formatCurrency((progress.reserved_gross_income || 0) * (splitPct / 100))} reservado`,
                        }}
                    />
                </motion.div>

                {/* 3. Ticket Promedio Real vs Objetivo */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
                    <ObjectivesKPICard
                        title="Ticket Promedio"
                        value={formatCurrency(avgTicketReal)}
                        icon={<BarChart3 className="h-5 w-5" />}
                        loading={isLoading}
                        color={avgTicketTarget > 0 && avgTicketReal >= avgTicketTarget ? 'green' : 'amber'}
                        isString
                        subtitle={avgTicketTarget > 0 ? `Obj. x operación: ${formatCurrency(avgTicketTarget)}` : 'Sin objetivo definido'}
                    />
                </motion.div>

                {/* 4. Comisión Promedio por Punta vs Objetivo */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }}>
                    <ObjectivesKPICard
                        title="Comisión x Punta"
                        value={formatCurrency(avgCommPerPunta)}
                        icon={<TrendingUp className="h-5 w-5" />}
                        loading={isLoading}
                        color={commTargetPerPunta > 0 && avgCommPerPunta >= commTargetPerPunta ? 'green' : 'purple'}
                        isString
                        subtitle={`Prom. real: ${avgTicketReal > 0 ? ((avgCommPerPunta / avgTicketReal) * 100).toFixed(2) : '0'}%${commTargetPerPunta > 0 ? ` · Obj: ${formatCurrency(commTargetPerPunta)}` : ''}`}
                    />
                </motion.div>

                {/* 5. Validación Financiera */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.2 }}>
                    <ObjectivesKPICard
                        title="Validación Financiera"
                        value={isCovered ? 'Cubierto' : 'Déficit'}
                        icon={isCovered ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        loading={isLoading}
                        color={isCovered ? 'green' : 'red'}
                        subtitle={
                            monthlyExpenses > 0
                                ? `${isCovered ? '+' : ''}${formatCurrency(monthlySurplus)}/mes`
                                : 'Sin gastos definidos'
                        }
                        isString
                    />
                </motion.div>
            </div>
        );

    }

    // Empty state - no goal configured
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                    <ObjectivesKPICard
                        title="—"
                        value="—"
                        icon={<Target className="h-5 w-5" />}
                        loading={false}
                        color="blue"
                        isString
                    />
                </motion.div>
            ))}
        </div>
    );
}
