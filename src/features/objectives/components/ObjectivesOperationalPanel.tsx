'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MagicCard } from '@/components/ui/magic-card';
import { motion } from 'framer-motion';
import {
    DollarSign,
    Handshake,
    BarChart3,
    Shield,
    TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicTypography } from '@/components/ui/DynamicTypography';
import type { ViewAgentProgress, ViewTeamObjectivesSummary } from '../types/supabase';

type CardColor = 'green' | 'blue' | 'purple' | 'yellow';
type DetailColor = 'emerald' | 'amber' | 'purple' | 'blue' | 'slate';

interface ObjectivesOperationalPanelProps {
    isTeamView: boolean;
    teamSummary: ViewTeamObjectivesSummary | null;
    progress: ViewAgentProgress | null;
    isLoading: boolean;
    userRole?: string;
}

export function ObjectivesOperationalPanel({
    isTeamView,
    teamSummary,
    progress,
    isLoading,
    userRole,
}: ObjectivesOperationalPanelProps) {
    const isGod = userRole === 'god';
    const isGodOrParent = isGod || userRole === 'parent';

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="bg-slate-900/40 border-slate-800">
                        <CardContent className="p-5">
                            <Skeleton className="h-4 w-24 bg-slate-800 mb-3" />
                            <Skeleton className="h-8 w-32 bg-slate-800 mb-2" />
                            <Skeleton className="h-3 w-full bg-slate-800" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    // Extraer métricas según vista
    const metrics = isTeamView
        ? getTeamMetrics(teamSummary)
        : getIndividualMetrics(progress);

    if (!metrics) return null;

    const cards: { title: string; icon: React.ReactNode; mainValue: string; mainSuffix?: string; color: CardColor; details: { label: string; value: string; color: DetailColor }[] }[] = [
        {
            title: 'Volumen de Ventas',
            icon: <DollarSign className="h-5 w-5" />,
            mainValue: formatCurrency(metrics.salesVolume),
            color: 'blue',
            details: [
                { label: 'Cerrado', value: formatCurrency(metrics.completedVolume), color: 'emerald' },
                { label: 'Reservado', value: formatCurrency(metrics.reservedVolume), color: 'amber' },
            ],
        },
        {
            title: 'Facturación Bruta',
            icon: <BarChart3 className="h-5 w-5" />,
            mainValue: formatCurrency(metrics.grossCommission),
            color: 'green',
            details: [
                { label: 'Cerrado', value: formatCurrency(metrics.completedCommission), color: 'emerald' },
                { label: 'Reservado', value: formatCurrency(metrics.reservedCommission), color: 'amber' },
            ],
        },
        {
            title: 'Operaciones',
            icon: <Handshake className="h-5 w-5" />,
            mainValue: `${metrics.operationsCount}`,
            mainSuffix: `· ${metrics.totalPuntas} puntas`,
            color: 'purple',
            details: [
                { label: 'Cierres', value: String(metrics.completedOps), color: 'emerald' },
                { label: 'Reservas', value: String(metrics.reservedOps), color: 'amber' },
                { label: 'Compartidas', value: `${metrics.operationsCount > 0 ? Math.round((metrics.singleSidedCount / metrics.operationsCount) * 100) : 0}%`, color: 'purple' },
                { label: 'Ticket Prom.', value: formatCurrency(metrics.operationsCount > 0 ? metrics.salesVolume / metrics.operationsCount : 0), color: 'blue' },
            ],
        },
    ];

    // Desglose financiero solo para God/Parent
    if (isGodOrParent) {
        const desgloseDetails: { label: string; value: string; color: 'emerald' | 'amber' | 'purple' | 'blue' | 'slate' }[] = [];
        if (isGod) {
            desgloseDetails.push({ label: 'Royalty', value: formatCurrency(metrics.masterIncome), color: 'purple' });
        }
        desgloseDetails.push(
            { label: 'Oficina', value: formatCurrency(metrics.officeIncome), color: 'blue' },
            { label: 'Agentes', value: formatCurrency(metrics.netIncome), color: 'emerald' },
        );

        cards.push({
            title: 'Desglose Financiero',
            icon: <Shield className="h-5 w-5" />,
            mainValue: formatCurrency(metrics.grossCommission),
            mainSuffix: 'bruto',
            color: 'yellow' as const,
            details: desgloseDetails,
        });
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Resumen Operacional
                </h3>
            </div>
            <div className={`grid grid-cols-1 gap-4 ${isGodOrParent ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'}`}>
                {cards.map((card, i) => (
                    <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.05 }}
                    >
                        <OperationalCard {...card} />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// --- Helpers para extraer métricas normalizadas ---

interface NormalizedMetrics {
    salesVolume: number;
    completedVolume: number;
    reservedVolume: number;
    grossCommission: number;
    completedCommission: number;
    reservedCommission: number;
    operationsCount: number;
    totalPuntas: number;
    completedOps: number;
    reservedOps: number;
    doubleSidedCount: number;
    singleSidedCount: number;
    netIncome: number;
    masterIncome: number;
    officeIncome: number;
}

function getIndividualMetrics(progress: ViewAgentProgress | null): NormalizedMetrics | null {
    if (!progress) return null;
    const opsCount = progress.operations_count || 0;
    const doubleSided = progress.double_sided_count || 0;
    const singleSided = progress.single_sided_count || 0;
    const totalPuntas = (doubleSided * 2) + singleSided;

    return {
        salesVolume: progress.total_sales_volume || 0,
        completedVolume: progress.completed_sales_volume || 0,
        reservedVolume: progress.reserved_sales_volume || 0,
        grossCommission: progress.actual_gross_income || 0,
        completedCommission: progress.completed_gross_income || 0,
        reservedCommission: progress.reserved_gross_income || 0,
        operationsCount: opsCount,
        totalPuntas,
        completedOps: progress.completed_puntas_count || 0,
        reservedOps: progress.reserved_puntas_count || 0,
        doubleSidedCount: doubleSided,
        singleSidedCount: singleSided,
        netIncome: progress.total_net_income || 0,
        masterIncome: progress.total_master_income || 0,
        officeIncome: progress.total_office_income || 0,
    };
}

function getTeamMetrics(summary: ViewTeamObjectivesSummary | null): NormalizedMetrics | null {
    if (!summary) return null;
    const opsCount = summary.total_operations_count || 0;
    const doubleSided = summary.total_double_sided_count || 0;
    const singleSided = summary.total_single_sided_count || 0;
    const totalPuntas = (doubleSided * 2) + singleSided;

    return {
        salesVolume: summary.total_sales_volume || 0,
        completedVolume: summary.total_completed_volume || 0,
        reservedVolume: summary.total_reserved_volume || 0,
        grossCommission: summary.total_team_income || 0,
        completedCommission: summary.total_completed_income || 0,
        reservedCommission: summary.total_reserved_income || 0,
        operationsCount: opsCount,
        totalPuntas,
        completedOps: summary.total_completed_puntas || 0,
        reservedOps: summary.total_reserved_puntas || 0,
        doubleSidedCount: doubleSided,
        singleSidedCount: singleSided,
        netIncome: summary.total_net_income || 0,
        masterIncome: summary.total_master_income || 0,
        officeIncome: summary.total_office_income || 0,
    };
}

// --- Card Component (matches ClosingsPage SummaryCard style) ---

function OperationalCard({
    title,
    icon,
    mainValue,
    mainSuffix,
    color,
    details,
}: {
    title: string;
    icon: React.ReactNode;
    mainValue: string;
    mainSuffix?: string;
    color: CardColor;
    details: { label: string; value: string; color: DetailColor }[];
}) {
    const themes = {
        green: {
            bg: 'bg-gradient-to-br from-slate-900 to-emerald-950/30',
            border: 'border-emerald-500/20',
            text: 'text-emerald-500',
            glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
            gradient: 'rgba(16,185,129,0.12)',
        },
        blue: {
            bg: 'bg-gradient-to-br from-slate-900 to-blue-950/30',
            border: 'border-blue-500/20',
            text: 'text-blue-500',
            glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]',
            gradient: 'rgba(59,130,246,0.12)',
        },
        purple: {
            bg: 'bg-gradient-to-br from-slate-900 to-purple-950/30',
            border: 'border-purple-500/20',
            text: 'text-purple-500',
            glow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]',
            gradient: 'rgba(168,85,247,0.12)',
        },
        yellow: {
            bg: 'bg-gradient-to-br from-slate-900 to-amber-950/30',
            border: 'border-amber-500/20',
            text: 'text-amber-500',
            glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]',
            gradient: 'rgba(245,158,11,0.12)',
        },
    };

    const dotColors: Record<string, string> = {
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        purple: 'bg-purple-500',
        blue: 'bg-blue-500',
        slate: 'bg-slate-500',
    };

    const textColors: Record<string, string> = {
        emerald: 'text-emerald-400',
        amber: 'text-amber-400',
        purple: 'text-purple-400',
        blue: 'text-blue-400',
        slate: 'text-slate-400',
    };

    const t = themes[color];

    return (
        <Card className={`relative overflow-hidden border ${t.border} ${t.bg} ${t.glow} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group shadow-md rounded-xl`}>
            <MagicCard
                gradientColor={t.gradient}
                gradientSize={250}
                gradientOpacity={1}
            >
                <CardContent className="p-5 relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className={`${t.text} opacity-70`}>{icon}</div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            {title}
                        </p>
                    </div>

                    <div className="flex items-baseline gap-2 mb-3">
                        <DynamicTypography
                            value={mainValue}
                            className="text-white font-black tracking-tighter drop-shadow-md"
                            baseSize="text-2xl"
                        />
                        {mainSuffix && (
                            <span className="text-slate-500 text-[10px] font-medium">{mainSuffix}</span>
                        )}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                        {details.map((d, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-1.5 text-slate-500">
                                    <span className={`w-1.5 h-1.5 rounded-full ${dotColors[d.color]}`} />
                                    {d.label}
                                </span>
                                <span className={`font-semibold tabular-nums ${textColors[d.color]}`}>
                                    {d.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>

                {/* Watermark Icon - Background Layer */}
                <div className={`absolute -right-6 -bottom-6 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 rotate-[-15deg] scale-150 pointer-events-none ${t.text}`}>
                    <div className="w-32 h-32 [&>svg]:w-full [&>svg]:h-full">
                        {icon}
                    </div>
                </div>
            </MagicCard>
        </Card>
    );
}
