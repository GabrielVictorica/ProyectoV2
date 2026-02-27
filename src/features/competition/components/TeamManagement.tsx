'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeftRight, UserMinus, Settings, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useAddTeamMember,
    useMoveTeamMember,
    useRemoveTeamMember,
    useAvailableAgents,
} from '../hooks/useCompetition';
import { TEAMS_CONFIG, type TeamId } from '../constants';
import type { CompetitionMember } from '../actions/competitionActions';

interface TeamManagementProps {
    members: CompetitionMember[];
    organizationId?: string;
}

export function TeamManagement({ members, organizationId }: TeamManagementProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<TeamId>('negro');

    const { data: availableAgents = [] } = useAvailableAgents(isOpen ? organizationId : undefined);
    const addMember = useAddTeamMember();
    const moveMember = useMoveTeamMember();
    const removeMember = useRemoveTeamMember();

    const negroMembers = members.filter((m) => m.team === 'negro');
    const doradoMembers = members.filter((m) => m.team === 'dorado');

    const handleAdd = () => {
        if (!selectedAgent) return;
        addMember.mutate({ agentId: selectedAgent, team: selectedTeam });
        setSelectedAgent('');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.03] rounded-2xl border border-white/[0.06] backdrop-blur-xl overflow-hidden"
        >
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-slate-400" />
                    <h3 className="text-base font-bold text-white">Gestión de Equipos</h3>
                </div>
                <ChevronDown className={cn(
                    'w-4 h-4 text-slate-500 transition-transform duration-200',
                    isOpen && 'rotate-180'
                )} />
            </button>

            {/* Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 space-y-5 border-t border-white/[0.04] pt-4">
                            {/* Add Agent Section */}
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04]">
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 font-medium">Agregar Agente</p>
                                <div className="flex gap-2">
                                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                        <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-white h-9 text-sm">
                                            <SelectValue placeholder="Seleccionar agente..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableAgents.map((agent: any) => (
                                                <SelectItem key={agent.id} value={agent.id}>
                                                    {agent.first_name} {agent.last_name}
                                                </SelectItem>
                                            ))}
                                            {availableAgents.length === 0 && (
                                                <SelectItem value="_none" disabled>
                                                    No hay agentes disponibles
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>

                                    <Select value={selectedTeam} onValueChange={(v) => setSelectedTeam(v as TeamId)}>
                                        <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="negro">{TEAMS_CONFIG.negro.emoji} Negro</SelectItem>
                                            <SelectItem value="dorado">{TEAMS_CONFIG.dorado.emoji} Dorado</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        size="sm"
                                        onClick={handleAdd}
                                        disabled={!selectedAgent || addMember.isPending}
                                        className="bg-violet-600 hover:bg-violet-500 h-9"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Teams */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(['negro', 'dorado'] as TeamId[]).map((teamId) => {
                                    const config = TEAMS_CONFIG[teamId];
                                    const teamMembers = teamId === 'negro' ? negroMembers : doradoMembers;

                                    return (
                                        <div key={teamId} className="space-y-2">
                                            <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                                <span>{config.emoji}</span> {config.name}
                                                <span className="text-slate-600 ml-auto">{teamMembers.length}</span>
                                            </p>

                                            <div className="space-y-1.5">
                                                {teamMembers.map((member) => (
                                                    <div
                                                        key={member.agent_id}
                                                        className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.04]"
                                                    >
                                                        <div className={cn(
                                                            'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border',
                                                            teamId === 'negro'
                                                                ? 'bg-slate-800 border-slate-600 text-slate-200'
                                                                : 'bg-amber-900/40 border-amber-600/40 text-amber-200',
                                                        )}>
                                                            {member.first_name?.[0]}{member.last_name?.[0]}
                                                        </div>
                                                        <span className="text-xs text-white flex-1 truncate">
                                                            {member.first_name} {member.last_name}
                                                        </span>

                                                        <button
                                                            onClick={() => moveMember.mutate({
                                                                agentId: member.agent_id,
                                                                newTeam: teamId === 'negro' ? 'dorado' : 'negro',
                                                            })}
                                                            className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                                                            title="Mover al otro equipo"
                                                        >
                                                            <ArrowLeftRight className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => removeMember.mutate({ agentId: member.agent_id })}
                                                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                                            title="Quitar de la competencia"
                                                        >
                                                            <UserMinus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
