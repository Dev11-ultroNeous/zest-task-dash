export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: Date | null;
  category: string;
  tags: string[];
  estimatedMinutes: number | null;
  createdAt: Date;
  completedAt: Date | null;
  reminders: Reminder[];
  assignedTo?: string | null; // User ID of assigned developer
  assignedToName?: string; // Display name of assigned developer (for UI)
}

export interface Reminder {
  id: string;
  taskId: string;
  time: Date;
  type: 'on-due' | '1-day-before' | '1-hour-before' | 'custom';
  triggered: boolean;
  snoozedUntil?: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export type ViewMode = 'list' | 'board' | 'calendar';
export type FilterPriority = Priority | 'all';
export type FilterStatus = TaskStatus | 'all';
export type SortBy = 'dueDate' | 'priority' | 'createdAt' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface TaskFilters {
  priority: FilterPriority;
  status: FilterStatus;
  category: string;
  search: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
}
