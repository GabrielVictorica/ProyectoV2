'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface DateMaskedInputProps {
    value?: string; // ISO format yyyy-mm-dd or empty
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * Converts ISO date (yyyy-mm-dd) to display format (dd/mm/aaaa)
 */
function isoToDisplay(iso: string): string {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Converts display format (dd/mm/yyyy) to ISO (yyyy-mm-dd)
 */
function displayToIso(display: string): string {
    const clean = display.replace(/[^0-9/]/g, '');
    const parts = clean.split('/');
    if (parts.length !== 3 || parts[2].length !== 4) return '';
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/**
 * Auto-formats input as dd/mm/aaaa while typing
 */
function autoFormat(raw: string): string {
    // Strip everything except digits
    const digits = raw.replace(/\D/g, '');

    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export function DateMaskedInput({
    value,
    onChange,
    placeholder = 'dd/mm/aaaa',
    className,
    disabled,
}: DateMaskedInputProps) {
    const [displayValue, setDisplayValue] = React.useState(() => isoToDisplay(value || ''));

    // Sync when external value changes (e.g. form reset, edit mode)
    React.useEffect(() => {
        setDisplayValue(isoToDisplay(value || ''));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = autoFormat(e.target.value);
        setDisplayValue(formatted);

        // Only emit ISO value when fully typed
        if (formatted.length === 10) {
            const iso = displayToIso(formatted);
            if (iso) onChange(iso);
        } else if (formatted.length === 0) {
            onChange('');
        }
    };

    const handleBlur = () => {
        // Validate on blur
        if (displayValue.length > 0 && displayValue.length < 10) {
            // Incomplete date — clear
            setDisplayValue('');
            onChange('');
        }
    };

    return (
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                <Calendar className="w-4 h-4" />
            </div>
            <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                    "flex h-9 w-full rounded-xl border bg-white/[0.03] border-white/[0.10] px-3 py-1 text-sm shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/20 focus-visible:outline-none focus-visible:border-violet-500/40 focus-visible:ring-1 focus-visible:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50 pl-10 text-white/70",
                    className
                )}
            />
        </div>
    );
}
