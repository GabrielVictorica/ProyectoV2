import { Input } from "@/components/ui/input";
import { Search, X, SlidersHorizontal, Filter, Building2, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdvancedFilterSheet } from "./filters/AdvancedFilterSheet";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface RelationshipFiltersProps {
    filters: {
        search: string;
        relationshipStatus: string[];
        tags: string[];
        agentId: string[];
        healthScore: string;
        influenceLevel: number[];
        contactType: string[];
        source: string[];
        organizationId: string;
    };
    setFilters: (filters: any) => void;
    agents?: { id: string, first_name: string, last_name: string, organization_id?: string }[];
    availableTags?: string[];
    availableSources?: string[];
    organizations?: { id: string, name: string }[];
    isGod?: boolean;
    isParent?: boolean;
    role?: string;
}

export function RelationshipFilters({
    filters,
    setFilters,
    agents = [],
    availableTags = [],
    availableSources = [],
    organizations = [],
    isGod = false,
    isParent = false,
    role
}: RelationshipFiltersProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Dynamic filtering of agents for the selector
    const filteredAgentsForSelector = useMemo(() => {
        if (!isGod || filters.organizationId === 'all') return agents;
        return agents.filter(a => a.organization_id === filters.organizationId);
    }, [isGod, filters.organizationId, agents]);

    // Helper to check if any filter is active (excluding search)
    const isFiltered =
        filters.relationshipStatus.length > 0 ||
        filters.tags.length > 0 ||
        (filters.agentId.length > 0 && !filters.agentId.includes('all') && !filters.agentId.includes('me')) ||
        filters.healthScore !== 'all' ||
        filters.influenceLevel.length > 0 ||
        filters.contactType.length > 0 ||
        filters.source.length > 0 ||
        filters.organizationId !== 'all';

    const activeFilterCount =
        filters.relationshipStatus.length +
        filters.tags.length +
        (filters.agentId.length > 0 && !filters.agentId.includes('all') && !filters.agentId.includes('me') ? 1 : 0) +
        (filters.healthScore !== 'all' ? 1 : 0) +
        filters.influenceLevel.length +
        filters.contactType.length +
        filters.source.length +
        (filters.organizationId !== 'all' ? 1 : 0);

    const clearFilter = (key: string, value: any) => {
        if (Array.isArray((filters as any)[key])) {
            const current = (filters as any)[key] as any[];
            setFilters({ ...filters, [key]: current.filter(item => item !== value) });
        } else {
            const defaultValue = key === 'organizationId' ? 'all' : (key === 'agentId' ? (role === 'child' ? ['me'] : ['all']) : 'all');
            setFilters({ ...filters, [key]: defaultValue });
        }
    };

    return (
        <div className="space-y-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* Search Bar */}
                <div className="relative w-full lg:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input
                        placeholder="Buscar por nombre, email, teléfono..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="pl-10 bg-[#09090b] border-white/[0.08] text-white rounded-xl h-10 focus:border-violet-500/50 transition-all text-sm"
                    />
                </div>

                {/* Filter Trigger Button */}
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    {/* Organization Filter (God Only) */}
                    {isGod && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <Building2 className="w-3.5 h-3.5 text-white/30" />
                            <select
                                value={filters.organizationId}
                                onChange={(e) => {
                                    setFilters({
                                        ...filters,
                                        organizationId: e.target.value,
                                        agentId: ['all'] // Reset agent when changing org
                                    });
                                }}
                                className="bg-[#09090b] border border-white/[0.08] text-[11px] text-white px-2 py-1.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500/50 max-w-[150px] transition-all hover:border-white/20"
                            >
                                <option value="all">Todas las Org.</option>
                                {organizations.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Agent Filter (God and Parent) */}
                    {(isGod || isParent) && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <Users className="w-3.5 h-3.5 text-white/30" />
                            <select
                                value={filters.agentId[0] || 'all'}
                                onChange={(e) => {
                                    setFilters({
                                        ...filters,
                                        agentId: [e.target.value]
                                    });
                                }}
                                className="bg-[#09090b] border border-white/[0.08] text-[11px] text-white px-2 py-1.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500/50 max-w-[150px] transition-all hover:border-white/20"
                            >
                                <option value="all">Todos los Agentes</option>
                                {filteredAgentsForSelector.map(agent => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.first_name} {agent.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        onClick={() => setIsSheetOpen(true)}
                        className="h-10 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white gap-2 ml-auto lg:ml-0"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filtros
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="bg-violet-600 text-white hover:bg-violet-500 h-5 px-1.5 min-w-[20px] justify-center">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                </div>

                <AdvancedFilterSheet
                    open={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                    filters={filters}
                    setFilters={setFilters}
                    agents={agents}
                    availableTags={availableTags}
                    availableSources={availableSources}
                />
            </div>

            {/* Active Filters Chips (Horizontal Scroll) */}
            {isFiltered && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {filters.relationshipStatus.map(status => (
                        <Badge key={status} variant="secondary" className="bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap gap-1 pr-1">
                            {status}
                            <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => clearFilter('relationshipStatus', status)} />
                        </Badge>
                    ))}
                    {filters.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap gap-1 pr-1">
                            #{tag}
                            <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => clearFilter('tags', tag)} />
                        </Badge>
                    ))}
                    {filters.influenceLevel.map(level => (
                        <Badge key={level} variant="secondary" className="bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap gap-1 pr-1">
                            {level} ⭐
                            <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => clearFilter('influenceLevel', level)} />
                        </Badge>
                    ))}
                    {filters.contactType.map(type => (
                        <Badge key={type} variant="secondary" className="bg-white/5 text-white/70 border border-white/10 whitespace-nowrap gap-1 pr-1">
                            {type}
                            <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => clearFilter('contactType', type)} />
                        </Badge>
                    ))}
                    {filters.source.map(source => (
                        <Badge key={source} variant="secondary" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap gap-1 pr-1">
                            {source}
                            <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => clearFilter('source', source)} />
                        </Badge>
                    ))}
                    {filters.healthScore !== 'all' && (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-400 border border-red-500/20 whitespace-nowrap gap-1 pr-1">
                            Salud: {filters.healthScore}
                            <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => clearFilter('healthScore', 'all')} />
                        </Badge>
                    )}
                    {filters.organizationId !== 'all' && (
                        <Badge variant="secondary" className="bg-white/5 text-white/70 border border-white/10 whitespace-nowrap gap-1 pr-1">
                            Org: {organizations.find(o => o.id === filters.organizationId)?.name || '...'}
                            <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => clearFilter('organizationId', 'all')} />
                        </Badge>
                    )}
                    {filters.agentId.length > 0 && !filters.agentId.includes('all') && !filters.agentId.includes('me') && (
                        <Badge variant="secondary" className="bg-white/5 text-white/70 border border-white/10 whitespace-nowrap gap-1 pr-1">
                            Agente: {agents.find(a => a.id === filters.agentId[0])?.first_name || '...'}
                            <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => clearFilter('agentId', 'all')} />
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
}
