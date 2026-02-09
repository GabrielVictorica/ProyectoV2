'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ObjectivesKPICardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    loading?: boolean;
    color: 'green' | 'blue' | 'purple' | 'yellow' | 'cyan' | 'amber' | 'red';
    isString?: boolean;
    subtitle?: string;
    showProgress?: boolean;
    progressValue?: number;
    progressTotal?: number;
}

const colorClasses = {
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    yellow: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
    cyan: 'from-cyan-500/20 to-teal-500/20 border-cyan-500/30',
    amber: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30',
    red: 'from-red-500/20 to-rose-500/20 border-red-500/30',
};

const iconColors = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
};

const progressColors = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    cyan: 'bg-cyan-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
};

export function ObjectivesKPICard({
    title,
    value,
    icon,
    loading = false,
    color,
    isString = false,
    subtitle,
    showProgress = false,
    progressValue = 0,
    progressTotal = 100,
}: ObjectivesKPICardProps) {
    const percentage = progressTotal > 0 ? Math.min(100, (progressValue / progressTotal) * 100) : 0;
    const isCompleted = percentage >= 100;

    // Dynamic progress color based on completion if not forced by prop color (optional logic, sticking to theme for now)
    const progressColorRaw = progressColors[color] || 'bg-white';

    return (
        <Card className={cn(
            'bg-gradient-to-br border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg relative overflow-hidden',
            colorClasses[color]
        )}>
            <CardContent className="py-4 px-5 relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <div className="space-y-1 min-w-0 flex-1">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider truncate" title={title}>
                            {title}
                        </p>
                        {loading ? (
                            <Skeleton className="h-7 w-20 bg-slate-700" />
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <p className="text-white text-xl md:text-2xl font-black truncate">
                                    {isString ? value : typeof value === 'number' ? value.toLocaleString() : value}
                                </p>
                                {showProgress && !isString && (
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-xs text-slate-500 font-medium">
                                            / {progressTotal}
                                        </span>
                                        <span className={cn(
                                            "text-xs font-bold",
                                            percentage >= 100 ? "text-green-400" :
                                                percentage >= 67 ? "text-emerald-400" :
                                                    percentage >= 34 ? "text-yellow-400" : "text-rose-400"
                                        )}>
                                            {percentage.toFixed(0)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className={cn('shrink-0 ml-3', iconColors[color])}>
                        {icon}
                    </div>
                </div>

                {/* Progress Bar Section */}
                {showProgress && !loading && (
                    <div className="mt-2 space-y-1">
                        <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-1000 ease-out", progressColorRaw)}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                            <span>{percentage.toFixed(0)}%</span>
                            <span>{subtitle || (isCompleted ? '¡Logrado!' : 'En proceso')}</span>
                        </div>
                    </div>
                )}

                {/* Fallback subtitle if no progress bar */}
                {!showProgress && subtitle && (
                    <p className="text-slate-500 text-[10px] truncate mt-1">{subtitle}</p>
                )}
            </CardContent>

            {/* Background Glow Effect */}
            <div className={cn(
                "absolute -bottom-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-20",
                progressColors[color]
            )} />
        </Card>
    );
}
