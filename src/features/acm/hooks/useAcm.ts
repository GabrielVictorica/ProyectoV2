'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createAcmAction,
  getAcmListAction,
  getAcmByIdAction,
  updateAcmPropertyDataAction,
  updateAcmComparablesAction,
  updateAcmFodaAction,
  updateAcmConclusionsAction,
  toggleAcmPublicAction,
  linkPersonToAcmAction,
  deleteAcmAction,
  saveChatHistoryAction,
  getCustomSitesAction,
  createCustomSiteAction,
  toggleCustomSiteAction,
  deleteCustomSiteAction,
} from '../actions/acmActions';
import type {
  AcmStatus,
  PropertyData,
  NormalizedComparable,
  FodaAnalysis,
  AcmConclusions,
} from '../types/acm';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const acmKeys = {
  all: ['acm'] as const,
  list: (filters: any) => [...acmKeys.all, 'list', filters] as const,
  detail: (id: string) => [...acmKeys.all, 'detail', id] as const,
  customSites: () => [...acmKeys.all, 'custom-sites'] as const,
};

// ─── List Hook ───────────────────────────────────────────────────────────────

export function useAcmList(filters: { search?: string; status?: AcmStatus } = {}) {
  return useQuery({
    queryKey: acmKeys.list(filters),
    queryFn: async () => {
      const result = await getAcmListAction(filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 60 * 1000,
  });
}

// ─── Detail Hook ─────────────────────────────────────────────────────────────

export function useAcmDetail(id: string) {
  return useQuery({
    queryKey: acmKeys.detail(id),
    queryFn: async () => {
      const result = await getAcmByIdAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────

export function useCreateAcm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAcmAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acmKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─── Update Property Data ────────────────────────────────────────────────────

export function useUpdateAcmPropertyData(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ propertyData, images }: { propertyData: Partial<PropertyData>; images?: string[] }) =>
      updateAcmPropertyDataAction(id, propertyData, images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acmKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: acmKeys.list({}) });
      toast.success('Datos guardados');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─── Update Comparables ──────────────────────────────────────────────────────

export function useUpdateAcmComparables(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (comparables: NormalizedComparable[]) =>
      updateAcmComparablesAction(id, comparables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acmKeys.detail(id) });
      toast.success('Comparables guardados');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─── Update FODA ─────────────────────────────────────────────────────────────

export function useUpdateAcmFoda(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fodaResponses,
      fodaAnalysis,
    }: {
      fodaResponses: Record<string, string>;
      fodaAnalysis: Partial<FodaAnalysis>;
    }) => updateAcmFodaAction(id, fodaResponses, fodaAnalysis),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acmKeys.detail(id) });
      toast.success('FODA guardado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─── Update Conclusions ──────────────────────────────────────────────────────

export function useUpdateAcmConclusions(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conclusions,
      agentConclusion,
      suggestedPriceUsd,
      suggestedPriceArs,
    }: {
      conclusions: Partial<AcmConclusions>;
      agentConclusion: string;
      suggestedPriceUsd?: number;
      suggestedPriceArs?: number;
    }) => updateAcmConclusionsAction(id, conclusions, agentConclusion, suggestedPriceUsd, suggestedPriceArs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acmKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: acmKeys.list({}) });
      toast.success('Conclusiones guardadas');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─── Toggle Public ───────────────────────────────────────────────────────────

export function useToggleAcmPublic(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isPublic: boolean) => toggleAcmPublicAction(id, isPublic),
    onSuccess: (_, isPublic) => {
      queryClient.invalidateQueries({ queryKey: acmKeys.detail(id) });
      toast.success(isPublic ? 'Página pública activada' : 'Página pública desactivada');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─── Link Person ─────────────────────────────────────────────────────────────

export function useLinkPersonToAcm(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (personId: string | null) => linkPersonToAcmAction(id, personId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acmKeys.detail(id) });
      toast.success('Persona vinculada');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export function useDeleteAcm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAcmAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acmKeys.all });
      toast.success('Tasación eliminada');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─── Save Chat History ───────────────────────────────────────────────────────

export function useSaveChatHistory(id: string) {
  return useMutation({
    mutationFn: (chatHistory: any[]) => saveChatHistoryAction(id, chatHistory),
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─── Custom Sites ────────────────────────────────────────────────────────────

export function useCustomSites() {
  return useQuery({
    queryKey: acmKeys.customSites(),
    queryFn: async () => {
      const result = await getCustomSitesAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCustomSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomSiteAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acmKeys.customSites() });
      toast.success('Sitio agregado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useToggleCustomSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleCustomSiteAction(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acmKeys.customSites() });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteCustomSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCustomSiteAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acmKeys.customSites() });
      toast.success('Sitio eliminado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
