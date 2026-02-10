import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DynamicTypographyProps {
    value: string | number;
    className?: string;
    maxChars?: number; // Maximum characters before truncating physically (optional)
    baseSize?: string; // Default size class (e.g., 'text-3xl')
    tooltip?: boolean; // Whether to show full value on hover
}

export function DynamicTypography({
    value,
    className,
    maxChars,
    baseSize = 'text-3xl',
    tooltip = true
}: DynamicTypographyProps) {
    const stringValue = String(value);
    const length = stringValue.length;

    // Logic for dynamic sizing
    let sizeClass = baseSize; // Default: > 3xl usually

    // Adjust scale based on length thresholds
    // Assuming base is around 3xl (30px)
    if (length > 15) {
        sizeClass = 'text-lg'; // ~18px for very long numbers
    } else if (length > 12) {
        sizeClass = 'text-xl'; // ~20px
    } else if (length > 9) {
        sizeClass = 'text-2xl'; // ~24px
    }
    // If <= 9, keeping baseSize (e.g., text-3xl)

    const truncatedValue = maxChars && length > maxChars
        ? stringValue.substring(0, maxChars) + '...'
        : stringValue;

    const content = (
        <span className={cn('font-bold tracking-tight transition-all duration-200', sizeClass, className)}>
            {truncatedValue}
        </span>
    );

    if (tooltip && (length > (maxChars || 15))) {
        return (
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        {content}
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{stringValue}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return content;
}
