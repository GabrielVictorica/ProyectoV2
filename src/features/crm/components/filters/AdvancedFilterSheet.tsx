import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    X, Filter, RotateCcw, Star, Users, Briefcase, MapPin, Tag, Phone,
    Handshake, Search, FileSearch, BarChart3, Home, CheckCircle2, PenTool, UserCheck
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { PersonSelector } from '@/features/clients/components/shared/PersonSelector';

// Reusing options from previous file or defining them here
const STATUS_OPTIONS = [
    { label: 'Contacto Telefónico', value: 'contacto_telefonico', icon: Phone },
    { label: 'Reunión Verde', value: 'reunion_verde', icon: Handshake },
    { label: 'Pre-Listing', value: 'pre_listing', icon: FileSearch },
    { label: 'Pre-Buying', value: 'pre_buying', icon: Search },
    { label: 'ACM', value: 'acm', icon: BarChart3 },
    { label: 'Captación', value: 'captacion', icon: Home },
    { label: 'Visita', value: 'visita', icon: MapPin },
    { label: 'Reserva', value: 'reserva', icon: CheckCircle2 },
    { label: 'Cierre', value: 'cierre', icon: PenTool },
    { label: 'Referido', value: 'referido', icon: Users },
];

const CONTACT_TYPE_OPTIONS = [
    { label: 'Comprador', value: 'comprador' },
    { label: 'Vendedor', value: 'vendedor' },
    { label: 'Inquilino', value: 'inquilino' },
    { label: 'Colega', value: 'colega' },
    { label: 'Referente', value: 'referente' },
    { label: 'Familiar', value: 'familiar' },
    { label: 'Amigo', value: 'amigo' },
    { label: 'Conocido', value: 'conocido' },
    { label: 'Socio', value: 'socio' },
    { label: 'Otro', value: 'otro' },
];

const HEALTH_OPTIONS = [
    { label: 'Fuerte (Activo)', value: 'fuerte' },
    { label: 'En Riesgo (>15 días)', value: 'riesgo' },
    { label: 'Crítico (>45 días)', value: 'critico' },
    { label: 'Sin Contacto', value: 'sin_contacto' },
];

interface AdvancedFilterSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filters: {
        search: string;
        relationshipStatus: string[];
        tags: string[];
        agentId: string[];
        healthScore: string;
        influenceLevel: number[];
        contactType: string[];
        source: string[];
        referredById: string[];
        organizationId?: string;
    };
    setFilters: (filters: any) => void;
    agents?: { id: string, first_name: string, last_name: string }[];
    availableTags?: string[];
    availableSources?: string[];
}

