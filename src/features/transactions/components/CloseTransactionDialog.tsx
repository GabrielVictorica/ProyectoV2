'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAddTransaction, useUpdateTransaction, TransactionWithRelations } from '../hooks/useTransactions';
import { useProperties } from '@/features/properties/hooks/useProperties';
import { useOrganizations } from '@/features/admin/hooks/useAdmin';
import { useTeamMembers } from '@/features/team/hooks/useTeamMembers';
import { checkPersonHasSearchAction } from '@/features/clients/actions/clientActions';
import { updatePersonStatusAction } from '@/features/weekly-activities/actions/activityActions';
import { getStatusLabel } from '@/features/crm/constants/relationshipStatuses';

import { PropertyStep } from './form/PropertyStep';
import { FinancialsStep } from './form/FinancialsStep';
import { PartiesStep } from './form/PartiesStep';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
import { Form } from '@/components/ui/form';
import { Loader2, Handshake, Pencil, Plus, ChevronLeft, ChevronRight as ChevronRightIcon, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
    property_id: z.string().min(1, 'Debes seleccionar una propiedad'),
    custom_property_title: z.string().optional(),
    status: z.enum(['pending', 'completed', 'cancelled']).default('completed'),
    actual_price: z.coerce.number().min(1, 'El precio debe ser mayor a 0'),
    sides: z.coerce.number().min(1).max(2),
    my_side: z.enum(['buyer', 'seller']).default('buyer'),
    commission_percentage: z.coerce.number().min(0).max(100),
    agent_split_percentage: z.coerce.number().min(0).max(100),
    transaction_date: z.string().min(1, 'La fecha es requerida'),
    buyer_name: z.string().optional(),
    seller_name: z.string().optional(),
    buyer_person_id: z.string().nullable().optional(),
    seller_person_id: z.string().nullable().optional(),
    notes: z.string().optional(),
    cancellation_reason: z.string().optional(),
    organization_id: z.string().optional(),
    agent_id: z.string().optional(),
}).refine((data) => {
    if (data.property_id === 'manual' && (!data.custom_property_title || data.custom_property_title.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: "Debes ingresar el nombre/dirección de la propiedad",
    path: ["custom_property_title"]
}).refine((data) => {
    // 2 puntas: ambos person_id obligatorios
    if (data.sides === 2) {
        if (!data.buyer_person_id) return false;
    }
    return true;
}, {
    message: "Debes vincular al comprador desde el CRM",
    path: ["buyer_person_id"]
}).refine((data) => {
    if (data.sides === 2) {
        if (!data.seller_person_id) return false;
    }
    return true;
}, {
    message: "Debes vincular al vendedor desde el CRM",
    path: ["seller_person_id"]
}).refine((data) => {
    // 1 punta: solo el lado propio requiere person_id
    if (data.sides === 1 && data.my_side === 'buyer') {
        if (!data.buyer_person_id) return false;
    }
    return true;
}, {
    message: "Debes vincular al comprador desde el CRM",
    path: ["buyer_person_id"]
}).refine((data) => {
    if (data.sides === 1 && data.my_side === 'seller') {
        if (!data.seller_person_id) return false;
    }
    return true;
}, {
    message: "Debes vincular al vendedor desde el CRM",
    path: ["seller_person_id"]
}).refine((data) => {
    // Validar nombre externo obligatorio si no es nuestro lado
    if (data.sides === 1 && data.my_side === 'seller') {
        if (!data.buyer_name || data.buyer_name.trim() === '') return false;
    }
    return true;
}, {
    message: "Debes ingresar el agente o inmobiliaria representante del comprador",
    path: ["buyer_name"]
}).refine((data) => {
    if (data.sides === 1 && data.my_side === 'buyer') {
        if (!data.seller_name || data.seller_name.trim() === '') return false;
    }
    return true;
}, {
    message: "Debes ingresar el agente o inmobiliaria representante del vendedor",
    path: ["seller_name"]
});

type FormData = z.infer<typeof formSchema>;

interface Props {
    propertyId?: string;
    transaction?: TransactionWithRelations;
    onSuccess?: () => void;
    trigger?: React.ReactNode;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function CloseTransactionDialog({ propertyId, transaction, onSuccess, trigger, defaultOpen = false, onOpenChange: externalOnOpenChange }: Props) {
    const [open, setOpen] = useState(defaultOpen);
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 3;
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [buyerHasSearch, setBuyerHasSearch] = useState<boolean | null>(null);
    const [sellerHasSearch, setSellerHasSearch] = useState<boolean | null>(null);
    const [isCheckingBuyer, setIsCheckingBuyer] = useState(false);
    const [isCheckingSeller, setIsCheckingSeller] = useState(false);
    const [showBuyerSearchForm, setShowBuyerSearchForm] = useState(false);
    const [showSellerSearchForm, setShowSellerSearchForm] = useState(false);

    const { mutateAsync: addTransaction, isPending: isAdding } = useAddTransaction();
    const { mutateAsync: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
    const { data: properties = [], isLoading: isLoadingProps } = useProperties();
    const { data: auth } = useAuth();

    // Estado para el flujo de actualización de estado del CRM
    const [pendingStatusUpdates, setPendingStatusUpdates] = useState<{ id: string, name: string, date: string, targetStatus: string }[]>([]);
    const [isConfirmingNo, setIsConfirmingNo] = useState(false);

    const processNextUpdate = () => {
        setPendingStatusUpdates(prev => prev.slice(1));
        setIsConfirmingNo(false);
    };

    // Hooks adicionales para administración
    const { data: organizations = [] } = useOrganizations();
    const { data: allUsers = [] } = useTeamMembers();

    const profile = auth?.profile;
    const isGod = auth?.role === 'god';
    const isParent = auth?.role === 'parent';

    const isEditing = !!transaction;

    // Filtrar propiedades activas (status_id no debe ser vendido idealmente, pero para cierres permitimos cargar cualquiera operativa)
    const availableProperties = useMemo(() => {
        if (!properties) return [];
        // Si ya viene una propiedad fijada por props, no cargamos el resto
        if (propertyId) return [];
        return properties.filter(p => p.agent_id === profile?.id || profile?.role === 'god' || profile?.role === 'parent');
    }, [properties, propertyId, profile]);

    // Obtener split por defecto del perfil
    const defaultSplit = profile?.default_split_percentage ?? 45;

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            property_id: transaction ? (transaction.property_id ?? 'manual') : (propertyId || ''),
            custom_property_title: transaction?.custom_property_title || '',
            status: (transaction as any)?.status || 'pending',
            actual_price: transaction?.actual_price || 0,
            sides: transaction?.sides || 1,
            my_side: 'buyer' as const,
            commission_percentage: transaction?.commission_percentage || 3,
            agent_split_percentage: transaction?.agent_split_percentage || profile?.default_split_percentage || 45,
            transaction_date: transaction?.transaction_date || new Date().toISOString().split('T')[0],
            buyer_name: transaction?.buyer_name || '',
            seller_name: transaction?.seller_name || '',
            buyer_person_id: transaction?.buyer_person_id || null,
            seller_person_id: transaction?.seller_person_id || null,
            notes: transaction?.notes || '',
            cancellation_reason: (transaction as any)?.cancellation_reason || '',
            organization_id: transaction?.organization_id || profile?.organization_id || '',
            agent_id: transaction?.agent_id || auth?.id || '',
        },
    });

    const watchPropertyId = form.watch('property_id');
    const watchOrgId = form.watch('organization_id');

    // Filtrar agentes según la organización seleccionada o el rol
    const filteredAgents = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter((u: any) => {
            if (isGod) {
                // God elige organización, mostramos miembros y reportes cross-org de esa oficina
                return u.organization_id === watchOrgId || u.reports_to_organization_id === watchOrgId;
            }
            // Para Parent, useTeamMembers ya filtró por RLS (miembros + reportes cross-org)
            return true;
        });
    }, [allUsers, watchOrgId, isGod]);

    // Watch para detectar cambio de agente
    const watchAgentId = form.watch('agent_id');

    // Efecto para actualizar split cuando se selecciona un agente diferente
    useEffect(() => {
        if (watchAgentId && watchAgentId !== auth?.id) {
            const selectedAgent = allUsers.find((u: any) => u.id === watchAgentId);
            if (selectedAgent?.default_split_percentage != null) {
                form.setValue('agent_split_percentage', selectedAgent.default_split_percentage);
            }
        }
    }, [watchAgentId, allUsers, auth?.id, form]);

    // Efecto para setear el split por defecto cuando el perfil carga (async)
    useEffect(() => {
        if (profile?.default_split_percentage != null && !transaction && open) {
            const currentSplit = form.getValues('agent_split_percentage');
            if (!currentSplit || currentSplit === 0 || isNaN(currentSplit)) {
                form.setValue('agent_split_percentage', profile.default_split_percentage);
            }
        }
    }, [profile, transaction, form, open]);

    // Resetear estados de verificación de búsqueda al abrir el diálogo
    useEffect(() => {
        if (open && !transaction) {
            setBuyerHasSearch(null);
            setSellerHasSearch(null);
        }
    }, [open, transaction]);

    // Watch values para cálculos en vivo
    const watchPrice = form.watch('actual_price');
    const watchSides = form.watch('sides');
    const watchMySide = form.watch('my_side');
    const watchCommissionPercent = form.watch('commission_percentage');
    const watchSplitPercent = form.watch('agent_split_percentage');

    // Clear person IDs and names when sides or my_side changes
    useEffect(() => {
        if (watchSides === 1) {
            // When switching to 1 punta, clear the opposite side
            if (watchMySide === 'buyer') {
                form.setValue('seller_person_id', null);
                setSellerHasSearch(null);
            } else {
                form.setValue('buyer_person_id', null);
                setBuyerHasSearch(null);
            }
        }
    }, [watchSides, watchMySide, form]);

    const watchBuyerPersonId = form.watch('buyer_person_id');
    const watchSellerPersonId = form.watch('seller_person_id');

    // Check search existence for buyer
    useEffect(() => {
        async function checkBuyer() {
            if (!watchBuyerPersonId) {
                setBuyerHasSearch(null);
                return;
            }
            setIsCheckingBuyer(true);
            const result = await checkPersonHasSearchAction(watchBuyerPersonId, 'buyer');
            if (result.success) {
                setBuyerHasSearch(result.data?.hasSearch ?? false);
            }
            setIsCheckingBuyer(false);
        }
        checkBuyer();
    }, [watchBuyerPersonId]);

    // Check search existence for seller
    useEffect(() => {
        async function checkSeller() {
            if (!watchSellerPersonId) {
                setSellerHasSearch(null);
                return;
            }
            setIsCheckingSeller(true);
            const result = await checkPersonHasSearchAction(watchSellerPersonId, 'seller');
            if (result.success) {
                // Optimization: We still track if it has a search, but we don't block the form anymore based on your requirement
                setSellerHasSearch(result.data?.hasSearch ?? false);
            }
            setIsCheckingSeller(false);
        }
        checkSeller();
    }, [watchSellerPersonId]);

    // Cálculos en tiempo real
    const calculations = useMemo(() => {
        // Obtener royalty de la organización seleccionada (para God) o del perfil
        const selectedOrg = organizations.find((o: any) => o.id === watchOrgId);
        const royaltyPercent = selectedOrg?.royalty_percentage ?? profile?.organization?.royalty_percentage ?? 0;

        // El bruto total contempla los lados (puntas)
        const grossCommission = watchPrice * (watchCommissionPercent / 100) * watchSides;

        // Monto para Dios (Master Fee)
        const masterAmount = grossCommission * (royaltyPercent / 100);

        // Monto para Agente (Split)
        const agentAmount = grossCommission * (watchSplitPercent / 100);

        // Monto para Oficina (Resto)
        const officeAmount = grossCommission - masterAmount - agentAmount;

        return {
            grossCommission,
            masterAmount,
            agentAmount,
            officeAmount,
            royaltyPercent
        };
    }, [watchPrice, watchCommissionPercent, watchSplitPercent, watchSides, profile, watchOrgId, organizations]);

    const onSubmit = async (data: FormData) => {
        // Bloqueo preventivo: si representamos al comprador y no tiene búsqueda, no dejamos avanzar
        const isBuyerRepresented = watchSides === 2 || watchMySide === 'buyer';
        if (isBuyerRepresented && buyerHasSearch === false) {
            toast.error('No se puede cerrar la operación: El comprador debe tener una búsqueda activa.');
            return;
        }

        try {
            const input = {
                property_id: data.property_id === 'manual' ? null : data.property_id,
                organization_id: data.organization_id || undefined,
                agent_id: data.agent_id || undefined,
                transaction_date: data.transaction_date,
                actual_price: data.actual_price,
                sides: data.sides,
                commission_percentage: data.commission_percentage,
                agent_split_percentage: data.agent_split_percentage,
                buyer_name: data.buyer_name || null,
                seller_name: data.seller_name || null,
                buyer_person_id: data.buyer_person_id || null,
                seller_person_id: data.seller_person_id || null,
                custom_property_title: data.property_id === 'manual' ? data.custom_property_title : null,
                notes: data.notes || null,
                // En creación siempre pending; en edición mantener status actual (no se cambia desde aquí)
                status: isEditing ? transaction.status : 'pending',
                cancellation_reason: null,
            };

            if (isEditing) {
                await updateTransaction({
                    id: transaction.id,
                    ...input
                });
                toast.success('Operación actualizada con éxito');
            } else {
                await addTransaction(input as any);
                toast.success('Reserva registrada con éxito');

                // Preguntar si desea actualizar el estado de los clientes a "Cierre"
                const linkedPersons = [
                    { id: data.buyer_person_id, name: data.buyer_name || 'Comprador' },
                    { id: data.seller_person_id, name: data.seller_name || 'Vendedor' }
                ].filter(p => p.id);


                const updates = linkedPersons.map(person => ({
                    id: person.id!,
                    name: person.name,
                    date: data.transaction_date,
                    targetStatus: 'reserva'
                }));

                if (updates.length > 0) {
                    setPendingStatusUpdates(updates);
                }
            }

            form.reset({
                property_id: '',
                actual_price: 0,
                sides: 1,
                my_side: 'buyer',
                commission_percentage: 3,
                agent_split_percentage: profile?.default_split_percentage || 45,
                transaction_date: new Date().toISOString().split('T')[0],
                buyer_name: '',
                seller_name: '',
                buyer_person_id: null,
                seller_person_id: null,
                custom_property_title: '',
                status: 'pending',
                notes: '',
                organization_id: profile?.organization_id || '',
                agent_id: auth?.id || '',
            });
            setOpen(false);
            setStep(1);
            onSuccess?.();
        } catch (error: any) {
            console.error('Transaction error:', error);
            toast.error(isEditing ? 'Error al actualizar la operación' : 'Error al registrar la operación');
        }
    };

    const currentUpdate = pendingStatusUpdates[0];

    const handleConfirmUpdate = async () => {
        if (!currentUpdate) return;
        const statusLabel = currentUpdate.targetStatus === 'reserva' ? 'Reserva' : 'Cierre';
        const res = await updatePersonStatusAction(currentUpdate.id, currentUpdate.targetStatus, currentUpdate.date);
        if (res.success) {
            toast.success(`CRM: ${currentUpdate.name} ahora está en "${statusLabel}"`);
        } else {
            toast.error(`Error al actualizar estado de ${currentUpdate.name}`);
        }
        processNextUpdate();
    };

    // Función para solicitar cierre del diálogo con confirmación
    const handleRequestClose = () => {
        const isDirty = form.formState.isDirty;
        if (isDirty || step > 1) {
            setShowCloseConfirm(true);
        } else {
            setOpen(false);
            externalOnOpenChange?.(false);
            setStep(1);
        }
    };

    const handleConfirmClose = () => {
        setShowCloseConfirm(false);
        form.reset({
            property_id: '',
            actual_price: 0,
            sides: 1,
            my_side: 'buyer',
            commission_percentage: 3,
            agent_split_percentage: profile?.default_split_percentage || 45,
            transaction_date: new Date().toISOString().split('T')[0],
            buyer_name: '',
            seller_name: '',
            buyer_person_id: null,
            seller_person_id: null,
            custom_property_title: '',
            status: 'pending',
            notes: '',
            organization_id: profile?.organization_id || '',
            agent_id: auth?.id || '',
        });
        setOpen(false);
        externalOnOpenChange?.(false);
        setStep(1);
        setBuyerHasSearch(null);
        setSellerHasSearch(null);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(newOpen) => {
                if (newOpen) {
                    setOpen(true);
                    externalOnOpenChange?.(true);
                } else {
                    handleRequestClose();
                }
            }}>
                <DialogTrigger asChild>
                    {trigger || (!isEditing ? (
                        <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Reserva
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    ))}
                </DialogTrigger>
                <DialogContent
                    className="sm:max-w-[600px] max-h-[95vh] flex flex-col bg-slate-800 border-slate-700"
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => { e.preventDefault(); handleRequestClose(); }}
                >
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Handshake className="h-5 w-5 text-green-400" />
                            {isEditing ? 'Editar Operación' : 'Registrar Reserva'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {isEditing ? 'Modifica los datos de la operación (sin cambiar el estado)' : 'Registra una nueva reserva de propiedad'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2 px-1">
                        {[{ n: 1, label: 'Tipo' }, { n: 2, label: 'Finanzas' }, { n: 3, label: 'Partes' }].map((s, i) => (
                            <div key={s.n} className="flex items-center flex-1">
                                <button
                                    type="button"
                                    onClick={() => { if (s.n < step) setStep(s.n); }}
                                    className={`flex items-center gap-1.5 transition-all ${step === s.n
                                        ? 'text-white'
                                        : step > s.n
                                            ? 'text-emerald-400 cursor-pointer hover:text-emerald-300'
                                            : 'text-slate-600 cursor-default'
                                        }`}
                                >
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border transition-all ${step === s.n
                                        ? 'bg-violet-500 border-violet-400 text-white shadow-lg shadow-violet-500/30'
                                        : step > s.n
                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                            : 'bg-slate-800 border-slate-700 text-slate-600'
                                        }`}>
                                        {step > s.n ? <Check className="w-3 h-3" /> : s.n}
                                    </span>
                                    <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
                                </button>
                                {i < 2 && (
                                    <div className={`flex-1 h-px mx-2 transition-colors ${step > s.n ? 'bg-emerald-500/40' : 'bg-slate-700'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>

                    <Form {...form}>
                        <form onSubmit={(e) => e.preventDefault()} className="space-y-4 flex flex-col h-full">
                            <ScrollArea className="flex-1 pr-4 -mr-4 max-h-[55vh]">
                                <div className="space-y-4 py-1">
                                    {/* ========== STEP 1: Tipo + Propiedad ========== */}
                                    {step === 1 && (
                                        <PropertyStep 
                                            form={form}
                                            isGod={isGod}
                                            isParent={isParent}
                                            transaction={transaction}
                                            organizations={organizations}
                                            filteredAgents={filteredAgents}
                                            propertyId={propertyId}
                                            isLoadingProps={isLoadingProps}
                                            availableProperties={availableProperties}
                                            watchOrgId={watchOrgId}
                                            watchPropertyId={watchPropertyId}
                                        />
                                    )}

                                    {/* ========== STEP 2: Datos Financieros ========== */}
                                    {step === 2 && (
                                        <FinancialsStep form={form} />
                                    )}

                                    {/* ========== STEP 3: Partes Involucradas ========== */}
                                    {step === 3 && (
                                        <PartiesStep 
                                            form={form}
                                            watchSides={watchSides}
                                            watchMySide={watchMySide}
                                            watchBuyerPersonId={watchBuyerPersonId}
                                            watchSellerPersonId={watchSellerPersonId}
                                            isCheckingBuyer={isCheckingBuyer}
                                            isCheckingSeller={isCheckingSeller}
                                            buyerHasSearch={buyerHasSearch}
                                            sellerHasSearch={sellerHasSearch}
                                            showBuyerSearchForm={showBuyerSearchForm}
                                            setShowBuyerSearchForm={setShowBuyerSearchForm}
                                            showSellerSearchForm={showSellerSearchForm}
                                            setShowSellerSearchForm={setShowSellerSearchForm}
                                            watchPrice={watchPrice}
                                            watchCommissionPercent={watchCommissionPercent}
                                            calculations={calculations}
                                            watchSplitPercent={watchSplitPercent}
                                            profile={profile}
                                            watchStatus={form.watch('status')}
                                        />
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-700/50 mt-auto">
                                <div>
                                    {step > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setStep(step - 1)}
                                            className="text-slate-400 hover:text-white hover:bg-slate-800"
                                        >
                                            <ChevronLeft className="mr-1 h-4 w-4" />
                                            Atrás
                                        </Button>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => handleRequestClose()}
                                        className="text-slate-400 hover:text-white hover:bg-slate-800"
                                    >
                                        Cancelar
                                    </Button>
                                    {step < TOTAL_STEPS ? (
                                        <Button
                                            type="button"
                                            onClick={() => setStep(step + 1)}
                                            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                                        >
                                            Siguiente
                                            <ChevronRightIcon className="ml-1 h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            onClick={() => form.handleSubmit(onSubmit as any)()}
                                            disabled={isAdding || isUpdating || isCheckingBuyer || isCheckingSeller || (buyerHasSearch === false && (watchSides === 2 || watchMySide === 'buyer'))}
                                            className="bg-gradient-to-r from-green-500 to-emerald-600"
                                        >
                                            {isAdding || isUpdating ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {isEditing ? 'Actualizando...' : 'Registrando...'}
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="mr-2 h-4 w-4" />
                                                    {isEditing ? 'Actualizar' : 'Confirmar Operación'}
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Confirmación de cierre */}
            <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
                <AlertDialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">¿Descartar operación?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Tenés datos sin guardar. Si cerrás ahora, se perderá toda la información ingresada.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                            Seguir editando
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmClose}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            Descartar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {
                currentUpdate && (
                    <AlertDialog open={!!currentUpdate}>
                        <AlertDialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl">
                                    {isConfirmingNo
                                        ? "¿Confirmas que NO quieres actualizar el estado?"
                                        : `¿Actualizar estado de ${currentUpdate.name} a "${currentUpdate.targetStatus === 'reserva' ? 'Reserva' : 'Cierre'}"?`}
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400 text-base">
                                    {isConfirmingNo
                                        ? `Si eliges que no, el estado de ${currentUpdate.name} permanecerá sin cambios en el CRM.`
                                        : `Se recomienda actualizar el estado del cliente a "${currentUpdate.targetStatus === 'reserva' ? 'Reserva' : 'Cierre'}" para mantener el historial del CRM al día.`}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="sm:justify-end gap-2 mt-4">
                                {isConfirmingNo ? (
                                    <>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setIsConfirmingNo(false)}
                                            className="text-slate-400 hover:text-white hover:bg-slate-700"
                                        >
                                            Volver atrás
                                        </Button>
                                        <Button
                                            onClick={processNextUpdate}
                                            className="bg-red-500 hover:bg-red-600 text-white"
                                        >
                                            Sí, no actualizar
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setIsConfirmingNo(true)}
                                            className="text-slate-400 hover:text-white hover:bg-slate-700"
                                        >
                                            No actualizar
                                        </Button>
                                        <Button
                                            onClick={handleConfirmUpdate}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            Sí, actualizar ahora
                                        </Button>
                                    </>
                                )}
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )
            }
        </>
    );
}
