import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Rutas protegidas
    const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
    const isAdminRoute = request.nextUrl.pathname.startsWith('/dashboard/admin');
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login');

    // 1. Si no hay usuario y trata de acceder al dashboard
    if (!user && isDashboardRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // 2. Si hay usuario
    if (user) {
        // Redirigir fuera de login si ya está autenticado
        if (isAuthRoute) {
            const url = request.nextUrl.clone();
            url.pathname = '/dashboard';
            return NextResponse.redirect(url);
        }

        // Verificación de ROL para rutas de administración
        if (isAdminRoute) {
            // Intentar obtener rol de los metadatos primero (más rápido)
            let role = user.app_metadata?.role || user.user_metadata?.role;

            // Si no está en metadatos, consultar la base de datos
            if (!role) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                role = profile?.role;
            }

            // Si no es 'god', denegar acceso y redirigir al dashboard general
            if (role !== 'god') {
                const url = request.nextUrl.clone();
                url.pathname = '/dashboard';
                return NextResponse.redirect(url);
            }
        }
    }

    return supabaseResponse;
}
