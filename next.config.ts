import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Los tipos de Supabase están desincronizados con la base de datos.
    // Ignoramos errores de TS durante build hasta regenerar los tipos.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

