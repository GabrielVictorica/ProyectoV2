'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollableFormAreaProps {
    children: React.ReactNode;
    className?: string;
    /** Reset scroll position when this key changes (e.g. form step or active tab) */
    resetKey?: string | number;
}

export function ScrollableFormArea({ children, className, resetKey }: ScrollableFormAreaProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const threshold = 20;
        setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > threshold);
    }, []);

    // Attach scroll listener
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        el.addEventListener('scroll', checkScroll, { passive: true });

        // Initial check + delayed recheck after content renders
        checkScroll();
        const timer = setTimeout(checkScroll, 300);

        const observer = new ResizeObserver(() => checkScroll());
        observer.observe(el);

        return () => {
            el.removeEventListener('scroll', checkScroll);
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [checkScroll, resetKey]);

    // Reset scroll position on key change
    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            el.scrollTop = 0;
            setTimeout(checkScroll, 200);
        }
    }, [resetKey, checkScroll]);

    return (
        <div className="relative">
            <div
                ref={scrollRef}
                className={cn('relative overflow-auto w-full elegant-scrollbar pr-4', className)}
            >
                {children}
            </div>

            {/* Scroll-down indicator */}
            <div
                className={cn(
                    'absolute bottom-0 left-0 right-0 pointer-events-none transition-all duration-300',
                    canScrollDown ? 'opacity-100' : 'opacity-0'
                )}
            >
                <div className="h-14 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                            const el = scrollRef.current;
                            if (el) el.scrollBy({ top: 200, behavior: 'smooth' });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600/90 backdrop-blur-sm border border-violet-500/30 text-[10px] font-bold text-white uppercase tracking-wider animate-bounce hover:bg-violet-500 transition-colors shadow-lg shadow-violet-900/50"
                    >
                        <ChevronDown className="w-3 h-3" />
                        Más campos
                    </button>
                </div>
            </div>
        </div>
    );
}
