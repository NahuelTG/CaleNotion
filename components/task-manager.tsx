"use client"

import { useState, useEffect } from "react"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskForm } from "@/components/task-form"
import { TaskList } from "@/components/task-list"
import { GoogleAuthButton } from "@/components/google-auth-button"
import { BulkTaskImport } from "@/components/bulk-task-import"
import { useToast } from "@/hooks/use-toast"

export type Task = {
  id: string
  title: string
  description?: string
  duration: number // en minutos
  breakAfter: number // en minutos
  date: string
  startTime: string
  synced?: boolean
  calendarId?: string // ID del calendario al que pertenece la tarea
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [defaultBreakTime, setDefaultBreakTime] = useState(15) // Tiempo de descanso predeterminado en minutos
  const { toast } = useToast()

  // Cargar tareas del almacenamiento local al iniciar
  useEffect(() => {
    const savedTasks = localStorage.getItem("tasks")
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks))
    }

    const savedBreakTime = localStorage.getItem("defaultBreakTime")
    if (savedBreakTime) {
      setDefaultBreakTime(Number.parseInt(savedBreakTime))
    }
  }, [])

  // Guardar tareas en el almacenamiento local cuando cambian
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks))
  }, [tasks])

  // Guardar tiempo de descanso predeterminado
  useEffect(() => {
    localStorage.setItem("defaultBreakTime", defaultBreakTime.toString())
  }, [defaultBreakTime])

  const addTask = (task: Omit<Task, "id" | "synced">) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      synced: false,
    }
    setTasks([...tasks, newTask])
    toast({
      title: "Tarea agregada",
      description: "La tarea se ha agregado correctamente.",
    })
  }

  const addBulkTasks = (newTasks: Omit<Task, "id" | "synced">[]) => {
    const tasksWithIds = newTasks.map((task) => ({
      ...task,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      synced: false,
    }))

    setTasks([...tasks, ...tasksWithIds])
    toast({
      title: "Tareas importadas",
      description: `Se han importado ${newTasks.length} tareas correctamente.`,
    })
  }

  const removeTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id))
    toast({
      title: "Tarea eliminada",
      description: "La tarea se ha eliminado correctamente.",
    })
  }

  const syncWithCalendar = async () => {
    if (!isAuthenticated) {
      toast({
        title: "No autenticado",
        description: "Debes iniciar sesión con Google primero.",
        variant: "destructive",
      })
      return
    }

    try {
      // Aquí iría la lógica para sincronizar con Google Calendar
      // Usando la API de Google Calendar

      // Simulación de sincronización exitosa
      setTasks(tasks.map((task) => ({ ...task, synced: true })))

      toast({
        title: "Sincronización exitosa",
        description: "Todas las tareas han sido sincronizadas con Google Calendar.",
      })
    } catch (error) {
      toast({
        title: "Error de sincronización",
        description: "No se pudieron sincronizar las tareas con Google Calendar.",
        variant: "destructive",
      })
    }
  }

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
    toast({
      title: "Autenticación exitosa",
      description: "Has iniciado sesión con Google correctamente.",
    })
  }

  const updateDefaultBreakTime = (minutes: number) => {
    setDefaultBreakTime(minutes)
    toast({
      title: "Tiempo de descanso actualizado",
      description: `El tiempo de descanso predeterminado se ha establecido en ${minutes} minutos.`,
    })
  }

  return (
    <Tabs defaultValue="tasks">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="tasks">Mis Tareas</TabsTrigger>
        <TabsTrigger value="add">Agregar Tarea</TabsTrigger>
        <TabsTrigger value="import">Importar Tareas</TabsTrigger>
      </TabsList>

      <TabsContent value="tasks">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Tareas Programadas</span>
              <div className="flex gap-2">
                <GoogleAuthButton onAuthSuccess={handleAuthSuccess} isAuthenticated={isAuthenticated} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncWithCalendar}
                  disabled={!isAuthenticated || tasks.length === 0}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Sincronizar con Calendar
                </Button>
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
            <TaskForm onAddTask={addTask} defaultBreakTime={defaultBreakTime} />
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
              onImportTasks={addBulkTasks}
              defaultBreakTime={defaultBreakTime}
              onUpdateDefaultBreakTime={updateDefaultBreakTime}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
