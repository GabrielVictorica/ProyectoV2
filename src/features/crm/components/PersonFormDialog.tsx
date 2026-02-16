'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { SmartCreatableSelect } from "@/components/ui/smart-creatable-select";
import { SmartMultiSelect, MultiSelectOptionGroup } from "@/components/ui/smart-multi-select";
import { cn } from "@/lib/utils";

// --- Option Constants ---
const OCCUPATIONS = [
    'Abogado', 'Arquitecto', 'Contador', 'Médico', 'Ingeniero',
    'Comerciante', 'Empresario', 'Desarrollador', 'Docente',
    'Estudiante', 'Jubilado'
];

const FAMILY_COMPOSITIONS = [
    'Soltero/a', 'En pareja', 'Casado/a', 'Divorciado/a',
    'Viudo/a', 'Familia con hijos', 'Monoparental'
];

const SOURCES = [
    'Instagram', 'Facebook', 'Google', 'Referido',
    'Portal Inmobiliario', 'Cartel', 'Networking', 'Farming'
];

const TAG_GROUPS: MultiSelectOptionGroup[] = [
    {
        label: 'Perfil',
        options: ['Inversor', 'Desarrollador', 'VIP', 'Requiere Atención', 'Embajador']
    },
    {
        label: 'Proyecto',
        options: ['Primer Hogar', 'Agrandarse', 'Achicarse', 'Inversión / Renta', 'Vacacional / Descanso']
    },
    {
        label: 'Estado',
        options: ['Caliente', 'Tibio', 'Frío']
    }
];

const RELATIONSHIP_STATUSES = [
    { value: 'reunion_verde', label: 'Reunión Verde', description: 'Primer contacto o reunión inicial' },
    { value: 'pre_listing', label: 'Pre-Listing', description: 'Proceso de preparación antes de captar' },
    { value: 'pre_buying', label: 'Pre-Buying', description: 'Análisis preliminar antes de búsqueda' },
    { value: 'acm', label: 'ACM', description: 'Análisis Comparativo de Mercado' },
    { value: 'captacion', label: 'Captación', description: 'Propiedad listada y activa' },
    { value: 'visita', label: 'Visita', description: 'Visitando propiedades activamente' },
    { value: 'reserva', label: 'Reserva', description: 'Oferta formal realizada o aceptada' },
    { value: 'cierre', label: 'Cierre', description: 'Proceso de escritura y cierre' },
    { value: 'referido', label: 'Referido', description: 'Generador de nuevos leads' },
];

const INFLUENCE_CATEGORIES = [
    { value: 4, label: 'A', activeBg: 'bg-violet-500/20', activeBorder: 'border-violet-500/50', activeShadow: 'shadow-violet-500/20', activeText: 'text-violet-400', activeGlow: 'border-violet-500/30', description: 'Te refieren clientes sin que se lo pidas.' },
    { value: 3, label: 'B', activeBg: 'bg-blue-500/20', activeBorder: 'border-blue-500/50', activeShadow: 'shadow-blue-500/20', activeText: 'text-blue-400', activeGlow: 'border-blue-500/30', description: 'Te refieren si se lo pides.' },
    { value: 2, label: 'C', activeBg: 'bg-slate-500/20', activeBorder: 'border-slate-500/50', activeShadow: 'shadow-slate-500/20', activeText: 'text-slate-400', activeGlow: 'border-slate-500/30', description: 'Te caen bien, pero no refieren.' },
    { value: 1, label: 'D', activeBg: 'bg-rose-500/20', activeBorder: 'border-rose-500/50', activeShadow: 'shadow-rose-500/20', activeText: 'text-rose-400', activeGlow: 'border-rose-500/30', description: 'Te caen mal y no refieren.' },
];
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Person, RelationshipStatus } from '@/features/clients/types';
import { createPersonAction, updatePersonAction } from '../actions/personActions';
import { personSchema } from '../schemas/personSchema';
import { toast } from 'sonner';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, User, Briefcase, Heart, Shield, Users, MessageSquare, Settings, Calendar, Hash, MapPin, Tag, Clock, Star, UserCheck } from 'lucide-react';
import { PhoneInput } from '@/components/ui/phone-input';
import { DateMaskedInput } from '@/components/ui/date-masked-input';
import { PersonSelector } from '@/features/clients/components/shared/PersonSelector';
import { useCRM } from "../hooks/useCRM";

