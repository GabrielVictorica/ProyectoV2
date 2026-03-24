'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import {
    motion,
    useMotionTemplate,
    useMotionValue,
    useSpring,
} from 'framer-motion';
import { cn } from '@/lib/utils';

interface MagicCardProps {
    children?: React.ReactNode;
    className?: string;
    gradientSize?: number;
    gradientColor?: string;
    gradientOpacity?: number;
}

export function MagicCard({
    children,
    className,
    gradientSize = 200,
    gradientColor = '#262626',
    gradientOpacity = 0.8,
}: MagicCardProps) {
    const mouseX = useMotionValue(-gradientSize);
    const mouseY = useMotionValue(-gradientSize);

    const gradientSizeRef = useRef(gradientSize);
    useEffect(() => {
        gradientSizeRef.current = gradientSize;
    }, [gradientSize]);

    const reset = useCallback(() => {
        mouseX.set(-gradientSizeRef.current);
        mouseY.set(-gradientSizeRef.current);
    }, [mouseX, mouseY]);

    const handlePointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            mouseX.set(e.clientX - rect.left);
            mouseY.set(e.clientY - rect.top);
        },
        [mouseX, mouseY]
    );

    useEffect(() => {
        reset();
    }, [reset]);

    return (
        <motion.div
            className={cn('group relative overflow-hidden rounded-[inherit]', className)}
            onPointerMove={handlePointerMove}
            onPointerLeave={reset}
        >
            <motion.div
                className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)`,
                    opacity: gradientOpacity,
                }}
            />
            <div className="relative z-20">{children}</div>
        </motion.div>
    );
}
