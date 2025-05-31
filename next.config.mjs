import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
   reactStrictMode: true,
   compiler: {
      removeConsole: process.env.NODE_ENV !== "development",
   },
   // Asegurar que los archivos estáticos se sirvan correctamente
   assetPrefix: process.env.NODE_ENV === "production" ? undefined : "",
};

export default withPWA({
   dest: "public",
   disable: process.env.NEXT_PUBLIC_DISABLE_PWA === "true",
   register: true, // register the PWA service worker
   register: true,
   skipWaiting: true,
   // Configuraciones adicionales para mejor funcionalidad
   runtimeCaching: [
      {
         urlPattern: /^https?.*/,
         handler: "NetworkFirst",
         options: {
            cacheName: "offlineCache",
            expiration: {
               maxEntries: 200,
            },
         },
      },
   ],
   buildExcludes: [/middleware-manifest.json$/],
   scope: "/",
   sw: "sw.js",
})(nextConfig);
