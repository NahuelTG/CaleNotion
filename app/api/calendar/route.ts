// app/api/google-calendar/list-calendars/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/options";
import { google } from "googleapis";

export async function GET() {
   console.log("API Route /api/calendar HIT!"); // <-- Añade este log

   const session = await getServerSession(authOptions);
   const accessToken = session?.accessToken || (session as any)?.token?.accessToken;

   console.log("Session in /api/calendar:", JSON.stringify(session, null, 2));
   console.log("Access Token in /api/calendar:", accessToken);

   if (!session || !session.accessToken) {
      return NextResponse.json({ message: "No autorizado." }, { status: 401 });
   }

   try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: session.accessToken });

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const response = await calendar.calendarList.list({ minAccessRole: "writer" }); // Solo calendarios donde se puede escribir

      const calendars =
         response.data.items?.map((cal) => ({
            id: cal.id!,
            name: cal.summary!,
            color: cal.backgroundColor, // Google API lo llama backgroundColor
            primary: cal.primary || false,
            accessRole: cal.accessRole,
         })) || [];
      console.log("Calendars fetched for /api/calendar:", calendars.length);
      return NextResponse.json({ calendars }, { status: 200 });
   } catch (error: any) {
      console.error("Error fetching calendar list:", error.response?.data || error.message);
      // Manejar errores específicos, ej. token expirado
      if (error.code === 401 || session.error === "RefreshAccessTokenError" || session.error === "NoRefreshTokenOrRefreshFailed") {
         return NextResponse.json(
            { message: "Token inválido o sesión expirada. Por favor, re-autentica.", errorType: "AuthError" },
            { status: 401 }
         );
      }
      return NextResponse.json({ message: "Error al obtener la lista de calendarios.", details: error.message }, { status: 500 });
   }
}
