'use client';

import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
    SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    X, Filter, RotateCcw,
    Home, Building, Building2, Store, Briefcase, Map, Car, Warehouse, Tractor, Hotel,
    DollarSign, Banknote, CreditCard, RefreshCw, Blend, HardHat
} from 'lucide-react';
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
    { label: 'Activa', value: 'active', color: 'text-emerald-400' },
    { label: 'Inactiva', value: 'inactive', color: 'text-white/50' },
    { label: 'Cerrada', value: 'closed', color: 'text-blue-400' },
    { label: 'Archivada', value: 'archived', color: 'text-white/30' },
];

const PAYMENT_OPTIONS = [
    { label: 'Efectivo', value: 'cash', icon: Banknote },
    { label: 'Permuta', value: 'swap', icon: RefreshCw },
    { label: 'Financiación', value: 'loan', icon: CreditCard },
    { label: 'Ef.+Perm.', value: 'mix', icon: Blend },
];

const BEDROOM_OPTIONS = [
    { label: 'Monoamb', value: '0' },
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4+', value: '4+' },
];

function getIconForPropertyType(name: string) {
    const n = name.toLowerCase();
    if (n.includes('casa')) return Home;
    if (n.includes('departamento')) return Building;
    if (n.includes('ph')) return Building2;
    if (n.includes('local')) return Store;
    if (n.includes('oficina')) return Briefcase;
    if (n.includes('terreno')) return Map;
    if (n.includes('cochera')) return Car;
    if (n.includes('depósito') || n.includes('galpón')) return Warehouse;
    if (n.includes('campo')) return Tractor;
    if (n.includes('hotel')) return Hotel;
    if (n.includes('en pozo') || n.includes('pozo')) return HardHat;
    return Building;
}

export interface SearchFilters {
    status: string[];
    propertyTypes: string[];
    paymentMethods: string[];
    budgetMin: number | null;
    budgetMax: number | null;
    bedrooms: string[];
    tags: string[];
}

export const defaultSearchFilters: SearchFilters = {
    status: [],
    propertyTypes: [],
    paymentMethods: [],
    budgetMin: null,
    budgetMax: null,
    bedrooms: [],
    tags: [],
};

interface SearchFilterSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filters: SearchFilters;
    setFilters: (filters: SearchFilters) => void;
    propertyTypes?: { id: string; name: string }[];
    availableTags?: string[];
}

