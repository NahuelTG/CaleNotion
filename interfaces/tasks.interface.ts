// tasks.interface.ts
export interface Task {
   id: string; // ID local único
   title: string;
   description?: string;
   duration: number; // en minutos
   breakAfter: number; // en minutos
   date: string; // YYYY-MM-DD
   startTime: string; // HH:mm
   synced?: boolean;
   calendarId?: string; // ID del calendario de Google
   googleEventId?: string; // ID del evento en Google Calendar una vez sincronizado
}

export interface TaskListProps {
   tasks: Task[];
   onRemoveTask: (id: string) => void;
}

export interface BulkTaskImportProps {
   onProcessAndSyncTasks: (tasksToSync: Omit<Task, "id" | "synced" | "googleEventId">[]) => Promise<{ successCount: number }>;
   isAuthenticated: boolean;
   defaultBreakTime: number;
   onUpdateDefaultBreakTime: (minutes: number) => void;
}

export interface ParsedInternalTask {
   title: string;
   duration: number; // en minutos
}

export interface TaskFormProps {
   onAddTask: (task: Omit<Task, "id" | "synced">) => void;
   defaultBreakTime: number;
}
