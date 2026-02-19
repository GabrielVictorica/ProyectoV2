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
import { PersonSelector } from '@/features/clients/components/shared/PersonSelector';
import { checkPersonHasSearchAction } from '@/features/clients/actions/clientActions';
import { ClientForm } from '@/features/clients/components/ClientForm';
import { updatePersonStatusAction } from '@/features/weekly-activities/actions/activityActions';
import { getStatusLabel } from '@/features/crm/constants/relationshipStatuses';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectSeparator,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Handshake, DollarSign, Percent, Users, TrendingUp, Building2, Pencil, Plus, ShoppingCart, Home, UserPlus } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
    property_id: z.string().min(1, 'Debes seleccionar una propiedad'),
    custom_property_title: z.string().optional(),
    actual_price: z.coerce.number().min(1, 'El precio debe ser mayor a 0'),
    sides: z.coerce.number().min(1).max(2),
    my_side: z.enum(['buyer', 'seller']).default('buyer'),
    commission_percentage: z.coerce.number().min(0).max(100),
    agent_split_percentage: z.number().min(0).max(100),
    transaction_date: z.string().min(1, 'La fecha es requerida'),
    buyer_name: z.string().optional(),
    seller_name: z.string().optional(),
    buyer_person_id: z.string().nullable().optional(),
    seller_person_id: z.string().nullable().optional(),
    notes: z.string().optional(),
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
});

type FormData = z.infer<typeof formSchema>;

interface Props {
    propertyId?: string;
    transaction?: TransactionWithRelations;
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function CloseTransactionDialog({ propertyId, transaction, onSuccess, trigger }: Props) {
    const [open, setOpen] = useState(false);
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
            custom_property_title: transaction?.custom_property_title || '',
            notes: transaction?.notes || '',
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
            };

            if (isEditing) {
                await updateTransaction({
                    id: transaction.id,
                    ...input
                });
                toast.success('Operación actualizada con éxito');
            } else {
                await addTransaction(input as any);
                toast.success('Operación cerrada con éxito');

                // Preguntar si desea actualizar el estado de los clientes a "Cierre"
                const linkedPersons = [
                    { id: data.buyer_person_id, name: data.buyer_name || 'Comprador' },
                    { id: data.seller_person_id, name: data.seller_name || 'Vendedor' }
                ].filter(p => p.id);

                linkedPersons.forEach(person => {
                    toast(`¿Actualizar estado de ${person.name} a "Cierre"?`, {
                        action: {
                            label: "Sí",
                            onClick: () => {
                                updatePersonStatusAction(person.id!, 'cierre', data.transaction_date)
                                    .then(res => {
                                        if (res.success) toast.success(`CRM: ${person.name} ahora está en "Cierre"`);
                                        else toast.error(`Error al actualizar estado de ${person.name}`);
                                    });
                            }
                        },
                        duration: 8000,
                    });
                });
            }