export function SearchFilterSheet({
    open,
    onOpenChange,
    filters,
    setFilters,
    propertyTypes = [],
    availableTags = [],
}: SearchFilterSheetProps) {

    const toggleFilter = (key: keyof SearchFilters, value: any) => {
        const current = (filters[key] as any[]) || [];
        const updated = current.includes(value)
            ? current.filter((item: any) => item !== value)
            : [...current, value];
        setFilters({ ...filters, [key]: updated });
    };

    const resetFilters = () => {
        setFilters({ ...defaultSearchFilters });
    };

    const activeCount =
        filters.status.length +
        filters.propertyTypes.length +
        filters.paymentMethods.length +
        (filters.budgetMin ? 1 : 0) +
        (filters.budgetMax ? 1 : 0) +
        filters.bedrooms.length +
        filters.tags.length;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:w-[400px] border-l border-white/10 bg-[#09090b] text-white p-0 flex flex-col">
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
                        Filtra búsquedas por tipo de propiedad, presupuesto y más.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6 py-6">
                    <div className="space-y-8 pb-12">

                        {/* Estado */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Estado</Label>
                            <div className="flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map((option) => {
                                    const isSelected = filters.status.includes(option.value);
                                    return (
                                        <Badge
                                            key={option.value}
                                            variant="outline"
                                            onClick={() => toggleFilter('status', option.value)}
                                            className={cn(
                                                "cursor-pointer border-white/10 hover:bg-white/5 px-3 py-1.5 transition-all",
                                                isSelected && "bg-white text-black border-white hover:bg-white/90"
                                            )}
                                        >
                                            <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", isSelected ? "bg-black" :
                                                option.value === 'active' ? 'bg-emerald-400' :
                                                    option.value === 'closed' ? 'bg-blue-400' : 'bg-white/30'
                                            )} />
                                            {option.label}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Tipo de Propiedad */}
                        {propertyTypes.length > 0 && (
                            <>
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Tipo de Propiedad</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {propertyTypes.map((pt) => {
                                            const isSelected = filters.propertyTypes.includes(pt.name);
                                            const Icon = getIconForPropertyType(pt.name);
                                            return (
                                                <div
                                                    key={pt.id}
                                                    onClick={() => toggleFilter('propertyTypes', pt.name)}
                                                    className={cn(
                                                        "cursor-pointer rounded-lg border p-3 flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-white/5",
                                                        isSelected
                                                            ? "bg-violet-500/10 border-violet-500/50 text-white"
                                                            : "bg-transparent border-white/10 text-white/50"
                                                    )}
                                                >
                                                    <Icon className={cn("w-5 h-5", isSelected ? "text-violet-400" : "text-white/30")} />
                                                    <span className="text-[10px] font-medium text-center leading-tight">{pt.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <Separator className="bg-white/10" />
                            </>
                        )}

                        {/* Forma de Pago */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Forma de Pago</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {PAYMENT_OPTIONS.map((option) => {
                                    const isSelected = filters.paymentMethods.includes(option.value);
                                    return (
                                        <div
                                            key={option.value}
                                            onClick={() => toggleFilter('paymentMethods', option.value)}
                                            className={cn(
                                                "cursor-pointer rounded-lg border p-3 flex items-center gap-2 transition-all hover:bg-white/5",
                                                isSelected
                                                    ? "bg-violet-500/10 border-violet-500/50 text-white"
                                                    : "bg-transparent border-white/10 text-white/50"
                                            )}
                                        >
                                            <option.icon className={cn("w-4 h-4", isSelected ? "text-violet-400" : "text-white/30")} />
                                            <span className="text-xs font-medium">{option.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Presupuesto */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                                <DollarSign className="w-3 h-3" /> Presupuesto (USD)
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-white/40">Mínimo</span>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={filters.budgetMin ?? ''}
                                        onChange={(e) => setFilters({
                                            ...filters,
                                            budgetMin: e.target.value ? parseInt(e.target.value) : null
                                        })}
                                        className="bg-white/5 border-white/10 text-white h-10"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-white/40">Máximo</span>
                                    <Input
                                        type="number"
                                        placeholder="Sin límite"
                                        value={filters.budgetMax ?? ''}
                                        onChange={(e) => setFilters({
                                            ...filters,
                                            budgetMax: e.target.value ? parseInt(e.target.value) : null
                                        })}
                                        className="bg-white/5 border-white/10 text-white h-10"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Dormitorios */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Dormitorios</Label>
                            <div className="flex items-center gap-2">
                                {BEDROOM_OPTIONS.map((option) => {
                                    const isSelected = filters.bedrooms.includes(option.value);
                                    return (
                                        <Badge
                                            key={option.value}
                                            variant="outline"
                                            onClick={() => toggleFilter('bedrooms', option.value)}
                                            className={cn(
                                                "cursor-pointer border-white/10 hover:bg-white/5 px-3 py-2 transition-all text-sm",
                                                isSelected && "bg-white text-black border-white hover:bg-white/90"
                                            )}
                                        >
                                            {option.label}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>

                        {availableTags && availableTags.length > 0 && (
                            <>
                                <Separator className="bg-white/10" />
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Etiquetas de Búsqueda</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableTags.map((tag) => {
                                            const isSelected = filters.tags.includes(tag);
                                            return (
                                                <Badge
                                                    key={tag}
                                                    variant="outline"
                                                    onClick={() => toggleFilter('tags', tag)}
                                                    className={cn(
                                                        "cursor-pointer border-white/10 hover:bg-white/5 px-3 py-1.5 transition-all",
                                                        isSelected && "bg-white text-black border-white hover:bg-white/90"
                                                    )}
                                                >
                                                    {tag}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                    </div>
                </ScrollArea>

                <SheetFooter className="p-6 border-t border-white/10 bg-[#09090b]">
                    <SheetClose asChild>
                        <Button className="w-full bg-white text-black hover:bg-white/90 rounded-xl h-12 text-sm font-bold">
                            Ver {activeCount > 0 ? 'Resultados Filtrados' : 'Resultados'}
                        </Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
