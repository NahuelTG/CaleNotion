// components/google-auth-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast"; // Ajusta la ruta si es necesario

export function GoogleAuthButton() {
   const { data: session, status } = useSession();
   const [isProcessing, setIsProcessing] = useState(false);
   const { toast } = useToast();

   const handleAuth = async () => {
      setIsProcessing(true);
      try {
         if (session) {
            await signOut({ redirect: false }); // redirect: false para manejar UI sin recarga completa
            toast({ title: "Sesión Cerrada", description: "Has cerrado sesión." });
         } else {
            await signIn("google"); // Esto redirigirá a la página de inicio de sesión de Google
            // next-auth gestionará la redirección de vuelta. El toast de bienvenida
            // podría hacerse en TaskManager o donde se consuma la sesión.
         }
      } catch (error) {
         console.error("Error de autenticación:", error);
         toast({ title: "Error", description: "Ocurrió un problema durante la autenticación.", variant: "destructive" });
      } finally {
         setIsProcessing(false);
      }
   };

   // El estado de isAuthenticated se deriva directamente de 'status'
   const isAuthenticated = status === "authenticated";

   if (status === "loading" && !isProcessing) {
      // Evita 'Cargando sesión...' si ya está 'Procesando...'
      return (
         <Button variant="outline" size="sm" disabled>
            Cargando sesión...
         </Button>
      );
   }

   return (
      <Button
         variant={isAuthenticated ? "outline" : "default"}
         size="sm"
         onClick={handleAuth}
         disabled={isProcessing || status === "loading"}
      >
         {isProcessing ? (
            <span className="flex items-center">
               <svg /* tu SVG de carga */ className="animate-spin -ml-1 mr-2 h-4 w-4" /* ... */></svg>
               Procesando...
            </span>
         ) : isAuthenticated ? (
            <>
               <LogOut className="h-4 w-4 mr-2" />
               Cerrar sesión
            </>
         ) : (
            <>
               <LogIn className="h-4 w-4 mr-2" />
               Iniciar con Google
            </>
         )}
      </Button>
   );
}
