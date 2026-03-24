'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2, Calendar, DollarSign } from 'lucide-react';
import { closeReservationAction } from '../actions/reservationActions';
import { toast } from 'sonner';
import { TransactionWithRelations } from '../hooks/useTransactions';
import { useQueryClient } from '@tanstack/react-query';
import { DateMaskedInput } from '@/components/ui/date-masked-input';

interface CloseReservationDialogProps {
    transaction: TransactionWithRelations;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CloseReservationDialog({
    transaction,
    open,
    onOpenChange,
    onSuccess,
}: CloseReservationDialogProps) {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Solo dos campos visibles
    const [closingDate, setClosingDate] = useState(
        new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
    );
    const [actualPrice, setActualPrice] = useState(transaction.actual_price || 0);

    const handleSubmit = async () => {
        if (!closingDate) {
            toast.error('Debés ingresar la fecha de cierre');
            return;
        }
        if (actualPrice <= 0) {
            toast.error('El precio debe ser mayor a 0');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await closeReservationAction(transaction.id, {
                closingDate,
                actualPrice,
                // Heredar valores de la reserva original
                commissionPercentage: transaction.commission_percentage || 3,
                agentSplitPercentage: transaction.agent_split_percentage || 45,
                sides: transaction.sides || 1,
            });

            if (!result.success) throw new Error(result.error || 'Error al cerrar la reserva');

            toast.success('Reserva cerrada con éxito');
            queryClient.invalidateQueries({ queryKey: ['closings-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['weekly-activities'] });
            onOpenChange(false);
            onSuccess?.();
        } catch (err: any) {
            toast.error(err.message || 'Error al cerrar la reserva');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        Cerrar Venta (Consolidar)
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Confirmá los datos finales para marcar la reserva como cierre efectivo.
                    </DialogDescription>
                </DialogHeader>

                {/* Property name preview */}
                <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3">
                    <p className="text-xs text-slate-400">Propiedad</p>
                    <p className="text-sm font-medium text-white">
                        {transaction.custom_property_title ||
                            (transaction.property as any)?.title ||
                            'Sin título'}
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Precio */}
                    <div className="space-y-2">
                        <Label className="text-slate-200 flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                            Precio Final (USD) *
                        </Label>
                        <Input
                            type="number"
                            value={actualPrice || ''}
                            onChange={(e) => setActualPrice(Number(e.target.value))}
                            className="bg-slate-800 border-slate-700 text-white"
                            placeholder="150000"
                        />
                    </div>

                    {/* Fecha de cierre DD/MM/AAAA */}
                    <div className="space-y-2">
                        <Label className="text-slate-200 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                            Fecha de Cierre *
                        </Label>
                        <DateMaskedInput
                            value={closingDate}
                            onChange={setClosingDate}
                            placeholder="DD/MM/AAAA"
                            className="bg-slate-800 border-slate-700 text-white"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-slate-400 hover:text-white"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Cerrando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Confirmar Cierre
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
