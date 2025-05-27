"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

//UI
import { CalendarIcon, Clock, Info, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarUICalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Task, BulkTaskImportProps, ParsedInternalTask } from "../interfaces/tasks.interface";
import type { GoogleApiCalendar } from "../interfaces/google.api.interface";

// Tarea lista para configurar (antes de añadir fecha/hora globales)
type ConfigurableTask = Omit<Task, "id" | "synced" | "googleEventId" | "date" | "startTime">;

export function BulkTaskImport({
   onProcessAndSyncTasks,
   isAuthenticated,
   defaultBreakTime,
   availableCalendars,
   isLoadingCalendars,
   onUpdateDefaultBreakTime,
}: BulkTaskImportProps) {
   const [taskText, setTaskText] = useState("");
   const [date, setDate] = useState<Date | undefined>(new Date());
   const [startTime, setStartTime] = useState("09:00");
   const [configurableTasks, setConfigurableTasks] = useState<ConfigurableTask[]>([]);
   const [globalBreakTime, setGlobalBreakTime] = useState(defaultBreakTime);
   const [globalCalendarId, setGlobalCalendarId] = useState<string>("primary");
   const [userCalendars, setUserCalendars] = useState<GoogleApiCalendar[]>([]);
   const [step, setStep] = useState<"input" | "configure">("input");
   const [isProcessing, setIsProcessing] = useState(false);
   const { toast } = useToast();

   useEffect(() => {
      setGlobalBreakTime(defaultBreakTime);
   }, [defaultBreakTime]);

   const parseTaskTextToInternal = (text: string): ParsedInternalTask[] => {
      const taskRegex = /- \[ \]\s+(.+?)\s+\[(\d+)\s*(hora|horas|min|minutos|h|m)\]/gi;
      const tasks: ParsedInternalTask[] = [];
      let match;
      while ((match = taskRegex.exec(text)) !== null) {
         const title = match[1].trim();
         const durationValue = Number.parseInt(match[2]);
         const durationUnit = match[3].toLowerCase();
         let durationInMinutes = durationValue;
         if (["hora", "horas", "h"].includes(durationUnit)) durationInMinutes = durationValue * 60;
         tasks.push({ title, duration: durationInMinutes });
      }
      return tasks;
   };

   const handleParseAndGoToConfigure = () => {
      if (!taskText.trim()) {
         toast({ title: "Texto Vacío", description: "Ingresa texto para parsear.", variant: "default" });
         return;
      }
      setIsProcessing(true);
      const parsed = parseTaskTextToInternal(taskText);
      if (parsed.length === 0) {
         toast({ title: "Sin Tareas", description: "No se encontraron tareas válidas en el texto.", variant: "default" });
         setIsProcessing(false);
         return;
      }
      setConfigurableTasks(
         parsed.map((pTask) => ({
            title: pTask.title,
            duration: pTask.duration,
            breakAfter: globalBreakTime,
            calendarId: globalCalendarId,
            description: "",
         }))
      );
      setStep("configure");
      setIsProcessing(false);
   };

   const handleFinalImportAndSync = async () => {
      if (!date) {
         toast({ title: "Falta Fecha", variant: "destructive" });
         return;
      }
      if (configurableTasks.length === 0) {
         toast({ title: "Sin Tareas", description: "No hay tareas para importar.", variant: "destructive" });
         return;
      }
      if (!isAuthenticated) {
         toast({ title: "No Autenticado", variant: "destructive" });
         return;
      }

      setIsProcessing(true);
      const formattedDate = format(date, "yyyy-MM-dd");
      let currentStartTime = startTime;
      const tasksToProcess: Omit<Task, "id" | "synced" | "googleEventId">[] = [];

      configurableTasks.forEach((confTask) => {
         tasksToProcess.push({
            ...confTask, // title, description, duration, breakAfter, calendarId
            date: formattedDate,
            startTime: currentStartTime,
         });
         const [h, m] = currentStartTime.split(":").map(Number);
         const totalMins = h * 60 + m + confTask.duration + confTask.breakAfter;
         currentStartTime = `${String(Math.floor(totalMins / 60) % 24).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`;
      });

      const result = await onProcessAndSyncTasks(tasksToProcess);

      if (result.successCount > 0) {
         setTaskText("");
         setConfigurableTasks([]);
         setStep("input");
         // El toast de éxito general lo da TaskManager
      } else {
         // Si successCount es 0, TaskManager o syncTasksToGoogleCalendarAPI ya debería haber mostrado un toast de error.
      }
      setIsProcessing(false);
   };

   const updateIndividualTask = (index: number, field: keyof ConfigurableTask, value: string | number) => {
      setConfigurableTasks((prev) => prev.map((task, i) => (i === index ? { ...task, [field]: value } : task)));
   };

   const applyGlobalBreakTimeToAll = (time: number) => {
      setConfigurableTasks((prev) => prev.map((task) => ({ ...task, breakAfter: time })));
      setGlobalBreakTime(time); // Actualiza el slider global
      onUpdateDefaultBreakTime(time); // Propaga al TaskManager
   };

   const applyGlobalCalendarToAll = (calendarId: string) => {
      setConfigurableTasks((prev) => prev.map((task) => ({ ...task, calendarId })));
      setGlobalCalendarId(calendarId); // Actualiza el select global
      // localStorage.setItem("selectedCalendarIdForBulk", calendarId); // Opcional
   };

   if (step === "input") {
      return (
         <div className="space-y-6">
            <Alert>
               <Info className="h-4 w-4" />
               <AlertTitle>Formato de tareas</AlertTitle>
               <AlertDescription>
                  <p>Pega tus tareas en el siguiente formato (una por línea):</p>
                  <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded sm:text-sm text-sm whitespace-normal w-full break-words">
                     - [ ] Título de la tarea [min/h] <br />- [ ] Título de la tarea [min/h] <br />- [ ] Título de la tarea [min/h]
                  </pre>
                  Ej:{" "}
                  <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded sm:text-sm text-xs whitespace-normal w-full break-words">
                     - [ ] Reunión de trabajo [1 hora] <br />- [ ] Realizar un proyecto [2 horas] <br />- [ ] Recoger un regalo [30 min]
                  </pre>
               </AlertDescription>
            </Alert>

            <div className="space-y-2">
               <Label htmlFor="taskText">Pega tus tareas aquí</Label>
               <Textarea id="taskText" value={taskText} onChange={(e) => setTaskText(e.target.value)} rows={8} className="font-mono" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label htmlFor="date">Fecha de inicio de las tareas</Label>
                  <Popover>
                     <PopoverTrigger asChild>
                        <Button
                           variant="outline"
                           className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                        >
                           <CalendarIcon className="mr-2 h-4 w-4" />
                           {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
                        </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0">
                        <CalendarUICalendar mode="single" selected={date} onSelect={setDate} initialFocus locale={es} />
                     </PopoverContent>
                  </Popover>
               </div>
               <div className="space-y-2">
                  <Label htmlFor="startTime">Hora de inicio de la primera tarea</Label>
                  <div className="flex items-center">
                     <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                     <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                  </div>
               </div>
            </div>
            <Button onClick={handleParseAndGoToConfigure} className="w-full" disabled={isProcessing || !taskText.trim()}>
               {isProcessing ? "Procesando..." : "Continuar y Configurar"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
         </div>
      );
   }

   // STEP "CONFIGURE"
   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Configurar {configurableTasks.length} Tareas</h3>
            <Button variant="outline" size="sm" onClick={() => setStep("input")} disabled={isProcessing}>
               Volver
            </Button>
         </div>

         <Card className="bg-gray-50 dark:bg-slate-800">
            <CardContent className="p-4 space-y-4">
               <h4 className="font-medium">Configuración Global</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
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
                           onChange={(e) => setGlobalBreakTime(Math.max(0, parseInt(e.target.value) || 0))}
                           className="w-16 text-center"
                        />
                        <span className="text-sm">min</span>
                        <Button variant="outline" size="sm" onClick={() => applyGlobalBreakTimeToAll(globalBreakTime)}>
                           Aplicar
                        </Button>
                     </div>
                  </div>
                  <div>
                     <Label>Calendario para todas</Label>
                     <div className="flex items-center gap-2 mt-1">
                        <Select
                           value={globalCalendarId}
                           onValueChange={setGlobalCalendarId}
                           disabled={isLoadingCalendars || !isAuthenticated}
                        >
                           <SelectTrigger>
                              {(!isAuthenticated && "Inicia sesión para ver calendarios") ||
                                 (isLoadingCalendars && "Cargando calendarios...") ||
                                 (availableCalendars.length === 0 && "No hay calendarios disponibles") ||
                                 availableCalendars.find((c) => c.id === globalCalendarId)?.name ||
                                 "Selecciona un calendario"}
                           </SelectTrigger>
                           <SelectContent>
                              {isAuthenticated &&
                                 !isLoadingCalendars &&
                                 availableCalendars.map((calendar) => (
                                    <SelectItem key={calendar.id} value={calendar.id}>
                                       <div className="flex items-center gap-2">
                                          {calendar.color && (
                                             <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calendar.color }} />
                                          )}
                                          {calendar.name}
                                       </div>
                                    </SelectItem>
                                 ))}
                              {/* Opcional: mostrar mensaje si no hay calendarios o no está autenticado */}
                              {isAuthenticated && !isLoadingCalendars && availableCalendars.length === 0 && (
                                 <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    No se encontraron calendarios o no tienes permisos de escritura.
                                 </div>
                              )}
                           </SelectContent>
                        </Select>
                        <Button
                           variant="outline"
                           size="sm"
                           onClick={() => applyGlobalCalendarToAll(globalCalendarId)}
                           disabled={!isAuthenticated}
                        >
                           Aplicar
                        </Button>
                     </div>
                  </div>
               </div>
            </CardContent>
         </Card>

         <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            <h4 className="font-medium">Tareas Detectadas</h4>
            {configurableTasks.map((task, index) => (
               <Card key={`conf-task-${index}`}>
                  <CardContent className="p-4 space-y-3">
                     <div className="flex justify-between items-center">
                        <h5 className="font-medium">{task.title}</h5>
                        <span className="text-sm text-muted-foreground">{task.duration} min</span>
                     </div>
                     <div className="space-y-1">
                        <Label htmlFor={`desc-${index}`}>Descripción</Label>
                        <Textarea
                           id={`desc-${index}`}
                           value={task.description}
                           onChange={(e) => updateIndividualTask(index, "description", e.target.value)}
                           rows={2}
                           placeholder="Detalles adicionales..."
                        />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                           <Label>Descanso después</Label>
                           <div className="flex items-center gap-2 mt-1">
                              <Slider
                                 value={[task.breakAfter]}
                                 min={0}
                                 max={60}
                                 step={5}
                                 onValueChange={(v) => updateIndividualTask(index, "breakAfter", v[0])}
                                 className="flex-1"
                              />
                              <Input
                                 type="number"
                                 value={task.breakAfter}
                                 onChange={(e) => updateIndividualTask(index, "breakAfter", Math.max(0, parseInt(e.target.value) || 0))}
                                 className="w-16 text-center"
                              />
                              <span className="text-sm">min</span>
                           </div>
                        </div>
                        <div>
                           <Label>Calendario</Label>
                           <Select
                              value={task.calendarId}
                              onValueChange={(value) => updateIndividualTask(index, "calendarId", value)}
                              disabled={isLoadingCalendars || !isAuthenticated}
                           >
                              <SelectTrigger>
                                 {(!isAuthenticated && "Inicia sesión para ver calendarios") ||
                                    (isLoadingCalendars && "Cargando calendarios...") ||
                                    (availableCalendars.length === 0 && "No hay calendarios disponibles") ||
                                    availableCalendars.find((c) => c.id === task.calendarId)?.name ||
                                    "Selecciona un calendario"}
                              </SelectTrigger>
                              <SelectContent>
                                 {isAuthenticated &&
                                    !isLoadingCalendars &&
                                    availableCalendars.map((calendar) => (
                                       <SelectItem key={calendar.id} value={calendar.id}>
                                          <div className="flex items-center gap-2">
                                             {calendar.color && (
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calendar.color }} />
                                             )}
                                             {calendar.name}
                                          </div>
                                       </SelectItem>
                                    ))}
                                 {/* Opcional: mostrar mensaje si no hay calendarios o no está autenticado */}
                                 {isAuthenticated && !isLoadingCalendars && availableCalendars.length === 0 && (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                       No se encontraron calendarios o no tienes permisos de escritura.
                                    </div>
                                 )}
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
            <Check className="ml-2 h-4 w-4" />
         </Button>
         {!isAuthenticated && (
            <p className="text-sm text-center text-red-500 mt-2">
               Debes iniciar sesión con Google para seleccionar calendarios y sincronizar.
            </p>
         )}
      </div>
   );
}
