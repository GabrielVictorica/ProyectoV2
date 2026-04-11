export type AcmStatus = 'draft' | 'data_collected' | 'comparables_loaded' | 'foda_done' | 'completed';

export type PropertyType = 'departamento' | 'casa' | 'ph' | 'local' | 'oficina' | 'terreno' | 'chacra';

export type PropertySubtype =
  | 'casa_tradicional' | 'casa_de_plan'
  | 'depto_en_torre' | 'depto_en_complejo'
  | 'terreno_grande' | 'terreno_chico'
  | null;

export type ConservationState = 'normal' | 'a_reciclar' | 'a_demoler' | null;

export type PropertyCondition = 'excelente' | 'muy_bueno' | 'bueno' | 'regular' | 'malo';
export type ComparableSource = 'zonaprop' | 'argenprop' | 'mercadolibre' | 'facebook' | 'custom' | 'manual';
export type Currency = 'USD' | 'ARS';

export interface PropertyData {
  address: string;
  neighborhood: string;
  city: string;
  propertyType: PropertyType | null;
  propertySubtype: PropertySubtype;
  conservationState: ConservationState;
  totalArea: number | null;
  coveredArea: number | null;
  uncoveredArea: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  age: number | null;
  floor: number | null;
  orientation: string | null;
  condition: PropertyCondition | null;
  amenities: string[];
  description: string;
  additionalNotes: string;
}

export interface NormalizedComparable {
  id: string;
  source: ComparableSource;
  sourceUrl: string;
  title: string;
  price: number;
  currency: Currency;
  totalArea: number | null;
  coveredArea: number | null;
  pricePerM2: number | null;
  propertyType: string;
  propertySubtype: string | null;
  conservationState: string | null;
  address: string;
  neighborhood: string;
  city: string;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  age: number | null;
  imageUrl: string | null;
  selected: boolean;
  adjustmentFactor: number;       // Default 1.0, rango 0.5–1.5
  adjustedPricePerM2: number | null;
  notes: string;
  relevanceScore: number | null;  // 0-1, calculated client-side
}

export interface FodaAnalysis {
  fortalezas: string;
  oportunidades: string;
  debilidades: string;     // Redactado diplomáticamente
  amenazas: string;        // Redactado diplomáticamente
}

export interface AcmConclusions {
  comparablesUsed: number;
  avgPricePerM2: number;
  medianPricePerM2: number;
  minPricePerM2: number;
  maxPricePerM2: number;
  adjustedAvgPricePerM2: number;
  suggestedPricePerM2: number;
  suggestedTotalPrice: number;
  suggestedRangeLow: number;
  suggestedRangeHigh: number;
  currency: Currency;
  methodology: string;
}

export interface AgentBranding {
  fullName: string;
  photoUrl: string | null;
  email: string;
  phone: string;
  logoUrl: string | null;
  organizationName: string;
}

export interface AcmCustomSite {
  id: string;
  organizationId: string | null;
  name: string;
  url: string;
  scrapeConfig: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface AcmReport {
  id: string;
  agentId: string;
  organizationId: string;
  personId: string | null;
  status: AcmStatus;
  isPublic: boolean;
  propertyData: PropertyData;
  propertyImages: string[];
  chatHistory: ChatMessage[];
  comparables: NormalizedComparable[];
  fodaResponses: Record<string, string>;
  fodaAnalysis: Partial<FodaAnalysis>;
  conclusions: Partial<AcmConclusions>;
  suggestedPriceUsd: number | null;
  suggestedPriceArs: number | null;
  agentConclusion: string;
  agentBranding: Partial<AgentBranding>;
  createdAt: string;
  updatedAt: string;
  // Joined
  agentName?: string;
  personName?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Para el listado de ACMs (sin todo el JSONB pesado)
export interface AcmReportSummary {
  id: string;
  agentId: string;
  organizationId: string;
  personId: string | null;
  status: AcmStatus;
  isPublic: boolean;
  suggestedPriceUsd: number | null;
  suggestedPriceArs: number | null;
  propertyAddress: string;
  propertyType: string | null;
  createdAt: string;
  updatedAt: string;
  agentName?: string;
  personName?: string;
}

// ─── Market Listings (tabla centralizada de mercado) ────────────────────────

export interface MarketListing {
  id: string;
  source: ComparableSource;
  sourceUrl: string;
  sourceId: string | null;
  title: string;
  description: string | null;
  propertyType: string | null;
  operationType: string;
  price: number | null;
  currency: string;
  pricePerM2: number | null;
  totalArea: number | null;
  coveredArea: number | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  province: string;
  latitude: number | null;
  longitude: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  age: number | null;
  imageUrl: string | null;
  imageUrls: string[];
  isActive: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  removedAt: string | null;
  priceHistory: PriceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  // Computed fields (added by search action)
  daysOnMarket?: number;
  priceChanged?: boolean;
}

export interface PriceHistoryEntry {
  date: string;
  price: number;
  currency: string;
}

export interface MarketScrapeRun {
  id: string;
  batchId: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'running' | 'completed' | 'partial' | 'failed';
  sourceResults: Record<string, MarketSourceResult>;
  totalFound: number;
  totalNew: number;
  totalUpdated: number;
  totalRemoved: number;
  createdAt: string;
}

export interface MarketSourceResult {
  found: number;
  new: number;
  updated: number;
  errors: string[];
}

export interface MarketSearchFilters {
  city?: string;
  neighborhoods?: string[];
  propertyType?: string;
  propertySubtype?: string;
  conservationState?: string;
  operationType?: string;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  maxAge?: number;
  onlyActive?: boolean;
  includeInactive?: boolean;
  sources?: ComparableSource[];
  limit?: number;
  orderBy?: 'price_per_m2' | 'price' | 'total_area' | 'last_seen_at';
  orderDir?: 'asc' | 'desc';
}

export interface MarketSearchResult {
  listings: NormalizedComparable[];
  totalCount: number;
  lastSyncAt: string | null;
}
