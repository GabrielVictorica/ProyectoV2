'use client';

import { use, useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  MapPin,
  Ruler,
  BedDouble,
  Bath,
  Car,
  Calendar,
  Building2,
  Shield,
  Lightbulb,
  AlertTriangle,
  CloudLightning,
  DollarSign,
  BarChart3,
  TrendingDown,
  TrendingUp,
  User,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import type {
  PropertyData,
  NormalizedComparable,
  FodaAnalysis,
  AcmConclusions,
  AgentBranding,
} from '@/features/acm/types/acm';

// ── Types ───────────────────────────────────────────────────────────────────

interface AcmPublicData {
  id: string;
  status: string;
  propertyData: Partial<PropertyData>;
  propertyImages: string[];
  comparables: NormalizedComparable[];
  fodaAnalysis: Partial<FodaAnalysis>;
  conclusions: Partial<AcmConclusions>;
  suggestedPriceUsd: number | null;
  suggestedPriceArs: number | null;
  agentConclusion: string;
  agentBranding: Partial<AgentBranding>;
  createdAt: string;
}

interface Props {
  params: Promise<{ id: string }>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  n ? n.toLocaleString('es-AR') : '–';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// ── Animated Section Wrapper ────────────────────────────────────────────────

function AnimatedSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function AcmPublicPage({ params }: Props) {
  const { id } = use(params);
  const [data, setData] = useState<AcmPublicData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/acm/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const d = json.data;
          setData({
            id: d.id,
            status: d.status,
            propertyData: d.property_data || {},
            propertyImages: d.property_images || [],
            comparables: d.comparables || [],
            fodaAnalysis: d.foda_analysis || {},
            conclusions: d.conclusions || {},
            suggestedPriceUsd: d.suggested_price_usd,
            suggestedPriceArs: d.suggested_price_ars,
            agentConclusion: d.agent_conclusion || '',
            agentBranding: d.agent_branding || {},
            createdAt: d.created_at,
          });
        } else {
          setError(json.error);
        }
      })
      .catch(() => setError('Error al cargar el reporte'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/30">Cargando informe...</p>
        </div>
      </div>
    );
  }

  // ── Error / Not available ───────────────────────────────────────────────

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm">
          <Lock className="h-8 w-8 text-white/15 mx-auto" />
          <p className="text-white/50 text-sm">{error || 'Reporte no disponible'}</p>
        </div>
      </div>
    );
  }

  const {
    propertyData: pd,
    propertyImages,
    comparables,
    fodaAnalysis,
    conclusions,
    agentConclusion,
    agentBranding: brand,
  } = data;

  const selectedComps = comparables.filter((c) => c.selected);
  const reportDate = new Date(data.createdAt).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-12">
      {/* ── 1. Header + Branding ── */}
      <AnimatedSection>
        <div className="text-center space-y-4">
          {brand.logoUrl && (
            <img
              src={brand.logoUrl}
              alt={brand.organizationName || ''}
              className="h-12 mx-auto object-contain"
            />
          )}
          {brand.organizationName && (
            <p className="text-xs text-white/25 uppercase tracking-[0.2em]">
              {brand.organizationName}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Análisis Comparativo de Mercado
          </h1>
          <p className="text-sm text-white/40">{reportDate}</p>
        </div>
      </AnimatedSection>

      {/* ── 2. Property Hero ── */}
      <AnimatedSection>
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
          {/* Image gallery */}
          {propertyImages.length > 0 && (
            <ImageCarousel images={propertyImages} />
          )}

          <div className="p-6 space-y-4">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {pd.address || 'Dirección no especificada'}
                </h2>
                <p className="text-sm text-white/40">
                  {[pd.neighborhood, pd.city].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>

            {/* Property badges */}
            <div className="flex flex-wrap gap-2">
              {pd.propertyType && (
                <Badge icon={Building2} label={pd.propertyType} />
              )}
              {(pd as any).propertySubtype && (
                <Badge icon={Building2} label={(pd as any).propertySubtype.replace(/_/g, ' ')} />
              )}
              {(pd as any).conservationState && (pd as any).conservationState !== 'normal' && (
                <Badge icon={AlertTriangle} label={(pd as any).conservationState.replace(/_/g, ' ')} />
              )}
              {pd.totalArea && (
                <Badge icon={Ruler} label={`${pd.totalArea} m²`} />
              )}
              {pd.bedrooms && (
                <Badge icon={BedDouble} label={`${pd.bedrooms} dorm.`} />
              )}
              {pd.bathrooms && (
                <Badge icon={Bath} label={`${pd.bathrooms} baño${pd.bathrooms > 1 ? 's' : ''}`} />
              )}
              {pd.garages && (
                <Badge icon={Car} label={`${pd.garages} cochera${pd.garages > 1 ? 's' : ''}`} />
              )}
              {pd.age !== null && pd.age !== undefined && (
                <Badge icon={Calendar} label={pd.age === 0 ? 'A estrenar' : `${pd.age} años`} />
              )}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ── 3. Property Details Grid ── */}
      {(pd.rooms || pd.coveredArea || pd.uncoveredArea || pd.condition || pd.orientation) && (
        <AnimatedSection>
          <SectionTitle>Detalles de la propiedad</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pd.rooms && <DetailCard label="Ambientes" value={String(pd.rooms)} />}
            {pd.coveredArea && <DetailCard label="Sup. cubierta" value={`${pd.coveredArea} m²`} />}
            {pd.uncoveredArea && <DetailCard label="Sup. descubierta" value={`${pd.uncoveredArea} m²`} />}
            {pd.condition && <DetailCard label="Estado" value={pd.condition} />}
            {pd.orientation && <DetailCard label="Orientación" value={pd.orientation} />}
            {pd.floor !== null && pd.floor !== undefined && <DetailCard label="Piso" value={String(pd.floor)} />}
          </div>
          {pd.amenities && pd.amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {pd.amenities.map((a) => (
                <span
                  key={a}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400/70 border border-violet-500/20"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </AnimatedSection>
      )}

      {/* ── 4. FODA ── */}
      {fodaAnalysis && Object.values(fodaAnalysis).some((v) => v) && (
        <AnimatedSection>
          <SectionTitle>Análisis FODA</SectionTitle>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {fodaAnalysis.fortalezas && (
              <FodaCard
                icon={Shield}
                label="Fortalezas"
                text={fodaAnalysis.fortalezas}
                color="emerald"
              />
            )}
            {fodaAnalysis.oportunidades && (
              <FodaCard
                icon={Lightbulb}
                label="Oportunidades"
                text={fodaAnalysis.oportunidades}
                color="blue"
              />
            )}
            {fodaAnalysis.debilidades && (
              <FodaCard
                icon={AlertTriangle}
                label="Aspectos a considerar"
                text={fodaAnalysis.debilidades}
                color="amber"
              />
            )}
            {fodaAnalysis.amenazas && (
              <FodaCard
                icon={CloudLightning}
                label="Factores de mercado"
                text={fodaAnalysis.amenazas}
                color="red"
              />
            )}
          </motion.div>
        </AnimatedSection>
      )}

      {/* ── 5. Comparables ── */}
      {selectedComps.length > 0 && (
        <AnimatedSection>
          <SectionTitle>Comparables utilizados ({selectedComps.length})</SectionTitle>
          <div className="space-y-2">
            {selectedComps.map((c, i) => (
              <motion.div
                key={c.id}
                variants={fadeUp}
                className="flex items-center gap-4 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <span className="text-[10px] text-white/20 w-5 text-right tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/60 truncate">{c.address || c.title}</p>
                  <p className="text-[10px] text-white/25">
                    {c.totalArea ? `${c.totalArea} m²` : ''}{' '}
                    {c.propertyType ? `· ${c.propertyType}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-white/50 tabular-nums">USD {fmt(c.price)}</p>
                  <p className="text-[10px] text-white/25 tabular-nums">
                    {c.adjustedPricePerM2 ? `USD ${fmt(c.adjustedPricePerM2)}/m²` : ''}
                    {c.adjustmentFactor !== 1 ? ` (×${c.adjustmentFactor.toFixed(2)})` : ''}
                  </p>
                </div>
                {c.sourceUrl && (
                  <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-violet-400/50 hover:text-violet-400 shrink-0"
                  >
                    Ver
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      )}

      {/* ── 6. Valuation ── */}
      {conclusions.suggestedTotalPrice && (
        <AnimatedSection>
          <SectionTitle>Valuación</SectionTitle>
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] to-transparent p-6 text-center space-y-4">
            {conclusions.suggestedRangeLow && conclusions.suggestedRangeHigh && (
              <p className="text-sm text-white/40">
                Rango sugerido: USD {fmt(conclusions.suggestedRangeLow)} – {fmt(conclusions.suggestedRangeHigh)}
              </p>
            )}
            <AnimatedPrice value={conclusions.suggestedTotalPrice} />
            <p className="text-[10px] text-white/20">Valor de referencia (mediana ajustada)</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <MiniStat icon={BarChart3} label="Comparables" value={String(conclusions.comparablesUsed || 0)} />
              <MiniStat icon={DollarSign} label="USD/m² prom." value={fmt(conclusions.adjustedAvgPricePerM2)} />
              <MiniStat icon={TrendingDown} label="USD/m² mín." value={fmt(conclusions.minPricePerM2)} />
              <MiniStat icon={TrendingUp} label="USD/m² máx." value={fmt(conclusions.maxPricePerM2)} />
            </div>

            {conclusions.methodology && (
              <p className="text-[10px] text-white/15 leading-relaxed mt-3">
                {conclusions.methodology}
              </p>
            )}
          </div>
        </AnimatedSection>
      )}

      {/* ── 7. Agent Conclusion ── */}
      {agentConclusion && (
        <AnimatedSection>
          <SectionTitle>Conclusión del Profesional</SectionTitle>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
              {agentConclusion}
            </p>
            {brand.fullName && (
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-3">
                {brand.photoUrl && (
                  <img
                    src={brand.photoUrl}
                    alt={brand.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-white/10"
                  />
                )}
                <div>
                  <p className="text-xs font-medium text-white/70">{brand.fullName}</p>
                  {brand.organizationName && (
                    <p className="text-[10px] text-white/30">{brand.organizationName}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </AnimatedSection>
      )}

      {/* ── 8. Footer ── */}
      <AnimatedSection className="border-t border-white/[0.04] pt-8 pb-4">
        <div className="text-center space-y-3">
          {(brand.email || brand.phone) && (
            <div className="flex items-center justify-center gap-4 text-xs text-white/30">
              {brand.email && (
                <a href={`mailto:${brand.email}`} className="flex items-center gap-1 hover:text-white/50 transition-colors">
                  <Mail className="h-3 w-3" />
                  {brand.email}
                </a>
              )}
              {brand.phone && (
                <a href={`tel:${brand.phone}`} className="flex items-center gap-1 hover:text-white/50 transition-colors">
                  <Phone className="h-3 w-3" />
                  {brand.phone}
                </a>
              )}
            </div>
          )}
          {brand.logoUrl && (
            <img src={brand.logoUrl} alt="" className="h-6 mx-auto opacity-30" />
          )}
          <p className="text-[9px] text-white/10">
            Este informe es de carácter orientativo y no constituye una tasación judicial.
            Los valores expresados son de referencia basados en el análisis comparativo de mercado.
          </p>
          <p className="text-[9px] text-white/[0.07]">
            Powered by EntreInmobiliarios
          </p>
        </div>
      </AnimatedSection>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-white/25 uppercase tracking-[0.15em] mb-4">
      {children}
    </h3>
  );
}

function Badge({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/50">
      <Icon className="h-3 w-3 text-violet-400/50" />
      {label}
    </span>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
      <p className="text-[10px] text-white/25">{label}</p>
      <p className="text-sm text-white/60 font-medium capitalize">{value}</p>
    </div>
  );
}

function FodaCard({
  icon: Icon,
  label,
  text,
  color,
}: {
  icon: any;
  label: string;
  text: string;
  color: 'emerald' | 'blue' | 'amber' | 'red';
}) {
  const colors = {
    emerald: 'border-emerald-500/20 text-emerald-400',
    blue: 'border-blue-500/20 text-blue-400',
    amber: 'border-amber-500/20 text-amber-400',
    red: 'border-red-500/20 text-red-400',
  };

  return (
    <motion.div
      variants={fadeUp}
      className={`rounded-xl border ${colors[color].split(' ')[0]} bg-white/[0.02] overflow-hidden`}
    >
      <div className="px-4 py-2 flex items-center gap-2 bg-white/[0.02]">
        <Icon className={`h-3.5 w-3.5 ${colors[color].split(' ')[1]}`} />
        <span className={`text-[11px] font-semibold ${colors[color].split(' ')[1]}`}>
          {label}
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-white/50 leading-relaxed whitespace-pre-line">{text}</p>
      </div>
    </motion.div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="text-center p-2.5 rounded-lg bg-white/[0.04]">
      <Icon className="h-3 w-3 text-violet-400/40 mx-auto mb-1" />
      <p className="text-[10px] text-white/25">{label}</p>
      <p className="text-sm font-semibold text-white/60 tabular-nums">{value}</p>
    </div>
  );
}

// ── Animated Price Counter ──────────────────────────────────────────────────

function AnimatedPrice({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <p ref={ref} className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
      USD {display.toLocaleString('es-AR')}
    </p>
  );
}

// ── Image Carousel ──────────────────────────────────────────────────────────

function ImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) return null;

  return (
    <div className="relative aspect-[16/9] bg-black/30 overflow-hidden">
      <img
        src={images[current]}
        alt={`Foto ${current + 1}`}
        className="w-full h-full object-cover"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((p) => (p === 0 ? images.length - 1 : p - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrent((p) => (p === images.length - 1 ? 0 : p + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === current ? 'bg-white w-4' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
