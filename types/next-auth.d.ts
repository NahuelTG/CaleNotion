// types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
   /**
    * Extiende el tipo Session para incluir las propiedades personalizadas.
    */
   interface Session {
      accessToken?: string;
      error?: string; // Para errores como RefreshAccessTokenError
      user: {
         id?: string; // Añade el ID del usuario a la sesión
      } & DefaultSession["user"]; // Mantén las propiedades por defecto de user
   }

   /**
    * Extiende el tipo User para incluir el id (si es necesario y no está por defecto).
    * Aunque generalmente, account.providerAccountId es más directo para el ID del proveedor.
    */
   interface User extends DefaultUser {
      // id?: string; // Puedes añadirlo si tu adaptador o proveedor lo devuelve así
   }
}

declare module "next-auth/jwt" {
   /**
    * Extiende el tipo JWT para incluir las propiedades personalizadas.
    */
   interface JWT extends DefaultJWT {
      accessToken?: string;
      refreshToken?: string;
      accessTokenExpires?: number; // Almacenaremos esto como timestamp numérico
      id?: string; // ID del usuario
      error?: string; // Para errores como RefreshAccessTokenError
   }
}
