// app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { google } from "googleapis";

// Helper para refrescar el token de acceso
async function refreshAccessToken(token: any) {
   try {
      const oauth2Client = new google.auth.OAuth2(
         process.env.GOOGLE_CLIENT_ID,
         process.env.GOOGLE_CLIENT_SECRET,
         `${process.env.NEXTAUTH_URL}/api/auth/callback/google` // Asegúrate que coincida con tu consola de Google
      );

      oauth2Client.setCredentials({
         refresh_token: token.refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      return {
         ...token,
         accessToken: credentials.access_token,
         accessTokenExpires: credentials.expiry_date, // expiry_date está en ms
         refreshToken: credentials.refresh_token ?? token.refreshToken, // Google puede o no enviar un nuevo refresh token
      };
   } catch (error) {
      console.error("Error refreshing access token", error);
      return {
         ...token,
         error: "RefreshAccessTokenError",
      };
   }
}

export const authOptions: AuthOptions = {
   providers: [
      GoogleProvider({
         clientId: process.env.GOOGLE_CLIENT_ID!,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
         authorization: {
            params: {
               prompt: "consent",
               access_type: "offline", // Crucial para obtener refresh_token
               response_type: "code",
               scope: [
                  "openid",
                  "email",
                  "profile",
                  "https://www.googleapis.com/auth/calendar.events", // Para crear/modificar eventos
                  "https://www.googleapis.com/auth/calendar.readonly", // Para leer calendarios y eventos
               ].join(" "),
            },
         },
      }),
   ],
   session: {
      strategy: "jwt", // Usar JWT para sesiones
   },
   callbacks: {
      async jwt({ token, user, account }) {
         // Inicio de sesión inicial
         if (account && user) {
            token.accessToken = account.access_token;
            token.refreshToken = account.refresh_token;
            token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined; // expires_at es en segundos UNIX
            token.id = user.id; // o account.providerAccountId
            return token;
         }

         // Si el token de acceso no ha expirado, devuélvelo
         if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
            return token;
         }

         // Si el token de acceso ha expirado, intenta refrescarlo
         if (token.refreshToken) {
            return refreshAccessToken(token);
         }

         // Si no hay refresh token o el refresh falló, devuelve el token con error
         return { ...token, error: "NoRefreshTokenOrRefreshFailed" };
      },
      async session({ session, token }) {
         session.accessToken = token.accessToken as string;
         session.error = token.error as string | undefined; // Para pasar errores al cliente
         session.user.id = token.id as string; // Añadir ID del usuario a la sesión
         // Puedes añadir más datos si es necesario:
         // session.refreshToken = token.refreshToken as string; // Considera la seguridad
         return session;
      },
   },
   secret: process.env.NEXTAUTH_SECRET,
   pages: {
      // signIn: '/auth/signin', // Página de inicio de sesión personalizada (opcional)
      // error: '/auth/error', // Página de error de autenticación personalizada (opcional)
   },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
