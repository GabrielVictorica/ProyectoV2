'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    createUserAction,
    getOrganizationsAction,
    getParentUsersAction
} from '@/features/admin/actions/adminActions';
import { usePermissions } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
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
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, UserPlus } from 'lucide-react';

const formSchema = z.object({
    firstName: z.string().min(2, 'Mínimo 2 caracteres'),
    lastName: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    role: z.enum(['parent', 'child']),
    organizationId: z.string().uuid('Selecciona una organización'),
    supervisorIds: z.array(z.string()).optional().default([]),
    phone: z.string().optional(),
    defaultSplitPercentage: z.coerce.number().min(0, 'Mínimo 0').max(100, 'Máximo 100'),
});

type FormData = z.infer<typeof formSchema>;

interface Organization {
    id: string;
    name: string;
    slug: string;
}

interface ParentUser {
    id: string;
    name: string;
}

interface Props {
    onSuccess?: () => void;
    preselectedOrgId?: string;
}

// ... (imports remain the same as before)
export function CreateUserDialog({ onSuccess, preselectedOrgId }: Props) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [parentUsers, setParentUsers] = useState<ParentUser[]>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [loadingParents, setLoadingParents] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            role: 'child',
            organizationId: preselectedOrgId || '',
            supervisorIds: [],
            phone: '',
            defaultSplitPercentage: 45,
        },
    });

    const selectedRole = form.watch('role');
    const selectedOrgId = form.watch('organizationId');

    // Cargar organizaciones al abrir
    useEffect(() => {
        if (open) {
            loadOrganizations();
        }
    }, [open]);

    // Cargar parents cuando cambia la organización y el rol es child
    useEffect(() => {
        if (selectedOrgId && selectedRole === 'child') {
            loadParentUsers(selectedOrgId);
        } else {
            setParentUsers([]);
        }
    }, [selectedOrgId, selectedRole]);

    const loadOrganizations = async () => {
        setLoadingOrgs(true);
        const result = await getOrganizationsAction();
        if (result.success) {
            setOrganizations(result.data);
            if (preselectedOrgId) {
                form.setValue('organizationId', preselectedOrgId);
            }
        }
        setLoadingOrgs(false);
    };

    const loadParentUsers = async (orgId: string) => {
        setLoadingParents(true);
        const result = await getParentUsersAction(orgId);
        if (result.success) {
            setParentUsers(result.data);
        }
        setLoadingParents(false);
    };

    const onSubmit = async (data: FormData) => {
        setError(null);

        const submissionData = {
            ...data,
            supervisorIds: data.supervisorIds || []
        };

        const result = await createUserAction(submissionData as any);

        if (result.success) {
            form.reset();
            setOpen(false);
            onSuccess?.();
        } else {
            setError(result.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Usuario
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-blue-400" />
                        Crear Nuevo Usuario
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Agrega un nuevo broker o agente al sistema.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <Alert variant="destructive" className="bg-red-900/50 border-red-800">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="firstName"
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
                                name="lastName"
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
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-200">Email *</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="email"
                                            placeholder="juan@inmobiliaria.com"
                                            className="bg-slate-700/50 border-slate-600 text-white"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
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
                                    <FormDescription className="text-slate-500 text-xs">
                                        Mínimo 6 caracteres
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-200">Rol *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                                    <SelectValue placeholder="Seleccionar rol" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-slate-800 border-slate-700">
                                                <SelectItem value="parent" className="text-slate-200 focus:bg-slate-700">
                                                    👔 Parent (Broker)
                                                </SelectItem>
                                                <SelectItem value="child" className="text-slate-200 focus:bg-slate-700">
                                                    👤 Child (Agente)
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="organizationId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-200">Organización *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                                    <SelectValue placeholder={loadingOrgs ? "Cargando..." : "Seleccionar"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-slate-800 border-slate-700">
                                                {organizations.map((org) => (
                                                    <SelectItem
                                                        key={org.id}
                                                        value={org.id}
                                                        className="text-slate-200 focus:bg-slate-700"
                                                    >
                                                        {org.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {selectedRole === 'child' && (
                            <FormField
                                control={form.control}
                                name="supervisorIds"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-slate-200 text-sm font-medium">Supervisores (Opcional - Multinivel)</FormLabel>
                                            {field.value.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => field.onChange([])}
                                                    className="text-xs text-slate-400 hover:text-white"
                                                >
                                                    Limpiar
                                                </button>
                                            )}
                                        </div>
                                        <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3 max-h-[150px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                                            {loadingParents ? (
                                                <div className="flex items-center justify-center p-4 text-slate-400 text-xs gap-2">
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    Cargando supervisores...
                                                </div>
                                            ) : selectedOrgId && parentUsers.length === 0 ? (
                                                <div className="text-slate-500 text-xs italic p-2 text-center">
                                                    No hay supervisores disponibles en esta organización.
                                                </div>
                                            ) : !selectedOrgId ? (
                                                <div className="text-slate-500 text-xs italic p-2 text-center">
                                                    Selecciona una organización primero.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-1">
                                                    {parentUsers.map((parent) => {
                                                        const isSelected = field.value.includes(parent.id);
                                                        return (
                                                            <div
                                                                key={parent.id}
                                                                onClick={() => {
                                                                    const current = field.value;
                                                                    if (isSelected) {
                                                                        field.onChange(current.filter(id => id !== parent.id));
                                                                    } else {
                                                                        field.onChange([...current, parent.id]);
                                                                    }
                                                                }}
                                                                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm ${isSelected
                                                                        ? 'bg-blue-600/20 border border-blue-500/30 text-blue-200'
                                                                        : 'hover:bg-slate-700/60 text-slate-300 border border-transparent'
                                                                    }`}
                                                            >
                                                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${isSelected
                                                                        ? 'bg-blue-500 border-blue-400'
                                                                        : 'border-slate-500 bg-transparent'
                                                                    }`}>
                                                                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                                </div>
                                                                {parent.name}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <FormDescription className="text-slate-500 text-[11px]">
                                            El supervisor podrá ver los datos de este agente. Puedes seleccionar múltiples supervisores.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-200">Teléfono</FormLabel>
                                        <FormControl>
                                            <PhoneInput
                                                {...field}
                                                defaultCountry="AR"
                                                className="bg-slate-700/50 border-slate-600 text-white"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="defaultSplitPercentage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-200">Split de Comisión (%) *</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="number"
                                                className="bg-slate-700/50 border-slate-600 text-white"
                                            />
                                        </FormControl>
                                        <FormDescription className="text-slate-500 text-xs">
                                            Porcentaje que cobra el usuario (0-100)
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                                className="bg-gradient-to-r from-blue-500 to-cyan-600"
                            >
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    'Crear Usuario'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
