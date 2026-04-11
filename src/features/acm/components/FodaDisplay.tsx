'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Lightbulb,
  AlertTriangle,
  CloudLightning,
  Edit3,
  Check,
  RefreshCw,
  Loader2,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { FodaAnalysis, PropertyData } from '../types/acm';

// ── Section config ──────────────────────────────────────────────────────────

const SECTIONS = [
  {
    key: 'fortalezas' as const,
    label: 'Fortalezas',
    icon: Shield,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    barColor: 'bg-emerald-500',
    diplomatic: false,
  },
  {
    key: 'oportunidades' as const,
    label: 'Oportunidades',
    icon: Lightbulb,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    barColor: 'bg-blue-500',
    diplomatic: false,
  },
  {
    key: 'debilidades' as const,
    label: 'Debilidades',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    barColor: 'bg-amber-500',
    diplomatic: true,
  },
  {
    key: 'amenazas' as const,
    label: 'Amenazas',
    icon: CloudLightning,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    barColor: 'bg-red-500',
    diplomatic: true,
  },
];

interface Props {
  analysis: FodaAnalysis;
  fodaResponses: Record<string, string>;
  propertyData: Partial<PropertyData>;
  onChange: (analysis: FodaAnalysis) => void;
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

export function FodaDisplay({
  analysis,
  fodaResponses,
  propertyData,
  onChange,
  onSave,
  isSaving,
  hasUnsavedChanges,
}: Props) {
  const [editingKey, setEditingKey] = useState<keyof FodaAnalysis | null>(null);
  const [editValue, setEditValue] = useState('');
  const [regeneratingKey, setRegeneratingKey] = useState<keyof FodaAnalysis | null>(null);

  // ── Start editing ─────────────────────────────────────────────────────────

  const startEdit = (key: keyof FodaAnalysis) => {
    setEditingKey(key);
    setEditValue(analysis[key] || '');
  };

  const confirmEdit = () => {
    if (!editingKey) return;
    onChange({ ...analysis, [editingKey]: editValue });
    setEditingKey(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  // ── Regenerate single section ─────────────────────────────────────────────

  const regenerateSection = async (key: keyof FodaAnalysis) => {
    setRegeneratingKey(key);
    try {
      const res = await fetch('/api/acm/foda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redact',
          propertyData,
          fodaResponses,
        }),
      });
      const data = await res.json();
      if (data.success && data.analysis[key]) {
        onChange({ ...analysis, [key]: data.analysis[key] });
        toast.success(`${SECTIONS.find((s) => s.key === key)?.label} regenerado`);
      } else {
        toast.error('Error al regenerar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setRegeneratingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Análisis FODA</h3>
          <p className="text-[10px] text-white/30 mt-0.5">
            Redactado por IA. Podés editar o regenerar cada sección.
          </p>
        </div>
        {hasUnsavedChanges && (
          <Button
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="h-8 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl text-xs"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Guardar FODA
          </Button>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map((section, i) => {
          const Icon = section.icon;
          const isEditing = editingKey === section.key;
          const isRegenerating = regeneratingKey === section.key;
          const content = analysis[section.key] || '';

          return (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-xl border ${section.borderColor} bg-white/[0.02] overflow-hidden`}
            >
              {/* Card header */}
              <div className={`px-4 py-2.5 flex items-center gap-2 ${section.bgColor}`}>
                <Icon className={`h-4 w-4 ${section.color}`} />
                <span className={`text-xs font-semibold ${section.color}`}>
                  {section.label}
                </span>
                {section.diplomatic && (
                  <span className="text-[9px] text-white/25 ml-auto italic">diplomático</span>
                )}
              </div>

              {/* Top bar */}
              <div className={`h-0.5 ${section.barColor} opacity-40`} />

              {/* Content */}
              <div className="p-4">
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={5}
                      className="bg-white/[0.04] border-white/[0.08] text-white text-xs rounded-xl resize-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEdit}
                        className="h-7 text-white/40 hover:text-white/70 text-[10px]"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={confirmEdit}
                        className="h-7 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-lg text-[10px]"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Aplicar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-white/60 leading-relaxed whitespace-pre-line">
                      {isRegenerating ? (
                        <span className="flex items-center gap-2 text-white/30">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Regenerando...
                        </span>
                      ) : (
                        content || 'Sin análisis disponible'
                      )}
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/[0.04]">
                      <button
                        onClick={() => startEdit(section.key)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
                      >
                        <Edit3 className="h-2.5 w-2.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => regenerateSection(section.key)}
                        disabled={isRegenerating}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all disabled:opacity-30"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                        Regenerar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
