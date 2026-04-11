'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  SlidersHorizontal,
  CheckCircle2,
  Lock,
  Save,
  Globe,
  GlobeLock,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAcmDetail, useUpdateAcmComparables, useUpdateAcmFoda, useUpdateAcmConclusions, useUpdateAcmPropertyData, useToggleAcmPublic, acmKeys } from '@/features/acm/hooks/useAcm';
import { PropertyForm } from '@/features/acm/components/PropertyForm';
import { PropertyPhotoUpload } from '@/features/acm/components/PropertyPhotoUpload';
import { ComparablesSearch } from '@/features/acm/components/ComparablesSearch';
import { ComparablesTable } from '@/features/acm/components/ComparablesTable';
import { ManualComparableForm } from '@/features/acm/components/ManualComparableForm';
import { ComparablesSummary } from '@/features/acm/components/ComparablesSummary';
import { FodaWizard } from '@/features/acm/components/FodaWizard';
import { FodaDisplay } from '@/features/acm/components/FodaDisplay';
import { ConclusionsTable } from '@/features/acm/components/ConclusionsTable';
import { AgentConclusionRecorder } from '@/features/acm/components/AgentConclusionRecorder';
import { ACM_STATUS_LABELS, ACM_STATUS_COLORS, ACM_WIZARD_STEPS } from '@/features/acm/constants/acmConstants';
import type { NormalizedComparable, FodaAnalysis, AcmConclusions } from '@/features/acm/types/acm';

interface Props {
  params: Promise<{ id: string }>;
}

