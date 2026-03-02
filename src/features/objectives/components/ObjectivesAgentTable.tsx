'use client';

import React, { memo, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, BarChart3, Search, ArrowUpDown, ArrowUp, ArrowDown, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { AgentWithProgress } from '../types/supabase';

interface ObjectivesAgentTableProps {
    agents: AgentWithProgress[];
    isLoading: boolean;
    onSelectAgent: (agentId: string) => void;
}

type SortKey = 'name' | 'goal' | 'billed' | 'progress' | 'puntas' | 'needed' | 'capt' | 'pl' | 'nc' | 'status';
type SortDir = 'asc' | 'desc';

// Ranking medals for top 3
const RANK_MEDALS: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' };

// Memoized row component for performance
const AgentTableRow = memo(function AgentTableRow({
    agent,
    onClick,
    rankIndex,
}: {
    agent: AgentWithProgress;
    onClick: () => void;
    rankIndex: number | null;
}) {
    const isOnTrack = (agent.run_rate_projection || 0) >= agent.annual_billing_goal;
    const completedPuntas = agent.completed_puntas_count || 0;
    const reservedPuntas = agent.reserved_puntas_count || 0;
    const completedIncome = agent.completed_gross_income || 0;
    const reservedIncome = agent.reserved_gross_income || 0;

    // Segmented progress percentages
    const goalForBar = agent.annual_billing_goal || 1;
    const completedPct = Math.min(100, (completedIncome / goalForBar) * 100);
    const reservedPct = Math.min(100 - completedPct, (reservedIncome / goalForBar) * 100);

    return (
        <TableRow
            className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
            onClick={onClick}
        >
            {/* Agente */}
            <TableCell className="font-medium text-white">
                <div className="flex items-center gap-2">
                    {rankIndex !== null && (
                        <span className="text-base" title={`Top ${rankIndex + 1}`}>
                            {RANK_MEDALS[rankIndex]}
                        </span>
                    )}
                    <span>{agent.first_name} {agent.last_name}</span>
                </div>
            </TableCell>

            {/* Meta */}
            <TableCell className="text-slate-300">
                {formatCurrency(agent.annual_billing_goal)}
            </TableCell>

            {/* Facturado - con desglose */}
            <TableCell>
                <div className="flex flex-col">
                    <span className="text-slate-200 font-medium">
                        {formatCurrency(agent.actual_gross_income)}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                            <span className="text-emerald-400/80">{formatCurrency(completedIncome)}</span>
                        </span>
                        {reservedIncome > 0 && (
                            <span className="flex items-center gap-1 text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
                                <span className="text-amber-400/80">{formatCurrency(reservedIncome)}</span>
                            </span>
                        )}
                    </div>
                </div>
            </TableCell>

            {/* Progreso - barra segmentada */}
            <TableCell>
                <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden flex">
                        <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${completedPct}%` }}
                        />
                        {reservedPct > 0 && (
                            <div
                                className="h-full bg-amber-500/70 transition-all"
                                style={{ width: `${reservedPct}%` }}
                            />
                        )}
                    </div>
                    <span className="text-xs text-slate-400 tabular-nums">
                        {(agent.progress_percentage || 0).toFixed(1)}%
                    </span>
                </div>
            </TableCell>

            {/* Puntas - dual display */}
            <TableCell className="text-center">
                <div className="flex items-center justify-center gap-0.5">
                    <span className="text-emerald-400 font-semibold">{completedPuntas}</span>
                    {reservedPuntas > 0 && (
                        <>
                            <span className="text-slate-600">+</span>
                            <span className="text-amber-400 font-semibold">{reservedPuntas}</span>
                        </>
                    )}
                </div>
            </TableCell>

            {/* Necesarias */}
            <TableCell className="text-center text-slate-300">
                {agent.estimated_puntas_needed || 0}
            </TableCell>

            {/* Capt. Obj */}
            <TableCell className="text-center text-slate-300">
                {agent.listings_goal_annual || 0}
            </TableCell>

            {/* PL (Sem) */}
            <TableCell className="text-center font-bold text-purple-400">
                {(agent.required_prelistings_weekly || 0).toFixed(1)}
            </TableCell>

            {/* N.C. Sem */}
            <TableCell className="text-center font-bold text-blue-400">
                {(agent.weekly_pl_pb_target || 0).toFixed(1)}
            </TableCell>

            {/* Estado */}
            <TableCell>
                <Badge
                    variant="outline"
                    className={cn(
                        'font-semibold',
                        isOnTrack
                            ? 'border-green-500 text-green-400'
                            : 'border-amber-500 text-amber-400'
                    )}
                >
                    {isOnTrack ? 'En Camino' : 'Reforzar'}
                </Badge>
            </TableCell>
        </TableRow>
    );
});

// Sortable header component
function SortableHead({
    label,
    sortKey,
    currentSort,
    currentDir,
    onSort,
    className,
    title,
}: {
    label: string;
    sortKey: SortKey;
    currentSort: SortKey;
    currentDir: SortDir;
    onSort: (key: SortKey) => void;
    className?: string;
    title?: string;
}) {
    const isActive = currentSort === sortKey;
    return (
        <TableHead
            className={cn(
                'text-slate-300 cursor-pointer hover:text-white select-none transition-colors group/head',
                className
            )}
            onClick={() => onSort(sortKey)}
            title={title}
        >
            <div className="flex items-center gap-1">
                <span>{label}</span>
                {isActive ? (
                    currentDir === 'asc' ? (
                        <ArrowUp className="w-3 h-3 text-blue-400" />
                    ) : (
                        <ArrowDown className="w-3 h-3 text-blue-400" />
                    )
                ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/head:opacity-40 transition-opacity" />
                )}
            </div>
        </TableHead>
    );
}

export function ObjectivesAgentTable({
    agents,
    isLoading,
    onSelectAgent,
}: ObjectivesAgentTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortKey>('billed');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const handleSort = (key: SortKey) => {
        if (sortBy === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortDir('desc');
        }
    };

    // Sort and filter agents
    const processedAgents = useMemo(() => {
        let filtered = agents;

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = agents.filter(a =>
                `${a.first_name} ${a.last_name}`.toLowerCase().includes(q)
            );
        }

        // Sort
        const sorted = [...filtered].sort((a, b) => {
            let valA: number | string = 0;
            let valB: number | string = 0;

            switch (sortBy) {
                case 'name':
                    valA = `${a.first_name} ${a.last_name}`;
                    valB = `${b.first_name} ${b.last_name}`;
                    return sortDir === 'asc'
                        ? (valA as string).localeCompare(valB as string)
                        : (valB as string).localeCompare(valA as string);
                case 'goal':
                    valA = a.annual_billing_goal;
                    valB = b.annual_billing_goal;
                    break;
                case 'billed':
                    valA = a.actual_gross_income;
                    valB = b.actual_gross_income;
                    break;
                case 'progress':
                    valA = a.progress_percentage;
                    valB = b.progress_percentage;
                    break;
                case 'puntas':
                    valA = a.actual_puntas_count;
                    valB = b.actual_puntas_count;
                    break;
                case 'needed':
                    valA = a.estimated_puntas_needed;
                    valB = b.estimated_puntas_needed;
                    break;
                case 'capt':
                    valA = a.listings_goal_annual;
                    valB = b.listings_goal_annual;
                    break;
                case 'pl':
                    valA = a.required_prelistings_weekly;
                    valB = b.required_prelistings_weekly;
                    break;
                case 'nc':
                    valA = a.weekly_pl_pb_target;
                    valB = b.weekly_pl_pb_target;
                    break;
                case 'status':
                    valA = (a.run_rate_projection || 0) >= a.annual_billing_goal ? 1 : 0;
                    valB = (b.run_rate_projection || 0) >= b.annual_billing_goal ? 1 : 0;
                    break;
            }

            return sortDir === 'asc'
                ? (valA as number) - (valB as number)
                : (valB as number) - (valA as number);
        });

        return sorted;
    }, [agents, searchQuery, sortBy, sortDir]);

    // Calculate top 3 ranking by progress (from unfiltered sorted agents)
    const rankedAgentIds = useMemo(() => {
        const sorted = [...agents].sort((a, b) => (b.actual_gross_income || 0) - (a.actual_gross_income || 0));
        return new Map(
            sorted.slice(0, 3).map((a, i) => [a.agent_id, i])
        );
    }, [agents]);

    return (
        <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800">
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-400" />
                        Desglose por Agente
                    </CardTitle>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                            placeholder="Buscar agente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500/50 text-sm"
                        />
                    </div>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cerrado
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Reservado
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <Trophy className="w-3 h-3" /> Top 3 por progreso
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-12 bg-slate-800 rounded animate-pulse" />
                        ))}
                    </div>
                ) : agents && agents.length > 0 ? (
                    <div className="rounded-lg overflow-hidden border border-slate-700">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-800/50 hover:bg-slate-800/50">
                                    <SortableHead label="Agente" sortKey="name" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                                    <SortableHead label="Meta" sortKey="goal" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                                    <SortableHead label="Facturado" sortKey="billed" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                                    <SortableHead label="Progreso" sortKey="progress" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                                    <SortableHead label="Puntas" sortKey="puntas" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="text-center" />
                                    <SortableHead label="Necesarias" sortKey="needed" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="text-center" />
                                    <SortableHead label="Capt. Obj" sortKey="capt" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="text-center text-purple-300" />
                                    <SortableHead label="PL (Sem)" sortKey="pl" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="text-center text-purple-300 font-bold" />
                                    <SortableHead label="N.C. Sem" sortKey="nc" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="text-center" title="Número Crítico Semanal: Suma de Prelisting + Prebuying" />
                                    <SortableHead label="Estado" sortKey="status" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedAgents.length > 0 ? (
                                    processedAgents.map((agent) => (
                                        <AgentTableRow
                                            key={agent.agent_id}
                                            agent={agent}
                                            onClick={() => onSelectAgent(agent.agent_id)}
                                            rankIndex={rankedAgentIds.get(agent.agent_id) ?? null}
                                        />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                                            No se encontraron agentes con &quot;{searchQuery}&quot;
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-16 text-slate-500">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No hay agentes con objetivos configurados.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
