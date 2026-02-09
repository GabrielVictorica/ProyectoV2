'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface AddressData {
    street: string;
    number: string;
    floor: string;
    city: string;
    postalCode: string;
    province: string;
}

const ARGENTINA_PROVINCES = [
    'Buenos Aires',
    'CABA',
    'Catamarca',
    'Chaco',
    'Chubut',
    'Córdoba',
    'Corrientes',
    'Entre Ríos',
    'Formosa',
    'Jujuy',
    'La Pampa',
    'La Rioja',
    'Mendoza',
    'Misiones',
    'Neuquén',
    'Río Negro',
    'Salta',
    'San Juan',
    'San Luis',
    'Santa Cruz',
    'Santa Fe',
    'Santiago del Estero',
    'Tierra del Fuego',
    'Tucumán',
];

interface AddressFieldsProps {
    value?: AddressData;
    onChange?: (value: AddressData) => void;
    label?: string;
    required?: boolean;
}

const emptyAddress: AddressData = {
    street: '',
    number: '',
    floor: '',
    city: '',
    postalCode: '',
    province: '',
};

/**
 * Ensambla los campos de dirección en un string formateado
 */
export function assembleAddress(data: AddressData): string {
    const parts = [];

    if (data.street && data.number) {
        parts.push(`${data.street} ${data.number}`);
    } else if (data.street) {
        parts.push(data.street);
    }

    if (data.floor) {
        parts.push(`Piso ${data.floor}`);
    }

    if (data.city) {
        parts.push(data.city);
    }

    if (data.province) {
        parts.push(data.province);
    }

    if (data.postalCode) {
        parts.push(`CP ${data.postalCode}`);
    }

    return parts.join(', ');
}

/**
 * Intenta parsear un string de dirección en los campos estructurados
 * (Fallback: pone todo en 'street')
 */
export function parseAddress(addressString: string): AddressData {
    if (!addressString) return emptyAddress;

    // Intentar parsear formato: "Calle 123, Piso X, Ciudad, Provincia CP XXXX"
    const result = { ...emptyAddress };

    // Regex para extraer CP al final
    const cpMatch = addressString.match(/CP\s*(\d+)/i);
    if (cpMatch) {
        result.postalCode = cpMatch[1];
        addressString = addressString.replace(cpMatch[0], '').trim();
    }

    // Regex para extraer Piso
    const floorMatch = addressString.match(/Piso\s*(\w+)/i);
    if (floorMatch) {
        result.floor = floorMatch[1];
        addressString = addressString.replace(floorMatch[0], '').trim();
    }

    // Dividir el resto por comas
    const parts = addressString.split(',').map(p => p.trim()).filter(Boolean);

    if (parts.length >= 1) {
        // Primera parte: calle y número
        const streetMatch = parts[0].match(/^(.+?)\s+(\d+[a-zA-Z]?)$/);
        if (streetMatch) {
            result.street = streetMatch[1];
            result.number = streetMatch[2];
        } else {
            result.street = parts[0];
        }
    }

    if (parts.length >= 2) {
        result.city = parts[1];
    }

    if (parts.length >= 3) {
        result.province = parts[2];
    }

    return result;
}

export function AddressFields({
    value = emptyAddress,
    onChange,
    label = 'Dirección',
    required = false,
}: AddressFieldsProps) {
    const handleFieldChange = (field: keyof AddressData, fieldValue: string) => {
        onChange?.({
            ...value,
            [field]: fieldValue,
        });
    };

    return (
        <div className="space-y-3">
            {label && (
                <Label className="text-slate-200 text-sm font-medium">
                    {label} {required && '*'}
                </Label>
            )}

            <div className="grid grid-cols-12 gap-3">
                {/* Calle - 8 columnas */}
                <div className="col-span-8">
                    <Input
                        value={value.street}
                        onChange={(e) => handleFieldChange('street', e.target.value)}
                        placeholder="Calle / Avenida"
                        className="bg-slate-700/50 border-slate-600 text-white"
                    />
                </div>

                {/* Número - 2 columnas */}
                <div className="col-span-2">
                    <Input
                        value={value.number}
                        onChange={(e) => handleFieldChange('number', e.target.value)}
                        placeholder="Nº"
                        className="bg-slate-700/50 border-slate-600 text-white"
                    />
                </div>

                {/* Piso/Depto - 2 columnas */}
                <div className="col-span-2">
                    <Input
                        value={value.floor}
                        onChange={(e) => handleFieldChange('floor', e.target.value)}
                        placeholder="Piso"
                        className="bg-slate-700/50 border-slate-600 text-white"
                    />
                </div>
            </div>

            <div className="grid grid-cols-12 gap-3">
                {/* Ciudad - 5 columnas */}
                <div className="col-span-5">
                    <Input
                        value={value.city}
                        onChange={(e) => handleFieldChange('city', e.target.value)}
                        placeholder="Ciudad"
                        className="bg-slate-700/50 border-slate-600 text-white"
                    />
                </div>

                {/* Código Postal - 2 columnas */}
                <div className="col-span-2">
                    <Input
                        value={value.postalCode}
                        onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                        placeholder="CP"
                        className="bg-slate-700/50 border-slate-600 text-white"
                    />
                </div>

                {/* Provincia - 5 columnas */}
                <div className="col-span-5">
                    <Select
                        value={value.province}
                        onValueChange={(val) => handleFieldChange('province', val)}
                    >
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                            <SelectValue placeholder="Provincia" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 max-h-[200px]">
                            {ARGENTINA_PROVINCES.map((prov) => (
                                <SelectItem
                                    key={prov}
                                    value={prov}
                                    className="text-slate-200"
                                >
                                    {prov}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
