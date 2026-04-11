'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FileBarChart,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  Globe,
  GlobeLock,
  MapPin,
  Calendar,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAcmList, useCreateAcm, useDeleteAcm } from '@/features/acm/hooks/useAcm';
import { ACM_STATUS_LABELS, ACM_STATUS_COLORS, PROPERTY_TYPE_LABELS } from '@/features/acm/constants/acmConstants';
import type { AcmStatus, AcmReportSummary } from '@/features/acm/types/acm';

const STATUS_FILTER_OPTIONS: { label: string; value: AcmStatus | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Borrador', value: 'draft' },
  { label: 'Datos cargados', value: 'data_collected' },
  { label: 'Comparables', value: 'comparables_loaded' },
  { label: 'FODA completo', value: 'foda_done' },
  { label: 'Completados', value: 'completed' },
];

export default function AcmPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AcmStatus | 'all'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: acms, isLoading } = useAcmList({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const createMutation = useCreateAcm();
  const deleteMutation = useDeleteAcm();

  const handleCreate = async () => {
    const result = await createMutation.mutateAsync();
    if (result.success) {
      router.push(`/dashboard/acm/${result.data.id}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const filtered = (acms || []).filter((acm) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      acm.propertyAddress.toLowerCase().includes(q) ||
      acm.agentName?.toLowerCase().includes(q) ||
      acm.personName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20">
            <FileBarChart className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tasaciones</h1>
            <p className="text-sm text-white/40">Análisis Comparativo de Mercado</p>
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={createMutation.isPending}
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Tasación
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-3"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Buscar por dirección, agente o persona..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus:border-violet-500/50"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-white/[0.08] bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08]">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilter === 'all' ? 'Estado' : ACM_STATUS_LABELS[statusFilter]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="glass border-white/[0.08]">
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`text-white/70 hover:text-white focus:bg-white/[0.06] cursor-pointer ${statusFilter === opt.value ? 'text-violet-400' : ''}`}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-white/[0.03] animate-pulse border border-white/[0.06]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4">
            <FileBarChart className="h-10 w-10 text-white/20" />
          </div>
          <p className="text-white/40 text-lg font-medium">
            {search || statusFilter !== 'all' ? 'No se encontraron tasaciones' : 'Aún no hay tasaciones'}
          </p>
          <p className="text-white/25 text-sm mt-1">
            {!search && statusFilter === 'all' && 'Creá tu primera tasación para empezar'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="mt-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tasación
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {filtered.map((acm, i) => (
            <AcmCard
              key={acm.id}
              acm={acm}
              index={i}
              onView={() => router.push(`/dashboard/acm/${acm.id}`)}
              onDelete={() => setDeleteId(acm.id)}
            />
          ))}
        </motion.div>
      )}

      {/* Stats */}
      {!isLoading && (acms || []).length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-white/25 text-center"
        >
          {filtered.length} tasación{filtered.length !== 1 ? 'es' : ''}
          {search || statusFilter !== 'all' ? ` de ${acms?.length} total` : ''}
        </motion.p>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar tasación?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Esta acción no se puede deshacer. Se eliminará permanentemente la tasación y todos sus datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.08] bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-500 text-white border-0"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── ACM Card ────────────────────────────────────────────────────────────────

function AcmCard({
  acm,
  index,
  onView,
  onDelete,
}: {
  acm: AcmReportSummary;
  index: number;
  onView: () => void;
  onDelete: () => void;
}) {
  const formattedDate = new Date(acm.createdAt).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group relative glass rounded-2xl border border-white/[0.08] p-5 hover:border-violet-500/30 transition-all duration-200 cursor-pointer"
      onClick={onView}
    >
      {/* Status + Public badge */}
      <div className="flex items-center justify-between mb-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${ACM_STATUS_COLORS[acm.status]}`}>
          {ACM_STATUS_LABELS[acm.status]}
        </span>
        <div className="flex items-center gap-2">
          {acm.isPublic ? (
            <Globe className="h-4 w-4 text-emerald-400/60" />
          ) : (
            <GlobeLock className="h-4 w-4 text-white/20" />
          )}
          {/* Actions */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Address */}
      <div className="flex items-start gap-2 mb-3">
        <MapPin className="h-4 w-4 text-violet-400/60 mt-0.5 shrink-0" />
        <p className="text-white font-medium text-sm leading-snug line-clamp-2">
          {acm.propertyAddress || 'Sin dirección'}
        </p>
      </div>

      {/* Property type */}
      {acm.propertyType && (
        <p className="text-xs text-white/40 mb-3 ml-6">
          {PROPERTY_TYPE_LABELS[acm.propertyType as keyof typeof PROPERTY_TYPE_LABELS] || acm.propertyType}
        </p>
      )}

      {/* Price */}
      {acm.suggestedPriceUsd && (
        <div className="ml-6 mb-3">
          <span className="text-lg font-bold text-emerald-400">
            USD {acm.suggestedPriceUsd.toLocaleString('es-AR')}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <User className="h-3 w-3" />
          <span>{acm.agentName || 'Agente'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <Calendar className="h-3 w-3" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/0 to-fuchsia-500/0 group-hover:from-violet-500/[0.03] group-hover:to-fuchsia-500/[0.03] transition-all duration-200 pointer-events-none" />
    </motion.div>
  );
}
