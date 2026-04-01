'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicTypography } from '@/components/ui/DynamicTypography';
import { MagicCard } from '@/components/ui/magic-card';
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
    segmentedProgress?: {
        completed: number;
        reserved: number;
        total: number;
        completedLabel?: string;
        reservedLabel?: string;
    };
}

const gradientColors: Record<string, string> = {
    green: 'rgba(16,185,129,0.12)',
    blue: 'rgba(59,130,246,0.12)',
    purple: 'rgba(168,85,247,0.12)',
    yellow: 'rgba(245,158,11,0.12)',
    cyan: 'rgba(6,182,212,0.12)',
    amber: 'rgba(245,158,11,0.12)',
    red: 'rgba(239,68,68,0.12)',
};

const progressColors: Record<string, string> = {
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
    segmentedProgress,
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
        <Card className={`relative overflow-hidden border ${t.border} ${t.bg} ${t.glow} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group shadow-md rounded-xl`}>
            <MagicCard
                gradientColor={gradientColors[color] || gradientColors.blue}
                gradientSize={250}
                gradientOpacity={1}
            >
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

                                {/* Segmented Progress Bar (Cerrado + Reservado) */}
                                {segmentedProgress && (
                                    <div className="mt-2 space-y-1.5 w-full max-w-[90%]">
                                        <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden backdrop-blur-sm flex">
                                            {segmentedProgress.total > 0 && (
                                                <>
                                                    <div
                                                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                                                        style={{ width: `${Math.min(100, (segmentedProgress.completed / segmentedProgress.total) * 100)}%` }}
                                                    />
                                                    <div
                                                        className="h-full bg-amber-500/70 transition-all duration-1000 ease-out"
                                                        style={{ width: `${Math.min(100 - (segmentedProgress.completed / segmentedProgress.total) * 100, (segmentedProgress.reserved / segmentedProgress.total) * 100)}%` }}
                                                    />
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-[9px] font-medium">
                                            <span className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                                <span className="text-emerald-400">{segmentedProgress.completedLabel || segmentedProgress.completed}</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                                <span className="text-amber-400">{segmentedProgress.reservedLabel || segmentedProgress.reserved}</span>
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {!showProgress && !segmentedProgress && subtitle && (
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
            </MagicCard>
        </Card>
    );
}
