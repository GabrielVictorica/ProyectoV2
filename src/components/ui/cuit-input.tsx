'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface CUITInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
}

/**
 * Valida el dígito verificador del CUIT usando Módulo 11
 */
function validateCUITChecksum(cuit: string): boolean {
    const digits = cuit.replace(/\D/g, '');
    if (digits.length !== 11) return false;

    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;

    for (let i = 0; i < 10; i++) {
        sum += parseInt(digits[i]) * multipliers[i];
    }

    const remainder = sum % 11;
    const expectedVerifier = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;
    const actualVerifier = parseInt(digits[10]);

    return expectedVerifier === actualVerifier;
}

/**
 * Formatea el CUIT con guiones: XX-XXXXXXXX-X
 */
function formatCUIT(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 2) return digits;
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function CUITInput({
    value = '',
    onChange,
    error,
    className,
    ...props
}: CUITInputProps) {
    const [displayValue, setDisplayValue] = React.useState(formatCUIT(value));
    const [isValid, setIsValid] = React.useState<boolean | null>(null);

    React.useEffect(() => {
        setDisplayValue(formatCUIT(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const formatted = formatCUIT(rawValue);
        setDisplayValue(formatted);

        const digits = formatted.replace(/\D/g, '');
        onChange?.(formatted);

        // Validar solo cuando hay 11 dígitos
        if (digits.length === 11) {
            setIsValid(validateCUITChecksum(digits));
        } else {
            setIsValid(null);
        }
    };

    return (
        <div className="relative">
            <input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                placeholder="30-12345678-9"
                maxLength={13}
                className={cn(
                    "flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background",
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "bg-slate-700/50 border-slate-600 text-white",
                    isValid === false && "border-red-500 focus-visible:ring-red-500",
                    isValid === true && "border-green-500 focus-visible:ring-green-500",
                    className
                )}
                {...props}
            />
            {isValid === false && (
                <p className="text-xs text-red-400 mt-1">CUIT inválido (dígito verificador incorrecto)</p>
            )}
            {isValid === true && (
                <p className="text-xs text-green-400 mt-1">✓ CUIT válido</p>
            )}
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
    );
}

export { validateCUITChecksum, formatCUIT };
