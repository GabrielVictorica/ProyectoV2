'use client';

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Phone,
    MessageSquare,
    Mail,
    MoreVertical,
    Edit2,
    Trash2,
    Search,
    User,
    Building2,
    Calendar,
    Target,
    Clock,
    Eye,
    Wallet,
    Info,
    Trophy,
    History,
    Send
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { useInteractions, useAddInteraction } from '../hooks/useClients';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ClientWithAgent, AnonymousClient } from '../types';
import { type ClientDisplay } from '../utils/privacy';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { parseNURC } from '../utils/clientUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePropertyTypes } from '@/features/properties/hooks/useProperties';
import { Home, Bed } from "lucide-react";

interface ClientDataTableProps {
    clients: (ClientWithAgent | AnonymousClient | ClientDisplay)[];
    scope: 'personal' | 'office' | 'network';
    onEdit?: (client: any) => void;
    onDelete?: (id: string) => void;
    onStatusChange?: (id: string, status: string) => void;
}

export function ClientDataTable({
    clients,
    scope,
    onEdit,
    onDelete,
    onStatusChange
}: ClientDataTableProps) {
    const { data: propertyTypes } = usePropertyTypes();
    const isNetwork = scope === 'network';
    const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

    const { data: interactions, isLoading: isLoadingInteractions } = useInteractions(selectedClientId || '');
    const addInteraction = useAddInteraction();
    const [newNote, setNewNote] = React.useState('');
    const [noteType, setNoteType] = React.useState<'nota' | 'propiedad_enviada' | 'llamada' | 'whatsapp' | 'email' | 'otro'>('nota');

    const handleAddNote = async () => {
        if (!newNote.trim() || !selectedClientId) return;
        await addInteraction.mutateAsync({
            clientId: selectedClientId,
            type: noteType,
            content: newNote
        });
        setNewNote('');
    };

    const handleOpenHistory = (clientId: string) => {
        setSelectedClientId(clientId);
        setIsHistoryOpen(true);
    };

    return (
        <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
            <Table>
                <TableHeader className="bg-white/[0.02]">
                    <TableRow className="hover:bg-transparent border-white/10">
                        <TableHead className="text-white/40 font-bold uppercase tracking-widest text-[10px] h-12">Cliente</TableHead>
                        <TableHead className="text-white/40 font-bold uppercase tracking-widest text-[10px] h-12 text-center">NURC</TableHead>
                        <TableHead className="text-white/40 font-bold uppercase tracking-widest text-[10px] h-12">Detalles</TableHead>
                        <TableHead className="text-white/40 font-bold uppercase tracking-widest text-[10px] h-12 w-[300px]">Búsqueda</TableHead>
                        {!isNetwork && <TableHead className="text-white/40 font-bold uppercase tracking-widest text-[10px] h-12">Contacto</TableHead>}
                        {scope === 'office' && <TableHead className="text-white/40 font-bold uppercase tracking-widest text-[10px] h-12">Agente</TableHead>}
                        <TableHead className="text-right text-white/40 font-bold uppercase tracking-widest text-[10px] h-12">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clients.map((clientData) => {
                        const client = clientData as ClientDisplay;
                        const isNetwork = scope === 'network';
                        const isActuallyAnonymous = client.is_anonymous;

                        const motivationForNURC = client.motivation || client.anonymous_label || '';
                        const nurc = parseNURC(motivationForNURC);

                        const agentPhone = client.agent_phone;

                        const agentName = client.agent_name;

                        return (
                            <TableRow key={client.id} className="group hover:bg-white/[0.02] border-white/5 transition-colors">
                                {/* COLUMNA: CLIENTE */}
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center border border-white/10">
                                            {isActuallyAnonymous ? (
                                                <Search className="w-4 h-4 text-violet-400" />
                                            ) : (
                                                <span className="text-xs font-bold text-white uppercase">
                                                    {(client.first_name || '?')[0]}{(client.last_name || '')[0] || ' '}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-white group-hover:text-violet-400 transition-colors">
                                                {isActuallyAnonymous
                                                    ? (client.first_name || client.anonymous_label || 'Cliente Protegido')
                                                    : `${client.first_name || 'Cliente'} ${client.last_name || ''}`}
                                            </span>
                                            {isActuallyAnonymous && (
                                                <span className="text-[10px] text-violet-400/70 font-medium">Búsqueda compartida</span>
                                            )}
                                            <span className="text-[10px] text-white/40 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Ingreso: {format(new Date(client.created_at), 'd MMM yyyy', { locale: es })}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>

                                {/* COLUMNA: NURC (Text Profile View) */}
                                <TableCell className="text-center py-4">
                                    <TooltipProvider>
                                        <div className="flex items-center justify-center gap-1.5">
                                            {[
                                                { id: 'n', label: 'Necesidad', icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10', text: nurc.n },
                                                { id: 'u', label: 'Urgencia', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', text: nurc.u },
                                                { id: 'r', label: 'Realismo', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10', text: nurc.r },
                                                { id: 'c', label: 'Capacidad', icon: Wallet, color: 'text-violet-400', bg: 'bg-violet-500/10', text: nurc.c }
                                            ].map((item, i) => (
                                                <Tooltip key={i} delayDuration={0}>
                                                    <TooltipTrigger asChild>
                                                        <div className={`p-1.5 rounded-md border transition-all ${item.text
                                                            ? `${item.bg} border-white/10 opacity-100`
                                                            : 'border-white/5 opacity-20'
                                                            }`}>
                                                            <item.icon className={`w-3.5 h-3.5 ${item.text ? item.color : 'text-white'}`} />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="p-3 border-white/10 bg-[#0c0c0e]/95 backdrop-blur-xl shadow-2xl max-w-[200px]">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-2 border-b border-white/5 pb-1.5 mb-1.5">
                                                                <item.icon className={`w-3 h-3 ${item.color}`} />
                                                                <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">{item.label}</span>
                                                            </div>
                                                            <p className="text-[11px] leading-relaxed text-slate-300 italic">
                                                                {item.text || 'Sin descripción'}
                                                            </p>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    </TooltipProvider>
                                </TableCell>

                                {/* COLUMNA: DETALLES (Badge Tipo/Estado) */}
                                <TableCell className="py-4">
                                    <div className="flex flex-col gap-1.5">
                                        <Badge variant="outline" className={`w-fit text-[9px] uppercase tracking-tighter font-bold border-white/10 ${client.type === 'buyer' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
                                            }`}>
                                            {client.type === 'buyer' ? 'Comprador' : 'Vendedor'}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            <div className={`w-1.5 h-1.5 rounded-full ${client.status === 'active' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' :
                                                client.status === 'closed' ? 'bg-blue-400' : 'bg-white/20'
                                                }`} />
                                            <span className="text-[10px] text-white/50 capitalize">{client.status}</span>
                                        </div>
                                    </div>
                                </TableCell>

                                {/* COLUMNA: PRESUPUESTO */}
                                <TableCell className="py-4">
                                    <div className="flex flex-col gap-1.5">
                                        {/* Tipos y Ambientes */}
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            {client.search_property_types?.slice(0, 3).map(typeId => {
                                                const type = propertyTypes?.find(t => t.id === typeId);
                                                if (!type) return null;
                                                return (
                                                    <Badge key={typeId} variant="outline" className="text-[9px] bg-blue-500/10 border-blue-500/20 text-blue-400 h-5 px-1.5 font-bold uppercase tracking-tighter">
                                                        {type.name}
                                                    </Badge>
                                                );
                                            })}
                                            {client.search_bedrooms && client.search_bedrooms.length > 0 && (
                                                <Badge variant="outline" className="h-5 px-1.5 gap-1 border-white/10 text-white/60 text-[9px] bg-white/5">
                                                    <Bed className="w-2.5 h-2.5 opacity-50" />
                                                    <span className="font-bold">{client.search_bedrooms.join(', ')} Amb.</span>
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Presupuesto */}
                                        <div className="flex items-center gap-1">
                                            <span className="text-[11px] font-mono font-bold text-white tracking-tight">
                                                USD {client.budget_min.toLocaleString()} - {client.budget_max.toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Zonas / Descripción de búsqueda (Sin restricciones) */}
                                        <div className="text-[10px] text-white/40 leading-relaxed mt-0.5">
                                            <span className="italic block break-words whitespace-normal">
                                                {client.preferred_zones?.join(', ') || 'Zonas no definidas'}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>

                                {/* COLUMNA: CONTACTO (Solo si NO es anónimo/network) */}
                                {!isNetwork && (
                                    <TableCell className="py-4">
                                        {!isActuallyAnonymous ? (
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors" asChild>
                                                    <a href={`https://wa.me/${(client as ClientWithAgent).phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                    </a>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-white/5 hover:bg-blue-500/10 hover:text-blue-400 transition-colors" asChild>
                                                    <a href={`mailto:${(client as ClientWithAgent).email}`}>
                                                        <Mail className="w-3.5 h-3.5" />
                                                    </a>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-white/5 hover:bg-violet-500/10 hover:text-violet-400 transition-colors" asChild>
                                                    <a href={`tel:${(client as ClientWithAgent).phone}`}>
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </a>
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-white/20">
                                                <Eye className="w-3 h-3 opacity-30" />
                                                <span className="text-[10px] italic">Datos Reservados</span>
                                            </div>
                                        )}
                                    </TableCell>
                                )}

                                {/* COLUMNA: AGENTE (En office y network) */}
                                {(scope === 'office' || scope === 'network') && (
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5 text-white/60">
                                                <User className="w-3 h-3 opacity-50" />
                                                <span className="text-xs font-medium">{agentName}</span>
                                            </div>
                                            {isNetwork && (
                                                <div className="flex items-center gap-1.5 text-white/30">
                                                    <Building2 className="w-3 h-3 opacity-30" />
                                                    <span className="text-[10px]">{(client as AnonymousClient).organization_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                )}

                                {/* COLUMNA: ACCIONES */}
                                <TableCell className="text-right py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        {/* Botón de Historial (Solo si NO es red anónima o si es Admin) */}
                                        {!isNetwork && (
                                            <TooltipProvider>
                                                <Tooltip delayDuration={0}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
                                                            onClick={() => handleOpenHistory(client.id)}
                                                        >
                                                            <History className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-slate-900 border-white/10 text-slate-200">
                                                        Ver Historial y Notas
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}

                                        {/* Botón de Contacto SIEMPRE visible si hay teléfono del agente */}
                                        {agentPhone && (
                                            <TooltipProvider>
                                                <Tooltip delayDuration={0}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/20 gap-2 text-[11px]"
                                                            asChild
                                                        >
                                                            <a
                                                                href={`https://wa.me/${agentPhone.replace(/\D/g, '')}?text=Hola ${agentName}, vi tu búsqueda de ${client.type === 'buyer' ? 'Comprador' : 'Vendedor'} en la red profesional y me gustaría colaborar.`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                                Contactar
                                                            </a>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-emerald-950 border-emerald-500/30 text-emerald-200">
                                                        Hablar con el agente responsable
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}

                                        {!isActuallyAnonymous && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 bg-[#09090b] border-white/10 text-slate-300">
                                                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Gestión</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-white/5" />
                                                    <DropdownMenuItem onClick={() => onEdit?.(client)} className="gap-2 cursor-pointer focus:bg-white/5">
                                                        <Edit2 className="w-3.5 h-3.5" /> Editar Datos
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator className="bg-white/5" />
                                                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Cambiar Estado</DropdownMenuLabel>
                                                    {['active', 'inactive', 'closed', 'archived'].map((status) => (
                                                        <DropdownMenuItem
                                                            key={status}
                                                            onClick={() => onStatusChange?.(client.id, status)}
                                                            className={`gap-2 cursor-pointer focus:bg-white/5 capitalize ${client.status === status ? 'text-violet-400 font-bold' : ''}`}
                                                        >
                                                            <div className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-400' :
                                                                status === 'closed' ? 'bg-blue-400' : 'bg-white/30'
                                                                }`} />
                                                            {status}
                                                        </DropdownMenuItem>
                                                    ))}

                                                    <DropdownMenuSeparator className="bg-white/5" />
                                                    <DropdownMenuItem
                                                        onClick={() => onDelete?.(client.id)}
                                                        className="gap-2 cursor-pointer text-rose-400 focus:bg-rose-500/10 focus:text-rose-400"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {/* PANEL DE HISTORIAL/NOTAS */}
            <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <SheetContent className="bg-[#09090b] border-l border-white/10 w-full sm:max-w-md p-0 flex flex-col">
                    <div className="p-6 border-b border-white/5">
                        <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <History className="w-5 h-5 text-violet-400" /> Historial de Colaboración
                        </SheetTitle>
                        <SheetDescription className="text-slate-500 mt-1">
                            Notas y seguimiento compartido para este cliente.
                        </SheetDescription>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-6">
                                {isLoadingInteractions ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-20 bg-white/5 animate-pulse rounded-lg" />
                                        ))}
                                    </div>
                                ) : interactions?.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                            <Info className="w-6 h-6 text-white/20" />
                                        </div>
                                        <p className="text-sm text-slate-500">No hay notas registradas todavía.</p>
                                    </div>
                                ) : (
                                    interactions?.map((item: any) => (
                                        <div key={item.id} className="relative pl-6 border-l border-white/10">
                                            <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                                                    {item.type.replace('_', ' ')}
                                                </span>
                                                <span className="text-[10px] text-white/30">
                                                    {format(new Date(item.created_at), 'd MMM HH:mm', { locale: es })}
                                                </span>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                                <p className="text-sm text-slate-300 leading-relaxed">{item.content}</p>
                                            </div>
                                            <div className="mt-1 flex items-center gap-1 text-[10px] text-white/20">
                                                <User className="w-2.5 h-2.5" />
                                                {item.agent?.first_name} {item.agent?.last_name}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>

                        <div className="p-6 bg-black/40 border-t border-white/10 space-y-4">
                            <div className="flex gap-2">
                                <Select value={noteType} onValueChange={(v: any) => setNoteType(v)}>
                                    <SelectTrigger className="w-[140px] bg-slate-900 border-white/10 text-xs">
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10">
                                        <SelectItem value="nota">🔖 Nota General</SelectItem>
                                        <SelectItem value="propiedad_enviada">🏠 Propiedad</SelectItem>
                                        <SelectItem value="llamada">📞 Llamada</SelectItem>
                                        <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                                        <SelectItem value="email">📧 Email</SelectItem>
                                        <SelectItem value="otro">⚙️ Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="relative">
                                <Textarea
                                    placeholder="Escribe una nota interna para el equipo..."
                                    className="bg-slate-900 border-white/10 text-sm min-h-[100px] focus:ring-violet-500/20"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                />
                                <Button
                                    size="sm"
                                    className="absolute bottom-2 right-2 bg-violet-600 hover:bg-violet-700 text-white"
                                    onClick={handleAddNote}
                                    disabled={!newNote.trim() || addInteraction.isPending}
                                >
                                    <Send className="w-3.5 h-3.5 mr-2" />
                                    {addInteraction.isPending ? 'Guardando...' : 'Guardar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
