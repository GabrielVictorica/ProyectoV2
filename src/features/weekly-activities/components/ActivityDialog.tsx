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
import { updatePersonStatusAction } from '../actions/activityActions';
import { toast } from 'sonner';
import { getStatusLabel } from '@/features/crm/constants/relationshipStatuses';
import { Trash2, Plus, ArrowLeft, Edit2, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PersonSelector } from '@/features/clients/components/shared/PersonSelector';
import { Person } from '@/features/clients/types';

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
    const { createActivity, updateActivity, deleteActivity, weeklyData } = useWeeklyActivities(
        isValidDate ? dateObj : new Date(),
        agentId
    );

    // Obtener actividades frescas del mapa de datos si están disponibles
    const dateStr = date;
    const freshActivities = weeklyData?.[dateStr]?.activities.filter(a => a.type === type) || existingActivities;

    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingActivity, setEditingActivity] = useState<WeeklyActivity | null>(null);

    // Form state
    const [personId, setPersonId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');

    // Reset view when opening
    useEffect(() => {
        if (open) {
            if (initialEditId) {
                const act = freshActivities.find(a => a.id === initialEditId);
                if (act) {
                    handleEdit(act);
                    return;
                }
            }

            if (freshActivities.length === 0) {
                setView('form');
                setEditingActivity(null);
                resetForm();
            } else {
                setView('list');
            }
        }
    }, [open, initialEditId]); // Removed freshActivities to avoid kicking user out on background updates

    const resetForm = () => {
        setPersonId(null);
        setNotes('');
    };

    const handleEdit = (act: WeeklyActivity) => {
        setEditingActivity(act);
        setPersonId(act.person_id || null);

        const rawNotes = act.notes || '';
        setNotes(rawNotes);

        setView('form');
    };

    const handleNew = () => {
        setEditingActivity(null);
        resetForm();
        setView('form');
    };

    const handleSave = async () => {
        if (!auth?.profile?.organization_id || !auth?.profile?.id) return;

        const data = {
            organization_id: auth.profile.organization_id,
            agent_id: agentId || auth.profile.id,
            type,
            date,
            notes: notes || null,
            person_id: personId,
            client_id: personId ? null : (editingActivity?.client_id || null), // Clear legacy client if we scale to person
            status: 'completed'
        };

        if (editingActivity) {
            await updateActivity.mutateAsync({ id: editingActivity.id, data });
        } else {
            await createActivity.mutateAsync(data as any);
        }

        // Preguntar si desea actualizar el estado en el CRM
        if (personId) {
            const statusLabel = getStatusLabel(type);
            toast(`¿Actualizar estado a "${statusLabel}"?`, {
                action: {
                    label: "Sí",
                    onClick: () => {
                        updatePersonStatusAction(personId, type, date)
                            .then(res => {
                                if (res.success) toast.success(`CRM: Estado de relación actualizado`);
                                else toast.error("Error al actualizar estado en CRM");
                            });
                    }
                },
                duration: 6000,
            });
        }

        if (freshActivities.length + (editingActivity ? 0 : 1) > 0) {
            setView('list');
        } else {
            onOpenChange(false);
        }
    };

    const handleDelete = async (id: string) => {
        await deleteActivity.mutateAsync(id);
        if (freshActivities.length <= 1) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#09090b] border-white/10 shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] text-white sm:max-w-md z-[9999]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {view === 'form' && freshActivities.length > 0 && (
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
                            {freshActivities.map((act) => {
                                // Robust name resolution
                                const personData = Array.isArray(act.person) ? act.person[0] : act.person;
                                const client = clients?.find(c => c.id === act.client_id);

                                const notes = act.notes || '';
                                const hasSeparator = notes.includes(' || ');

                                let contactName = '';
                                let activityNotes = '';

                                if (personData) {
                                    contactName = `${personData.first_name} ${personData.last_name}`;
                                    activityNotes = notes;
                                } else if (client) {
                                    contactName = `${(client as any).first_name} ${(client as any).last_name}`;
                                    activityNotes = notes;
                                } else if (hasSeparator) {
                                    const parts = notes.split(' || ');
                                    contactName = parts[0]?.trim() || '';
                                    activityNotes = parts.slice(1).join(' || ').trim();
                                } else {
                                    activityNotes = notes;
                                }

                                return (
                                    <div key={act.id} className="p-4 glass bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-start justify-between group gap-4">
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEdit(act)}>
                                            {(client || personData || contactName) && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                                                        {client ? 'Búsqueda' : personData ? 'Relación' : 'Contacto'}
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
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-white/60 text-[11px] uppercase tracking-wider font-bold">Cliente</Label>
                                <PersonSelector
                                    value={personId}
                                    onChange={(id) => setPersonId(id)}
                                    placeholder="Buscar o crear cliente..."
                                />
                            </div>
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
