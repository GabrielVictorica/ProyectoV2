"use client";

import React from "react";
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
import {
    Phone,
    Mail,
    MapPin,
    Calendar,
    Briefcase,
    Globe,
    Star,
    Clock,
    MessageSquare,
    User,
    Heart,
    Edit,
    ExternalLink,
    MessageCircle,
    Trash2,
    Loader2
} from "lucide-react";
import { Person } from "@/features/clients/types";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { HealthScoreBadge } from "./HealthScoreBadge";
import { useCRM } from "../hooks/useCRM";
import { toast } from "sonner";

interface PersonDetailSheetProps {
    person: Person | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit: (person: Person) => void;
}

export function PersonDetailSheet({
    person,
    open,
    onOpenChange,
    onEdit,
}: PersonDetailSheetProps) {
    const { updatePerson } = useCRM();
    const [deletingNoteIndex, setDeletingNoteIndex] = React.useState<number | null>(null);

    if (!person) return null;

    const age = person.birthday
        ? differenceInDays(new Date(), new Date(person.birthday)) / 365
        : null;

    // Parse notes: Split by double newline followed by a date in brackets [DD/MM/YYYY]
    // or just split by double newline if the format isn't perfect, but let's try to be smart.
    // The AddNoteDialog adds "\n\n[DD/MM/YYYY] ".
    const notes = person.observations
        ? person.observations.split(/\n\n(?=\[\d{2}\/\d{2}\/\d{4}\])/).filter(n => n.trim().length > 0)
        : [];

    const handleDeleteNote = async (index: number) => {
        if (!person) return;

        try {
            setDeletingNoteIndex(index);
            const newNotes = [...notes];
            newNotes.splice(index, 1);
            const newObservations = newNotes.join('\n\n');

            await updatePerson.mutateAsync({
                id: person.id,
                data: {
                    observations: newObservations
                }
            });

            toast.success("Nota eliminada");
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar la nota");
        } finally {
            setDeletingNoteIndex(null);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl bg-[#09090b] border-l border-white/10 text-white p-0">
                <SheetHeader className="sr-only">
                    <SheetTitle>Detalles de Persona</SheetTitle>
                    <SheetDescription>
                        Información detallada del contacto seleccionado.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-full">
                    <div className="p-6 space-y-8">
                        {/* Header / Profile Summary */}
                        <div className="flex flex-col items-center text-center space-y-4 pt-4">
                            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center">
                                <span className="text-3xl font-bold text-white">
                                    {person.first_name[0]}
                                    {person.last_name[0]}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    {person.first_name} {person.last_name}
                                </h2>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    {(Array.isArray(person.contact_type) ? person.contact_type : [person.contact_type]).filter(Boolean).map((role) => (
                                        <Badge key={role} variant="secondary" className="bg-white/10 text-white hover:bg-white/20 capitalize">
                                            {role}
                                        </Badge>
                                    ))}
                                    {person.relationship_status && (
                                        <Badge variant="outline" className="border-white/20 text-white/60">
                                            {person.relationship_status}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2 w-full justify-center">
                                {person.phone && (
                                    <Button
                                        variant="outline"
                                        className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
                                        onClick={() => window.open(`https://wa.me/${person.phone?.replace(/\D/g, '')}`, '_blank')}
                                    >
                                        <MessageCircle className="w-4 h-4 mr-2" />
                                        WhatsApp
                                    </Button>
                                )}
                                <Button
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/10" variant="outline"
                                    onClick={() => {
                                        onOpenChange(false);
                                        onEdit(person);
                                    }}
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar Perfil
                                </Button>
                            </div>
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Health & Status */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
                                <div className="text-xs text-white/40 font-medium mb-1 uppercase tracking-wider">Salud</div>
                                <div className="flex items-center gap-2">
                                    <HealthScoreBadge lastInteractionAt={person.last_interaction_at} />
                                </div>
                            </div>
                            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
                                <div className="text-xs text-white/40 font-medium mb-1 uppercase tracking-wider">Última</div>
                                <div className="text-sm font-medium">
                                    {person.last_interaction_at
                                        ? format(new Date(person.last_interaction_at), "dd/MM/yyyy")
                                        : "N/A"}
                                </div>
                            </div>
                            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
                                <div className="text-xs text-white/40 font-medium mb-1 uppercase tracking-wider">Próxima</div>
                                <div className="text-sm font-medium text-amber-400">
                                    {person.next_action_at
                                        ? format(new Date(person.next_action_at), "dd/MM/yyyy")
                                        : "Pendiente"}
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Phone className="w-4 h-4 text-violet-400" />
                                Información de Contacto
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {person.email && (
                                    <div className="space-y-1">
                                        <span className="text-xs text-white/40">Email</span>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="w-3 h-3 text-white/40" />
                                            {person.email}
                                        </div>
                                    </div>
                                )}
                                {person.phone && (
                                    <div className="space-y-1">
                                        <span className="text-xs text-white/40">Teléfono</span>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="w-3 h-3 text-white/40" />
                                            {person.phone}
                                        </div>
                                    </div>
                                )}
                                {person.preferred_channel && (
                                    <div className="space-y-1">
                                        <span className="text-xs text-white/40">Canal Preferido</span>
                                        <div className="text-sm">{person.preferred_channel}</div>
                                    </div>
                                )}
                                {person.best_contact_time && (
                                    <div className="space-y-1">
                                        <span className="text-xs text-white/40">Mejor Horario</span>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Clock className="w-3 h-3 text-white/40" />
                                                {person.best_contact_time}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Personal & Professional Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <User className="w-4 h-4 text-pink-400" />
                                Perfil Personal y Profesional
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Professional */}
                                <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06] space-y-3">
                                    <div className="flex items-center gap-2 text-white/60 text-xs font-medium uppercase tracking-wider">
                                        <Briefcase className="w-3 h-3" /> Profesional
                                    </div>
                                    <div>
                                        <span className="text-xs text-white/40 block">Ocupación / Empresa</span>
                                        <span className="text-sm font-medium">{person.occupation_company || "No especificado"}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-white/40 block">Nivel de Influencia</span>
                                        <div className="flex gap-1 mt-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-3 h-3 ${star <= (person.influence_level || 0) ? "text-yellow-400 fill-yellow-400" : "text-white/10"}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Personal */}
                                <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06] space-y-3">
                                    <div className="flex items-center gap-2 text-white/60 text-xs font-medium uppercase tracking-wider">
                                        <Heart className="w-3 h-3" /> Personal
                                    </div>
                                    {person.birthday && (
                                        <div>
                                            <span className="text-xs text-white/40 block">Cumpleaños</span>
                                            <span className="text-sm font-medium flex items-center gap-2">
                                                <Calendar className="w-3 h-3 text-white/40" />
                                                {format(new Date(person.birthday), "d 'de' MMMM", { locale: es })}
                                                {age && <span className="text-white/40 text-xs">({Math.floor(age)} años)</span>}
                                            </span>
                                        </div>
                                    )}
                                    {person.family_composition && (
                                        <div>
                                            <span className="text-xs text-white/40 block">Familia</span>
                                            <span className="text-sm">{person.family_composition}</span>
                                        </div>
                                    )}
                                    {person.interests_hobbies && (
                                        <div>
                                            <span className="text-xs text-white/40 block">Intereses / Hobbies</span>
                                            <span className="text-sm">{person.interests_hobbies}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {person.personality_notes && (
                            <div className="bg-violet-500/5 border border-violet-500/20 p-4 rounded-xl">
                                <h4 className="text-sm font-medium text-violet-300 mb-2 flex items-center gap-2">
                                    <Star className="w-3 h-3" /> Notas de Personalidad
                                </h4>
                                <p className="text-sm text-white/80 italic">
                                    "{person.personality_notes}"
                                </p>
                            </div>
                        )}

                        <Separator className="bg-white/10" />

                        {/* Observations / Notes */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-blue-400" />
                                Observaciones y Notas
                            </h3>

                            {notes.length > 0 ? (
                                <div className="space-y-3">
                                    {notes.map((note, index) => {
                                        // Try to extract date
                                        const dateMatch = note.match(/^\[(\d{2}\/\d{2}\/\d{4})\]\s*(.*)/s);
                                        const date = dateMatch ? dateMatch[1] : null;
                                        const content = dateMatch ? dateMatch[2] : note;

                                        return (
                                            <div key={index} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 group relative hover:bg-white/[0.04] transition-colors">
                                                {date && (
                                                    <div className="text-[10px] text-white/30 font-mono mb-2 bg-white/5 inline-block px-1.5 py-0.5 rounded border border-white/5">
                                                        {date}
                                                    </div>
                                                )}
                                                <div className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed font-mono">
                                                    {content}
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-rose-400 hover:bg-rose-500/10"
                                                    onClick={() => handleDeleteNote(index)}
                                                    disabled={deletingNoteIndex === index}
                                                >
                                                    {deletingNoteIndex === index ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center">
                                    <p className="text-white/20 italic text-sm">Sin observaciones registradas</p>
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        {person.tags?.length > 0 && (
                            <div className="pt-2">
                                <div className="flex flex-wrap gap-2">
                                    {person.tags.map(tag => (
                                        <Badge key={tag} className="bg-white/5 hover:bg-white/10 text-white/80 border-white/10">
                                            # {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer Metadata */}
                        <div className="pt-8 text-xs text-white/20 text-center space-y-1">
                            <p>ID: {person.id}</p>
                            <p>Registrado el {format(new Date(person.created_at), "PPP", { locale: es })}</p>
                            {person.source && <p>Fuente: {person.source}</p>}
                        </div>

                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
