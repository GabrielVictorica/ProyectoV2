'use client';

export default function Loading() {
    return (
        <div className="w-full h-full animate-in fade-in duration-500">
            <div className="flex flex-col gap-8">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
                        <div className="h-4 w-64 bg-white/5 rounded-lg animate-pulse" />
                    </div>
                    <div className="h-10 w-32 bg-white/5 rounded-lg animate-pulse" />
                </div>

                {/* Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 bg-white/5 rounded-2xl border border-white/10 animate-pulse" />
                    ))}
                </div>

                {/* Big Content Skeleton */}
                <div className="h-64 w-full bg-white/5 rounded-2xl border border-white/10 animate-pulse" />
            </div>
        </div>
    );
}
