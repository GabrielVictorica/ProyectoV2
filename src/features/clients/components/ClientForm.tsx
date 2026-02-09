'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateClient, useUpdateClient } from '../hooks/useClients';
import { usePropertyTypes } from '@/features/properties/hooks/useProperties';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Phone, Mail, MapPin, Tag as TagIcon, Target, ChevronRight, ChevronLeft, CheckCircle2, Home, Building, Building2, Store, Briefcase, Map, Car, Warehouse, Tractor, Hotel, DollarSign, RefreshCw, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneInput } from '@/components/ui/phone-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import type { Client } from '../types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOrganizations, useUsers } from '@/features/admin/hooks/useAdmin';

const clientSchema = z.object({
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
    email: z.string().optional().default('').refine(val => !val || z.string().email().safeParse(val).success, {
        message: 'Email inválido',
    }),
    phone: z.string().optional().default('').refine(val => !val || isValidPhoneNumber(val), {
        message: 'Teléfono inválido para el país seleccionado',
    }),
    type: z.enum(['buyer', 'seller']).default('buyer'),
    status: z.enum(['active', 'inactive', 'closed', 'archived']).default('active'),
    source: z.enum(['referral', 'portal', 'social', 'walk-in']).default('referral'),

    // NURC Fields
    necessity: z.string().min(3, 'Por favor, detalla la necesidad'),
    urgency: z.string().min(3, 'Por favor, detalla la urgencia'),
    realism: z.string().min(3, 'Por favor, detalla el realismo'),
    capacity: z.string().min(3, 'Por favor, detalla la capacidad'),

    budgetMin: z.coerce.number().min(0).default(0),
    budgetMax: z.coerce.number().min(0).default(0),
    preferredZones: z.string().optional().default(''),
    tags: z.string().optional().default(''),
    searchPropertyTypes: z.array(z.string()).default([]),
    searchBedrooms: z.array(z.string()).default([]),
    searchPaymentMethods: z.array(z.string()).default([]),
    organizationId: z.string().optional(),
    agentId: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
    onSuccess?: () => void;
    client?: Client;
}

const STEPS = [
    { id: 'identity', title: 'Identificación', icon: User },
    { id: 'n', title: 'Necesidad (N)', icon: Target },
    { id: 'u', title: 'Urgencia (U)', icon: Target },
    { id: 'r', title: 'Realismo (R)', icon: Target },
    { id: 'c', title: 'Capacidad (C)', icon: Target },
    { id: 'extra', title: 'Detalles Finales', icon: MapPin },
];

export function ClientForm({ onSuccess, client }: ClientFormProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const createClient = useCreateClient();
    const updateClient = useUpdateClient();
    const isEditing = !!client;

    // Auth y roles
    const { data: auth } = useAuth();
    const role = auth?.profile?.role;
    const isGod = role === 'god';
    const isParent = role === 'parent';
    const isGodOrParent = isGod || isParent;

    // Solo cargar orgs/users si es necesario
    const { data: organizations } = useOrganizations();
    const { data: allUsers } = useUsers();

    // Estado para org seleccionada
    const [selectedOrgId, setSelectedOrgId] = useState<string>(
        auth?.profile?.organization_id || ''
    );

    // Filtrar agentes por org
    const filteredAgents = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter((u: any) => u.organization_id === selectedOrgId);
    }, [allUsers, selectedOrgId]);

    // Sincronizar selectedOrgId cuando auth cargue
    useEffect(() => {
        if (auth?.profile?.organization_id && !selectedOrgId) {
            setSelectedOrgId(auth.profile.organization_id);
        }
    }, [auth?.profile?.organization_id, selectedOrgId]);

    const parseNURC = (motivation: string | null, target: 'N' | 'U' | 'R' | 'C') => {
        if (!motivation) return '';
        const regex = new RegExp(`${target}: (.*?)(?=\\n[NURC]:|$)`, 's');
        const match = motivation.match(regex);
        return match ? match[1].trim() : '';
    };

    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema) as any,
        defaultValues: {
            firstName: client?.first_name || '',
            lastName: client?.last_name || '',
            email: client?.email || '',
            phone: client?.phone || '',
            type: client?.type || 'buyer',
            status: client?.status || 'active',
            source: client?.source || 'referral',
            necessity: parseNURC(client?.motivation || null, 'N'),
            urgency: parseNURC(client?.motivation || null, 'U'),
            realism: parseNURC(client?.motivation || null, 'R'),
            capacity: parseNURC(client?.motivation || null, 'C'),
            budgetMin: client?.budget_min || 0,
            budgetMax: client?.budget_max || 0,
            preferredZones: client?.preferred_zones?.join(', ') || '',
            tags: client?.tags?.join(', ') || '',
            searchPropertyTypes: client?.search_property_types || [],
            searchBedrooms: client?.search_bedrooms || [],
            searchPaymentMethods: client?.search_payment_methods || [],
        },
    });

    const { data: propertyTypes } = usePropertyTypes();

    const onSubmit = async (values: ClientFormValues) => {
        const loadingToast = toast.loading(isEditing ? 'Actualizando cliente...' : 'Registrando cliente...');
        try {
            const payload = {
                ...values,
                motivation: `N: ${values.necessity}\nU: ${values.urgency}\nR: ${values.realism}\nC: ${values.capacity}`,
                preferredZones: values.preferredZones ? values.preferredZones.split(',').map(z => z.trim()).filter(Boolean) : [],
                tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                preferences: {
                    nurc: {
                        n: values.necessity,
                        u: values.urgency,
                        r: values.realism,
                        c: values.capacity
                    }
                },
                searchPropertyTypes: values.searchPropertyTypes,
                searchBedrooms: values.searchBedrooms,
                searchPaymentMethods: values.searchPaymentMethods,
                organizationId: values.organizationId || undefined,
                agentId: values.agentId || undefined,
            };

            const result = isEditing
                ? await updateClient.mutateAsync({ ...payload, id: client.id } as any)
                : await createClient.mutateAsync(payload as any);

            toast.dismiss(loadingToast);

            if (result.success) {
                toast.success(isEditing ? 'Cliente actualizado correctamente' : 'Cliente registrado correctamente');
                if (!isEditing) form.reset();
                onSuccess?.();
            } else {
                toast.error(result.error || 'Error desconocido');
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Form submission error:', error);
            toast.error(isEditing ? 'Error al actualizar el cliente' : 'Error al intentar registrar el cliente');
        }
    };

    const nextStep = async () => {
        const fields = getFieldsForStep(currentStep);
        const isValid = await form.trigger(fields as any);
        if (isValid) {
            setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
        }
    };

    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    const getFieldsForStep = (step: number) => {
        switch (step) {
            case 0: return ['firstName', 'lastName', 'type', 'phone', 'email'];
            case 1: return ['necessity'];
            case 2: return ['urgency'];
            case 3: return ['realism'];
            case 4: return ['capacity', 'searchPaymentMethods'];
            case 5: return ['budgetMin', 'budgetMax', 'preferredZones', 'tags'];
            default: return [];
        }
    };

    return (
        <div className="space-y-8 py-4">
            {/* Progress Bar */}
            <div className="flex justify-between items-center px-2">
                {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = idx === currentStep;
                    const isCompleted = idx < currentStep;
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 flex-1">
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                ${isActive ? 'bg-purple-600 text-white ring-4 ring-purple-600/20' :
                                    isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}
                            `}>
                                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                            </div>
                            <span className={`text-[10px] font-medium uppercase tracking-tighter ${isActive ? 'text-purple-400' : 'text-slate-600'}`}>
                                {step.title}
                            </span>
                        </div>
                    );
                })}
            </div>

            <style jsx global>{`
                .property-type-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: 0.5rem;
                }
            `}</style>

            <Form {...form}>
                <form
                    onSubmit={(e) => { e.preventDefault(); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                        }
                    }}
                    className="min-h-[300px] flex flex-col justify-between"
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {currentStep === 0 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="firstName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-300">Nombre</FormLabel>
                                                    <FormControl>
                                                        <Input autoFocus placeholder="Ej. Juan" className="bg-slate-800/50 border-slate-700 h-12" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="lastName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-300">Apellido</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ej. Perez" className="bg-slate-800/50 border-slate-700 h-12" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-300">Tipo de Perfil</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-slate-800/50 border-slate-700 h-12">
                                                            <SelectValue placeholder="Seleccionar" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                                        <SelectItem value="buyer">Comprador</SelectItem>
                                                        <SelectItem value="seller">Vendedor</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Selectores de Org/Agente para God/Parent */}
                                    {isGodOrParent && (
                                        <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                            {isGod && (
                                                <FormField
                                                    control={form.control}
                                                    name="organizationId"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-purple-300 text-xs">Oficina</FormLabel>
                                                            <Select
                                                                value={field.value || selectedOrgId}
                                                                onValueChange={(v) => {
                                                                    field.onChange(v);
                                                                    setSelectedOrgId(v);
                                                                    form.setValue('agentId', '');
                                                                }}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger className="bg-slate-800/50 border-slate-700 h-10">
                                                                        <SelectValue placeholder="Mi oficina" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                                                    {organizations?.map((org: any) => (
                                                                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                            <FormField
                                                control={form.control}
                                                name="agentId"
                                                render={({ field }) => (
                                                    <FormItem className={isGod ? '' : 'col-span-2'}>
                                                        <FormLabel className="text-purple-300 text-xs">Asignar a Agente</FormLabel>
                                                        <Select
                                                            value={field.value || '_self'}
                                                            onValueChange={(v) => field.onChange(v === '_self' ? '' : v)}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="bg-slate-800/50 border-slate-700 h-10">
                                                                    <SelectValue placeholder="Yo mismo" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                                                <SelectItem value="_self">Yo mismo</SelectItem>
                                                                {filteredAgents.filter((a: any) => a.id !== auth?.id).map((agent: any) => (
                                                                    <SelectItem key={agent.id} value={agent.id}>
                                                                        {agent.first_name} {agent.last_name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <FormField
                                            control={form.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-400 text-xs flex items-center gap-1">
                                                        <Phone className="w-3 h-3" /> Teléfono
                                                    </FormLabel>
                                                    <FormControl>
                                                        <PhoneInput
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                            className="bg-slate-800/50"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-400 text-xs flex items-center gap-1">
                                                        <Mail className="w-3 h-3" /> Email
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="juan@mail.com" className="bg-slate-800/50 border-slate-700" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {form.watch('type') === 'buyer' && (
                                        <div className="space-y-4 pt-2 border-t border-slate-800/50 mt-4 animate-in fade-in slide-in-from-top-4">
                                            <FormField
                                                control={form.control}
                                                name="searchPropertyTypes"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormLabel className="text-slate-300 flex items-center gap-2">
                                                            <Home className="w-4 h-4 text-purple-400" /> ¿Qué tipo de propiedad busca?
                                                        </FormLabel>
                                                        <div className="property-type-grid">
                                                            {propertyTypes?.map((pt) => {
                                                                const Icon = getIconForPropertyType(pt.name);
                                                                const isSelected = field.value.includes(pt.id);
                                                                return (
                                                                    <button
                                                                        key={pt.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newValue = isSelected
                                                                                ? field.value.filter(id => id !== pt.id)
                                                                                : [...field.value, pt.id];
                                                                            field.onChange(newValue);
                                                                        }}
                                                                        className={`
                                                                            flex flex-col items-center justify-center p-3 rounded-xl border transition-all
                                                                            ${isSelected
                                                                                ? 'bg-purple-600/20 border-purple-500 text-purple-200 ring-1 ring-purple-500'
                                                                                : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600'}
                                                                        `}
                                                                    >
                                                                        <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-purple-400' : 'text-slate-500'}`} />
                                                                        <span className="text-[10px] font-semibold text-center leading-tight">{pt.name}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="searchBedrooms"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormLabel className="text-slate-300 flex items-center gap-2">
                                                            <Building2 className="w-4 h-4 text-purple-400" /> Ambientes / Dormitorios
                                                        </FormLabel>
                                                        <div className="flex gap-2">
                                                            {['Mono', '1', '2', '3', '4+'].map((opt) => {
                                                                const isSelected = field.value.includes(opt);
                                                                return (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newValue = isSelected
                                                                                ? field.value.filter(i => i !== opt)
                                                                                : [...field.value, opt];
                                                                            field.onChange(newValue);
                                                                        }}
                                                                        className={`
                                                                            flex-1 py-3 px-2 rounded-lg border text-sm font-bold transition-all
                                                                            ${isSelected
                                                                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                                                                                : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600'}
                                                                        `}
                                                                    >
                                                                        {opt === 'Mono' ? 'Mono' : `${opt} Dorm`}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStep === 1 && (
                                <FormField
                                    control={form.control}
                                    name="necessity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xl font-bold text-white mb-2">Necesidad (N)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    autoFocus
                                                    placeholder="¿Qué es lo que verdaderamente necesita el cliente y por qué? Detalla su motivación de fondo."
                                                    className="bg-slate-800/50 border-slate-700 min-h-[150px] text-lg p-4"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {currentStep === 2 && (
                                <FormField
                                    control={form.control}
                                    name="urgency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xl font-bold text-white mb-2">Urgencia (U)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    autoFocus
                                                    placeholder="¿Para cuándo necesita concretar la operación? ¿Qué sucede si no lo logra en ese plazo?"
                                                    className="bg-slate-800/50 border-slate-700 min-h-[150px] text-lg p-4"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {currentStep === 3 && (
                                <FormField
                                    control={form.control}
                                    name="realism"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xl font-bold text-white mb-2">Realismo (R)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    autoFocus
                                                    placeholder="¿Sus expectativas de precio y producto son acordes a la realidad actual del mercado?"
                                                    className="bg-slate-800/50 border-slate-700 min-h-[150px] text-lg p-4"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {currentStep === 4 && (
                                <div className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="capacity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xl font-bold text-white mb-2">Capacidad (C)</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        autoFocus
                                                        placeholder="¿Cuenta con los fondos disponibles? ¿Necesita vender para comprar o requiere financiación?"
                                                        className="bg-slate-800/50 border-slate-700 min-h-[150px] text-lg p-4"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {form.watch('type') === 'buyer' && (
                                        <FormField
                                            control={form.control}
                                            name="searchPaymentMethods"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3 pt-4 animate-in fade-in slide-in-from-top-2">
                                                    <FormLabel className="text-slate-300 flex items-center gap-2">
                                                        <DollarSign className="w-4 h-4 text-emerald-400" /> Forma de Pago
                                                    </FormLabel>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            { id: 'cash', label: 'Efectivo', icon: DollarSign },
                                                            { id: 'swap', label: 'Permuta', icon: RefreshCw },
                                                            { id: 'loan', label: 'Financiación', icon: CreditCard },
                                                            { id: 'mix', label: 'Efectivo + Permuta', icon: RefreshCw }
                                                        ].map((opt) => {
                                                            const isSelected = field.value.includes(opt.id);
                                                            const Icon = opt.icon;
                                                            return (
                                                                <button
                                                                    key={opt.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newValue = isSelected
                                                                            ? field.value.filter(id => id !== opt.id)
                                                                            : [...field.value, opt.id];
                                                                        field.onChange(newValue);
                                                                    }}
                                                                    className={`
                                                                        flex items-center gap-2 py-2 px-4 rounded-full border text-sm font-medium transition-all
                                                                        ${isSelected
                                                                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                                                                            : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600'}
                                                                    `}
                                                                >
                                                                    <Icon className="w-4 h-4" />
                                                                    {opt.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            )}

                            {currentStep === 5 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="budgetMin"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-300">Presupuesto Min</FormLabel>
                                                    <FormControl>
                                                        <Input autoFocus type="number" className="bg-slate-800/50 border-slate-700 h-12" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="budgetMax"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-300">Presupuesto Max</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" className="bg-slate-800/50 border-slate-700 h-12" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="preferredZones"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-300">Zonas de Interés</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ej. Palermo, Belgrano..." className="bg-slate-800/50 border-slate-700 h-12" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="tags"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-300">Etiquetas / Tags</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ej. Urgente, Contado, Reubicación" className="bg-slate-800/50 border-slate-700 h-12" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="flex gap-4 pt-8 mt-auto">
                        {currentStep > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={prevStep}
                                className="flex-1 bg-transparent border-slate-700 hover:bg-slate-800 h-12"
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
                            </Button>
                        )}

                        {currentStep < STEPS.length - 1 ? (
                            <Button
                                type="button"
                                onClick={nextStep}
                                className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white font-bold h-12"
                            >
                                Siguiente <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={() => form.handleSubmit(onSubmit)()}
                                className="flex-[2] bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold h-12 shadow-lg shadow-purple-500/20"
                                disabled={isEditing ? updateClient.isPending : createClient.isPending}
                            >
                                {isEditing ? (
                                    updateClient.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Actualizando...
                                        </>
                                    ) : 'Guardar Cambios'
                                ) : (
                                    createClient.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Registrando...
                                        </>
                                    ) : 'Finalizar Registro'
                                )}
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </div>
    );
}

function getIconForPropertyType(name: string) {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('casa')) return Home;
    if (lowercaseName.includes('departamento')) return Building;
    if (lowercaseName.includes('ph')) return Building2;
    if (lowercaseName.includes('local')) return Store;
    if (lowercaseName.includes('oficina')) return Briefcase;
    if (lowercaseName.includes('terreno')) return Map;
    if (lowercaseName.includes('cochera')) return Car;
    if (lowercaseName.includes('depósito') || lowercaseName.includes('galpón')) return Warehouse;
    if (lowercaseName.includes('campo')) return Tractor;
    if (lowercaseName.includes('hotel')) return Hotel;
    return Building;
}
