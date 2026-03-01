'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Person } from '@/features/clients/types';
import { searchPersonsAction, getRecentPersonsAction, getPersonByIdAction, getPersonsAction } from '@/features/crm/actions/personActions';
import { PersonFormDialog } from '@/features/crm/components/PersonFormDialog';
import { Search, UserPlus, X, Check, User, Phone, Mail, Loader2, Sparkles, History, UserPlus2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PersonSelectorProps {
    value: string | null;
    onChange: (personId: string | null, person?: Person) => void;
    placeholder?: string;
    className?: string;
}

export function PersonSelector({ value, onChange, placeholder = "Buscar persona...", className }: PersonSelectorProps) {
    const [search, setSearch] = useState('');
    const [allPersons, setAllPersons] = useState<Person[]>([]);
    const [hasLoadedAll, setHasLoadedAll] = useState(false);
    const [results, setResults] = useState<Person[]>([]);
    const [recentPersons, setRecentPersons] = useState<Person[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cargar contactos recientes
    useEffect(() => {
        const fetchRecent = async () => {
            const res = await getRecentPersonsAction();
            if (res.success) setRecentPersons(res.data || []);
        };
        fetchRecent();
    }, []);

    // Cargar TODAS las personas para búsqueda local instantánea
    useEffect(() => {
        const fetchAll = async () => {
            if (isOpen && !hasLoadedAll && !loading) {
                setLoading(true);
                const res = await getPersonsAction(); // Trae activos por defecto
                if (res.success) {
                    setAllPersons(res.data || []);
                    setHasLoadedAll(true);
                }
                setLoading(false);
            }
        };
        fetchAll();
    }, [isOpen, hasLoadedAll]);

    // Resolver ID a Persona si viene por prop
    useEffect(() => {
        const resolvePerson = async () => {
            if (value && (!selectedPerson || selectedPerson.id !== value)) {
                setLoading(true);
                const res = await getPersonByIdAction(value);
                if (res.success && res.data) {
                    setSelectedPerson(res.data);
                }
                setLoading(false);
            } else if (!value) {
                setSelectedPerson(null);
            }
        };
        resolvePerson();
    }, [value]);

    // Cerrar al hacer clic afuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Búsqueda LOCAL (Instantánea)
    useEffect(() => {
        if (search.length < 2) {
            setResults([]);
            return;
        }

        const query = search.toLowerCase();
        const filtered = allPersons.filter(p =>
            p.first_name.toLowerCase().includes(query) ||
            p.last_name.toLowerCase().includes(query) ||
            (p.email && p.email.toLowerCase().includes(query)) ||
            (p.phone && p.phone.toLowerCase().includes(query))
        );

        setResults(filtered.slice(0, 10)); // Limitar a 10 resultados para la UI
    }, [search, allPersons]);

    const handleSelect = (person: Person) => {
        setSelectedPerson(person);
        onChange(person.id, person);
        setIsOpen(false);
        setSearch('');
    };

    const handleClear = () => {
        setSelectedPerson(null);
        onChange(null);
        setSearch('');
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            {selectedPerson ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-between p-3 bg-violet-600/10 border border-violet-500/30 rounded-2xl group transition-all duration-300"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600/20 to-violet-400/10 flex items-center justify-center text-violet-400 border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white tracking-tight">
                                {selectedPerson.first_name} {selectedPerson.last_name}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-white/40 mt-0.5 font-medium uppercase tracking-wider">
                                {selectedPerson.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-violet-500/50" /> {selectedPerson.phone}
                                    </span>
                                )}
                                {selectedPerson.email && (
                                    <span className="flex items-center gap-1">
                                        <Mail className="w-3 h-3 text-violet-500/50" /> {selectedPerson.email}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="h-8 w-8 text-white/20 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </motion.div>
            ) : (
                <div className="relative group/input">
                    <Search className={cn(
                        "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300",
                        isOpen ? "text-violet-400 scale-110" : "text-white/20"
                    )} />
                    <Input
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        className="pl-11 pr-11 bg-[#0c0c0e] border-white/[0.08] focus:border-violet-500/50 text-white rounded-2xl h-12 shadow-xl focus:ring-4 focus:ring-violet-500/10 transition-all duration-300"
                    />
                    {loading && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {isOpen && !selectedPerson && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="absolute top-full left-0 right-0 mt-3 bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/[0.08] rounded-[24px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] z-[100] overflow-hidden"
                    >
                        <div className="max-h-[380px] overflow-y-auto p-3 custom-scrollbar">
                            {/* Buscar Título */}
                            <div className="px-3 py-2 flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 flex items-center gap-2">
                                    {search.length >= 2 ? <Sparkles className="w-3 h-3 text-violet-400" /> : <History className="w-3 h-3" />}
                                    {search.length >= 2 ? 'Resultados' : 'Sugerencias Recientes'}
                                </span>
                            </div>

                            <div className="space-y-1">
                                {search.length < 2 && recentPersons.length > 0 ? (
                                    recentPersons.map((person) => (
                                        <button
                                            key={person.id}
                                            onClick={() => handleSelect(person)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-white/[0.03] rounded-xl text-left group transition-all duration-200 border border-transparent hover:border-white/[0.05]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-white/[0.03] flex items-center justify-center text-white/40 border border-white/[0.05] group-hover:bg-violet-500/10 group-hover:text-violet-400 group-hover:border-violet-500/20 transition-all duration-300">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
                                                        {person.first_name} {person.last_name}
                                                    </p>
                                                    <p className="text-[11px] text-white/30 group-hover:text-white/40 transition-colors">
                                                        Contacto reciente
                                                    </p>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-3 h-3 text-white/0 group-hover:text-violet-400 transition-all -translate-x-2 group-hover:translate-x-0" />
                                        </button>
                                    ))
                                ) : results.length > 0 ? (
                                    results.map((person) => (
                                        <button
                                            key={person.id}
                                            onClick={() => handleSelect(person)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-white/[0.03] rounded-xl text-left group transition-all duration-200 border border-transparent hover:border-white/[0.05]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-white/[0.03] flex items-center justify-center text-slate-500 border border-white/[0.05] group-hover:border-violet-500/20 group-hover:text-violet-400 group-hover:bg-violet-500/10 transition-all duration-300">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
                                                        {person.first_name} {person.last_name}
                                                    </p>
                                                    <p className="text-[11px] text-white/30 truncate max-w-[180px]">
                                                        {person.phone || person.email || 'Sin datos de contacto'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Check className="w-4 h-4 text-violet-500 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                                        </button>
                                    ))
                                ) : search.length >= 2 && !loading ? (
                                    <div className="p-10 text-center animate-in fade-in zoom-in-95 duration-500">
                                        <div className="w-16 h-16 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-inner">
                                            <Search className="w-6 h-6 text-white/10" />
                                        </div>
                                        <p className="text-sm font-medium text-white/40">No hay coincidencias en tu base</p>
                                        <p className="text-[11px] text-white/20 mt-1 uppercase tracking-wide">Probá cargarlo como nuevo debajo</p>
                                    </div>
                                ) : search.length < 2 && recentPersons.length === 0 ? (
                                    <div className="p-8 text-center py-12">
                                        <div className="w-12 h-12 bg-violet-600/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-violet-500/10">
                                            <Search className="w-5 h-5 text-violet-400/30" />
                                        </div>
                                        <p className="text-xs font-medium text-white/30">Escribe el nombre del cliente para buscar...</p>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Create New Client CTA */}
                        <div className="p-3 border-t border-white/[0.05]">
                            <button
                                onClick={() => setIsDialogOpen(true)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-300 group/btn"
                            >
                                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                    <UserPlus2 className="w-4 h-4 text-violet-400" />
                                </div>
                                <p className="text-sm font-semibold text-white">Crear Nuevo Cliente</p>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <PersonFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                initialData={{
                    firstName: search.split(' ')[0] || '',
                    lastName: search.split(' ').slice(1).join(' ') || ''
                }}
                onSuccess={(person) => handleSelect(person)}
            />
        </div>
    );
}
