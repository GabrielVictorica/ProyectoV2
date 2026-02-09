import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="space-y-2">
                <Skeleton className="h-10 w-64 bg-slate-700/50" />
                <Skeleton className="h-4 w-96 bg-slate-700/50" />
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-24 bg-slate-700/50" />
                                <Skeleton className="h-8 w-8 rounded-lg bg-slate-700/50" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-32 bg-slate-700/50 mb-2" />
                            <Skeleton className="h-3 w-40 bg-slate-700/50" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <Skeleton className="h-6 w-48 bg-slate-700/50" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full bg-slate-700/50 rounded-lg" />
                        ))}
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <Skeleton className="h-6 w-32 bg-slate-700/50" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-48 w-full bg-slate-700/50 rounded-lg" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
