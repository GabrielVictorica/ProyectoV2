'use client';

import { useState, useRef, useCallback } from 'react';

export interface AcmChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface UseAcmChatOptions {
  acmId: string;
  initialMessages?: AcmChatMessage[];
  onFinish?: () => void;
}

/**
 * Hook custom para chat streaming con AI SDK v6.
 * Parsea el protocolo de datos de AI SDK (toDataStreamResponse).
 */
export function useAcmChat({ acmId, initialMessages = [], onFinish }: UseAcmChatOptions) {
  const [messages, setMessages] = useState<AcmChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataSaved, setDataSaved] = useState(false);

  // Ref para acceder a mensajes actuales sin stale closure
  const messagesRef = useRef<AcmChatMessage[]>(initialMessages);
  messagesRef.current = messages;

  const append = useCallback(
    async (message: { role: 'user' | 'assistant'; content: string }) => {
      const userMsg: AcmChatMessage = {
        id: crypto.randomUUID(),
        role: message.role,
        content: message.content,
      };

      setMessages((prev) => [...prev, userMsg]);

      // Solo hacemos stream si es mensaje del usuario
      if (message.role !== 'user') return;

      setIsLoading(true);
      setDataSaved(false);

      const assistantId = crypto.randomUUID();
      // Placeholder del asistente
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      try {
        const body = JSON.stringify({
          messages: [...messagesRef.current, userMsg].map(({ role, content }) => ({
            role,
            content,
          })),
          acmId,
        });

        const res = await fetch('/api/acm/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        // toTextStreamResponse() devuelve texto plano en chunks
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: assistantText } : m)),
          );
        }

        setDataSaved(true);
        onFinish?.();
      } catch (err: any) {
        // Remover placeholder si falló
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        console.error('[useAcmChat]', err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [acmId, onFinish],
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;
      setInput('');
      await append({ role: 'user', content: text });
    },
    [input, isLoading, append],
  );

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    append,
    isLoading,
    dataSaved,
  };
}
