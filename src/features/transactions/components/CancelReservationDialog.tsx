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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { XCircle, Loader2, AlertTriangle, Search } from 'lucide-react';
import { cancelReservationAction } from '../actions/reservationActions';
import { toast } from 'sonner';
import { TransactionWithRelations } from '../hooks/useTransactions';
import { useQueryClient } from '@tanstack/react-query';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface CancelReservationDialogProps {
    transaction: TransactionWithRelations;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CancelReservationDialog({
    transaction,
    open,
    onOpenChange,
    onSuccess,
}: CancelReservationDialogProps) {
    const queryClient = useQueryClient();
    const [reason, setReason] = useState('');
    const [closeSearch, setCloseSearch] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim()) {
            toast.error('Debés ingresar un motivo para la baja');
            return;
        }

        setIsSubmitting(true);
        try {
            // Pasamos el estado de búsqueda seleccionado al dar de baja
            const result = await cancelReservationAction(
                transaction.id, 
                reason.trim(),
                transaction.buyer_person_id ? (closeSearch ? 'closed' : 'active') : undefined
            );

            if (!result.success) throw new Error(result.error || 'Error al dar de baja');

            toast.success('Reserva dada de baja con éxito');
            queryClient.invalidateQueries({ queryKey: ['closings-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['weekly-activities'] });
            onOpenChange(false);
            onSuccess?.();
        } catch (err: any) {
            toast.error(err.message || 'Error al dar de baja la reserva');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <XCircle className="h-5 w-5 text-red-400" />
                        Dar de Baja (Se cayó)
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Marcá esta reserva como caída. El estado del cliente en el CRM se revertirá al anterior.
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

                {/* Warning */}
                <div className="flex gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300">
                        Esta acción revertirá el estado de los clientes vinculados en el CRM al estado previo a la reserva.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-200">Motivo de la caída *</Label>
                    <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white min-h-[100px] resize-none"
                        placeholder="Ej: El comprador se echó atrás, no consiguió financiamiento..."
                    />
                </div>

                {/* Status of the buyer's search */}
                {transaction.buyer_person_id && (
                    <div className="space-y-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                        <div className="flex flex-row items-start space-x-3">
                            <input
                                type="checkbox"
                                id="closeSearch"
                                checked={closeSearch}
                                onChange={(e) => setCloseSearch(e.target.checked)}
                                className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500 focus:ring-offset-slate-900"
                            />
                            <div className="space-y-1 leading-none">
                                <Label htmlFor="closeSearch" className="text-slate-200 font-medium cursor-pointer">
                                    ¿Dar por terminada y perdida la búsqueda del comprador?
                                </Label>
                                <p className="text-[11px] text-slate-500">
                                    Si marcás esta opción, la búsqueda de {transaction.buyer_name || 'este cliente'} se cerrará indicando que fue pérdida por caída de operación. De lo contrario, seguirá Activa para buscar otra propiedad.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

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
                        disabled={isSubmitting || !reason.trim()}
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Confirmar Baja
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
