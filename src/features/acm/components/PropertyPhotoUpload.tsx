'use client';

import { useState, useRef, useCallback } from 'react';
import {
  ImagePlus,
  X,
  Loader2,
  GripVertical,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface Props {
  acmId: string;
  images: string[];
  onChange: (images: string[]) => void;
}

const MAX_PHOTOS = 12;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB before compression
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

// ── Compress image client-side ─────────────────────────────────────────────

async function compressImage(file: File, maxWidth = 1600, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Error comprimiendo imagen'));
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error cargando imagen'));
    };

    img.src = url;
  });
}

// ── Upload to Supabase Storage ─────────────────────────────────────────────

async function uploadPhoto(acmId: string, file: File, index: number): Promise<string> {
  const supabase = createClient();
  const compressed = await compressImage(file);
  const ext = 'jpg';
  const path = `acm/${acmId}/${Date.now()}_${index}.${ext}`;

  const { error } = await supabase.storage
    .from('acm-photos')
    .upload(path, compressed, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw new Error(`Error subiendo foto: ${error.message}`);

  const { data } = supabase.storage.from('acm-photos').getPublicUrl(path);
  return data.publicUrl;
}

// ── Main Component ─────────────────────────────────────────────────────────

export function PropertyPhotoUpload({ acmId, images, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_PHOTOS - images.length;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Validate
      const valid = fileArray.filter((f) => {
        if (!ACCEPTED_TYPES.includes(f.type)) {
          toast.error(`${f.name}: formato no soportado`);
          return false;
        }
        if (f.size > MAX_FILE_SIZE) {
          toast.error(`${f.name}: excede 5MB`);
          return false;
        }
        return true;
      });

      const toUpload = valid.slice(0, remaining);
      if (toUpload.length === 0) return;

      if (valid.length > remaining) {
        toast.warning(`Solo se subirán ${remaining} fotos (máximo ${MAX_PHOTOS})`);
      }

      setUploading(true);
      setUploadProgress(0);

      const newUrls: string[] = [];
      for (let i = 0; i < toUpload.length; i++) {
        try {
          const url = await uploadPhoto(acmId, toUpload[i], images.length + i);
          newUrls.push(url);
          setUploadProgress(Math.round(((i + 1) / toUpload.length) * 100));
        } catch (err: any) {
          toast.error(err.message || 'Error subiendo foto');
        }
      }

      if (newUrls.length > 0) {
        onChange([...images, ...newUrls]);
        toast.success(`${newUrls.length} foto${newUrls.length > 1 ? 's' : ''} subida${newUrls.length > 1 ? 's' : ''}`);
      }

      setUploading(false);
      setUploadProgress(0);
    },
    [acmId, images, onChange, remaining],
  );

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Drag & drop reorder
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const updated = [...images];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    onChange(updated);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  // File drop zone
  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/[0.06] px-4 py-2.5 flex items-center justify-between bg-[#030712]/80">
        <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
          Fotos ({images.length}/{MAX_PHOTOS})
        </span>
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-[10px] text-violet-400/70 hover:text-violet-400 transition-colors disabled:opacity-50"
          >
            + Agregar fotos
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Photo grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {images.map((url, i) => (
              <div
                key={url}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                className={`relative group aspect-square rounded-xl overflow-hidden border transition-all cursor-grab active:cursor-grabbing ${
                  dragIndex === i
                    ? 'border-violet-500/50 opacity-50'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <img
                  src={url}
                  alt={`Foto ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex items-center gap-1">
                    <GripVertical className="h-3.5 w-3.5 text-white/60" />
                    <button
                      type="button"
                      onClick={() => handleRemove(i)}
                      className="p-1 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {/* Index badge */}
                <span className="absolute top-1 left-1 text-[9px] font-bold text-white/60 bg-black/40 px-1.5 py-0.5 rounded-md">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="mb-4 p-3 rounded-xl bg-violet-500/[0.08] border border-violet-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-3 w-3 text-violet-400 animate-spin" />
              <span className="text-[11px] text-violet-400/70">Subiendo fotos...</span>
              <span className="text-[11px] text-violet-400 font-medium ml-auto">{uploadProgress}%</span>
            </div>
            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Drop zone */}
        {remaining > 0 && !uploading && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDropZone}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
              dragOver
                ? 'border-violet-500/50 bg-violet-500/[0.06]'
                : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
            }`}
          >
            <ImagePlus className={`h-6 w-6 ${dragOver ? 'text-violet-400' : 'text-white/20'}`} />
            <p className="text-xs text-white/30 text-center">
              {images.length === 0
                ? 'Arrastrá fotos o hacé click para subir'
                : `Podés agregar ${remaining} foto${remaining > 1 ? 's' : ''} más`}
            </p>
            <p className="text-[10px] text-white/15">JPG, PNG, WebP — máx 5MB c/u</p>
          </div>
        )}

        {remaining === 0 && !uploading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400/60 shrink-0" />
            <p className="text-[10px] text-amber-400/60">
              Máximo de {MAX_PHOTOS} fotos alcanzado. Eliminá una para agregar más.
            </p>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}
