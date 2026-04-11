'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Lightbulb,
  AlertTriangle,
  CloudLightning,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { PropertyData, FodaAnalysis } from '../types/acm';

// ── FODA letter config ──────────────────────────────────────────────────────

const FODA_LETTERS = [
  {
    key: 'f',
    label: 'Fortalezas',
    icon: Shield,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    description: 'Aspectos positivos internos de la propiedad',
  },
  {
    key: 'o',
    label: 'Oportunidades',
    icon: Lightbulb,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    description: 'Factores externos favorables del mercado o zona',
  },
  {
    key: 'd',
    label: 'Debilidades',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    description: 'Aspectos internos a mejorar (se redactarán diplomáticamente)',
  },
  {
    key: 'a',
    label: 'Amenazas',
    icon: CloudLightning,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    description: 'Factores de riesgo externos (se redactarán diplomáticamente)',
  },
] as const;

interface FodaQuestions {
  fortalezas: string[];
  oportunidades: string[];
  debilidades: string[];
  amenazas: string[];
}

const questionKeyMap: Record<string, keyof FodaQuestions> = {
  f: 'fortalezas',
  o: 'oportunidades',
  d: 'debilidades',
  a: 'amenazas',
};

interface Props {
  propertyData: Partial<PropertyData>;
  existingResponses?: Record<string, string>;
  onComplete: (responses: Record<string, string>, analysis: FodaAnalysis) => void;
}

export function FodaWizard({ propertyData, existingResponses, onComplete }: Props) {
  const [letterIndex, setLetterIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>(existingResponses || {});
  const [questions, setQuestions] = useState<FodaQuestions | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [redacting, setRedacting] = useState(false);

  const currentLetter = FODA_LETTERS[letterIndex];

  // ── Load AI questions ─────────────────────────────────────────────────────

  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const res = await fetch('/api/acm/foda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'questions', propertyData }),
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
        if (data.fallback) {
          toast.info('Se usaron preguntas genéricas (la IA no respondió)');
        }
      } else {
        toast.error('Error al generar preguntas');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLoadingQuestions(false);
    }
  }, [propertyData]);

  // Load on first render if not loaded
  if (!questions && !loadingQuestions) {
    loadQuestions();
  }

  // ── Handle response changes ───────────────────────────────────────────────

  const handleResponseChange = (questionIndex: number, value: string) => {
    const key = `${currentLetter.key}${questionIndex + 1}`;
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const canGoNext = () => {
    const letterKey = currentLetter.key;
    // At least one answer for current letter
    return [1, 2, 3].some((i) => (responses[`${letterKey}${i}`] || '').trim().length > 0);
  };

  const goNext = () => {
    if (letterIndex < FODA_LETTERS.length - 1) {
      setLetterIndex(letterIndex + 1);
    }
  };

  const goPrev = () => {
    if (letterIndex > 0) {
      setLetterIndex(letterIndex - 1);
    }
  };

  // ── Submit: redact with AI ────────────────────────────────────────────────

  const handleFinish = async () => {
    setRedacting(true);
    try {
      const res = await fetch('/api/acm/foda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redact',
          propertyData,
          fodaResponses: responses,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onComplete(responses, data.analysis as FodaAnalysis);
        toast.success('Análisis FODA generado');
      } else {
        toast.error(data.error || 'Error al redactar FODA');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setRedacting(false);
    }
  };

  const isLastLetter = letterIndex === FODA_LETTERS.length - 1;

  // ── Loading state ─────────────────────────────────────────────────────────

  if (!questions || loadingQuestions) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
          <Sparkles className="h-6 w-6 text-violet-400 animate-pulse" />
        </div>
        <p className="text-sm text-white/40">Generando preguntas con IA...</p>
        <p className="text-[10px] text-white/20">Contextualizadas para tu propiedad</p>
      </div>
    );
  }

  // ── Current questions ─────────────────────────────────────────────────────

  const currentQuestions = questions[questionKeyMap[currentLetter.key]] || [];
  const Icon = currentLetter.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="flex-shrink-0 px-6 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-3">
          {FODA_LETTERS.map((letter, i) => {
            const LetterIcon = letter.icon;
            const hasResponses = [1, 2, 3].some(
              (q) => (responses[`${letter.key}${q}`] || '').trim().length > 0,
            );
            return (
              <button
                key={letter.key}
                onClick={() => setLetterIndex(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  i === letterIndex
                    ? `${letter.bgColor} ${letter.color} ${letter.borderColor} border`
                    : hasResponses
                      ? 'bg-white/[0.06] text-white/50 hover:text-white/70'
                      : 'bg-white/[0.03] text-white/25 hover:text-white/40'
                }`}
              >
                <LetterIcon className="h-3 w-3" />
                {letter.label[0]}
              </button>
            );
          })}
        </div>
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-violet-500 rounded-full"
            animate={{ width: `${((letterIndex + 1) / FODA_LETTERS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLetter.key}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Letter header */}
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${currentLetter.bgColor} ${currentLetter.borderColor} border`}>
                <Icon className={`h-5 w-5 ${currentLetter.color}`} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{currentLetter.label}</h3>
                <p className="text-xs text-white/40 mt-0.5">{currentLetter.description}</p>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              {currentQuestions.map((question, qi) => {
                const responseKey = `${currentLetter.key}${qi + 1}`;
                return (
                  <div key={qi} className="space-y-1.5">
                    <label className="text-[11px] text-white/50 leading-relaxed block">
                      {qi + 1}. {question}
                    </label>
                    <Textarea
                      value={responses[responseKey] || ''}
                      onChange={(e) => handleResponseChange(qi, e.target.value)}
                      placeholder="Tu respuesta..."
                      rows={2}
                      className="bg-white/[0.04] border-white/[0.08] text-white text-sm placeholder:text-white/20 rounded-xl resize-none focus:border-violet-500/40"
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      <div className="flex-shrink-0 border-t border-white/[0.06] px-6 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={goPrev}
          disabled={letterIndex === 0}
          className="text-white/40 hover:text-white/70 text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Anterior
        </Button>

        <span className="text-[10px] text-white/25">
          {letterIndex + 1} / {FODA_LETTERS.length}
        </span>

        {isLastLetter ? (
          <Button
            size="sm"
            onClick={handleFinish}
            disabled={!canGoNext() || redacting}
            className="bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl text-xs"
          >
            {redacting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Redactando...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Generar análisis
              </>
            )}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={goNext}
            disabled={!canGoNext()}
            className="bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl text-xs"
          >
            Siguiente
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
