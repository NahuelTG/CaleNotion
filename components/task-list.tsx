"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarIcon, Trash2, CheckCircle } from "lucide-react";
import { format, addMinutes, parse } from "date-fns";
import { es } from "date-fns/locale";
import type { TaskListProps, Task } from "../interfaces/tasks.interface";

// Definición de calendarios disponibles (en una implementación real, esto vendría de la API)
const calendars = [
   { id: "primary", name: "Calendario principal", color: "#4285F4" },
   { id: "work", name: "Trabajo", color: "#0F9D58" },
   { id: "personal", name: "Personal", color: "#F4B400" },
   { id: "family", name: "Familia", color: "#DB4437" },
];

export function TaskList({ tasks, onRemoveTask }: TaskListProps) {
   if (tasks.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No hay tareas programadas. Agrega una nueva tarea para comenzar.</div>;
   }

   // Agrupar tareas por fecha
   const tasksByDate: Record<string, Task[]> = {};
   tasks.forEach((task) => {
      if (!tasksByDate[task.date]) {
         tasksByDate[task.date] = [];
      }
      tasksByDate[task.date].push(task);
   });

   // Ordenar las fechas
   const sortedDates = Object.keys(tasksByDate).sort();

   // Función para obtener información del calendario
   const getCalendarInfo = (calendarId?: string) => {
      if (!calendarId) return null;
      return calendars.find((cal) => cal.id === calendarId) || { name: calendarId, color: "#9AA0A6" };
   };

   return (
      <div className="space-y-6">
         {sortedDates.map((date) => {
            // Ordenar tareas por hora de inicio
            const sortedTasks = tasksByDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));

            const dateObj = new Date(date);

            return (
               <div key={date} className="space-y-3">
                  <h3 className="font-medium flex items-center">
                     <CalendarIcon className="h-4 w-4 mr-2" />
                     {format(dateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                  </h3>

                  <div className="space-y-2">
                     {sortedTasks.map((task, index) => {
                        const startTimeObj = parse(task.startTime, "HH:mm", new Date());
                        const endTimeObj = addMinutes(startTimeObj, task.duration);
                        const endTime = format(endTimeObj, "HH:mm");

                        // Calcular la hora de inicio de la siguiente tarea (incluyendo el descanso)
                        const nextTaskStartObj = addMinutes(endTimeObj, task.breakAfter);
                        const nextTaskStart = format(nextTaskStartObj, "HH:mm");

                        // Obtener información del calendario
                        const calendarInfo = getCalendarInfo(task.calendarId);

                        return (
                           <Card key={task.id} className="overflow-hidden">
                              <CardContent className="p-4">
                                 <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                       <div className="flex items-center gap-2">
                                          <h4 className="font-medium">{task.title}</h4>
                                          {task.synced && (
                                             <Badge
                                                variant="outline"
                                                className="flex items-center gap-1 text-green-600 border-green-200 bg-green-50"
                                             >
                                                <CheckCircle className="h-3 w-3" />
                                                Sincronizado
                                             </Badge>
                                          )}
                                          {calendarInfo && (
                                             <Badge
                                                variant="outline"
                                                className="flex items-center gap-1"
                                                style={{
                                                   borderColor: `${calendarInfo.color}40`,
                                                   backgroundColor: `${calendarInfo.color}10`,
                                                   color: calendarInfo.color,
                                                }}
                                             >
                                                {calendarInfo.name}
                                             </Badge>
                                          )}
                                       </div>

                                       {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}

                                       <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                          <span className="flex items-center">
                                             <Clock className="h-3 w-3 mr-1" />
                                             {task.startTime} - {endTime}
                                          </span>
                                          <span>Duración: {task.duration} min</span>
                                          {task.breakAfter > 0 && <span>Descanso: {task.breakAfter} min</span>}
                                          {index < sortedTasks.length - 1 && <span>Siguiente tarea: {nextTaskStart}</span>}
                                       </div>
                                    </div>

                                    <Button
                                       variant="ghost"
                                       size="icon"
                                       onClick={() => onRemoveTask(task.id)}
                                       className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                       <Trash2 className="h-4 w-4" />
                                       <span className="sr-only">Eliminar tarea</span>
                                    </Button>
                                 </div>
                              </CardContent>
                           </Card>
                        );
                     })}
                  </div>
               </div>
            );
         })}
      </div>
   );
}
