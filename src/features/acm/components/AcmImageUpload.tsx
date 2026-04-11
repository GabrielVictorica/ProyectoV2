'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  acmId: string;
  onAnalysis: (chatMessage: string, imageDataUrl: string) => void;
  disabled?: boolean;
}

export function AcmImageUpload({ acmId, onAnalysis, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no puede superar 10 MB');
      return;
    }

    setLoading(true);
    try {
      // Convertir a base64 para enviar a Gemini vision
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/acm/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: dataUrl }),
      });

      if (!res.ok) throw new Error('Error al analizar imagen');
      const { analysis } = await res.json();

      onAnalysis(analysis.chatMessage, dataUrl);
    } catch (err: any) {
      console.error('[AcmImageUpload]', err);
      toast.error('No se pudo analizar la imagen');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || loading}
        className="h-9 w-9 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"
        title="Adjuntar foto de la propiedad"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
      </Button>
    </>
  );
}
