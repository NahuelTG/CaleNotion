// app/api/google-calendar/create-events/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajusta la ruta
import { google, calendar_v3 } from "googleapis";

interface EventInput {
   localId: string; // Para mapear de vuelta al frontend
   summary: string;
   description?: string;
   start: { dateTime: string; timeZone: string };
   end: { dateTime: string; timeZone: string };
   calendarId: string; // Ej: 'primary' o un ID específico
   // googleEventId?: string; // Para actualizar, no para crear nuevo
}

export async function POST(request: Request) {
   const session = await getServerSession(authOptions);

   if (!session || !session.accessToken) {
      return NextResponse.json({ message: "No autorizado." }, { status: 401 });
   }
   if (session.error) {
      // Si hubo error al refrescar token en el JWT callback
      return NextResponse.json(
         { message: `Error de sesión: ${session.error}. Reintenta iniciar sesión.`, errorType: "AuthError" },
         { status: 401 }
      );
   }

   try {
      const { events: eventsToCreate } = (await request.json()) as { events: EventInput[] };

      if (!eventsToCreate || !Array.isArray(eventsToCreate) || eventsToCreate.length === 0) {
         return NextResponse.json({ message: "No se proporcionaron eventos." }, { status: 400 });
      }

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: session.accessToken });
      const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });

      const results = [];
      let createdCount = 0;

      for (const eventData of eventsToCreate) {
         const eventPayload: calendar_v3.Schema$Event = {
            summary: eventData.summary,
            description: eventData.description,
            start: eventData.start,
            end: eventData.end,
            // Podrías añadir más aquí: attendees, reminders, etc.
         };

         try {
            const response = await calendarApi.events.insert({
               calendarId: eventData.calendarId,
               requestBody: eventPayload,
            });
            results.push({ localId: eventData.localId, success: true, eventId: response.data.id, summary: eventData.summary });
            createdCount++;
         } catch (error: any) {
            console.error(
               `Error creando evento "${eventData.summary}" en cal "${eventData.calendarId}":`,
               error.response?.data?.error || error.message
            );
            results.push({
               localId: eventData.localId,
               success: false,
               summary: eventData.summary,
               error: error.response?.data?.error?.message || error.message,
               status: error.response?.status,
            });
         }
      }

      return NextResponse.json(
         {
            message: `${createdCount} de ${eventsToCreate.length} eventos procesados.`,
            createdCount,
            totalAttempted: eventsToCreate.length,
            results,
         },
         { status: results.every((r) => r.success) ? 201 : 207 }
      ); // 201 si todo OK, 207 (Multi-Status) si hubo mezcla
   } catch (error: any) {
      console.error("Error en API create-events:", error);
      return NextResponse.json({ message: "Error interno del servidor.", details: error.message }, { status: 500 });
   }
}
