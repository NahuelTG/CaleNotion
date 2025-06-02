import withPWA from "next-pwa";

import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
   reactStrictMode: true,
   compiler: {
      removeConsole: process.env.NODE_ENV !== "development",
   },
   // Para static export si usas plataformas como GitHub Pages
   // trailingSlash: true,
   // output: 'export',

   // Para sitios con dominio personalizado
   assetPrefix: process.env.NODE_ENV === "production" ? undefined : "",

   // Headers para mejorar PWA en producción
   async headers() {
      return [
         {
            source: "/sw.js",
            headers: [
               {
                  key: "Cache-Control",
                  value: "public, max-age=0, must-revalidate",
               },
               {
                  key: "Service-Worker-Allowed",
                  value: "/",
               },
            ],
         },
         {
            source: "/manifest.json",
            headers: [
               {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
               },
            ],
         },
      ];
   },
};

const PWAConfig = {
   dest: "public",
   // Habilitar solo en producción para deploy
   disable: process.env.NODE_ENV === "development",
   register: true,
   skipWaiting: true,

   // Configuración optimizada para producción
   runtimeCaching: [
      // Cache para páginas HTML
      {
         urlPattern: /^https?.*\.(html|htm)$/,
         handler: "NetworkFirst",
         options: {
            cacheName: "html-cache",
            expiration: {
               maxEntries: 50,
               maxAgeSeconds: 24 * 60 * 60, // 24 horas
            },
         },
      },
      // Cache para API routes
      {
         urlPattern: /^https?.*\/api\/.*/,
         handler: "NetworkFirst",
         options: {
            cacheName: "api-cache",
            expiration: {
               maxEntries: 100,
               maxAgeSeconds: 5 * 60, // 5 minutos
            },
            cacheableResponse: {
               statuses: [0, 200],
            },
         },
      },
      // Cache para recursos estáticos
      {
         urlPattern: /^https?.*\.(js|css|woff|woff2|ttf|otf)$/,
         handler: "CacheFirst",
         options: {
            cacheName: "static-resources",
            expiration: {
               maxEntries: 200,
               maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
            },
         },
      },
      // Cache para imágenes
      {
         urlPattern: /^https?.*\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
         handler: "CacheFirst",
         options: {
            cacheName: "image-cache",
            expiration: {
               maxEntries: 100,
               maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
            },
         },
      },
      // Cache para Google APIs (Calendar)
      {
         urlPattern: /^https:\/\/www\.googleapis\.com\/.*/,
         handler: "NetworkFirst",
         options: {
            cacheName: "google-apis",
            expiration: {
               maxEntries: 50,
               maxAgeSeconds: 5 * 60, // 5 minutos
            },
            cacheableResponse: {
               statuses: [0, 200],
            },
         },
      },
   ],

   buildExcludes: [/middleware-manifest.json$/, /build-manifest.json$/, /_buildManifest.js$/, /_ssgManifest.js$/],

   // Configuración del service worker
   scope: "/",
   sw: "sw.js",

   // Configuración adicional para producción
   publicExcludes: ["!robots.txt", "!sitemap.xml"],

   // Configuración para diferentes plataformas de deploy
   ...(process.env.VERCEL && {
      // Configuración específica para Vercel
      fallbacks: {
         document: "/offline.html", // Opcional: crear página offline
      },
   }),
};

export default withPWA(PWAConfig)(nextConfig);
