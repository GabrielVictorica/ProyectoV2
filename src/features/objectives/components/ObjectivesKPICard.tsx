'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicTypography } from '@/components/ui/DynamicTypography';
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

    // Helper for Watermark Styling
    const getTheme = (c: string) => {
        const themes: any = {
            green: { bg: 'bg-gradient-to-br from-slate-900 to-emerald-950/30', border: 'border-emerald-500/20', text: 'text-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]' },
            blue: { bg: 'bg-gradient-to-br from-slate-900 to-blue-950/30', border: 'border-blue-500/20', text: 'text-blue-500', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]' },
            purple: { bg: 'bg-gradient-to-br from-slate-900 to-purple-950/30', border: 'border-purple-500/20', text: 'text-purple-500', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]' },
            yellow: { bg: 'bg-gradient-to-br from-slate-900 to-amber-950/30', border: 'border-amber-500/20', text: 'text-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]' },
            cyan: { bg: 'bg-gradient-to-br from-slate-900 to-cyan-950/30', border: 'border-cyan-500/20', text: 'text-cyan-500', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.1)]' },
            amber: { bg: 'bg-gradient-to-br from-slate-900 to-amber-950/30', border: 'border-amber-500/20', text: 'text-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]' },
            red: { bg: 'bg-gradient-to-br from-slate-900 to-red-950/30', border: 'border-red-500/20', text: 'text-red-500', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]' },
        };
        return themes[c] || themes.blue;
    };

    const t = getTheme(color);
    const progressColorRaw = progressColors[color] || 'bg-white';

    return (
        <Card className={`relative overflow-hidden border ${t.border} ${t.bg} ${t.glow} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group shadow-md`}>
            <CardContent className="p-5 relative z-10 min-h-[100px] flex flex-col justify-center">
                <div className="flex flex-col gap-1">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest z-10 truncate" title={title}>
                        {title}
                    </p>

                    {loading ? (
                        <Skeleton className="h-8 w-24 bg-slate-800 lg:w-32 mt-1" />
                    ) : (
                        <div className="flex flex-col z-10">
                            <div className="flex items-baseline gap-2">
                                <DynamicTypography
                                    value={isString ? value : typeof value === 'number' ? value.toLocaleString() : value}
                                    className="text-white font-black tracking-tighter drop-shadow-md"
                                    baseSize="text-3xl"
                                />
                                {showProgress && !isString && (
                                    <div className="flex items-baseline gap-1.5 opacity-80">
                                        <span className="text-[10px] text-slate-500 font-medium">
                                            / {progressTotal}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar within the safe zone */}
                            {showProgress && (
                                <div className="mt-2 space-y-1 w-full max-w-[80%]">
                                    <div className="h-1 w-full bg-slate-800/80 rounded-full overflow-hidden backdrop-blur-sm">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-1000 ease-out", progressColorRaw)}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-medium">
                                        <span>{percentage.toFixed(0)}%</span>
                                    </div>
                                </div>
                            )}

                            {!showProgress && subtitle && (
                                <p className="text-[10px] text-slate-500 font-medium tracking-wide opacity-80 mt-1">{subtitle}</p>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>

            {/* Watermark Icon - Background Layer */}
            <div className={`absolute -right-6 -bottom-6 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 rotate-[-15deg] scale-150 pointer-events-none ${t.text}`}>
                <div className="w-32 h-32 [&>svg]:w-full [&>svg]:h-full">
                    {icon}
                </div>
            </div>
        </Card>
    );
}
