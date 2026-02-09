'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useClients } from '@/features/clients/hooks/useClients';
import { useWeeklyActivities, WeeklyActivity } from '../hooks/useWeeklyActivities';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Trash2, Plus, ArrowLeft, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date: string;
    type: string;
    label: string;
    existingActivities: WeeklyActivity[];
    agentId?: string;
    initialEditId?: string | null;
}

export function ActivityDialog({
    open,
    onOpenChange,
    date,
    type,
    label,
    existingActivities,
    agentId,
    initialEditId
}: ActivityDialogProps) {
    const { data: auth } = useAuth();
    const { data: clientsData, isLoading: isLoadingClients } = useClients();
    const clients = clientsData?.clients || [];
    console.log('ActivityDialog clients:', clients.length, 'Loading:', isLoadingClients); // Debug log
    const dateObj = new Date(date + 'T12:00:00');
    const isValidDate = !isNaN(dateObj.getTime());
    const { createActivity, updateActivity, deleteActivity } = useWeeklyActivities(
        isValidDate ? dateObj : new Date(),
        agentId
    );

    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingActivity, setEditingActivity] = useState<WeeklyActivity | null>(null);

    // Form state
    const [clientId, setClientId] = useState<string>('none');
    const [search, setSearch] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [notes, setNotes] = useState('');

    // Reset view when opening
    useEffect(() => {
        if (open) {
            if (initialEditId) {
                const act = existingActivities.find(a => a.id === initialEditId);
                if (act) {
                    handleEdit(act);
                    return;
                }
            }

            if (existingActivities.length === 0) {
                setView('form');
                setEditingActivity(null);
                resetForm();
            } else {
                setView('list');
            }
        }
    }, [open, existingActivities, initialEditId]);

    const resetForm = () => {
        setClientId('none');
        setSearch('');
        setNotes('');
    };

    const handleEdit = (act: WeeklyActivity) => {
        setEditingActivity(act);
        setClientId(act.client_id || 'none');

        const rawNotes = act.notes || '';
        if (!act.client_id && rawNotes.includes(' || ')) {
            const [name, ...rest] = rawNotes.split(' || ');
            setSearch(name);
            setNotes(rest.join(' || '));
        } else {
            setSearch('');
            setNotes(rawNotes);
        }

        setView('form');
    };

    const handleNew = () => {
        setEditingActivity(null);
        resetForm();
        setView('form');
    };

    const handleSave = async () => {
        if (!auth?.profile?.organization_id || !auth?.profile?.id) return;

        const finalNotes = clientId === 'none' && search.trim()
            ? `${search.trim()} || ${notes || ''}`
            : notes || null;

        const data = {
            organization_id: auth.profile.organization_id,
            agent_id: agentId || auth.profile.id,
            type,
            date,
            notes: finalNotes,
            client_id: clientId === 'none' ? null : clientId,
            status: 'completed'
        };

        if (editingActivity) {
            await updateActivity.mutateAsync({ id: editingActivity.id, data });
        } else {
            await createActivity.mutateAsync(data as any);
        }

        if (existingActivities.length + (editingActivity ? 0 : 1) > 0) {
            setView('list');
        } else {
            onOpenChange(false);
        }
    };

    const handleDelete = async (id: string) => {
        await deleteActivity.mutateAsync(id);
        if (existingActivities.length <= 1) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#09090b] border-white/[0.08] text-white sm:max-w-md z-[9999]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {view === 'form' && existingActivities.length > 0 && (
                            <Button variant="ghost" size="icon" onClick={() => setView('list')} className="h-6 w-6 -ml-2 rounded-full">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <span>{label}</span>
                        <span className="text-white/40 font-normal">
                            — {isValidDate ? format(dateObj, 'EEEE d', { locale: es }) : ''}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                {view === 'list' ? (
                    <div className="space-y-4 py-2">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {existingActivities.map((act) => {
                                const client = clients?.find(c => c.id === act.client_id);

                                // Robust splitting logic
                                const notes = act.notes || '';
                                const hasSeparator = notes.includes(' || ');

                                let contactName = '';
                                let activityNotes = '';

                                if (client) {
                                    contactName = `${(client as any).first_name} ${(client as any).last_name}`;
                                    activityNotes = notes;
                                } else if (hasSeparator) {
                                    const parts = notes.split(' || ');
                                    contactName = parts[0]?.trim() || '';
                                    activityNotes = parts.slice(1).join(' || ').trim();
                                } else {
                                    contactName = '';
                                    activityNotes = notes;
                                }

                                return (
                                    <div key={act.id} className="p-4 glass bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-start justify-between group gap-4">
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEdit(act)}>
                                            {(client || contactName) && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                                                        {client ? 'Cliente' : 'Contacto'}
                                                    </span>
                                                    {contactName && (
                                                        <p className="font-bold text-white text-sm">
                                                            {contactName}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {activityNotes && (
                                                <p className="text-xs text-white/60 italic leading-relaxed bg-white/[0.01] p-2 rounded-lg border border-white/[0.03]">
                                                    {activityNotes}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(act)}
                                                className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(act.id)}
                                                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <Button onClick={handleNew} variant="outline" className="w-full gap-2 border-white/[0.08] hover:bg-white/[0.04] rounded-xl">
                            <Plus className="h-4 w-4" />
                            Agregar otra
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Cliente</Label>
                            {clientId !== 'none' && clientId !== null ? (
                                <div className="flex items-center justify-between p-3 glass bg-violet-500/10 border border-violet-500/20 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-xs">
                                            {(clients.find(c => c.id === clientId) as any)?.first_name?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">
                                                {(clients.find(c => c.id === clientId) as any)?.first_name} {(clients.find(c => c.id === clientId) as any)?.last_name}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setClientId('none')}
                                        className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 rounded-lg"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2 relative">
                                    <Input
                                        placeholder="Buscar cliente por nombre..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onFocus={() => setShowResults(true)}
                                        onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                        className="bg-white/[0.02] border-white/[0.08] rounded-xl"
                                    />
                                    {search.length > 0 && showResults && (
                                        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1a1e] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                                                {isLoadingClients ? (
                                                    <div className="p-3 text-sm text-white/40 text-center">Cargando...</div>
                                                ) : clients.filter(c => {
                                                    const firstName = (c as any).first_name || '';
                                                    const lastName = (c as any).last_name || '';
                                                    return firstName.toLowerCase().includes(search.toLowerCase()) ||
                                                        lastName.toLowerCase().includes(search.toLowerCase());
                                                }).length === 0 ? (
                                                    <div className="p-3 text-sm text-white/40 text-center">No se encontraron clientes</div>
                                                ) : (
                                                    clients.filter(c => {
                                                        const firstName = (c as any).first_name || '';
                                                        const lastName = (c as any).last_name || '';
                                                        return firstName.toLowerCase().includes(search.toLowerCase()) ||
                                                            lastName.toLowerCase().includes(search.toLowerCase());
                                                    }).map(client => (
                                                        <button
                                                            key={client.id}
                                                            onClick={() => {
                                                                setClientId(client.id);
                                                                setSearch('');
                                                            }}
                                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.08] transition-colors flex items-center gap-2"
                                                        >
                                                            <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/60">
                                                                {(client as any).first_name[0]}
                                                            </div>
                                                            <span className="text-sm text-white/80">
                                                                {(client as any).first_name} {(client as any).last_name}
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>




                        <div className="space-y-2">
                            <Label>Notas</Label>
                            <Textarea
                                placeholder="Describí la actividad o agregá notas..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="bg-white/[0.02] border-white/[0.08] rounded-xl min-h-[100px]"
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {view === 'form' && (
                        <Button
                            onClick={handleSave}
                            disabled={createActivity.isPending || updateActivity.isPending}
                            className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-lg shadow-violet-500/20"
                        >
                            {editingActivity ? 'Guardar Cambios' : 'Registrar Actividad'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
