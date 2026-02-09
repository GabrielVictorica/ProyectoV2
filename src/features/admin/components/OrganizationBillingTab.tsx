'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import {
    Loader2,
    Plus,
    Receipt,
    CheckCircle2,
    XCircle,
    Calendar,
    DollarSign,
    AlertTriangle,
    Clock,
    Zap,
    History as HistoryIcon,
    ArrowDownRight,
    FileText,
    ExternalLink,
    Filter,
    Search,
    CreditCard,
    Banknote
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { BillingRecord } from '@/types/database.types';

interface Props {
    organizationId: string;
    organizationName: string;
}

const createChargeSchema = z.object({
    concept: z.string().min(3, 'El concepto debe tener al menos 3 caracteres'),
    original_amount: z.coerce.number().min(1, 'El monto debe ser mayor a 0'),
    surcharge_amount: z.coerce.number().min(0),
    first_due_date: z.string().min(1, 'La primera fecha de vencimiento es requerida'),
    second_due_date: z.string().optional(),
    period: z.string().optional(),
    notes: z.string().optional(),
    billing_type: z.enum(['royalty', 'commission', 'advertising', 'penalty', 'adjustment']),
    internal_notes: z.string().optional(),
});

type CreateChargeData = z.infer<typeof createChargeSchema>;

const paySchema = z.object({
    payment_method: z.string().min(1, 'El método de pago es requerido'),
    receipt_url: z.string().url('Debe ser una URL válida').or(z.literal('')),
    internal_notes: z.string().optional(),
});

type PayData = z.infer<typeof paySchema>;

