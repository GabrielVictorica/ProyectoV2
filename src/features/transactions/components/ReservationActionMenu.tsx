'use client';

import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, CheckCircle2, XCircle, Pencil } from 'lucide-react';
import { TransactionWithRelations } from '../hooks/useTransactions';
import { CloseTransactionDialog } from './CloseTransactionDialog';
import { CloseReservationDialog } from './CloseReservationDialog';
import { CancelReservationDialog } from './CancelReservationDialog';

export interface ReservationActionMenuProps {
    transaction: TransactionWithRelations;
    onRefresh?: () => void;
}

export function ReservationActionMenu({ transaction, onRefresh }: ReservationActionMenuProps) {
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const status = transaction.status;

    // Color del botón ⋮ según el estado
    const triggerColors = {
        pending: 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10',
        completed: 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10',
        cancelled: 'text-red-500 hover:text-red-400 hover:bg-red-500/10',
    };

    const menuLabel = {
        pending: 'Gestión de Reserva',
        completed: 'Gestión de Cierre',
        cancelled: 'Operación Caída',
    };

    return (
        <>
            <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${triggerColors[status as keyof typeof triggerColors] || triggerColors.pending}`}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-white min-w-[220px]">
                        <DropdownMenuLabel className="text-slate-400 text-[10px] uppercase tracking-wider">
                            {menuLabel[status as keyof typeof menuLabel] || 'Acciones'}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-slate-800" />

                        {/* ═══ Opciones para RESERVAS (pending) ═══ */}
                        {status === 'pending' && (
                            <>
                                <DropdownMenuItem
                                    onSelect={() => setCloseDialogOpen(true)}
                                    className="cursor-pointer hover:bg-emerald-500/10 text-emerald-400 focus:text-emerald-400 focus:bg-emerald-500/10 flex items-center gap-2"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Cerrar Venta (Consolidar)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => setCancelDialogOpen(true)}
                                    className="cursor-pointer hover:bg-red-500/10 text-red-400 focus:text-red-400 focus:bg-red-500/10 flex items-center gap-2"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Dar de Baja (Se cayó)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-800" />
                            </>
                        )}

                        {/* ═══ Editar (para todos los estados editables) ═══ */}
                        {(status === 'pending' || status === 'completed') && (
                            <DropdownMenuItem
                                onSelect={() => setEditDialogOpen(true)}
                                className="cursor-pointer hover:bg-slate-800 text-slate-300 focus:text-slate-300 focus:bg-slate-800 flex items-center gap-2"
                            >
                                <Pencil className="h-4 w-4" />
                                {status === 'pending' ? 'Editar Reserva' : 'Editar Cierre'}
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Diálogos específicos — se abren fuera del dropdown */}
            {status === 'pending' && (
                <>
                    <CloseReservationDialog
                        transaction={transaction}
                        open={closeDialogOpen}
                        onOpenChange={setCloseDialogOpen}
                        onSuccess={onRefresh}
                    />
                    <CancelReservationDialog
                        transaction={transaction}
                        open={cancelDialogOpen}
                        onOpenChange={setCancelDialogOpen}
                        onSuccess={onRefresh}
                    />
                </>
            )}

            {/* Diálogo de edición genérico (sin cambio de estado) */}
            {editDialogOpen && (
                <CloseTransactionDialog
                    transaction={transaction}
                    onSuccess={() => {
                        setEditDialogOpen(false);
                        onRefresh?.();
                    }}
                    trigger={<span />}
                    defaultOpen={true}
                    onOpenChange={(open) => {
                        if (!open) setEditDialogOpen(false);
                    }}
                />
            )}
        </>
    );
}
