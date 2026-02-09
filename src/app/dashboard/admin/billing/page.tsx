'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Loader2, Zap, CheckCircle, DollarSign, Building2,
    Calendar, Search, Filter, ArrowUpRight, AlertTriangle,
    Eye, MoreHorizontal, Download, History, ArrowLeft,
    TrendingUp, ShieldCheck
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrganizationBillingTab } from '@/features/admin/components/OrganizationBillingTab';
import { FinanceCharts } from '@/features/admin/components/FinanceCharts';
import { ClosingWizard } from '@/features/admin/components/ClosingWizard';
import { formatCurrency } from '@/lib/formatters';

interface OrgSummary {
    id: string;
    name: string;
    status: 'active' | 'suspended' | 'pending_payment';
    royalty: number;
    totalDebt: number;
    overdueCount: number;
    pendingCount: number;
}

export default function BillingAdminPage() {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [summaries, setSummaries] = useState<OrgSummary[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null);
    const [view, setView] = useState<'table' | 'charts'>('table');
    const [wizardOpen, setWizardOpen] = useState(false);

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/billing?mode=summary');
            const data = await response.json();
            if (data.success) {
                setSummaries(data.data);
            }
        } catch (err) {
            console.error('Error fetching billing summary:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    // Wizard handles this now

    const filteredSummaries = useMemo(() => {
        return summaries.filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [summaries, searchQuery]);

    const globalStats = useMemo(() => {
        return {
            totalDebt: summaries.reduce((sum, s) => sum + s.totalDebt, 0),
            overdueCount: summaries.reduce((sum, s) => sum + s.overdueCount, 0),
            activeOrgs: summaries.filter(s => s.status === 'active').length,
            totalPending: summaries.reduce((sum, s) => sum + s.pendingCount, 0),
            effectiveness: summaries.length > 0 ? (summaries.filter(s => s.totalDebt === 0).length / summaries.length) * 100 : 100
        };
    }, [summaries]);

    if (loading && summaries.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header section with actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {selectedOrg && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrg(null)}
                            className="bg-white/5 border border-white/10 text-white rounded-full h-10 w-10 hover:bg-white/10"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Finanzas</h1>
                        <p className="text-slate-400 mt-1 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-purple-400" />
                            Control de ingresos y balances de red
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!selectedOrg && (
                        <div className="glass flex p-1 rounded-lg border-white/5 bg-white/[0.03] mr-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setView('table')}
                                className={`h-7 text-[10px] px-3 ${view === 'table' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Listado
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setView('charts')}
                                className={`h-7 text-[10px] px-3 ${view === 'charts' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Analytics
                            </Button>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        className="text-slate-300 hover:text-white hover:bg-white/5 h-9"
                        onClick={() => fetchSummary()}
                    >
                        <TrendingUp className="h-4 w-4 mr-2 opacity-50" />
                        Refrescar
                    </Button>
                    <Button
                        onClick={() => setWizardOpen(true)}
                        disabled={actionLoading}
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20 h-9 px-4"
                    >
                        {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                        Cierre de Red
                    </Button>
                </div>
            </div>

            {selectedOrg ? (
                <div className="animate-in slide-in-from-bottom-5 duration-500">
                    <Card className="glass border-white/5 bg-white/[0.02] overflow-hidden shadow-2xl">
                        <CardHeader className="border-b border-white/5 bg-white/[0.01]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                        <Building2 className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl text-white">{selectedOrg.name}</CardTitle>
                                        <CardDescription className="text-slate-500">Estado de cuenta corriente y gestión de pagos</CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <OrganizationBillingTab
                                organizationId={selectedOrg.id}
                                organizationName={selectedOrg.name}
                            />
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <>
                    {result && (
                        <Alert className={result.success ? 'border-green-500/50 bg-green-500/10 animate-in slide-in-from-top duration-300' : 'border-red-500/50 bg-red-500/10 animate-in slide-in-from-top duration-300'}>
                            <AlertDescription className={result.success ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                                {result.message}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="glass border-white/5 bg-white/[0.03] hover:bg-white/[0.05] transition-all cursor-default">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    Deuda Pendiente
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white mb-1">
                                    {formatCurrency(globalStats.totalDebt)}
                                </div>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                    <ArrowUpRight className="h-3 w-3 text-red-500" />
                                    {globalStats.totalPending} conceptos por cobrar
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="glass border-white/5 bg-white/[0.03] hover:bg-white/[0.05] transition-all cursor-default">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    Mora Crítica
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-orange-400 mb-1">
                                    {globalStats.overdueCount}
                                </div>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                                    Requiere atención inmediata
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="glass border-white/5 bg-white/[0.03] hover:bg-white/[0.05] transition-all cursor-default">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    Efectividad de Cobro
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-400 mb-1">
                                    {Math.round(globalStats.effectiveness)}%
                                </div>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    Inmobiliarias al día
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="glass border-white/5 bg-white/[0.03] hover:bg-white/[0.05] transition-all cursor-default">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    Estado del Mes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-slate-200 mb-1">
                                    Progresivo
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 w-[65%]" />
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">Día {new Date().getDate()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {view === 'charts' ? (
                        <div className="animate-in zoom-in-95 duration-500">
                            <FinanceCharts summaryData={summaries} />
                        </div>
                    ) : (
                        <Card className="glass border-white/5 bg-white/[0.02] overflow-hidden shadow-xl animate-in slide-in-from-bottom-2 duration-500">
                            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/5 bg-white/[0.01]">
                                <div>
                                    <CardTitle className="text-lg text-white">Consolidado por Inmobiliaria</CardTitle>
                                    <CardDescription className="text-xs text-slate-500 italic">Balance de cuenta corriente por cada nodo de la red</CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                        <Input
                                            placeholder="Filtrar por nombre..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 bg-slate-900/50 border-slate-700/50 text-white w-64 h-9 text-xs focus:ring-1 focus:ring-purple-500/50"
                                        />
                                    </div>
                                    <Button variant="outline" size="icon" className="h-9 w-9 bg-slate-900/50 border-slate-700/50 text-slate-400 hover:text-white">
                                        <Filter className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-widest font-bold bg-white/[0.02]">
                                                <th className="px-6 py-4">Inmobiliaria</th>
                                                <th className="px-6 py-4 text-center">Estado Com.</th>
                                                <th className="px-6 py-4 text-center">Royalty</th>
                                                <th className="px-6 py-4 text-right">Cuenta Corriente</th>
                                                <th className="px-6 py-4 text-center">Pendientes</th>
                                                <th className="px-6 py-4 text-right pr-8">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredSummaries.map((org) => (
                                                <tr key={org.id} className="hover:bg-white/[0.03] transition-all group border-b border-white/[0.02]">
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-slate-200 group-hover:text-white transition-colors">{org.name}</div>
                                                        <div className="text-[10px] text-slate-600 font-mono mt-0.5">{org.id.split('-')[0]}...</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {org.status === 'active' && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-2 py-0 h-5">Activa</Badge>}
                                                        {org.status === 'suspended' && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] px-2 py-0 h-5">Suspendida</Badge>}
                                                        {org.status === 'pending_payment' && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] px-2 py-0 h-5">Mora</Badge>}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="font-mono text-slate-400 text-xs">{org.royalty}%</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className={`font-mono text-sm font-bold ${org.totalDebt > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                                            {formatCurrency(org.totalDebt)}
                                                        </div>
                                                        {org.overdueCount > 0 && (
                                                            <div className="text-[9px] text-rose-500/70 flex items-center justify-end gap-1 font-bold mt-0.5 animate-pulse">
                                                                <AlertTriangle className="h-2 w-2" />
                                                                VENCIDO
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${org.pendingCount > 0 ? 'bg-white/5 text-slate-300' : 'text-slate-600'}`}>
                                                            {org.pendingCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right pr-6">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 text-[10px] text-slate-400 hover:text-white hover:bg-white/10 px-3"
                                                                onClick={() => setSelectedOrg({ id: org.id, name: org.name })}
                                                            >
                                                                <Eye className="h-3.5 w-3.5 mr-1.5 opacity-50" />
                                                                Administrar
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-300">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200">
                                                                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-500">Acciones Directas</DropdownMenuLabel>
                                                                    <DropdownMenuItem
                                                                        className="focus:bg-white/10 flex items-center gap-2 text-xs"
                                                                        onClick={() => setSelectedOrg({ id: org.id, name: org.name })}
                                                                    >
                                                                        <DollarSign className="h-3.5 w-3.5" /> Nueva Percepción
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="focus:bg-white/10 flex items-center gap-2 text-xs">
                                                                        <Zap className="h-3.5 w-3.5" /> Ajuste Manual
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator className="bg-white/5" />
                                                                    <DropdownMenuItem className="focus:bg-white/10 flex items-center gap-2 text-xs">
                                                                        <History className="h-3.5 w-3.5" /> Estado de Cuenta (PDF)
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="focus:bg-white/10 flex items-center gap-2 text-xs">
                                                                        <Download className="h-3.5 w-3.5" /> Descargar Facturación
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}

                                            {filteredSummaries.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic">
                                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                                            <Search className="h-10 w-10" />
                                                            <p>Sin resultados disponibles</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            <div className="flex items-center gap-2 text-[10px] text-slate-600 justify-end font-mono">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                TRANSMISIÓN DE DATOS ENCRIPTADA Y CRONOMETRADA
            </div>
            {/* Closing Wizard */}
            <ClosingWizard
                open={wizardOpen}
                onOpenChange={setWizardOpen}
                onComplete={fetchSummary}
            />
        </div>
    );
}
