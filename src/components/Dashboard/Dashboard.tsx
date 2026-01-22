import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SummaryCards } from './SummaryCards';
import { TaskList } from './TaskList';
import { TaskForm } from './TaskForm';
import { CalendarView } from './CalendarView';
import { AnalyticsView } from './AnalyticsView';
import { ReminderPanel } from './ReminderPanel';
import { ReminderAlert } from '@/components/ReminderAlert';
import { useTaskStore } from '@/store/taskStore';
import { useTasks } from '@/hooks/useTasks';
import { useNotifications } from '@/hooks/useNotifications';
import { Task } from '@/types/task';
import { Loader2 } from 'lucide-react';

export function Dashboard() {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { isDarkMode, isLoading, isInitialized } = useTaskStore();
  
  // Initialize data fetching from cloud
  useTasks();
  
  const { 
    permission, 
    requestPermission, 
    activeReminders, 
    snoozeReminder, 
    dismissReminder 
  } = useNotifications();

  // Apply dark mode on mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleAddTask = () => {
    setEditingTask(null);
    setIsTaskFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsTaskFormOpen(false);
    setEditingTask(null);
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr,300px] gap-6">
            <div className="space-y-6">
              <SummaryCards />
              <TaskList onEditTask={handleEditTask} />
            </div>
            <div className="hidden xl:block">
              <ReminderPanel onTaskClick={handleEditTask} />
            </div>
          </div>
        );
      case 'tasks':
        return <TaskList onEditTask={handleEditTask} />;
      case 'calendar':
        return <CalendarView onTaskClick={handleEditTask} />;
      case 'analytics':
        return <AnalyticsView />;
      default:
        return <TaskList onEditTask={handleEditTask} />;
    }
  };

  // Show loading state before data is initialized
  if (!isInitialized) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onAddTask={handleAddTask} 
          notificationPermission={permission}
          onRequestNotificationPermission={requestPermission}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {renderMainContent()}
        </main>
      </div>

      {/* Task Form Modal */}
      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={handleCloseForm}
        editingTask={editingTask}
      />

      {/* Reminder Alert Popups */}
      <ReminderAlert
        reminders={activeReminders}
        onSnooze={snoozeReminder}
        onDismiss={dismissReminder}
      />
    </div>
  );
}