export function OrganizationBillingTab({ organizationId, organizationName }: Props) {
    const [records, setRecords] = useState<BillingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [runMonthlyLoading, setRunMonthlyLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'pending_review'>('all');

    const form = useForm<CreateChargeData>({
        resolver: zodResolver(createChargeSchema) as any,
        defaultValues: {
            concept: '',
            original_amount: 0,
            surcharge_amount: 0,
            first_due_date: new Date().toISOString().split('T')[0],
            second_due_date: '',
            period: '',
            notes: '',
            billing_type: 'royalty',
            internal_notes: '',
        },
    });

    const payForm = useForm<PayData>({
        resolver: zodResolver(paySchema) as any,
        defaultValues: {
            payment_method: 'Transferencia',
            receipt_url: '',
            internal_notes: '',
        },
    });

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/billing?organizationId=${organizationId}`);
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setRecords(result.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar registros');
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // Auto-dismiss success message
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    const handleCreateCharge = async (data: CreateChargeData) => {
        setActionLoading(true);
        try {
            const totalAmount = data.original_amount + (data.surcharge_amount || 0);

            const response = await fetch('/api/admin/billing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organization_id: organizationId,
                    concept: data.concept,
                    amount: totalAmount,
                    original_amount: data.original_amount,
                    surcharge_amount: data.surcharge_amount || 0,
                    due_date: data.first_due_date,
                    first_due_date: data.first_due_date,
                    second_due_date: data.second_due_date || null,
                    period: data.period || null,
                    notes: data.notes || null,
                    billing_type: data.billing_type,
                    internal_notes: data.internal_notes || null,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            form.reset();
            setCreateDialogOpen(false);
            fetchRecords();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear cargo');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmPayment = async (data: PayData) => {
        if (!selectedRecord) return;
        setActionLoading(true);
        try {
            const response = await fetch('/api/admin/billing', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedRecord.id,
                    status: 'paid',
                    payment_method: data.payment_method,
                    receipt_url: data.receipt_url || null,
                    internal_notes: data.internal_notes || null,
                    paid_at: new Date().toISOString()
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            setPayDialogOpen(false);
            setSelectedRecord(null);
            fetchRecords();
            setSuccess('Pago registrado correctamente');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar pago');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelRecord = async (id: string) => {
        if (!confirm('¿Seguro que deseas cancelar este cargo?')) return;
        setActionLoading(true);
        try {
            const response = await fetch(`/api/admin/billing?id=${id}`, {
                method: 'DELETE',
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            fetchRecords();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cancelar');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRunMonthlyClosing = async () => {
        setRunMonthlyLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await fetch('/api/admin/billing/run-monthly', {
                method: 'POST',
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setSuccess(result.message || 'Cierre mensual ejecutado correctamente');
            fetchRecords();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al ejecutar cierre mensual');
        } finally {
            setRunMonthlyLoading(false);
        }
    };

    const hasPenalty = (record: BillingRecord) => {
        if (record.status !== 'pending' && record.status !== 'pending_review' && record.status !== 'overdue') return false;
        const today = new Date();
        const firstDue = record.first_due_date ? new Date(record.first_due_date) : new Date(record.due_date);
        return today > firstDue;
    };

    const getTotalDebt = (record: BillingRecord) => {
        return (record.original_amount ?? record.amount ?? 0) + (record.surcharge_amount ?? 0);
    };

    const getStatusBadge = (record: BillingRecord) => {
        const penalty = hasPenalty(record);
        switch (record.status) {
            case 'pending':
                if (penalty) return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] px-2 h-5">Atraso</Badge>;
                return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px] px-2 h-5">Pendiente</Badge>;
            case 'pending_review':
                return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] px-2 h-5">Por Revisar</Badge>;
            case 'paid':
                return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-2 h-5">Pagado</Badge>;
            case 'overdue':
                return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] px-2 h-5">Vencido</Badge>;
            case 'cancelled':
                return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px] px-2 h-5">Cancelado</Badge>;
            default:
                return <Badge>{record.status}</Badge>;
        }
    };

    const getBillingTypeIcon = (type: string | null) => {
        switch (type) {
            case 'royalty': return <Zap className="h-3 w-3 text-purple-400" />;
            case 'commission': return <DollarSign className="h-3 w-3 text-emerald-400" />;
            case 'advertising': return <Plus className="h-3 w-3 text-blue-400" />;
            case 'penalty': return <AlertTriangle className="h-3 w-3 text-orange-400" />;
            case 'adjustment': return <FileText className="h-3 w-3 text-slate-400" />;
            default: return <Receipt className="h-3 w-3 text-slate-500" />;
        }
    };

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesSearch = r.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (r.period?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
            const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [records, searchQuery, statusFilter]);

    const stats = useMemo(() => {
        const pending = records.filter(r => r.status === 'pending' || r.status === 'pending_review' || r.status === 'overdue');
        const total = pending.reduce((sum, r) => sum + getTotalDebt(r), 0);
        const penalties = pending.reduce((sum, r) => sum + (r.surcharge_amount ?? 0), 0);
        const reviewCount = records.filter(r => r.status === 'pending_review').length;
        return { total, penalties, count: pending.length, reviewCount };
    }, [records]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500 opacity-50" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass p-4 rounded-xl border-white/5 bg-white/[0.02] flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Saldo Pendiente</p>
                        <p className={`text-xl font-bold ${stats.total > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                            {formatCurrency(stats.total)}
                        </p>
                    </div>
                    <div className={`p-2 rounded-lg ${stats.total > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/10 text-slate-400'}`}>
                        <DollarSign className="h-5 w-5" />
                    </div>
                </div>
                <div className="glass p-4 rounded-xl border-white/5 bg-white/[0.02] flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Cuentas por Cobrar</p>
                        <p className="text-xl font-bold text-slate-200">{stats.count}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                        <Receipt className="h-5 w-5" />
                    </div>
                </div>
                <div className="glass p-4 rounded-xl border-white/5 bg-white/[0.02] flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Por Revisar</p>
                        <p className={`text-xl font-bold ${stats.reviewCount > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                            {stats.reviewCount}
                        </p>
                    </div>
                    <div className={`p-2 rounded-lg ${stats.reviewCount > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-500'}`}>
                        <FileText className="h-5 w-5" />
                    </div>
                </div>
                <div className="glass p-4 rounded-xl border-white/5 bg-white/[0.02] border-t-purple-500/30 flex flex-col justify-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRunMonthlyClosing}
                        disabled={runMonthlyLoading}
                        className="w-full h-9 text-[11px] font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 rounded-lg transition-all"
                    >
                        {runMonthlyLoading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Zap className="h-3 w-3 mr-2" />}
                        GENERAR CIERRE
                    </Button>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input
                            placeholder="Buscar en historial..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 w-64 pl-9 bg-slate-900/50 border-slate-700/50 text-white text-xs"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                        <SelectTrigger className="h-9 w-40 bg-slate-900/50 border-slate-700/50 text-xs text-slate-300">
                            <Filter className="h-3.5 w-3.5 mr-2 opacity-50" />
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="pending">Solo pendientes</SelectItem>
                            <SelectItem value="pending_review">Solo revisión</SelectItem>
                            <SelectItem value="paid">Solo pagados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    size="sm"
                    onClick={() => setCreateDialogOpen(true)}
                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 h-9 text-xs px-4 rounded-lg"
                >
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Crear Cargo Manual
                </Button>
            </div>

            {success && (
                <Alert className="bg-emerald-500/10 border-emerald-500/20 py-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <AlertDescription className="text-emerald-400 text-xs font-medium">{success}</AlertDescription>
                </Alert>
            )}

            {error && (
                <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 py-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <AlertDescription className="text-rose-400 text-xs font-medium">{error}</AlertDescription>
                </Alert>
            )}

            {/* Records Table */}
            <div className="glass rounded-xl border-white/5 bg-white/[0.01] overflow-hidden shadow-2xl">
                {filteredRecords.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent bg-white/[0.02]">
                                <TableHead className="text-[10px] uppercase text-slate-500 font-bold h-10 px-6">Detalle / Concepto</TableHead>
                                <TableHead className="text-[10px] uppercase text-slate-500 font-bold h-10">Vencimiento</TableHead>
                                <TableHead className="text-[10px] uppercase text-slate-500 font-bold h-10 text-right">Monto Total</TableHead>
                                <TableHead className="text-[10px] uppercase text-slate-500 font-bold h-10 text-center">Estado</TableHead>
                                <TableHead className="text-[10px] uppercase text-slate-500 font-bold h-10 text-right px-6">Operaciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRecords.map((record) => {
                                const totalDebt = getTotalDebt(record);
                                const penalty = hasPenalty(record);
                                return (
                                    <TableRow key={record.id} className="border-white/5 group transition-all hover:bg-white/[0.02]">
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 h-7 w-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                    {getBillingTypeIcon(record.billing_type)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-200 text-sm group-hover:text-white transition-colors">
                                                        {record.concept}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {record.period && <span className="text-[10px] text-slate-500 font-mono">{record.period}</span>}
                                                        {record.billing_type && <span className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">[{record.billing_type}]</span>}
                                                    </div>
                                                    {record.notes && <div className="text-[10px] text-slate-600 mt-1 italic max-w-[250px] line-clamp-1">{record.notes}</div>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                    <Clock className="h-3 w-3 opacity-50" />
                                                    <span className={penalty ? 'text-rose-400 font-bold' : ''}>
                                                        {formatDate(record.first_due_date ?? record.due_date)}
                                                    </span>
                                                </div>
                                                {penalty && <div className="text-[9px] text-rose-500/70 font-bold uppercase tracking-tighter">En mora</div>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            <div className={`text-sm font-bold ${penalty ? 'text-rose-400' : 'text-slate-200'}`}>
                                                {formatCurrency(totalDebt)}
                                            </div>
                                            {(record.surcharge_amount ?? 0) > 0 && (
                                                <div className="text-[9px] text-rose-500/70 font-bold">
                                                    + {formatCurrency(record.surcharge_amount ?? 0)} punitorio
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {getStatusBadge(record)}
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {(record.status === 'pending' || record.status === 'pending_review' || record.status === 'overdue') && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 px-3 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-md font-bold"
                                                        onClick={() => {
                                                            setSelectedRecord(record);
                                                            payForm.reset({
                                                                payment_method: record.payment_method || 'Transferencia',
                                                                receipt_url: record.receipt_url || '',
                                                                internal_notes: record.internal_notes || '',
                                                            });
                                                            setPayDialogOpen(true);
                                                        }}
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                                        COBRAR
                                                    </Button>
                                                )}
                                                {record.receipt_url && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                                        onClick={() => window.open(record.receipt_url!, '_blank')}
                                                        title="Ver Comprobante"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-md"
                                                    onClick={() => handleCancelRecord(record.id)}
                                                    title="Cancelar"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-16 w-16 rounded-full bg-slate-900/50 flex items-center justify-center mb-4 border border-white/5">
                            <Receipt className="h-8 w-8 text-slate-700 opacity-20" />
                        </div>
                        <p className="text-sm font-semibold text-slate-500">Sin movimientos</p>
                        <p className="text-[10px] text-slate-600 mt-1 max-w-[250px] uppercase tracking-wider">No se registran cargos que coincidan con los filtros</p>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="bg-slate-950 border-white/10 text-slate-200 sm:max-w-md shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
                    <DialogHeader className="pt-4 px-2">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                            <Plus className="h-5 w-5 text-purple-400" />
                            Nuevo Cargo Manual
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 italic">Facturación directa a la cuenta corriente</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateCharge)} className="space-y-4 pt-4 px-2">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="billing_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Tipo de Cargo</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-white/[0.03] border-white/10 h-10">
                                                        <SelectValue placeholder="Seleccionar tipo" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                                    <SelectItem value="royalty">Royalty</SelectItem>
                                                    <SelectItem value="commission">Comisión</SelectItem>
                                                    <SelectItem value="advertising">Publicidad</SelectItem>
                                                    <SelectItem value="penalty">Multa</SelectItem>
                                                    <SelectItem value="adjustment">Ajuste</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="period"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Periodo (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} className="bg-white/[0.03] border-white/10 h-10" placeholder="YYYY-MM" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="concept"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Concepto / Detalle</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="bg-white/[0.03] border-white/10 h-10" placeholder="Ej: Pago de Royalty Enero" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="original_amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Monto Principal</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                                    <Input {...field} type="number" className="bg-white/[0.03] border-white/10 h-10 pl-9 font-mono" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="first_due_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-bold text-slate-500">1er Vencimiento</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="date" className="bg-white/[0.03] border-white/10 h-10" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="internal_notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Notas Internas (Solo Admin)</FormLabel>
                                        <FormControl>
                                            <textarea
                                                {...field}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 h-20 resize-none"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="pt-4">
                                <Button type="submit" disabled={actionLoading} className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold h-11">
                                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'CONFIRMAR Y EMITIR'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                <DialogContent className="bg-slate-950 border-white/10 text-slate-200 sm:max-w-md shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
                    <DialogHeader className="pt-4 px-2">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            Confirmar Cobro
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 italic">Registrar ingreso de fondos a la red</DialogDescription>
                    </DialogHeader>
                    {selectedRecord && (
                        <Form {...payForm}>
                            <form onSubmit={payForm.handleSubmit(handleConfirmPayment)} className="space-y-4 pt-4 px-2">
                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-2 mb-6">
                                    <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">Concepto: {selectedRecord.concept}</p>
                                    <p className="text-3xl font-bold text-emerald-400 font-mono tracking-tighter">
                                        {formatCurrency(getTotalDebt(selectedRecord))}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <FormField
                                        control={payForm.control}
                                        name="payment_method"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Método de Pago</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-white/[0.03] border-white/10 h-10">
                                                            <div className="flex items-center gap-2">
                                                                <SelectValue placeholder="Seleccionar" />
                                                            </div>
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                                        <SelectItem value="Transferencia">
                                                            <div className="flex items-center gap-2">
                                                                <CreditCard className="h-3.5 w-3.5 opacity-50" />
                                                                Transferencia Bancaria
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="Efectivo">
                                                            <div className="flex items-center gap-2">
                                                                <Banknote className="h-3.5 w-3.5 opacity-50" />
                                                                Efectivo / Caja
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="USDT">
                                                            <div className="flex items-center gap-2">
                                                                <DollarSign className="h-3.5 w-3.5 opacity-50" />
                                                                Cripto / USDT
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={payForm.control}
                                        name="receipt_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] uppercase font-bold text-slate-500">URL del Comprobante (Drive/Dropbox/Web)</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                                        <Input {...field} className="bg-white/[0.03] border-white/10 h-10 pl-9 text-xs" placeholder="https://..." />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={payForm.control}
                                        name="internal_notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Notas de Auditoría</FormLabel>
                                                <FormControl>
                                                    <textarea
                                                        {...field}
                                                        className="w-full bg-white/[0.03] border border-white/10 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 h-20 resize-none"
                                                        placeholder="Detalles del depósito o recibo..."
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <DialogFooter className="pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setPayDialogOpen(false)}
                                        className="text-slate-500 hover:text-slate-300 mr-auto"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8"
                                    >
                                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'MARCAR COMO PAGADO'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
