'use client';

import { useState, useMemo } from 'react';
import { linkTransactionsAction, dismissDuplicateAction, unlinkTransactionAction } from '../actions/duplicateActions';
import { closingsKeys } from '../hooks/useClosings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertTriangle, Link2, X, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import type { TransactionWithRelations } from '../hooks/useTransactions';

interface DuplicateDetectionPanelProps {
    possibleDuplicates: [string, string][];
    transactions: TransactionWithRelations[];
    linkedTransactions: TransactionWithRelations[];
}

export function DuplicateDetectionPanel({
    possibleDuplicates,
    transactions,
    linkedTransactions,
}: DuplicateDetectionPanelProps) {
    const queryClient = useQueryClient();
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true);
    const [showLinked, setShowLinked] = useState(false);

    const txMap = useMemo(() => {
        const map = new Map<string, TransactionWithRelations>();
        transactions.forEach(t => map.set(t.id, t));
        return map;
    }, [transactions]);

    // Build pairs for display
    const duplicatePairs = useMemo(() => {
        return possibleDuplicates
            .map(([idA, idB]) => {
                const a = txMap.get(idA);
                const b = txMap.get(idB);
                if (!a || !b) return null;
                return { a, b };
            })
            .filter(Boolean) as { a: TransactionWithRelations; b: TransactionWithRelations }[];
    }, [possibleDuplicates, txMap]);

    if (duplicatePairs.length === 0 && linkedTransactions.length === 0) {
        return null;
    }

    const handleLink = async (idA: string, idB: string) => {
        setLoadingAction(`link-${idA}-${idB}`);
        try {
            const result = await linkTransactionsAction(idA, idB);
            if (result.success) {
                toast.success('Operaciones vinculadas con éxito');
                queryClient.invalidateQueries({ queryKey: closingsKeys.all });
            } else {
                toast.error(result.error || 'Error al vincular');
            }
        } catch {
            toast.error('Error al vincular operaciones');
        }
        setLoadingAction(null);
    };

    const handleDismiss = async (idA: string, idB: string) => {
        setLoadingAction(`dismiss-${idA}-${idB}`);
        try {
            const result = await dismissDuplicateAction(idA, idB);
            if (result.success) {
                toast.success('Marcado como no duplicado');
                queryClient.invalidateQueries({ queryKey: closingsKeys.all });
            } else {
                toast.error(result.error || 'Error');
            }
        } catch {
            toast.error('Error al descartar duplicado');
        }
        setLoadingAction(null);
    };

    const handleUnlink = async (id: string) => {
        setLoadingAction(`unlink-${id}`);
        try {
            const result = await unlinkTransactionAction(id);
            if (result.success) {
                toast.success('Operaciones desvinculadas');
                queryClient.invalidateQueries({ queryKey: closingsKeys.all });
            } else {
                toast.error(result.error || 'Error al desvincular');
            }
        } catch {
            toast.error('Error al desvincular');
        }
        setLoadingAction(null);
    };

    return (
        <Card className="bg-slate-900/40 backdrop-blur-xl border-amber-500/30 overflow-hidden shadow-2xl">
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2 text-base">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                        Gestión de Duplicados
                        {duplicatePairs.length > 0 && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 ml-2">
                                {duplicatePairs.length} posible{duplicatePairs.length !== 1 ? 's' : ''}
                            </Badge>
                        )}
                        {linkedTransactions.length > 0 && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-1">
                                {linkedTransactions.length} vinculada{linkedTransactions.length !== 1 ? 's' : ''}
                            </Badge>
                        )}
                    </CardTitle>
                    {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
            </CardHeader>

            {expanded && (
                <CardContent className="space-y-3">
                    {/* Possible duplicates */}
                    {duplicatePairs.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-400">
                                Estas operaciones fueron cargadas por agentes distintos con precio y fecha similares. ¿Son la misma operación?
                            </p>
                            {duplicatePairs.map(({ a, b }) => (
                                <div
                                    key={`${a.id}-${b.id}`}
                                    className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {/* Side A */}
                                        <div className="bg-slate-800/50 rounded p-2 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="border-blue-500/50 text-blue-400 text-[10px]">
                                                    Punta A
                                                </Badge>
                                                <span className="text-xs text-white font-medium truncate">
                                                    {a.agent?.first_name} {a.agent?.last_name}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-300 truncate">{a.custom_property_title || a.property?.title || 'Sin título'}</p>
                                            <div className="flex gap-3 text-xs text-slate-400">
                                                <span>{formatCurrency(a.actual_price)}</span>
                                                <span>{format(new Date(a.transaction_date), 'dd/MM/yy')}</span>
                                            </div>
                                        </div>

                                        {/* Side B */}
                                        <div className="bg-slate-800/50 rounded p-2 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="border-purple-500/50 text-purple-400 text-[10px]">
                                                    Punta B
                                                </Badge>
                                                <span className="text-xs text-white font-medium truncate">
                                                    {b.agent?.first_name} {b.agent?.last_name}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-300 truncate">{b.custom_property_title || b.property?.title || 'Sin título'}</p>
                                            <div className="flex gap-3 text-xs text-slate-400">
                                                <span>{formatCurrency(b.actual_price)}</span>
                                                <span>{format(new Date(b.transaction_date), 'dd/MM/yy')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                                            onClick={() => handleDismiss(a.id, b.id)}
                                            disabled={loadingAction === `dismiss-${a.id}-${b.id}`}
                                        >
                                            <EyeOff className="h-3 w-3 mr-1" />
                                            No son duplicados
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                            onClick={() => handleLink(a.id, b.id)}
                                            disabled={loadingAction === `link-${a.id}-${b.id}`}
                                        >
                                            <Link2 className="h-3 w-3 mr-1" />
                                            Vincular como misma operación
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Already linked operations - collapsible */}
                    {linkedTransactions.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                            <button
                                onClick={() => setShowLinked(!showLinked)}
                                className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
                            >
                                <Eye className="h-3 w-3" />
                                {showLinked ? 'Ocultar' : 'Ver'} operaciones vinculadas ({linkedTransactions.length})
                                {showLinked ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>

                            {showLinked && (
                                <div className="space-y-1">
                                    {linkedTransactions.map(tx => {
                                        const linkedAgent = (tx as any)._linkedAgent;
                                        return (
                                            <div
                                                key={tx.id}
                                                className="bg-emerald-500/5 border border-emerald-500/15 rounded p-2 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <Link2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-white truncate">
                                                            {tx.custom_property_title || tx.property?.title}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {tx.agent?.first_name} {tx.agent?.last_name}
                                                            {linkedAgent && (
                                                                <> + {linkedAgent.first_name} {linkedAgent.last_name}</>
                                                            )}
                                                            {' · '}{formatCurrency(tx.actual_price)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 text-[10px] text-slate-500 hover:text-red-400 hover:bg-red-900/20 shrink-0"
                                                    onClick={() => handleUnlink(tx.id)}
                                                    disabled={loadingAction === `unlink-${tx.id}`}
                                                >
                                                    <X className="h-3 w-3 mr-0.5" />
                                                    Desvincular
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
