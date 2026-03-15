import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DollarSign, Percent, Users, TrendingUp } from 'lucide-react';

interface FinancialsStepProps {
    form: UseFormReturn<any>;
}

export const FinancialsStep: React.FC<FinancialsStepProps> = ({ form }) => {
    return (
        <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="actual_price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-200 flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Precio de Venta (USD) *
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="number"
                                    step="1"
                                    placeholder="150000"
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="sides"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-200 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Puntas *
                            </FormLabel>
                            <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                defaultValue={String(field.value)}
                            >
                                <FormControl>
                                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="1" className="text-white hover:bg-slate-700">
                                        1 Punta - Solo comprador o vendedor
                                    </SelectItem>
                                    <SelectItem value="2" className="text-white hover:bg-slate-700">
                                        2 Puntas - Ambos lados
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="commission_percentage"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-200 flex items-center gap-2">
                                <Percent className="h-4 w-4" />
                                Comisión (%) *
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    readOnly
                                    className="bg-slate-700/50 border-slate-600 text-slate-400 cursor-not-allowed"
                                />
                            </FormControl>
                            <FormDescription className="text-slate-500 text-[10px]">
                                Fijo al 3% según política.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="agent_split_percentage"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-200 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Tu Split (%) *
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    readOnly
                                    className="bg-slate-700/50 border-slate-600 text-slate-400 cursor-not-allowed"
                                />
                            </FormControl>
                            <FormDescription className="text-slate-500 text-[10px]">
                                Definido en tu perfil de usuario.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
};