export function AdvancedFilterSheet({
    open,
    onOpenChange,
    filters,
    setFilters,
    agents = [],
    availableTags = [],
    availableSources = []
}: AdvancedFilterSheetProps) {

    // Helper to handle array toggles
    const toggleFilter = (key: string, value: any) => {
        const current = (filters as any)[key] || [];
        const updated = current.includes(value)
            ? current.filter((item: any) => item !== value)
            : [...current, value];
        setFilters({ ...filters, [key]: updated });
    };

    const resetFilters = () => {
        setFilters({
            search: filters.search, // Keep search
            relationshipStatus: [],
            tags: [],
            agentId: ['me'], // Reset to 'me' default? Or empty? let's stick to current logic
            healthScore: 'all',
            influenceLevel: [],
            contactType: [],
            source: [],
            referredById: [],
            organizationId: filters.organizationId
        });
    };

    const activeCount =
        filters.relationshipStatus.length +
        filters.tags.length +
        (filters.agentId.length > 0 && !filters.agentId.includes('me') ? 1 : 0) + // only count if customized
        (filters.healthScore !== 'all' ? 1 : 0) +
        filters.influenceLevel.length +
        filters.contactType.length +
        filters.source.length +
        filters.referredById.length;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:w-[400px] border-l border-white/10 bg-[#09090b] shadow-[-20px_0_50px_-12px_rgba(139,92,246,0.15)] text-white p-0 flex flex-col">
                <SheetHeader className="p-6 pb-2 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filtros
                            {activeCount > 0 && (
                                <Badge variant="secondary" className="bg-violet-600 text-white hover:bg-violet-500">
                                    {activeCount}
                                </Badge>
                            )}
                        </SheetTitle>
                        {activeCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetFilters}
                                className="text-xs text-white/50 hover:text-white h-auto p-0 hover:bg-transparent"
                            >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Limpiar
                            </Button>
                        )}
                    </div>
                    <SheetDescription className="text-white/40 text-xs">
                        Refina tu lista de contactos con múltiples criterios.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6 py-6">
                    <div className="space-y-8 pb-12">

                        {/* Status */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Estado de Relación</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {STATUS_OPTIONS.map((option) => {
                                    const isSelected = filters.relationshipStatus.includes(option.value);
                                    return (
                                        <div
                                            key={option.value}
                                            onClick={() => toggleFilter('relationshipStatus', option.value)}
                                            className={cn(
                                                "cursor-pointer rounded-lg border p-3 flex flex-col items-center justify-center gap-2 transition-all hover:bg-white/5",
                                                isSelected
                                                    ? "bg-violet-500/10 border-violet-500/50 text-white"
                                                    : "bg-transparent border-white/10 text-white/50"
                                            )}
                                        >
                                            <option.icon className={cn("w-5 h-5", isSelected ? "text-violet-400" : "text-white/30")} />
                                            <span className="text-xs font-medium text-center">{option.label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Influence Level */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Nivel de Influencia</Label>
                            <div className="grid grid-cols-4 gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
                                {[
                                    { value: 4, label: 'A', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
                                    { value: 3, label: 'B', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
                                    { value: 2, label: 'C', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
                                    { value: 1, label: 'D', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
                                ].map((cat) => {
                                    const isSelected = filters.influenceLevel.includes(cat.value);
                                    return (
                                        <button
                                            key={cat.value}
                                            onClick={() => toggleFilter('influenceLevel', cat.value)}
                                            className={cn(
                                                "h-12 rounded-lg border flex items-center justify-center transition-all font-black text-lg",
                                                isSelected
                                                    ? `${cat.bg} ${cat.border} ${cat.color} scale-105 shadow-lg`
                                                    : "bg-transparent border-transparent text-white/20 hover:text-white/40 hover:bg-white/5"
                                            )}
                                        >
                                            {cat.label}
                                        </button>
                                    )
                                })}
                            </div>
                            <p className="text-[10px] text-white/30 text-center uppercase tracking-tighter">Filtra por categoría de influencia</p>
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Contact Type */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Tipo de Contacto</Label>
                            <div className="flex flex-wrap gap-2">
                                {CONTACT_TYPE_OPTIONS.map((option) => {
                                    const isSelected = filters.contactType.includes(option.value);
                                    return (
                                        <Badge
                                            key={option.value}
                                            variant="outline"
                                            onClick={() => toggleFilter('contactType', option.value)}
                                            className={cn(
                                                "cursor-pointer border-white/10 hover:bg-white/5 px-3 py-1.5 transition-all",
                                                isSelected && "bg-white text-black border-white hover:bg-white/90"
                                            )}
                                        >
                                            {option.label}
                                        </Badge>
                                    )
                                })}
                            </div>
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Tags */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                                <Tag className="w-3 h-3" /> Etiquetas
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.length === 0 ? (
                                    <p className="text-xs text-white/30 italic">No hay etiquetas disponibles</p>
                                ) : (
                                    availableTags.map((tag) => {
                                        const isSelected = filters.tags.includes(tag);
                                        return (
                                            <Badge
                                                key={tag}
                                                variant="secondary"
                                                onClick={() => toggleFilter('tags', tag)}
                                                className={cn(
                                                    "cursor-pointer transition-all",
                                                    isSelected
                                                        ? "bg-violet-600 text-white hover:bg-violet-500"
                                                        : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                                                )}
                                            >
                                                {tag}
                                            </Badge>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Sources & Health (Compact) */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Origen</Label>
                                <Select
                                    value={filters.source[0] || ""}
                                    onValueChange={(val) => {
                                        if (val && val !== 'all') {
                                            if (!filters.source.includes(val)) toggleFilter('source', val);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                                        <SelectValue placeholder="Seleccionar origen..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSources.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {/* Active Sources Chips */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {filters.source.map(s => (
                                        <Badge key={s} variant="outline" className="border-white/20 text-white/80 gap-1 pl-2">
                                            {s}
                                            <X
                                                className="w-3 h-3 cursor-pointer hover:text-white"
                                                onClick={() => toggleFilter('source', s)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                                    <UserCheck className="w-3 h-3 text-emerald-400" /> Referido Por
                                </Label>
                                <PersonSelector
                                    value={null}
                                    onChange={(id) => {
                                        if (id && !filters.referredById.includes(id)) {
                                            toggleFilter('referredById', id);
                                        }
                                    }}
                                    placeholder="Vincular referidor..."
                                    className="bg-white/5 border-white/10"
                                />
                                {/* Active Referrals Chips */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {filters.referredById.map(id => (
                                        <Badge key={id} variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-300 gap-1 pl-2">
                                            <span className="text-[10px] opacity-70">Referente ID:</span> {id.slice(0, 5)}...
                                            <X
                                                className="w-3 h-3 cursor-pointer hover:text-white"
                                                onClick={() => toggleFilter('referredById', id)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-[10px] text-white/30 italic">Filtra contactos traídos por una persona específica.</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Estado de Salud</Label>
                                <Select
                                    value={filters.healthScore}
                                    onValueChange={(val) => setFilters({ ...filters, healthScore: val })}
                                >
                                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {HEALTH_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                    </div>
                </ScrollArea>

                <SheetFooter className="p-6 border-t border-white/10 bg-[#09090b]">
                    <SheetClose asChild>
                        <Button className="w-full bg-white text-black hover:bg-white/90 rounded-xl h-12 text-sm font-bold">
                            Ver {activeCount > 0 ? 'Filtros Aplicados' : 'Resultados'}
                        </Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
