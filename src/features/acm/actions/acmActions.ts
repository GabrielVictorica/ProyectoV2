'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type {
  AcmReport,
  AcmReportSummary,
  AcmStatus,
  PropertyData,
  NormalizedComparable,
  FodaAnalysis,
  AcmConclusions,
  AgentBranding,
  AcmCustomSite,
} from '../types/acm';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAuthProfile() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('No autenticado');

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await (adminClient as any)
    .from('profiles')
    .select('id, role, organization_id, first_name, last_name, email, phone')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) throw new Error('Perfil no encontrado');
  return profile;
}

function buildPropertyAddress(propertyData: Partial<PropertyData>): string {
  return [propertyData.address, propertyData.neighborhood, propertyData.city]
    .filter(Boolean)
    .join(', ');
}

// ─── ACM Reports CRUD ────────────────────────────────────────────────────────

export async function createAcmAction(): Promise<ActionResult<AcmReport>> {
  try {
    const profile = await getAuthProfile();
    const adminClient = createAdminClient();

    // Snapshot branding del agente al momento de crear
    const { data: orgData } = await (adminClient as any)
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single();

    const agentBranding: AgentBranding = {
      fullName: `${profile.first_name} ${profile.last_name}`,
      photoUrl: null,
      email: profile.email || '',
      phone: profile.phone || '',
      logoUrl: null,
      organizationName: orgData?.name || '',
    };

    const { data, error } = await (adminClient as any)
      .from('acm_reports')
      .insert({
        agent_id: profile.id,
        organization_id: profile.organization_id,
        status: 'draft',
        is_public: true,
        property_data: {},
        property_images: [],
        chat_history: [],
        comparables: [],
        foda_responses: {},
        foda_analysis: {},
        conclusions: {},
        agent_conclusion: '',
        agent_branding: agentBranding,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/acm');
    return { success: true, data: mapRow(data) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al crear tasación' };
  }
}

export async function getAcmListAction(filters: {
  search?: string;
  status?: AcmStatus;
} = {}): Promise<ActionResult<AcmReportSummary[]>> {
  try {
    const profile = await getAuthProfile();
    const adminClient = createAdminClient();

    let query = (adminClient as any)
      .from('acm_reports')
      .select(`
        id, agent_id, organization_id, person_id,
        status, is_public, suggested_price_usd, suggested_price_ars,
        property_data, created_at, updated_at,
        profiles!agent_id(first_name, last_name),
        persons(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    // RBAC
    if (profile.role === 'child') {
      query = query.eq('agent_id', profile.id);
    } else if (profile.role === 'parent') {
      query = query.eq('organization_id', profile.organization_id);
    }
    // god: ve todo sin filtro

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const summaries: AcmReportSummary[] = (data || []).map((row: any) => ({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      personId: row.person_id,
      status: row.status,
      isPublic: row.is_public,
      suggestedPriceUsd: row.suggested_price_usd,
      suggestedPriceArs: row.suggested_price_ars,
      propertyAddress: buildPropertyAddress(row.property_data || {}),
      propertyType: row.property_data?.propertyType || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      agentName: row.profiles
        ? `${row.profiles.first_name} ${row.profiles.last_name}`
        : undefined,
      personName: row.persons
        ? `${row.persons.first_name} ${row.persons.last_name}`
        : undefined,
    }));

    return { success: true, data: summaries };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al obtener tasaciones' };
  }
}

export async function getAcmByIdAction(id: string): Promise<ActionResult<AcmReport>> {
  try {
    const profile = await getAuthProfile();
    const adminClient = createAdminClient();

    const { data, error } = await (adminClient as any)
      .from('acm_reports')
      .select(`
        *,
        profiles!agent_id(first_name, last_name),
        persons(first_name, last_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // RBAC check
    if (profile.role === 'child' && data.agent_id !== profile.id) {
      return { success: false, error: 'Sin acceso a esta tasación' };
    }
    if (profile.role === 'parent' && data.organization_id !== profile.organization_id) {
      return { success: false, error: 'Sin acceso a esta tasación' };
    }

    return { success: true, data: mapRow(data) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al obtener tasación' };
  }
}

export async function updateAcmPropertyDataAction(
  id: string,
  propertyData: Partial<PropertyData>,
  images?: string[]
): Promise<ActionResult<void>> {
  try {
    const profile = await getAuthProfile();
    const adminClient = createAdminClient();

    const update: any = {
      property_data: propertyData,
      status: 'data_collected',
    };
    if (images !== undefined) update.property_images = images;

    const { error } = await (adminClient as any)
      .from('acm_reports')
      .update(update)
      .eq('id', id)
      .eq(profile.role === 'child' ? 'agent_id' : 'organization_id',
          profile.role === 'child' ? profile.id : profile.organization_id);

    if (error) throw error;

    revalidatePath(`/dashboard/acm/${id}`);
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al actualizar datos' };
  }
}

export async function updateAcmComparablesAction(
  id: string,
  comparables: NormalizedComparable[]
): Promise<ActionResult<void>> {
  try {
    const profile = await getAuthProfile();
    const adminClient = createAdminClient();

    const { error } = await (adminClient as any)
      .from('acm_reports')
      .update({ comparables, status: 'comparables_loaded' })
      .eq('id', id)
      .eq(profile.role === 'child' ? 'agent_id' : 'organization_id',
          profile.role === 'child' ? profile.id : profile.organization_id);

    if (error) throw error;

    revalidatePath(`/dashboard/acm/${id}`);
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar comparables' };
  }
}

export async function updateAcmFodaAction(
  id: string,
  fodaResponses: Record<string, string>,
  fodaAnalysis: Partial<FodaAnalysis>
): Promise<ActionResult<void>> {
  try {
    const profile = await getAuthProfile();
    const adminClient = createAdminClient();

    const { error } = await (adminClient as any)
      .from('acm_reports')
      .update({ foda_responses: fodaResponses, foda_analysis: fodaAnalysis, status: 'foda_done' })
      .eq('id', id)
      .eq(profile.role === 'child' ? 'agent_id' : 'organization_id',
          profile.role === 'child' ? profile.id : profile.organization_id);

    if (error) throw error;

    revalidatePath(`/dashboard/acm/${id}`);
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar FODA' };
  }
}

export async function updateAcmConclusionsAction(
  id: string,
  conclusions: Partial<AcmConclusions>,
  agentConclusion: string,
  suggestedPriceUsd?: number,
  suggestedPriceArs?: number
): Promise<ActionResult<void>> {
  try {
    const profile = await getAuthProfile();
    const adminClient = createAdminClient();

    const { error } = await (adminClient as any)
      .from('acm_reports')
      .update({
        conclusions,
        agent_conclusion: agentConclusion,
        suggested_price_usd: suggestedPriceUsd,
        suggested_price_ars: suggestedPriceArs,
        status: 'completed',
      })
      .eq('id', id)
      .eq(profile.role === 'child' ? 'agent_id' : 'organization_id',
          profile.role === 'child' ? profile.id : profile.organization_id);

    if (error) throw error;

    revalidatePath(`/dashboard/acm/${id}`);
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar conclusiones' };
  }
}

export async function toggleAcmPublicAction(
  id: string,
  isPublic: boolean
): Promise<ActionResult<void>> {
  try {
    const profile = await getAuthProfile();
    const adminClient = createAdminClient();

    const { error } = await (adminClient as any)
      .from('acm_reports')
      .update({ is_public: isPublic })
      .eq('id', id)
      .eq(profile.role === 'child' ? 'agent_id' : 'organization_id',
          profile.role === 'child' ? profile.id : profile.organization_id);

    if (error) throw error;

    revalidatePath(`/dashboard/acm/${id}`);
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al cambiar visibilidad' };
  }
}

export async function linkPersonToAcmAction(
  id: string,
  personId: string | null
): Promise<ActionResult<void>> {
  try {
    const profile = await getAuthProfile();
    const adminClient = createAdminClient();

    const { error } = await (adminClient as any)
      .from('acm_reports')
      .update({ person_id: personId })
      .eq('id', id)
      .eq(profile.role === 'child' ? 'agent_id' : 'organization_id',
          profile.role === 'child' ? profile.id : profile.organization_id);

    if (error) throw error;

    revalidatePath(`/dashboard/acm/${id}`);
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al vincular persona' };
  }
}

export async function deleteAcmAction(id: string): Promise<ActionResult<void>> {
  try {
    const profile = await getAuthProfile();
    const adminClient = createAdminClient();

    const { error } = await (adminClient as any)
      .from('acm_reports')
      .delete()
      .eq('id', id)
      .eq(profile.role === 'child' ? 'agent_id' : 'organization_id',
          profile.role === 'child' ? profile.id : profile.organization_id);

    if (error) throw error;

    revalidatePath('/dashboard/acm');
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al eliminar tasación' };
  }
}

export async function saveChatHistoryAction(
  id: string,
  chatHistory: any[]
): Promise<ActionResult<void>> {
  try {
    const profile = await getAuthProfile();
    const adminClient = createAdminClient();

    const { error } = await (adminClient as any)
      .from('acm_reports')
      .update({ chat_history: chatHistory })
      .eq('id', id)
      .eq(profile.role === 'child' ? 'agent_id' : 'organization_id',
          profile.role === 'child' ? profile.id : profile.organization_id);

    if (error) throw error;
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar chat' };
  }
}

// ─── Custom Sites CRUD ───────────────────────────────────────────────────────

export async function getCustomSitesAction(): Promise<ActionResult<AcmCustomSite[]>> {
  try {
    const profile = await getAuthProfile();
    const adminClient = createAdminClient();

    let query = (adminClient as any)
      .from('acm_custom_sites')
      .select('*')
      .order('created_at', { ascending: false });

    if (profile.role === 'parent') {
      // parent ve los de su org + los globales (organization_id IS NULL)
      query = query.or(`organization_id.eq.${profile.organization_id},organization_id.is.null`);
    } else if (profile.role === 'child') {
      // child solo ve los de su org + globales (readonly)
      query = query.or(`organization_id.eq.${profile.organization_id},organization_id.is.null`);
    }
    // god: ve todos

    const { data, error } = await query;
    if (error) throw error;

    return {
      success: true,
      data: (data || []).map((row: any) => ({
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        url: row.url,
        scrapeConfig: row.scrape_config || {},
        isActive: row.is_active,
        createdAt: row.created_at,
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al obtener sitios custom' };
  }
}

export async function createCustomSiteAction(data: {
  name: string;
  url: string;
  scrapeConfig?: Record<string, unknown>;
}): Promise<ActionResult<AcmCustomSite>> {
  try {
    const profile = await getAuthProfile();
    if (profile.role === 'child') {
      return { success: false, error: 'Sin permisos para crear sitios' };
    }
    const adminClient = createAdminClient();

    const insertData: any = {
      name: data.name,
      url: data.url,
      scrape_config: data.scrapeConfig || {},
      is_active: true,
    };

    // god crea globales (organization_id = null), parent crea para su org
    if (profile.role === 'parent') {
      insertData.organization_id = profile.organization_id;
    }

    const { data: row, error } = await (adminClient as any)
      .from('acm_custom_sites')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/acm');
    return {
      success: true,
      data: {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        url: row.url,
        scrapeConfig: row.scrape_config || {},
        isActive: row.is_active,
        createdAt: row.created_at,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al crear sitio' };
  }
}

export async function toggleCustomSiteAction(
  id: string,
  isActive: boolean
): Promise<ActionResult<void>> {
  try {
    const profile = await getAuthProfile();
    if (profile.role === 'child') {
      return { success: false, error: 'Sin permisos' };
    }
    const adminClient = createAdminClient();

    const { error } = await (adminClient as any)
      .from('acm_custom_sites')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/acm');
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al actualizar sitio' };
  }
}

export async function deleteCustomSiteAction(id: string): Promise<ActionResult<void>> {
  try {
    const profile = await getAuthProfile();
    if (profile.role === 'child') {
      return { success: false, error: 'Sin permisos' };
    }
    const adminClient = createAdminClient();

    const { error } = await (adminClient as any)
      .from('acm_custom_sites')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/acm');
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al eliminar sitio' };
  }
}

// ─── Row mapper ──────────────────────────────────────────────────────────────

function mapRow(row: any): AcmReport {
  return {
    id: row.id,
    agentId: row.agent_id,
    organizationId: row.organization_id,
    personId: row.person_id,
    status: row.status,
    isPublic: row.is_public,
    propertyData: row.property_data || {},
    propertyImages: row.property_images || [],
    chatHistory: row.chat_history || [],
    comparables: row.comparables || [],
    fodaResponses: row.foda_responses || {},
    fodaAnalysis: row.foda_analysis || {},
    conclusions: row.conclusions || {},
    suggestedPriceUsd: row.suggested_price_usd,
    suggestedPriceArs: row.suggested_price_ars,
    agentConclusion: row.agent_conclusion || '',
    agentBranding: row.agent_branding || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    agentName: row.profiles
      ? `${row.profiles.first_name} ${row.profiles.last_name}`
      : undefined,
    personName: row.persons
      ? `${row.persons.first_name} ${row.persons.last_name}`
      : undefined,
  };
}
