import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectSeparator,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Building2, Users, Check, CheckCircle2, XCircle } from 'lucide-react';

interface PropertyStepProps {
    form: UseFormReturn<any>;
    isGod: boolean;
    isParent: boolean;
    transaction: any;
    organizations: any[];
    filteredAgents: any[];
    propertyId?: string;
    isLoadingProps: boolean;
    availableProperties: any[];
    watchOrgId: string | undefined;
    watchPropertyId: string | undefined;
}

export const PropertyStep: React.FC<PropertyStepProps> = ({
    form,
    isGod,
    isParent,
    transaction,
    organizations,
    filteredAgents,
    propertyId,
    isLoadingProps,
    availableProperties,
    watchOrgId,
    watchPropertyId
}) => {
    return (
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

            {/* Estado: Solo lectura en edición, oculto en creación (siempre pending) */}
            {transaction && (
                <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium text-slate-200">Estado Actual</p>
                    <div className={`inline-flex items-center gap-2 rounded-lg border px-4 py-3 ${
                        transaction.status === 'pending'
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : transaction.status === 'cancelled'
                                ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    }`}>
                        {transaction.status === 'pending' && <Check className="h-4 w-4" />}
                        {transaction.status === 'completed' && <CheckCircle2 className="h-4 w-4" />}
                        {transaction.status === 'cancelled' && <XCircle className="h-4 w-4" />}
                        <span className="text-sm font-medium">
                            {transaction.status === 'pending' ? 'Reserva' : transaction.status === 'cancelled' ? 'Caída' : 'Cierre Final'}
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                        El estado se gestiona desde el menú de acciones (⋮) de la tabla.
                    </p>
                </div>
            )}
        </div>
    );
};
