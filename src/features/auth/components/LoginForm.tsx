'use client';

import { useState } from 'react';
import { useLogin } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2 } from 'lucide-react';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { mutate: login, isPending, error } = useLogin();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login({ email, password });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                            <Building2 className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">
                        EntreInmobiliarios
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Sistema de Gestión Inmobiliaria
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive" className="bg-red-900/50 border-red-800">
                                <AlertDescription>
                                    {error.message === 'Invalid login credentials'
                                        ? 'Credenciales inválidas. Verifica tu email y contraseña.'
                                        : error.message}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-200">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-200">
                                Contraseña
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Iniciando sesión...
                                </>
                            ) : (
                                'Iniciar sesión'
                            )}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-400">
                        ¿No tienes cuenta? Contacta al administrador.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
