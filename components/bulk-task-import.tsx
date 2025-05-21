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
import type { Task } from "./task-manager";

interface BulkTaskImportProps {
   onImportTasks: (tasks: Omit<Task, "id" | "synced">[]) => void;
   defaultBreakTime: number;
   onUpdateDefaultBreakTime: (minutes: number) => void;
}

// Tipo para representar un calendario de Google
interface GoogleCalendar {
   id: string;
   name: string;
   color?: string;
}

// Tipo para representar una tarea parseada del texto
interface ParsedTask {
   title: string;
   duration: number;
   breakAfter: number;
   calendarId: string;
}

// Definición de calendarios disponibles (en una implementación real, esto vendría de la API)
const availableCalendars: GoogleCalendar[] = [
   { id: "primary", name: "Calendario principal", color: "#4285F4" },
   { id: "work", name: "Trabajo", color: "#0F9D58" },
   { id: "personal", name: "Personal", color: "#F4B400" },
   { id: "family", name: "Familia", color: "#DB4437" },
];

export function BulkTaskImport({ onImportTasks, defaultBreakTime, onUpdateDefaultBreakTime }: BulkTaskImportProps) {
   const [taskText, setTaskText] = useState("");
   const [date, setDate] = useState<Date | undefined>(new Date());
   const [startTime, setStartTime] = useState("09:00");
   const [breakTime, setBreakTime] = useState(defaultBreakTime);
   const [selectedCalendarId, setSelectedCalendarId] = useState<string>("primary");
   const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
   const [step, setStep] = useState<"input" | "configure">("input");

   // Cargar el calendario predeterminado
   useEffect(() => {
      const savedCalendarId = localStorage.getItem("selectedCalendarId");
      if (savedCalendarId) {
         setSelectedCalendarId(savedCalendarId);
      }
   }, []);

   // Expresión regular simplificada para extraer solo título y duración
   const parseTaskText = (text: string) => {
      const taskRegex = /- \[ \]\s+(.+?)\s+\[(\d+)\s*(hora|horas|min|minutos|h|m)\]/g;
      const tasks: ParsedTask[] = [];
      let match;

      while ((match = taskRegex.exec(text)) !== null) {
         const title = match[1].trim();
         const durationValue = Number.parseInt(match[2]);
         const durationUnit = match[3].toLowerCase();

         // Convertir duración a minutos
         let durationInMinutes = durationValue;
         if (durationUnit === "hora" || durationUnit === "horas" || durationUnit === "h") {
            durationInMinutes = durationValue * 60;
         }

         tasks.push({
            title,
            duration: durationInMinutes,
            breakAfter: breakTime, // Usar el tiempo de descanso predeterminado
            calendarId: selectedCalendarId, // Usar el calendario predeterminado
         });
      }

      return tasks;
   };

   const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setTaskText(text);
   };

   const handleParseText = () => {
      const tasks = parseTaskText(taskText);
      setParsedTasks(tasks);
      if (tasks.length > 0) {
         setStep("configure");
      }
   };

   const handleImport = () => {
      if (!date || parsedTasks.length === 0) return;

      const formattedDate = format(date, "yyyy-MM-dd");
      let currentStartTime = startTime;

      const importedTasks: Omit<Task, "id" | "synced">[] = [];

      parsedTasks.forEach((task) => {
         importedTasks.push({
            title: task.title,
            description: "",
            duration: task.duration,
            breakAfter: task.breakAfter,
            date: formattedDate,
            startTime: currentStartTime,
            calendarId: task.calendarId,
         });

         // Calcular la hora de inicio de la siguiente tarea
         const [hours, minutes] = currentStartTime.split(":").map(Number);
         const totalMinutes = hours * 60 + minutes + task.duration + task.breakAfter;
         const nextHours = Math.floor(totalMinutes / 60);
         const nextMinutes = totalMinutes % 60;

         currentStartTime = `${nextHours.toString().padStart(2, "0")}:${nextMinutes.toString().padStart(2, "0")}`;
      });

      onImportTasks(importedTasks);

      // Limpiar el formulario y volver al paso inicial
      setTaskText("");
      setParsedTasks([]);
      setStep("input");
   };

   const updateTaskBreakTime = (index: number, newBreakTime: number) => {
      const updatedTasks = [...parsedTasks];
      updatedTasks[index].breakAfter = newBreakTime;
      setParsedTasks(updatedTasks);
   };

   const updateTaskCalendar = (index: number, calendarId: string) => {
      const updatedTasks = [...parsedTasks];
      updatedTasks[index].calendarId = calendarId;
      setParsedTasks(updatedTasks);
   };

   const applyBreakTimeToAll = (time: number) => {
      const updatedTasks = parsedTasks.map((task) => ({
         ...task,
         breakAfter: time,
      }));
      setParsedTasks(updatedTasks);
      setBreakTime(time);
   };

   const applyCalendarToAll = (calendarId: string) => {
      const updatedTasks = parsedTasks.map((task) => ({
         ...task,
         calendarId,
      }));
      setParsedTasks(updatedTasks);
      setSelectedCalendarId(calendarId);
      localStorage.setItem("selectedCalendarId", calendarId);
   };

   // Función para obtener el nombre del calendario por su ID
   const getCalendarName = (id: string) => {
      const calendar = availableCalendars.find((cal) => cal.id === id);
      return calendar ? calendar.name : id;
   };

   // Función para obtener el color del calendario por su ID
   const getCalendarColor = (id: string) => {
      const calendar = availableCalendars.find((cal) => cal.id === id);
      return calendar?.color || "#9AA0A6";
   };

   if (step === "input") {
      return (
         <div className="space-y-6">
            <Alert>
               <Info className="h-4 w-4" />
               <AlertTitle>Formato de tareas</AlertTitle>
               <AlertDescription>
                  <p>Pega tus tareas en el siguiente formato:</p>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-sm">
                     {`- [ ] Ver de ir al dentista [1 hora]
- [ ] Avanzar de LeerElCielo [1 hora]
- [ ] Postear el baile que dará mi tropa [30 min]
- [ ] Hacer aplicación para pendientes calendar [2 horas]`}
                  </pre>
               </AlertDescription>
            </Alert>

            <div className="space-y-2">
               <Label htmlFor="taskText">Pega tus tareas aquí</Label>
               <Textarea
                  id="taskText"
                  placeholder="Pega tus tareas en el formato indicado arriba"
                  value={taskText}
                  onChange={handleTextChange}
                  rows={8}
                  className="font-mono"
               />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label htmlFor="date">Fecha de inicio</Label>
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
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={es} />
                     </PopoverContent>
                  </Popover>
               </div>

               <div className="space-y-2">
                  <Label htmlFor="startTime">Hora de inicio</Label>
                  <div className="flex items-center">
                     <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                     <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                  </div>
               </div>
            </div>

            <Button onClick={handleParseText} className="w-full" disabled={!taskText.trim()}>
               Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
         </div>
      );
   }

   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Configurar {parsedTasks.length} tareas</h3>
            <Button variant="outline" size="sm" onClick={() => setStep("input")}>
               Volver a editar texto
            </Button>
         </div>

         <div className="space-y-4 border rounded-md p-4 bg-gray-50">
            <h4 className="font-medium">Configuración global</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label>Tiempo de descanso para todas las tareas</Label>
                  <div className="flex items-center gap-4">
                     <div className="flex-1">
                        <Slider value={[breakTime]} min={0} max={60} step={5} onValueChange={(value: number[]) => setBreakTime(value[0])} />
                     </div>
                     <div className="w-16 flex items-center gap-1">
                        <Input
                           type="number"
                           min={0}
                           value={breakTime}
                           onChange={(e) => setBreakTime(Number.parseInt(e.target.value))}
                           className="w-12"
                        />
                        <span className="text-sm text-muted-foreground">min</span>
                     </div>
                     <Button variant="outline" size="sm" onClick={() => applyBreakTimeToAll(breakTime)}>
                        Aplicar a todas
                     </Button>
                  </div>
               </div>

               <div className="space-y-2">
                  <Label>Calendario para todas las tareas</Label>
                  <div className="flex gap-2">
                     <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                        <SelectTrigger>
                           <SelectValue placeholder="Selecciona un calendario" />
                        </SelectTrigger>
                        <SelectContent>
                           {availableCalendars.map((calendar) => (
                              <SelectItem key={calendar.id} value={calendar.id}>
                                 <div className="flex items-center gap-2">
                                    {calendar.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calendar.color }} />}
                                    {calendar.name}
                                 </div>
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                     <Button variant="outline" onClick={() => applyCalendarToAll(selectedCalendarId)}>
                        Aplicar a todas
                     </Button>
                  </div>
               </div>
            </div>
         </div>

         <div className="space-y-4">
            <h4 className="font-medium">Tareas detectadas</h4>
            {parsedTasks.map((task, index) => (
               <Card key={index}>
                  <CardContent className="p-4">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                           <h5 className="font-medium">{task.title}</h5>
                           <span className="text-sm text-muted-foreground">{task.duration} minutos</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label>Tiempo de descanso después</Label>
                              <div className="flex items-center gap-2">
                                 <div className="flex-1">
                                    <Slider
                                       value={[task.breakAfter]}
                                       min={0}
                                       max={60}
                                       step={5}
                                       onValueChange={(value: number[]) => updateTaskBreakTime(index, value[0])}
                                    />
                                 </div>
                                 <div className="w-16 flex items-center gap-1">
                                    <Input
                                       type="number"
                                       min={0}
                                       value={task.breakAfter}
                                       onChange={(e) => updateTaskBreakTime(index, Number.parseInt(e.target.value))}
                                       className="w-12"
                                    />
                                    <span className="text-sm text-muted-foreground">min</span>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-2">
                              <Label>Calendario</Label>
                              <Select value={task.calendarId} onValueChange={(value: string) => updateTaskCalendar(index, value)}>
                                 <SelectTrigger>
                                    <SelectValue>
                                       <div className="flex items-center gap-2">
                                          <div
                                             className="w-3 h-3 rounded-full"
                                             style={{ backgroundColor: getCalendarColor(task.calendarId) }}
                                          />
                                          {getCalendarName(task.calendarId)}
                                       </div>
                                    </SelectValue>
                                 </SelectTrigger>
                                 <SelectContent>
                                    {availableCalendars.map((calendar) => (
                                       <SelectItem key={calendar.id} value={calendar.id}>
                                          <div className="flex items-center gap-2">
                                             {calendar.color && (
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calendar.color }} />
                                             )}
                                             {calendar.name}
                                          </div>
                                       </SelectItem>
                                    ))}
                                 </SelectContent>
                              </Select>
                           </div>
                        </div>
                     </div>
                  </CardContent>
               </Card>
            ))}
         </div>

         <Button onClick={handleImport} className="w-full" disabled={parsedTasks.length === 0 || !date}>
            <Check className="mr-2 h-4 w-4" /> Importar {parsedTasks.length} tareas
         </Button>
      </div>
   );
}
