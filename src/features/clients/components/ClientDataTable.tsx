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
    Send,
    Home,
    Bed,
    Copy,
    RefreshCw,
    Banknote,
    CheckCircle2,
    Archive,
    Activity,
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
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
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
import { parseNURC, generateSearchClipboardText } from '../utils/clientUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePropertyTypes } from '@/features/properties/hooks/useProperties';

import { toast } from 'sonner';
import { SearchDetailSheet } from './SearchDetailSheet';

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
    const [selectedClient, setSelectedClient] = React.useState<ClientDisplay | null>(null);
    const [isDetailOpen, setIsDetailOpen] = React.useState(false);
    const [selectedClientIdForHistory, setSelectedClientIdForHistory] = React.useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

    const { data: interactions, isLoading: isLoadingInteractions } = useInteractions(selectedClientIdForHistory || '');
    const addInteraction = useAddInteraction();
    const [newNote, setNewNote] = React.useState('');
    const [noteType, setNoteType] = React.useState<'nota' | 'propiedad_enviada' | 'llamada' | 'whatsapp' | 'email' | 'otro'>('nota');

    const handleAddNote = async () => {
        if (!newNote.trim() || !selectedClientIdForHistory) return;
        await addInteraction.mutateAsync({
            clientId: selectedClientIdForHistory,
            type: noteType,
            content: newNote
        });
        setNewNote('');
    };

    const handleOpenHistory = (e: React.MouseEvent, clientId: string) => {
        e.stopPropagation();
        setSelectedClientIdForHistory(clientId);
        setIsHistoryOpen(true);
    };

    const handleRowClick = (client: ClientDisplay) => {
        setSelectedClient(client);
        setIsDetailOpen(true);
    };

    return (
        <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
            <Table>
                <TableHeader className="bg-white/[0.02]">
                    <TableRow className="hover:bg-transparent border-white/10">
                        <TableHead className="text-white/40 font-bold uppercase tracking-widest text-[9px] h-10 px-4">Búsqueda / Perfil</TableHead>
                        <TableHead className="text-white/40 font-bold uppercase tracking-widest text-[9px] h-10 text-center w-[100px]">NURC</TableHead>
                        <TableHead className="text-white/40 font-bold uppercase tracking-widest text-[9px] h-10 w-[140px]">Presupuesto</TableHead>
                        {scope === 'office' && <TableHead className="text-white/40 font-bold uppercase tracking-widest text-[9px] h-10">Agente</TableHead>}
                        <TableHead className="text-right text-white/40 font-bold uppercase tracking-widest text-[9px] h-10 px-4">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clients.map((clientData) => {
                        // Cast to ClientDisplay for uniform access in the table
                        const client = clientData as ClientDisplay;
                        const isActuallyAnonymous = !!client.is_anonymous;
                        const nurc = parseNURC(client.motivation);
                        const agentName = client.agent_name || 'Agente';

                        // Narrative text
                        const propertyTypeNames = (client.search_property_types || [])
                            .map(id => propertyTypes?.find(t => t.id === id)?.name)
                            .filter(Boolean);

                        const narrativeProperty = propertyTypeNames.length > 0
                            ? propertyTypeNames.join(', ')
                            : 'Propiedad';

                        const rooms = client.search_bedrooms && client.search_bedrooms.length > 0
                            ? ` de ${client.search_bedrooms.join(', ')} dorm.`
                            : '';

                        const zones = client.preferred_zones && client.preferred_zones.length > 0
                            ? ` en ${client.preferred_zones.join(', ')}`
                            : '';

                        return (
                            <TableRow
                                key={client.id}
                                className="group hover:bg-white/[0.04] border-white/5 transition-colors cursor-pointer h-[52px]"
                                onClick={() => handleRowClick(client)}
                            >
                                {/* NARRATIVA */}
                                <TableCell className="py-2 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center border border-white/5 flex-shrink-0">
                                            {isActuallyAnonymous ? (
                                                <Target className="w-3.5 h-3.5 text-violet-400 opacity-70" />
                                            ) : (
                                                <span className="text-[10px] font-bold text-white/70 uppercase">
                                                    {(client.first_name || '?')[0]}{(client.last_name || '')[0] || ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0 overflow-hidden">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[13px] text-white/90 group-hover:text-white transition-colors truncate">
                                                    {isActuallyAnonymous
                                                        ? (client.first_name || client.anonymous_label || 'Cliente Protegido')
                                                        : `${client.first_name} ${client.last_name}`}
                                                </span>
                                                <div className={`w-1.5 h-1.5 rounded-full ${client.status === 'active' ? 'bg-emerald-400' : 'bg-white/20'}`} />
                                            </div>
                                            <div className="text-[11px] text-white/50 truncate">
                                                <span className={`font-bold uppercase text-[9px] mr-1 ${client.type === 'buyer' ? 'text-blue-400' : 'text-amber-400'}`}>
                                                    {client.type === 'buyer' ? 'Compra' : 'Venta'}
                                                </span>
                                                <span className="text-white/70">{narrativeProperty}{rooms}</span>
                                                <span className="italic text-white/40">{zones}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>

                                {/* NURC SEMAPHOR */}
                                <TableCell className="py-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        {[
                                            { val: nurc.n, color: 'bg-emerald-400' },
                                            { val: nurc.u, color: 'bg-amber-400' },
                                            { val: nurc.r, color: 'bg-blue-400' },
                                            { val: nurc.c, color: 'bg-violet-400' }
                                        ].map((item, i) => (
                                            <div
                                                key={i}
                                                className={`w-1.5 h-1.5 rounded-full ${item.val ? item.color : 'bg-white/10'}`}
                                                title={item.val || 'Sin dato'}
                                            />
                                        ))}
                                    </div>
                                </TableCell>

                                {/* PRESUPUESTO */}
                                <TableCell className="py-2">
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-mono font-bold text-white/90">
                                            USD {(client.budget_min || 0).toLocaleString()} - {(client.budget_max || 0).toLocaleString()}
                                        </span>
                                        <div className="flex gap-1">
                                            {client.search_payment_methods?.slice(0, 2).map(m => (
                                                <span key={m} className="text-[8px] uppercase font-black text-white/30 tracking-tighter">
                                                    {m === 'cash' ? 'Efectivo' : m === 'swap' ? 'Permuta' : m}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </TableCell>

                                {/* AGENTE (En office) */}
                                {scope === 'office' && (
                                    <TableCell className="py-2">
                                        <div className="flex items-center gap-1.5 text-white/40">
                                            <User className="w-3 h-3 opacity-50" />
                                            <span className="text-[11px] font-medium truncate max-w-[80px]">{agentName}</span>
                                        </div>
                                    </TableCell>
                                )}

                                {/* ACCIONES */}
                                <TableCell className="py-2 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {!isNetwork && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-white/20 hover:text-white hover:bg-white/5"
                                                onClick={(e) => handleOpenHistory(e, client.id)}
                                            >
                                                <History className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white">
                                                    <MoreVertical className="w-3.5 h-3.5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 bg-[#09090b] border-white/10 text-slate-300">
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const text = generateSearchClipboardText(client, propertyTypes || []);
                                                        navigator.clipboard.writeText(text);
                                                        toast.success('Búsqueda copiada');
                                                    }}
                                                    className="gap-2 cursor-pointer focus:bg-white/5"
                                                >
                                                    <Copy className="w-3.5 h-3.5" /> Copiar Link
                                                </DropdownMenuItem>
                                                {!isActuallyAnonymous && (
                                                    <>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(client); }} className="gap-2 cursor-pointer focus:bg-white/5">
                                                            <Edit2 className="w-3.5 h-3.5" /> Editar
                                                        </DropdownMenuItem>

                                                        <DropdownMenuSub>
                                                            <DropdownMenuSubTrigger className="gap-2 cursor-pointer focus:bg-white/5">
                                                                <RefreshCw className="w-3.5 h-3.5" /> Cambiar Estado
                                                            </DropdownMenuSubTrigger>
                                                            <DropdownMenuPortal>
                                                                <DropdownMenuSubContent className="bg-[#09090b] border-white/10 text-slate-300 min-w-[150px]">
                                                                    <DropdownMenuItem
                                                                        onClick={(e) => { e.stopPropagation(); onStatusChange?.(client.id, 'active'); }}
                                                                        className="gap-2 cursor-pointer focus:bg-emerald-500/10 focus:text-emerald-400"
                                                                    >
                                                                        <Activity className="w-3.5 h-3.5" /> Activa
                                                                        {client.status === 'active' && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-400" />}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={(e) => { e.stopPropagation(); onStatusChange?.(client.id, 'inactive'); }}
                                                                        className="gap-2 cursor-pointer focus:bg-white/5"
                                                                    >
                                                                        <Clock className="w-3.5 h-3.5" /> Inactiva
                                                                        {client.status === 'inactive' && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-slate-500" />}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={(e) => { e.stopPropagation(); onStatusChange?.(client.id, 'closed'); }}
                                                                        className="gap-2 cursor-pointer focus:bg-blue-500/10 focus:text-blue-400"
                                                                    >
                                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Cerrada
                                                                        {client.status === 'closed' && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-blue-400" />}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={(e) => { e.stopPropagation(); onStatusChange?.(client.id, 'archived'); }}
                                                                        className="gap-2 cursor-pointer focus:bg-white/5"
                                                                    >
                                                                        <Archive className="w-3.5 h-3.5" /> Archivada
                                                                        {client.status === 'archived' && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-slate-700" />}
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuPortal>
                                                        </DropdownMenuSub>
                                                    </>
                                                )}
                                                <DropdownMenuSeparator className="bg-white/5" />
                                                <DropdownMenuItem
                                                    onClick={(e) => { e.stopPropagation(); onDelete?.(client.id); }}
                                                    className="gap-2 cursor-pointer text-rose-400 focus:bg-rose-500/10 focus:text-rose-400"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <SearchDetailSheet
                client={selectedClient}
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                onEdit={onEdit}
            />

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
                                    className="absolute bottom-2 right-2 bg-violet-600 hover:bg-violet-700 text-white font-bold"
                                    onClick={handleAddNote}
                                    disabled={!newNote.trim() || addInteraction.isPending}
                                >
                                    {addInteraction.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
