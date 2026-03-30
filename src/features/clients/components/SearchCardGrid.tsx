'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Building, Building2, Store, Briefcase, Map, Car,
    Warehouse, Tractor, Hotel, HardHat, LandPlot, Target, Trophy,
    DollarSign, RefreshCw, CreditCard, MapPin, User,
    MessageSquare, CheckCircle2, Clock, AlertTriangle, TrendingUp,
    MoreVertical, Edit2, Trash2, Archive, Ban, Landmark, Copy,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { MagicCard } from '@/components/ui/magic-card';
import { BorderBeam } from '@/components/ui/border-beam';
import { toast } from 'sonner';
import { usePropertyTypes } from '@/features/properties/hooks/useProperties';
import { useAddInteraction } from '../hooks/useClients';
import { SearchDetailSheet } from './SearchDetailSheet';
import { generateSearchClipboardText } from '../utils/clientUtils';
import type { ClientDisplay } from '../utils/privacy';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getIconForPropertyType(name: string) {
    const n = name.toLowerCase();
    if (n.includes('casa')) return Home;
    if (n.includes('departamento') || n.includes('depto')) return Building;
    if (n.includes('ph')) return Building2;
    if (n.includes('local')) return Store;
    if (n.includes('oficina')) return Briefcase;
    if (n.includes('terreno')) return Map;
    if (n.includes('cochera')) return Car;
    if (n.includes('depósito') || n.includes('deposito') || n.includes('galpón') || n.includes('galpon')) return Warehouse;
    if (n.includes('campo')) return Tractor;
    if (n.includes('hotel')) return Hotel;
    if (n.includes('pozo')) return HardHat;
    if (n.includes('hectárea') || n.includes('hectarea')) return LandPlot;
    return Building;
}

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
    cash: { label: 'Efectivo', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    swap: { label: 'Permuta', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    loan: { label: 'Financiación', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    mix: { label: 'Ef. + Permuta', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
};

function getHealth(status: string, daysSince: number) {
    if (status === 'closed') return { color: 'bg-blue-400', text: 'Cerrada', pulse: false, bars: 5, ring: 'ring-blue-500/20' };
    if (status !== 'active') return { color: 'bg-white/20', text: 'Inactiva', pulse: false, bars: 0, ring: '' };
    if (daysSince >= 14) return { color: 'bg-red-500', text: `Crítica · ${daysSince}d sin contacto`, pulse: true, bars: 1, ring: 'ring-red-500/20' };
    if (daysSince >= 7) return { color: 'bg-yellow-400', text: `Atención · ${daysSince}d sin contacto`, pulse: false, bars: 2, ring: 'ring-yellow-500/10' };
    if (daysSince >= 3) return { color: 'bg-emerald-400', text: `Saludable · hace ${daysSince}d`, pulse: false, bars: 4, ring: 'ring-emerald-500/10' };
    return { color: 'bg-emerald-400', text: `Saludable · hace ${daysSince}d`, pulse: false, bars: 5, ring: 'ring-emerald-500/10' };
}

// ─── Card variants ────────────────────────────────────────────────────────────

const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.055 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 18, scale: 0.97 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring' as const, stiffness: 280, damping: 28 },
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

// ─── Single Card ─────────────────────────────────────────────────────────────

interface SearchCardProps {
    client: ClientDisplay;
    scope: 'personal' | 'office' | 'network';
    onEdit?: (client: any) => void;
    onDelete?: (id: string) => void;
    onStatusChange?: (id: string, status: string, note?: string) => void;
    propertyTypes?: { id: string; name: string }[];
}

function SearchCard({ client, scope, onEdit, onDelete, onStatusChange, propertyTypes }: SearchCardProps) {
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [quickPopoverOpen, setQuickPopoverOpen] = useState(false);
    const [quickNote, setQuickNote] = useState('');
    const addInteraction = useAddInteraction();

    const isAnonymous = !!client.is_anonymous;
    const isOwner = scope !== 'network';
    const isVIP = (client.budget_max || 0) >= 300000;

    const lastDate = client.last_interaction_at || client.created_at || '';
    const daysSince = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : 0;
    const isCritical = client.status === 'active' && daysSince >= 14;

    const health = getHealth(client.status, daysSince);

    const propertyTypeNames = (client.search_property_types || [])
        .map(id => propertyTypes?.find(t => t.id === id))
        .filter(Boolean) as { id: string; name: string }[];

    const zones = client.preferred_zones || [];
    const payments = client.search_payment_methods || [];

    const handleQuickNote = async () => {
        if (!quickNote.trim()) return;
        await addInteraction.mutateAsync({ clientId: client.id, type: 'nota', content: quickNote });
        setQuickNote('');
        setQuickPopoverOpen(false);
        toast.success('Seguimiento registrado');
    };

    const gradientColor = isCritical ? '#7f1d1d' : isVIP ? '#78350f' : '#1e1b4b';

    return (
        <>
            <motion.div
                layout
                variants={cardVariants}
                whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 28 } }}
                whileTap={{ scale: 0.98 }}
                className="relative rounded-2xl cursor-pointer"
                onClick={() => setIsDetailOpen(true)}
            >
                {/* Magic Card wrapper */}
                <MagicCard
                    gradientColor={gradientColor}
                    gradientSize={220}
                    gradientOpacity={0.6}
                    className={`
                        relative rounded-2xl border transition-all duration-300
                        bg-slate-950/85 backdrop-blur-md
                        ${isCritical
                            ? 'border-red-500/40 hover:border-red-500/60'
                            : isVIP
                                ? 'border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                                : 'border-white/[0.08] hover:border-white/[0.16]'
                        }
                    `}
                >
                    {/* Border Beam — solo en VIP */}
                    {isVIP && !isCritical && (
                        <BorderBeam
                            size={70}
                            duration={6}
                            colorFrom="#f59e0b"
                            colorTo="#d97706"
                            borderWidth={1}
                        />
                    )}

                    <div className="p-4 space-y-3">
                        {/* Header: nombre + estado */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                {/* Avatar */}
                                <div className={`
                                    h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center border
                                    ${isAnonymous
                                        ? 'bg-violet-500/10 border-violet-500/20'
                                        : 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border-white/10'}
                                `}>
                                    {isAnonymous
                                        ? <Target className="w-3.5 h-3.5 text-violet-400 opacity-70" />
                                        : <span className="text-[10px] font-bold text-white/70 uppercase">
                                            {(client.first_name || '?')[0]}{(client.last_name || '')[0] || ''}
                                        </span>
                                    }
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[13px] font-bold text-white/90 truncate">
                                            {isAnonymous
                                                ? (client.anonymous_label || 'Cliente protegido')
                                                : `${client.first_name} ${client.last_name}`}
                                        </span>
                                        {isVIP && (
                                            <Trophy className="w-3 h-3 text-amber-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.8)] flex-shrink-0" />
                                        )}
                                    </div>
                                    {/* Barra de salud */}
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center gap-0.5 mt-1" onClick={e => e.stopPropagation()}>
                                                    {[...Array(5)].map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className={`h-1 w-3 rounded-sm transition-all ${i < health.bars ? health.color : 'bg-white/10'} ${health.pulse && i === 0 ? 'animate-pulse' : ''}`}
                                                        />
                                                    ))}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-900 border-slate-800 text-xs">
                                                {health.text}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>

                            {/* Acciones rápidas */}
                            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                {/* Nota rápida - solo propias */}
                                {isOwner && (
                                    <Popover open={quickPopoverOpen} onOpenChange={setQuickPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <button
                                                className="h-7 w-7 rounded-lg bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-500/30 flex items-center justify-center transition-all"
                                                title="Registrar seguimiento"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5 text-white/40 hover:text-violet-300 transition-colors" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-64 p-3 bg-slate-900 border-slate-700"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <p className="text-xs text-white/60 mb-2 font-medium">Registrar seguimiento</p>
                                            <Textarea
                                                placeholder="¿Qué novedades hay?"
                                                className="bg-slate-800/60 border-slate-700 text-sm min-h-[70px] resize-none"
                                                value={quickNote}
                                                onChange={e => setQuickNote(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleQuickNote(); }}
                                            />
                                            <Button
                                                size="sm"
                                                className="w-full mt-2 bg-violet-600 hover:bg-violet-700 h-8 text-xs"
                                                onClick={handleQuickNote}
                                                disabled={addInteraction.isPending || !quickNote.trim()}
                                            >
                                                {addInteraction.isPending ? 'Guardando...' : 'Guardar'}
                                            </Button>
                                        </PopoverContent>
                                    </Popover>
                                )}

                                {/* Menú de acciones */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all">
                                            <MoreVertical className="w-3.5 h-3.5 text-white/40" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className="w-48 bg-slate-900 border-slate-800 text-white"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {/* Grupo 1: Compartir */}
                                        <DropdownMenuItem
                                            className="gap-2 cursor-pointer hover:bg-slate-800 text-white/80"
                                            onClick={() => {
                                                const text = generateSearchClipboardText(client, propertyTypes || []);
                                                navigator.clipboard.writeText(text);
                                                toast.success('Búsqueda copiada');
                                            }}
                                        >
                                            <Copy className="w-3.5 h-3.5 text-violet-400" /> Copiar búsqueda
                                        </DropdownMenuItem>

                                        {isOwner && (
                                            <>
                                                {/* Grupo 2: Gestión */}
                                                <DropdownMenuSeparator className="bg-white/[0.06]" />
                                                {onEdit && (
                                                    <DropdownMenuItem
                                                        className="gap-2 cursor-pointer hover:bg-slate-800 text-white/80"
                                                        onClick={() => onEdit(client)}
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" /> Editar
                                                    </DropdownMenuItem>
                                                )}

                                                {/* Grupo 3: Cambiar estado */}
                                                {onStatusChange && client.status === 'active' && (
                                                    <>
                                                        <DropdownMenuSeparator className="bg-white/[0.06]" />
                                                        <DropdownMenuLabel className="text-white/30 text-[10px] uppercase tracking-wider">Cambiar estado</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            className="gap-2 cursor-pointer hover:bg-amber-500/10 text-amber-400"
                                                            onClick={() => onStatusChange(client.id, 'inactive')}
                                                        >
                                                            <Clock className="w-3.5 h-3.5" /> Suspender
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="gap-2 cursor-pointer hover:bg-emerald-500/10 text-emerald-400"
                                                            onClick={() => onStatusChange(client.id, 'closed')}
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Cerrada (éxito)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="gap-2 cursor-pointer hover:bg-red-500/10 text-red-400/80"
                                                            onClick={() => onStatusChange(client.id, 'archived')}
                                                        >
                                                            <Ban className="w-3.5 h-3.5" /> Perdida
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                                {onStatusChange && client.status !== 'active' && (
                                                    <>
                                                        <DropdownMenuSeparator className="bg-white/[0.06]" />
                                                        <DropdownMenuItem
                                                            className="gap-2 cursor-pointer hover:bg-emerald-500/10 text-emerald-400"
                                                            onClick={() => onStatusChange(client.id, 'active')}
                                                        >
                                                            <TrendingUp className="w-3.5 h-3.5" /> Reactivar Búsqueda
                                                        </DropdownMenuItem>
                                                    </>
                                                )}

                                                {/* Grupo 4: Zona peligrosa */}
                                                {onDelete && (
                                                    <>
                                                        <DropdownMenuSeparator className="bg-white/[0.06]" />
                                                        <DropdownMenuItem
                                                            className="gap-2 cursor-pointer hover:bg-red-500/10 text-red-400"
                                                            onClick={() => onDelete(client.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Tipos de propiedad */}
                        {propertyTypeNames.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {propertyTypeNames.map(pt => {
                                    const Icon = getIconForPropertyType(pt.name);
                                    return (
                                        <div
                                            key={pt.id}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.07] text-white/60"
                                        >
                                            <Icon className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                            <span className="text-[10px] font-semibold uppercase tracking-wide">{pt.name}</span>
                                        </div>
                                    );
                                })}
                                {client.search_bedrooms && client.search_bedrooms.length > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.07] text-white/50">
                                        <span className="text-[10px]">🛏</span>
                                        <span className="text-[10px] font-semibold">{client.search_bedrooms.join(', ')}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Presupuesto */}
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="text-[13px] font-mono font-bold text-white/90">
                                USD {(client.budget_min || 0).toLocaleString()} – {(client.budget_max || 0).toLocaleString()}
                            </span>
                        </div>

                        {/* Formas de pago + Crédito */}
                        {(payments.length > 0 || client.is_mortgage_eligible) && (
                            <div className="flex flex-wrap gap-1">
                                {payments.map(m => {
                                    const p = PAYMENT_LABELS[m] || { label: m, color: 'text-white/40 bg-white/5 border-white/10' };
                                    return (
                                        <span
                                            key={m}
                                            className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${p.color}`}
                                        >
                                            {p.label}
                                        </span>
                                    );
                                })}
                                {client.is_mortgage_eligible && (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border text-cyan-400 bg-cyan-500/10 border-cyan-500/20 flex items-center gap-0.5">
                                        <Landmark className="w-2.5 h-2.5" />
                                        {client.is_mortgage_prequalified ? 'Crédito ✓' : 'Crédito'}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Zonas */}
                        {zones.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                <span className="text-[11px] text-white/40 truncate">
                                    {zones.slice(0, 3).join(' · ')}{zones.length > 3 ? ` +${zones.length - 3}` : ''}
                                </span>
                            </div>
                        )}

                        {/* Agente — solo en scope office */}
                        {scope === 'office' && client.agent_name && (
                            <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.04]">
                                <User className="w-3 h-3 text-slate-600 flex-shrink-0" />
                                <span className="text-[10px] text-white/30 truncate">{client.agent_name}</span>
                            </div>
                        )}
                    </div>
                </MagicCard>
            </motion.div>

            {/* Detail Sheet */}
            <SearchDetailSheet
                client={isDetailOpen ? client : null}
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
            />
        </>
    );
}

// ─── Grid ────────────────────────────────────────────────────────────────────

interface SearchCardGridProps {
    clients: ClientDisplay[];
    scope: 'personal' | 'office' | 'network';
    onEdit?: (client: any) => void;
    onDelete?: (id: string) => void;
    onStatusChange?: (id: string, status: string, note?: string) => void;
}

export function SearchCardGrid({ clients, scope, onEdit, onDelete, onStatusChange }: SearchCardGridProps) {
    const { data: propertyTypes } = usePropertyTypes();

    return (
        <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <AnimatePresence mode="popLayout">
                {clients.map(client => (
                    <SearchCard
                        key={client.id}
                        client={client}
                        scope={scope}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onStatusChange={onStatusChange}
                        propertyTypes={propertyTypes}
                    />
                ))}
            </AnimatePresence>
        </motion.div>
    );
}
