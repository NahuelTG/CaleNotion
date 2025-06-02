import React from "react";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import Providers from "./providers";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
   title: "Calendars Notion",
   description: "Organiza tus tareas y sincronízalas con Google Calendar",
   manifest: "/manifest.json",
   appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "CaleNotion",
   },
   formatDetection: {
      telephone: false,
   },
   themeColor: "#ffffff",
   viewport: {
      width: "device-width",
      initialScale: 1,
      maximumScale: 1,
   },
};

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html lang="es" className="light" style={{ colorScheme: "light" }}>
         <head>
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#ffffff" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content="CaleNotion" />
            <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
         </head>
         <body className={inter.className}>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
               <Providers>{children}</Providers>
               <Toaster />
            </ThemeProvider>
            <PWAInstallPrompt />
         </body>
      </html>
   );
}
