'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MapPin,
  Home,
  Ruler,
  Layers,
  Star,
  Mic,
  MicOff,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { propertyDataSchema, type PropertyDataInput } from '../schemas/propertyDataSchema';
import { useUpdateAcmPropertyData } from '../hooks/useAcm';
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_SUBTYPE_OPTIONS,
  CONSERVATION_STATE_OPTIONS,
  PROPERTY_CONDITION_LABELS,
} from '../constants/acmConstants';
import type { PropertyData, PropertyType } from '../types/acm';

interface Props {
  acmId: string;
  propertyData: Partial<PropertyData>;
}

const inputCls =
  'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-violet-500/40 text-sm h-9 rounded-xl';

// ── Voice Dictation Hook ───────────────────────────────────────────────────

function useVoiceDictation(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggle = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Tu navegador no soporta dictado por voz');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      onResult(transcript);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, onResult]);

  return { listening, toggle };
}

// ── Mic Button ─────────────────────────────────────────────────────────────

function MicButton({ fieldName, onResult }: { fieldName: string; onResult: (text: string) => void }) {
  const { listening, toggle } = useVoiceDictation(onResult);

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? 'Detener dictado' : 'Dictar con voz'}
      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
        listening
          ? 'text-red-400 bg-red-500/10 animate-pulse'
          : 'text-white/20 hover:text-white/40 hover:bg-white/[0.04]'
      }`}
    >
      {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function PropertyForm({ acmId, propertyData }: Props) {
  const updateMutation = useUpdateAcmPropertyData(acmId);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<PropertyDataInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(propertyDataSchema) as any,
    defaultValues: formDefaults(propertyData),
  });

  // Sync when external data changes
  useEffect(() => {
    reset(formDefaults(propertyData));
  }, [propertyData, reset]);

  const selectedType = watch('propertyType') as PropertyType | null;
  const subtypeOptions = selectedType ? PROPERTY_SUBTYPE_OPTIONS[selectedType] : undefined;

  // Clear subtype when type changes and current subtype is invalid
  useEffect(() => {
    const currentSubtype = watch('propertySubtype');
    if (currentSubtype && subtypeOptions) {
      const valid = subtypeOptions.some((o) => o.value === currentSubtype);
      if (!valid) setValue('propertySubtype', null);
    } else if (!subtypeOptions && currentSubtype) {
      setValue('propertySubtype', null);
    }
  }, [selectedType, subtypeOptions, watch, setValue]);

  // Auto-save on blur (debounced)
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSubmit(async (data) => {
        const result = await updateMutation.mutateAsync({ propertyData: data });
        setSavedAt(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
      })();
    }, 2000);
  }, [handleSubmit, updateMutation]);

  // Watch all fields for auto-save
  useEffect(() => {
    const sub = watch(() => {
      if (isDirty) triggerAutoSave();
    });
    return () => sub.unsubscribe();
  }, [watch, isDirty, triggerAutoSave]);

  const onManualSave = handleSubmit(async (data) => {
    await updateMutation.mutateAsync({ propertyData: data });
    setSavedAt(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/[0.06] px-4 py-2.5 flex items-center justify-between bg-[#030712]/80">
        <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
          Datos de la propiedad
        </span>
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="text-[10px] text-emerald-400/50 flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Guardado {savedAt}
            </span>
          )}
          {isDirty && (
            <Button
              type="button"
              onClick={onManualSave}
              disabled={updateMutation.isPending}
              size="sm"
              className="h-6 px-2 text-[10px] bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-lg"
            >
              <Save className="h-2.5 w-2.5 mr-1" />
              Guardar
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* ── Sección 1: Ubicación ── */}
        <FormSection icon={MapPin} label="Ubicación">
          <FormField label="Dirección *">
            <Input
              {...register('address')}
              placeholder="Ej: San Martín 456"
              className={inputCls}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Ciudad">
              <Input {...register('city')} placeholder="General Roca" className={inputCls} />
            </FormField>
            <FormField label="Barrio (opcional)">
              <Input {...register('neighborhood')} placeholder="Texto libre" className={inputCls} />
            </FormField>
          </div>
        </FormSection>

        {/* ── Sección 2: Tipo de propiedad ── */}
        <FormSection icon={Home} label="Tipo de propiedad">
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Tipo *">
              <Controller
                name="propertyType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="glass border-white/[0.08]">
                      {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-white/80">
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {subtypeOptions && subtypeOptions.length > 0 && (
              <FormField label="Subtipo">
                <Controller
                  name="propertySubtype"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(v) => field.onChange(v || null)}
                    >
                      <SelectTrigger className={inputCls}>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="glass border-white/[0.08]">
                        {subtypeOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-white/80">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Estado de conservación">
              <Controller
                name="conservationState"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="glass border-white/[0.08]">
                      {CONSERVATION_STATE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-white/80">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Condición general">
              <Controller
                name="condition"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="glass border-white/[0.08]">
                      {Object.entries(PROPERTY_CONDITION_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-white/80">
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ── Sección 3: Superficies ── */}
        <FormSection icon={Ruler} label="Superficies (m²)">
          <div className="grid grid-cols-3 gap-2">
            <FormField label="Total *">
              <Input
                {...register('totalArea', { valueAsNumber: true })}
                type="number"
                min={1}
                placeholder="120"
                className={inputCls}
              />
            </FormField>
            <FormField label="Cubierta">
              <Input
                {...register('coveredArea', { valueAsNumber: true })}
                type="number"
                min={1}
                placeholder="90"
                className={inputCls}
              />
            </FormField>
            <FormField label="Descubierta">
              <Input
                {...register('uncoveredArea', { valueAsNumber: true })}
                type="number"
                min={0}
                placeholder="30"
                className={inputCls}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ── Sección 4: Distribución ── */}
        <FormSection icon={Layers} label="Distribución">
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: 'rooms' as const, label: 'Ambientes' },
              { name: 'bedrooms' as const, label: 'Dormitorios' },
              { name: 'bathrooms' as const, label: 'Baños' },
              { name: 'garages' as const, label: 'Cocheras' },
            ].map(({ name, label }) => (
              <FormField key={name} label={label}>
                <Input
                  {...register(name, { valueAsNumber: true })}
                  type="number"
                  min={0}
                  placeholder="—"
                  className={inputCls}
                />
              </FormField>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <FormField label="Antigüedad (años)">
              <Input
                {...register('age', { valueAsNumber: true })}
                type="number"
                min={0}
                placeholder="0 = a estrenar"
                className={inputCls}
              />
            </FormField>
            <FormField label="Piso">
              <Input
                {...register('floor', { valueAsNumber: true })}
                type="number"
                placeholder="—"
                className={inputCls}
              />
            </FormField>
            <FormField label="Orientación">
              <Input
                {...register('orientation')}
                placeholder="Norte"
                className={inputCls}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ── Sección 5: Características ── */}
        <FormSection icon={Star} label="Características">
          <FormField label="Amenities (separados por coma)">
            <Controller
              name="amenities"
              control={control}
              render={({ field }) => (
                <Input
                  value={(field.value || []).join(', ')}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="Pileta, Gym, SUM, Seguridad 24hs"
                  className={inputCls}
                />
              )}
            />
          </FormField>

          <FormField label="Descripción">
            <div className="relative">
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <>
                    <Textarea
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Descripción general de la propiedad..."
                      rows={3}
                      className={`${inputCls} resize-none pr-8`}
                    />
                    <MicButton
                      fieldName="description"
                      onResult={(text) => {
                        const current = field.value || '';
                        field.onChange(current ? `${current} ${text}` : text);
                      }}
                    />
                  </>
                )}
              />
            </div>
          </FormField>

          <FormField label="Notas adicionales para la tasación">
            <div className="relative">
              <Controller
                name="additionalNotes"
                control={control}
                render={({ field }) => (
                  <>
                    <Textarea
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Ej: Esquina, frente a plaza, zona comercial..."
                      rows={2}
                      className={`${inputCls} resize-none pr-8`}
                    />
                    <MicButton
                      fieldName="additionalNotes"
                      onResult={(text) => {
                        const current = field.value || '';
                        field.onChange(current ? `${current} ${text}` : text);
                      }}
                    />
                  </>
                )}
              />
            </div>
          </FormField>
        </FormSection>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formDefaults(pd: Partial<PropertyData>): PropertyDataInput {
  return {
    address: pd.address || '',
    neighborhood: pd.neighborhood || '',
    city: pd.city || 'General Roca',
    propertyType: pd.propertyType ?? null,
    propertySubtype: pd.propertySubtype ?? null,
    conservationState: pd.conservationState ?? null,
    totalArea: pd.totalArea ?? null,
    coveredArea: pd.coveredArea ?? null,
    uncoveredArea: pd.uncoveredArea ?? null,
    rooms: pd.rooms ?? null,
    bedrooms: pd.bedrooms ?? null,
    bathrooms: pd.bathrooms ?? null,
    garages: pd.garages ?? null,
    age: pd.age ?? null,
    floor: pd.floor ?? null,
    orientation: pd.orientation ?? null,
    condition: pd.condition ?? null,
    amenities: pd.amenities || [],
    description: pd.description || '',
    additionalNotes: pd.additionalNotes || '',
  };
}

function FormSection({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-violet-400/60" />
        <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="space-y-2 pl-5">{children}</div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-white/40">{label}</label>
      {children}
    </div>
  );
}
