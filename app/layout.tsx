import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
   title: "Planificador de Tareas",
   description: "Organiza tus tareas y sincronízalas con Google Calendar",
   manifest: "/manifest.json",
   generator: "v0.dev",
};

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html lang="es" className="light" style={{ colorScheme: "light" }}>
         <head>
            <meta name="theme-color" content="#4f46e5" />
            <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
         </head>
         <body className={inter.className}>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
               <Providers>{children}</Providers>
               <Toaster />
            </ThemeProvider>
         </body>
      </html>
   );
}
