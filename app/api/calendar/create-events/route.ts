// app/api/calendar/create-events/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { google, calendar_v3 } from "googleapis"; // Importa el tipo específico si es necesario
import { EventToCreate } from "../../../../interfaces/tasks.interface";

export async function POST(request: NextRequest) {
   console.log("API_CREATE_EVENTS: Endpoint POST invocado.");
   const session = await getServerSession(authOptions);

   if (!session) {
      console.error("API_CREATE_EVENTS: No hay sesión.");
      return NextResponse.json({ message: "No autorizado: Sesión no encontrada.", results: [], createdCount: 0 }, { status: 401 });
   }
   if (!session.accessToken) {
      console.error("API_CREATE_EVENTS: No hay accessToken en la sesión.");
      return NextResponse.json({ message: "No autorizado: Token de acceso faltante.", results: [], createdCount: 0 }, { status: 401 });
   }
   if (session.error) {
      console.error(`API_CREATE_EVENTS: Error de sesión de NextAuth: ${session.error}`);
      return NextResponse.json(
         { message: `Error de sesión: ${session.error}. Reintenta iniciar sesión.`, errorType: "AuthError", results: [], createdCount: 0 },
         { status: 401 }
      );
   }

   let requestBody;
   try {
      requestBody = await request.json();
   } catch (e) {
      console.error("API_CREATE_EVENTS: Error al parsear el cuerpo de la solicitud JSON:", e);
      return NextResponse.json({ message: "Cuerpo de solicitud JSON inválido.", results: [], createdCount: 0 }, { status: 400 });
   }

   const { events } = requestBody as { events: EventToCreate[] };

   if (!events || !Array.isArray(events) || events.length === 0) {
      console.log("API_CREATE_EVENTS: No se proporcionaron eventos para crear.");
      return NextResponse.json({ message: "No se proporcionaron eventos para crear.", results: [], createdCount: 0 }, { status: 400 });
   }

   const oauth2Client = new google.auth.OAuth2();
   oauth2Client.setCredentials({ access_token: session.accessToken });
   const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });

   const results: Array<{ localId: string; success: boolean; eventId?: string; error?: string; summary?: string }> = [];
   let createdCount = 0;

   console.log(`API_CREATE_EVENTS: Procesando ${events.length} eventos para crear.`);

   // Procesar eventos uno por uno o en batch si la API de Google lo permite mejor.
   // Para simplicidad, uno por uno con manejo individual de errores.
   for (const eventData of events) {
      try {
         const eventResource: calendar_v3.Schema$Event = {
            summary: eventData.summary,
            description: eventData.description,
            start: eventData.start,
            end: eventData.end,
            // Aquí puedes añadir más propiedades del evento si es necesario
            // como recordatorios (reminders), invitados (attendees), etc.
         };

         console.log(`API_CREATE_EVENTS: Creando evento "${eventData.summary}" en calendario "${eventData.calendarId}"`);
         const response = await calendarApi.events.insert({
            calendarId: eventData.calendarId, // ID del calendario donde se creará el evento
            requestBody: eventResource,
         });

         if (response.data && response.data.id) {
            console.log(`API_CREATE_EVENTS: Evento "${eventData.summary}" creado con ID: ${response.data.id}`);
            results.push({
               localId: eventData.localId,
               success: true,
               eventId: response.data.id,
               summary: eventData.summary,
            });
            createdCount++;
         } else {
            // Esto no debería suceder si la API de Google devuelve un 200 sin error
            console.warn(`API_CREATE_EVENTS: Evento "${eventData.summary}" podría no haberse creado (respuesta inesperada de Google).`);
            results.push({
               localId: eventData.localId,
               success: false,
               error: "Respuesta inesperada de Google API al crear evento.",
               summary: eventData.summary,
            });
         }
      } catch (error: any) {
         console.error(`API_CREATE_EVENTS: Error al crear evento "${eventData.summary}":`, error.message);
         let errorMessage = error.message || "Error desconocido de Google API";
         if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
            errorMessage = error.response.data.error.message;
            console.error("API_CREATE_EVENTS: Detalles del error de Google:", JSON.stringify(error.response.data.error, null, 2));
         }
         if (error.errors) {
            // Errores de validación de googleapis
            console.error("API_CREATE_EVENTS: Errores de googleapis:", JSON.stringify(error.errors, null, 2));
            errorMessage = error.errors.map((e: any) => e.message).join(", ");
         }

         results.push({
            localId: eventData.localId,
            success: false,
            error: errorMessage,
            summary: eventData.summary,
         });

         // Si el error es de autenticación, podríamos querer detenernos o manejarlo globalmente.
         if (error.code === 401 || (error.response && error.response.status === 401)) {
            console.error("API_CREATE_EVENTS: Error de autenticación 401 con Google al crear un evento. El token puede haber expirado.");
            // Devolver los resultados parciales y un mensaje de error de autenticación global
            return NextResponse.json(
               {
                  message:
                     "Token de Google inválido o expirado durante la creación de eventos. Algunos eventos pueden no haberse creado. Intenta re-autenticar.",
                  errorType: "GoogleAuthError",
                  createdCount,
                  results,
               },
               { status: 207 } // Multi-Status, ya que algunos pueden haber tenido éxito
            );
         }
      }
   }

   console.log(`API_CREATE_EVENTS: Proceso completado. Creados: ${createdCount}/${events.length}`);
   // Si todos los eventos (o algunos) se procesaron, devuelve 207 Multi-Status
   // Si todos fueron exitosos, podrías devolver 201 Created, pero 207 es más general para operaciones batch.
   const overallStatus = results.every((r) => r.success) ? 201 : 207;

   return NextResponse.json(
      {
         message: `Procesados ${events.length} eventos. Creados exitosamente: ${createdCount}.`,
         createdCount,
         results,
      },
      { status: overallStatus }
   );
}
