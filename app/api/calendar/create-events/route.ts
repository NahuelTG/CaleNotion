// app/api/google-calendar/list-calendars/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Verifica esta ruta
import { google } from "googleapis";

export async function GET() {
   console.log("API_LIST_CALENDARS: Endpoint invocado."); // LOG 1
   const session = await getServerSession(authOptions);

   // LOG 2: Inspecciona la sesión completa
   console.log("API_LIST_CALENDARS: Sesión obtenida:", JSON.stringify(session, null, 2));

   if (!session) {
      console.error("API_LIST_CALENDARS: No hay sesión.");
      return NextResponse.json({ message: "No autorizado: Sesión no encontrada." }, { status: 401 });
   }
   if (!session.accessToken) {
      console.error("API_LIST_CALENDARS: No hay accessToken en la sesión.");
      return NextResponse.json({ message: "No autorizado: Token de acceso faltante." }, { status: 401 });
   }
   if (session.error) {
      console.error(`API_LIST_CALENDARS: Error de sesión de NextAuth: ${session.error}`);
      return NextResponse.json(
         { message: `Error de sesión: ${session.error}. Reintenta iniciar sesión.`, errorType: "AuthError" },
         { status: 401 }
      );
   }

   try {
      console.log("API_LIST_CALENDARS: Intentando usar accessToken:", session.accessToken.substring(0, 20) + "..."); // Muestra una parte del token
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: session.accessToken });

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      console.log("API_LIST_CALENDARS: Llamando a Google API (calendarList.list)...");
      const response = await calendar.calendarList.list({ minAccessRole: "writer" });
      console.log("API_LIST_CALENDARS: Respuesta de Google API recibida.");

      const calendars =
         response.data.items?.map((cal) => ({
            id: cal.id!,
            summary: cal.summaryOverride || cal.summary!,
            backgroundColor: cal.backgroundColor!,
            primary: cal.primary || false,
         })) || [];

      console.log("API_LIST_CALENDARS: Calendarios procesados:", calendars.length);
      return NextResponse.json({ calendars }, { status: 200 });
   } catch (error: any) {
      console.error("API_LIST_CALENDARS: Error en el bloque try/catch:", error.message);
      if (error.response && error.response.data) {
         console.error("API_LIST_CALENDARS: Detalles del error de Google (data):", JSON.stringify(error.response.data, null, 2));
      }
      if (error.errors) {
         console.error("API_LIST_CALENDARS: Detalles del error de Google (errors array):", JSON.stringify(error.errors, null, 2));
      }
      if (error.code) {
         console.error("API_LIST_CALENDARS: Código de error de Google:", error.code);
      }

      if (error.code === 401 || (error.response && error.response.status === 401)) {
         console.error("API_LIST_CALENDARS: Error 401 de Google, posiblemente token inválido/expirado.");
         return NextResponse.json(
            { message: "Token de Google inválido o expirado. Intenta re-autenticar.", errorType: "GoogleAuthError" },
            { status: 401 }
         );
      }
      return NextResponse.json(
         { message: "Error al obtener la lista de calendarios.", details: error.message || String(error) },
         { status: 500 }
      );
   }
}
