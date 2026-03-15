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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ShoppingCart, Home, UserPlus } from 'lucide-react';
import { PersonSelector } from '@/features/clients/components/shared/PersonSelector';
import { ClientForm } from '@/features/clients/components/ClientForm';
import { SummaryPreview } from './SummaryPreview';

interface PartiesStepProps {
    form: UseFormReturn<any>;
    watchSides: number;
    watchMySide: 'buyer' | 'seller' | undefined;
    watchBuyerPersonId: string | null | undefined;
    watchSellerPersonId: string | null | undefined;
    isCheckingBuyer: boolean;
    isCheckingSeller: boolean;
    buyerHasSearch: boolean | null;
    sellerHasSearch: boolean | null;
    showBuyerSearchForm: boolean;
    setShowBuyerSearchForm: (show: boolean) => void;
    showSellerSearchForm: boolean;
    setShowSellerSearchForm: (show: boolean) => void;
    // Props for SummaryPreview
    watchPrice: number;
    watchCommissionPercent: number;
    calculations: any;
    watchSplitPercent: number;
    profile: any;
    watchStatus: 'pending' | 'completed' | 'cancelled';
}

export const PartiesStep: React.FC<PartiesStepProps> = ({
    form,
    watchSides,
    watchMySide,
    watchBuyerPersonId,
    watchSellerPersonId,
    isCheckingBuyer,
    isCheckingSeller,
    buyerHasSearch,
    sellerHasSearch,
    showBuyerSearchForm,
    setShowBuyerSearchForm,
    showSellerSearchForm,
    setShowSellerSearchForm,
    watchPrice,
    watchCommissionPercent,
    calculations,
    watchSplitPercent,
    profile,
    watchStatus
}) => {
    return (
        <div className="space-y-4 py-1">
            {/* Toggle "¿Qué lado representás?" — solo visible en 1 punta */}
            {watchSides === 1 && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">¿Qué lado representás?</p>
                    <FormField
                        control={form.control}
                        name="my_side"
                        render={({ field }) => (
                            <FormItem>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => field.onChange('buyer')}
                                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${field.value === 'buyer'
                                            ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }`}
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        Comprador
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => field.onChange('seller')}
                                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${field.value === 'seller'
                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }`}
                                    >
                                        <Home className="w-4 h-4" />
                                        Vendedor
                                    </button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ===== COMPRADOR ===== */}
                {(() => {
                    const isBuyerMySide = watchSides === 2 || watchMySide === 'buyer';
                    const isBuyerRequired = isBuyerMySide;
                    return (
                        <div className="space-y-2">
                            <p className="text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
                                Comprador {isBuyerRequired ? '(CRM) *' : '(Externo) *'}
                            </p>

                            {isBuyerMySide ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="buyer_person_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <PersonSelector
                                                        value={field.value ?? null}
                                                        onChange={(id) => field.onChange(id)}
                                                        placeholder="Buscar comprador en CRM..."
                                                    />
                                                </FormControl>
                                                {isCheckingBuyer && <p className="text-[10px] text-slate-500 animate-pulse">Verificando búsqueda...</p>}
                                                {!isCheckingBuyer && buyerHasSearch === false && watchBuyerPersonId && (
                                                    <Alert variant="destructive" className="mt-2 bg-red-500/10 border-red-500/20 py-2">
                                                        <AlertDescription className="text-[11px] flex items-center justify-between gap-2">
                                                            <span>Este cliente no tiene una búsqueda activa.</span>
                                                            <Button
                                                                type="button"
                                                                variant="link"
                                                                className="h-auto p-0 text-red-400 font-bold"
                                                                onClick={() => setShowBuyerSearchForm(true)}
                                                            >
                                                                Crear Búsqueda
                                                            </Button>
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Dialog open={showBuyerSearchForm} onOpenChange={setShowBuyerSearchForm}>
                                        <DialogContent className="sm:max-w-[700px] bg-slate-800 border-slate-700">
                                            <DialogHeader>
                                                <DialogTitle className="text-white">Crear Búsqueda de Comprador</DialogTitle>
                                                <DialogDescription>
                                                    Completa los datos de la búsqueda para poder cerrar la operación.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <ClientForm
                                                onSuccess={() => {
                                                    setShowBuyerSearchForm(false);
                                                    const currentId = watchBuyerPersonId;
                                                    form.setValue('buyer_person_id', null);
                                                    setTimeout(() => form.setValue('buyer_person_id', currentId), 10);
                                                }}
                                                client={watchBuyerPersonId ? { person_id: watchBuyerPersonId, type: 'buyer' } as any : undefined}
                                                mode="create"
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </>
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="buyer_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Agente / Inmobiliaria representante *"
                                                    className="bg-slate-700/50 border-slate-600 text-white"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-slate-500 text-[10px]">
                                                Ingresá el nombre del colega o inmobiliaria contraparte.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    );
                })()}

                {/* ===== VENDEDOR ===== */}
                {(() => {
                    const isSellerMySide = watchSides === 2 || watchMySide === 'seller';
                    const isSellerRequired = isSellerMySide;
                    return (
                        <div className="space-y-2">
                            <p className="text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <Home className="w-3.5 h-3.5 text-emerald-400" />
                                Vendedor {isSellerRequired ? '(CRM) *' : '(Externo) *'}
                            </p>

                            {isSellerMySide ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="seller_person_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <PersonSelector
                                                        value={field.value ?? null}
                                                        onChange={(id) => field.onChange(id)}
                                                        placeholder="Buscar vendedor en CRM..."
                                                    />
                                                </FormControl>
                                                {isCheckingSeller && <p className="text-[10px] text-slate-500 animate-pulse">Verificando propiedad...</p>}
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Dialog open={showSellerSearchForm} onOpenChange={setShowSellerSearchForm}>
                                        <DialogContent className="sm:max-w-[700px] bg-slate-800 border-slate-700">
                                            <DialogHeader>
                                                <DialogTitle className="text-white">Crear Cliente (Vendedor)</DialogTitle>
                                                <DialogDescription>
                                                    Completa los datos del cliente para poder cerrar la operación.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <ClientForm
                                                onSuccess={() => {
                                                    setShowSellerSearchForm(false);
                                                    const currentId = watchSellerPersonId;
                                                    form.setValue('seller_person_id', null);
                                                    setTimeout(() => form.setValue('seller_person_id', currentId), 10);
                                                }}
                                                client={watchSellerPersonId ? { person_id: watchSellerPersonId, type: 'seller' } as any : undefined}
                                                mode="create"
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </>
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="seller_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Agente / Inmobiliaria representante *"
                                                    className="bg-slate-700/50 border-slate-600 text-white"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-slate-500 text-[10px]">
                                                Ingresá el nombre del colega o inmobiliaria contraparte.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Fecha */}
            <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-200">Fecha de Operación *</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                type="date"
                                className="bg-slate-700/50 border-slate-600 text-white"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Notas */}
            <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-200">Notas (opcional)</FormLabel>
                        <FormControl>
                            <Textarea
                                {...field}
                                placeholder="Detalles adicionales..."
                                className="bg-slate-700/50 border-slate-600 text-white resize-none"
                                rows={2}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {/* Motivo de Cancelación (solo si status es cancelled) */}
            {watchStatus === 'cancelled' && (
                <FormField
                    control={form.control}
                    name="cancellation_reason"
                    render={({ field }) => (
                        <FormItem className="animate-in slide-in-from-top-2 duration-300">
                            <FormLabel className="text-red-400">Motivo de la Caída *</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    placeholder="Indica por qué se cayó la operación..."
                                    className="bg-red-500/5 border-red-500/20 text-white resize-none"
                                    rows={3}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {/* Preview Card */}
            <SummaryPreview 
                watchPrice={watchPrice}
                watchCommissionPercent={watchCommissionPercent}
                watchSides={watchSides}
                calculations={calculations}
                watchSplitPercent={watchSplitPercent}
                profile={profile}
            />
        </div>
    );
};
