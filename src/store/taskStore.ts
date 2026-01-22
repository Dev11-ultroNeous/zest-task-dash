import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, Category, TaskFilters, Priority, TaskStatus } from '@/types/task';

interface TaskStore {
  tasks: Task[];
  categories: Category[];
  filters: TaskFilters;
  isDarkMode: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Data setters (called by useTasks hook)
  setTasks: (tasks: Task[]) => void;
  setCategories: (categories: Category[]) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  
  // Optimistic update actions
  addTaskOptimistic: (task: Task) => void;
  updateTaskOptimistic: (id: string, updates: Partial<Task> | Task) => void;
  deleteTaskOptimistic: (id: string) => void;
  
  // Filter actions (local only, no cloud sync)
  setFilters: (filters: Partial<TaskFilters>) => void;
  resetFilters: () => void;
  
  // Theme (local only)
  toggleDarkMode: () => void;
  
  // Computed values
  getFilteredTasks: () => Task[];
  getTasksByDate: (date: Date) => Task[];
  getTasksDueToday: () => Task[];
  getOverdueTasks: () => Task[];
  getCompletedTasksThisWeek: () => Task[];
  getCompletionRate: () => number;
}

const defaultFilters: TaskFilters = {
  priority: 'all',
  status: 'all',
  category: 'all',
  search: '',
  sortBy: 'dueDate',
  sortOrder: 'asc',
};

const defaultCategories: Category[] = [
  { id: '1', name: 'Work', color: '#6366f1', icon: 'Briefcase' },
  { id: '2', name: 'Personal', color: '#8b5cf6', icon: 'User' },
  { id: '3', name: 'Health', color: '#10b981', icon: 'Heart' },
  { id: '4', name: 'Learning', color: '#f59e0b', icon: 'BookOpen' },
];

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      categories: defaultCategories,
      filters: defaultFilters,
      isDarkMode: false,
      isLoading: true,
      isInitialized: false,

      setTasks: (tasks) => set({ tasks }),
      
      setCategories: (categories) => set({ categories }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setInitialized: (isInitialized) => set({ isInitialized }),

      addTaskOptimistic: (task) => {
        set((state) => ({ tasks: [task, ...state.tasks] }));
      },

      updateTaskOptimistic: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === id) {
              // If updates has an 'id' property, it's a full Task replacement
              if ('id' in updates && 'title' in updates && 'createdAt' in updates) {
                return updates as Task;
              }
              return { ...task, ...updates };
            }
            return task;
          }),
        }));
      },

      deleteTaskOptimistic: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
      },

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },

      resetFilters: () => {
        set({ filters: defaultFilters });
      },

      toggleDarkMode: () => {
        set((state) => {
          const newMode = !state.isDarkMode;
          if (newMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { isDarkMode: newMode };
        });
      },

      getFilteredTasks: () => {
        const { tasks, filters } = get();
        let filtered = [...tasks];

        // Filter by priority
        if (filters.priority !== 'all') {
          filtered = filtered.filter((t) => t.priority === filters.priority);
        }

        // Filter by status
        if (filters.status !== 'all') {
          filtered = filtered.filter((t) => t.status === filters.status);
        }

        // Filter by category
        if (filters.category !== 'all') {
          filtered = filtered.filter((t) => t.category === filters.category);
        }

        // Filter by search
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(
            (t) =>
              t.title.toLowerCase().includes(search) ||
              t.description.toLowerCase().includes(search) ||
              t.tags.some((tag) => tag.toLowerCase().includes(search))
          );
        }

        // Sort
        filtered.sort((a, b) => {
          let comparison = 0;
          switch (filters.sortBy) {
            case 'dueDate':
              const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
              const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
              comparison = aDate - bDate;
              break;
            case 'priority':
              const priorityOrder = { high: 0, medium: 1, low: 2 };
              comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
              break;
            case 'createdAt':
              comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              break;
            case 'title':
              comparison = a.title.localeCompare(b.title);
              break;
          }
          return filters.sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
      },

      getTasksByDate: (date: Date) => {
        const { tasks } = get();
        const targetDate = new Date(date).toDateString();
        return tasks.filter(
          (t) => t.dueDate && new Date(t.dueDate).toDateString() === targetDate
        );
      },

      getTasksDueToday: () => {
        const today = new Date().toDateString();
        return get().tasks.filter(
          (t) =>
            t.status === 'pending' &&
            t.dueDate &&
            new Date(t.dueDate).toDateString() === today
        );
      },

      getOverdueTasks: () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return get().tasks.filter(
          (t) =>
            t.status === 'pending' &&
            t.dueDate &&
            new Date(t.dueDate) < now
        );
      },

      getCompletedTasksThisWeek: () => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return get().tasks.filter(
          (t) =>
            t.status === 'completed' &&
            t.completedAt &&
            new Date(t.completedAt) >= weekAgo
        );
      },

      getCompletionRate: () => {
        const { tasks } = get();
        if (tasks.length === 0) return 0;
        const completed = tasks.filter((t) => t.status === 'completed').length;
        return Math.round((completed / tasks.length) * 100);
      },
    }),
    {
      name: 'task-store',
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        filters: state.filters,
      }),
    }
  )
);
