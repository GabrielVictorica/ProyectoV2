'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createOrganizationAction } from '@/features/admin/actions/adminActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { CUITInput, validateCUITChecksum } from '@/components/ui/cuit-input';
import { AddressFields, AddressData, assembleAddress } from '@/components/ui/address-fields';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Building2, FileText, UserPlus, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Schema de validación
const formSchema = z.object({
    // PASO 1: Datos Inmobiliaria
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    slug: z.string()
        .min(2, 'El slug debe tener al menos 2 caracteres')
        .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().optional(),
    // Dirección estructurada
    addressStreet: z.string().optional(),
    addressNumber: z.string().optional(),
    addressFloor: z.string().optional(),
    addressCity: z.string().optional(),
    addressPostalCode: z.string().optional(),
    addressProvince: z.string().optional(),
    // PASO 2: Datos Fiscales
    legal_name: z.string().optional().or(z.literal('')),
    cuit: z.string().optional().or(z.literal('')),
    // Dirección fiscal estructurada
    billingStreet: z.string().optional(),
    billingNumber: z.string().optional(),
    billingFloor: z.string().optional(),
    billingCity: z.string().optional(),
    billingPostalCode: z.string().optional(),
    billingProvince: z.string().optional(),
    // Datos Comerciales
    royalty_percentage: z.coerce.number().min(0).max(100).optional(),
    org_status: z.enum(['active', 'suspended', 'pending_payment']).default('active'),
    // PASO 3: Datos Administrador (Broker)
    brokerEmail: z.string().email('Email del broker inválido'),
    brokerPassword: z.string().min(6, 'Mínimo 6 caracteres'),
    brokerFirstName: z.string().min(2, 'Nombre requerido'),
    brokerLastName: z.string().min(2, 'Apellido requerido'),
    brokerSplitPercentage: z.coerce.number().min(0).max(100).default(100),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
    onSuccess?: () => void;
}

const STEPS = [
    { id: 1, title: 'Oficina', icon: Building2 },
    { id: 2, title: 'Fiscal', icon: FileText },
    { id: 3, title: 'Administrador', icon: UserPlus },
];

export function CreateOrganizationDialog({ onSuccess }: Props) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: '',
            slug: '',
            email: '',
            phone: '',
            addressStreet: '',
            addressNumber: '',
            addressFloor: '',
            addressCity: '',
            addressPostalCode: '',
            addressProvince: '',
            legal_name: '',
            cuit: '',
            billingStreet: '',
            billingNumber: '',
            billingFloor: '',
            billingCity: '',
            billingPostalCode: '',
            billingProvince: '',
            royalty_percentage: 0,
            org_status: 'active' as const,
            brokerEmail: '',
            brokerPassword: '',
            brokerFirstName: '',
            brokerLastName: '',
            brokerSplitPercentage: 100,
        },
    });

    const onSubmit = async (data: FormData) => {
        setError(null);

        // Ensamblar direcciones
        const address = assembleAddress({
            street: data.addressStreet || '',
            number: data.addressNumber || '',
            floor: data.addressFloor || '',
            city: data.addressCity || '',
            postalCode: data.addressPostalCode || '',
            province: data.addressProvince || '',
        });

        const billingAddress = assembleAddress({
            street: data.billingStreet || '',
            number: data.billingNumber || '',
            floor: data.billingFloor || '',
            city: data.billingCity || '',
            postalCode: data.billingPostalCode || '',
            province: data.billingProvince || '',
        });

        const payload = {
            ...data,
            // Legacy strings para backward compatibility
            address,
            billing_address: billingAddress,
            // Estructuras normalizadas para la nueva tabla
            officeAddress: {
                street: data.addressStreet || '',
                number: data.addressNumber || '',
                floor: data.addressFloor || '',
                city: data.addressCity || '',
                postalCode: data.addressPostalCode || '',
                province: data.addressProvince || '',
            },
            billingAddress: {
                street: data.billingStreet || '',
                number: data.billingNumber || '',
                floor: data.billingFloor || '',
                city: data.billingCity || '',
                postalCode: data.billingPostalCode || '',
                province: data.billingProvince || '',
            },
        };

        const result = await createOrganizationAction(payload);

        if (result.success) {
            form.reset();
            setCurrentStep(1);
            setOpen(false);
            onSuccess?.();
        } else {
            setError(result.error);
        }
    };

    // Auto-generar slug desde nombre
    const handleNameChange = (name: string) => {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        form.setValue('slug', slug);
    };

    const nextStep = async () => {
        // Validar campos del paso actual antes de avanzar
        const fieldsToValidate: (keyof FormData)[] = currentStep === 1
            ? ['name', 'slug']
            : currentStep === 2
                ? []
                : ['brokerEmail', 'brokerPassword', 'brokerFirstName', 'brokerLastName'];

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid && currentStep < 3) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setCurrentStep(1);
            setError(null);
        }
    };

    // Helper para obtener los valores de dirección como AddressData
    const getAddressValue = (prefix: 'address' | 'billing'): AddressData => ({
        street: form.watch(`${prefix}Street` as keyof FormData) as string || '',
        number: form.watch(`${prefix}Number` as keyof FormData) as string || '',
        floor: form.watch(`${prefix}Floor` as keyof FormData) as string || '',
        city: form.watch(`${prefix}City` as keyof FormData) as string || '',
        postalCode: form.watch(`${prefix}PostalCode` as keyof FormData) as string || '',
        province: form.watch(`${prefix}Province` as keyof FormData) as string || '',
    });

    const setAddressValue = (prefix: 'address' | 'billing', data: AddressData) => {
        form.setValue(`${prefix}Street` as keyof FormData, data.street);
        form.setValue(`${prefix}Number` as keyof FormData, data.number);
        form.setValue(`${prefix}Floor` as keyof FormData, data.floor);
        form.setValue(`${prefix}City` as keyof FormData, data.city);
        form.setValue(`${prefix}PostalCode` as keyof FormData, data.postalCode);
        form.setValue(`${prefix}Province` as keyof FormData, data.province);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Organización
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-400" />
                        Nueva Organización
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Crea una nueva oficina y su usuario administrador (Broker).
                    </DialogDescription>
                </DialogHeader>

                {/* Step Indicator */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 rounded-lg mb-4">
                    {STEPS.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div
                                className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                                    currentStep === step.id
                                        ? "border-purple-500 bg-purple-500/20 text-purple-300"
                                        : currentStep > step.id
                                            ? "border-green-500 bg-green-500/20 text-green-300"
                                            : "border-slate-600 text-slate-500"
                                )}
                            >
                                {currentStep > step.id ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <step.icon className="w-4 h-4" />
                                )}
                            </div>
                            <span className={cn(
                                "ml-2 text-sm font-medium",
                                currentStep === step.id ? "text-purple-300" : "text-slate-500"
                            )}>
                                {step.title}
                            </span>
                            {index < STEPS.length - 1 && (
                                <div className={cn(
                                    "w-12 h-0.5 mx-3",
                                    currentStep > step.id ? "bg-green-500" : "bg-slate-700"
                                )} />
                            )}
                        </div>
                    ))}
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {error && (
                            <Alert variant="destructive" className="bg-red-900/50 border-red-800">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* PASO 1: Datos de la Oficina */}
                        {currentStep === 1 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Datos de la Oficina
                                </h3>

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-200">Nombre de la Inmobiliaria *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Century 21 Muñoz"
                                                    className="bg-slate-700/50 border-slate-600 text-white"
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        handleNameChange(e.target.value);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-200">Identificador (URL) *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="century-21-munoz"
                                                    className="bg-slate-700/50 border-slate-600 text-white"
                                                />
                                            </FormControl>
                                            <p className="text-xs text-slate-500">Solo minúsculas, números y guiones</p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-200">Email de la Oficina</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="email"
                                                        placeholder="info@inmobiliaria.com"
                                                        className="bg-slate-700/50 border-slate-600 text-white"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-200">Teléfono</FormLabel>
                                                <FormControl>
                                                    <PhoneInput
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        defaultCountry="AR"
                                                        placeholder="+54 9 11 1234-5678"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <AddressFields
                                    label="Dirección de la Oficina"
                                    value={getAddressValue('address')}
                                    onChange={(data) => setAddressValue('address', data)}
                                />
                            </div>
                        )}

                        {/* PASO 2: Datos Fiscales */}
                        {currentStep === 2 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Datos Fiscales (Opcional)
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="legal_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-200">Razón Social</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Inmobiliaria ABC S.A."
                                                        className="bg-slate-700/50 border-slate-600 text-white"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="cuit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-200">CUIT</FormLabel>
                                                <FormControl>
                                                    <CUITInput
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <AddressFields
                                    label="Dirección Fiscal / de Facturación"
                                    value={getAddressValue('billing')}
                                    onChange={(data) => setAddressValue('billing', data)}
                                />

                                <div className="pt-4 border-t border-slate-700 space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                        Acuerdo Comercial
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="royalty_percentage"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-200">Fee de Plataforma (%)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            type="number"
                                                            step="0.5"
                                                            min="0"
                                                            max="100"
                                                            placeholder="0"
                                                            className="bg-slate-700/50 border-slate-600 text-white"
                                                        />
                                                    </FormControl>
                                                    <p className="text-xs text-slate-500">
                                                        Porcentaje que cobra la red sobre ingresos
                                                    </p>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="org_status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-200">Estado Comercial</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                                                <SelectValue placeholder="Seleccionar estado" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-slate-800 border-slate-700">
                                                            <SelectItem value="active" className="text-slate-200">Activa</SelectItem>
                                                            <SelectItem value="pending_activation" className="text-slate-200">Pendiente Activación</SelectItem>
                                                            <SelectItem value="suspended" className="text-slate-200">Suspendida</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PASO 3: Administrador (Broker) */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                    <UserPlus className="h-4 w-4" />
                                    Administrador (Broker)
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Este será el usuario principal de la inmobiliaria con permisos de administración.
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="brokerFirstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-200">Nombre *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Juan"
                                                        className="bg-slate-700/50 border-slate-600 text-white"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="brokerLastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-200">Apellido *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Pérez"
                                                        className="bg-slate-700/50 border-slate-600 text-white"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="brokerEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-200">Email de Ingreso *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="email"
                                                    placeholder="broker@email.com"
                                                    className="bg-slate-700/50 border-slate-600 text-white"
                                                />
                                            </FormControl>
                                            <p className="text-xs text-slate-500">
                                                Con este email iniciará sesión el administrador
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="brokerPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-200">Contraseña *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="password"
                                                    placeholder="••••••••"
                                                    className="bg-slate-700/50 border-slate-600 text-white"
                                                />
                                            </FormControl>
                                            <p className="text-xs text-slate-500">
                                                Mínimo 6 caracteres
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <DialogFooter className="pt-4 flex justify-between">
                            <div>
                                {currentStep > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={prevStep}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        <ChevronLeft className="mr-1 h-4 w-4" />
                                        Anterior
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => handleOpenChange(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    Cancelar
                                </Button>
                                {currentStep < 3 ? (
                                    <Button
                                        type="button"
                                        onClick={nextStep}
                                        className="bg-gradient-to-r from-blue-500 to-purple-600"
                                    >
                                        Siguiente
                                        <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting}
                                        className="bg-gradient-to-r from-green-500 to-emerald-600"
                                    >
                                        {form.formState.isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creando...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="mr-2 h-4 w-4" />
                                                Crear Organización
                                            </>
                                        )}
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
