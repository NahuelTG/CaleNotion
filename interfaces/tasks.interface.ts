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
   calendarName?: string;
   calendarColor?: string;
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
   availableCalendars: CalendarItem[]; // <--- Aceptar esta prop
   isLoadingCalendars: boolean; // <--- Aceptar esta prop
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

export interface EventToCreate {
   localId: string;
   summary: string;
   description?: string;
   start: { dateTime: string; timeZone: string };
   end: { dateTime: string; timeZone: string };
   calendarId: string;
   // googleEventId?: string; // No se usa para crear, sí para actualizar
}
