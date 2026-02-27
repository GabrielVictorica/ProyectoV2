'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
    COMPETITION_START_DATE,
    COMPETITION_END_DATE,
    POINTS_TABLE,
    REFERIDO_BONUS,
    REFERIDO_QUALIFYING_TYPES,
    PERFECT_WEEK_BONUS,
    PERFECT_WEEK_FIXED_CRITERIA,
    type TeamId,
} from '../constants';

// Note: TeamId is intentionally NOT re-exported from this 'use server' file.
// Next.js transforms all exports in 'use server' files into async server action references,
// which breaks type-only re-exports at runtime. Import TeamId directly from '../constants'.

// ─── Types ────────────────────────────────────────────────────────

export interface CompetitionMember {
    agent_id: string;
    team: TeamId;
    first_name: string;
    last_name: string;
    is_active: boolean;
}

export interface AgentScore {
    agent_id: string;
    first_name: string;
    last_name: string;
    team: TeamId;
    breakdown: {
        pre_listing: number;
        cierre: number;
        captacion: number;
        pre_buying: number;
        reunion_verde: number;
        acm: number;
        visita: number;
        nuevo_contacto: number;
        nueva_busqueda: number;
        referido_bonus: number;
        perfect_weeks: number;
    };
    /** Raw activity counts (for MVP tiebreaker) */
    counts: {
        pre_listing: number;
        cierre_puntas: number;
        [key: string]: number;
    };
    totalPoints: number;
}

export interface TeamScore {
    team: TeamId;
    totalPoints: number;
    facturacion: number;
    members: AgentScore[];
    perfectWeekBonuses: number;
}

export interface WeeklyResult {
    weekStart: string; // ISO date (Monday)
    weekEnd: string;   // ISO date (Sunday)
    weekNumber: number;
    negro: number;
    dorado: number;
    mvp: {
        agent_id: string;
        first_name: string;
        last_name: string;
        team: TeamId;
        points: number;
        pl_count: number;
    } | null;
    perfectWeeks: { agent_id: string; first_name: string; last_name: string; team: TeamId }[];
}

