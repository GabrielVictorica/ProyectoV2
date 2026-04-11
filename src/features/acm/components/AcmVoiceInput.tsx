'use client';

import { useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function AcmVoiceInput({ onTranscript, disabled }: Props) {
  const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const hasSpeechAPI =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // ── Web Speech API (real-time, gratuito) ─────────────────────────────────

  const startWebSpeech = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.continuous = true;
    recognition.interimResults = false;

    let finalTranscript = '';

    recognition.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript + ' ';
        }
      }
    };
    recognition.onerror = () => {
      setState('idle');
      toast.error('Error en el reconocimiento de voz');
    };
    recognition.onend = () => {
      if (finalTranscript.trim()) onTranscript(finalTranscript.trim());
      setState('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState('recording');
  }, [onTranscript]);

  const stopWebSpeech = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // ── Fallback: MediaRecorder → Groq Whisper ────────────────────────────────

  const startGroqRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setState('processing');
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        try {
          const res = await fetch('/api/acm/transcribe', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.text) onTranscript(data.text);
          else toast.error('No se pudo transcribir el audio');
        } catch {
          toast.error('Error al transcribir');
        } finally {
          setState('idle');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setState('recording');
    } catch {
      toast.error('Sin acceso al micrófono');
    }
  }, [onTranscript]);

  const stopGroqRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  // ── Handler principal ─────────────────────────────────────────────────────

  const handleClick = () => {
    if (state === 'idle') {
      if (hasSpeechAPI) startWebSpeech();
      else startGroqRecording();
    } else if (state === 'recording') {
      if (hasSpeechAPI) stopWebSpeech();
      else stopGroqRecording();
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={disabled || state === 'processing'}
      className={`h-9 w-9 rounded-xl transition-all ${
        state === 'recording'
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse'
          : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
      }`}
      title={
        state === 'recording'
          ? 'Detener grabación'
          : state === 'processing'
            ? 'Procesando...'
            : 'Grabar mensaje de voz'
      }
    >
      {state === 'processing' ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : state === 'recording' ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
