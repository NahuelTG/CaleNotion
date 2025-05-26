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

export interface CalendarItem {
   id: string;
   name: string;
   color?: string;
   primary?: boolean;
   accessRole?: string;
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

export interface TaskFormPropsFromParent {
   onAddTask: (taskData: Omit<Task, "id" | "synced" | "googleEventId">) => void;
   defaultBreakTime: number;
   isAuthenticated: boolean; // <--- Aceptar esta prop
   availableCalendars: CalendarItem[]; // <--- Aceptar esta prop
   isLoadingCalendars: boolean; // <--- Aceptar esta prop
}

export interface ParsedInternalTask {
   title: string;
   duration: number; // en minutos
}
