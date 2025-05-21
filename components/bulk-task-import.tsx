"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, Info, Check, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Task } from "./task-manager"; // Importar el tipo Task
import { useToast } from "@/hooks/use-toast"; // Ajusta ruta si es necesario

interface GoogleApiCalendar {
   id: string;
   summary: string;
   backgroundColor: string;
   primary: boolean;
}

interface BulkTaskImportProps {
   onProcessAndSyncTasks: (tasksToSync: Task[]) => Promise<{ successCount: number; errorCount: number; results: any[] }>;
   isAuthenticated: boolean;
   defaultBreakTime: number;
   onUpdateDefaultBreakTime: (minutes: number) => void;
}

interface ParsedInternalTask {
   /* ... tu tipo ... */ title: string;
   duration: number;
}

export function BulkTaskImport({
   onProcessAndSyncTasks,
   isAuthenticated,
   defaultBreakTime,
   onUpdateDefaultBreakTime,
}: BulkTaskImportProps) {
   const [taskText, setTaskText] = useState("");
   const [date, setDate] = useState<Date | undefined>(new Date());
   const [startTime, setStartTime] = useState("09:00");
   // `configurableTasks` será Omit<Task, "id" | "synced" | "googleEventId" | "date" | "startTime">
   // Para que luego se les añada la fecha y hora de inicio calculada
   const [configurableTasks, setConfigurableTasks] = useState<Omit<Task, "id" | "synced" | "googleEventId" | "date" | "startTime">[]>([]);
   const [globalBreakTime, setGlobalBreakTime] = useState(defaultBreakTime);
   const [globalCalendarId, setGlobalCalendarId] = useState<string>("primary");
   const [userCalendars, setUserCalendars] = useState<GoogleApiCalendar[]>([]);
   const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
   const [step, setStep] = useState<"input" | "configure">("input");
   const [isProcessing, setIsProcessing] = useState(false);
   const { toast } = useToast();

   useEffect(() => {
      setGlobalBreakTime(defaultBreakTime);
   }, [defaultBreakTime]);

   // Cargar calendarios
   useEffect(() => {
      const fetchCalendars = async () => {
         if (isAuthenticated) {
            setIsLoadingCalendars(true);
            try {
               const response = await fetch("/api/google-calendar/list-calendars");
               const data = await response.json();
               if (!response.ok) {
                  throw new Error(data.message || "Error al cargar calendarios");
               }
               setUserCalendars(data.calendars || []);
               const primaryCal = data.calendars?.find((c: GoogleApiCalendar) => c.primary) || data.calendars?.[0];
               if (primaryCal) {
                  setGlobalCalendarId(primaryCal.id);
               }
            } catch (error: any) {
               toast({ title: "Error Calendarios", description: error.message, variant: "destructive" });
               setUserCalendars([{ id: "primary", summary: "Principal (Error)", backgroundColor: "#ccc", primary: true }]);
            } finally {
               setIsLoadingCalendars(false);
            }
         } else {
            setUserCalendars([{ id: "primary", summary: "Principal (Offline)", backgroundColor: "#ccc", primary: true }]);
         }
      };
      fetchCalendars();
   }, [isAuthenticated, toast]);

   // Tu lógica de `parseTaskText` y `handleTextChange`...
   const parseTaskText = (text: string): ParsedInternalTask[] => {
      const taskRegex = /- \[ \]\s+(.+?)\s+\[(\d+)\s*(hora|horas|min|minutos|h|m)\]/gi;
      const tasks: ParsedInternalTask[] = [];
      let match;
      while ((match = taskRegex.exec(text)) !== null) {
         const title = match[1].trim();
         const durationValue = Number.parseInt(match[2]);
         const durationUnit = match[3].toLowerCase();
         let durationInMinutes = durationValue;
         if (["hora", "horas", "h"].includes(durationUnit)) {
            durationInMinutes = durationValue * 60;
         }
         tasks.push({ title, duration: durationInMinutes });
      }
      return tasks;
   };
   const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTaskText(e.target.value);
   };

   const handleParseAndGoToConfigure = () => {
      setIsProcessing(true);
      const parsed = parseTaskText(taskText);
      if (parsed.length === 0) {
         toast({ title: "Sin tareas", description: "No se encontraron tareas válidas." });
         setIsProcessing(false);
         return;
      }
      // Pre-configurar con valores globales
      setConfigurableTasks(
         parsed.map((pTask) => ({
            title: pTask.title,
            duration: pTask.duration,
            breakAfter: globalBreakTime,
            calendarId: globalCalendarId,
            description: "", // Por defecto
         }))
      );
      setStep("configure");
      setIsProcessing(false);
   };

   const handleFinalImportAndSync = async () => {
      if (!date || configurableTasks.length === 0 || !isAuthenticated) {
         toast({ title: "Acción Requerida", description: "Asegúrate de tener fecha, tareas y estar autenticado.", variant: "destructive" });
         return;
      }
      setIsProcessing(true);

      const formattedDate = format(date, "yyyy-MM-dd");
      let currentStartTime = startTime;
      const tasksForSync: Task[] = [];

      configurableTasks.forEach((confTask, index) => {
         tasksForSync.push({
            ...confTask,
            id: `bulk-${Date.now()}-${index}`, // ID local temporal
            date: formattedDate,
            startTime: currentStartTime,
            synced: false, // Se actualizará por la función de sync
         });
         // Calcular siguiente hora de inicio
         const [h, m] = currentStartTime.split(":").map(Number);
         const totalMins = h * 60 + m + confTask.duration + confTask.breakAfter;
         currentStartTime = `${String(Math.floor(totalMins / 60) % 24).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`;
      });

      const result = await onProcessAndSyncTasks(tasksForSync);

      if (result.successCount > 0) {
         // Limpiar y volver al inicio
         setTaskText("");
         setConfigurableTasks([]);
         setStep("input");
      }
      // Los toasts ya se manejan en `onProcessAndSyncTasks` o `TaskManager`
      setIsProcessing(false);
   };

   // Tus funciones `updateTaskBreakTime`, `updateTaskCalendar`, `applyBreakTimeToAll`, `applyCalendarToAll`
   // ahora operarán sobre `configurableTasks` y `setConfigurableTasks`.
   // Por ejemplo:
   const updateConfigurableTaskBreakTime = (index: number, newBreakTime: number) => {
      const updated = [...configurableTasks];
      updated[index].breakAfter = newBreakTime;
      setConfigurableTasks(updated);
   };
   const updateConfigurableTaskCalendar = (index: number, calendarId: string) => {
      const updated = [...configurableTasks];
      updated[index].calendarId = calendarId;
      setConfigurableTasks(updated);
   };
   const updateConfigurableTaskDescription = (index: number, description: string) => {
      const updated = [...configurableTasks];
      updated[index].description = description;
      setConfigurableTasks(updated);
   };

   const applyGlobalBreakTimeToAll = (time: number) => {
      setConfigurableTasks((prev) => prev.map((task) => ({ ...task, breakAfter: time })));
      setGlobalBreakTime(time);
      onUpdateDefaultBreakTime(time);
   };
   const applyGlobalCalendarToAll = (calendarId: string) => {
      setConfigurableTasks((prev) => prev.map((task) => ({ ...task, calendarId })));
      setGlobalCalendarId(calendarId);
      localStorage.setItem("selectedCalendarId", calendarId); // O un nombre específico para bulk
   };

   // UI (adaptar para usar `configurableTasks` y `userCalendars` en los Select)
   // Ejemplo para el Select de calendario global:
   /*
  <Select value={globalCalendarId} onValueChange={setGlobalCalendarId} disabled={isLoadingCalendars}>
    <SelectTrigger>
      <SelectValue placeholder={isLoadingCalendars ? "Cargando..." : "Calendario Global"} />
    </SelectTrigger>
    <SelectContent>
      {userCalendars.map((cal) => (
        <SelectItem key={cal.id} value={cal.id}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.backgroundColor }} />
            {cal.summary} {cal.primary && "(Principal)"}
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  */
   // Y similar para los Selects individuales.
   // El botón final llamará a `handleFinalImportAndSync`.

   // ... (el resto de tu JSX adaptado)
   // En la etapa de "configure", mapea sobre `configurableTasks`.
   // Los Selects de calendario usarán `userCalendars`.

   if (step === "input") {
      return (
         <div className="space-y-6">
            <Alert> {/* ... Tu Alert ... */} </Alert>
            <div className="space-y-2">
               <Label htmlFor="taskText">Pega tus tareas aquí</Label>
               <Textarea id="taskText" value={taskText} onChange={handleTextChange} rows={8} className="font-mono" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* ... Tus Inputs de fecha y hora ... */} </div>
            <Button onClick={handleParseAndGoToConfigure} className="w-full" disabled={!taskText.trim() || isProcessing}>
               {isProcessing ? "Procesando..." : "Continuar"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
         </div>
      );
   }

   // STEP "CONFIGURE"
   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Configurar {configurableTasks.length} tareas</h3>
            <Button variant="outline" size="sm" onClick={() => setStep("input")} disabled={isProcessing}>
               Volver
            </Button>
         </div>

         <Card className="bg-gray-50 dark:bg-gray-800">
            {" "}
            {/* Configuración Global */}
            <CardContent className="p-4 space-y-4">
               <h4 className="font-medium">Configuración global</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     {" "}
                     {/* Global Break Time */}
                     <Label>Tiempo de descanso para todas</Label>
                     <div className="flex items-center gap-2 mt-1">
                        <Slider
                           value={[globalBreakTime]}
                           min={0}
                           max={60}
                           step={5}
                           onValueChange={(v) => setGlobalBreakTime(v[0])}
                           className="flex-1"
                        />
                        <Input
                           type="number"
                           value={globalBreakTime}
                           onChange={(e) => setGlobalBreakTime(parseInt(e.target.value))}
                           className="w-16 text-center"
                        />
                        <span className="text-sm">min</span>
                        <Button variant="outline" size="sm" onClick={() => applyGlobalBreakTimeToAll(globalBreakTime)}>
                           Aplicar
                        </Button>
                     </div>
                  </div>
                  <div>
                     {" "}
                     {/* Global Calendar */}
                     <Label>Calendario para todas</Label>
                     <div className="flex items-center gap-2 mt-1">
                        <Select value={globalCalendarId} onValueChange={setGlobalCalendarId} disabled={isLoadingCalendars}>
                           <SelectTrigger className="flex-1">
                              <SelectValue placeholder={isLoadingCalendars ? "Cargando..." : "Selecciona"} />
                           </SelectTrigger>
                           <SelectContent>
                              {userCalendars.map((cal) => (
                                 <SelectItem key={cal.id} value={cal.id}>
                                    <div className="flex items-center gap-2">
                                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.backgroundColor }} />
                                       {cal.summary} {cal.primary && "(Principal)"}
                                    </div>
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => applyGlobalCalendarToAll(globalCalendarId)}>
                           Aplicar
                        </Button>
                     </div>
                  </div>
               </div>
            </CardContent>
         </Card>

         <div className="space-y-4">
            {" "}
            {/* Tareas Individuales */}
            <h4 className="font-medium">Tareas detectadas</h4>
            {configurableTasks.map((task, index) => (
               <Card key={index}>
                  <CardContent className="p-4 space-y-3">
                     <div className="flex justify-between items-center">
                        <h5 className="font-medium">{task.title}</h5>
                        <span className="text-sm text-muted-foreground">{task.duration} minutos</span>
                     </div>
                     <div className="space-y-1">
                        <Label htmlFor={`desc-${index}`}>Descripción (opcional)</Label>
                        <Textarea
                           id={`desc-${index}`}
                           value={task.description}
                           onChange={(e) => updateConfigurableTaskDescription(index, e.target.value)}
                           rows={2}
                           placeholder="Añade detalles..."
                        />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           {" "}
                           {/* Individual Break Time */}
                           <Label>Descanso después</Label>
                           <div className="flex items-center gap-2 mt-1">
                              <Slider
                                 value={[task.breakAfter]}
                                 min={0}
                                 max={60}
                                 step={5}
                                 onValueChange={(v) => updateConfigurableTaskBreakTime(index, v[0])}
                                 className="flex-1"
                              />
                              <Input
                                 type="number"
                                 value={task.breakAfter}
                                 onChange={(e) => updateConfigurableTaskBreakTime(index, parseInt(e.target.value))}
                                 className="w-16 text-center"
                              />
                              <span className="text-sm">min</span>
                           </div>
                        </div>
                        <div>
                           {" "}
                           {/* Individual Calendar */}
                           <Label>Calendario</Label>
                           <Select
                              value={task.calendarId}
                              onValueChange={(value) => updateConfigurableTaskCalendar(index, value)}
                              disabled={isLoadingCalendars}
                           >
                              <SelectTrigger className="mt-1">
                                 <SelectValue placeholder={isLoadingCalendars ? "Cargando..." : "Selecciona"} />
                              </SelectTrigger>
                              <SelectContent>
                                 {userCalendars.map((cal) => (
                                    <SelectItem key={cal.id} value={cal.id}>
                                       <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.backgroundColor }} />
                                          {cal.summary} {cal.primary && "(Principal)"}
                                       </div>
                                    </SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                     </div>
                  </CardContent>
               </Card>
            ))}
         </div>

         <Button
            onClick={handleFinalImportAndSync}
            className="w-full"
            disabled={isProcessing || configurableTasks.length === 0 || !isAuthenticated}
         >
            {isProcessing ? "Importando y Sincronizando..." : `Importar y Sincronizar ${configurableTasks.length} Tareas`}
            <Check className="mr-2 h-4 w-4" />
         </Button>
         {!isAuthenticated && <p className="text-sm text-center text-red-500">Debes iniciar sesión con Google para sincronizar.</p>}
      </div>
   );
}
