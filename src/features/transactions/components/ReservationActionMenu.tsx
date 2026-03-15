'use client';

import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, CheckCircle2, XCircle } from 'lucide-react';
import { TransactionWithRelations } from '../hooks/useTransactions';
import { CloseTransactionDialog } from './CloseTransactionDialog';

interface ReservationActionMenuProps {
    transaction: TransactionWithRelations;
}

export function ReservationActionMenu({ transaction }: ReservationActionMenuProps) {
    // Solo mostramos este menú para reservas pendientes
    if (transaction.status !== 'pending') return null;

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-white min-w-[200px]">
                    <DropdownMenuLabel className="text-slate-400 text-[10px] uppercase tracking-wider">Gestión de Reserva</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    
                    <CloseTransactionDialog 
                        transaction={transaction}
                        trigger={
                            <DropdownMenuItem 
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer hover:bg-emerald-500/10 text-emerald-400 focus:text-emerald-400 flex items-center gap-2"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Cerrar Venta (Consolidar)
                            </DropdownMenuItem>
                        }
                    />

                    <CloseTransactionDialog 
                        transaction={transaction}
                        trigger={
                            <DropdownMenuItem 
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer hover:bg-red-500/10 text-red-400 focus:text-red-400 flex items-center gap-2"
                            >
                                <XCircle className="h-4 w-4" />
                                Dar de Baja (Se cayó)
                            </DropdownMenuItem>
                        }
                    />
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