export default function AcmDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: acm, isLoading, error } = useAcmDetail(id);

  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [localComparables, setLocalComparables] = useState<NormalizedComparable[] | null>(null);
  const [localFodaAnalysis, setLocalFodaAnalysis] = useState<FodaAnalysis | null>(null);
  const [localFodaResponses, setLocalFodaResponses] = useState<Record<string, string> | null>(null);

  const [localConclusions, setLocalConclusions] = useState<AcmConclusions | null>(null);
  const [localAgentConclusion, setLocalAgentConclusion] = useState<string | null>(null);
  const [localImages, setLocalImages] = useState<string[] | null>(null);

  const updatePropertyDataMutation = useUpdateAcmPropertyData(id);
  const updateComparablesMutation = useUpdateAcmComparables(id);
  const updateFodaMutation = useUpdateAcmFoda(id);
  const updateConclusionsMutation = useUpdateAcmConclusions(id);
  const togglePublicMutation = useToggleAcmPublic(id);

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        <p className="text-white/30 text-sm">Cargando tasación...</p>
      </div>
    );
  }

  if (error || !acm) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center gap-4">
        <p className="text-white/40">Tasación no encontrada</p>
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/acm')}
          className="text-white/50 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  const currentStep = getStep(acm.status);
  const displayStep = activeStep ?? Math.min(currentStep, 4); // Pasos 1-4 disponibles
  const propertyAddress =
    [acm.propertyData?.address, acm.propertyData?.neighborhood]
      .filter(Boolean)
      .join(', ') || 'Nueva Tasación';

  // Comparables: estado local (editable) o el de la DB
  const comparables = localComparables ?? acm.comparables ?? [];

  const handleComparablesChange = (updated: NormalizedComparable[]) => {
    setLocalComparables(updated);
  };

  const handleSearchResults = (newComparables: NormalizedComparable[]) => {
    setLocalComparables(newComparables);
  };

  const handleAddManual = (comp: NormalizedComparable) => {
    const updated = [...comparables, comp];
    setLocalComparables(updated);
  };

  const handleSaveComparables = async () => {
    if (!localComparables) return;
    await updateComparablesMutation.mutateAsync(localComparables);
    setLocalComparables(null); // Volver a usar datos de la query
  };

  const hasUnsavedComparables = localComparables !== null;

  // FODA state
  const fodaAnalysis = localFodaAnalysis ?? (acm.fodaAnalysis as FodaAnalysis | undefined);
  const fodaResponses = localFodaResponses ?? acm.fodaResponses ?? {};
  const hasFodaAnalysis = fodaAnalysis && Object.values(fodaAnalysis).some((v) => v);
  const hasUnsavedFoda = localFodaAnalysis !== null;

  const handleFodaComplete = (responses: Record<string, string>, analysis: FodaAnalysis) => {
    setLocalFodaResponses(responses);
    setLocalFodaAnalysis(analysis);
  };

  const handleFodaChange = (analysis: FodaAnalysis) => {
    setLocalFodaAnalysis(analysis);
  };

  const handleSaveFoda = async () => {
    if (!localFodaAnalysis) return;
    await updateFodaMutation.mutateAsync({
      fodaResponses: localFodaResponses ?? acm.fodaResponses ?? {},
      fodaAnalysis: localFodaAnalysis,
    });
    setLocalFodaAnalysis(null);
    setLocalFodaResponses(null);
  };

  // Conclusions state
  const agentConclusion = localAgentConclusion ?? acm.agentConclusion ?? '';
  const hasUnsavedConclusions = localConclusions !== null || localAgentConclusion !== null;

  const handleConclusionsChange = (conclusions: AcmConclusions) => {
    setLocalConclusions(conclusions);
  };

  const handleAgentConclusionChange = (text: string) => {
    setLocalAgentConclusion(text);
  };

  const handleSaveConclusions = async () => {
    const conclusionsToSave = localConclusions ?? (acm.conclusions as AcmConclusions) ?? {};
    const conclusionText = localAgentConclusion ?? acm.agentConclusion ?? '';
    await updateConclusionsMutation.mutateAsync({
      conclusions: conclusionsToSave,
      agentConclusion: conclusionText,
      suggestedPriceUsd: conclusionsToSave.suggestedTotalPrice,
    });
    setLocalConclusions(null);
    setLocalAgentConclusion(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mt-6 -mx-6 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-shrink-0 border-b border-white/[0.06] px-6 py-3 flex items-center gap-4 bg-[#030712]/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/acm')}
          className="h-8 w-8 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">{propertyAddress}</h1>
          <p className="text-[11px] text-white/30">Análisis Comparativo de Mercado</p>
        </div>

        <span
          className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium border ${ACM_STATUS_COLORS[acm.status]}`}
        >
          {ACM_STATUS_LABELS[acm.status]}
        </span>

        {/* Public toggle + link */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => togglePublicMutation.mutate(!acm.isPublic)}
            disabled={togglePublicMutation.isPending}
            className={`h-7 rounded-lg text-[10px] gap-1 ${
              acm.isPublic
                ? 'text-emerald-400/70 hover:text-emerald-400'
                : 'text-white/30 hover:text-white/50'
            }`}
            title={acm.isPublic ? 'Página pública activa' : 'Página pública desactivada'}
          >
            {acm.isPublic ? <Globe className="h-3 w-3" /> : <GlobeLock className="h-3 w-3" />}
            {acm.isPublic ? 'Pública' : 'Privada'}
          </Button>
          {acm.isPublic && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/25 hover:text-white/50"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/acm/${id}`);
                  toast.success('Link copiado');
                }}
                title="Copiar link público"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <a
                href={`/acm/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-colors"
                title="Ver página pública"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </div>
      </div>

      {/* ── Stepper ── */}
      <div className="flex-shrink-0 border-b border-white/[0.06] px-6 py-0 bg-[#030712]/60">
        <div className="flex">
          {ACM_WIZARD_STEPS.map((step) => {
            const isClickable = step.id <= 4; // Pasos 1-4 activos
            const isActive = step.id === displayStep;
            const isDone = currentStep > step.id;
            const isLocked = step.id > 4;

            return (
              <button
                key={step.id}
                onClick={() => isClickable && setActiveStep(step.id)}
                disabled={!isClickable}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all text-sm ${
                  isActive
                    ? 'border-violet-500 text-white'
                    : isDone
                      ? 'border-violet-500/40 text-white/50 hover:text-white/70 cursor-pointer'
                      : isClickable
                        ? 'border-transparent text-white/40 hover:text-white/60 cursor-pointer'
                        : 'border-transparent text-white/25 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    isDone
                      ? 'bg-violet-500/30 text-violet-400'
                      : isActive
                        ? 'bg-violet-500 text-white'
                        : 'bg-white/[0.06] text-white/25'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-3 w-3" /> : step.id}
                </div>
                <span className="hidden md:block font-medium">{step.label}</span>
                {isLocked && <Lock className="h-3 w-3 text-white/15 hidden md:block" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contenido del paso activo ── */}
      <div className="flex-1 overflow-hidden">
        {displayStep === 1 && (
          /* ── Paso 1: Formulario de datos + Fotos ── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] h-full">
            <div className="border-r border-white/[0.06] overflow-hidden flex flex-col">
              <PropertyForm
                acmId={acm.id}
                propertyData={acm.propertyData || {}}
              />
            </div>
            <div className="overflow-hidden flex-col hidden lg:flex">
              <PropertyPhotoUpload
                acmId={acm.id}
                images={localImages ?? acm.propertyImages ?? []}
                onChange={(imgs) => {
                  setLocalImages(imgs);
                  // Auto-save photos
                  updatePropertyDataMutation.mutate({
                    propertyData: acm.propertyData || {},
                    images: imgs,
                  });
                }}
              />
            </div>
          </div>
        )}

        {displayStep === 2 && (
          /* ── Paso 2: Comparables ── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] h-full">
            {/* Main: search + table */}
            <div className="border-r border-white/[0.06] overflow-y-auto p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-violet-400/60" />
                  <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                    Buscar comparables
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ManualComparableForm onAdd={handleAddManual} />
                  {hasUnsavedComparables && (
                    <Button
                      onClick={handleSaveComparables}
                      disabled={updateComparablesMutation.isPending}
                      size="sm"
                      className="h-8 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl text-xs"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      Guardar
                    </Button>
                  )}
                </div>
              </div>

              <ComparablesSearch
                acmId={acm.id}
                propertyData={acm.propertyData || {}}
                onResults={handleSearchResults}
              />

              <ComparablesTable
                comparables={comparables}
                onChange={handleComparablesChange}
              />
            </div>

            {/* Sidebar: summary */}
            <div className="overflow-y-auto p-4 hidden lg:block">
              <ComparablesSummary comparables={comparables} />
            </div>
          </div>
        )}

        {displayStep === 3 && (
          /* ── Paso 3: FODA ── */
          <div className="h-full overflow-y-auto p-5">
            {hasFodaAnalysis ? (
              <FodaDisplay
                analysis={fodaAnalysis!}
                fodaResponses={fodaResponses}
                propertyData={acm.propertyData || {}}
                onChange={handleFodaChange}
                onSave={handleSaveFoda}
                isSaving={updateFodaMutation.isPending}
                hasUnsavedChanges={hasUnsavedFoda}
              />
            ) : (
              <FodaWizard
                propertyData={acm.propertyData || {}}
                existingResponses={Object.keys(fodaResponses).length > 0 ? fodaResponses : undefined}
                onComplete={handleFodaComplete}
              />
            )}
          </div>
        )}

        {displayStep === 4 && (
          /* ── Paso 4: Conclusiones ── */
          <div className="h-full overflow-y-auto p-5 space-y-6">
            <ConclusionsTable
              comparables={comparables}
              totalAreaM2={acm.propertyData?.totalArea ?? null}
              conclusions={localConclusions ?? (acm.conclusions as AcmConclusions) ?? null}
              onConclusionsChange={handleConclusionsChange}
            />
            <AgentConclusionRecorder
              conclusion={agentConclusion}
              propertyAddress={propertyAddress}
              suggestedPrice={
                (localConclusions ?? (acm.conclusions as AcmConclusions))?.suggestedTotalPrice
              }
              currency="USD"
              onChange={handleAgentConclusionChange}
            />
          </div>
        )}

        {displayStep > 4 && (
          /* ── Paso 5: Próximamente ── */
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <Lock className="h-8 w-8 text-white/15" />
            </div>
            <p className="text-white/40 text-sm font-medium">Próximamente</p>
            <p className="text-white/20 text-xs">Este paso estará disponible en próximas versiones</p>
          </div>
        )}
      </div>

      {/* ── Footer: Unsaved conclusions warning ── */}
      {hasUnsavedConclusions && displayStep === 4 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 border-t border-emerald-500/20 px-6 py-2.5 flex items-center justify-between bg-emerald-500/[0.04]"
        >
          <p className="text-xs text-emerald-400/70">
            Tenés cambios en conclusiones sin guardar
          </p>
          <Button
            onClick={handleSaveConclusions}
            disabled={updateConclusionsMutation.isPending}
            size="sm"
            className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white border-0 rounded-lg text-xs"
          >
            <Save className="h-3 w-3 mr-1.5" />
            Guardar conclusiones
          </Button>
        </motion.div>
      )}

      {/* ── Footer: Unsaved FODA warning ── */}
      {hasUnsavedFoda && displayStep === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 border-t border-violet-500/20 px-6 py-2.5 flex items-center justify-between bg-violet-500/[0.04]"
        >
          <p className="text-xs text-violet-400/70">
            Tenés cambios en el FODA sin guardar
          </p>
          <Button
            onClick={handleSaveFoda}
            disabled={updateFodaMutation.isPending}
            size="sm"
            className="h-7 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-lg text-xs"
          >
            <Save className="h-3 w-3 mr-1.5" />
            Guardar FODA
          </Button>
        </motion.div>
      )}

      {/* ── Footer: Unsaved comparables warning ── */}
      {hasUnsavedComparables && displayStep === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 border-t border-amber-500/20 px-6 py-2.5 flex items-center justify-between bg-amber-500/[0.04]"
        >
          <p className="text-xs text-amber-400/70">
            Tenés cambios en comparables sin guardar
          </p>
          <Button
            onClick={handleSaveComparables}
            disabled={updateComparablesMutation.isPending}
            size="sm"
            className="h-7 bg-amber-600 hover:bg-amber-500 text-white border-0 rounded-lg text-xs"
          >
            <Save className="h-3 w-3 mr-1.5" />
            Guardar ahora
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ── Helper: status → step number ─────────────────────────────────────────────

function getStep(status: string): number {
  const map: Record<string, number> = {
    draft: 1,
    data_collected: 2,
    comparables_loaded: 3,
    foda_done: 4,
    completed: 5,
  };
  return map[status] ?? 1;
}
