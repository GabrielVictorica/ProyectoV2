'use client';

import { useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { acmKeys } from '@/features/acm/hooks/useAcm';
import { useAcmChat } from '@/features/acm/hooks/useAcmChat';
import { AcmVoiceInput } from './AcmVoiceInput';
import { AcmImageUpload } from './AcmImageUpload';
import type { ChatMessage } from '../types/acm';

interface Props {
  acmId: string;
  initialMessages: ChatMessage[];
}

export function AcmChat({ acmId, initialMessages }: Props) {
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, input, setInput, handleSubmit, append, isLoading, dataSaved } = useAcmChat({
    acmId,
    initialMessages: initialMessages.map((m, i) => ({
      id: `init-${i}`,
      role: m.role,
      content: m.content,
    })),
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: acmKeys.detail(acmId) });
    },
  });

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleVoiceTranscript = (text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  };

  const handleImageAnalysis = (chatMessage: string) => {
    append({
      role: 'user',
      content: `[Foto de la propiedad adjunta]\n${chatMessage}`,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) handleSubmit(e as any);
    }
  };

  const visibleMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant');

  return (
    <div className="flex flex-col h-full">
      {/* ── Mensajes ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-white/10">
        {visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
            <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
              <Bot className="h-8 w-8 text-violet-400" />
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium mb-1">
                ¡Empecemos con la tasación!
              </p>
              <p className="text-white/30 text-xs max-w-xs leading-relaxed">
                Contame sobre la propiedad: dirección, tipo, superficie, ambientes... Podés
                escribir, usar el micrófono o adjuntar fotos.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                'Depto en Palermo, 3 amb, 75m²',
                'Casa en Tigre, 4 dorm',
                'PH en Villa Crespo, a estrenar',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          visibleMessages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-violet-400" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-violet-600/25 border border-violet-500/20 text-white/90 rounded-tr-sm'
                    : 'bg-white/[0.05] border border-white/[0.08] text-white/80 rounded-tl-sm'
                }`}
              >
                {message.content}
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center mt-0.5">
                  <User className="h-3.5 w-3.5 text-white/40" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Indicador de carga */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-violet-400/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        {/* Indicador de datos guardados */}
        {dataSaved && (
          <div className="flex justify-center">
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400/80 bg-emerald-500/[0.08] border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              Datos actualizados en el panel →
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="border-t border-white/[0.06] p-3 space-y-2">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí sobre la propiedad..."
            className="flex-1 min-h-[44px] max-h-32 resize-none bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-violet-500/40 py-2.5 text-sm rounded-xl"
            rows={1}
            disabled={isLoading}
          />
          <div className="flex items-center gap-1 pb-0.5">
            <AcmVoiceInput onTranscript={handleVoiceTranscript} disabled={isLoading} />
            <AcmImageUpload acmId={acmId} onAnalysis={handleImageAnalysis} disabled={isLoading} />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-9 w-9 rounded-xl bg-violet-600 hover:bg-violet-500 text-white border-0 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
        <p className="text-[10px] text-white/20 text-center">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
