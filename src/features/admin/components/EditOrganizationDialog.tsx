'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePermissions } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { CUITInput, validateCUITChecksum } from '@/components/ui/cuit-input';
import { AddressFields, AddressData, assembleAddress, parseAddress } from '@/components/ui/address-fields';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Receipt, FileText } from 'lucide-react';
import type { Organization } from '@/types/database.types';

const formSchema = z.object({
    // Datos básicos
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    slug: z.string()
        .min(2, 'El slug debe tener al menos 2 caracteres')
        .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    // Dirección estructurada
    addressStreet: z.string().optional(),
    addressNumber: z.string().optional(),
    addressFloor: z.string().optional(),
    addressCity: z.string().optional(),
    addressPostalCode: z.string().optional(),
    addressProvince: z.string().optional(),
    // Datos fiscales
    legal_name: z.string().optional().or(z.literal('')),
    cuit: z.string().optional().or(z.literal('')).refine(
        (val) => !val || val.replace(/\D/g, '').length !== 11 || validateCUITChecksum(val),
        'CUIT inválido (dígito verificador incorrecto)'
    ),
    // Dirección fiscal estructurada
    billingStreet: z.string().optional(),
    billingNumber: z.string().optional(),
    billingFloor: z.string().optional(),
    billingCity: z.string().optional(),
    billingPostalCode: z.string().optional(),
    billingProvince: z.string().optional(),
    // Datos comerciales (GOD only edit)
    royalty_percentage: z.coerce.number().min(0).max(100).optional(),
    org_status: z.enum(['active', 'suspended', 'pending_payment']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
    organization: Organization;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditOrganizationDialog({ organization, open, onOpenChange, onSuccess }: Props) {
    const [error, setError] = useState<string | null>(null);
    const { isGod } = usePermissions();

    // Parsear direcciones existentes
    const parsedAddress = parseAddress(organization.address || '');
    const parsedBillingAddress = parseAddress(organization.billing_address || '');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: organization.name,
            slug: organization.slug,
            email: organization.email || '',
            phone: organization.phone || '',
            addressStreet: parsedAddress.street,
            addressNumber: parsedAddress.number,
            addressFloor: parsedAddress.floor,
            addressCity: parsedAddress.city,
            addressPostalCode: parsedAddress.postalCode,
            addressProvince: parsedAddress.province,
            legal_name: organization.legal_name || '',
            cuit: organization.cuit || '',
            billingStreet: parsedBillingAddress.street,
            billingNumber: parsedBillingAddress.number,
            billingFloor: parsedBillingAddress.floor,
            billingCity: parsedBillingAddress.city,
            billingPostalCode: parsedBillingAddress.postalCode,
            billingProvince: parsedBillingAddress.province,
            royalty_percentage: organization.royalty_percentage ?? 0,
            org_status: organization.org_status || 'active',
        },
    });

    // Reset form cuando cambia la organización
    useEffect(() => {
        const pAddr = parseAddress(organization.address || '');
        const pBilling = parseAddress(organization.billing_address || '');

        form.reset({
            name: organization.name,
            slug: organization.slug,
            email: organization.email || '',
            phone: organization.phone || '',
            addressStreet: pAddr.street,
            addressNumber: pAddr.number,
            addressFloor: pAddr.floor,
            addressCity: pAddr.city,
            addressPostalCode: pAddr.postalCode,
            addressProvince: pAddr.province,
            legal_name: organization.legal_name || '',
            cuit: organization.cuit || '',
            billingStreet: pBilling.street,
            billingNumber: pBilling.number,
            billingFloor: pBilling.floor,
            billingCity: pBilling.city,
            billingPostalCode: pBilling.postalCode,
            billingProvince: pBilling.province,
            royalty_percentage: organization.royalty_percentage ?? 0,
            org_status: organization.org_status || 'active',
        });
    }, [organization, form]);

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

        const billing_address = assembleAddress({
            street: data.billingStreet || '',
            number: data.billingNumber || '',
            floor: data.billingFloor || '',
            city: data.billingCity || '',
            postalCode: data.billingPostalCode || '',
            province: data.billingProvince || '',
        });

        try {
            const response = await fetch('/api/admin/organizations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: organization.id,
                    name: data.name,
                    slug: data.slug,
                    email: data.email,
                    phone: data.phone,
                    address,
                    legal_name: data.legal_name,
                    cuit: data.cuit,
                    billing_address,
                    royalty_percentage: data.royalty_percentage,
                    org_status: data.org_status,
                    // Direcciones estructuradas
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
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al actualizar');
            }

            onOpenChange(false);
            onSuccess?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al actualizar la organización');
        }
    };

    // Helpers para direcciones
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-purple-400" />
                        {organization.name}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Administra la información de esta oficina
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {error && (
                            <Alert variant="destructive" className="bg-red-900/50 border-red-800">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Sección: Datos Básicos */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Datos Básicos
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-200">Nombre *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    className="bg-slate-700/50 border-slate-600 text-white"
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
                                            <FormLabel className="text-slate-200">Slug *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    className="bg-slate-700/50 border-slate-600 text-white"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-200">Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="email"
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

                        {/* Sección: Datos Fiscales */}
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Datos Fiscales
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
                        </div>

                        {/* Sección: Acuerdo Comercial (GOD only edit) */}
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Receipt className="h-4 w-4" />
                                Acuerdo Comercial
                                {!isGod && (
                                    <span className="text-xs text-slate-500 ml-2">(Solo lectura)</span>
                                )}
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
                                                    disabled={!isGod}
                                                    className={`bg-slate-700/50 border-slate-600 text-white ${!isGod ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                />
                                            </FormControl>
                                            <FormDescription className="text-slate-500 text-xs">
                                                Porcentaje que cobra la red sobre ingresos
                                            </FormDescription>
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
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                disabled={!isGod}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className={`bg-slate-700/50 border-slate-600 text-white ${!isGod ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-slate-800 border-slate-700">
                                                    <SelectItem value="active" className="text-slate-200">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                                            Activo
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="pending_payment" className="text-slate-200">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                                            Pago Pendiente
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="suspended" className="text-slate-200">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                                            Suspendido
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="text-slate-400"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                                className="bg-gradient-to-r from-purple-500 to-pink-600"
                            >
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    'Guardar Cambios'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
