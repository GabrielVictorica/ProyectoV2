import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface SummaryPreviewProps {
    watchPrice: number;
    watchCommissionPercent: number;
    watchSides: number;
    calculations: any;
    watchSplitPercent: number;
    profile: any;
}

export const SummaryPreview: React.FC<SummaryPreviewProps> = ({
    watchPrice,
    watchCommissionPercent,
    watchSides,
    calculations,
    watchSplitPercent,
    profile
}) => {
    if (watchPrice <= 0) return null;

    return (
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
            <CardHeader className="pb-2">
                <CardTitle className="text-green-400 text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Reparto de Comisiones (Cascada)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-green-500/20 pb-2">
                    <span className="text-slate-400">Comisión Bruta ({watchCommissionPercent}% x {watchSides})</span>
                    <span className="text-white font-semibold">
                        {formatCurrency(calculations.grossCommission)}
                    </span>
                </div>

                {/* Mostrar Royalty (Dios) solo si no es agente o si queremos transparencia total */}
                {profile?.role !== 'child' && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-red-400/80">Fee de Red (Dios) ({calculations.royaltyPercent}%)</span>
                        <span className="text-red-400/80">
                            - {formatCurrency(calculations.masterAmount)}
                        </span>
                    </div>
                )}

                <div className="flex justify-between items-center text-sm pt-2 border-t border-green-500/20">
                    <span className="text-green-400 font-medium">Tu Comisión ({watchSplitPercent}%)</span>
                    <span className="text-green-400 font-bold">
                        {formatCurrency(calculations.agentAmount)}
                    </span>
                </div>

                {/* Mostrar Neto Oficina solo si no es agente */}
                {profile?.role !== 'child' && (
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-700/50">
                        <span className="text-blue-400 font-medium">Neto Oficina</span>
                        <span className="text-blue-400 font-semibold">
                            {formatCurrency(calculations.officeAmount)}
                        </span>
                    </div>
                )}
            </CardContent>
            {watchSides === 2 && (
                <div className="px-6 pb-4">
                    <span className="text-purple-400 text-xs font-medium bg-purple-500/20 px-2 py-1 rounded">
                        ⭐ Operación de 2 puntas
                    </span>
                </div>
            )}
        </Card>
    );
};
