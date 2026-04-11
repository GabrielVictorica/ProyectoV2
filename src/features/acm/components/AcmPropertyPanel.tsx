'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Edit2,
  Save,
  X,
  MapPin,
  Home,
  Ruler,
  Layers,
  Car,
  CalendarDays,
  Compass,
  Star,
  AlignLeft,
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
  PROPERTY_CONDITION_LABELS,
  PROPERTY_SUBTYPE_LABELS,
  CONSERVATION_STATE_LABELS,
} from '../constants/acmConstants';
import type { PropertyData, PropertySubtype, ConservationState } from '../types/acm';

interface Props {
  acmId: string;
  propertyData: Partial<PropertyData>;
  agentId: string;
}

// Cuenta campos completados
function countFilled(data: Partial<PropertyData>): number {
  const keys: (keyof PropertyData)[] = [
    'address', 'neighborhood', 'city', 'propertyType',
    'totalArea', 'coveredArea', 'rooms', 'bedrooms', 'bathrooms',
    'garages', 'age', 'condition',
  ];
  return keys.filter((k) => {
    const v = data[k];
    return v !== null && v !== undefined && v !== '';
  }).length;
}

const TOTAL_FIELDS = 12;

export function AcmPropertyPanel({ acmId, propertyData, agentId }: Props) {
  const [editing, setEditing] = useState(false);
  const updateMutation = useUpdateAcmPropertyData(acmId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<PropertyDataInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(propertyDataSchema) as any,
    defaultValues: {
      address: propertyData.address || '',
      neighborhood: propertyData.neighborhood || '',
      city: propertyData.city || '',
      propertyType: propertyData.propertyType ?? null,
      propertySubtype: propertyData.propertySubtype ?? null,
      conservationState: propertyData.conservationState ?? null,
      totalArea: propertyData.totalArea ?? null,
      coveredArea: propertyData.coveredArea ?? null,
      uncoveredArea: propertyData.uncoveredArea ?? null,
      rooms: propertyData.rooms ?? null,
      bedrooms: propertyData.bedrooms ?? null,
      bathrooms: propertyData.bathrooms ?? null,
      garages: propertyData.garages ?? null,
      age: propertyData.age ?? null,
      floor: propertyData.floor ?? null,
      orientation: propertyData.orientation ?? null,
      condition: propertyData.condition ?? null,
      amenities: propertyData.amenities || [],
      description: propertyData.description || '',
      additionalNotes: propertyData.additionalNotes || '',
    },
  });

  // Sincronizar cuando cambia propertyData (ej: IA guarda datos)
  useEffect(() => {
    reset({
      address: propertyData.address || '',
      neighborhood: propertyData.neighborhood || '',
      city: propertyData.city || '',
      propertyType: propertyData.propertyType ?? null,
      propertySubtype: propertyData.propertySubtype ?? null,
      conservationState: propertyData.conservationState ?? null,
      totalArea: propertyData.totalArea ?? null,
      coveredArea: propertyData.coveredArea ?? null,
      uncoveredArea: propertyData.uncoveredArea ?? null,
      rooms: propertyData.rooms ?? null,
      bedrooms: propertyData.bedrooms ?? null,
      bathrooms: propertyData.bathrooms ?? null,
      garages: propertyData.garages ?? null,
      age: propertyData.age ?? null,
      floor: propertyData.floor ?? null,
      orientation: propertyData.orientation ?? null,
      condition: propertyData.condition ?? null,
      amenities: propertyData.amenities || [],
      description: propertyData.description || '',
      additionalNotes: propertyData.additionalNotes || '',
    });
  }, [propertyData, reset]);

  const onSubmit = async (data: PropertyDataInput) => {
    await updateMutation.mutateAsync({ propertyData: data });
    setEditing(false);
  };

  const filled = countFilled(propertyData);
  const pct = Math.round((filled / TOTAL_FIELDS) * 100);
  const isEmpty = filled === 0;

  // ── Vista de solo lectura ──────────────────────────────────────────────────

  if (!editing) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#030712] border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-xs text-white/40 font-medium">
              {isEmpty ? 'Sin datos aún' : `${filled}/${TOTAL_FIELDS} campos`}
            </div>
            {!isEmpty && (
              <div className="flex-1 max-w-[120px] h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="h-7 px-2.5 text-xs text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded-lg"
          >
            <Edit2 className="h-3 w-3 mr-1.5" />
            Editar
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <Home className="h-6 w-6 text-white/20" />
              </div>
              <p className="text-white/30 text-sm">
                Los datos aparecerán aquí a medida que conversés con la IA
              </p>
              <p className="text-white/20 text-xs">
                O podés completarlos manualmente con el botón Editar
              </p>
            </div>
          ) : (
            <>
              {/* Ubicación */}
              <Section icon={MapPin} label="Ubicación">
                {propertyData.address && (
                  <Field label="Dirección" value={propertyData.address} />
                )}
                {propertyData.neighborhood && (
                  <Field label="Barrio" value={propertyData.neighborhood} />
                )}
                {propertyData.city && (
                  <Field label="Ciudad" value={propertyData.city} />
                )}
              </Section>

              {/* Tipo y condición */}
              <Section icon={Home} label="Propiedad">
                {propertyData.propertyType && (
                  <Field
                    label="Tipo"
                    value={PROPERTY_TYPE_LABELS[propertyData.propertyType]}
                  />
                )}
                {propertyData.propertySubtype && (
                  <Field
                    label="Subtipo"
                    value={PROPERTY_SUBTYPE_LABELS[propertyData.propertySubtype as NonNullable<PropertySubtype>] || propertyData.propertySubtype}
                  />
                )}
                {propertyData.conservationState && (
                  <Field
                    label="Conservación"
                    value={CONSERVATION_STATE_LABELS[propertyData.conservationState as NonNullable<ConservationState>] || propertyData.conservationState}
                  />
                )}
                {propertyData.condition && (
                  <Field
                    label="Condición"
                    value={PROPERTY_CONDITION_LABELS[propertyData.condition]}
                  />
                )}
                {propertyData.age !== null && propertyData.age !== undefined && (
                  <Field
                    label="Antigüedad"
                    value={propertyData.age === 0 ? 'A estrenar' : `${propertyData.age} años`}
                  />
                )}
                {propertyData.floor !== null && propertyData.floor !== undefined && (
                  <Field label="Piso" value={`${propertyData.floor}°`} />
                )}
                {propertyData.orientation && (
                  <Field label="Orientación" value={propertyData.orientation} />
                )}
              </Section>

              {/* Superficies */}
              {(propertyData.totalArea || propertyData.coveredArea || propertyData.uncoveredArea) && (
                <Section icon={Ruler} label="Superficies">
                  {propertyData.totalArea && (
                    <Field label="Total" value={`${propertyData.totalArea} m²`} />
                  )}
                  {propertyData.coveredArea && (
                    <Field label="Cubierta" value={`${propertyData.coveredArea} m²`} />
                  )}
                  {propertyData.uncoveredArea && (
                    <Field label="Desc./semi" value={`${propertyData.uncoveredArea} m²`} />
                  )}
                </Section>
              )}

              {/* Distribución */}
              {(propertyData.rooms || propertyData.bedrooms || propertyData.bathrooms || propertyData.garages !== null) && (
                <Section icon={Layers} label="Distribución">
                  {propertyData.rooms && (
                    <Field label="Ambientes" value={String(propertyData.rooms)} />
                  )}
                  {propertyData.bedrooms && (
                    <Field label="Dormitorios" value={String(propertyData.bedrooms)} />
                  )}
                  {propertyData.bathrooms && (
                    <Field label="Baños" value={String(propertyData.bathrooms)} />
                  )}
                  {propertyData.garages !== null && propertyData.garages !== undefined && (
                    <Field label="Cocheras" value={String(propertyData.garages)} />
                  )}
                </Section>
              )}

              {/* Amenities */}
              {(propertyData.amenities || []).length > 0 && (
                <Section icon={Star} label="Amenities">
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {propertyData.amenities!.map((a) => (
                      <span
                        key={a}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400/80"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Descripción */}
              {propertyData.description && (
                <Section icon={AlignLeft} label="Descripción">
                  <p className="text-xs text-white/50 leading-relaxed mt-1">
                    {propertyData.description}
                  </p>
                </Section>
              )}

              {propertyData.additionalNotes && (
                <Section icon={AlignLeft} label="Notas adicionales">
                  <p className="text-xs text-white/50 leading-relaxed mt-1">
                    {propertyData.additionalNotes}
                  </p>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Formulario de edición ─────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#030712] border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-white/70">Editar datos</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { reset(); setEditing(false); }}
            className="h-7 px-2.5 text-xs text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded-lg"
          >
            <X className="h-3 w-3 mr-1" />
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={updateMutation.isPending}
            className="h-7 px-2.5 text-xs bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-lg"
          >
            <Save className="h-3 w-3 mr-1" />
            Guardar
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Ubicación */}
        <Fieldset label="Ubicación">
          <FormField label="Dirección *">
            <Input
              {...register('address')}
              placeholder="Ej: Av. Corrientes 1234, 5° B"
              className={inputCls}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Barrio">
              <Input {...register('neighborhood')} placeholder="Palermo" className={inputCls} />
            </FormField>
            <FormField label="Ciudad">
              <Input {...register('city')} placeholder="CABA" className={inputCls} />
            </FormField>
          </div>
        </Fieldset>

        {/* Tipo y condición */}
        <Fieldset label="Propiedad">
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Tipo">
              <Controller
                name="propertyType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder="Tipo" />
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
            <FormField label="Estado">
              <Controller
                name="condition"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder="Estado" />
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
          <div className="grid grid-cols-3 gap-2">
            <FormField label="Antigüedad (años)">
              <Input
                {...register('age', { valueAsNumber: true })}
                type="number"
                min={0}
                placeholder="0"
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
        </Fieldset>

        {/* Superficies */}
        <Fieldset label="Superficies (m²)">
          <div className="grid grid-cols-3 gap-2">
            <FormField label="Total">
              <Input
                {...register('totalArea', { valueAsNumber: true })}
                type="number"
                min={1}
                placeholder="75"
                className={inputCls}
              />
            </FormField>
            <FormField label="Cubierta">
              <Input
                {...register('coveredArea', { valueAsNumber: true })}
                type="number"
                min={1}
                placeholder="65"
                className={inputCls}
              />
            </FormField>
            <FormField label="Desc./semi">
              <Input
                {...register('uncoveredArea', { valueAsNumber: true })}
                type="number"
                min={0}
                placeholder="10"
                className={inputCls}
              />
            </FormField>
          </div>
        </Fieldset>

        {/* Distribución */}
        <Fieldset label="Distribución">
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: 'rooms' as const, label: 'Amb.' },
              { name: 'bedrooms' as const, label: 'Dorm.' },
              { name: 'bathrooms' as const, label: 'Baños' },
              { name: 'garages' as const, label: 'Coch.' },
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
        </Fieldset>

        {/* Amenities */}
        <Fieldset label="Amenities (separados por coma)">
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
        </Fieldset>

        {/* Descripción */}
        <Fieldset label="Descripción">
          <Textarea
            {...register('description')}
            placeholder="Descripción general de la propiedad..."
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </Fieldset>

        {/* Notas adicionales */}
        <Fieldset label="Notas adicionales">
          <Textarea
            {...register('additionalNotes')}
            placeholder="Notas relevantes para la tasación..."
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </Fieldset>
      </div>
    </form>
  );
}

// ── Sub-componentes auxiliares ────────────────────────────────────────────────

const inputCls =
  'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-violet-500/40 text-sm h-9 rounded-xl';

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-violet-400/60" />
        <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="space-y-1 pl-5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] text-white/30 shrink-0 w-20">{label}</span>
      <span className="text-xs text-white/70 font-medium">{value}</span>
    </div>
  );
}

function Fieldset({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">{label}</p>
      {children}
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
