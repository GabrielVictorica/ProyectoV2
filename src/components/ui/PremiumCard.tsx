import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PremiumCardProps {
    title?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
    delay?: number;
    glass?: boolean;
    gradient?: boolean;
}

export function PremiumCard({
    title,
    icon,
    children,
    className,
    headerClassName,
    contentClassName,
    delay = 0,
    glass = true,
    gradient = false,
}: PremiumCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
        >
            <Card className={cn(
                'overflow-hidden transition-all duration-300',
                glass && 'bg-slate-900/40 backdrop-blur-xl border-slate-800 shadow-2xl hover:bg-slate-900/60',
                gradient && 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800',
                className
            )}>
                {(title || icon) && (
                    <CardHeader className={cn('pb-2', headerClassName)}>
                        <CardTitle className="text-white flex items-center gap-2 text-lg font-bold tracking-tight">
                            {icon && <span className="text-blue-400">{icon}</span>}
                            {title}
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent className={cn(contentClassName)}>
                    {children}
                </CardContent>
            </Card>
        </motion.div>
    );
}