export interface CompetitionData {
    teams: Record<TeamId, TeamScore>;
    weeklyResults: WeeklyResult[];
    overallMvp: AgentScore | null;
    members: CompetitionMember[];
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Returns the ISO Monday of the week for a given date string.
 */
function getWeekMonday(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00Z');
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday = 1
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString().split('T')[0];
}

function getWeekSunday(mondayStr: string): string {
    const d = new Date(mondayStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().split('T')[0];
}

/**
 * Generates all Monday dates between two dates.
 */
function getWeekMondaysBetween(startDate: string, endDate: string): string[] {
    const mondays: string[] = [];
    const firstMonday = getWeekMonday(startDate);
    const end = new Date(endDate + 'T12:00:00Z');
    let current = new Date(firstMonday + 'T12:00:00Z');

    while (current <= end) {
        mondays.push(current.toISOString().split('T')[0]);
        current.setUTCDate(current.getUTCDate() + 7);
    }
    return mondays;
}

// ─── Main Server Action ──────────────────────────────────────────

/**
 * Fetches ALL competition data: team scores, agent rankings, weekly breakdowns, MVP.
 * This is a READ-ONLY action — it never writes to the database.
 */
export async function getCompetitionDataAction(
    filterStartDate?: string,
    filterEndDate?: string
): Promise<{ success: boolean; data?: CompetitionData; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autenticado' };

        const adminClient = createAdminClient();

        const startDate = filterStartDate || COMPETITION_START_DATE;
        const endDate = filterEndDate || COMPETITION_END_DATE;

        // ── Step 1: Get team members ──────────────────────────────
        const { data: membersRaw, error: membersErr } = await adminClient
            .from('competition_team_members' as any)
            .select('agent_id, team, is_active')
            .eq('is_active', true);

        if (membersErr) throw membersErr;
        const memberRows = membersRaw as any[];
        if (!memberRows || memberRows.length === 0) {
            return { success: true, data: emptyCompetitionData() };
        }

        const agentIds = memberRows.map((m: any) => m.agent_id);
        const agentTeamMap: Record<string, TeamId> = {};
        memberRows.forEach((m: any) => { agentTeamMap[m.agent_id] = m.team; });

        // ── Step 2: Fetch ALL data in parallel (6 queries at once) ──
        const [
            { data: profilesRaw },
            { data: activitiesRaw },
            { data: transactionsRaw },
            { data: newContactsRaw },
            { data: newSearchesRaw },
            { data: objectivesRaw },
        ] = await Promise.all([
            adminClient
                .from('profiles' as any)
                .select('id, first_name, last_name')
                .in('id', agentIds),
            adminClient
                .from('activities' as any)
                .select('agent_id, type, date, person_id')
                .in('agent_id', agentIds)
                .gte('date', startDate)
                .lte('date', endDate),
            adminClient
                .from('transactions' as any)
                .select('agent_id, sides, gross_commission, transaction_date')
                .in('agent_id', agentIds)
                .gte('transaction_date', startDate)
                .lte('transaction_date', endDate),
            adminClient
                .from('persons' as any)
                .select('agent_id, created_at')
                .in('agent_id', agentIds)
                .gte('created_at', startDate + 'T00:00:00Z')
                .lte('created_at', endDate + 'T23:59:59Z'),
            adminClient
                .from('person_searches' as any)
                .select('agent_id, created_at')
                .in('agent_id', agentIds)
                .gte('created_at', startDate + 'T00:00:00Z')
                .lte('created_at', endDate + 'T23:59:59Z'),
            adminClient
                .from('view_agent_progress' as any)
                .select('agent_id, weekly_pl_pb_target, required_prelistings_weekly')
                .in('agent_id', agentIds)
                .eq('year', 2026),
        ]);

        // Process profiles
        const profiles = profilesRaw as any[] || [];
        const profileMap: Record<string, { first_name: string; last_name: string }> = {};
        profiles.forEach((p: any) => {
            profileMap[p.id] = { first_name: p.first_name, last_name: p.last_name };
        });

        const members: CompetitionMember[] = memberRows.map((m: any) => ({
            agent_id: m.agent_id,
            team: m.team,
            first_name: profileMap[m.agent_id]?.first_name || '',
            last_name: profileMap[m.agent_id]?.last_name || '',
            is_active: m.is_active,
        }));

        // Process fetched data
        const activities = (activitiesRaw || []) as any[];
        const transactions = (transactionsRaw || []) as any[];
        const newContacts = (newContactsRaw || []) as any[];
        const newSearches = (newSearchesRaw || []) as any[];

        const objectives = (objectivesRaw || []) as any[];
        const objectivesMap: Record<string, { weeklyPlPb: number; weeklyPl: number }> = {};
        objectives.forEach((o: any) => {
            objectivesMap[o.agent_id] = {
                weeklyPlPb: Number(o.weekly_pl_pb_target) || 0,
                weeklyPl: Number(o.required_prelistings_weekly) || 0,
            };
        });

        // ── Step 7: Build referido bonus map ──────────────────────
        // Find persons that have a "referido" activity AND a qualifying activity by the SAME agent
        const referidoActivities = activities.filter(
            (a: any) => a.type === 'referido' && a.person_id
        );
        const qualifyingActivities = activities.filter(
            (a: any) => REFERIDO_QUALIFYING_TYPES.includes(a.type) && a.person_id
        );

        // Map of "agent_id::person_id" -> date of their FIRST qualifying activity
        const referidoBonusMap = new Map<string, string>();
        for (const ref of referidoActivities) {
            const key = `${ref.agent_id}::${ref.person_id}`;
            const agentQualifying = qualifyingActivities.filter(
                (q: any) => q.agent_id === ref.agent_id && q.person_id === ref.person_id
            );

            if (agentQualifying.length > 0 && !referidoBonusMap.has(key)) {
                // Find the earliest qualifying activity date
                const firstDate = agentQualifying.reduce((min, q) => q.date < min ? q.date : min, agentQualifying[0].date);
                referidoBonusMap.set(key, firstDate);
            }
        }

        // Group referido bonuses by agent
        const referidoBonusByAgent: Record<string, number> = {};
        for (const key of referidoBonusMap.keys()) {
            const agentId = key.split('::')[0];
            referidoBonusByAgent[agentId] = (referidoBonusByAgent[agentId] || 0) + 1;
        }

        // ── Step 8: Calculate per-agent scores ────────────────────
        const agentScores: Record<string, AgentScore> = {};

        for (const agentId of agentIds) {
            const profile = profileMap[agentId] || { first_name: '?', last_name: '?' };
            const team = agentTeamMap[agentId];

            // Count activities by type
            const agentActivities = activities.filter((a: any) => a.agent_id === agentId);
            const countByType: Record<string, number> = {};
            for (const a of agentActivities) {
                countByType[a.type] = (countByType[a.type] || 0) + 1;
            }

            // Count transactions
            const agentTransactions = transactions.filter((t: any) => t.agent_id === agentId);
            const totalPuntas = agentTransactions.reduce((sum: number, t: any) => sum + (Number(t.sides) || 1), 0);

            // Count new contacts and searches
            const contactCount = newContacts.filter((c: any) => c.agent_id === agentId).length;
            const searchCount = newSearches.filter((s: any) => s.agent_id === agentId).length;

            // Referido bonus count
            const refBonusCount = referidoBonusByAgent[agentId] || 0;

            // Points breakdown
            const breakdown = {
                pre_listing: (countByType['pre_listing'] || 0) * POINTS_TABLE.pre_listing,
                cierre: totalPuntas * POINTS_TABLE.cierre,
                captacion: (countByType['captacion'] || 0) * POINTS_TABLE.captacion,
                pre_buying: (countByType['pre_buying'] || 0) * POINTS_TABLE.pre_buying,
                reunion_verde: (countByType['reunion_verde'] || 0) * POINTS_TABLE.reunion_verde,
                acm: (countByType['acm'] || 0) * POINTS_TABLE.acm,
                visita: (countByType['visita'] || 0) * POINTS_TABLE.visita,
                nuevo_contacto: contactCount * POINTS_TABLE.nuevo_contacto,
                nueva_busqueda: searchCount * POINTS_TABLE.nueva_busqueda,
                referido_bonus: refBonusCount * REFERIDO_BONUS,
                perfect_weeks: 0, // Calculated below
            };

            const totalPoints = Object.values(breakdown).reduce((a, b) => a + b, 0);

            agentScores[agentId] = {
                agent_id: agentId,
                first_name: profile.first_name,
                last_name: profile.last_name,
                team,
                breakdown,
                counts: {
                    pre_listing: countByType['pre_listing'] || 0,
                    cierre_puntas: totalPuntas,
                    captacion: countByType['captacion'] || 0,
                    pre_buying: countByType['pre_buying'] || 0,
                    reunion_verde: countByType['reunion_verde'] || 0,
                    acm: countByType['acm'] || 0,
                    visita: countByType['visita'] || 0,
                    referido: countByType['referido'] || 0,
                    nuevo_contacto: contactCount,
                    nueva_busqueda: searchCount,
                },
                totalPoints,
            };
        }

        // ── Step 9: Weekly breakdown + Semana Perfecta + MVP ──────
        const weekMondays = getWeekMondaysBetween(startDate, endDate);
        const weeklyResults: WeeklyResult[] = [];
        const perfectWeeksByAgent: Record<string, number> = {};

        for (let wIdx = 0; wIdx < weekMondays.length; wIdx++) {
            const monday = weekMondays[wIdx];
            const sunday = getWeekSunday(monday);

            // Filter activities and transactions for this week
            const weekActivities = activities.filter(
                (a: any) => a.date >= monday && a.date <= sunday
            );
            const weekTransactions = transactions.filter(
                (t: any) => t.transaction_date >= monday && t.transaction_date <= sunday
            );
            const weekContacts = newContacts.filter((c: any) => {
                const d = c.created_at?.split('T')[0];
                return d >= monday && d <= sunday;
            });
            const weekSearches = newSearches.filter((s: any) => {
                const d = s.created_at?.split('T')[0];
                return d >= monday && d <= sunday;
            });

            // Calculate points per agent for this week
            const weekAgentPoints: Record<string, { points: number; plCount: number }> = {};
            const weekPerfectWeeks: { agent_id: string; first_name: string; last_name: string; team: TeamId }[] = [];

            for (const agentId of agentIds) {
                const aa = weekActivities.filter((a: any) => a.agent_id === agentId);
                const at = weekTransactions.filter((t: any) => t.agent_id === agentId);
                const ac = weekContacts.filter((c: any) => c.agent_id === agentId);
                const as_ = weekSearches.filter((s: any) => s.agent_id === agentId);

                const countByType: Record<string, number> = {};
                for (const a of aa) {
                    countByType[a.type] = (countByType[a.type] || 0) + 1;
                }

                const puntas = at.reduce((sum: number, t: any) => sum + (Number(t.sides) || 1), 0);

                // Week referido bonus: award it only in the week where the FIRST qualifying activity occurred
                let weekRefBonus = 0;
                for (const [key, firstDate] of referidoBonusMap.entries()) {
                    const agentIdKey = key.split('::')[0];
                    if (agentIdKey === agentId && firstDate >= monday && firstDate <= sunday) {
                        weekRefBonus += REFERIDO_BONUS;
                    }
                }

                const pts =
                    (countByType['pre_listing'] || 0) * POINTS_TABLE.pre_listing +
                    puntas * POINTS_TABLE.cierre +
                    (countByType['captacion'] || 0) * POINTS_TABLE.captacion +
                    (countByType['pre_buying'] || 0) * POINTS_TABLE.pre_buying +
                    (countByType['reunion_verde'] || 0) * POINTS_TABLE.reunion_verde +
                    (countByType['acm'] || 0) * POINTS_TABLE.acm +
                    (countByType['visita'] || 0) * POINTS_TABLE.visita +
                    ac.length * POINTS_TABLE.nuevo_contacto +
                    as_.length * POINTS_TABLE.nueva_busqueda +
                    weekRefBonus;

                weekAgentPoints[agentId] = {
                    points: pts,
                    plCount: countByType['pre_listing'] || 0,
                };

                // ── Semana Perfecta check ──
                const objectives = objectivesMap[agentId];
                if (objectives && objectives.weeklyPlPb > 0) {
                    const rvCount = countByType['reunion_verde'] || 0;
                    const plCount = countByType['pre_listing'] || 0;
                    const pbCount = countByType['pre_buying'] || 0;
                    const refCount = countByType['referido'] || 0;
                    const criticalCount = plCount + pbCount;

                    const isPerfect =
                        rvCount >= PERFECT_WEEK_FIXED_CRITERIA.reunion_verde &&
                        criticalCount >= objectives.weeklyPlPb &&
                        plCount >= objectives.weeklyPl &&
                        refCount >= PERFECT_WEEK_FIXED_CRITERIA.referido;

                    if (isPerfect) {
                        perfectWeeksByAgent[agentId] = (perfectWeeksByAgent[agentId] || 0) + 1;
                        weekPerfectWeeks.push({
                            agent_id: agentId,
                            first_name: profileMap[agentId]?.first_name || '',
                            last_name: profileMap[agentId]?.last_name || '',
                            team: agentTeamMap[agentId],
                        });
                    }
                }
            }

            // Team points for the week
            let negroWeek = 0;
            let doradoWeek = 0;
            for (const agentId of agentIds) {
                const pts = weekAgentPoints[agentId]?.points || 0;
                if (agentTeamMap[agentId] === 'negro') negroWeek += pts;
                else doradoWeek += pts;
            }

            // Add perfect week bonuses to team totals
            for (const pw of weekPerfectWeeks) {
                if (pw.team === 'negro') negroWeek += PERFECT_WEEK_BONUS;
                else doradoWeek += PERFECT_WEEK_BONUS;
            }

            // MVP of the week
            let mvp: WeeklyResult['mvp'] = null;
            let maxPts = 0;
            let maxPl = 0;
            for (const agentId of agentIds) {
                const { points, plCount } = weekAgentPoints[agentId] || { points: 0, plCount: 0 };
                if (points > maxPts || (points === maxPts && plCount > maxPl)) {
                    maxPts = points;
                    maxPl = plCount;
                    mvp = {
                        agent_id: agentId,
                        first_name: profileMap[agentId]?.first_name || '',
                        last_name: profileMap[agentId]?.last_name || '',
                        team: agentTeamMap[agentId],
                        points,
                        pl_count: plCount,
                    };
                }
            }

            // Only include weeks that have some data or are in the past
            const today = new Date().toISOString().split('T')[0];
            if (monday <= today) {
                weeklyResults.push({
                    weekStart: monday,
                    weekEnd: sunday,
                    weekNumber: wIdx + 1,
                    negro: negroWeek,
                    dorado: doradoWeek,
                    mvp: maxPts > 0 ? mvp : null,
                    perfectWeeks: weekPerfectWeeks,
                });
            }
        }

        // ── Step 10: Add perfect week bonuses to agent scores ─────
        for (const agentId of agentIds) {
            const count = perfectWeeksByAgent[agentId] || 0;
            if (count > 0 && agentScores[agentId]) {
                agentScores[agentId].breakdown.perfect_weeks = count * PERFECT_WEEK_BONUS;
                agentScores[agentId].totalPoints += count * PERFECT_WEEK_BONUS;
            }
        }

        // ── Step 11: Aggregate by team ───────────────────────────
        const teamScores: Record<TeamId, TeamScore> = {
            negro: { team: 'negro', totalPoints: 0, facturacion: 0, members: [], perfectWeekBonuses: 0 },
            dorado: { team: 'dorado', totalPoints: 0, facturacion: 0, members: [], perfectWeekBonuses: 0 },
        };

        for (const agentId of agentIds) {
            const score = agentScores[agentId];
            if (!score) continue;
            const team = agentTeamMap[agentId];
            teamScores[team].totalPoints += score.totalPoints;
            teamScores[team].members.push(score);
            teamScores[team].perfectWeekBonuses += perfectWeeksByAgent[agentId] || 0;
        }

        // Facturación (gross_commission) by team
        for (const t of transactions) {
            const team = agentTeamMap[t.agent_id];
            if (team) {
                teamScores[team].facturacion += Number(t.gross_commission) || 0;
            }
        }

        // Sort members by totalPoints DESC, then by PL count DESC
        for (const team of Object.values(teamScores)) {
            team.members.sort((a, b) => {
                if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                return (b.counts.pre_listing || 0) - (a.counts.pre_listing || 0);
            });
        }

        // Overall MVP
        const allAgents = Object.values(agentScores).sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            return (b.counts.pre_listing || 0) - (a.counts.pre_listing || 0);
        });
        const overallMvp = allAgents.length > 0 ? allAgents[0] : null;

