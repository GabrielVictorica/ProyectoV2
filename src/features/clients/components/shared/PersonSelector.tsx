'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Person } from '@/features/clients/types';
import { searchPersonsAction, getRecentPersonsAction, getPersonByIdAction } from '@/features/crm/actions/personActions';
import { PersonFormDialog } from '@/features/crm/components/PersonFormDialog';
import { usePermissions } from '@/features/auth/hooks/useAuth';
import { Search, X, User, Phone, Mail, Loader2, Sparkles, History, ArrowRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

interface PersonSelectorProps {
    value: string | null;
    onChange: (personId: string | null, person?: Person) => void;
    placeholder?: string;
    className?: string;
    initialPerson?: any;
    activityDate?: string;
}

export function PersonSelector({ value, onChange, placeholder = "Buscar persona...", className, initialPerson, activityDate }: PersonSelectorProps) {
    const { isGod, isParent } = usePermissions();
    const showAgentInfo = isGod || isParent;
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Person[]>([]);
    const [recentPersons, setRecentPersons] = useState<Person[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<Person | any | null>(initialPerson || null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

    const updateDropdownPosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownStyle({ top: rect.bottom + 8, left: rect.left, width: rect.width });
        }
    };

    // Cargar contactos recientes
    useEffect(() => {
        const fetchRecent = async () => {
            const res = await getRecentPersonsAction();
            if (res.success) setRecentPersons(res.data || []);
        };
        fetchRecent();
    }, []);

    // Resolver ID a Persona si viene por prop
    const { data: resolvedPerson, isFetching: isResolving } = useQuery({
        queryKey: ['person', value],
        queryFn: async () => {
            if (!value) return null;
            if (initialPerson && initialPerson.id === value) return initialPerson;
            const res = await getPersonByIdAction(value);
            return res.success && res.data ? res.data : null;
        },
        enabled: !!value && (!selectedPerson || selectedPerson.id !== value) && (!initialPerson || initialPerson.id !== value),
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (initialPerson && initialPerson.id === value) {
            setSelectedPerson(initialPerson);
        } else if (resolvedPerson) {
            setSelectedPerson(resolvedPerson);
        } else if (!value) {
            setSelectedPerson(null);
        }
    }, [resolvedPerson, value, initialPerson]);

    // Actualizar posición del dropdown al abrir y en scroll/resize
    useEffect(() => {
        if (isOpen) {
            updateDropdownPosition();
            window.addEventListener('scroll', updateDropdownPosition, true);
            window.addEventListener('resize', updateDropdownPosition);
            return () => {
                window.removeEventListener('scroll', updateDropdownPosition, true);
                window.removeEventListener('resize', updateDropdownPosition);
            };
        }
    }, [isOpen]);

    // Debounce del search
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Búsqueda cacheada con React Query
    const { data: searchResults, isFetching: isSearching } = useQuery({
        queryKey: ['persons', 'search', debouncedSearch],
        queryFn: async () => {
            if (debouncedSearch.length < 2) return [];
            const res = await searchPersonsAction(debouncedSearch.toLowerCase());
            return res.success ? (res.data || []) : [];
        },
        enabled: debouncedSearch.length >= 2,
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (debouncedSearch.length < 2) {
            setResults([]);
        } else if (searchResults) {
            setResults(searchResults);
        }
    }, [searchResults, debouncedSearch]);

    const loading = isResolving || isSearching;

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

    const portal = typeof window !== 'undefined' ? createPortal(
        <AnimatePresence>
            {isOpen && !selectedPerson && (
                <>
                    {/* Backdrop: cierra el dropdown al hacer click afuera, sin interferir con clicks adentro */}
                    <div
                        className="fixed inset-0"
                        style={{ zIndex: 99998, pointerEvents: 'auto' }}
                        onMouseDown={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.99 }}
                        transition={{ type: 'spring' as const, stiffness: 400, damping: 32 }}
                        style={{
                            position: 'fixed',
                            top: dropdownStyle.top,
                            left: dropdownStyle.left,
                            width: dropdownStyle.width,
                            zIndex: 99999,
                            pointerEvents: 'auto',
                        }}
                        className="bg-[#0d0d10] border border-white/[0.07] rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] overflow-hidden"
                    >
                        {/* Resultados */}
                        <div className="max-h-[240px] overflow-y-auto">
                            {(search.length >= 2 || recentPersons.length > 0) && (
                                <div className="px-4 pt-3 pb-1">
                                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/20 flex items-center gap-1.5">
                                        {search.length >= 2
                                            ? <><Sparkles className="w-2.5 h-2.5 text-violet-400" /> Resultados</>
                                            : <><History className="w-2.5 h-2.5" /> Recientes</>
                                        }
                                    </span>
                                </div>
                            )}

                            <div className="p-2 space-y-0.5">
                                {(search.length < 2 ? recentPersons : results).map((person) => {
                                    const initials = `${(person.first_name || '?')[0]}${(person.last_name || '')[0] || ''}`.toUpperCase();
                                    const subtitle = search.length >= 2
                                        ? (person.phone || person.email || 'Sin datos')
                                        : 'Reciente';
                                    return (
                                        <motion.button
                                            key={person.id}
                                            type="button"
                                            onClick={() => handleSelect(person)}
                                            whileHover={{ x: 2 }}
                                            transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
                                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.04] rounded-xl text-left group transition-colors border border-transparent hover:border-white/[0.05]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600/25 to-fuchsia-600/15 flex items-center justify-center border border-violet-500/20 group-hover:border-violet-500/40 transition-colors flex-shrink-0">
                                                    <span className="text-[10px] font-black text-violet-300 group-hover:text-violet-200">{initials}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors leading-tight">
                                                        {person.first_name} {person.last_name}
                                                    </p>
                                                    <p className="text-[10px] text-white/30 group-hover:text-white/40 transition-colors truncate">
                                                        {subtitle}
                                                        {showAgentInfo && person.agent && (
                                                            <span className="text-violet-400/70 ml-1.5">· {person.agent.first_name}</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-3 h-3 text-white/0 group-hover:text-violet-400 transition-all -translate-x-1 group-hover:translate-x-0 flex-shrink-0" />
                                        </motion.button>
                                    );
                                })}

                                {search.length >= 2 && !loading && results.length === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex items-center gap-3 px-3 py-3"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center flex-shrink-0">
                                            <Search className="w-3.5 h-3.5 text-white/20" />
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-medium text-white/40">Sin coincidencias</p>
                                            <p className="text-[10px] text-white/20">Crealo como nuevo contacto ↓</p>
                                        </div>
                                    </motion.div>
                                )}

                                {search.length < 2 && recentPersons.length === 0 && (
                                    <div className="flex items-center gap-3 px-3 py-3">
                                        <div className="w-8 h-8 rounded-full bg-violet-500/5 border border-violet-500/10 flex items-center justify-center flex-shrink-0">
                                            <Search className="w-3.5 h-3.5 text-violet-400/30" />
                                        </div>
                                        <p className="text-[11px] text-white/30">Escribí el nombre para buscar...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-white/[0.05] mx-3" />

                        <div className="p-2">
                            <motion.button
                                type="button"
                                onClick={() => { setIsOpen(false); setIsDialogOpen(true); }}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-600/15 to-fuchsia-600/10 hover:from-violet-600/25 hover:to-fuchsia-600/20 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-200 group/btn"
                            >
                                <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                                    <Plus className="w-3.5 h-3.5 text-violet-300" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[12px] font-bold text-violet-200 leading-tight">Crear nuevo contacto</p>
                                    <p className="text-[9px] text-violet-400/60 uppercase tracking-wider">Y vincularlo a esta búsqueda</p>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-violet-400/0 group-hover/btn:text-violet-400 transition-all ml-auto -translate-x-1 group-hover/btn:translate-x-0" />
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    ) : null;

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

            {portal}

            <PersonFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                initialData={{
                    firstName: search.split(' ')[0] || '',
                    lastName: search.split(' ').slice(1).join(' ') || ''
                }}
                onSuccess={(person) => handleSelect(person)}
                activityDate={activityDate}
            />
        </div>
    );
}
