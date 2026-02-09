'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    updateUserAction,
    getParentUsersAction,
    getOrganizationsAction
} from '@/features/admin/actions/adminActions';
import { useAuth } from '@/features/auth/hooks/useAuth';
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
import { Loader2, UserCog } from 'lucide-react';

const formSchema = z.object({
    firstName: z.string().min(2, 'Mínimo 2 caracteres'),
    lastName: z.string().min(2, 'Mínimo 2 caracteres'),
    parentId: z.string().optional(),
    phone: z.string().optional(),
    defaultSplitPercentage: z.coerce.number().min(0, 'Mínimo 0').max(100, 'Máximo 100'),
    organizationId: z.string().uuid('Selecciona una organización').optional(),
});

type FormData = z.infer<typeof formSchema>;

interface User {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email?: string;
    role: string | null;
    organization_id: string | null;
    parent_id: string | null;
    phone: string | null;
    default_split_percentage: number | null;
}

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
    user: User;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditUserDialog({ user, open, onOpenChange, onSuccess }: Props) {
    const [error, setError] = useState<string | null>(null);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [parentUsers, setParentUsers] = useState<ParentUser[]>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [loadingParents, setLoadingParents] = useState(false);
    const { data: auth } = useAuth();
    const currentUser = auth?.profile;
    const isGod = currentUser?.role === 'god';

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            parentId: user.parent_id || 'none',
            phone: user.phone || '',
            defaultSplitPercentage: user.default_split_percentage || 45,
            organizationId: user.organization_id || '',
        },
    });

    const watchedOrgId = form.watch('organizationId');
    const selectedRole = user.role; // En edición el rol suele ser estático, pero usamos el del usuario

    // Cargar organizaciones si es GOD
    useEffect(() => {
        if (open && isGod) {
            loadOrganizations();
        }
    }, [open, isGod]);

    // Cargar parents cuando cambia la organización y el rol permite supervisor (child o god)
    useEffect(() => {
        const canHaveParent = selectedRole === 'child' || selectedRole === 'god';

        if (open && watchedOrgId && canHaveParent) {
            loadParentUsers(watchedOrgId);
        } else {
            setParentUsers([]);
        }
    }, [open, watchedOrgId, selectedRole]);

    const loadOrganizations = async () => {
        setLoadingOrgs(true);
        const result = await getOrganizationsAction();
        if (result.success) {
            setOrganizations(result.data as Organization[]);
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
            parentId: data.parentId === 'none' ? undefined : data.parentId
        };

        const result = await updateUserAction(user.id, submissionData as any);

        if (result.success) {
            onOpenChange(false);
            onSuccess?.();
        } else {
            setError(result.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-blue-400" />
                        Editar Usuario: {user.first_name} {user.last_name}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Modifica los datos del perfil y configuración de comisiones.
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
                                                className="bg-slate-700/50 border-slate-600 text-white"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {(user.role === 'child' || user.role === 'god') && (
                            <FormField
                                control={form.control}
                                name="parentId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-200">Broker / Supervisor (Opcional)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                                    <SelectValue placeholder={loadingParents ? "Cargando..." : "Sin supervisor"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-slate-800 border-slate-700">
                                                <SelectItem value="none" className="text-slate-400 focus:bg-slate-700">
                                                    Sin supervisor
                                                </SelectItem>
                                                {parentUsers.map((parent) => (
                                                    <SelectItem
                                                        key={parent.id}
                                                        value={parent.id}
                                                        className="text-slate-200 focus:bg-slate-700"
                                                    >
                                                        {parent.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {isGod && (
                            <FormField
                                control={form.control}
                                name="organizationId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-200">Organización / Oficina *</FormLabel>
                                        <Select
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                // Resetear supervisor al cambiar org
                                                form.setValue('parentId', 'none');
                                            }}
                                            value={field.value}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                                    <SelectValue placeholder={loadingOrgs ? "Cargando..." : "Seleccionar organización"} />
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
                                            Porcentaje que cobra el usuario
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
                                onClick={() => onOpenChange(false)}
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
