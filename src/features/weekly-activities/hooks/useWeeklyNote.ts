'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWeeklyNoteAction, upsertWeeklyNoteAction } from '../actions/noteActions';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function useWeeklyNote(agentId?: string, weekStartDate?: Date) {
    const queryClient = useQueryClient();
    const weekStr = weekStartDate ? format(weekStartDate, 'yyyy-MM-dd') : '';

    const queryKey = ['weekly-note', agentId, weekStr];

    const { data: note, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!agentId || !weekStr) return null;
            const res = await getWeeklyNoteAction(agentId, weekStr);
            if (res.success) return res.data || null;
            return null;
        },
        enabled: !!agentId && !!weekStr
    });

    const upsertNote = useMutation({
        mutationFn: upsertWeeklyNoteAction,
        onSuccess: (res) => {
            if (res.success) {
                queryClient.setQueryData(queryKey, res.data);
            } else {
                toast.error(res.error || 'Error al guardar la nota');
            }
        },
        onError: () => {
            toast.error('Error al conectar con el servidor');
        }
    });

    return {
        note,
        isLoading,
        upsertNote: upsertNote.mutate,
        isSaving: upsertNote.isPending
    };
}
