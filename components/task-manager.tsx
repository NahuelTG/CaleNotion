"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; // << IMPORTANTE
import { Calendar as CalendarIconLucide } from "lucide-react"; // Renombrar para evitar conflicto
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { TaskForm } from "@/components/task-form";
import { TaskList } from "@/components/task-list";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { BulkTaskImport } from "@/components/bulk-task-import";
import { useToast } from "@/hooks/use-toast";

export type Task = {
   // ... (tu tipo Task existente, considera añadir googleEventId)
   id: string;
   title: string;
   description?: string;
   duration: number;
   breakAfter: number;
   date: string;
   startTime: string;
   synced?: boolean;
   calendarId?: string;
   googleEventId?: string; // Para almacenar el ID del evento de Google
};

export function TaskManager() {
   const { data: session, status } = useSession(); // << OBTENER SESIÓN
   const [tasks, setTasks] = useState<Task[]>([]);
   const [defaultBreakTime, setDefaultBreakTime] = useState(15);
   const { toast } = useToast();
   const [isSyncing, setIsSyncing] = useState(false);

   // Derivar isAuthenticated de la sesión
   const isAuthenticated = status === "authenticated";

   // Efecto para mostrar toast de bienvenida o error de sesión
   useEffect(() => {
      if (status === "authenticated" && session?.user) {
         // Evitar toasts repetidos si el componente se re-renderiza mucho
         // Podrías usar una bandera de "bienvenida mostrada" si es necesario
      } else if (status === "unauthenticated" && session?.error === "RefreshAccessTokenError") {
         toast({
            title: "Sesión Expirada",
            description: "Por favor, inicia sesión de nuevo para continuar.",
            variant: "destructive",
         });
      }
   }, [status, session, toast]);

   // ... (tus useEffects para localStorage permanecen igual) ...
   useEffect(() => {
      /* ... */
   }, []);
   useEffect(() => {
      /* ... */
   }, [tasks]);
   useEffect(() => {
      /* ... */
   }, [defaultBreakTime]);

   const addTask = (taskData: Omit<Task, "id" | "synced" | "googleEventId">) => {
      /* ... tu lógica ... */
   };
   const addBulkTasks = (newTasksData: Omit<Task, "id" | "synced" | "googleEventId">[]) => {
      /* ... tu lógica ... */
   };
   const removeTask = (id: string) => {
      // TODO: Si la tarea tiene `googleEventId`, ofrecer eliminarla de Google Calendar
      setTasks(tasks.filter((task) => task.id !== id));
      toast({ title: "Tarea eliminada" /* ... */ });
   };

   // FUNCIÓN CENTRAL PARA SINCRONIZAR TAREAS CON GOOGLE CALENDAR
   const syncTasksToCalendar = async (tasksToSync: Task[]) => {
      if (!isAuthenticated) {
         toast({ title: "No Autenticado", description: "Inicia sesión con Google.", variant: "destructive" });
         return { successCount: 0, errorCount: tasksToSync.length, results: [] };
      }
      if (tasksToSync.length === 0) {
         toast({ title: "Nada que sincronizar", description: "No hay tareas nuevas o modificadas." });
         return { successCount: 0, errorCount: 0, results: [] };
      }

      setIsSyncing(true);
      let successCount = 0;
      const results = [];

      // Mapear Task a formato de evento de Google Calendar API
      const eventsForAPI = tasksToSync.map((task) => {
         const [year, month, day] = task.date.split("-").map(Number);
         const [hours, minutes] = task.startTime.split(":").map(Number);
         const startDate = new Date(Date.UTC(year, month - 1, day, hours, minutes)); // Usar UTC para evitar problemas de zona horaria en cliente
         const endDate = new Date(startDate.getTime() + task.duration * 60000);
         const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; // O una opción configurable

         return {
            localId: task.id, // Para actualizar la tarea local después
            summary: task.title,
            description: task.description,
            start: { dateTime: startDate.toISOString(), timeZone },
            end: { dateTime: endDate.toISOString(), timeZone },
            calendarId: task.calendarId || "primary", // Usar el calendarId de la tarea o 'primary'
            // googleEventId: task.googleEventId // Para actualizar eventos existentes (más complejo)
         };
      });

      try {
         const response = await fetch("/api/google-calendar/create-events", {
            // API que crearemos
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ events: eventsForAPI }),
         });

         const apiResult = await response.json();

         if (!response.ok) {
            throw new Error(apiResult.message || "Error en la API de creación de eventos.");
         }

         // Actualizar estado local de las tareas
         setTasks((prevTasks) =>
            prevTasks.map((localTask) => {
               const syncedEvent = apiResult.results?.find((r: any) => r.localId === localTask.id && r.success);
               if (syncedEvent) {
                  successCount++;
                  return { ...localTask, synced: true, googleEventId: syncedEvent.eventId };
               }
               return localTask;
            })
         );
         results.push(...apiResult.results);

         if (successCount > 0) {
            toast({ title: "Sincronización Exitosa", description: `${successCount} tarea(s) sincronizada(s).` });
         }
         if (apiResult.createdCount === 0 && apiResult.results.some((r: any) => !r.success)) {
            toast({
               title: "Error de Sincronización",
               description: "Algunas tareas no pudieron sincronizarse. Revisa detalles.",
               variant: "destructive",
            });
         }
      } catch (error: any) {
         console.error("Error al sincronizar:", error);
         toast({ title: "Error de Sincronización", description: error.message, variant: "destructive" });
      } finally {
         setIsSyncing(false);
      }
      return { successCount, errorCount: tasksToSync.length - successCount, results };
   };

   // Botón de sincronización general
   const handleGeneralSync = () => {
      const unsyncedTasks = tasks.filter((task) => !task.synced && !task.googleEventId);
      syncTasksToCalendar(unsyncedTasks);
   };

   const updateDefaultBreakTime = (minutes: number) => {
      /* ... tu lógica ... */
   };

   if (status === "loading") {
      return <div className="flex justify-center items-center min-h-screen">Cargando Planificador...</div>;
   }

   return (
      <Tabs defaultValue="tasks">
         <TabsList className="grid w-full grid-cols-3 mb-6">{/* ... Tus TabsTriggers ... */}</TabsList>

         <TabsContent value="tasks">
            <Card>
               <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                     <span>Tareas Programadas</span>
                     <div className="flex gap-2 items-center">
                        <GoogleAuthButton /> {/* Ya no necesita props */}
                        {isAuthenticated && tasks.length > 0 && (
                           <Button
                              variant="outline"
                              size="sm"
                              onClick={handleGeneralSync}
                              disabled={isSyncing || tasks.filter((t) => !t.synced && !t.googleEventId).length === 0}
                           >
                              <CalendarIconLucide className="h-4 w-4 mr-2" />
                              {isSyncing
                                 ? "Sincronizando..."
                                 : `Sincronizar (${tasks.filter((t) => !t.synced && !t.googleEventId).length})`}
                           </Button>
                        )}
                     </div>
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <TaskList tasks={tasks} onRemoveTask={removeTask} />
               </CardContent>
            </Card>
         </TabsContent>

         <TabsContent value="add">
            {/* ... Tu TaskForm ... */}
            {/* TaskForm también necesitará la lista de calendarios y `isAuthenticated` si quieres que se preseleccione */}
            <TaskForm onAddTask={addTask} defaultBreakTime={defaultBreakTime} />
         </TabsContent>

         <TabsContent value="import">
            <Card>
               <CardHeader>
                  <CardTitle>Importar Tareas desde Texto</CardTitle>
               </CardHeader>
               <CardContent>
                  <BulkTaskImport
                     // En lugar de onImportTasks, pasaremos la función de sincronización
                     onProcessAndSyncTasks={syncTasksToCalendar} // Nueva prop
                     isAuthenticated={isAuthenticated} // Pasar estado de autenticación
                     defaultBreakTime={defaultBreakTime}
                     onUpdateDefaultBreakTime={updateDefaultBreakTime}
                  />
               </CardContent>
            </Card>
         </TabsContent>
      </Tabs>
   );
}
