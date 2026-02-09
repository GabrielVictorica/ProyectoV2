'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';

interface FinanceChartsProps {
    summaryData: {
        name: string;
        totalDebt: number;
        status: string;
    }[];
}

export function FinanceCharts({ summaryData }: FinanceChartsProps) {
    // Preparar datos para el gráfico de barras (TOP 5 Inmobiliarias con Deuda)
    const barData = [...summaryData]
        .sort((a, b) => b.totalDebt - a.totalDebt)
        .slice(0, 5)
        .map(item => ({
            name: item.name,
            total: item.totalDebt,
        }));

    // Preparar datos para el gráfico de torta (Distribución por Estado)
    const statusCounts = summaryData.reduce((acc: any, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {});

    const pieData = Object.keys(statusCounts).map(status => ({
        name: status === 'active' ? 'Al día' : status === 'suspended' ? 'Suspendidas' : 'En Mora',
        value: statusCounts[status],
    }));

    const COLORS = ['#10b981', '#f43f5e', '#f59e0b'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass border-white/5 bg-white/[0.02]">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold text-white tracking-tight">Top 5 Deudas por Oficina</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Oficinas con mayor saldo pendiente actual</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 0, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                interval={0}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                tickFormatter={(value) => `$${value / 1000}k`}
                            />
                            <Tooltip
                                cursor={{ fill: '#ffffff05' }}
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }}
                                formatter={(value: number) => [formatCurrency(value), 'Deuda']}
                            />
                            <Bar
                                dataKey="total"
                                fill="#8b5cf6"
                                radius={[4, 4, 0, 0]}
                                barSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="glass border-white/5 bg-white/[0.02]">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold text-white tracking-tight">Estado de la Red</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Distribución comercial de inmobiliarias</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2 ml-4">
                        {pieData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{entry.name}: {entry.value}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
