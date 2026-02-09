'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { AgentWithProgress } from '../types/supabase';

interface ObjectivesAgentTableProps {
    agents: AgentWithProgress[];
    isLoading: boolean;
    onSelectAgent: (agentId: string) => void;
}

// Memoized row component for performance
const AgentTableRow = memo(function AgentTableRow({
    agent,
    onClick,
}: {
    agent: AgentWithProgress;
    onClick: () => void;
}) {
    const isOnTrack = (agent.run_rate_projection || 0) >= agent.annual_billing_goal;
    const progressColor = agent.progress_percentage >= 75
        ? 'bg-green-500'
        : agent.progress_percentage >= 50
            ? 'bg-yellow-500'
            : agent.progress_percentage >= 25
                ? 'bg-orange-500'
                : 'bg-red-500';

    return (
        <TableRow
            className="hover:bg-slate-800/50 cursor-pointer transition-colors"
            onClick={onClick}
        >
            <TableCell className="font-medium text-white">
                {agent.first_name} {agent.last_name}
            </TableCell>
            <TableCell className="text-slate-300">
                {formatCurrency(agent.annual_billing_goal)}
            </TableCell>
            <TableCell className="text-slate-300">
                {formatCurrency(agent.actual_gross_income)}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={cn('h-full transition-all', progressColor)}
                            style={{ width: `${Math.min(agent.progress_percentage || 0, 100)}%` }}
                        />
                    </div>
                    <span className="text-xs text-slate-400">
                        {(agent.progress_percentage || 0).toFixed(1)}%
                    </span>
                </div>
            </TableCell>
            <TableCell className="text-center text-slate-300">
                {agent.actual_puntas_count || 0}
            </TableCell>
            <TableCell className="text-center text-slate-300">
                {agent.estimated_puntas_needed || 0}
            </TableCell>
            <TableCell className="text-center text-slate-300">
                {agent.listings_goal_annual || 0}
            </TableCell>
            <TableCell className="text-center font-bold text-purple-400">
                {(agent.required_prelistings_weekly || 0).toFixed(1)}
            </TableCell>
            <TableCell className="text-center font-bold text-blue-400">
                {(agent.weekly_pl_pb_target || 0).toFixed(1)}
            </TableCell>
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

export function ObjectivesAgentTable({
    agents,
    isLoading,
    onSelectAgent,
}: ObjectivesAgentTableProps) {
    return (
        <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    Desglose por Agente
                </CardTitle>
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
                                    <TableHead className="text-slate-300">Agente</TableHead>
                                    <TableHead className="text-slate-300">Meta</TableHead>
                                    <TableHead className="text-slate-300">Facturado</TableHead>
                                    <TableHead className="text-slate-300">Progreso</TableHead>
                                    <TableHead className="text-slate-300 text-center">Puntas</TableHead>
                                    <TableHead className="text-slate-300 text-center">Necesarias</TableHead>
                                    <TableHead className="text-slate-300 text-center text-purple-300">Capt. Obj</TableHead>
                                    <TableHead className="text-slate-300 text-center text-purple-300 font-bold">PL (Sem)</TableHead>
                                    <TableHead className="text-slate-300 text-center cursor-help" title="Número Crítico Semanal: Suma de Prelisting + Prebuying">N.C. Sem</TableHead>
                                    <TableHead className="text-slate-300">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {agents.map((agent) => (
                                    <AgentTableRow
                                        key={agent.agent_id}
                                        agent={agent}
                                        onClick={() => onSelectAgent(agent.agent_id)}
                                    />
                                ))}
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
