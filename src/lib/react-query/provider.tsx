'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Con SSR, usualmente queremos un staleTime por defecto mayor a 0
                        // para evitar re-fetching inmediato en el cliente
                        staleTime: 60 * 1000, // 1 minuto
                        gcTime: 5 * 60 * 1000, // 5 minutos (garbage collection)
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
