// lib/auth/options.ts
import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { google } from "googleapis";

async function refreshAccessToken(token: any) {
   const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
   );

   oauth2Client.setCredentials({ refresh_token: token.refreshToken });

   try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      return {
         ...token,
         accessToken: credentials.access_token,
         accessTokenExpires: credentials.expiry_date,
         refreshToken: credentials.refresh_token ?? token.refreshToken,
      };
   } catch (error) {
      console.error("Error refreshing access token", error);
      return { ...token, error: "RefreshAccessTokenError" };
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
               access_type: "offline",
               response_type: "code",
               scope: [
                  "openid",
                  "email",
                  "profile",
                  "https://www.googleapis.com/auth/calendar.events",
                  "https://www.googleapis.com/auth/calendar.readonly",
               ].join(" "),
            },
         },
      }),
   ],
   session: { strategy: "jwt" },
   callbacks: {
      async jwt({ token, user, account }) {
         if (account && user) {
            token.accessToken = account.access_token;
            token.refreshToken = account.refresh_token;
            token.accessTokenExpires = account.expires_at! * 1000;
            token.id = user.id;
            return token;
         }
         if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) return token;
         if (token.refreshToken) return refreshAccessToken(token);
         return { ...token, error: "NoRefreshTokenOrRefreshFailed" };
      },
      async session({ session, token }) {
         session.accessToken = token.accessToken as string;
         session.error = token.error as string | undefined;
         session.user.id = token.id as string;
         return session;
      },
   },
   secret: process.env.NEXTAUTH_SECRET,
};
