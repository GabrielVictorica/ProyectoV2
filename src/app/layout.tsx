import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/react-query/provider";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EntreInmobiliarios | Gestión Inmobiliaria",
  description: "Sistema de gestión inmobiliaria multi-agencia para Argentina",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#030712]`}>
        <AuroraBackground />
        <QueryProvider>
          <div className="relative z-10">
            {children}
          </div>
          <Toaster position="top-right" richColors theme="dark" />
        </QueryProvider>
      </body>
    </html>
  );
}
