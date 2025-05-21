import { TaskManager } from "@/components/task-manager"

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Planificador de Tareas</h1>
          <p className="text-gray-600">Organiza tus tareas y sincronízalas con Google Calendar</p>
        </header>
        <TaskManager />
      </div>
    </main>
  )
}