// --- Schema ---
// We use a local schema for the form to handle UI-specific requirements (like tags as string)
const personFormSchema = z.object({
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
    email: z.string().default(''),
    phone: z.string().min(1, 'El teléfono es obligatorio'),
    dniCuil: z.string().default(''),
    birthday: z.string().default(''),
    familyComposition: z.string().default(''),
    familyNotes: z.string().default(''),
    occupationCompany: z.string().default(''),
    interestsHobbies: z.string().default(''),
    personalityNotes: z.string().default(''),
    contactType: z.array(z.string()).default([]),
    source: z.string().min(1, 'La fuente es obligatoria'),
    referredById: z.string().default(''),
    influenceLevel: z.number().min(1).max(5).default(3),
    preferredChannel: z.string().default(''),
    bestContactTime: z.string().default(''),
    relationshipStatus: z.string().min(1, 'Estado requerido'),
    lastInteractionAt: z.string().default(''),
    nextActionAt: z.string().default(''),
    tags: z.string().default(''),
    agentId: z.string().default(''),
});

type PersonFormValues = z.infer<typeof personFormSchema>;

interface PersonFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    person?: Person | null;
    initialData?: Partial<PersonFormValues>;
    onSuccess?: (person: Person) => void;
    agents?: { id: string, first_name: string, last_name: string }[];
}

// --- Tab definitions ---
const TABS = [
    { value: 'identity', label: 'Contacto', icon: MessageSquare, step: 1 },
    { value: 'profile', label: 'Quién es', icon: User, step: 2 },
    { value: 'relationship', label: 'Negocio', icon: Briefcase, step: 3 },
    { value: 'management', label: 'Seguimiento', icon: Clock, step: 4 },
] as const;

// --- Reusable icon input wrapper ---
function IconInput({ icon: Icon, children }: { icon: React.ElementType, children: React.ReactNode }) {
    return (
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                <Icon className="w-4 h-4" />
            </div>
            {children}
        </div>
    );
}

// --- Animation wrapper ---
function TabAnimation({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    );
}

// --- Shared classNames ---
const inputClass = "bg-white/[0.03] border-white/[0.10] rounded-xl focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all placeholder:text-white/20";
const inputWithIconClass = `${inputClass} pl-10`;
const labelClass = "text-white/70 text-xs font-medium uppercase tracking-wider";
const sectionTitleClass = "text-sm font-bold text-white/80 flex items-center gap-2 mb-1";

