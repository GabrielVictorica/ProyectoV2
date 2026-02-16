'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useWeeklyNote } from '../hooks/useWeeklyNote';
import { StickyNote, Save, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface WeeklyNoteEditorProps {
    agentId?: string;
    weekStartDate: Date;
}

export function WeeklyNoteEditor({ agentId, weekStartDate }: WeeklyNoteEditorProps) {
    const { data: auth } = useAuth();
    const { note, upsertNote, isSaving, isLoading } = useWeeklyNote(agentId, weekStartDate);
    const [content, setContent] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (note) {
            setContent(note.content || '');
            setIsDirty(false);
        } else {
            setContent('');
            setIsDirty(false);
        }
    }, [note]);

    const handleSave = () => {
        if (!agentId || !auth?.profile?.organization_id) return;

        upsertNote({
            agent_id: agentId,
            organization_id: auth.profile.organization_id,
            week_start_date: format(weekStartDate, 'yyyy-MM-dd'),
            content
        });
        setIsDirty(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        setIsDirty(true);
    };

    if (isLoading) {
        return (
            <div className="glass rounded-2xl p-6 border border-white/[0.08] animate-pulse h-[140px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white/20 animate-spin" />
            </div>
        );
    }

    return (
        <div className="glass rounded-2xl border border-white/[0.08] overflow-hidden group transition-all duration-500 hover:border-white/20">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                        <StickyNote className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                            Análisis Semanal
                            <Sparkles className="h-3 w-3 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Reflexión y Notas de Desempeño</p>
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    size="sm"
                    className={cn(
                        "h-8 rounded-xl transition-all duration-300",
                        isDirty
                            ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] px-4"
                            : "bg-white/5 text-white/40 border-white/10 px-3"
                    )}
                >
                    {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <Save className="h-3.5 w-3.5" />
                            {isDirty && <span className="text-xs">Guardar</span>}
                        </div>
                    )}
                </Button>
            </div>

            <div className="relative p-0">
                <textarea
                    value={content}
                    onChange={handleChange}
                    placeholder="Escribe aquí un resumen de lo que sucedió esta semana, desafíos o logros..."
                    className="w-full min-h-[100px] bg-transparent text-sm text-white/80 placeholder:text-white/20 focus:outline-none p-6 resize-none leading-relaxed"
                    onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                            handleSave();
                        }
                    }}
                />

                {/* Visual indicator of unsaved changes */}
                {isDirty && (
                    <div className="absolute bottom-4 right-4 flex items-center gap-1.5 p-1 px-2 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                        <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                        <span className="text-[10px] font-medium text-yellow-500/80">Cambios sin guardar</span>
                    </div>
                )}
            </div>
        </div>
    );
}
