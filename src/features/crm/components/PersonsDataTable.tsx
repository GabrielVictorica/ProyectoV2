'use client';

import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MoreHorizontal,
    Phone,
    Mail,
    MessageCircle,
    Calendar,
    User,
    Tag,
    Briefcase,
    Activity,
    StickyNote,
    BarChart3,
    Home,
    CheckCircle2,
    PenTool,
    Star,
    ArrowUpRight
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Person } from '@/features/clients/types';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { HealthScoreBadge } from './HealthScoreBadge';
import { useCRM } from '../hooks/useCRM';

interface PersonsDataTableProps {
    persons: Person[];
    isLoading: boolean;
    onEdit?: (person: Person) => void;
    onAddNote?: (person: Person) => void;
    onView?: (person: Person) => void;
}

export function PersonsDataTable({ persons, isLoading, onEdit, onAddNote, onView }: PersonsDataTableProps) {
    const { touchPerson } = useCRM();

    if (isLoading) {
        return (
            <div className="w-full bg-[#09090b] rounded-2xl border border-white/[0.06] p-12 flex flex-col items-center justify-center gap-4">
                <div className="h-10 w-10 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                <p className="text-white/40 text-sm animate-pulse">Cargando base de relaciones...</p>
            </div>
        );
    }

    if (persons.length === 0) {
        return (
            <div className="w-full bg-[#09090b] rounded-2xl border border-white/[0.06] p-24 text-center">
                <div className="h-16 w-16 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <User className="h-8 w-8 text-white/20" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No hay relaciones registradas</h3>
                <p className="text-white/40 max-w-sm mx-auto">Comenzá vinculando personas desde tus búsquedas o actividades para verlas aquí.</p>
            </div>
        );
    }

    const getRowShadowStyle = (lastInteraction: string | null) => {
        if (!lastInteraction) return { boxShadow: 'inset 4px 0 0 0 rgba(75, 85, 99, 0.4)' }; // gray-500/40

        const days = differenceInDays(new Date(), new Date(lastInteraction));

        if (days > 45) return { boxShadow: 'inset 4px 0 0 0 rgba(239, 68, 68, 0.8)' }; // red-500
        if (days > 15) return { boxShadow: 'inset 4px 0 0 0 rgba(245, 158, 11, 0.8)' }; // amber-500
        return { boxShadow: 'inset 4px 0 0 0 rgba(16, 185, 129, 0.6)' }; // emerald-500/60
    };

    return (
        <div className="bg-[#09090b] rounded-2xl border border-white/[0.06] overflow-hidden">
            <Table>
                <TableHeader className="bg-white/[0.02]">
                    <TableRow className="border-white/[0.06] hover:bg-transparent border-l-4 border-l-transparent">
                        <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] py-4 pl-6">Persona</TableHead>
                        <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] py-4">Agente / Canal</TableHead>
                        <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] py-4">Contacto</TableHead>
                        <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] py-4">Atributos</TableHead>
                        <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] py-4">Última Nota / Seguimiento</TableHead>
                        <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] py-4 text-center">Semáforo</TableHead>
                        <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] py-4 text-right pr-6">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {persons.map((person) => (
                        <TableRow
                            key={person.id}
                            className="border-white/[0.04] group hover:bg-white/[0.01] transition-colors"
                            style={getRowShadowStyle(person.last_interaction_at)}
                        >
                            {/* Persona */}
                            <TableCell className="py-4 pl-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-white/[0.08] flex items-center justify-center text-white font-bold text-xs shrink-0">
                                        {person.first_name[0]}{person.last_name[0]}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span
                                            className="font-bold text-sm text-white group-hover:text-violet-400 transition-colors cursor-pointer truncate"
                                            onClick={() => onView?.(person)}
                                        >
                                            {person.first_name} {person.last_name}
                                        </span>
                                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                            {(Array.isArray(person.contact_type) ? person.contact_type : [person.contact_type]).filter(Boolean).map((role) => (
                                                <Badge key={role} variant="outline" className="h-4 px-1.5 text-[8px] bg-white/[0.02] border-white/[0.08] text-white/40 font-medium capitalize whitespace-nowrap">
                                                    {role}
                                                </Badge>
                                            ))}
                                            {person.influence_level && (
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "h-4 px-1.5 text-[9px] font-black border-none shadow-sm",
                                                        person.influence_level === 4 && "bg-violet-500/20 text-violet-400",
                                                        person.influence_level === 3 && "bg-blue-500/20 text-blue-400",
                                                        person.influence_level === 2 && "bg-slate-500/20 text-slate-400",
                                                        person.influence_level === 1 && "bg-rose-500/20 text-rose-400",
                                                    )}
                                                >
                                                    {person.influence_level === 4 ? 'A' : person.influence_level === 3 ? 'B' : person.influence_level === 2 ? 'C' : person.influence_level === 1 ? 'D' : '?'}
                                                </Badge>
                                            )}
                                            {person.occupation_company && (
                                                <span className="text-[9px] text-white/20 flex items-center gap-1 truncate max-w-[120px]">
                                                    <Briefcase className="w-2.5 h-2.5 shrink-0" />
                                                    {person.occupation_company}
                                                </span>
                                            )}
                                        </div>
                                        {person.referred_by && (
                                            <div className="flex items-center gap-1 mt-1 text-[9px] text-emerald-400/60 font-medium">
                                                <ArrowUpRight className="w-2.5 h-2.5" />
                                                Referido por: {person.referred_by.first_name} {person.referred_by.last_name}
                                            </div>
                                        )}
                                        {person.influence_level === 4 && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Badge className="h-3.5 px-1 bg-amber-500/10 text-amber-500 border-amber-500/20 text-[7px] font-bold uppercase tracking-widest">
                                                    Embajador
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TableCell>

                            {/* Agente / Canal */}
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-4 w-4 rounded-full bg-violet-500/20 flex items-center justify-center text-[8px] text-violet-300 font-bold shrink-0">
                                            {person.agent?.first_name?.[0] || '?'}{person.agent?.last_name?.[0] || ''}
                                        </div>
                                        <span className="text-xs text-white/70 font-medium truncate">
                                            {person.agent ? `${person.agent.first_name} ${person.agent.last_name}` : 'N/A'}
                                        </span>
                                    </div>
                                    {person.preferred_channel && (
                                        <div className="flex items-center gap-1 text-[10px] text-white/30 uppercase tracking-tighter">
                                            {person.preferred_channel === 'WhatsApp' ? (
                                                <MessageCircle className="w-2.5 h-2.5 text-emerald-500/50" />
                                            ) : person.preferred_channel === 'Email' ? (
                                                <Mail className="w-2.5 h-2.5 text-blue-500/50" />
                                            ) : (
                                                <Phone className="w-2.5 h-2.5 text-amber-500/50" />
                                            )}
                                            {person.preferred_channel}
                                        </div>
                                    )}
                                </div>
                            </TableCell>

                            {/* Contacto */}
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    {person.phone && (
                                        <div className="flex items-center gap-2 text-white/60 text-xs hover:text-white transition-colors cursor-help group/contact" onClick={() => window.open(`https://wa.me/${person.phone?.replace(/\D/g, '')}`, '_blank')}>
                                            <Phone className="w-3 h-3 text-emerald-500/50 group-hover/contact:text-emerald-400" />
                                            {person.phone}
                                        </div>
                                    )}
                                    {person.email && (
                                        <div className="flex items-center gap-2 text-white/60 text-xs truncate max-w-[150px]">
                                            <Mail className="w-3 h-3 text-blue-500/50" />
                                            <span className="truncate">{person.email}</span>
                                        </div>
                                    )}
                                </div>
                            </TableCell>

                            {/* Atributos (Solo Etiquetas) */}
                            <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-[150px]">
                                    {person.tags && person.tags.length > 0 ? (
                                        person.tags.map(tag => (
                                            <Badge key={tag} className="h-4 px-1.5 text-[8px] bg-white/[0.04] text-white/50 border-white/[0.06] hover:bg-violet-500/20 hover:text-violet-300 transition-colors uppercase tracking-tight">
                                                {tag}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-[10px] text-white/10 italic">Sin etiquetas</span>
                                    )}
                                </div>
                            </TableCell>

                            {/* Última Nota / Seguimiento */}
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    {person.observations ? (
                                        <div className="relative group/obs">
                                            <p className="text-[11px] text-white/60 line-clamp-2 max-w-[220px] leading-relaxed">
                                                {person.observations.split('\n\n')[0]}
                                            </p>
                                            {person.observations.includes('\n\n') && (
                                                <span className="text-[8px] text-violet-400 group-hover/obs:text-violet-300 transition-colors font-semibold uppercase tracking-widest mt-0.5 block">
                                                    +{person.observations.split('\n\n').length - 1} notas previas
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 py-1 opacity-20">
                                            <StickyNote className="w-3 h-3" />
                                            <span className="text-[10px] italic">Sin seguimiento</span>
                                        </div>
                                    )}
                                </div>
                            </TableCell>

                            {/* Semáforo */}
                            <TableCell className="text-center">
                                <HealthScoreBadge lastInteractionAt={person.last_interaction_at} />
                                <div className="mt-1.5 flex flex-col gap-0.5">
                                    {person.last_interaction_at && (
                                        <p className="text-[8px] text-white/40 uppercase tracking-tighter">
                                            Últ: {format(new Date(person.last_interaction_at.split('T')[0] + 'T12:00:00'), "dd/MM/yyyy")}
                                        </p>
                                    )}
                                    {person.next_action_at && (
                                        <p className="text-[8px] text-amber-500/60 font-bold uppercase tracking-tighter">
                                            Prox: {format(new Date(person.next_action_at.split('T')[0] + 'T12:00:00'), "dd/MM/yyyy")}
                                        </p>
                                    )}
                                </div>
                            </TableCell>

                            {/* Acciones */}
                            <TableCell className="text-right px-4 pr-6">
                                <div className="flex items-center justify-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/20"
                                        onClick={() => {
                                            touchPerson.mutate(person.id);
                                            if (person.phone) {
                                                window.open(`https://wa.me/${person.phone.replace(/\D/g, '')}`, '_blank');
                                            }
                                        }}
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/5">
                                                <MoreHorizontal className="h-4 w-4 text-white/40" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-[#1a1a1e] border-white/[0.08] text-white">
                                            <DropdownMenuItem onClick={() => onEdit?.(person)} className="hover:bg-white/5 cursor-pointer">
                                                <Activity className="w-4 h-4 mr-2 text-violet-400" />
                                                Ver detalle / Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onAddNote?.(person)} className="hover:bg-white/5 cursor-pointer">
                                                <StickyNote className="w-4 h-4 mr-2 text-amber-400" />
                                                Agregar Nota
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
