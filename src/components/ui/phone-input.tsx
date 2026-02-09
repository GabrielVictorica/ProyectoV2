'use client';

import * as React from 'react';
import PhoneInputWithCountry, { type Value } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface PhoneInputProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    defaultCountry?: 'AR' | 'UY' | 'CL' | 'ES' | 'US';
}

export function PhoneInput({
    value,
    onChange,
    placeholder = 'Ingresar teléfono',
    className,
    disabled,
    defaultCountry = 'AR'
}: PhoneInputProps) {
    return (
        <div className={cn("phone-input-container w-full", className)}>
            <PhoneInputWithCountry
                international
                defaultCountry={defaultCountry}

                value={value as Value}
                onChange={(val) => onChange(val || '')}
                placeholder={placeholder}
                disabled={disabled}
                className="flex items-center gap-2"
                inputComponent={Input}
                // Custom labels to keep it professional
                labels={{
                    AR: 'Arg',
                    UY: 'Uru',
                    CL: 'Chi',
                    ES: 'Esp',
                    US: 'USA',
                }}
            />
            <style jsx global>{`
                .PhoneInputCountry {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(15, 23, 42, 0.5);
                    padding: 0 0.75rem;
                    border-radius: 0.5rem;
                    border: 1px solid rgba(51, 65, 85, 1);
                    height: 3rem;
                    cursor: pointer;
                }
                .PhoneInputCountrySelectArrow {
                    opacity: 0.5;
                }
                .PhoneInputInput {
                    flex: 1;
                }
            `}</style>
        </div>
    );
}