        return {
            success: true,
            data: {
                teams: teamScores,
                weeklyResults,
                overallMvp,
                members,
            },
        };
    } catch (err: any) {
        console.error('Error in getCompetitionDataAction:', err);
        return { success: false, error: err.message || 'Error al obtener datos de la competencia' };
    }
}

/** Returns empty competition data structure */
function emptyCompetitionData(): CompetitionData {
    return {
        teams: {
            negro: { team: 'negro', totalPoints: 0, facturacion: 0, members: [], perfectWeekBonuses: 0 },
            dorado: { team: 'dorado', totalPoints: 0, facturacion: 0, members: [], perfectWeekBonuses: 0 },
        },
        weeklyResults: [],
        overallMvp: null,
        members: [],
    };
}

// ─── Team Management Actions (God-only) ──────────────────────────

export async function addTeamMemberAction(
    agentId: string,
    team: TeamId
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autenticado' };

        // Verify god role
        const { data: profile } = await supabase
            .from('profiles' as any)
            .select('role')
            .eq('id', user.id)
            .single();

        if ((profile as any)?.role !== 'god') {
            return { success: false, error: 'Solo el administrador puede gestionar equipos' };
        }

        const adminClient = createAdminClient();
        const { error } = await (adminClient
            .from('competition_team_members' as any) as any)
            .upsert({
                agent_id: agentId,
                team,
                is_active: true,
                joined_at: new Date().toISOString(),
            }, { onConflict: 'agent_id' });

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || 'Error al agregar miembro' };
    }
}

