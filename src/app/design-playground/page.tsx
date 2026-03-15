'use client';

import { useState, useMemo, useEffect, Suspense, lazy, Component, ReactNode } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useClosingsDashboard } from '@/features/transactions/hooks/useClosings';
import { formatCurrency } from '@/lib/formatters';
import { 
    DollarSign, 
    BarChart3, 
    Handshake, 
    Search, 
    RefreshCw, 
    Heart,
    MessageSquare,
    Zap,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Lazy load Spline to avoid blocking the main thread
const Spline = lazy(() => import('@splinetool/react-spline'));

// Error Boundary for Spline to prevent page crashes
class SplineErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Spline Error boundary caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center p-8 border border-white/10 bg-white/5 rounded-3xl backdrop-blur-md">
                    <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
                    <p className="text-sm text-slate-400">Error al cargar escena 3D</p>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 text-xs" 
                        onClick={() => this.setState({ hasError: false })}
                    >
                        Reintentar
                    </Button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function DesignPlaygroundPage() {
    const { data: auth } = useAuth();
    const [isMounted, setIsMounted] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const currentYear = new Date().getFullYear();
    const [selectedYear] = useState<number>(currentYear);
    const [selectedMonth] = useState<number | undefined>(undefined);
    const [selectedOrg] = useState<string>('all');
    const [selectedAgent] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

    // Fix hydration: Only render interactive/client parts after mount
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const queryFilters = {
        year: selectedYear,
        month: selectedMonth,
        organizationId: selectedOrg !== 'all' ? selectedOrg : undefined,
    };

    const { data: dashboardData } = useClosingsDashboard(queryFilters, auth?.id);

    const transactions = dashboardData?.transactions || [];

    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];
        return transactions.filter(tx => {
            const searchLower = searchQuery.toLowerCase();
            const propertyTitle = (tx.property?.title || tx.custom_property_title || '').toLowerCase();
            const agentName = tx.agent ? `${tx.agent.first_name} ${tx.agent.last_name}`.toLowerCase() : '';

            const matchesSearch = searchQuery === '' || 
                propertyTitle.includes(searchLower) || 
                agentName.includes(searchLower);

            const txStatus = tx.status || 'completed';
            const matchesTab = selectedTab === 'all' || txStatus === selectedTab;
            const matchesAgent = selectedAgent === 'all' || tx.agent_id === selectedAgent;

            return matchesSearch && matchesTab && matchesAgent;
        });
    }, [transactions, searchQuery, selectedTab, selectedAgent]);

    const metrics = useMemo(() => {
        if (!filteredTransactions) return { totalSales: 0, totalComm: 0, count: 0 };
        return filteredTransactions.reduce((acc, tx) => {
            if (tx.status !== 'cancelled') {
                acc.totalSales += Number(tx.actual_price || 0);
                acc.totalComm += Number(tx.gross_commission || 0);
                if (tx.status === 'completed' || !tx.status) acc.count += 1;
            }
            return acc;
        }, { totalSales: 0, totalComm: 0, count: 0 });
    }, [filteredTransactions]);

    if (!isMounted) {
        return <div className="min-h-screen bg-black" />;
    }

    const handleRetry = () => setRetryKey(prev => prev + 1);

    return (
        <div className="relative min-h-screen bg-black overflow-hidden selection:bg-purple-500/30">
            {/* BACKGROUND ANIMATION: Verified UUID for THE ETERNAL ARC */}
            <div className="absolute inset-0 z-0 opacity-40">
                <SplineErrorBoundary key={`bg-${retryKey}`} fallback={<div className="w-full h-full bg-slate-950" />}>
                    <Suspense fallback={<div className="w-full h-full bg-slate-950" />}>
                        <Spline scene="https://prod.spline.design/9f703171-347b-4dcc-b384-f2bb9a01d086/scene.splinecode" />
                    </Suspense>
                </SplineErrorBoundary>
            </div>

            {/* OVERLAY FOR READABILITY */}
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

            <div className="relative z-10 p-8 max-w-[1600px] mx-auto space-y-8">
                {/* GLASS HEADER */}
                <motion.header 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row items-center justify-between p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl"
                >
                    <div className="space-y-1 text-center md:text-left">
                        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                            Design Playground
                        </h1>
                        <p className="text-slate-400 font-medium flex items-center justify-center md:justify-start gap-2">
                            <Zap className="h-4 w-4 text-purple-400 animate-pulse" />
                            Next-gen UI Experiments & 3D Immersion
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 mt-4 md:mt-0">
                        <div className="relative w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                            <Input 
                                placeholder="Buscar en el metaverso..."
                                className="pl-10 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white gap-2 transition-all active:scale-95"
                            onClick={handleRetry}
                        >
                           <RefreshCw className="h-4 w-4" />
                           Reload 3D
                        </Button>
                    </div>
                </motion.header>

                {/* KPI CARDS WITH HOVER EFFECTS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { title: 'Volumen', value: formatCurrency(metrics.totalSales), icon: DollarSign, color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' },
                        { title: 'Comisiones', value: formatCurrency(metrics.totalComm), icon: BarChart3, color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30' },
                        { title: 'Operaciones', value: metrics.count, icon: Handshake, color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30' }
                    ].map((kpi, i) => (
                        <motion.div
                            key={kpi.title}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className={`p-6 rounded-3xl border ${kpi.border} bg-gradient-to-br ${kpi.color} backdrop-blur-xl group cursor-default shadow-lg shadow-black/20`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">
                                        {kpi.title}
                                    </p>
                                    <h2 className="text-3xl font-black text-white">{kpi.value}</h2>
                                </div>
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:rotate-12 transition-transform">
                                    <kpi.icon className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* DATA TABLE AREA */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden shadow-2xl"
                >
                    <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="w-full md:w-auto">
                            <TabsList className="bg-black/20 border border-white/10 p-1 rounded-2xl">
                                <TabsTrigger value="all" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white px-6">Todos</TabsTrigger>
                                <TabsTrigger value="pending" className="rounded-xl data-[state=active]:bg-amber-600 data-[state=active]:text-white px-6">Reservas</TabsTrigger>
                                <TabsTrigger value="completed" className="rounded-xl data-[state=active]:bg-emerald-600 data-[state=active]:text-white px-6">Cierres</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex gap-2">
                            <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-400 px-4 py-1.5 rounded-full">
                                {filteredTransactions.length} Items
                            </Badge>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-slate-400">Fecha</TableHead>
                                    <TableHead className="text-slate-400">Propiedad</TableHead>
                                    <TableHead className="text-slate-400">Estado</TableHead>
                                    <TableHead className="text-slate-400 text-right">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence mode='popLayout'>
                                    {filteredTransactions.map((tx, idx) => (
                                        <motion.tr 
                                            key={tx.id}
                                            layout
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                                        >
                                            <TableCell className="text-slate-400 font-mono text-xs">
                                                {format(new Date(tx.transaction_date), 'dd/MM/yyyy')}
                                            </TableCell>
                                            <TableCell className="text-white font-medium">
                                                {tx.property?.title || tx.custom_property_title || 'Propiedad sin título'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`rounded-full px-3 ${
                                                    tx.status === 'pending' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                                                    tx.status === 'cancelled' ? 'bg-red-500/20 text-red-500 border-red-500/30' : 
                                                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                }`}>
                                                    {tx.status || 'Concretado'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-white font-bold">
                                                {formatCurrency(tx.actual_price)}
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                </motion.div>
            </div>

            {/* FLOATING ROBOT ASSISTANT: Verified UUID for R4X BOT */}
            <div className="fixed bottom-4 right-4 z-50 w-64 h-64 pointer-events-none sm:pointer-events-auto group">
                <div className="absolute -top-12 right-0 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300">
                    <p className="text-xs text-white font-medium">¡Hola! Soy tu asistente 3D. <br/>¿Cómo puedo ayudarte hoy?</p>
                    <div className="flex gap-2 mt-2">
                        <Heart className="h-4 w-4 text-pink-500 cursor-pointer hover:scale-125 transition-transform" />
                        <MessageSquare className="h-4 w-4 text-blue-400 cursor-pointer hover:scale-125 transition-transform" />
                    </div>
                </div>
                <SplineErrorBoundary key={`bot-${retryKey}`} fallback={<div className="w-full h-full" />}>
                    <Suspense fallback={<div className="w-full h-full" />}>
                        <Spline 
                            scene="https://prod.spline.design/ed3b52af-7f6b-4fe9-b3dc-d3eedbf00f82/scene.splinecode" 
                            className="cursor-grab active:cursor-grabbing"
                        />
                    </Suspense>
                </SplineErrorBoundary>
            </div>
        </div>
    );
}
