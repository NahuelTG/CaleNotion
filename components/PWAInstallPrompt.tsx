"use client";

import { useEffect, useState } from "react";

export default function PWAInstallPrompt() {
   const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
   const [visible, setVisible] = useState(false);

   useEffect(() => {
      const handler = (e: any) => {
         e.preventDefault();
         setDeferredPrompt(e);
         setVisible(true);
         console.log("✅ beforeinstallprompt listo");
      };

      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
   }, []);

   const handleInstall = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      console.log("Resultado instalación:", result);
      setDeferredPrompt(null);
      setVisible(false);
   };

   return visible ? (
      <button onClick={handleInstall} className="fixed bottom-4 right-4 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-md z-50">
         Instalar App
      </button>
   ) : null;
}