            form.reset({
                property_id: '',
                actual_price: 0,
                sides: 1,
                my_side: 'buyer',
                commission_percentage: 3,
                transaction_date: new Date().toISOString().split('T')[0],
                buyer_name: '',
                seller_name: '',
                buyer_person_id: null,
                seller_person_id: null,
                custom_property_title: '',
                notes: '',
            });
            setOpen(false);
            onSuccess?.();
        } catch (error) {
            toast.error(isEditing ? 'Error al actualizar' : 'Error al cerrar operación');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (!isEditing ? (
                    <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                        <Handshake className="mr-2 h-4 w-4" />
                        Cerrar Operación
                    </Button>
                ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800">
                        <Pencil className="h-4 w-4" />
                    </Button>
                ))}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[95vh] flex flex-col bg-slate-800 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Handshake className="h-5 w-5 text-green-400" />
                        {isEditing ? 'Editar Operación' : 'Cerrar Operación'}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {isEditing ? 'Modifica los datos de la operación cerrada' : 'Registra una nueva operación cerrada'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 flex flex-col h-full">
                        <ScrollArea className="flex-1 pr-4 -mr-4 max-h-[65vh]">
                            <div className="space-y-4 py-1">
                                {/* Selector de Organización (Solo GOD) */}
                                {isGod && !transaction && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="organization_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-200 flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-purple-400" />
                                                        Oficina / Organización *
                                                    </FormLabel>
                                                    <Select
                                                        onValueChange={(val) => {
                                                            field.onChange(val);
                                                            // Limpiar agente al cambiar de org
                                                            form.setValue('agent_id', '');
                                                        }}
                                                        defaultValue={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                                                <SelectValue placeholder="Seleccionar oficina" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                                            {organizations.map((org: any) => (
                                                                <SelectItem key={org.id} value={org.id}>
                                                                    {org.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="agent_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-200 flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-blue-400" />
                                                        Agente Responsable *
                                                    </FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                        disabled={!watchOrgId}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                                                <SelectValue placeholder={watchOrgId ? "Seleccionar agente" : "Primero elige oficina"} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                                            {filteredAgents.map((u: any) => (
                                                                <SelectItem key={u.id} value={u.id}>
                                                                    {u.first_name} {u.last_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Selector de Agente (Solo Parent de su propia org) */}
                                {isParent && !isGod && !transaction && (
                                    <FormField
                                        control={form.control}
                                        name="agent_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-200 flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-blue-400" />
                                                    Agente Responsable *
                                                </FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                                            <SelectValue placeholder="Seleccionar agente" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                                        {filteredAgents
                                                            .map((u: any) => (
                                                                <SelectItem key={u.id} value={u.id}>
                                                                    {u.first_name} {u.last_name}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Selector de Propiedad (solo si no se pasó una por props fija) */}
                                {!propertyId && (
                                    <FormField
                                        control={form.control}
                                        name="property_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-200 flex items-center gap-2">
                                                    <Building2 className="h-4 w-4" />
                                                    Propiedad *
                                                </FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                                            <SelectValue placeholder={isLoadingProps ? "Cargando propiedades..." : "Seleccionar propiedad"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-slate-800 border-slate-700">
                                                        <SelectItem value="manual" className="text-blue-400 font-medium hover:bg-slate-700">
                                                            + Propiedad no registrada (Manual)
                                                        </SelectItem>
                                                        <SelectSeparator className="bg-slate-700/50" />
                                                        {availableProperties.map((p) => (
                                                            <SelectItem
                                                                key={p.id}
                                                                value={p.id}
                                                                className="text-white hover:bg-slate-700"
                                                            >
                                                                {p.title} ({p.city})
                                                            </SelectItem>
                                                        ))}
                                                        {availableProperties.length === 0 && !isLoadingProps && (
                                                            <div className="p-2 text-slate-500 text-sm text-center">
                                                                No tienes propiedades activas
                                                            </div>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Campo Manual (solo si eligió manual) */}
                                {watchPropertyId === 'manual' && (
                                    <FormField
                                        control={form.control}
                                        name="custom_property_title"
                                        render={({ field }) => (
                                            <FormItem className="animate-in slide-in-from-top-2 duration-300">
                                                <FormLabel className="text-slate-200 flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-blue-400" />
                                                    Nombre/Dirección de la Propiedad *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Ej: Departamento en Recoleta 3 amb"
                                                        className="bg-slate-700/50 border-blue-500/50 text-white focus:border-blue-400"
                                                    />
                                                </FormControl>
                                                <FormDescription className="text-slate-500 text-[10px]">
                                                    Escribe un título descriptivo para identificar esta operación.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Precio y Puntas */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="actual_price"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-200 flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4" />
                                                    Precio de Venta (USD) *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        step="1"
                                                        placeholder="150000"
                                                        className="bg-slate-700/50 border-slate-600 text-white"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="sides"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-200 flex items-center gap-2">
                                                    <Users className="h-4 w-4" />
                                                    Puntas *
                                                </FormLabel>
                                                <Select
                                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                                    defaultValue={String(field.value)}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-slate-800 border-slate-700">
                                                        <SelectItem value="1" className="text-white hover:bg-slate-700">
                                                            1 Punta - Solo comprador o vendedor
                                                        </SelectItem>
                                                        <SelectItem value="2" className="text-white hover:bg-slate-700">
                                                            2 Puntas - Ambos lados
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Comisión y Split */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="commission_percentage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-200 flex items-center gap-2">
                                                    <Percent className="h-4 w-4" />
                                                    Comisión (%) *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        max="100"
                                                        readOnly
                                                        className="bg-slate-700/50 border-slate-600 text-slate-400 cursor-not-allowed"
                                                    />
                                                </FormControl>
                                                <FormDescription className="text-slate-500 text-[10px]">
                                                    Fijo al 3% según política.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="agent_split_percentage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-200 flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4" />
                                                    Tu Split (%) *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        max="100"
                                                        readOnly
                                                        className="bg-slate-700/50 border-slate-600 text-slate-400 cursor-not-allowed"
                                                    />
                                                </FormControl>
                                                <FormDescription className="text-slate-500 text-[10px]">
                                                    Definido en tu perfil de usuario.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* ===== SECCIÓN DINÁMICA: COMPRADOR / VENDEDOR ===== */}

                                {/* Toggle "¿Qué lado representás?" — solo visible en 1 punta */}
                                {watchSides === 1 && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                        <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">¿Qué lado representás?</p>
                                        <FormField
                                            control={form.control}
                                            name="my_side"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => field.onChange('buyer')}
                                                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${field.value === 'buyer'
                                                                ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10'
                                                                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                                                                }`}
                                                        >
                                                            <ShoppingCart className="w-4 h-4" />
                                                            Comprador
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => field.onChange('seller')}
                                                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${field.value === 'seller'
                                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                                                                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                                                                }`}
                                                        >
                                                            <Home className="w-4 h-4" />
                                                            Vendedor
                                                        </button>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* ===== COMPRADOR ===== */}
                                    {(() => {
                                        const isBuyerMySide = watchSides === 2 || watchMySide === 'buyer';
                                        const isBuyerRequired = isBuyerMySide;
                                        return (
                                            <div className="space-y-2">
                                                <p className="text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                                    <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
                                                    Comprador {isBuyerRequired ? '(CRM) *' : '(Externo)'}
                                                </p>

                                                {isBuyerMySide ? (
                                                    /* Nuestro lado: PersonSelector obligatorio */
                                                    <>
                                                        <FormField
                                                            control={form.control}
                                                            name="buyer_person_id"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <PersonSelector
                                                                            value={field.value ?? null}
                                                                            onChange={(id) => field.onChange(id)}
                                                                            placeholder="Buscar comprador en CRM..."
                                                                        />
                                                                    </FormControl>
                                                                    {isCheckingBuyer && <p className="text-[10px] text-slate-500 animate-pulse">Verificando búsqueda...</p>}
                                                                    {!isCheckingBuyer && buyerHasSearch === false && watchBuyerPersonId && (
                                                                        <Alert variant="destructive" className="mt-2 bg-red-500/10 border-red-500/20 py-2">
                                                                            <AlertDescription className="text-[11px] flex items-center justify-between gap-2">
                                                                                <span>Este cliente no tiene una búsqueda activa.</span>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="link"
                                                                                    className="h-auto p-0 text-red-400 font-bold"
                                                                                    onClick={() => setShowBuyerSearchForm(true)}
                                                                                >
                                                                                    Crear Búsqueda
                                                                                </Button>
                                                                            </AlertDescription>
                                                                        </Alert>
                                                                    )}
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <Dialog open={showBuyerSearchForm} onOpenChange={setShowBuyerSearchForm}>
                                                            <DialogContent className="sm:max-w-[700px] bg-slate-800 border-slate-700">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-white">Crear Búsqueda de Comprador</DialogTitle>
                                                                    <DialogDescription>
                                                                        Completa los datos de la búsqueda para poder cerrar la operación.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <ClientForm
                                                                    onSuccess={() => {
                                                                        setShowBuyerSearchForm(false);
                                                                        // Trigger re-check
                                                                        const currentId = watchBuyerPersonId;
                                                                        form.setValue('buyer_person_id', null);
                                                                        setTimeout(() => form.setValue('buyer_person_id', currentId), 10);
                                                                    }}
                                                                    client={watchBuyerPersonId ? { person_id: watchBuyerPersonId, type: 'buyer' } as any : undefined}
                                                                />
                                                            </DialogContent>
                                                        </Dialog>

                                                    </>
                                                ) : (
                                                    /* Lado contrario (1 punta): input manual */
                                                    <FormField
                                                        control={form.control}
                                                        name="buyer_name"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input
                                                                        {...field}
                                                                        placeholder="Nombre del colega / inmobiliaria"
                                                                        className="bg-slate-700/50 border-slate-600 text-white"
                                                                    />
                                                                </FormControl>
                                                                <FormDescription className="text-slate-500 text-[10px]">
                                                                    Ingresá el nombre del colega o inmobiliaria contraparte.
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* ===== VENDEDOR ===== */}
                                    {(() => {
                                        const isSellerMySide = watchSides === 2 || watchMySide === 'seller';
                                        const isSellerRequired = isSellerMySide;
                                        return (
                                            <div className="space-y-2">
                                                <p className="text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                                    <Home className="w-3.5 h-3.5 text-emerald-400" />
                                                    Vendedor {isSellerRequired ? '(CRM) *' : '(Externo)'}
                                                </p>

                                                {isSellerMySide ? (
                                                    /* Nuestro lado: PersonSelector obligatorio */
                                                    <>
                                                        <FormField
                                                            control={form.control}
                                                            name="seller_person_id"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <PersonSelector
                                                                            value={field.value ?? null}
                                                                            onChange={(id) => field.onChange(id)}
                                                                            placeholder="Buscar vendedor en CRM..."
                                                                        />
                                                                    </FormControl>
                                                                    {isCheckingSeller && <p className="text-[10px] text-slate-500 animate-pulse">Verificando búsqueda...</p>}
                                                                    {/* We removed the block for sellers missing a search/property implementation yet */}
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <Dialog open={showSellerSearchForm} onOpenChange={setShowSellerSearchForm}>
                                                            <DialogContent className="sm:max-w-[700px] bg-slate-800 border-slate-700">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-white">Crear Cliente (Vendedor)</DialogTitle>
                                                                    <DialogDescription>
                                                                        Completa los datos del cliente para poder cerrar la operación.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <ClientForm
                                                                    onSuccess={() => {
                                                                        setShowSellerSearchForm(false);
                                                                        // Trigger re-check
                                                                        const currentId = watchSellerPersonId;
                                                                        form.setValue('seller_person_id', null);
                                                                        setTimeout(() => form.setValue('seller_person_id', currentId), 10);
                                                                    }}
                                                                    client={watchSellerPersonId ? { person_id: watchSellerPersonId, type: 'seller' } as any : undefined}
                                                                />
                                                            </DialogContent>
                                                        </Dialog>

                                                    </>
                                                ) : (
                                                    /* Lado contrario (1 punta): input manual */
                                                    <FormField
                                                        control={form.control}
                                                        name="seller_name"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input
                                                                        {...field}
                                                                        placeholder="Nombre del colega / inmobiliaria"
                                                                        className="bg-slate-700/50 border-slate-600 text-white"
                                                                    />
                                                                </FormControl>
                                                                <FormDescription className="text-slate-500 text-[10px]">
                                                                    Ingresá el nombre del colega o inmobiliaria contraparte.
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>


                                {/* Fecha */}
                                <FormField
                                    control={form.control}
                                    name="transaction_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-200">Fecha de Operación *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="date"
                                                    className="bg-slate-700/50 border-slate-600 text-white"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Notas */}
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-200">Notas (opcional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="Detalles adicionales..."
                                                    className="bg-slate-700/50 border-slate-600 text-white resize-none"
                                                    rows={2}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Preview Card */}
                                {watchPrice > 0 && (
                                    <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-green-400 text-sm font-medium flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4" />
                                                Reparto de Comisiones (Cascada)
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex justify-between items-center text-sm border-b border-green-500/20 pb-2">
                                                <span className="text-slate-400">Comisión Bruta ({watchCommissionPercent}% x {watchSides})</span>
                                                <span className="text-white font-semibold">
                                                    {formatCurrency(calculations.grossCommission)}
                                                </span>
                                            </div>

                                            {/* Mostrar Royalty (Dios) solo si no es agente o si queremos transparencia total */}
                                            {profile?.role !== 'child' && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-red-400/80">Fee de Red (Dios) ({calculations.royaltyPercent}%)</span>
                                                    <span className="text-red-400/80">
                                                        - {formatCurrency(calculations.masterAmount)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center text-sm pt-2 border-t border-green-500/20">
                                                <span className="text-green-400 font-medium">Tu Comisión ({watchSplitPercent}%)</span>
                                                <span className="text-green-400 font-bold">
                                                    {formatCurrency(calculations.agentAmount)}
                                                </span>
                                            </div>

                                            {/* Mostrar Neto Oficina solo si no es agente */}
                                            {profile?.role !== 'child' && (
                                                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-700/50">
                                                    <span className="text-blue-400 font-medium">Neto Oficina</span>
                                                    <span className="text-blue-400 font-semibold">
                                                        {formatCurrency(calculations.officeAmount)}
                                                    </span>
                                                </div>
                                            )}
                                        </CardContent>
                                        {watchSides === 2 && (
                                            <div className="px-6 pb-4">
                                                <span className="text-purple-400 text-xs font-medium bg-purple-500/20 px-2 py-1 rounded">
                                                    ⭐ Operación de 2 puntas
                                                </span>
                                            </div>
                                        )}
                                    </Card>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50 mt-auto">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setOpen(false)}
                                className="text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
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
                                        <Handshake className="mr-2 h-4 w-4" />
                                        {isEditing ? 'Actualizar Cierre' : 'Confirmar Cierre'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
