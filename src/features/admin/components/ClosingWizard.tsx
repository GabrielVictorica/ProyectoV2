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
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    Zap,
    CheckCircle2,
    AlertTriangle,
    Calendar,
    ArrowRight,
    Calculator,
    ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClosingWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete: () => void;
}

export function ClosingWizard({ open, onOpenChange, onComplete }: ClosingWizardProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const currentMonth = format(new Date(), 'MMMM yyyy', { locale: es });
    const period = format(new Date(), 'yyyy-MM');

    const handleRunClosing = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/billing/run-monthly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ period })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setResult(data.message);
            setStep(3);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al ejecutar el cierre');
        } finally {
            setLoading(false);
        }
    };

    const resetWizard = () => {
        setStep(1);
        setResult(null);
        setError(null);
        onOpenChange(false);
        if (step === 3) onComplete();
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
            <DialogContent className="bg-slate-950 border-white/10 text-slate-200 sm:max-w-lg shadow-2xl overflow-hidden p-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />

                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                                    <Zap className="h-6 w-6 text-purple-400" />
                                    Cierre de Operaciones
                                </DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Este proceso automatiza la liquidación mensual de comisiones y cargos de red.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="glass p-5 rounded-2xl border-white/5 bg-white/[0.02] space-y-3">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        <span>Periodo a Liquidar</span>
                                        <Badge variant="outline" className="text-purple-400 border-purple-500/30 bg-purple-500/5">
                                            {currentMonth}
                                        </Badge>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-sm text-slate-300">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            Cálculo de Comisiones sobre Transacciones
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-300">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            Generación de Cuentas por Cobrar
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-300">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            Actualización de Estados de Cuenta
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-amber-200/70 leading-relaxed font-medium">
                                        Se recomienda verificar que todas las transacciones del mes hayan sido ingresadas correctamente antes de proceder. Este proceso es irreversible pero no genera duplicados.
                                    </p>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    onClick={() => setStep(2)}
                                    className="w-full bg-white text-slate-950 hover:bg-slate-200 font-bold h-11 transition-all group"
                                >
                                    Continuar al Resumen
                                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                    <Calculator className="h-5 w-5 text-indigo-400" />
                                    Confirmar Ejecución
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-6 py-4 text-center">
                                <div className="relative inline-block">
                                    <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
                                    <div className="relative h-20 w-20 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mx-auto mb-4">
                                        <ShieldCheck className="h-10 w-10 text-indigo-400" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-lg font-bold text-white tracking-tight">¿Confirmas el cierre del periodo?</h4>
                                    <p className="text-sm text-slate-400 px-8">
                                        Se ejecutarán los procesos de cálculo masivo para todas las oficinas activas del sistema.
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center font-medium">
                                    {error}
                                </div>
                            )}

                            <DialogFooter className="flex-col sm:flex-row gap-3">
                                <Button
                                    variant="ghost"
                                    disabled={loading}
                                    onClick={() => setStep(1)}
                                    className="flex-1 text-slate-500 hover:text-slate-300 h-11"
                                >
                                    Volver
                                </Button>
                                <Button
                                    disabled={loading}
                                    onClick={handleRunClosing}
                                    className="flex-[2] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold h-11 shadow-lg shadow-purple-500/20"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Procesando...
                                        </>
                                    ) : (
                                        'Confirmar y Ejecutar Cierre'
                                    )}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 py-4 animate-in fade-in zoom-in-95 duration-700">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 className="h-12 w-12" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-white tracking-tight">¡Proceso Exitoso!</h3>
                                    <p className="text-slate-400 text-sm max-w-[300px] mx-auto leading-relaxed">
                                        {result || 'El cierre mensual se ha completado satisfactoriamente.'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center border border-white/5">
                                        <Calendar className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Próxima Fecha Sugerida</p>
                                        <p className="text-sm font-semibold text-slate-200">1 de {format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), 'MMMM', { locale: es })}</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={resetWizard}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
                            >
                                Finalizar y Ver Historial
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
