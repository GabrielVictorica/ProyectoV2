'use client';

import React, { useState } from 'react';
import { useCRM } from '@/features/crm/hooks/useCRM';
import { PersonsDataTable } from '@/features/crm/components/PersonsDataTable';
import { RelationshipFilters } from '@/features/crm/components/RelationshipFilters';
import { PersonFormDialog } from '@/features/crm/components/PersonFormDialog';
import { Button } from '@/components/ui/button';
import { UserPlus, Briefcase, TrendingUp, Users } from 'lucide-react';
import { Person } from '@/features/clients/types';
import { AddNoteDialog } from '@/features/crm/components/AddNoteDialog';
import { PersonDetailSheet } from '@/features/crm/components/PersonDetailSheet';
import { toast } from 'sonner';
import { usePermissions } from '@/features/auth/hooks/useAuth';
import { useOrganizations } from '@/features/admin/hooks/useAdmin';

export default function RelationshipsPage() {
    const { isGod, isParent, role } = usePermissions();
    const { data: organizations } = useOrganizations({ enabled: isGod });

    const [filters, setFilters] = useState({
        search: '',
        relationshipStatus: [] as string[],
        tags: [] as string[],
        agentId: [role === 'child' ? 'me' : 'all'],
        healthScore: 'all',
        influenceLevel: [] as number[],
        contactType: [] as string[],
        source: [] as string[],
        referredById: [] as string[],
        organizationId: 'all'
    });

    const { persons, agents, availableTags, availableSources, isLoading, refetch } = useCRM({
        search: filters.search,
        relationshipStatus: filters.relationshipStatus,
        tags: filters.tags,
        healthScore: filters.healthScore,
        agentId: filters.agentId,
        influenceLevel: filters.influenceLevel,
        contactType: filters.contactType,
        source: filters.source,
        referredById: filters.referredById,
        organizationId: filters.organizationId
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

    const handleEdit = (person: Person) => {
        setSelectedPerson(person);
        setIsDialogOpen(true);
    };

    const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
    const [personToAddNote, setPersonToAddNote] = useState<Person | null>(null);

    const handleAddNote = (person: Person) => {
        setPersonToAddNote(person);
        setIsAddNoteOpen(true);
    };

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [personToView, setPersonToView] = useState<Person | null>(null);

    const handleView = (person: Person) => {
        setPersonToView(person);
        setIsDetailOpen(true);
    };

    const handleCreate = () => {
        setSelectedPerson(null);
        setIsDialogOpen(true);
    };



    // Estadísticas rápidas (Mockup o derivado de los datos cargados)
    const stats = [
        { label: 'Relaciones Totales', value: persons.length, icon: Users, color: 'text-blue-400' },
        {
            label: 'En Riesgo (Semáforo)', value: persons.filter(p => {
                if (!p.last_interaction_at) return true;
                const days = Math.floor((new Date().getTime() - new Date(p.last_interaction_at).getTime()) / (1000 * 3600 * 24));
                return days > 15;
            }).length, icon: TrendingUp, color: 'text-amber-400'
        },
        {
            label: 'Nuevas este Mes',
            value: persons.filter(p => {
                const created = new Date(p.created_at);
                const now = new Date();
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
            }).length,
            icon: UserPlus,
            color: 'text-emerald-400'
        },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Relaciones</h1>
                    <p className="text-white/40 mt-1">Construyendo capital social para tu negocio inmobiliario.</p>
                </div>
                <Button
                    onClick={handleCreate}
                    className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-11 px-6 shadow-lg shadow-violet-500/20 gap-2 border-none"
                >
                    <UserPlus className="w-5 h-5" />
                    Registrar Persona
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-[#09090b] border border-white/[0.06] rounded-2xl p-6 flex items-center gap-5 hover:border-white/10 transition-all group">
                        <div className={`p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters & Table Section */}
            <div className="space-y-4">
                <RelationshipFilters
                    filters={filters}
                    setFilters={setFilters}
                    agents={agents}
                    availableTags={availableTags}
                    availableSources={availableSources}
                    organizations={organizations || []}
                    isGod={isGod}
                    isParent={isParent}
                    role={role || undefined}
                />
                <PersonsDataTable
                    persons={persons}
                    isLoading={isLoading}
                    onEdit={handleEdit}
                    onAddNote={handleAddNote}
                    onView={handleView}
                />
            </div>

            <PersonFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                person={selectedPerson}
                onSuccess={() => refetch()}
                agents={agents}
            />


            <AddNoteDialog
                open={isAddNoteOpen}
                onOpenChange={setIsAddNoteOpen}
                person={personToAddNote}
                onSuccess={() => refetch()}
            />

            <PersonDetailSheet
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                person={personToView}
                onEdit={handleEdit}
            />
        </div>
    );
}
