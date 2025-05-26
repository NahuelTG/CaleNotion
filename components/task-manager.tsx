"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Calendar } from "lucide-react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { BulkTaskImport } from "@/components/bulk-task-import";
import { useToast } from "@/hooks/use-toast"; // Ajusta la ruta si es necesario
import type { Task, CalendarItem } from "../interfaces/tasks.interface";
import { TaskForm } from "@/components/task-form"; // Asumimos que TaskForm también se adaptará para usar calendarios reales
import { TaskList } from "@/components/task-list"; // Asumimos que TaskList también se adaptará

//UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TaskManager() {
   const { data: session, status } = useSession();
   const [tasks, setTasks] = useState<Task[]>([]);
   const [defaultBreakTime, setDefaultBreakTime] = useState(15);
   const [isSyncing, setIsSyncing] = useState(false);
   const { toast } = useToast();
   const [availableCalendars, setAvailableCalendars] = useState<CalendarItem[]>([]);
   const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

   const isAuthenticated = status === "authenticated";

   // Cargar desde localStorage
   useEffect(() => {
      const savedTasks = localStorage.getItem("tasks");
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      const savedBreakTime = localStorage.getItem("defaultBreakTime");
      if (savedBreakTime) setDefaultBreakTime(Number.parseInt(savedBreakTime));
   }, []);

   // Guardar en localStorage
   useEffect(() => {
      localStorage.setItem("tasks", JSON.stringify(tasks));
   }, [tasks]);
   useEffect(() => {
      localStorage.setItem("defaultBreakTime", defaultBreakTime.toString());
   }, [defaultBreakTime]);

   // Efecto para errores de sesión de NextAuth
   useEffect(() => {
      if (status === "unauthenticated") {
         toast({
            title: "Sesión Expirada",
            description: "Por favor, inicia sesión de nuevo para continuar.",
            variant: "destructive",
         });
      }
   }, [status, session, toast]);
   // Efecto para cargar calendarios cuando el usuario está autenticado
   useEffect(() => {
      const fetchUserCalendars = async () => {
         if (isAuthenticated) {
            setIsLoadingCalendars(true);
            try {
               const response = await fetch("/api/calendar"); // Asumiendo que esta URL es correcta y no da 404
               if (!response.ok) {
                  // ... tu manejo de error ...
                  let errorBodyText = await response.text();
                  try {
                     const errorResult = JSON.parse(errorBodyText);
                     throw new Error(errorResult.error || errorResult.message || `Error ${response.status} fetching calendars`);
                  } catch (e) {
                     throw new Error(`Error ${response.status} fetching calendars: ${errorBodyText.substring(0, 100)}`);
                  }
               }

               const responseObject = await response.json(); // Esto es { calendars: Array(...) }
               console.log("TaskManager: Response object from API:", responseObject);

               // VERIFICA ESTA LÓGICA DETENIDAMENTE
               if (
                  responseObject &&
                  typeof responseObject === "object" &&
                  responseObject.calendars &&
                  Array.isArray(responseObject.calendars)
               ) {
                  // SI responseObject es { calendars: [...] }, entonces usa responseObject.calendars
                  setAvailableCalendars(responseObject.calendars as CalendarItem[]);
                  console.log("TaskManager: setAvailableCalendars con responseObject.calendars");
               } else if (Array.isArray(responseObject)) {
                  // SI responseObject es directamente el array [...] (poco probable según tu log)
                  setAvailableCalendars(responseObject as CalendarItem[]);
                  console.log("TaskManager: setAvailableCalendars con responseObject (array directo)");
               } else {
                  console.warn("TaskManager: Formato de datos de calendarios inesperado o nulo:", responseObject);
                  setAvailableCalendars([]); // Asegura que sea un array vacío en caso de error/formato incorrecto
               }
            } catch (error: any) {
               console.error("TaskManager: Error fetching user calendars:", error);
               toast({
                  title: "Error al cargar calendarios",
                  description: error.message,
                  variant: "destructive",
               });
               setAvailableCalendars([]); // Fallback a array vacío
            } finally {
               setIsLoadingCalendars(false);
            }
         } else {
            setAvailableCalendars([]); // Limpiar calendarios si no está autenticado
         }
      };

      fetchUserCalendars();
   }, [isAuthenticated, toast]);

   const addTask = (taskData: Omit<Task, "id" | "synced" | "googleEventId">) => {
      const newTask: Task = {
         ...taskData,
         id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
         synced: false,
      };
      setTasks((prevTasks) => [...prevTasks, newTask]);
      toast({ title: "Tarea agregada", description: "Recuerda sincronizarla con Google Calendar." });
   };

   const removeTask = async (taskId: string) => {
      const taskToRemove = tasks.find((t) => t.id === taskId);
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
      toast({ title: "Tarea eliminada localmente" });

      // Opcional: Eliminar de Google Calendar si estaba sincronizada
      if (taskToRemove?.googleEventId && taskToRemove.calendarId && isAuthenticated) {
         try {
            // Aquí necesitarías una API route para eliminar eventos: /api/google-calendar/delete-event
            // const response = await fetch("/api/google-calendar/delete-event", {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify({ eventId: taskToRemove.googleEventId, calendarId: taskToRemove.calendarId }),
            // });
            // if (!response.ok) throw new Error("No se pudo eliminar el evento de Google Calendar.");
            // toast({ title: "Evento eliminado de Google Calendar" });
            console.warn("Eliminación de Google Calendar no implementada aún.");
         } catch (error: any) {
            toast({ title: "Error", description: `No se pudo eliminar de Calendar: ${error.message}`, variant: "destructive" });
         }
      }
   };

   /**
    * Sincroniza un array de tareas con Google Calendar.
    * Esta función es llamada por handleGeneralSync y por handleBulkImportAndSync.
    */
   const syncTasksToGoogleCalendarAPI = async (
      tasksToSync: Task[]
   ): Promise<{
      success: boolean;
      message?: string;
      createdCount: number;
      results: Array<{ localId: string; success: boolean; eventId?: string; error?: string; summary?: string }>;
   }> => {
      if (!isAuthenticated) {
         toast({ title: "No Autenticado", description: "Inicia sesión con Google.", variant: "destructive" });
         return {
            success: false,
            createdCount: 0,
            results: tasksToSync.map((t) => ({ localId: t.id, success: false, error: "No autenticado" })),
         };
      }
      if (tasksToSync.length === 0) {
         // toast({ title: "Nada que sincronizar", description: "No hay tareas nuevas o modificadas." });
         return { success: true, createdCount: 0, results: [] };
      }

      setIsSyncing(true);

      const eventsForAPI = tasksToSync.map((task) => {
         const [year, month, day] = task.date.split("-").map(Number);
         const [hours, minutes] = task.startTime.split(":").map(Number);
         // Es crucial que el backend espere y maneje correctamente las zonas horarias.
         // Aquí creamos fechas ISO. El backend puede necesitar la timeZone explícitamente.
         const startDate = new Date(year, month - 1, day, hours, minutes);
         const endDate = new Date(startDate.getTime() + task.duration * 60000);
         const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; // O la timezone seleccionada por el usuario

         return {
            localId: task.id,
            summary: task.title,
            description: task.description,
            start: { dateTime: startDate.toISOString(), timeZone: timeZone },
            end: { dateTime: endDate.toISOString(), timeZone: timeZone },
            calendarId: task.calendarId || "primary",
            // googleEventId: task.googleEventId, // Para actualizar, no para crear en este flujo simple
         };
      });

      try {
         const response = await fetch("/api/google-calendar/create-events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ events: eventsForAPI }),
         });
         const apiResult = await response.json();

         if (!response.ok && response.status !== 207) {
            // 207 es Multi-Status, algunos pueden haber fallado
            throw new Error(apiResult.message || `Error HTTP ${response.status} de la API /create-events`);
         }
         return { success: true, ...apiResult };
      } catch (error: any) {
         console.error("Error llamando a /api/google-calendar/create-events:", error);
         toast({ title: "Error de Sincronización", description: error.message, variant: "destructive" });
         return {
            success: false,
            message: error.message,
            createdCount: 0,
            results: tasksToSync.map((t) => ({ localId: t.id, success: false, error: error.message })),
         };
      } finally {
         setIsSyncing(false);
      }
   };

   // Sincronización general para tareas existentes no sincronizadas
   const handleGeneralSync = async () => {
      const unsyncedTasks = tasks.filter((task) => !task.synced && !task.googleEventId);
      if (unsyncedTasks.length === 0) {
         toast({ title: "Todo Sincronizado", description: "No hay tareas pendientes de sincronizar." });
         return;
      }

      const apiResponse = await syncTasksToGoogleCalendarAPI(unsyncedTasks);

      if (apiResponse.success && apiResponse.results) {
         let SucceededCount = 0;
         setTasks((prevTasks) =>
            prevTasks.map((localTask) => {
               const syncedEvent = apiResponse.results.find((r) => r.localId === localTask.id && r.success);
               if (syncedEvent) {
                  SucceededCount++;
                  return { ...localTask, synced: true, googleEventId: syncedEvent.eventId };
               }
               return localTask;
            })
         );
         if (SucceededCount > 0) {
            toast({ title: "Sincronización Completada", description: `${SucceededCount} tarea(s) sincronizada(s) exitosamente.` });
         }
         if (apiResponse.createdCount < unsyncedTasks.length && apiResponse.results.some((r) => !r.success)) {
            toast({
               title: "Algunas Sincronizaciones Fallaron",
               description: "Revisa los detalles si la API los provee, o los logs.",
            });
         }
      }
   };

   // Manejador para tareas importadas desde BulkTaskImport
   const handleBulkImportAndSync = async (tasksFromBulk: Omit<Task, "id" | "synced" | "googleEventId">[]) => {
      const tasksToSyncWithApi: Task[] = tasksFromBulk.map((taskData, index) => ({
         ...taskData,
         id: `bulk-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`, // ID local único
         synced: false,
      }));

      const apiResponse = await syncTasksToGoogleCalendarAPI(tasksToSyncWithApi);
      let newLocalTasksCount = 0;

      if (apiResponse.success && apiResponse.results) {
         const newSuccessfullySyncedTasks: Task[] = [];
         apiResponse.results.forEach((resultItem) => {
            if (resultItem.success) {
               const originalTaskData = tasksToSyncWithApi.find((t) => t.id === resultItem.localId);
               if (originalTaskData) {
                  newSuccessfullySyncedTasks.push({
                     ...originalTaskData,
                     // id: resultItem.localId, // Mantener el ID local generado
                     synced: true,
                     googleEventId: resultItem.eventId,
                  });
                  newLocalTasksCount++;
               }
            } else {
               // Opcional: Agregar tareas que fallaron al sincronizar como no sincronizadas
               const failedTaskData = tasksToSyncWithApi.find((t) => t.id === resultItem.localId);
               if (failedTaskData) {
                  // console.warn(`Tarea ${failedTaskData.title} no se pudo sincronizar: ${resultItem.error}`);
                  // Podrías añadirlas a `tasks` con `synced: false` o ignorarlas.
               }
            }
         });

         if (newSuccessfullySyncedTasks.length > 0) {
            setTasks((prevTasks) => [...prevTasks, ...newSuccessfullySyncedTasks]);
            // El toast de éxito individual ya lo da `syncTasksToGoogleCalendarAPI`
            // a través de los resultados de la API.
            // Podríamos añadir un toast resumen aquí.
            toast({
               title: "Importación Masiva",
               description: `${newLocalTasksCount} de ${tasksFromBulk.length} tareas importadas y sincronizadas.`,
            });
         }
      }
      if (newLocalTasksCount < tasksFromBulk.length && apiResponse.results.some((r) => !r.success)) {
         toast({
            title: "Importación Masiva Parcial",
            description: "Algunas tareas no pudieron ser sincronizadas. Revisa los logs del servidor.",
         });
      }

      // Devolver el número de tareas que SÍ se crearon para que BulkTaskImport pueda limpiar su formulario
      return { successCount: newLocalTasksCount };
   };

   const updateDefaultBreakTime = (minutes: number) => {
      setDefaultBreakTime(minutes);
      toast({ title: "Descanso Actualizado", description: `Descanso predeterminado: ${minutes} min.` });
   };

   if (status === "loading") {
      return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
   }

   return (
      <Tabs defaultValue="tasks" className="w-full">
         <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="import">Importar Tareas</TabsTrigger>
            <TabsTrigger value="tasks">Mis Tareas</TabsTrigger>
            <TabsTrigger value="add">Agregar Tarea</TabsTrigger>
         </TabsList>

         <TabsContent value="tasks">
            <Card>
               <CardHeader>
                  <CardTitle className="flex flex-wrap justify-between items-center gap-2">
                     <span>Tareas Programadas</span>
                     <div className="flex gap-2 items-center">
                        <GoogleAuthButton />
                        {isAuthenticated && (
                           <Button
                              variant="outline"
                              size="sm"
                              onClick={handleGeneralSync}
                              disabled={isSyncing || tasks.filter((t) => !t.synced && !t.googleEventId).length === 0}
                           >
                              <Calendar className="h-4 w-4 mr-2" />
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
            <Card>
               <CardHeader>
                  <CardTitle>Agregar Nueva Tarea</CardTitle>
               </CardHeader>
               <CardContent>
                  <TaskForm
                     onAddTask={addTask}
                     defaultBreakTime={defaultBreakTime}
                     isAuthenticated={isAuthenticated} // Pasar para que TaskForm pueda cargar calendarios
                     availableCalendars={availableCalendars} // <--- NUEVO
                     isLoadingCalendars={isLoadingCalendars} // <--- NUEVO
                  />
               </CardContent>
            </Card>
         </TabsContent>

         <TabsContent value="import">
            <Card>
               <CardHeader>
                  <CardTitle>Importar Tareas desde Texto</CardTitle>
               </CardHeader>
               <CardContent>
                  <BulkTaskImport
                     onProcessAndSyncTasks={handleBulkImportAndSync}
                     isAuthenticated={isAuthenticated}
                     defaultBreakTime={defaultBreakTime}
                     onUpdateDefaultBreakTime={updateDefaultBreakTime}
                  />
               </CardContent>
            </Card>
         </TabsContent>
      </Tabs>
   );
}
