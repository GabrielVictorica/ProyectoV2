'use client';

import React, { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useInteractions, useAddInteraction, useDeleteInteraction } from '../hooks/useClients';
import { Trash2 } from 'lucide-react';
import {
    Calendar,
    Target,
    Clock,
    Eye,
    Wallet,
    Info,
    User,
    Building2,
    MessageSquare,
    Phone,
    Mail,
    Home,
    Bed,
    MapPin,
    CreditCard,
    DollarSign,
    Trophy,
    History,
    MessageCircle,
    Landmark
} from "lucide-react";
import { parseNURC, getNURCLevel } from '../utils/clientUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePropertyTypes } from '@/features/properties/hooks/useProperties';
import type { ClientDisplay } from '../utils/privacy';

interface SearchDetailSheetProps {
    client: ClientDisplay | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit?: (client: ClientDisplay) => void;
}

export function SearchDetailSheet({
    client,
    open,
    onOpenChange,
    onEdit,
}: SearchDetailSheetProps) {
    const { data: propertyTypes } = usePropertyTypes();
    const canViewHistory = !!client && !client.is_anonymous;
    const { data: interactions, isLoading: isLoadingInteractions } = useInteractions(canViewHistory ? client!.id : '');
    const addInteraction = useAddInteraction();
    const deleteInteraction = useDeleteInteraction();
    const [newNote, setNewNote] = useState('');

    if (!client) return null;

    const canAddNote = !client.is_anonymous;
    const handleAddNote = async () => {
        if (!newNote.trim() || !client) return;
        await addInteraction.mutateAsync({ clientId: client.id, type: 'nota', content: newNote });
        setNewNote('');
    };

    const nurc = parseNURC(client.motivation);
    const isActuallyAnonymous = client.is_anonymous;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl bg-[#09090b] border-l border-white/10 shadow-[-20px_0_50px_-12px_rgba(139,92,246,0.15)] text-white p-0 flex flex-col">
                <SheetHeader className="sr-only">
                    <SheetTitle>Detalle de la Búsqueda</SheetTitle>
                    <SheetDescription>Información detallada sobre los requerimientos y perfil del cliente.</SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-8">
                        {/* Header Section */}
                        <div className="flex flex-col items-center text-center space-y-4 pt-4">
                            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center">
                                {isActuallyAnonymous ? (
                                    <Target className="w-10 h-10 text-violet-400" />
                                ) : (
                                    <span className="text-2xl font-bold text-white uppercase">
                                        {(client.first_name || '?')[0]}{(client.last_name || '')[0] || ''}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                                    {isActuallyAnonymous
                                        ? (client.anonymous_label || 'Cliente Protegido')
                                        : `${client.first_name} ${client.last_name}`}
                                    {client.person && (
                                        <Badge variant="outline" className="bg-violet-600/20 text-violet-400 border-violet-500/30">CRM</Badge>
                                    )}
                                </h2>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <Badge variant="outline" className={`capitalize ${client.type === 'buyer' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                        {client.type === 'buyer' ? 'Comprador' : 'Vendedor'}
                                    </Badge>
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 capitalize">
                                        {client.status === 'active' ? 'Activa' : client.status === 'closed' ? 'Cerrada' : client.status || 'Estado'}
                                    </Badge>
                                </div>
                            </div>

                            {!isActuallyAnonymous && (
                                <div className="flex gap-2 w-full justify-center">
                                    {client.phone && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
                                            onClick={() => window.open(`https://wa.me/${client.phone?.replace(/\D/g, '')}`, '_blank')}
                                        >
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            WhatsApp
                                        </Button>
                                    )}
                                    {onEdit && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                                            onClick={() => onEdit(client)}
                                        >
                                            Editar
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Search Parameters Section */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-violet-400">
                                <Target className="w-5 h-5" />
                                Perfil de Demanda
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Presupuesto */}
                                <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06] space-y-2">
                                    <span className="text-xs text-white/40 font-bold uppercase tracking-wider flex items-center gap-2">
                                        <Wallet className="w-3.5 h-3.5" /> Presupuesto
                                    </span>
                                    <div className="text-xl font-bold text-white transition-all group-hover:text-emerald-400">
                                        USD {(client.budget_min || 0).toLocaleString()} - {(client.budget_max || 0).toLocaleString()}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {client.search_payment_methods?.map((method: string) => {
                                            const methodLabels: Record<string, string> = {
                                                'cash': 'Efectivo',
                                                'swap': 'Permuta',
                                                'loan': 'Financiación',
                                                'mix': 'Ef.+Perm.',
                                            };
                                            return (
                                                <Badge key={method} variant="secondary" className="bg-white/10 text-[10px] uppercase font-bold tracking-tighter">
                                                    {methodLabels[method] || method}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                    {client.is_mortgage_eligible && (
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                                            <Landmark className="w-4 h-4 text-cyan-400" />
                                            <span className="text-sm font-bold text-cyan-400">Apto Crédito Hipotecario</span>
                                            {client.is_mortgage_prequalified && (
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                                                    ✓ Precalificado
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Propiedad */}
                                <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06] space-y-3">
                                    <span className="text-xs text-white/40 font-bold uppercase tracking-wider flex items-center gap-2">
                                        <Home className="w-3.5 h-3.5" /> Requerimientos
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {client.search_property_types?.map(typeId => (
                                            <Badge key={typeId} className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                {propertyTypes?.find(t => t.id === typeId)?.name || 'Propiedad'}
                                            </Badge>
                                        ))}
                                        {client.search_bedrooms && (
                                            <Badge variant="outline" className="border-white/10 text-white/60">
                                                {client.search_bedrooms.join(', ')} Ambientes
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Zonas */}
                            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06] space-y-3">
                                <span className="text-xs text-white/40 font-bold uppercase tracking-wider flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" /> Zonas Preferidas
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {client.preferred_zones?.length > 0 ? (
                                        client.preferred_zones.map(zone => (
                                            <Badge key={zone} variant="secondary" className="bg-white/5 text-white/70 border border-white/10">
                                                {zone}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm text-white/20 italic">No se definieron zonas específicas</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-white/10" />

                        {/* NURC Psychology Section */}
                        <div className="space-y-6">
                            {(() => {
                                const nurcLevel = getNURCLevel(client.motivation);
                                const nurc = parseNURC(client.motivation);
                                return (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold flex items-center gap-2 text-emerald-400">
                                                <Trophy className="w-5 h-5" />
                                                Psicología de la Búsqueda (NURC)
                                            </h3>
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${nurcLevel.bgColor} ${nurcLevel.borderColor} ${nurcLevel.color}`}>
                                                {nurcLevel.emoji} {nurcLevel.label}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {[
                                                { key: 'N', label: 'Necesidad', icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10', value: nurc.n, chars: nurcLevel.fieldChars.n },
                                                { key: 'U', label: 'Urgencia', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', value: nurc.u, chars: nurcLevel.fieldChars.u },
                                                { key: 'R', label: 'Realismo', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10', value: nurc.r, chars: nurcLevel.fieldChars.r },
                                                { key: 'C', label: 'Capacidad', icon: Wallet, color: 'text-violet-400', bg: 'bg-violet-500/10', value: nurc.c, chars: nurcLevel.fieldChars.c }
                                            ].map((item) => {
                                                const fieldOk = item.chars >= 20;
                                                const fieldGood = item.chars >= 50;
                                                return (
                                                    <div key={item.key} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex gap-4">
                                                        <div className={`h-12 w-12 rounded-xl ${item.bg} border border-white/10 flex items-center justify-center flex-shrink-0`}>
                                                            <item.icon className={`w-6 h-6 ${item.color}`} />
                                                        </div>
                                                        <div className="space-y-1 flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{item.label}</span>
                                                                <span className={`text-[9px] font-bold ${fieldGood ? 'text-emerald-400' : fieldOk ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                    {item.chars} chars {fieldGood ? '🟢' : fieldOk ? '🟡' : '🔴'}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-300 leading-relaxed italic">
                                                                {item.value || 'Información no disponible'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Collaboration & Agent Section */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-400">
                                <User className="w-5 h-5" />
                                Responsable y Colaboración
                            </h3>

                            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/5">
                                        <User className="w-5 h-5 text-white/40" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{client.agent_name || 'Agente'}</div>
                                        <div className="text-xs text-white/40 flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {client.organization_name || 'Inmobiliaria'}
                                        </div>
                                    </div>
                                </div>

                                {client.agent_phone && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                                        asChild
                                    >
                                        <a
                                            href={`https://wa.me/${client.agent_phone.replace(/\D/g, '')}?text=Hola ${client.agent_name}, vi tu búsqueda de ${client.type === 'buyer' ? 'Comprador' : 'Vendedor'} en la red profesional y me gustaría colaborar.`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <MessageCircle className="w-4 h-4 mr-2" />
                                            WhatsApp
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {canViewHistory && <Separator className="bg-white/10" />}

                        {/* Historial de Seguimiento — solo para búsquedas no anónimas */}
                        {canViewHistory && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-violet-400">
                                <History className="w-5 h-5" />
                                Historial de Seguimiento
                            </h3>

                            {canAddNote && (
                                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-2">
                                    <Textarea
                                        placeholder="Registrar un seguimiento, llamada o nota..."
                                        className="bg-slate-900/60 border-slate-800 text-sm min-h-[70px] resize-none"
                                        value={newNote}
                                        onChange={e => setNewNote(e.target.value)}
                                    />
                                    <Button
                                        size="sm"
                                        className="w-full bg-violet-600 hover:bg-violet-700 h-8 text-xs"
                                        onClick={handleAddNote}
                                        disabled={addInteraction.isPending || !newNote.trim()}
                                    >
                                        {addInteraction.isPending ? 'Guardando...' : 'Guardar seguimiento'}
                                    </Button>
                                </div>
                            )}

                            <div className="space-y-4">
                                {isLoadingInteractions ? (
                                    <div className="space-y-2">
                                        {[1, 2].map(i => (
                                            <div key={i} className="h-16 bg-white/5 animate-pulse rounded-lg" />
                                        ))}
                                    </div>
                                ) : !interactions || interactions.length === 0 ? (
                                    <div className="py-6 text-center">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2">
                                            <Info className="w-5 h-5 text-white/20" />
                                        </div>
                                        <p className="text-xs text-slate-500">No hay seguimientos registrados todavía.</p>
                                    </div>
                                ) : (
                                    interactions.map((item: any) => (
                                        <div key={item.id} className="relative pl-5 border-l border-white/10">
                                            <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                                                    {String(item.type).replace('_', ' ')}
                                                </span>
                                                <span className="text-[10px] text-white/30">
                                                    {format(new Date(item.created_at), 'd MMM HH:mm', { locale: es })}
                                                </span>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between text-[10px] text-white/20">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-2.5 h-2.5" />
                                                    {item.agent?.first_name} {item.agent?.last_name}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="flex items-center gap-1 text-rose-400/60 hover:text-rose-400 transition-colors"
                                                    onClick={() => {
                                                        if (confirm('¿Eliminar este seguimiento? Se quitará también del historial del CRM.')) {
                                                            deleteInteraction.mutate({ interactionId: item.id, clientId: client!.id });
                                                        }
                                                    }}
                                                    disabled={deleteInteraction.isPending}
                                                    title="Eliminar (solo si se cargó por error)"
                                                >
                                                    <Trash2 className="w-2.5 h-2.5" />
                                                    <span>Eliminar</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-white/5 text-[10px] text-white/20 text-center flex justify-between">
                    <span>ID: {client.id}</span>
                    <span>Ingreso: {format(new Date(client.created_at), 'PPP', { locale: es })}</span>
                </div>
            </SheetContent>
        </Sheet>
    );
}