export function PersonFormDialog({ open, onOpenChange, person, initialData, onSuccess, agents = [] }: PersonFormDialogProps) {
    const isEditing = !!person;
    const [activeTab, setActiveTab] = useState('identity');

    const form = useForm<PersonFormValues>({
        resolver: zodResolver(personFormSchema) as any,
        defaultValues: {
            firstName: person?.first_name || initialData?.firstName || '',
            lastName: person?.last_name || initialData?.lastName || '',
            email: person?.email || initialData?.email || '',
            phone: person?.phone || initialData?.phone || '',
            dniCuil: person?.dni_cuil || initialData?.dniCuil || '',
            birthday: person?.birthday || initialData?.birthday || '',
            familyComposition: person?.family_composition || initialData?.familyComposition || '',
            familyNotes: person?.family_notes || initialData?.familyNotes || '',
            occupationCompany: person?.occupation_company || initialData?.occupationCompany || '',
            interestsHobbies: person?.interests_hobbies || initialData?.interestsHobbies || '',
            personalityNotes: person?.personality_notes || initialData?.personalityNotes || '',
            contactType: (person?.contact_type as string[]) || initialData?.contactType || [],
            source: person?.source || initialData?.source || 'Instagram',
            referredById: person?.referred_by_id || initialData?.referredById || '',
            influenceLevel: person?.influence_level || initialData?.influenceLevel || 3,
            preferredChannel: person?.preferred_channel || initialData?.preferredChannel || '',
            bestContactTime: person?.best_contact_time || initialData?.bestContactTime || '',
            relationshipStatus: person?.relationship_status || initialData?.relationshipStatus || 'reunion_verde',
            lastInteractionAt: person?.last_interaction_at ? new Date(person.last_interaction_at).toISOString().split('T')[0] : (initialData?.lastInteractionAt || ''),
            nextActionAt: person?.next_action_at ? new Date(person.next_action_at).toISOString().split('T')[0] : (initialData?.nextActionAt || ''),
            tags: person?.tags?.join(', ') || initialData?.tags || '',
            agentId: person?.agent_id || initialData?.agentId || '',
        },
    });

    // Reset form when person changes or dialog opens
    useEffect(() => {
        if (open) {
            setActiveTab('identity');
            form.reset({
                firstName: person?.first_name || initialData?.firstName || '',
                lastName: person?.last_name || initialData?.lastName || '',
                email: person?.email || initialData?.email || '',
                phone: person?.phone || initialData?.phone || '',
                dniCuil: person?.dni_cuil || initialData?.dniCuil || '',
                birthday: person?.birthday || initialData?.birthday || '',
                familyComposition: person?.family_composition || initialData?.familyComposition || '',
                familyNotes: person?.family_notes || initialData?.familyNotes || '',
                occupationCompany: person?.occupation_company || initialData?.occupationCompany || '',
                interestsHobbies: person?.interests_hobbies || initialData?.interestsHobbies || '',
                personalityNotes: person?.personality_notes || initialData?.personalityNotes || '',
                contactType: (person?.contact_type as string[]) || initialData?.contactType || [],
                source: person?.source || initialData?.source || 'Instagram',
                referredById: person?.referred_by_id || initialData?.referredById || '',
                influenceLevel: person?.influence_level || initialData?.influenceLevel || 3,
                preferredChannel: person?.preferred_channel || initialData?.preferredChannel || '',
                bestContactTime: person?.best_contact_time || initialData?.bestContactTime || '',
                relationshipStatus: person?.relationship_status || initialData?.relationshipStatus || 'reunion_verde',
                lastInteractionAt: person?.last_interaction_at ? new Date(person.last_interaction_at).toISOString().split('T')[0] : (initialData?.lastInteractionAt || ''),
                nextActionAt: person?.next_action_at ? new Date(person.next_action_at).toISOString().split('T')[0] : (initialData?.nextActionAt || ''),
                tags: person?.tags?.join(', ') || initialData?.tags || '',
                agentId: person?.agent_id || initialData?.agentId || '',
            });
        }
    }, [person, initialData, open, form]);

    const currentTabIndex = TABS.findIndex(t => t.value === activeTab);
    const currentStep = currentTabIndex + 1;
    const watchedSource = form.watch('source');

    const { createPerson, updatePerson } = useCRM();

    const onSubmit: SubmitHandler<PersonFormValues> = async (values) => {
        try {
            // Convert tags from string to array for the action
            const actionData = {
                ...values,
                tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : []
            };

            // Normalize for the callback (Person interface uses snake_case)
            const normalizedPerson = {
                ...person,
                ...actionData,
                first_name: values.firstName,
                last_name: values.lastName,
                dni_cuil: values.dniCuil,
                family_composition: values.familyComposition,
                family_notes: values.familyNotes,
                occupation_company: values.occupationCompany,
                interests_hobbies: values.interestsHobbies,
                personality_notes: values.personalityNotes,
                referred_by_id: values.referredById,
                influence_level: values.influenceLevel,
                relationship_status: values.relationshipStatus,
                last_interaction_at: values.lastInteractionAt,
                next_action_at: values.nextActionAt,
            };

            if (isEditing) {
                const result = await updatePerson.mutateAsync({ id: person!.id, data: actionData });
                if (result.success && result.data) {
                    onSuccess?.(result.data);
                }
            } else {
                const result = await createPerson.mutateAsync(actionData as any);
                if (result.success && result.data) {
                    onSuccess?.(result.data);
                }
            }
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar los cambios');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-[#09090b] border-white/10 shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] text-white p-0 overflow-hidden z-[10000]" overlayClassName="z-[10000]">
                {/* Header */}
                <DialogHeader className="p-6 pb-4 border-b border-white/[0.06] bg-gradient-to-r from-violet-600/[0.04] to-transparent">
                    <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                        <div className="p-2.5 rounded-xl bg-violet-600/10 border border-violet-500/20">
                            <User className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            {isEditing ? 'Editar Relación' : 'Nueva Persona en CRM'}
                            <p className="text-xs font-normal text-white/30 mt-0.5">
                                {isEditing ? `${person?.first_name} ${person?.last_name}` : 'Completá los datos para registrar una nueva relación'}
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); (form.handleSubmit(onSubmit) as any)(e); }} className="space-y-0">
                        <div className="p-0">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                {/* Tab Navigation */}
                                <TabsList className="w-full justify-start rounded-none border-b border-white/[0.06] bg-white/[0.015] h-12 p-0">
                                    {TABS.map((tab) => (
                                        <TabsTrigger
                                            key={tab.value}
                                            value={tab.value}
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:bg-white/[0.03] data-[state=active]:text-violet-300 h-full px-4 gap-2 text-white/40 hover:text-white/60 transition-colors"
                                        >
                                            <tab.icon className="w-3.5 h-3.5" />
                                            <span className="text-xs font-medium">{tab.label}</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {/* Tab Content */}
                                <ScrollArea className="h-[calc(max(400px,min(600px,75vh))-140px)] p-6">

                                    {/* ═══ TAB 1: IDENTIDAD Y COMUNICACIÓN ═══ */}
                                    <TabsContent value="identity" className="m-0 space-y-5" forceMount style={{ display: activeTab === 'identity' ? 'block' : 'none' }}>
                                        <TabAnimation>
                                            <div className="space-y-5">
                                                <h3 className={sectionTitleClass}>
                                                    <MessageSquare className="w-4 h-4 text-emerald-400" /> Identidad y Contacto Principal
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="firstName" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Nombre *</FormLabel>
                                                            <IconInput icon={User}>
                                                                <FormControl><Input {...field} placeholder="Ej: Juan" className={inputWithIconClass} /></FormControl>
                                                            </IconInput>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="lastName" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Apellido *</FormLabel>
                                                            <IconInput icon={User}>
                                                                <FormControl><Input {...field} placeholder="Ej: Pérez" className={inputWithIconClass} /></FormControl>
                                                            </IconInput>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="email" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Email</FormLabel>
                                                            <IconInput icon={Mail}>
                                                                <FormControl><Input {...field} type="email" placeholder="correo@ejemplo.com" className={inputWithIconClass} /></FormControl>
                                                            </IconInput>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="phone" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Teléfono</FormLabel>
                                                            <FormControl>
                                                                <PhoneInput
                                                                    value={field.value}
                                                                    onChange={field.onChange}
                                                                    placeholder="Ingresar teléfono"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="preferredChannel" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Canal Preferido</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className={`${inputClass} w-full`}>
                                                                        <SelectValue placeholder="Seleccionar canal" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent position="popper" sideOffset={4} className="bg-[#1a1a1e] border-white/[0.08] text-white">
                                                                    <SelectItem value="WhatsApp">📱 WhatsApp</SelectItem>
                                                                    <SelectItem value="Llamada">📞 Llamada</SelectItem>
                                                                    <SelectItem value="Email">📧 Email</SelectItem>
                                                                    <SelectItem value="LinkedIn">💼 LinkedIn</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="bestContactTime" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Horario de Contacto</FormLabel>
                                                            <IconInput icon={Clock}>
                                                                <FormControl><Input {...field} placeholder="Ej: Mañanas 9-11hs" className={inputWithIconClass} /></FormControl>
                                                            </IconInput>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                            </div>
                                        </TabAnimation>
                                    </TabsContent>

                                    {/* ═══ TAB 2: PERFIL HUMANO Y PERMANENTE ═══ */}
                                    <TabsContent value="profile" className="m-0 space-y-5" forceMount style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
                                        <TabAnimation>
                                            <div className="space-y-5">
                                                <h3 className={sectionTitleClass}>
                                                    <Heart className="w-4 h-4 text-pink-400" /> Perfil y Datos Estables
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="dniCuil" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>DNI / CUIL</FormLabel>
                                                            <IconInput icon={Hash}>
                                                                <FormControl><Input {...field} placeholder="20-12345678-9" className={inputWithIconClass} /></FormControl>
                                                            </IconInput>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="birthday" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Cumpleaños</FormLabel>
                                                            <FormControl>
                                                                <DateMaskedInput
                                                                    value={field.value}
                                                                    onChange={field.onChange}
                                                                    placeholder="dd/mm/aaaa"
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <FormField control={form.control} name="occupationCompany" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className={labelClass}>Profesión / Empresa</FormLabel>
                                                        <FormControl>
                                                            <SmartCreatableSelect
                                                                options={OCCUPATIONS}
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                title="Seleccionar profesión"
                                                                placeholder="Buscar o crear profesión..."
                                                                icon={Briefcase}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="familyComposition" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className={labelClass}>Composición Familiar</FormLabel>
                                                        <FormControl>
                                                            <SmartCreatableSelect
                                                                options={FAMILY_COMPOSITIONS}
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                title="Seleccionar composición"
                                                                placeholder="Buscar..."
                                                                icon={Users}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="familyNotes" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className={labelClass}>Notas Familiares</FormLabel>
                                                        <FormControl>
                                                            <Textarea {...field} placeholder="Hijos: Martín (8), Lucía (5). Mascota: Rocky (golden retriever)..." className={`${inputClass} min-h-[60px] text-sm`} />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="interestsHobbies" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className={labelClass}>Intereses / Hobbies</FormLabel>
                                                        <IconInput icon={Star}>
                                                            <FormControl><Input {...field} placeholder="Ej: Golf, Inversiones, Autos" className={inputWithIconClass} /></FormControl>
                                                        </IconInput>
                                                    </FormItem>
                                                )} />
                                            </div>
                                        </TabAnimation>
                                    </TabsContent>

                                    {/* ═══ TAB 3: CONFIGURACIÓN DE RELACIÓN ═══ */}
                                    <TabsContent value="relationship" className="m-0 space-y-5" forceMount style={{ display: activeTab === 'relationship' ? 'block' : 'none' }}>
                                        <TabAnimation>
                                            <div className="space-y-5">
                                                <h3 className={sectionTitleClass}>
                                                    <Briefcase className="w-4 h-4 text-blue-400" /> Contexto de Negocio
                                                </h3>
                                                <div className="flex flex-col gap-5">
                                                    <FormField control={form.control} name="contactType" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Tipo de Relación</FormLabel>
                                                            <FormControl>
                                                                <SmartMultiSelect
                                                                    groups={[
                                                                        {
                                                                            label: "Negocio Principal",
                                                                            options: ["comprador", "vendedor", "inquilino", "otro"]
                                                                        },
                                                                        {
                                                                            label: "Relación Personal",
                                                                            options: ["cliente", "amigo", "familiar", "conocido", "socio", "colega", "referente"]
                                                                        }
                                                                    ]}
                                                                    selected={field.value}
                                                                    onChange={field.onChange}
                                                                    title="Seleccionar roles"
                                                                    placeholder="Buscar rol..."
                                                                    icon={Tag}
                                                                    className={inputClass}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />

                                                    <FormField control={form.control} name="influenceLevel" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Nivel de Influencia (ABCD)</FormLabel>
                                                            <div className="grid grid-cols-4 gap-2 mt-1">
                                                                {INFLUENCE_CATEGORIES.map((cat) => (
                                                                    <button
                                                                        key={cat.value}
                                                                        type="button"
                                                                        onClick={() => field.onChange(cat.value)}
                                                                        className={cn(
                                                                            "relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all h-14",
                                                                            field.value === cat.value
                                                                                ? `${cat.activeBg} ${cat.activeBorder} shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)] ${cat.activeShadow}`
                                                                                : "bg-white/[0.02] border-white/[0.08] hover:border-white/20"
                                                                        )}
                                                                    >
                                                                        <span className={cn(
                                                                            "text-lg font-black",
                                                                            field.value === cat.value ? cat.activeText : "text-white/20"
                                                                        )}>
                                                                            {cat.label}
                                                                        </span>
                                                                        {field.value === cat.value && (
                                                                            <motion.div
                                                                                layoutId="activeGlow"
                                                                                className={cn("absolute inset-0 rounded-xl border-2 pointer-events-none", cat.activeGlow)}
                                                                                initial={false}
                                                                            />
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <AnimatePresence mode="wait">
                                                                {field.value && (
                                                                    <motion.p
                                                                        key={field.value}
                                                                        initial={{ opacity: 0, x: -5 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        exit={{ opacity: 0, x: 5 }}
                                                                        className="text-[10px] text-white/50 mt-1.5 italic leading-tight"
                                                                    >
                                                                        {INFLUENCE_CATEGORIES.find(c => c.value === field.value)?.description}
                                                                    </motion.p>
                                                                )}
                                                            </AnimatePresence>
                                                        </FormItem>
                                                    )} />

                                                    <div className={`grid gap-4 ${watchedSource === 'Referido' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                                        <FormField control={form.control} name="source" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className={labelClass}>Fuente / Origen <span className="text-rose-400">*</span></FormLabel>
                                                                <FormControl>
                                                                    <SmartCreatableSelect
                                                                        options={SOURCES}
                                                                        value={field.value}
                                                                        onChange={field.onChange}
                                                                        title="Seleccionar fuente"
                                                                        placeholder="Buscar..."
                                                                        icon={MapPin}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                        {watchedSource === 'Referido' && (
                                                            <FormField control={form.control} name="referredById" render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className={labelClass}>Referido por (Vincular Persona)</FormLabel>
                                                                    <FormControl>
                                                                        <PersonSelector
                                                                            value={field.value}
                                                                            onChange={field.onChange}
                                                                            placeholder="Buscar o crear persona que refirió..."
                                                                            className={inputClass}
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />
                                                        )}
                                                    </div>

                                                    {agents.length > 0 && (
                                                        <FormField control={form.control} name="agentId" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className={labelClass}>Agente Responsable</FormLabel>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                    <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Seleccionar agente" /></SelectTrigger></FormControl>
                                                                    <SelectContent position="popper" sideOffset={4} className="bg-[#1a1a1e] border-white/[0.08] text-white">
                                                                        {agents.map((agent) => (
                                                                            <SelectItem key={agent.id} value={agent.id}>{agent.first_name} {agent.last_name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )} />
                                                    )}
                                                </div>
                                            </div>
                                        </TabAnimation>
                                    </TabsContent>

                                    {/* ═══ TAB 4: GESTIÓN Y SEGUIMIENTO ═══ */}
                                    <TabsContent value="management" className="m-0 space-y-5" forceMount style={{ display: activeTab === 'management' ? 'block' : 'none' }}>
                                        <TabAnimation>
                                            <div className="space-y-5">
                                                <h3 className={sectionTitleClass}>
                                                    <Clock className="w-4 h-4 text-amber-400" /> Seguimiento y Notas
                                                </h3>
                                                <div className="space-y-4">
                                                    <FormField control={form.control} name="relationshipStatus" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Estado del Proceso</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl><SelectTrigger className={`${inputClass} w-full`}><SelectValue placeholder="Seleccionar estado" /></SelectTrigger></FormControl>
                                                                <SelectContent position="popper" sideOffset={4} className="bg-[#1a1a1e] border-white/[0.08] text-white">
                                                                    {RELATIONSHIP_STATUSES.map((status) => (
                                                                        <SelectItem key={status.value} value={status.value}>
                                                                            <div className="flex flex-col items-start text-left">
                                                                                <span className="font-medium">{status.label}</span>
                                                                                <span className="text-[10px] text-white/40">{status.description}</span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="tags" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Etiquetas / Tags</FormLabel>
                                                            <FormControl>
                                                                <SmartMultiSelect
                                                                    groups={TAG_GROUPS}
                                                                    selected={field.value ? field.value.split(',').map(s => s.trim()).filter(Boolean) : []}
                                                                    onChange={(vals) => field.onChange(vals.join(', '))}
                                                                    title="Seleccionar etiquetas"
                                                                    placeholder="Buscar o crear..."
                                                                    icon={Tag}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="lastInteractionAt" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Último Contacto</FormLabel>
                                                            <FormControl>
                                                                <DateMaskedInput
                                                                    value={field.value}
                                                                    onChange={field.onChange}
                                                                    placeholder="dd/mm/aaaa"
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="nextActionAt" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className={labelClass}>Próximo Compromiso</FormLabel>
                                                            <FormControl>
                                                                <DateMaskedInput
                                                                    value={field.value}
                                                                    onChange={field.onChange}
                                                                    placeholder="dd/mm/aaaa"
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <FormField control={form.control} name="personalityNotes" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className={labelClass}>Perfil / Personalidad</FormLabel>
                                                        <FormControl>
                                                            <Textarea {...field} placeholder="Ej: Detallista, prefiere tratar por las tardes, interesado en inversiones Renta corta..." className={`${inputClass} min-h-[80px]`} />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                            </div>
                                        </TabAnimation>
                                    </TabsContent>

                                </ScrollArea>
                            </Tabs>
                        </div>

                        {/* Footer with progress indicator */}
                        <DialogFooter className="px-6 py-4 border-t border-white/[0.06] bg-white/[0.015] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Progress dots */}
                                <div className="flex items-center gap-1.5">
                                    {TABS.map((tab, i) => (
                                        <div
                                            key={tab.value}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentTabIndex
                                                ? 'w-6 bg-violet-500'
                                                : i < currentTabIndex
                                                    ? 'w-1.5 bg-violet-500/40'
                                                    : 'w-1.5 bg-white/10'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[11px] text-white/25 font-medium">
                                    Paso {currentStep} de {TABS.length} — {TABS[currentTabIndex].label}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {currentTabIndex > 0 ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setActiveTab(TABS[currentTabIndex - 1].value)}
                                        className="text-white/60 h-10 px-5 rounded-xl hover:bg-white/5 text-sm"
                                    >
                                        Anterior
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => onOpenChange(false)}
                                        className="text-white/40 h-10 px-5 rounded-xl hover:bg-white/5 text-sm"
                                    >
                                        Cancelar
                                    </Button>
                                )}

                                {currentTabIndex < TABS.length - 1 ? (
                                    <Button
                                        type="button"
                                        onClick={async () => {
                                            // Partial validation for the current tab
                                            const fieldsByTab: Record<string, (keyof PersonFormValues)[]> = {
                                                identity: ['firstName', 'lastName', 'phone'],
                                                profile: [],
                                                relationship: ['source', 'influenceLevel'],
                                                management: ['relationshipStatus']
                                            };
                                            const fieldsToValidate = fieldsByTab[activeTab] || [];
                                            const isValid = await form.trigger(fieldsToValidate);
                                            if (isValid) {
                                                setActiveTab(TABS[currentTabIndex + 1].value);
                                            } else {
                                                toast.error('Completá los campos obligatorios antes de continuar');
                                            }
                                        }}
                                        className="bg-violet-600 hover:bg-violet-500 text-white h-10 px-7 rounded-xl shadow-lg shadow-violet-500/20 text-sm font-semibold gap-2"
                                    >
                                        Continuar
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            form.handleSubmit(onSubmit, (errors) => {
                                                console.error('Validation errors:', errors);
                                                const errorFields = Object.keys(errors);
                                                const fieldToTab: Record<string, string> = {
                                                    firstName: 'identity', lastName: 'identity', phone: 'identity',
                                                    email: 'identity', preferredChannel: 'identity', bestContactTime: 'identity',
                                                    source: 'relationship', influenceLevel: 'relationship', contactType: 'relationship',
                                                    relationshipStatus: 'management'
                                                };
                                                for (const field of errorFields) {
                                                    if (fieldToTab[field]) {
                                                        setActiveTab(fieldToTab[field]);
                                                        break;
                                                    }
                                                }
                                                toast.error('Completá los campos obligatorios');
                                            })();
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white h-10 px-7 rounded-xl shadow-lg shadow-emerald-500/20 text-sm font-semibold"
                                    >
                                        {isEditing ? 'Guardar Cambios' : 'Crear Relación'}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
