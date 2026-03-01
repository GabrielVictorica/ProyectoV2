'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Trash2, Plus, ArrowLeft, Edit2, User, MapPin, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PersonSelector } from '@/features/clients/components/shared/PersonSelector';
import { Person } from '@/features/clients/types';

type PuntaType = 'compradora' | 'vendedora' | 'ambas';

type PendingUpdate = {
    personId: string;
    personName: string;
    type: string;
    date: string;
};

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

    // Visit-specific state
    const isVisita = type === 'visita';
    const [punta, setPunta] = useState<PuntaType>('compradora');
    const [buyerPersonId, setBuyerPersonId] = useState<string | null>(null);
    const [sellerPersonId, setSellerPersonId] = useState<string | null>(null);
    const [propertyAddress, setPropertyAddress] = useState('');
    const [buyerFeedback, setBuyerFeedback] = useState('');

    // Status update queue state
    const [updateQueue, setUpdateQueue] = useState<PendingUpdate[]>([]);
    const [currentUpdate, setCurrentUpdate] = useState<PendingUpdate | null>(null);
    const [showMainAlert, setShowMainAlert] = useState(false);
    const [showAreYouSure, setShowAreYouSure] = useState(false);

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
        setPunta('compradora');
        setBuyerPersonId(null);
        setSellerPersonId(null);
        setPropertyAddress('');
        setBuyerFeedback('');
    };

    const handleEdit = (act: WeeklyActivity) => {
        setEditingActivity(act);
        setPersonId(act.person_id || null);

        const rawNotes = act.notes || '';
        setNotes(rawNotes);

        // Restore visit metadata if editing a visit
        if (act.visit_metadata) {
            setPunta(act.visit_metadata.punta || 'compradora');
            setBuyerPersonId(act.visit_metadata.buyer_person_id || null);
            setSellerPersonId(act.visit_metadata.seller_person_id || null);
            setPropertyAddress(act.visit_metadata.property_address || '');
            setBuyerFeedback(act.visit_metadata.buyer_feedback || '');
        } else {
            setPunta('compradora');
            setBuyerPersonId(null);
            setSellerPersonId(null);
            setPropertyAddress('');
            setBuyerFeedback('');
        }

        setView('form');
    };

    const handleNew = () => {
        setEditingActivity(null);
        resetForm();
        setView('form');
    };

    // Determine the primary person_id for the activity based on punta
    const getMainPersonId = () => {
        if (!isVisita) return personId;
        switch (punta) {
            case 'compradora': return buyerPersonId;
            case 'vendedora': return sellerPersonId;
            case 'ambas': return buyerPersonId || sellerPersonId;
        }
    };

    const handleSave = async () => {
        if (!auth?.profile?.organization_id || !auth?.profile?.id) return;

        const mainPersonId = getMainPersonId();

        const visitMetadata = isVisita ? {
            punta,
            buyer_person_id: (punta === 'compradora' || punta === 'ambas') ? buyerPersonId : null,
            seller_person_id: (punta === 'vendedora' || punta === 'ambas') ? sellerPersonId : null,
            property_address: propertyAddress || null,
            buyer_feedback: (punta === 'compradora' || punta === 'ambas') ? (buyerFeedback || null) : null,
        } : null;

        const data = {
            organization_id: auth.profile.organization_id,
            agent_id: agentId || auth.profile.id,
            type,
            date,
            notes: notes || null,
            person_id: mainPersonId,
            client_id: mainPersonId ? null : (editingActivity?.client_id || null),
            status: 'completed',
            visit_metadata: visitMetadata,
        };

        if (editingActivity) {
            await updateActivity.mutateAsync({ id: editingActivity.id, data });
        } else {
            await createActivity.mutateAsync(data as any);
        }

        // Preguntar si desea actualizar el estado en el CRM
        // Para visitas, preguntar por cada persona vinculada
        const newQueue: PendingUpdate[] = [];
        if (isVisita) {
            const personsToUpdate: string[] = [];
            if (buyerPersonId && (punta === 'compradora' || punta === 'ambas')) personsToUpdate.push(buyerPersonId);
            if (sellerPersonId && (punta === 'vendedora' || punta === 'ambas')) personsToUpdate.push(sellerPersonId);

            personsToUpdate.forEach(pid => {
                const person = clients.find(c => c.id === pid);
                const name = person ? `${person.first_name} ${person.last_name}` : 'el cliente';
                newQueue.push({ personId: pid, personName: name, type, date });
            });
        } else if (personId) {
            const person = clients.find(c => c.id === personId);
            const name = person ? `${person.first_name} ${person.last_name}` : 'el cliente';
            newQueue.push({ personId: personId, personName: name, type, date });
        }

        if (newQueue.length > 0) {
            const first = newQueue[0];
            setUpdateQueue(newQueue.slice(1));
            setCurrentUpdate(first);
            setShowMainAlert(true);
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

    // ── Render Visit-Specific Form Fields ──
    const renderVisitFields = () => (
        <>
            {/* Selector de Punta */}
            <div className="space-y-2">
                <Label className="text-white/60 text-[11px] uppercase tracking-wider font-bold">Tipo de Punta</Label>
                <Select value={punta} onValueChange={(v) => setPunta(v as PuntaType)}>
                    <SelectTrigger className="bg-white/[0.02] border-white/[0.08] rounded-xl text-white">
                        <SelectValue placeholder="Seleccionar punta..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1e] border-white/10 rounded-xl">
                        <SelectItem value="compradora" className="text-white/80 focus:bg-white/[0.06] focus:text-white rounded-lg">
                            🛒 Punta Compradora
                        </SelectItem>
                        <SelectItem value="vendedora" className="text-white/80 focus:bg-white/[0.06] focus:text-white rounded-lg">
                            🏠 Punta Vendedora
                        </SelectItem>
                        <SelectItem value="ambas" className="text-white/80 focus:bg-white/[0.06] focus:text-white rounded-lg">
                            🤝 Ambas Puntas
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Person Selectors based on punta */}
            {(punta === 'compradora' || punta === 'ambas') && (
                <div className="space-y-2">
                    <Label className="text-white/60 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <User className="w-3 h-3" /> Cliente Comprador
                    </Label>
                    <PersonSelector
                        value={buyerPersonId}
                        onChange={(id) => setBuyerPersonId(id)}
                        placeholder="Buscar comprador..."
                    />
                </div>
            )}

            {(punta === 'vendedora' || punta === 'ambas') && (
                <div className="space-y-2">
                    <Label className="text-white/60 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <User className="w-3 h-3" /> Cliente Vendedor
                    </Label>
                    <PersonSelector
                        value={sellerPersonId}
                        onChange={(id) => setSellerPersonId(id)}
                        placeholder="Buscar vendedor..."
                    />
                </div>
            )}

            {/* Propiedad - texto libre */}
            <div className="space-y-2">
                <Label className="text-white/60 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Propiedad
                </Label>
                <Input
                    placeholder="Ej. Av. Santa Fe 1200, 4to B"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    className="bg-white/[0.02] border-white/[0.08] rounded-xl text-white placeholder:text-white/30"
                />
            </div>

            {/* Feedback del comprador - solo si punta compradora o ambas */}
            {(punta === 'compradora' || punta === 'ambas') && (
                <div className="space-y-2">
                    <Label className="text-white/60 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <MessageCircle className="w-3 h-3" /> Devolución del Comprador
                    </Label>
                    <Textarea
                        placeholder="¿Qué le pareció la propiedad al comprador?"
                        value={buyerFeedback}
                        onChange={(e) => setBuyerFeedback(e.target.value)}
                        className="bg-white/[0.02] border-white/[0.08] rounded-xl min-h-[80px] text-white placeholder:text-white/30"
                    />
                </div>
            )}
        </>
    );

    return (
        <>
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

                                    const actNotes = act.notes || '';
                                    const hasSeparator = actNotes.includes(' || ');

                                    let contactName = '';
                                    let activityNotes = '';

                                    if (personData) {
                                        contactName = `${personData.first_name} ${personData.last_name}`;
                                        activityNotes = actNotes;
                                    } else if (client) {
                                        contactName = `${(client as any).first_name} ${(client as any).last_name}`;
                                        activityNotes = actNotes;
                                    } else if (hasSeparator) {
                                        const parts = actNotes.split(' || ');
                                        contactName = parts[0]?.trim() || '';
                                        activityNotes = parts.slice(1).join(' || ').trim();
                                    } else {
                                        activityNotes = actNotes;
                                    }

                                    // Visit metadata display
                                    const vm = act.visit_metadata;

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
                                                {/* Visit metadata badges */}
                                                {vm && (
                                                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                                            {vm.punta === 'compradora' ? '🛒 Compradora' : vm.punta === 'vendedora' ? '🏠 Vendedora' : '🤝 Ambas'}
                                                        </span>
                                                        {vm.property_address && (
                                                            <span className="text-[10px] text-white/50 flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" /> {vm.property_address}
                                                            </span>
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
                            {isVisita ? (
                                /* ── Visit-specific form ── */
                                <div className="space-y-4">
                                    {renderVisitFields()}
                                </div>
                            ) : (
                                /* ── Standard form (other activity types) ── */
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
                            )}

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

            {/* AlertDialog Principal */}
            <AlertDialog open={showMainAlert} onOpenChange={setShowMainAlert}>
                <AlertDialogContent className="bg-[#09090b] border-white/10 text-white z-[10001]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl">
                            Actualizar estado del cliente
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60">
                            ¿Desea actualizar el estado de <span className="text-white font-bold">{currentUpdate?.personName}</span> a <span className="text-violet-400 font-bold">"{getStatusLabel(currentUpdate?.type || '')}"</span> en el CRM?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                            onClick={() => {
                                setShowMainAlert(false);
                                setShowAreYouSure(true);
                            }}
                        >
                            No
                        </Button>
                        <AlertDialogAction
                            className="bg-violet-600 hover:bg-violet-500 text-white"
                            onClick={async () => {
                                if (currentUpdate) {
                                    const res = await updatePersonStatusAction(currentUpdate.personId, currentUpdate.type, currentUpdate.date);
                                    if (res.success) toast.success(`CRM: Estado de relación actualizado`);
                                    else toast.error("Error al actualizar estado en CRM");
                                }

                                // Procesar siguiente en la cola
                                if (updateQueue.length > 0) {
                                    const next = updateQueue[0];
                                    setUpdateQueue(updateQueue.slice(1));
                                    setCurrentUpdate(next);
                                    setShowMainAlert(true);
                                } else {
                                    setCurrentUpdate(null);
                                    setShowMainAlert(false);
                                }
                            }}
                        >
                            Sí
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AlertDialog de Segundo Nivel (¿Estás seguro?) */}
            <AlertDialog open={showAreYouSure} onOpenChange={setShowAreYouSure}>
                <AlertDialogContent className="bg-[#09090b] border-white/10 text-white z-[10002]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-rose-400">
                            ¿Estás seguro?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60">
                            No actualizar el estado puede afectar el seguimiento de <span className="text-white font-bold">{currentUpdate?.personName}</span> en el CRM.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                            onClick={() => {
                                setShowAreYouSure(false);
                                setShowMainAlert(true);
                            }}
                        >
                            No, volver
                        </Button>
                        <AlertDialogAction
                            className="bg-rose-600 hover:bg-rose-500 text-white"
                            onClick={() => {
                                setShowAreYouSure(false);

                                // Procesar siguiente en la cola
                                if (updateQueue.length > 0) {
                                    const next = updateQueue[0];
                                    setUpdateQueue(updateQueue.slice(1));
                                    setCurrentUpdate(next);
                                    setShowMainAlert(true);
                                } else {
                                    setCurrentUpdate(null);
                                }
                            }}
                        >
                            Sí, estoy seguro
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

