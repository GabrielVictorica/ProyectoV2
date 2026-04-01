'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useObjectives } from '../hooks/useObjectives';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { OBJECTIVES_DEFAULTS } from '../lib/constants';
import { Loader2, Calculator, Target, TrendingUp, Lock, AlertTriangle, Info, ChevronDown, DollarSign, Percent, BarChart3, Settings2 } from 'lucide-react';
import { ScrollableFormArea } from '@/components/ui/scrollable-form-area';

const goalSchema = z.object({
    annualBillingGoal: z.coerce.number().min(0, 'La meta debe ser mayor a 0'),
    monthlyLivingExpenses: z.coerce.number().min(0),
    averageTicketTarget: z.coerce.number().min(1, 'El precio promedio debe ser mayor a 0'),
    averageCommissionTarget: z.coerce.number().min(0.1).max(100),
    currency: z.string().min(1),
    splitPercentage: z.coerce.number().min(0).max(100),
    conversionRate: z.coerce.number().min(1),
    workingWeeks: z.coerce.number().min(1).max(52),
    listingsGoalAnnual: z.coerce.number().min(0).optional(),
    plToListingConversionTarget: z.coerce.number().min(1).max(100).optional(),
    salesEffectivenessRatio: z.coerce.number().min(1).max(20).optional(),
    listingsGoalStartDate: z.string().optional().nullable(),
    listingsGoalEndDate: z.string().optional().nullable(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalSettingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agentId: string;
    agentName: string;
    year: number;
    agentSplit?: number; // Split del perfil del agente
}

export function GoalSettingDialog({
    open,
    onOpenChange,
    agentId,
    agentName,
    year,
    agentSplit
}: GoalSettingDialogProps) {
    const { data: auth } = useAuth();
    const isGod = auth?.profile?.role === 'god';
    const { progress, history, upsertGoal, isLoading } = useObjectives(year, agentId);
    const [step, setStep] = useState(1);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [captacionesMode, setCaptacionesMode] = useState<'standard' | 'custom'>('standard');

    // Reset step when dialog closes
    useEffect(() => {
        if (!open) {
            setStep(1);
            setShowAdvanced(false);
            setCaptacionesMode('standard');
        }
    }, [open]);

    const form = useForm<GoalFormData>({
        resolver: zodResolver(goalSchema) as any,
        defaultValues: {
            annualBillingGoal: 0,
            monthlyLivingExpenses: 0,
            averageTicketTarget: 0,
            averageCommissionTarget: OBJECTIVES_DEFAULTS.DEFAULT_COMMISSION_PERCENT,
            currency: OBJECTIVES_DEFAULTS.DEFAULT_CURRENCY,
            splitPercentage: agentSplit ?? OBJECTIVES_DEFAULTS.SPLIT_PERCENTAGE,
            conversionRate: OBJECTIVES_DEFAULTS.CONVERSION_RATE,
            workingWeeks: OBJECTIVES_DEFAULTS.WORKING_WEEKS,
            listingsGoalAnnual: 0,
            plToListingConversionTarget: 40,
            salesEffectivenessRatio: OBJECTIVES_DEFAULTS.SALES_EFFECTIVENESS_RATIO,
            listingsGoalStartDate: null,
            listingsGoalEndDate: null,
        },
    });

    // Reset form when progress or history loads
    useEffect(() => {
        if (progress) {
            form.reset({
                annualBillingGoal: progress.annual_billing_goal,
                monthlyLivingExpenses: progress.monthly_living_expenses,
                averageTicketTarget: progress.average_ticket_target,
                averageCommissionTarget: progress.average_commission_target,
                currency: progress.currency,
                splitPercentage: progress.split_percentage ?? 50,
                conversionRate: progress.conversion_rate ?? 6,
                workingWeeks: progress.working_weeks ?? 48,
                listingsGoalAnnual: progress.listings_goal_annual ?? 0,
                plToListingConversionTarget: progress.pl_to_listing_conversion_target ?? 40,
                salesEffectivenessRatio: progress.sales_effectiveness_ratio ?? OBJECTIVES_DEFAULTS.SALES_EFFECTIVENESS_RATIO,
                listingsGoalStartDate: progress.listings_goal_start_date ?? null,
                listingsGoalEndDate: progress.listings_goal_end_date ?? null,
            });
        } else if (history && !progress) {
            form.setValue('averageTicketTarget', Math.round(history.avgTicket));
            form.setValue('averageCommissionTarget', Number(history.avgCommPercent.toFixed(2)));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progress, history]);

    const onSubmit = async (data: GoalFormData) => {
        try {
            // En modo estándar, usar el mínimo calculado automáticamente
            const finalData = captacionesMode === 'standard'
                ? { ...data, listingsGoalAnnual: minimumListings > 0 ? minimumListings : (data.listingsGoalAnnual || 0) }
                : data;

            await upsertGoal.mutateAsync({
                ...finalData,
                agentId,
                year,
            });
            onOpenChange(false);
        } catch (error) {
            // Error managed in hook toast
        }
    };

    const annualGoal = form.watch('annualBillingGoal');
    const avgTicket = form.watch('averageTicketTarget');
    const avgComm = form.watch('averageCommissionTarget');
    const splitPct = form.watch('splitPercentage');
    const convRate = form.watch('conversionRate');
    const workWeeks = form.watch('workingWeeks');
    const salesEffRatio = form.watch('salesEffectivenessRatio') || OBJECTIVES_DEFAULTS.SALES_EFFECTIVENESS_RATIO;

    // Memoizar cálculos para evitar recálculos innecesarios
    const calculations = useMemo(() => {
        const estimatedPuntas = (avgTicket > 0 && avgComm > 0)
            ? Math.ceil(annualGoal / (avgTicket * (avgComm / 100)))
            : 0;
        const minimumListings = Math.ceil(estimatedPuntas * salesEffRatio);
        const requiredPlPbAnnual = estimatedPuntas * convRate;
        const weeklyPlPb = workWeeks > 0 ? requiredPlPbAnnual / workWeeks : 0;
        const netIncome = annualGoal * (splitPct / 100);

        // Cálculos de Captaciones
        const listingsGoal = form.watch('listingsGoalAnnual') || 0;
        const plToLConversion = form.watch('plToListingConversionTarget') || 40;
        const requiredPlForListings = Math.ceil(listingsGoal / (plToLConversion / 100));

        // Calcular semanas basado en fechas si existen
        const startDate = form.watch('listingsGoalStartDate');
        const endDate = form.watch('listingsGoalEndDate');
        const hasDateRange = !!(startDate && endDate);
        let weeksForListings = workWeeks;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
                weeksForListings = diffDays / 7;
            }
        }

        const weeklyPlForListings = weeksForListings > 0 ? requiredPlForListings / weeksForListings : 0;
        const isBelowMinimum = listingsGoal > 0 && listingsGoal < minimumListings;

        return { estimatedPuntas, minimumListings, requiredPlPbAnnual, weeklyPlPb, netIncome, requiredPlForListings, weeklyPlForListings, listingsGoal, weeksForListings, hasDateRange, isBelowMinimum };
    }, [annualGoal, avgTicket, avgComm, splitPct, convRate, workWeeks, salesEffRatio, form.watch('listingsGoalAnnual'), form.watch('plToListingConversionTarget'), form.watch('listingsGoalStartDate'), form.watch('listingsGoalEndDate')]);

    const { estimatedPuntas, minimumListings, requiredPlPbAnnual, weeklyPlPb, netIncome, requiredPlForListings, weeklyPlForListings, listingsGoal, weeksForListings, hasDateRange, isBelowMinimum } = calculations;

    // Siempre arranca en estándar; el agente elige si quiere personalizar
    useEffect(() => {
        if (step === 3) {
            setCaptacionesMode('standard');
            if (minimumListings > 0) {
                form.setValue('listingsGoalAnnual', minimumListings);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, minimumListings]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-slate-900/95 border-slate-800 text-white backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        <Target className="w-6 h-6 text-blue-400" />
                        Configurar Objetivos {year}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Define las metas para {agentName}. El sistema calculará automáticamente el camino al éxito.
                    </DialogDescription>
                </DialogHeader>

                {/* Stepper visual */}
                <div className="flex items-center justify-center gap-2 pt-2">
                    {[
                        { n: 1, label: 'Meta' },
                        { n: 2, label: 'Simulador' },
                        { n: 3, label: 'Captaciones' },
                    ].map((s, i) => (
                        <div key={s.n} className="flex items-center gap-2">
                            <div className="flex flex-col items-center gap-1">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                    step === s.n
                                        ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30'
                                        : step > s.n
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                                }`}>
                                    {step > s.n ? '✓' : s.n}
                                </div>
                                <span className={`text-[9px] font-medium uppercase tracking-wider ${
                                    step === s.n ? 'text-blue-400' : step > s.n ? 'text-emerald-400' : 'text-slate-600'
                                }`}>{s.label}</span>
                            </div>
                            {i < 2 && (
                                <div className={`w-12 h-px mb-4 transition-colors duration-300 ${
                                    step > s.n ? 'bg-emerald-600' : 'bg-slate-800'
                                }`} />
                            )}
                        </div>
                    ))}
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)}>
                <ScrollableFormArea className="max-h-[60vh]" resetKey={step}>
                    <div className="space-y-6 py-2">
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid gap-2">
                                <Label htmlFor="annualBillingGoal">Meta de Ingreso Anual (Bruto)</Label>
                                <div className="relative">
                                    <Input
                                        id="annualBillingGoal"
                                        type="number"
                                        placeholder="Ej: 100000"
                                        className="bg-slate-800/50 border-slate-700 pl-10"
                                        {...form.register('annualBillingGoal')}
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                </div>
                                {form.formState.errors.annualBillingGoal && (
                                    <p className="text-xs text-red-400">{form.formState.errors.annualBillingGoal.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="currency">Moneda</Label>
                                    <Select
                                        value={form.watch('currency')}
                                        onValueChange={(v) => form.setValue('currency', v)}
                                    >
                                        <SelectTrigger className="bg-slate-800/50 border-slate-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="USD">USD</SelectItem>
                                            <SelectItem value="ARS">ARS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="monthlyLivingExpenses">Gasto Mensual Fijo</Label>
                                    <Input
                                        id="monthlyLivingExpenses"
                                        type="number"
                                        placeholder="Ej: 2000"
                                        className="bg-slate-800/50 border-slate-700"
                                        {...form.register('monthlyLivingExpenses')}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="bg-blue-600 hover:bg-blue-500"
                                >
                                    Siguiente: Simulador
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                                <Calculator className="w-5 h-5 text-blue-400 mt-1" />
                                <div>
                                    <h4 className="font-semibold text-blue-200">Modo Simulador</h4>
                                    <p className="text-sm text-blue-300/80">
                                        Ajusta tus parámetros para ver cuántas ventas necesitas cerrar.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="averageTicketTarget">Precio Promedio de Venta</Label>
                                        {history && history.avgTicket > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => form.setValue('averageTicketTarget', Math.round(history.avgTicket))}
                                                className="text-[10px] uppercase font-bold text-blue-400 hover:underline"
                                            >
                                                Usar Historial (${Math.round(history.avgTicket).toLocaleString()})
                                            </button>
                                        )}
                                    </div>
                                    <Input
                                        id="averageTicketTarget"
                                        type="number"
                                        placeholder="Ej: 100000"
                                        className="bg-slate-800/50 border-slate-700"
                                        {...form.register('averageTicketTarget')}
                                    />
                                    <p className="text-[10px] text-slate-500">Valor típico de las propiedades que vendés</p>
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="averageCommissionTarget">% Comisión Promedio</Label>
                                        {history && history.avgCommPercent > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => form.setValue('averageCommissionTarget', history.avgCommPercent)}
                                                className="text-[10px] uppercase font-bold text-blue-400 hover:underline"
                                            >
                                                Usar Historial ({history.avgCommPercent.toFixed(1)}%)
                                            </button>
                                        )}
                                    </div>
                                    <Input
                                        id="averageCommissionTarget"
                                        type="number"
                                        step="0.1"
                                        placeholder="Ej: 3"
                                        className="bg-slate-800/50 border-slate-700"
                                        {...form.register('averageCommissionTarget')}
                                    />
                                    <p className="text-[10px] text-slate-500">% que cobrás por cada operación cerrada</p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors"
                                >
                                    <span className="flex items-center gap-2 uppercase tracking-wider">
                                        Parámetros avanzados
                                        <span className="text-[10px] font-normal text-slate-600 normal-case tracking-normal">
                                            Split {splitPct}% · Conv. {convRate}:1 · {workWeeks} sem.
                                        </span>
                                    </span>
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                                </button>
                                {showAdvanced && (
                                    <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-1 border-t border-slate-700/30 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="grid gap-1">
                                            <Label htmlFor="splitPercentage" className="text-xs flex items-center gap-1">
                                                Mi porcentaje (Split)
                                                {!isGod && <Lock className="w-3 h-3 text-slate-500" />}
                                            </Label>
                                            <Input
                                                id="splitPercentage"
                                                type="number"
                                                className={`bg-slate-900/50 border-slate-700 h-8 text-sm ${!isGod ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                disabled={!isGod}
                                                {...form.register('splitPercentage')}
                                            />
                                            <p className="text-[9px] text-slate-500">% que te queda de cada comisión</p>
                                        </div>
                                        <div className="grid gap-1">
                                            <Label htmlFor="conversionRate" className="text-xs">Reuniones por venta</Label>
                                            <Input
                                                id="conversionRate"
                                                type="number"
                                                className="bg-slate-900/50 border-slate-700 h-8 text-sm"
                                                {...form.register('conversionRate')}
                                            />
                                            <p className="text-[9px] text-slate-500">Reuniones PL/PB para cerrar 1 punta</p>
                                        </div>
                                        <div className="grid gap-1">
                                            <Label htmlFor="workingWeeks" className="text-xs">Semanas laborales</Label>
                                            <Input
                                                id="workingWeeks"
                                                type="number"
                                                className="bg-slate-900/50 border-slate-700 h-8 text-sm"
                                                {...form.register('workingWeeks')}
                                            />
                                            <p className="text-[9px] text-slate-500">Semanas activas en el año</p>
                                        </div>
                                        <div className="grid gap-1">
                                            <Label htmlFor="salesEffectivenessRatio" className="text-xs">
                                                Captaciones por venta
                                            </Label>
                                            <Input
                                                id="salesEffectivenessRatio"
                                                type="number"
                                                min="1"
                                                max="20"
                                                step="1"
                                                className="bg-slate-900/50 border-slate-700 h-8 text-sm"
                                                {...form.register('salesEffectivenessRatio')}
                                            />
                                            <p className="text-[9px] text-slate-500">Propiedades captadas para cerrar 1 venta</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-white/10 text-center">
                                <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider font-bold">Puntas Requeridas</p>
                                <div className="text-5xl font-black text-white">
                                    {estimatedPuntas}
                                </div>
                                <p className="text-slate-400 text-xs mt-2 italic">
                                    Cerrando negocios de ${Number(avgTicket).toLocaleString()} al {avgComm}%
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">PL/PB Anual</p>
                                    <p className="text-xl font-bold text-cyan-400">{Math.ceil(requiredPlPbAnnual)}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">PL/PB Semanal</p>
                                    <p className="text-xl font-bold text-white">{weeklyPlPb.toFixed(1)}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Meta Neta</p>
                                    <p className="text-xl font-bold text-green-400">${Math.round(netIncome).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    className="border-slate-700 hover:bg-slate-800"
                                >
                                    Volver
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="bg-blue-600 hover:bg-blue-500"
                                >
                                    Siguiente: Captaciones
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Resumen de pasos anteriores */}
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { icon: <DollarSign className="w-3.5 h-3.5" />, label: 'Meta Bruta', value: `$${Number(annualGoal).toLocaleString()}`, color: 'text-blue-400' },
                                    { icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Ticket Prom.', value: `$${Number(avgTicket).toLocaleString()}`, color: 'text-cyan-400' },
                                    { icon: <Percent className="w-3.5 h-3.5" />, label: 'Comisión', value: `${avgComm}%`, color: 'text-purple-400' },
                                    { icon: <Target className="w-3.5 h-3.5" />, label: 'Puntas', value: `${estimatedPuntas}`, color: 'text-emerald-400' },
                                ].map((item) => (
                                    <div key={item.label} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-800/40 border border-slate-700/30">
                                        <span className={`${item.color} opacity-70`}>{item.icon}</span>
                                        <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                                        <span className="text-[8px] text-slate-500 uppercase font-medium tracking-wider">{item.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Toggle Estándar / Personalizado */}
                            <div className="flex rounded-lg bg-slate-800/60 border border-slate-700/50 p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setCaptacionesMode('standard')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all duration-200 ${
                                        captacionesMode === 'standard'
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                                            : 'text-slate-400 hover:text-slate-300'
                                    }`}
                                >
                                    <Target className="w-3.5 h-3.5" />
                                    Estándar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCaptacionesMode('custom')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all duration-200 ${
                                        captacionesMode === 'custom'
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                                            : 'text-slate-400 hover:text-slate-300'
                                    }`}
                                >
                                    <Settings2 className="w-3.5 h-3.5" />
                                    Personalizado
                                </button>
                            </div>

                            {/* Modo Estándar */}
                            {captacionesMode === 'standard' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600/15 to-cyan-600/15 border border-emerald-500/20 text-center space-y-3">
                                        <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">Captaciones calculadas automáticamente</p>
                                        <div className="text-4xl font-black text-white">
                                            {minimumListings}
                                        </div>
                                        <p className="text-slate-400 text-xs">
                                            captaciones necesarias para alcanzar tu meta
                                        </p>
                                        <div className="h-px bg-white/10 w-full" />
                                        <div className="flex justify-center gap-8 text-center">
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">Puntas</p>
                                                <p className="text-lg font-bold text-emerald-400">{estimatedPuntas}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">Ratio</p>
                                                <p className="text-lg font-bold text-cyan-400">{salesEffRatio}:1</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">PLs/Semana</p>
                                                <p className="text-lg font-bold text-white">{(workWeeks > 0 ? Math.ceil(minimumListings / (form.watch('plToListingConversionTarget') || 40) * 100) / workWeeks : 0).toFixed(1)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 text-center">
                                        Basado en {estimatedPuntas} puntas × ratio de efectividad {salesEffRatio}:1. Si querés ajustar esto, cambiá a <button type="button" onClick={() => setCaptacionesMode('custom')} className="text-purple-400 hover:underline font-semibold">Personalizado</button>.
                                    </p>
                                </div>
                            )}

                            {/* Modo Personalizado */}
                            {captacionesMode === 'custom' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    {/* Banner informativo */}
                                    {minimumListings > 0 && (
                                        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                                            <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                                            <p className="text-[11px] text-blue-300/90">
                                                Mínimo recomendado: <span className="font-bold text-white">{minimumListings}</span> captaciones ({estimatedPuntas} puntas × {salesEffRatio}:1)
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid gap-2">
                                        <Label htmlFor="listingsGoalAnnual">
                                            Meta de Captaciones {hasDateRange ? 'del Periodo' : 'Anuales'}
                                        </Label>
                                        <Input
                                            id="listingsGoalAnnual"
                                            type="number"
                                            placeholder={hasDateRange ? "Ej: 5 (en este trimestre)" : "Ej: 20 (en el año)"}
                                            className={`bg-slate-800/50 border-slate-700 ${isBelowMinimum ? 'border-amber-500/50 focus:ring-amber-500/30' : ''}`}
                                            {...form.register('listingsGoalAnnual')}
                                        />
                                        {isBelowMinimum && (
                                            <div className="flex items-center gap-1.5 text-xs text-amber-400">
                                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span>Por debajo del mínimo requerido ({minimumListings}).</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <div className="flex justify-between items-center">
                                            <Label htmlFor="plToListingConversionTarget">Efectividad (PL → Captación)</Label>
                                            <span className="text-[10px] text-slate-500">Estándar: 30-50%</span>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id="plToListingConversionTarget"
                                                type="number"
                                                min="1"
                                                max="100"
                                                className="bg-slate-800/50 border-slate-700 pr-8"
                                                {...form.register('plToListingConversionTarget')}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="listingsGoalStartDate" className="text-xs">Inicio (Opcional)</Label>
                                            <Input
                                                id="listingsGoalStartDate"
                                                type="date"
                                                className="bg-slate-800/50 border-slate-700 block w-full h-9 text-sm"
                                                {...form.register('listingsGoalStartDate')}
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="listingsGoalEndDate" className="text-xs">Fin (Opcional)</Label>
                                            <Input
                                                id="listingsGoalEndDate"
                                                type="date"
                                                className="bg-slate-800/50 border-slate-700 block w-full h-9 text-sm"
                                                {...form.register('listingsGoalEndDate')}
                                            />
                                        </div>
                                    </div>

                                    {listingsGoal > 0 && (
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-600/15 to-pink-600/15 border border-purple-500/20 text-center space-y-3">
                                            <div>
                                                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">Actividad Necesaria</p>
                                                <div className="text-3xl font-black text-white">
                                                    {requiredPlForListings} <span className="text-sm font-normal text-slate-300">Prelistings/{hasDateRange ? 'periodo' : 'año'}</span>
                                                </div>
                                            </div>
                                            <div className="h-px bg-white/10 w-full" />
                                            <div className="flex justify-center gap-8">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Por Semana</p>
                                                    <p className="text-lg font-bold text-pink-400">{weeklyPlForListings.toFixed(1)} <span className="text-xs text-slate-500">PLs</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Total Captaciones</p>
                                                    <p className="text-lg font-bold text-purple-400">{listingsGoal}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-between pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep(2)}
                                    className="border-slate-700 hover:bg-slate-800"
                                >
                                    Volver
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={upsertGoal.isPending}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/20"
                                >
                                    {upsertGoal.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <TrendingUp className="w-4 h-4 mr-2" />
                                            Guardar Todo
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                    </div>
                </ScrollableFormArea>
                </form>
            </DialogContent>
        </Dialog>
    );
}
