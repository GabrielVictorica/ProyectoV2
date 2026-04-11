'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { manualComparableSchema } from '../schemas/comparableSchema';
import { PROPERTY_TYPE_LABELS } from '../constants/acmConstants';
import type { NormalizedComparable } from '../types/acm';
import { useState } from 'react';
import { Controller } from 'react-hook-form';

interface Props {
  onAdd: (comparable: NormalizedComparable) => void;
}

export function ManualComparableForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(manualComparableSchema) as any,
    defaultValues: {
      address: '',
      price: undefined as number | undefined,
      currency: 'USD' as const,
      totalArea: undefined as number | undefined,
      propertyType: '',
      sourceUrl: '',
      notes: '',
    },
  });

  const onSubmit = (data: any) => {
    const pricePerM2 =
      data.totalArea && data.price ? Math.round(data.price / data.totalArea) : null;

    const comparable: NormalizedComparable = {
      id: crypto.randomUUID(),
      source: 'manual',
      sourceUrl: data.sourceUrl || '',
      title: data.address,
      price: data.price,
      currency: data.currency,
      totalArea: data.totalArea || null,
      coveredArea: null,
      pricePerM2,
      propertyType: data.propertyType || '',
      propertySubtype: null,
      conservationState: null,
      address: data.address,
      neighborhood: '',
      city: '',
      rooms: null,
      bedrooms: null,
      bathrooms: null,
      garages: null,
      age: null,
      imageUrl: null,
      selected: true,
      adjustmentFactor: 1.0,
      adjustedPricePerM2: pricePerM2,
      notes: data.notes || '',
      relevanceScore: null,
    };

    onAdd(comparable);
    reset();
    setOpen(false);
  };

  const inputCls =
    'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 text-sm h-9 rounded-xl';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-white/[0.08] bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] rounded-xl text-xs h-8"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Agregar manual
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-white/[0.08] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-sm font-semibold">
            Comparable manual
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1">
            <label className="text-[11px] text-white/40">Dirección *</label>
            <Input
              {...register('address')}
              placeholder="Av. Santa Fe 1234, 5° A"
              className={inputCls}
            />
            {errors.address && (
              <p className="text-[10px] text-red-400">{errors.address.message as string}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-white/40">Precio *</label>
              <Input
                {...register('price', { valueAsNumber: true })}
                type="number"
                placeholder="120000"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-white/40">Moneda *</label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-white/[0.08]">
                      <SelectItem value="USD" className="text-white/80">USD</SelectItem>
                      <SelectItem value="ARS" className="text-white/80">ARS</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-white/40">Superficie (m²)</label>
              <Input
                {...register('totalArea', { valueAsNumber: true })}
                type="number"
                placeholder="85"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-white/40">Tipo</label>
              <Controller
                name="propertyType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-white/40">URL de la publicación</label>
            <Input
              {...register('sourceUrl')}
              placeholder="https://..."
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-white/40">Notas</label>
            <Input
              {...register('notes')}
              placeholder="Ej: Vecino directo, vendido hace 2 meses"
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white/70 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl text-xs"
            >
              Agregar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