export async function moveTeamMemberAction(
    agentId: string,
    newTeam: TeamId
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autenticado' };

        const { data: profile } = await supabase
            .from('profiles' as any)
            .select('role')
            .eq('id', user.id)
            .single();

        if ((profile as any)?.role !== 'god') {
            return { success: false, error: 'Solo el administrador puede gestionar equipos' };
        }

        const adminClient = createAdminClient();
        const { error } = await (adminClient
            .from('competition_team_members' as any) as any)
            .update({ team: newTeam })
            .eq('agent_id', agentId);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || 'Error al mover miembro' };
    }
}

export async function removeTeamMemberAction(
    agentId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autenticado' };

        const { data: profile } = await supabase
            .from('profiles' as any)
            .select('role')
            .eq('id', user.id)
            .single();

        if ((profile as any)?.role !== 'god') {
            return { success: false, error: 'Solo el administrador puede gestionar equipos' };
        }

        const adminClient = createAdminClient();
        const { error } = await (adminClient
            .from('competition_team_members' as any) as any)
            .update({ is_active: false })
            .eq('agent_id', agentId);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || 'Error al quitar miembro' };
    }
}

/**
 * Gets all agents from the org that are NOT yet in the competition.
 * Used by the "Add Agent" dropdown.
 */
export async function getAvailableAgentsAction(
    organizationId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autenticado' };

        const adminClient = createAdminClient();

        // Get all agents already in the competition
        const { data: existing } = await adminClient
            .from('competition_team_members' as any)
            .select('agent_id')
            .eq('is_active', true);

        const existingIds = (existing || []).map((e: any) => e.agent_id);

        // Get all agents from the org (excluding god and parent roles)
        const { data: agents, error } = await adminClient
            .from('profiles' as any)
            .select('id, first_name, last_name')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .eq('role', 'child')
            .order('first_name');

        if (error) throw error;

        // Filter out agents already in competition
        const available = (agents || []).filter(
            (a: any) => !existingIds.includes(a.id)
        );

        return { success: true, data: available };
    } catch (err: any) {
        return { success: false, error: err.message || 'Error al obtener agentes disponibles' };
    }
}
