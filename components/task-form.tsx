"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Task } from "./task-manager"

interface TaskFormProps {
  onAddTask: (task: Omit<Task, "id" | "synced">) => void
  defaultBreakTime: number
}

// Definición de calendarios disponibles (en una implementación real, esto vendría de la API)
const calendars = [
  { id: "primary", name: "Calendario principal", color: "#4285F4" },
  { id: "work", name: "Trabajo", color: "#0F9D58" },
  { id: "personal", name: "Personal", color: "#F4B400" },
  { id: "family", name: "Familia", color: "#DB4437" },
]

export function TaskForm({ onAddTask, defaultBreakTime }: TaskFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState(30)
  const [breakAfter, setBreakAfter] = useState(defaultBreakTime)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [startTime, setStartTime] = useState("09:00")
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("primary")

  // Actualizar el tiempo de descanso cuando cambia el valor predeterminado
  useEffect(() => {
    setBreakAfter(defaultBreakTime)
  }, [defaultBreakTime])

  // Cargar el calendario predeterminado
  useEffect(() => {
    const savedCalendarId = localStorage.getItem("selectedCalendarId")
    if (savedCalendarId) {
      setSelectedCalendarId(savedCalendarId)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !date) return

    onAddTask({
      title,
      description,
      duration,
      breakAfter,
      date: format(date, "yyyy-MM-dd"),
      startTime,
      calendarId: selectedCalendarId,
    })

    // Resetear el formulario
    setTitle("")
    setDescription("")
    setDuration(30)
    setBreakAfter(defaultBreakTime)
    setStartTime("09:00")
    // No resetear el calendario seleccionado para mantener la preferencia del usuario
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título de la tarea</Label>
        <Input
          id="title"
          placeholder="Ej: Reunión de equipo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          placeholder="Detalles adicionales sobre la tarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
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
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Duración (minutos)</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(Number.parseInt(e.target.value))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="breakAfter">Descanso después (minutos)</Label>
          <Input
            id="breakAfter"
            type="number"
            min="0"
            value={breakAfter}
            onChange={(e) => setBreakAfter(Number.parseInt(e.target.value))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="calendar">Calendario</Label>
        <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un calendario" />
          </SelectTrigger>
          <SelectContent>
            {calendars.map((calendar) => (
              <SelectItem key={calendar.id} value={calendar.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calendar.color }} />
                  {calendar.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full">
        Agregar Tarea
      </Button>
    </form>
  )
}
