'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  Edit3,
  Check,
  RotateCcw,
  Keyboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Props {
  conclusion: string;
  propertyAddress?: string;
  suggestedPrice?: number;
  currency?: string;
  onChange: (conclusion: string) => void;
}

type Mode = 'idle' | 'recording' | 'processing' | 'editing' | 'polishing';

export function AgentConclusionRecorder({
  conclusion,
  propertyAddress,
  suggestedPrice,
  currency = 'USD',
  onChange,
}: Props) {
  const [mode, setMode] = useState<Mode>(conclusion ? 'idle' : 'idle');
  const [rawText, setRawText] = useState('');
  const [editText, setEditText] = useState('');
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // ── Voice Recording (Web Speech API) ──────────────────────────────────────

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      // Web Speech API path
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-AR';
      recognition.interimResults = true;
      recognition.continuous = true;

      let transcript = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          } else {
            interim = event.results[i][0].transcript;
          }
        }
        setRawText(transcript + interim);
      };

      recognition.onerror = () => {
        // Fallback to MediaRecorder + Whisper
        recognition.stop();
        startMediaRecorder();
      };

      recognition.onend = () => {
        if (mode === 'recording') {
          setRawText(transcript.trim());
          setMode('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setMode('recording');
      setRawText('');
    } else {
      // No Web Speech API, use MediaRecorder directly
      startMediaRecorder();
    }
  }, [mode]);

  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeWithWhisper(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setMode('recording');
      setRawText('Grabando audio...');
    } catch {
      toast.error('No se pudo acceder al micrófono');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setMode('processing');
      return;
    }
    setMode('idle');
  };

  // ── Whisper Transcription ─────────────────────────────────────────────────

  const transcribeWithWhisper = async (blob: Blob) => {
    setMode('processing');
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'conclusion.webm');

      const res = await fetch('/api/acm/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setRawText(data.text);
      } else {
        toast.error('Error al transcribir');
        setRawText('');
      }
    } catch {
      toast.error('Error de conexión');
      setRawText('');
    } finally {
      setMode('idle');
    }
  };

  // ── AI Polish ─────────────────────────────────────────────────────────────

  const polishWithAI = async (text: string) => {
    if (!text.trim()) {
      toast.error('Escribí o grabá tu conclusión primero');
      return;
    }
    setMode('polishing');
    try {
      const res = await fetch('/api/acm/conclusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawConclusion: text,
          propertyAddress,
          suggestedPrice,
          currency,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onChange(data.polished);
        setRawText('');
        toast.success('Conclusión redactada profesionalmente');
      } else {
        toast.error(data.error || 'Error al pulir conclusión');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setMode('idle');
    }
  };

  // ── Edit existing ─────────────────────────────────────────────────────────

  const startEdit = () => {
    setEditText(conclusion);
    setMode('editing');
  };

  const confirmEdit = () => {
    onChange(editText);
    setMode('idle');
  };

  const cancelEdit = () => {
    setEditText('');
    setMode('idle');
  };

  // ── Manual text mode ──────────────────────────────────────────────────────

  const [showTextInput, setShowTextInput] = useState(false);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center gap-2">
        <Mic className="h-3.5 w-3.5 text-violet-400/60" />
        <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
          Conclusión del profesional
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Existing conclusion display */}
        {conclusion && mode !== 'editing' && (
          <div className="relative group">
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
              {conclusion}
            </p>
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/[0.04]">
              <button
                onClick={startEdit}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
              >
                <Edit3 className="h-2.5 w-2.5" />
                Editar
              </button>
              <button
                onClick={() => { setRawText(conclusion); polishWithAI(conclusion); }}
                disabled={mode === 'polishing'}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                Regenerar con IA
              </button>
            </div>
          </div>
        )}

        {/* Editing mode */}
        {mode === 'editing' && (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={6}
              className="bg-white/[0.04] border-white/[0.08] text-white text-sm rounded-xl resize-none"
            />
            <div className="flex justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEdit}
                className="h-7 text-white/40 text-[10px]"
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
        )}

        {/* Recording / Input area (when no conclusion yet or adding new) */}
        {!conclusion && mode !== 'editing' && (
          <div className="space-y-3">
            {/* Raw text preview during/after recording */}
            {rawText && (
              <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <p className="text-[10px] text-white/25 mb-1">Transcripción:</p>
                <p className="text-xs text-white/50 leading-relaxed">{rawText}</p>
              </div>
            )}

            {/* Text input mode */}
            {showTextInput && (
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Escribí tu conclusión profesional sobre esta tasación..."
                rows={4}
                className="bg-white/[0.04] border-white/[0.08] text-white text-sm rounded-xl resize-none placeholder:text-white/20"
              />
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {mode === 'recording' ? (
                <Button
                  onClick={stopRecording}
                  size="sm"
                  className="h-9 bg-red-600 hover:bg-red-500 text-white border-0 rounded-xl text-xs animate-pulse"
                >
                  <MicOff className="h-3.5 w-3.5 mr-1.5" />
                  Detener grabación
                </Button>
              ) : mode === 'processing' ? (
                <Button disabled size="sm" className="h-9 rounded-xl text-xs">
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Transcribiendo...
                </Button>
              ) : mode === 'polishing' ? (
                <Button disabled size="sm" className="h-9 rounded-xl text-xs">
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Puliendo con IA...
                </Button>
              ) : (
                <>
                  <Button
                    onClick={startRecording}
                    size="sm"
                    variant="outline"
                    className="h-9 border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-xl text-xs"
                  >
                    <Mic className="h-3.5 w-3.5 mr-1.5" />
                    Grabar conclusión
                  </Button>

                  <Button
                    onClick={() => setShowTextInput(!showTextInput)}
                    size="sm"
                    variant="ghost"
                    className="h-9 text-white/40 hover:text-white/70 text-xs"
                  >
                    <Keyboard className="h-3.5 w-3.5 mr-1.5" />
                    {showTextInput ? 'Ocultar' : 'Escribir'}
                  </Button>

                  {rawText.trim().length > 10 && (
                    <Button
                      onClick={() => polishWithAI(rawText)}
                      size="sm"
                      className="h-9 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl text-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Pulir con IA
                    </Button>
                  )}
                </>
              )}
            </div>

            {!rawText && !showTextInput && mode === 'idle' && (
              <p className="text-[10px] text-white/20">
                Grabá con voz o escribí tu conclusión profesional. La IA la pulirá manteniendo tu mensaje.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
