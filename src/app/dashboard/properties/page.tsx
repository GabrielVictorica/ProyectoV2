'use client';

import { useAuth, usePermissions } from '@/features/auth/hooks/useAuth';
import { useProperties } from '@/features/properties/hooks/useProperties';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Building, MapPin, DollarSign, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { CloseTransactionDialog } from '@/features/transactions/components/CloseTransactionDialog';
import { formatCurrency } from '@/lib/formatters';

export default function PropertiesPage() {
    const { data: auth } = useAuth();
    const { isGod, isParent } = usePermissions();
    const { data: properties, isLoading, error } = useProperties();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-400 text-center py-8">
                Error al cargar propiedades: {error.message}
            </div>
        );
    }

    const canEditProperty = (property: any) => {
        if (isGod) return true;
        if (isParent && property.agent?.organization?.id === auth?.profile?.organization_id) return true;
        return property.agent_id === auth?.profile?.id;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Propiedades</h1>
                    <p className="text-slate-400 mt-1">
                        Red de propiedades compartidas entre todas las agencias
                    </p>
                </div>
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Propiedad
                </Button>
            </div>

            {/* Properties Grid */}
            {properties && properties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                        <Card key={property.id} className="bg-slate-800/50 border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
                            {/* Property Image Placeholder */}
                            <div className="h-48 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative group/img">
                                <Building className="h-16 w-16 text-slate-600" />
                                {canEditProperty(property) && (
                                    <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                        <Button size="icon" variant="secondary" className="h-8 w-8 bg-slate-900/80 hover:bg-slate-900 text-white border-none backdrop-blur-sm">
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <CardTitle className="text-white text-lg line-clamp-1">
                                        {property.title}
                                    </CardTitle>
                                    {property.property_status && (
                                        <Badge
                                            style={{ backgroundColor: property.property_status.color || '#6b7280' }}
                                            className="text-white text-xs"
                                        >
                                            {property.property_status.name}
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription className="text-slate-400 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {property.city || property.neighborhood || 'Sin ubicación'}
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-blue-400 font-semibold">
                                        <DollarSign className="h-4 w-4" />
                                        {property.price ? formatCurrency(property.price) : 'Consultar'}
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {property.operation_type === 'venta' ? 'Venta' :
                                            property.operation_type === 'alquiler' ? 'Alquiler' : 'Temp.'}
                                    </span>
                                </div>

                                {property.agent && (
                                    <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-xs text-slate-500">
                                                Agente: {property.agent.first_name} {property.agent.last_name}
                                            </p>
                                            {property.agent.organization && (
                                                <p className="text-xs text-slate-600">
                                                    {property.agent.organization.name}
                                                </p>
                                            )}
                                        </div>
                                        <CloseTransactionDialog
                                            propertyId={property.id}
                                            propertyTitle={property.title}
                                            organizationId={property.agent.organization?.id}
                                            trigger={
                                                <Button size="sm" variant="ghost" className="h-8 text-green-400 hover:text-green-300 hover:bg-green-500/10 p-2">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-12 text-center">
                        <Building className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">
                            No hay propiedades aún
                        </h3>
                        <p className="text-slate-400 mb-4">
                            Comienza agregando tu primera propiedad al sistema
                        </p>
                        <Button className="bg-gradient-to-r from-blue-500 to-purple-600">
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar Propiedad
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

